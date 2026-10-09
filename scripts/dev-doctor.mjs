#!/usr/bin/env node
// Read-only local diagnostics. Never load ambient application configuration.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import http from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

export const localHost = (host) => /^(localhost|127\.0\.0\.1|\[?::1\]?|[a-z0-9-]+\.localhost)$/i.test(host);
export function parseEnv(source) {
  const values = new Map();
  for (const [index, raw] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || values.has(match[1])) throw new Error(`Invalid or duplicate env key at line ${index + 1}`);
    let value = match[2];
    if (/^["']/.test(value)) {
      if (value.at(-1) !== value[0]) throw new Error(`Unclosed quote at line ${index + 1}`);
      value = value.slice(1, -1);
    } else value = value.replace(/\s+#.*$/, '').trim();
    values.set(match[1], value);
  }
  return values;
}
export function validateStorage(env, rules) {
  const errors = [];
  if (env.has('DATABASE_CLIENT') && !['postgres', 'sqlite'].includes(env.get('DATABASE_CLIENT'))) errors.push('DATABASE_CLIENT must match the supported local storage');
  if (rules.database && env.get('DATABASE_CLIENT') !== 'postgres') errors.push('DATABASE_CLIENT must be postgres for this repo');
  if (env.has('DATABASE_PORT') && (!/^\d+$/.test(env.get('DATABASE_PORT')) || Number(env.get('DATABASE_PORT')) < 1 || Number(env.get('DATABASE_PORT')) > 65535)) errors.push('DATABASE_PORT must be numeric between 1 and 65535');
  for (const key of ['DATABASE_URL', 'AUTH_DATABASE_URL', 'AUTH_MIGRATION_DATABASE_URL']) {
    if (!env.get(key)) continue;
    try {
      const url = new URL(env.get(key));
      const name = decodeURIComponent(url.pathname.slice(1));
      if (Number(url.port || 5432) < 1 || Number(url.port || 5432) > 65535) errors.push(`${key} port must be between 1 and 65535`);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !localHost(url.hostname) || url.search || url.hash || /prod|staging/i.test(name)) errors.push(`${key} must be a local PostgreSQL URL without query overrides`);
      if (!url.username || !url.password) errors.push(`${key} requires explicit local credentials`);
      const expected = rules.databaseUrls?.[key] ?? (key === 'DATABASE_URL' ? rules.database : undefined);
      if (expected && !new RegExp(`^${expected}(?:_(?:test|e2e)[a-z0-9_]*)?$`).test(name)) errors.push(`${key} must use this repo’s local database`);
      if (key === 'DATABASE_URL' && (env.get('DATABASE_NAME') !== name || Number(env.get('DATABASE_PORT') ?? 5432) !== Number(url.port || 5432) || (env.get('DATABASE_USERNAME') && env.get('DATABASE_USERNAME') !== decodeURIComponent(url.username)))) errors.push('DATABASE_URL disagrees with local database fields');
      if (key === 'DATABASE_URL' && rules.sqlite) errors.push('DATABASE_URL is not allowed for the SQLite setup');
    } catch { errors.push(`${key} is invalid`); }
  }
  for (const key of ['REDIS_URL', 'BFF_REDIS_URL']) {
    if (!env.get(key)) continue;
    try {
      const url = new URL(env.get(key));
      if (!['redis:', 'rediss:'].includes(url.protocol) || !localHost(url.hostname) || Number(url.port || 6379) < 1 || Number(url.port || 6379) > 65535 || url.search || url.hash) errors.push(`${key} must use a local redis/rediss URL with an numeric port (default 6379)`);
    } catch { errors.push(`${key} is invalid`); }
  }
  for (const [key, allowed] of Object.entries(rules.localPaths ?? {})) {
    if (env.has(key) && (!new RegExp(allowed).test(env.get(key)) || path.isAbsolute(env.get(key)) || env.get(key).split(/[\\/]/).includes('..'))) errors.push(`${key} must stay in the repo’s local storage path`);
  }
  if (rules.sqlite && env.get('DATABASE_CLIENT') && env.get('DATABASE_CLIENT') !== 'sqlite') errors.push('DATABASE_CLIENT must be sqlite for this repo');
  return errors;
}
export function validateEnv(env, rules) {
  const errors = [];
  for (const key of rules.required ?? []) {
    const value = env.get(key);
    if (!value || /replace-|change-me|your_/.test(value)) errors.push(`${key} is missing or a placeholder`);
  }
  for (const key of rules.secrets ?? []) if ((env.get(key) ?? '').length < 32) errors.push(`${key} must contain at least 32 characters`);
  for (const key of rules.localUrls ?? []) {
    for (const value of (env.get(key) ?? '').split(',').filter(Boolean)) {
      if (value.startsWith('/') && !value.startsWith('//')) continue;
      try { if (!localHost(new URL(value).hostname)) errors.push(`${key} must use a local origin`); }
      catch { errors.push(`${key} is not a valid URL`); }
    }
  }
  if (env.has('DATABASE_HOST') && !localHost(env.get('DATABASE_HOST'))) errors.push('DATABASE_HOST must be loopback');
  if (rules.database && !new RegExp(`^${rules.database}(?:_(?:test|e2e)[a-z0-9_]*)?$`).test(env.get('DATABASE_NAME') ?? '')) errors.push('DATABASE_NAME must use this repo’s local database');
  for (const key of ['NODE_ENV', 'APP_ENV', 'AUTH_DEPLOYMENT_ENV', 'NEXT_PUBLIC_ADMIN_ENVIRONMENT']) {
    if (/prod|staging/i.test(env.get(key) ?? '')) errors.push(`${key} must be local/development`);
  }
  for (const [key, expected] of Object.entries(rules.exact ?? {})) {
    if (env.get(key) !== expected) errors.push(`${key} does not match local setup`);
  }
  for (const key of rules.empty ?? []) if (env.get(key)) errors.push(`${key} must stay empty for offline development`);
  return [...errors, ...validateStorage(env, rules)];
}
export function versionCommand(command, args, cwd) {
  // Arguments below are committed constants, never env values. Windows npm/corepack use .cmd.
  const shell = process.platform === 'win32' && ['npm', 'corepack'].includes(command);
  const child = spawnSync(command, args, { encoding: 'utf8', timeout: 5000, maxBuffer: 65536, shell, windowsHide: true, cwd,
    env: { ...process.env, COREPACK_ENABLE_NETWORK: '0', COREPACK_ENABLE_PROJECT_SPEC: '0' } });
  if (child.error || child.status !== 0) return null;
  // Only print a version token, never raw stderr/stdout from tools.
  return `${child.stdout}`.match(/\d+\.\d+(?:\.\d+)?/)?.[0] ?? null;
}
export const portOpen = (port) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  const done = (open) => { socket.destroy(); resolve(open); };
  socket.setTimeout(900, () => done(false));
  socket.once('connect', () => done(true));
  socket.once('error', () => done(false));
});
export const healthCheck = (check, deadlineMs = 1800) => new Promise((resolve) => {
  const url = new URL(check.url);
  if (url.protocol !== 'http:' || !localHost(url.hostname) || url.username || url.password) { resolve(false); return; }
  let settled = false; let timer; let request;
  const finish = (ok) => {
    if (settled) return;
    settled = true; clearTimeout(timer); resolve(ok);
    if (!ok) request?.destroy();
  };
  request = http.get({ hostname: '127.0.0.1', port: url.port || 80, path: url.pathname + url.search, headers: { Host: url.host }, timeout: 1600 }, (response) => {
    let body = '';
    response.on('data', (chunk) => { body += chunk; if (body.length > 1024 * 1024) finish(false); });
    response.once('aborted', () => finish(false));
    response.once('error', () => finish(false));
    response.once('close', () => { if (!response.complete) finish(false); });
    response.once('end', () => {
      try {
        const data = JSON.parse(body);
        finish(response.statusCode === 200 && Object.entries(check.expect ?? {}).every(([key, value]) => key.split('.').reduce((item, part) => item?.[part], data) === value));
      } catch { finish(false); }
    });
  });
  timer = setTimeout(() => finish(false), deadlineMs);
  request.once('timeout', () => finish(false));
  request.once('error', () => finish(false));
});
export async function authConfigCheck(root, check, sources, runner = spawnSync) {
  try {
    const env = Object.fromEntries(sources.get(check.file) ?? []);
    const moduleUrl = pathToFileURL(path.join(root, check.module)).href;
    // Validate in the owning Auth package with its installed loader. No native
    // type-stripping assumption, ambient app env, application startup or DB IO.
    const program = `import { readFileSync } from 'node:fs';
      try { const loaded = await import(${JSON.stringify(moduleUrl)});
        const parseAuthEnvironment = loaded.parseAuthEnvironment ?? loaded.default?.parseAuthEnvironment;
        const parsed = parseAuthEnvironment(JSON.parse(readFileSync(0, 'utf8')));
        if (parsed.smsDeliveryMode !== 'test') process.exitCode = 1;
      } catch { process.exitCode = 1; }`;
    const keys = ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'TZ'];
    const result = runner(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', program], {
      cwd: path.join(root, 'apps/auth'), input: JSON.stringify(env), encoding: 'utf8',
      timeout: 5000, maxBuffer: 4096, windowsHide: true,
      env: Object.fromEntries(keys.filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
    });
    return !result.error && result.status === 0;
  } catch { return false; }
}
export function migrationStateReady(expected, ledger, columns, requiredColumns) {
  const applied = new Map(ledger.map((row) => [row.name, row.checksum]));
  if (!expected.length || expected.some((row) => applied.get(row.name) !== row.checksum)) return false;
  const existing = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`));
  return Object.entries(requiredColumns).every(([table, names]) => names.every((name) => existing.has(`${table}.${name}`)));
}
export async function authDatabaseCheck(root, check, sources) {
  const raw = sources.get(check.file)?.get(check.key);
  let client;
  try {
    const url = new URL(raw);
    if (!localHost(url.hostname) || !['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash || url.pathname !== `/${check.database}` || !url.username || !url.password || Number(url.port || 5432) < 1 || Number(url.port || 5432) > 65535) return false;
    const require = createRequire(path.join(root, 'apps/auth/package.json'));
    const { Client } = require('pg');
    client = new Client({ host: '127.0.0.1', port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), ssl: false, connectionTimeoutMillis: 1500, query_timeout: 1500, statement_timeout: 1500, application_name: 'local-readonly-doctor', options: '-c default_transaction_read_only=on' });
    client.on('error', () => {});
    await client.connect();
    const result = await client.query('SELECT pg_catalog.current_database() AS database, pg_catalog.to_regclass(\'public."user"\') AS identity_user, pg_catalog.to_regclass(\'public."oauthClient"\') AS oauth_client, pg_catalog.to_regclass(\'public."identitySchemaMigration"\') AS migrations');
    const row = result.rows[0];
    if (row?.database !== check.database || !row.identity_user || !row.oauth_client || !row.migrations) return false;
    const directory = path.join(root, check.migrations);
    const names = (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
    const expected = await Promise.all(names.map(async (name) => ({ name, checksum: createHash('sha256').update(await readFile(path.join(directory, name), 'utf8')).digest('hex') })));
    const ledger = await client.query('SELECT "name", "checksum" FROM public."identitySchemaMigration"');
    const columns = await client.query('SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name = ANY($1::text[])', [Object.keys(check.requiredColumns)]);
    return migrationStateReady(expected, ledger.rows, columns.rows, check.requiredColumns);
  } catch { return false; }
  finally { if (client) await client.end().catch(() => {}); }
}
export async function diagnose(root, config, running, io = {}) {
  const messages = [];
  let badConfig = false; let badService = false;
  const report = (ok, message) => messages.push(`${ok ? 'OK' : 'FAIL'} ${message}`);
  const version = io.version ?? versionCommand;
  const nodeVersion = io.nodeVersion ?? process.versions.node;
  const major = Number(nodeVersion.split('.')[0]);
  const minimum = config.nodeMinimum ?? `${config.nodeMajor}.0.0`;
  const compare = (a, b) => a.split('.').map(Number).reduce((result, part, i) => result || part - Number(b.split('.')[i] ?? 0), 0);
  const nodeOK = (config.nodeRanges ?? [{ major: config.nodeMajor, minimum }]).some((range) => major === range.major && compare(nodeVersion, range.minimum) >= 0);
  report(nodeOK, `Node ${nodeVersion}; expected ${minimum} within ${config.nodeMajor}.x`); badConfig ||= !nodeOK;
  for (const tool of config.tools) {
    const found = version(tool.command, tool.args, root);
    const ok = !!found && (!tool.minimum || compare(found, tool.minimum) >= 0);
    report(ok, `${tool.label}: ${found ?? 'unavailable'}${tool.minimum ? `; minimum ${tool.minimum}` : ''}`); badConfig ||= !ok;
  }
  if (config.packageManager) messages.push(`INFO Install with ${config.packageManager}; doctor does not download or install packages`);
  const sources = new Map();
  for (const [file, rules] of Object.entries(config.env)) {
    try {
      const env = parseEnv(await (io.read ?? readFile)(path.join(root, file), 'utf8')); sources.set(file, env);
      const errors = validateEnv(env, rules);
      report(!errors.length, `${file}${errors.length ? ': ' + errors.join('; ') : ': local config valid'}`); badConfig ||= !!errors.length;
    } catch { report(false, `${file}: missing or invalid; run the documented setup helper`); badConfig = true; }
  }
  for (const [label, refs] of Object.entries(config.matches ?? {})) {
    const values = refs.map(([file, key]) => sources.get(file)?.get(key));
    const ok = values.every((value) => value && value === values[0]);
    report(ok, `${label} values ${ok ? 'match' : 'are missing or disagree'}`); badConfig ||= !ok;
  }
  for (const check of config.authParsers ?? []) {
    const ok = await (io.authConfig ?? authConfigCheck)(root, check, sources);
    report(ok, `Auth configuration: ${ok ? 'owning parser accepted local origins, clients and test delivery' : 'invalid or owning parser/dependencies unavailable; check local Auth configuration'}`); badConfig ||= !ok;
  }
  // Avoid probing even local services when target configuration failed validation.
  if (!badConfig) {
    for (const service of config.ports) {
      const open = await (io.port ?? portOpen)(service.port);
      const ok = running ? open : !open;
      report(ok, `${service.label} port ${service.port}: ${open ? 'listening' : 'free'}; expected ${running ? 'listening' : 'free before start'}`); badService ||= !ok;
    }
    if (running) for (const database of config.authDatabases ?? []) {
      const ok = await (io.database ?? authDatabaseCheck)(root, database, sources);
      report(ok, `${database.label}: ${ok ? 'local connection and identity schema ready' : 'not ready (driver, connection or migrations unavailable)'}`); badService ||= !ok;
    }
    if (running) for (const health of config.health ?? []) {
      const ok = await (io.health ?? healthCheck)(health);
      report(ok, `${health.label}: ${ok ? 'ready' : 'unavailable or dependency health failed'}`); badService ||= !ok;
    }
  } else messages.push('INFO Service probes skipped until local configuration and tools pass');
  if (config.note) messages.push(`INFO ${config.note}`);
  return { code: badConfig ? 2 : badService ? 3 : 0, messages };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--running', '--before-start', '--help'].includes(arg)) || (args.includes('--running') && args.includes('--before-start'))) {
    console.error('Usage: node scripts/dev-doctor.mjs [--before-start|--running]'); process.exitCode = 2;
  } else if (args.includes('--help')) console.log('Read-only local doctor. Default: before start (ports free). --running: storage/API ready. Exit 0=pass, 2=tools/config, 3=ports/services. No secrets, installs, writes, remote probes or redirects.');
  else {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const config = JSON.parse(await readFile(new URL('./dev-doctor.config.json', import.meta.url), 'utf8'));
    const result = await diagnose(root, config, args.includes('--running'));
    result.messages.forEach((line) => console.log(line)); process.exitCode = result.code;
  }
}
