import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bookCommit, builderFiles, planBuild } from '../src/lib/content/stored';
import { bookDir, bookId } from '../src/lib/types/ids';

const git = (dir: string, ...args: string[]): string => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const tmp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'omnistax-stored-'));

test('a book is stored only at a clean commit of a repository that tracks its book.json', () => {
  const repo = tmp();
  git(repo, 'init', '-q');
  fs.writeFileSync(path.join(repo, 'book.json'), '{}');
  assert.equal(bookCommit(repo), null, 'untracked');
  git(repo, 'add', '.');
  git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'one');
  assert.deepEqual(bookCommit(repo), { commit: git(repo, 'rev-parse', 'HEAD'), prefix: '' });
  fs.writeFileSync(path.join(repo, 'new.json'), '{}');
  assert.equal(bookCommit(repo), null, 'a file added since');
  fs.rmSync(path.join(repo, 'new.json'));
  fs.writeFileSync(path.join(repo, 'book.json'), '{"x":1}');
  assert.equal(bookCommit(repo), null, 'a file changed since');
});

test('a book of no repository is built and never stored', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'book.json'), '{}');
  const plan = planBuild(path.join(dir, 'store'), [{ id: bookId('b'), dir: bookDir(dir) }], 'builder');
  assert.deepEqual(plan.books.map((b) => [b.key, b.stored]), [[null, null]]);
});

test('the builder follows imports from the book routes, and leaves the page shells to the app', () => {
  const files = builderFiles(process.cwd()).map((f) => path.relative(process.cwd(), f));
  assert.ok(files.includes('src/lib/content/load.ts') && files.includes('src/lib/math/prerender.ts') && files.includes('src/lib/content/check.ts'));
  assert.ok(files.includes('package-lock.json') && files.includes('scripts/build-offline.mjs'));
  assert.ok(!files.some((f) => f.endsWith('index.astro') || f.startsWith('src/layouts/') || f.startsWith('src/components/Shell')), files.filter((f) => f.startsWith('src/layouts/') || f.startsWith('src/components/')).join(', '));
});
