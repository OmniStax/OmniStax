import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findBooks, TRANSLATIONS_DIR } from '../src/lib/content/load';
import { bookVersion, bumpContent, folderOf, rootVersion } from '../src/lib/content/version';
import { contentRoot } from '../src/lib/types/ids';

/* A content root with one book (the framed fixture's book.json) and, under its translations/, one edition of it (RULES item 30). */
const root = async (): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'omnistax-root-'));
  const book = JSON.parse(await readFile(path.join('tests', 'fixtures', 'framed-book', 'book.json'), 'utf8')) as Record<string, unknown>;
  await mkdir(path.join(dir, 'Book A', TRANSLATIONS_DIR, 'zh-CN'), { recursive: true });
  await mkdir(path.join(dir, 'Book A', 'ch01'), { recursive: true });
  await mkdir(path.join(dir, 'tools'));
  await writeFile(path.join(dir, 'Book A', 'book.json'), JSON.stringify({ ...book, id: 'a' }));
  await writeFile(path.join(dir, 'Book A', TRANSLATIONS_DIR, 'zh-CN', 'book.json'), JSON.stringify({ ...book, id: 'a-zh-cn', language: 'zh-CN', translation_of: 'a', translation: { translator: 't', date: '2026-10-23', glossary: 'glossary.zh-CN.json' } }));
  return dir;
};

test('findBooks: a translation under its source’s translations/ is a book of its own', async () => {
  const dir = await root();
  const found = await findBooks(contentRoot(dir));
  assert.deepEqual(found.map((f) => [f.id, path.relative(dir, f.dir), f.translationOf]), [['a', 'Book A', undefined], ['a-zh-cn', path.join('Book A', TRANSLATIONS_DIR, 'zh-CN'), 'a']]);
});

test('the watcher bumps the translation a change lies under, not its source', async () => {
  const dir = await root(); const at = contentRoot(dir);
  const source = path.join(dir, 'Book A'), zh = path.join(dir, 'Book A', TRANSLATIONS_DIR, 'zh-CN');
  assert.equal(folderOf(at, path.join(zh, 'ch01', '1.1', 'text.html')), zh);
  assert.equal(folderOf(at, path.join(source, 'ch01', '1.1', 'text.html')), source);
  assert.equal(folderOf(at, path.join(source, TRANSLATIONS_DIR)), source, 'the translations folder itself is the source’s');
  const before = { root: rootVersion(), source: bookVersion(source), zh: bookVersion(zh) };
  bumpContent(at, path.join(zh, 'ch01', '1.1', 'text.html'), 'change');
  assert.equal(bookVersion(zh), before.zh + 1);
  assert.equal(bookVersion(source), before.source, 'the source tree stands');
  assert.equal(rootVersion(), before.root, 'a change moves no book in or out');
  bumpContent(at, path.join(zh, 'ch02', 'chapter.json'), 'add');
  assert.equal(rootVersion(), before.root + 1);
});
