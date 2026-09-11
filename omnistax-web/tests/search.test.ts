import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXT_CAP, emptyCorpus, excerpt, search, wordsOf, type Corpus } from '../src/lib/search/model';
import { parseFormulas, parseIndex } from '../src/lib/search/books';
import { conceptId, equationId, sectionId } from '../src/lib/types/ids';

/* Two books: the one being read, with a little of everything, and a second with one paragraph. */
const PHYSICS: Corpus = {
  ...emptyCorpus('physics', 'College Physics'),
  concepts: [
    { status: 'built', id: conceptId('shm-period'), kind: 'result', section: sectionId('16.3'), name: 'Period of an oscillator, $T = 2\\pi\\sqrt{m/k}$', why: 'The period depends on mass and stiffness alone.', prereqs: [] },
    { status: 'placeholder', id: conceptId('waves'), kind: 'idea', section: sectionId('16.9'), name: 'Waves', prereqs: [] },
  ],
  variables: [{ sym: 'T', meaning: 'period of the oscillation', unit: 's', section: sectionId('16.3') }],
  glossary: [{ term: 'amplitude', definition: 'the maximum displacement from equilibrium', section: sectionId('16.3') }],
  equations: [
    { id: equationId('eq-period'), section: sectionId('16.3'), tex: '\\kT = 2\\pi\\sqrt{\\km/\\kk}', latex: 'T = 2\\pi\\sqrt{m/k}', important: true },
    { id: equationId('eq-step'), section: sectionId('16.3'), tex: 'T = 1/f', latex: 'T = 1/f', condition: 'a period', important: false },
  ],
  pages: [{ id: '16.3', title: 'Simple Harmonic Motion', url: '/physics/ch16/16.3/', chapter: '16', blocks: [
    { span: '16.3-shm', head: 'Simple harmonic motion', text: 'The period of a simple harmonic oscillator does not depend on its amplitude.' },
    { span: '16.3-shm', head: 'Simple harmonic motion', text: 'Nothing about waves here.' },
  ] }],
  urls: { '16.3': '/physics/ch16/16.3/' },
};
const OTHER: Corpus = {
  ...emptyCorpus('chem', 'Chemistry'),
  pages: [{ id: '1.1', title: 'Matter', url: '/chem/ch01/1.1/', chapter: '1', blocks: [{ span: '1.1', head: '', text: 'A period of the periodic table is one row.' }] }],
};
const kinds = (q: string, filter: Parameters<typeof search>[2] = 'all') => search(q, [PHYSICS, OTHER], filter).hits.map((h) => `${h.book}:${h.kind}`);

test('a blank query finds nothing', () => {
  assert.deepEqual(wordsOf('  '), []);
  assert.deepEqual(search('', [PHYSICS], 'all').hits, []);
});
test('with everything asked for, the things a book names come first, kind by kind, and the prose after, book by book', () => {
  assert.deepEqual(kinds('period'), ['physics:concept', 'physics:definition', 'physics:formula', 'physics:text', 'chem:text']);
});
test('one kind asked for is the only kind found', () => {
  assert.deepEqual(kinds('period', 'text'), ['physics:text', 'chem:text']);
  assert.deepEqual(kinds('period', 'concept'), ['physics:concept']);
  assert.deepEqual(kinds('amplitude', 'definition'), ['physics:definition']);
  assert.deepEqual(kinds('period', 'formula'), ['physics:formula'], 'only the formula sheet’s equations count');
});
test('a formula is found by its plain LaTeX, never by the macros of its coloured form', () => {
  assert.deepEqual(kinds('sqrt{m/k}', 'formula'), ['physics:formula']);
  assert.deepEqual(kinds('kt', 'formula'), [], '\\kT is a macro, not a thing the book prints');
});
test('every word must land, case aside, in the name or in the line beside it', () => {
  assert.deepEqual(kinds('PERIOD stiffness'), ['physics:concept']);
  assert.deepEqual(kinds('period row'), ['chem:text']);
  assert.deepEqual(kinds('period nowhere'), []);
});
test('a placeholder concept is found by its name alone', () => {
  assert.deepEqual(kinds('waves', 'concept'), ['physics:concept']);
});
test('the prose is cut at the cap and the count beyond it is reported', () => {
  const many: Corpus = { ...emptyCorpus('big', 'Big'), pages: [{ id: '1', title: 't', url: '/big/1/', chapter: '1', blocks: Array.from({ length: TEXT_CAP.all + 5 }, (_, i) => ({ span: '1', head: '', text: `block ${i} period` })) }] };
  const all = search('period', [many], 'all'); assert.equal(all.hits.length, TEXT_CAP.all); assert.equal(all.cut, 5);
  const text = search('period', [many], 'text'); assert.equal(text.hits.length, TEXT_CAP.all + 5); assert.equal(text.cut, 0);
});
test('an excerpt is a window round the first word found, cut on spaces, with every word marked', () => {
  const long = 'x '.repeat(100) + 'the period and the amplitude' + ' y'.repeat(100);
  const ex = excerpt(long, ['period', 'amplitude'], 60);
  assert.equal(ex[0].t, '…'); assert.equal(ex[ex.length - 1].t, '…');
  assert.deepEqual(ex.filter((p) => p.hit).map((p) => p.t), ['period', 'amplitude']);
  const short = excerpt('A period.', ['period']);
  assert.deepEqual(short, [{ t: 'A ', hit: false }, { t: 'period', hit: true }, { t: '.', hit: false }]);
});
test('a formula sheet and a text index off the wire are read leniently, a bad row dropped', () => {
  const f = parseFormulas({ variables: [{ sym: 'k', meaning: 'stiffness', section: '16.1' }, { meaning: 'no sym' }], equations: [{ id: 'eq-hooke', section: '16.1', tex: 'F=-kx', important: true, anchor: '16.1-hookes-law' }, 7], glossary: [{ term: 'stiffness', definition: 'how hard to bend', section: '16.1' }, { term: 'lost' }] });
  assert.deepEqual(f.variables.map((v) => v.sym), ['k']); assert.equal(f.variables[0].unit, '');
  assert.deepEqual(f.equations.map((e) => [e.id, e.anchor, e.important]), [['eq-hooke', '16.1-hookes-law', true]]);
  assert.deepEqual(f.glossary.map((g) => g.term), ['stiffness']);
  const i = parseIndex({ pages: [{ id: '2.1', title: 'D', url: '/b/ch02/2.1/', chapter: '2', blocks: [{ span: '2.1-a', head: 'A', text: 'one' }, { text: '' }] }, { title: 'no id' }] });
  assert.deepEqual(i.pages.map((p) => [p.id, p.blocks.length]), [['2.1', 1]]);
  assert.deepEqual(parseIndex(null).pages, []); assert.deepEqual(parseFormulas('x'), { variables: [], equations: [], glossary: [] });
});
