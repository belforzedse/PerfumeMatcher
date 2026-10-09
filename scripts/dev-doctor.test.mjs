import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { diagnose, parseEnv, validateEnv, healthCheck, portOpen, migrationStateReady, authConfigCheck } from './dev-doctor.mjs';
const config = { nodeMajor: 22, tools: [{ command: 'git', args: ['--version'], label: 'Git' }], env: { '.env': { required: ['SECRET'], localUrls: ['URL'], database: 'demo_local', exact: { SMS_ENABLED: 'false' } } }, ports: [{ label: 'API', port: 12345 }], health: [{ label: 'API', url: 'http://127.0.0.1:12345/health', expect: { 'checks.db': 'ok' } }] };
const source = 'SECRET=synthetic-do-not-print\nURL=http://localhost:12345\nDATABASE_CLIENT=postgres\nDATABASE_HOST=127.0.0.1\nDATABASE_NAME=demo_local\nSMS_ENABLED=false';
const io = { nodeVersion: '22.13.0', read: async () => source, version: () => '2.40.0', port: async () => false, health: async () => true };
test('before-start and running expectations and useful exit codes', async () => {
  assert.equal((await diagnose('/unused', config, false, io)).code, 0);
  assert.equal((await diagnose('/unused', config, true, io)).code, 3);
  assert.equal((await diagnose('/unused', config, true, { ...io, port: async () => true })).code, 0);
  assert.equal((await diagnose('/unused', config, true, { ...io, port: async () => true, health: async () => false })).code, 3);
  assert.equal((await diagnose('/unused', config, false, { ...io, version: () => null })).code, 2);
  assert.equal((await diagnose('/unused', config, false, { ...io, read: async () => { throw new Error('secret'); } })).code, 2);
});
test('production/remote/placeholder config rejected without values or probes', async () => {
  for (const bad of [source.replace('demo_local', 'demo_production'), source.replace('http://localhost:12345', 'https://example.com'), source + '\nNODE_ENV=production', source.replace('synthetic-do-not-print', 'replace-with-secret')]) {
    let probes = 0;
    const result = await diagnose('/unused', config, true, { ...io, read: async () => bad, port: async () => { probes++; return true; } });
    assert.equal(result.code, 2); assert.equal(probes, 0); assert.doesNotMatch(result.messages.join('\n'), /synthetic-do-not-print|example\.com/);
  }
  assert.throws(() => parseEnv('KEY=1\nKEY=2'));
  assert.throws(() => parseEnv('SECRET="unterminated'));
  assert.deepEqual(validateEnv(parseEnv(source), config.env['.env']), []);
});
test('real loopback probes check JSON dependencies and reject redirects/remote URLs', async () => {
  const server = createServer((req, res) => { res.writeHead(req.url === '/redirect' ? 302 : 200, { Location: 'https://example.com' }); res.end(JSON.stringify({ checks: { db: 'ok' } })); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    assert.equal(await portOpen(port), true);
    assert.equal(await healthCheck({ url: `http://api.localhost:${port}/health`, expect: { 'checks.db': 'ok' } }), true);
    assert.equal(await healthCheck({ url: `http://localhost:${port}/health`, expect: { 'checks.redis': 'ok' } }), false);
    assert.equal(await healthCheck({ url: `http://localhost:${port}/redirect` }), false);
    assert.equal(await healthCheck({ url: 'https://example.com/health' }), false);
  } finally { await new Promise((resolve) => server.close(resolve)); }
  assert.equal(await portOpen(port), false);
});

test('repo config names the actual files produced by a fresh documented setup', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const repo = JSON.parse(await readFile(new URL('./dev-doctor.config.json', import.meta.url), 'utf8'));
  const temp = await mkdtemp(path.join(tmpdir(), 'dev-doctor-env-'));
  try {
    await mkdir(path.join(temp, 'scripts'));
    let setup;
    for (const candidate of ['setup-dev-env.mjs', 'setup-local-env.mjs', 'check-local-env.mjs']) {
      try { await copyFile(path.join(root, 'scripts', candidate), path.join(temp, 'scripts', candidate)); if (!setup && candidate.startsWith('setup-')) setup = candidate; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (const target of Object.keys(repo.env)) {
      const example = target.replace(/\.local$/, '') + '.example';
      try { await mkdir(path.dirname(path.join(temp, example)), { recursive: true }); await copyFile(path.join(root, example), path.join(temp, example)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (repo.name === 'heydoctor') await mkdir(path.join(temp, 'apps/chat-server'), { recursive: true });
    if (setup) {
      const result = spawnSync(process.execPath, [path.join(temp, 'scripts', setup)], { cwd: temp, encoding: 'utf8' });
      assert.equal(result.status, 0, 'fresh env setup failed (output withheld)');
      if (repo.name === 'hk' || repo.name === 'heydoctor') {
        const local = spawnSync(process.execPath, [path.join(temp, 'scripts/setup-local-env.mjs')], { cwd: temp, encoding: 'utf8' });
        assert.equal(local.status, 0, 'canonical app env setup failed (output withheld)');
      }
    } else {
      // Starters have a dedicated setup entry point.
      const target = Object.keys(repo.env)[0]; await copyFile(path.join(temp, target.replace(/\.local$/, '') + '.example'), path.join(temp, target));
    }
    const result = await diagnose(temp, repo, false, { nodeVersion: repo.nodeMinimum, version: () => '99.0.0', port: async () => false, authConfig: async () => true });
    assert.equal(result.code, 0, result.messages.join('\n'));
    // The source-generated configuration is checked without installing app
    // dependencies in this fast CI contract test. Actual Auth parser/runtime
    // validation is separate; its loader and isolation are checked below.
    for (const check of repo.authParsers ?? []) {
      const values = parseEnv(await readFile(path.join(temp, check.file), 'utf8'));
      const rules = repo.env[check.file];
      for (const key of rules.required) {
        const broken = new Map(values); broken.delete(key);
        assert.ok(validateEnv(broken, rules).some((error) => error.includes(key)), key + ' missing must fail before service probes');
      }
    }

  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('effective storage URL overrides, ports, protocol and local paths follow this repo config', async () => {
  const repo = JSON.parse(await readFile(new URL('./dev-doctor.config.json', import.meta.url), 'utf8'));
  for (const [file, rules] of Object.entries(repo.env)) {
    if (!rules.database && !rules.sqlite && !rules.localPaths && !rules.databaseUrls) continue;
    const example = file.replace(/\.local$/, '') + '.example';
    let env;
    try { env = parseEnv(await readFile(new URL('../' + example, import.meta.url), 'utf8')); } catch { env = new Map(); }
    for (const key of rules.required ?? []) if (!env.get(key) || /replace-|your_|change-me/.test(env.get(key))) env.set(key, 's'.repeat(48));
    for (const key of rules.empty ?? []) env.set(key, '');
    for (const [key, value] of Object.entries(rules.exact ?? {})) env.set(key, value);
    if (rules.database) {
      const variants = [{ DATABASE_URL: 'postgresql://u:p@db.example/production' }, { DATABASE_URL: `postgresql://u:p@127.0.0.1:5432/production` }, { DATABASE_PORT: '5432junk' }, { DATABASE_CLIENT: 'mysql' }, { REDIS_URL: 'http://127.0.0.1:6379' }];
      for (const variant of variants) assert.ok(validateEnv(new Map([...env, ...Object.entries(variant)]), rules).length, file + ' unsafe override must fail');
    }
    for (const key of Object.keys(rules.localPaths ?? {})) for (const value of ['/tmp/shared.db', '../production.db', '.tmp/../production.db']) assert.ok(validateEnv(new Map([...env, [key, value]]), rules).some((error) => error.includes(key)));
    for (const key of Object.keys(rules.databaseUrls ?? {})) assert.ok(validateEnv(new Map([...env, [key, 'postgresql://u:p@127.0.0.1:5432/production']]), rules).some((error) => error.includes(key)));
  }
  if (repo.authDatabases?.length) {
    const result = await diagnose('/unused', { ...config, authDatabases: repo.authDatabases }, true, { ...io, port: async () => true, database: async () => false });
    assert.equal(result.code, 3, 'HTTP liveness cannot compensate for unavailable Auth schema');
  }
});

test('Auth readiness requires source migration checksums and current identity columns', () => {
  const expected = [{ name: '0001_better_auth_identity.sql', checksum: 'first' }, { name: '0003_privileged_identity_foundations.sql', checksum: 'third' }];
  const required = { user: ['account_status', 'twoFactorEnabled'] };
  const columns = [{ table_name: 'user', column_name: 'account_status' }, { table_name: 'user', column_name: 'twoFactorEnabled' }];
  assert.equal(migrationStateReady(expected, expected, columns, required), true);
  assert.equal(migrationStateReady(expected, expected.slice(0, 1), columns, required), false);
  assert.equal(migrationStateReady(expected, expected, columns.slice(0, 1), required), false);
  assert.equal(migrationStateReady(expected, [{ ...expected[0], checksum: 'changed' }, expected[1]], columns, required), false);
});

test('a response that continually drips after headers still meets the total deadline', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200); res.write('{');
    const drip = setInterval(() => res.write(' '), 20);
    res.once('close', () => clearInterval(drip));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const start = Date.now();
  try {
    assert.equal(await healthCheck({ url: `http://localhost:${server.address().port}/health` }, 100), false);
    assert.ok(Date.now() - start < 600);
  } finally { await new Promise((resolve) => server.close(resolve)); }
  assert.ok(validateEnv(parseEnv('AUTH_DATABASE_URL=postgresql://u:p@127.0.0.1:0/hk_auth'), { databaseUrls: { AUTH_DATABASE_URL: 'hk_auth' } }).some((error) => error.includes('port')));
});

test('Auth schema preflight uses owning tsx process, explicit stdin and sanitized failure', async () => {
  const sources = new Map([['apps/auth/.env.local', new Map([['BETTER_AUTH_SECRET', 'synthetic-test-value']])]]);
  const check = { file: 'apps/auth/.env.local', module: 'apps/auth/src/lib/auth-env.ts' };
  let calls = 0;
  const runner = (command, args, options) => {
    calls++;
    assert.equal(command, process.execPath);
    assert.deepEqual(args.slice(0, 3), ['--import', 'tsx', '--input-type=module']);
    assert.equal(options.cwd, path.join('/unused', 'apps/auth'));
    assert.equal(options.input, JSON.stringify(Object.fromEntries(sources.get(check.file))));
    assert.equal(options.env.AUTH_DATABASE_URL, undefined);
    assert.equal(options.timeout, 5000);
    return { status: 0 };
  };
  assert.equal(await authConfigCheck('/unused', check, sources, runner), true);
  assert.equal(calls, 1);
  assert.equal(await authConfigCheck('/unused', check, sources, () => ({ status: 1, stderr: 'synthetic-secret-not-forwarded' })), false);
  assert.equal(await authConfigCheck('/unused', check, sources, () => ({ error: new Error('timeout') })), false);
});
