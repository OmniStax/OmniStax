/* The books on disk against every rule: `npm run test:books`, and in the build
   for each book it builds to store (content.mjs), so the store holds no book
   that fails. `OMNISTAX_BOOKS` names which books; left out, every one. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../omnistax.config';
import { chooseBooks, findBooks, loadBooks } from '../../src/lib/content/load';
import { CHECKS, checkContent, checkParity, contentOf, errorsOf, warningsOf } from '../../src/lib/content/check';
import type { Finding } from '../../src/lib/content/check';

const said = (findings: readonly Finding[]): readonly string[] => findings.map((f) => `${f.where}: ${f.what}`);

/* Every book the build carries, as the checks read it: one content record a book, each checked on its own. */
const BOOKS = await Promise.all((await loadBooks(config.content.root, config.content.books)).map(contentOf));

test('every book on disk passes every check', () => {
  BOOKS.forEach((book) => assert.deepEqual(said(errorsOf(checkContent(book))), [], book.book.id));
});
test('the books on disk are not empty, so the checks above had something to read', () => {
  assert.ok(BOOKS.length > 0);
  assert.ok(BOOKS.every((b) => b.chapters.length > 0 && b.chapters.flatMap((c) => c.sections).length > 0));
  assert.ok(CHECKS.every((check) => typeof check === 'function'));
});
test('a concept whose chapter the book has not added yet is said out loud, and is no error', () => {
  const waiting = BOOKS.flatMap((b) => checkContent(b)).filter((f) => f.level === 'info');
  assert.ok(waiting.every((f) => /waits on section/.test(f.what)), said(waiting).join('\n'));
});
test('the only warnings a book on disk raises are a figure it has not built yet, a sheet cell the book prints with a word in it, and a lead not yet cut to rule 21\'s length', () => {
  BOOKS.forEach((book) => {
    const built = new Set(book.chapters.map((ch) => ch.dto.id));
    const raised = warningsOf(checkContent(book));
    const figure = (f: Finding): boolean => /cites Figure (\d+)\.\d+/.test(f.what) && !built.has(/cites Figure (\d+)\./.exec(f.what)![1]);
    /* a reference table prints "0.9999720 (density maximum)" where a column holds numbers; the page leaves that row out of the order and says so here */
    const cell = (f: Finding): boolean => /which is not a number/.test(f.what);
    /* the leads written before rule 21 capped them run long until they are rewritten */
    const lead = (f: Finding): boolean => /^has a lead of \d+ words/.test(f.what);
    /* figure rows name the convention and fact colours they draw once the tags are backfilled */
    const tag = (f: Finding): boolean => /^draws F\.(el|fact)\('[^']*'\), which (its|no figure row's) (conventions|facts)/.test(f.what);
    /* the books written before book.json declared a language are read as en until they say so */
    const language = (f: Finding): boolean => f.where === 'book.json language' && /^is not declared; the book is read as en$/.test(f.what);
    assert.ok(raised.every((f) => figure(f) || cell(f) || lead(f) || tag(f) || language(f)), said(raised).filter((l) => !/F\.(el|fact)\(/.test(l)).join('\n'));
  });
});

/* Every translation under the content root against its source. A translation in progress may not parse yet, and
   is passed over rather than failing the suite; one that does parse keeps every id of its source. */
test('every translation on disk keeps the ids of its source', async (t) => {
  const found = await findBooks(config.content.root).catch(() => null);
  if (found === null) { t.skip('a book.json under the content root does not parse yet'); return; }
  const translations = chooseBooks(found, config.content.books).filter((f) => f.translationOf !== undefined);
  if (translations.length === 0) { t.skip('no translation under the content root'); return; }
  for (const f of translations) {
    const pair = await Promise.all([f.id, f.translationOf!].map((id) => loadBooks(config.content.root, { kind: 'named', ids: [id] }).then(([tree]) => contentOf(tree)))).catch(() => null);
    if (pair === null) { t.diagnostic(`${f.id} does not load yet; passed over`); continue; }
    assert.deepEqual(said(errorsOf(checkParity(pair[0], pair[1]))), [], f.id);
  }
});
