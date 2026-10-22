import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editionGroups, editionPage, editionsOf, languageName, otherEditions, rootOf, siblingIn } from '../src/lib/explorer/editions';
import type { Edition } from '../src/lib/explorer/editions';

const book = (id: string, language: string, translationOf?: string): Edition => ({ id, language, ...(translationOf ? { translationOf } : {}) });
const CP = book('college-physics-2e', 'en');
const ZH = book('college-physics-2e-zh-cn', 'zh-CN', 'college-physics-2e');
const ES = book('college-physics-2e-es', 'es', 'college-physics-2e');
const CHEM = book('chemistry-2e', 'en');
const ORPHAN = book('calculus-zh-cn', 'zh-CN', 'calculus');
const BOOKS = [CHEM, ZH, CP, ORPHAN, ES];
const ids = (bs: readonly Edition[]): readonly string[] => bs.map((b) => b.id);

test('rootOf: a translation is an edition of its source, and a book of itself', () => {
  assert.equal(rootOf(BOOKS, ZH.id), CP.id);
  assert.equal(rootOf(BOOKS, CP.id), CP.id);
  assert.equal(rootOf(BOOKS, CHEM.id), CHEM.id);
  assert.equal(rootOf(BOOKS, ORPHAN.id), ORPHAN.id, 'a source the build does not carry leaves the translation on its own');
  assert.equal(rootOf(BOOKS, 'nothing'), 'nothing');
  assert.equal(rootOf([book('a', 'en', 'b'), book('b', 'fr', 'a')], 'a'), 'b', 'a loop stops where it closes');
  assert.equal(rootOf([CP, ZH, book('cp-zh-tw', 'zh-TW', ZH.id)], 'cp-zh-tw'), CP.id, 'a translation of a translation goes back to the first book');
});

test('editionsOf: the source first, then its translations in catalogue order, from any of them', () => {
  assert.deepEqual(ids(editionsOf(BOOKS, CP.id)), [CP.id, ZH.id, ES.id]);
  assert.deepEqual(ids(editionsOf(BOOKS, ZH.id)), [CP.id, ZH.id, ES.id]);
  assert.deepEqual(ids(editionsOf(BOOKS, CHEM.id)), [CHEM.id]);
  assert.deepEqual(ids(editionsOf(BOOKS, ORPHAN.id)), [ORPHAN.id]);
  assert.deepEqual(editionsOf(BOOKS, 'nothing'), []);
  assert.deepEqual(ids(otherEditions(BOOKS, ZH.id)), [CP.id, ES.id]);
});

test('siblingIn: the edition in a language, the book itself where it is in that language', () => {
  assert.equal(siblingIn(BOOKS, CP.id, 'zh-CN')?.id, ZH.id);
  assert.equal(siblingIn(BOOKS, ZH.id, 'en')?.id, CP.id);
  assert.equal(siblingIn(BOOKS, ZH.id, 'zh-CN')?.id, ZH.id);
  assert.equal(siblingIn(BOOKS, CHEM.id, 'zh-CN'), undefined);
});

test('editionGroups: one row per source, its other editions beneath it', () => {
  assert.deepEqual(editionGroups(BOOKS).map((g) => [g.root.id, ids(g.others)]), [[CHEM.id, []], [CP.id, [ZH.id, ES.id]], [ORPHAN.id, []]]);
});

test('editionPage: the same page where the other edition builds it, else its first built page', () => {
  const page = (id: string, built = true) => ({ id, built });
  const m = { intro: page('intro', false), chapters: [{ intro: page('1.intro'), sections: [page('1.1'), page('1.2', false)] }, { sections: [page('2.1', false)] }] };
  assert.equal(editionPage(m, '1.1'), '1.1');
  assert.equal(editionPage(m, '1.2'), '1.intro', 'an unbuilt page falls back');
  assert.equal(editionPage(m, '2.1'), '1.intro');
  assert.equal(editionPage(m, null), '1.intro');
  assert.equal(editionPage({ chapters: [{ sections: [page('1.1', false)] }] }, '1.1'), null);
});

test('languageName: the name in the reader’s language, else the tag', () => {
  assert.match(languageName('zh-CN', 'en'), /Chinese/);
  assert.equal(languageName('not a tag!', 'en'), 'not a tag!');
});
