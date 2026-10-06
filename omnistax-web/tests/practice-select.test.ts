import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOf, setNode, summaryOf, type Node, type Shape } from '../src/lib/practice/select';
import type { Catalog, Curriculum } from '../src/lib/practice/model';
import type { ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
import { conceptId, sectionId } from '../src/lib/types/ids';

const sec = sectionId;
const concept = (id: string, section: string): ConceptDTO => ({ status: 'built', id: conceptId(id), kind: 'idea', section: sec(section), name: id, terms: [], forms: [], prereqs: [], statement: '' });
const ex = (id: string, concepts: string[]): ExerciseDTO => ({
  id, sourceId: id, kind: 'problem', bloom: 'Apply', concepts: concepts.map(conceptId), place: { at: 'end' }, prompt: id,
  answer: { type: 'open', generated_by: 'source' },
});
const layout: Record<string, readonly string[]> = { '1': ['1.1', '1.2'], '2': ['2.1'] };
const inSection: Record<string, readonly string[]> = { '1.1': ['a', 'b'], '1.2': ['c'], '2.1': ['d'] };
const cat: Catalog = {
  concepts: [concept('a', '1.1'), concept('b', '1.1'), concept('c', '1.2'), concept('d', '2.1')],
  sectionsOf: (book, chapter) => book === 'cp' ? (layout[chapter] ?? []).map(sec) : [],
  allSections: (book) => book === 'cp' ? Object.values(layout).flat().map(sec) : [],
  exercises: [
    { book: 'cp', section: sec('1.1'), ex: ex('a1', ['a']) },
    { book: 'cp', section: sec('1.1'), ex: ex('ab', ['a', 'b']) },
    { book: 'cp', section: sec('1.2'), ex: ex('c1', ['c']) },
    { book: 'cp', section: sec('2.1'), ex: ex('d1', ['d']) },
  ],
};
const shape: Shape = { chapters: (book) => book === 'cp' ? ['1', '2'] : [], conceptsIn: (book, section) => book === 'cp' ? inSection[section] ?? [] : [] };

const B: Node = { level: 'book', book: 'cp' };
const ch = (chapter: string): Node => ({ level: 'chapter', book: 'cp', chapter });
const se = (section: string): Node => ({ level: 'section', book: 'cp', chapter: section.split('.')[0], section: sec(section) });
const co = (id: string): Node => ({ level: 'concept', concept: id });
const xe = (section: string, id: string): Node => ({ level: 'exercise', book: 'cp', section: sec(section), ex: id });
const check = (c: Curriculum, n: Node) => checkOf(c, n, cat, shape);
const set = (c: Curriculum, n: Node, on: boolean) => setNode(c, n, on, cat, shape);
const book = { book: 'cp' }, chapterPick = (chapter: string) => ({ book: 'cp', chapter }), sectionPick = (section: string) => ({ book: 'cp', chapter: section.split('.')[0], section: sec(section) });
const conceptPick = (id: string) => ({ concept: conceptId(id) }), exercisePick = (section: string, id: string) => ({ exercise: { book: 'cp', section: sec(section), ex: id } });

test('exercise checks on only when pinned', () => {
  assert.equal(check([exercisePick('1.1', 'a1')], xe('1.1', 'a1')), 'on');
  assert.equal(check([book], xe('1.1', 'a1')), 'off');
});

test('concept checks on when picked, some when a place or pinned exercise brings it in', () => {
  assert.equal(check([conceptPick('a')], co('a')), 'on');
  assert.equal(check([sectionPick('1.1')], co('b')), 'some');
  assert.equal(check([exercisePick('1.1', 'ab')], co('b')), 'some');
  assert.equal(check([exercisePick('1.1', 'a1')], co('b')), 'off');
  assert.equal(check([], co('a')), 'off');
});

test('section checks on under any covering place, some under its exercises or concepts', () => {
  assert.equal(check([book], se('1.2')), 'on');
  assert.equal(check([chapterPick('1')], se('1.2')), 'on');
  assert.equal(check([sectionPick('1.2')], se('1.2')), 'on');
  assert.equal(check([{ book: 'cp', section: sec('1.2') }], se('1.2')), 'on');
  assert.equal(check([chapterPick('2')], se('1.2')), 'off');
  assert.equal(check([exercisePick('1.2', 'c1')], se('1.2')), 'some');
  assert.equal(check([conceptPick('c')], se('1.2')), 'some');
  assert.equal(check([conceptPick('a')], se('1.2')), 'off');
});

test('chapter and book roll up their children', () => {
  assert.equal(check([book], ch('2')), 'on');
  assert.equal(check([chapterPick('1')], ch('1')), 'on');
  assert.equal(check([sectionPick('1.1'), sectionPick('1.2')], ch('1')), 'on');
  assert.equal(check([sectionPick('1.1')], ch('1')), 'some');
  assert.equal(check([conceptPick('c')], ch('1')), 'some');
  assert.equal(check([sectionPick('1.1')], ch('2')), 'off');
  assert.equal(check([book], B), 'on');
  assert.equal(check([chapterPick('1'), sectionPick('2.1')], B), 'on');
  assert.equal(check([chapterPick('1')], B), 'some');
  assert.equal(check([exercisePick('2.1', 'd1')], B), 'some');
  assert.equal(check([], B), 'off');
  assert.equal(check([], { level: 'book', book: 'none' }), 'off');
});

test('exercise and concept picks toggle alone', () => {
  const c = [book, exercisePick('1.1', 'a1')];
  assert.deepEqual(set(c, xe('1.1', 'a1'), true), c);
  assert.deepEqual(set(c, xe('1.1', 'a1'), false), [book]);
  assert.deepEqual(set(c, co('a'), true), [...c, conceptPick('a')]);
  assert.deepEqual(set([conceptPick('a'), book], co('a'), false), [book]);
});

test('turning a place on drops the picks it subsumes and keeps concepts and exercises', () => {
  const c = [conceptPick('a'), sectionPick('1.1'), chapterPick('2'), exercisePick('1.2', 'c1')];
  assert.deepEqual(set(c, B, true), [conceptPick('a'), exercisePick('1.2', 'c1'), book]);
  assert.deepEqual(set(c, ch('1'), true), [conceptPick('a'), chapterPick('2'), exercisePick('1.2', 'c1'), chapterPick('1')]);
  assert.deepEqual(set(c, se('1.2'), true), [...c, sectionPick('1.2')]);
  assert.deepEqual(set([chapterPick('1')], se('1.2'), true), [chapterPick('1')]);
  assert.deepEqual(set([book], ch('1'), true), [book]);
  assert.deepEqual(set([book], B, true), [book]);
});

test('turning a place off removes it and what is beneath it', () => {
  const c = [conceptPick('a'), chapterPick('1'), sectionPick('2.1'), exercisePick('1.2', 'c1')];
  assert.deepEqual(set(c, B, false), [conceptPick('a'), exercisePick('1.2', 'c1')]);
  assert.deepEqual(set(c, ch('1'), false), [conceptPick('a'), sectionPick('2.1'), exercisePick('1.2', 'c1')]);
  assert.deepEqual(set([sectionPick('1.1'), sectionPick('1.2'), chapterPick('2')], ch('1'), false), [chapterPick('2')]);
  assert.deepEqual(set([sectionPick('1.1'), sectionPick('1.2')], se('1.1'), false), [sectionPick('1.2')]);
});

test('turning off what an ancestor covers explodes the ancestor', () => {
  assert.deepEqual(set([conceptPick('a'), book], ch('1'), false), [conceptPick('a'), chapterPick('2')]);
  assert.deepEqual(set([book], se('1.1'), false), [chapterPick('2'), sectionPick('1.2')]);
  assert.deepEqual(set([chapterPick('1'), exercisePick('1.1', 'a1')], se('1.1'), false), [exercisePick('1.1', 'a1'), sectionPick('1.2')]);
});

test('the invariant holds at every level', () => {
  const starts: readonly Curriculum[] = [[], [book], [chapterPick('1')], [sectionPick('1.1'), sectionPick('1.2')], [sectionPick('2.1'), conceptPick('d')], [chapterPick('2'), exercisePick('1.1', 'a1')]];
  const nodes = [B, ch('1'), ch('2'), se('1.1'), se('1.2'), se('2.1'), co('a'), co('c'), xe('1.1', 'a1'), xe('2.1', 'd1')];
  starts.forEach((c) => nodes.forEach((n) => {
    assert.equal(check(set(c, n, true), n), 'on', `${JSON.stringify(c)} on ${JSON.stringify(n)}`);
    const off = set(c, n, false), kept = off.filter((p) => 'concept' in p || 'exercise' in p);
    if (n.level !== 'exercise' && n.level !== 'concept') assert.equal(check(off, n), check(kept, n), `${JSON.stringify(c)} off ${JSON.stringify(n)}`);
    assert.notEqual(check(off, n), 'on');
  }));
  assert.equal(check(set([book, conceptPick('d')], se('2.1'), false), se('2.1')), 'some');
});

test('summary counts picks by kind', () => {
  assert.deepEqual(summaryOf([book, chapterPick('1'), sectionPick('2.1'), sectionPick('1.1'), conceptPick('a'), exercisePick('1.1', 'a1')]), { books: 1, chapters: 1, sections: 2, concepts: 1, exercises: 1 });
  assert.deepEqual(summaryOf([]), { books: 0, chapters: 0, sections: 0, concepts: 0, exercises: 0 });
});
