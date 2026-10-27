import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentionIndex, mentionsIn, mentionsOf, type HighlightAt, type MentionSource } from '../src/lib/notes/mentions';
import { bookId, sectionId, sectionRef } from '../src/lib/types/ids';

const PHYS = bookId('college-physics-2e'), CHEM = bookId('chemistry-2e');
const s51 = sectionRef(PHYS, sectionId('5.1'));
const none: HighlightAt = () => null;
const note = (id: string, text: string, at = 1): MentionSource => ({ origin: { kind: 'note', note: id, name: `Note ${id}` }, text, at });

test('a link to the section, or to anything it holds, mentions it', () => {
  const sources = [
    note('a', 'See [[college-physics-2e/5.1]] for the setup.'),
    note('b', 'The law: ![[eq:college-physics-2e/5.1:eq-friction]]'),
    note('c', 'A [[def:5.1:kinetic friction]] and a [[fig:5.1:sim-ramp?m=2]].'),
    note('d', 'Try [[ex:college-physics-2e/5.1:p3]] again.'),
    note('e', 'Unrelated, [[college-physics-2e/5.2]] and [[Another note]].'),
  ];
  assert.deepEqual(mentionsOf(s51, sources, none).map((m) => (m.origin.kind === 'note' ? m.origin.note : '')).sort(), ['a', 'b', 'c', 'd']);
});

test('a bookless link reads in the book being read; a link naming another book does not', () => {
  const sources = [note('bare', '[[5.1]]'), note('chem', '[[chemistry-2e/5.1]]')];
  assert.deepEqual(mentionsOf(s51, sources, none).map((m) => m.origin.kind === 'note' && m.origin.note), ['bare']);
  assert.deepEqual(mentionsOf(sectionRef(CHEM, sectionId('5.1')), sources, none).map((m) => m.origin.kind === 'note' && m.origin.note).sort(), ['bare', 'chem']);
});

test('a link to a highlight mentions the section the highlight was made on', () => {
  const hl: HighlightAt = (id) => (id === 'h1' ? { book: PHYS, section: '5.1', quote: 'static friction' } : null);
  const found = mentionsOf(s51, [note('a', 'As marked: [[hl:h1]].'), note('b', '[[hl:gone]]')], hl);
  assert.equal(found.length, 1);
  assert.equal(found[0].excerpt, 'As marked: “static friction”.');
});

test('one bubble per source, quoting the words around its first mention, links read as words', () => {
  const long = `${'word '.repeat(30)}the **normal force** in [[college-physics-2e/5.1|the friction section]] matters, and again [[5.1]] ${'tail '.repeat(40)}`;
  const [m, ...rest] = mentionsOf(s51, [note('a', long)], none);
  assert.equal(rest.length, 0);
  assert.ok(m.excerpt.startsWith('…'), m.excerpt);
  assert.ok(m.excerpt.endsWith('…'), m.excerpt);
  assert.ok(m.excerpt.includes('the normal force in the friction section matters'), m.excerpt);
  assert.ok(!m.excerpt.includes('[['), m.excerpt);
});

test('a chat message mentions a section in its words or by a chip the reader attached', () => {
  const chat = (message: string, text: string, chips: readonly string[], role: 'user' | 'assistant', at: number): MentionSource =>
    ({ origin: { kind: 'chat', chat: 'c1', name: 'Friction', message, role }, text, at, chips });
  const found = mentionsOf(s51, [
    chat('m1', 'Why does the block not slide?', ['college-physics-2e/5.1'], 'user', 10),
    chat('m2', 'Static friction holds it, as in [[college-physics-2e/5.1]].', [], 'assistant', 20),
    chat('m3', 'Thanks', ['book:college-physics-2e'], 'user', 30),
  ], none);
  assert.deepEqual(found.map((m) => [m.origin.kind === 'chat' && m.origin.message, m.attached]), [['m2', false], ['m1', true]]);
  assert.equal(found[1].excerpt, 'Why does the block not slide?');
});

test('a source that both links and attaches is one bubble, the link first', () => {
  const found = mentionsOf(s51, [{ origin: { kind: 'chat', chat: 'c', name: '', message: 'm', role: 'user' }, text: 'about [[5.1]]', at: 1, chips: ['college-physics-2e/5.1'] }], none);
  assert.equal(found.length, 1);
  assert.equal(found[0].attached, false);
});

test('newest first, and the index answers every section at once', () => {
  const index = mentionIndex([note('old', '[[5.1]]', 1), note('new', '[[5.1]] and [[5.2]]', 5)], none);
  assert.deepEqual(mentionsIn(index, s51).map((m) => m.origin.kind === 'note' && m.origin.note), ['new', 'old']);
  assert.equal(mentionsIn(index, sectionRef(PHYS, sectionId('5.2'))).length, 1);
  assert.equal(mentionsIn(index, sectionRef(PHYS, sectionId('6.1'))).length, 0);
});

test('a drawing box and an annotation are sources like any other', () => {
  const found = mentionsOf(s51, [
    { origin: { kind: 'drawing', drawing: 'd1', name: 'Forces', item: 'i1' }, text: '# Block\nsee [[5.1]]', at: 3 },
    { origin: { kind: 'annotation', highlight: 'h9', book: PHYS, section: '6.2', quote: 'centripetal' }, text: 'compare [[eq:5.1:eq-static]]', at: 2 },
  ], none);
  assert.deepEqual(found.map((m) => m.origin.kind), ['drawing', 'annotation']);
  assert.equal(found[0].excerpt, 'Block see 5.1');
});

test('an embed reads as nothing in the quote, and a builder\'s id reads as words', () => {
  const [m] = mentionsOf(s51, [note('a', 'The law ![[eq:5.1:eq-static-friction]] sets a ceiling; compare [[eq:5.1:eq-kinetic-friction]].')], none);
  assert.equal(m.excerpt, 'The law sets a ceiling; compare kinetic friction.');
  assert.deepEqual(m.marks, ['eq:5.1:eq-static-friction']);
});
