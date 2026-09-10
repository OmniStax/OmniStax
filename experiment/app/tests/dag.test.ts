import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dagRows, edgesOf, scopedNodes, type DagNode } from '../src/lib/sections/dag';
import type { ConceptDTO } from '../src/lib/content/schema';
import type { Target } from '../src/lib/sections/scope';
import { chapterId, conceptId, sectionId } from '../src/lib/types/ids';
import type { BookTree } from '../src/lib/commands/browser';

/* The book the map is read in: one chapter whose first section is not built, and one before it. */
const BOOK: BookTree = {
  title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }] },
    { id: '16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hookes Law', built: false }, { id: '16.3', title: 'Simple Harmonic Motion', built: true }, { id: '16.4', title: 'The Simple Pendulum', built: true }] },
  ],
};
const concept = (id: string, section: string, prereqs: string[] = [], placeholder = false): ConceptDTO => {
  const row = { id: conceptId(id), kind: 'idea' as const, section: sectionId(section), name: id, prereqs: prereqs.map(conceptId) };
  return placeholder ? { status: 'placeholder', ...row } : { status: 'built', ...row };
};
/* Displacement is taught in another chapter, Hookes law in a section that is not built yet. */
const ALL: readonly ConceptDTO[] = [
  concept('displacement', '2.1'),
  concept('hookes-law', '16.1', [], true),
  concept('shm', '16.3', ['hookes-law', 'displacement']),
  concept('period', '16.3', ['shm']),
  concept('pendulum', '16.4', ['shm']),
];
const book: Target = { level: 'book' };
const chapter: Target = { level: 'chapter', chapter: chapterId('16') };
const section: Target = { level: 'section', section: sectionId('16.3') };
const nodes = (target: Target) => scopedNodes(ALL, target, BOOK);
const own = (list: readonly DagNode[]) => list.filter((c) => !c.ext).map((c) => c.id);
const ext = (list: readonly DagNode[]) => list.filter((c) => c.ext).map((c) => c.id);

test('a section teaches its own concepts, with what it takes for granted dashed behind them', () => {
  const list = nodes(section);
  assert.deepEqual(own(list), ['shm', 'period']);
  assert.deepEqual(ext(list), ['hookes-law', 'displacement']);
});
test('a chapter teaches every concept of the sections it has built', () => {
  const list = nodes(chapter);
  assert.deepEqual(own(list), ['shm', 'period', 'pendulum']);
  assert.deepEqual(ext(list), ['hookes-law', 'displacement'], 'a section not built yet stays outside the chapter it belongs to');
});
test('the book teaches everything it has built, and dashes the sections it has not', () => {
  const list = nodes(book);
  assert.deepEqual(own(list), ['displacement', 'shm', 'period', 'pendulum']);
  assert.deepEqual(ext(list), ['hookes-law']);
});
test('the rows put what is taken for granted first, then a concept below its prerequisites', () => {
  assert.deepEqual(dagRows(nodes(section)), [['hookes-law', 'displacement'], ['shm'], ['period']]);
  assert.deepEqual(dagRows(nodes(chapter)), [['hookes-law', 'displacement'], ['shm'], ['period', 'pendulum']]);
});
test('an edge is drawn only between two concepts the map shows', () => {
  assert.deepEqual(edgesOf(nodes(section)), [['hookes-law', 'shm'], ['displacement', 'shm'], ['shm', 'period']]);
  assert.deepEqual(edgesOf(nodes(chapter)).filter(([, to]) => to === 'pendulum'), [['shm', 'pendulum']]);
});
