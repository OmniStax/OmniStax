/* Which release notes a push added or changed, as the Release workflow reads
   them (omnistax-web/docs/release-plan.md, decision 9). Writes each note's body
   to notes/<version>.md and prints, for $GITHUB_OUTPUT, the newest added note's
   tag and semver and whether it needs installers.
   Usage: node release-notes.mjs <before> <after> */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const [before, after] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const DIR = 'omnistax-web/releases/';
/* A new branch has no before; its first commit has no parent either, so the empty tree stands in. */
const parent = (() => { try { return git('rev-parse', '--verify', '--quiet', `${after}^`); } catch { return git('hash-object', '-t', 'tree', '/dev/null'); } })();
const range = /^0+$/.test(before ?? '') || !before ? [parent, after] : [before, after];
const changed = git('diff', '--name-status', '--diff-filter=AM', ...range, '--', DIR).split('\n').filter(Boolean)
  .map((line) => line.split('\t')).filter(([, f]) => /^omnistax-web\/releases\/[^/]+\.md$/.test(f) && !f.endsWith('.zh-CN.md'));

const read = (file) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(fs.readFileSync(file, 'utf8'));
  if (!m) throw new Error(`${file}: no front matter`);
  const field = (k) => new RegExp(`^${k}:\\s*(.+?)\\s*$`, 'm').exec(m[1])?.[1]?.replace(/^(['"])(.*)\1$/, '$2');
  const body = m[2].replace(/(\]\(|src=")(?:\.\/)?images\//g, '$1https://omnistax.org/releases/images/');
  return { version: field('version'), title: field('title'), desktop: field('desktop') === 'true', body };
};
const semver = (v) => { const [y, m, d, n] = v.split('.').map(Number); return `${y}.${m * 100 + d}.${n}`; };
const order = (a, b) => { const [x, y] = [a, b].map((v) => v.split('.').map(Number)); return x.reduce((s, n, i) => s || n - y[i], 0); };

fs.mkdirSync('notes', { recursive: true });
const notes = changed.map(([status, file]) => ({ status, ...read(file) }));
for (const n of notes) fs.writeFileSync(`notes/${n.version}.md`, n.body);
console.log(`edited=${notes.filter((n) => n.status === 'M').map((n) => n.version).join(' ')}`);
const added = notes.filter((n) => n.status === 'A').sort((a, b) => order(b.version, a.version));
console.log(`added=${added.map((n) => n.version).join(' ')}`);
for (const n of added) fs.writeFileSync(`notes/${n.version}.title`, n.title);
if (added[0]) console.log(`tag=${added[0].version}\nsemver=${semver(added[0].version)}\nforce_desktop=${added.some((n) => n.desktop)}`);
