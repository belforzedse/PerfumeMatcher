import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, posix } from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const paths = new Set(tracked);
const errors = [];
const selected = tracked.filter(path => /^(docs\/(development|gitlab-workflow)(\.fa)?\.md|README\.fa\.md|\.gitlab\/(issue_templates|merge_request_templates)\/.*\.md)$/.test(path));
for (const path of selected) {
  let text;
  try { text = await readFile(path, 'utf8'); } catch { continue; } // Sparse local checkout.
  if ((text.match(/^```/gm) ?? []).length % 2) errors.push(`${path}: unclosed code fence`);
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].split('#')[0];
    if (!href || /^(https?:|mailto:)/.test(href)) continue;
    const target = posix.normalize(posix.join(dirname(path), decodeURIComponent(href)));
    if (!paths.has(target) && !tracked.some(file => file.startsWith(target + '/'))) errors.push(`${path}: missing ${href}`);
  }
}
if (errors.length) { process.stderr.write(errors.join('\n') + '\n'); process.exitCode = 1; }
else process.stdout.write(`Checked ${selected.length} team documentation files.\n`);
