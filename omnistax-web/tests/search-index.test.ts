import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCorpus, type Corpus } from '../src/lib/search/model';
import { KIND_CAP, MIN_TEXT, buildIndex, find, search } from '../src/lib/search/index';
import { packToks, tokensOf, unpackToks, withTokens } from '../src/lib/content/textindex';
import { parseIndex } from '../src/lib/search/books';
import { conceptId, equationId, sectionId } from '../src/lib/types/ids';

const page = (id: string, texts: readonly string[]) =>
  withTokens({ id, title: `Page ${id}`, url: `/b/${id}/`, chapter: '1', blocks: texts.map((text) => ({ span: id, head: '', text })) });

const BOOK: Corpus = {
  ...emptyCorpus('b', 'Book'),
  concepts: [{ status: 'built', id: conceptId('shm-period'), kind: 'result', section: sectionId('16.3'), name: 'Period of an oscillator', why: 'It depends on mass alone.', prereqs: [] }],
  variables: [{ sym: 'T', meaning: 'period of the oscillation', unit: 's', section: sectionId('16.3') }],
  equations: [{ id: equationId('eq-period'), section: sectionId('16.3'), tex: '\\kT', latex: 'T = 2\\pi\\sqrt{m/k}', important: true }],
  pages: [page('16.3', ['The period of a pendulum is long.', 'Amplitude does not matter.', 'Nothing to see.'])],
};
const IX = buildIndex([BOOK]);
const kinds = (q: string, filter: Parameters<typeof find>[2] = 'all') => find(q, IX, filter).hits.map((h) => h.kind);

test('a line is cut into words the same way wherever it is cut', () => {
  assert.deepEqual(tokensOf('T = 2\\pi\\sqrt{m/k}'), ['t', '2', 'pi', 'sqrt', 'm', 'k']);
  assert.deepEqual(tokensOf('  '), []);
});
test('the build writes a page dictionary the index reads instead of the prose', () => {
  const p = page('1.1', ['A period.', 'A long period of time.']);
  assert.deepEqual(p.terms, ['a', 'long', 'of', 'period', 'time']);
  assert.deepEqual(p.blocks.map((b) => [...unpackToks(b.toks ?? '')]), [[0, 3], [0, 1, 2, 3, 4]]);
  assert.deepEqual([...unpackToks(packToks([0, 3, 40, 1200]))], [0, 3, 40, 1200], 'a gap of any size survives');
  /* the same words come back through the wire, and a page without them still works */
  const wired = parseIndex({ pages: [p] }).pages[0];
  assert.deepEqual(wired.terms, p.terms);
  const bare = { ...p, terms: undefined, blocks: p.blocks.map((b) => ({ ...b, toks: undefined })) };
  assert.deepEqual(find('period', buildIndex([{ ...emptyCorpus('x', 'X'), pages: [bare] }]), 'text').hits.length, 2);
});
test('a word of a query is a prefix, not a fragment', () => {
  assert.deepEqual(kinds('pendu', 'text'), ['text']);
  assert.deepEqual(kinds('endulum', 'text'), [], 'the middle of a word finds nothing');
});
test('every word of a query must land, each in the same thing', () => {
  assert.deepEqual(kinds('period pendulum', 'text'), ['text']);
  assert.deepEqual(kinds('period amplitude', 'text'), [], 'the two words are in different blocks');
  assert.deepEqual(kinds('period nowhere'), []);
});
test('the things the books name stand before the prose, kind by kind', () => {
  assert.deepEqual(kinds('period'), ['concept', 'definition', 'formula', 'text']);
  assert.deepEqual(kinds('period', 'formula'), ['formula']);
});
test('one letter finds what the books name and leaves the prose alone', () => {
  assert.equal(MIN_TEXT, 2);
  assert.deepEqual(kinds('p'), ['concept', 'definition', 'formula']);
  assert.deepEqual(kinds('p', 'text'), []);
  assert.deepEqual(kinds('pe'), ['concept', 'definition', 'formula', 'text']);
});
test('each kind is cut at its cap', () => {
  const many: Corpus = { ...emptyCorpus('m', 'M'), glossary: Array.from({ length: KIND_CAP + 3 }, (_, i) => ({ term: `period ${i}`, definition: 'x', section: sectionId('1.1') })) };
  assert.equal(search('period', [many], 'definition').hits.length, KIND_CAP);
});
test('the same query over the same index gives the same hits in the same order', () => {
  const once = find('period', IX, 'all').hits.map((h) => h.kind);
  assert.deepEqual(find('period', IX, 'all').hits.map((h) => h.kind), once);
  assert.deepEqual(find('period', buildIndex([BOOK]), 'all').hits.map((h) => h.kind), once);
});
