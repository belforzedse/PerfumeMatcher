import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  [
    "backend/.env.example",
    "backend/.env"
  ],
  [
    "frontend/.env.example",
    "frontend/.env.local"
  ]
];
const lockPath = path.join(root, '.dev-env-setup.lock');
let ownsLock = false;
if (!process.argv.includes('--check')) {
  try {
    await mkdir(lockPath);
    ownsLock = true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw new Error('Another setup is running. Retry after it completes; remove .dev-env-setup.lock only when no setup process is running.');
  }
}
try {
  const values = new Map();
  const parse = (text) => new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }));
  const usable = (value) => value && !/replace-|change-me/i.test(value);
  // Existing local files always survive. Read their shared values before generation.
  for (const [, target] of targets) {
    const current = await readFile(path.join(root, target), 'utf8').catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      return '';
    });
    for (const [key, value] of parse(current)) {
      if (!usable(value)) continue;
      if (values.has(key) && values.get(key) !== value && /SECRET$/.test(key)) {
        throw new Error(`Existing ${key} values disagree; reconcile local files before setup.`);
      }
      values.set(key, value);
    }
  }
    if (values.has('POSTGRES_PASSWORD') && values.has('DATABASE_PASSWORD') && values.get('POSTGRES_PASSWORD') !== values.get('DATABASE_PASSWORD')) {
      throw new Error('Existing POSTGRES_PASSWORD and DATABASE_PASSWORD values disagree; reconcile local files before setup.');
    }
  const secret = (key) => {
    if (!values.has(key)) values.set(key, randomBytes(32).toString('base64url'));
    return values.get(key);
  };
  const dbPassword = secret('DATABASE_PASSWORD');
  const authPassword = secret('AUTH_DATABASE_ROLE_PASSWORD');
  for (const [example, target] of targets) {
    const template = await readFile(path.join(root, example), 'utf8');
    const result = template.split(/\r?\n/).map((line) => {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
      if (!match) return line;
      const [, key, initial] = match;
      let value = initial;
      if (key === 'APP_KEYS' && /replace-/.test(value)) value = `${secret('APP_KEY_1')},${secret('APP_KEY_2')}`;
      else if (key === 'POSTGRES_PASSWORD' && /replace-/.test(value)) value = dbPassword;
      else if (/replace-with-(?:local|unique)-secret/.test(value)) value = secret(key);
      value = value.replaceAll('replace-database-password', dbPassword).replaceAll('replace-auth-password', authPassword);
      return `${key}=${value}`;
    }).join('\n');
    if (process.argv.includes('--check')) {
      const current = await readFile(path.join(root, target), 'utf8').catch((error) => {
        if (error.code !== 'ENOENT') throw error;
        return undefined;
      });
      if (current === undefined) { console.error(`Missing ${target}`); process.exitCode = 1; }
      else console.log(`Present ${target}`);
      continue;
    }
    await mkdir(path.dirname(path.join(root, target)), { recursive: true });
    try {
      await writeFile(path.join(root, target), result, { flag: 'wx', mode: 0o600 });
      console.log(`Created ${target}`);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      console.log(`Kept existing ${target}`);
    }
  }
} finally {
  if (ownsLock) await rm(lockPath, { recursive: true, force: true });
}
