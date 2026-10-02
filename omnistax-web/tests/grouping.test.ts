import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countOf, groupBySection, label, type ChapterGroup } from '../src/lib/sections/grouping';
import { bookId, chapterId, sectionId, type SectionId } from '../src/lib/types/ids';
import type { Target } from '../src/lib/sections/scope';
import type { BookTree } from '../src/lib/commands/browser';

/* The book the views group in: two chapters, and in the second one the first section is not built. */
const BOOK: BookTree = {
  id: bookId('college-physics-2e'),
  title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }, { id: '2.2', title: 'Vectors', built: false }] },
    { id: '16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hookes Law', built: false }, { id: '16.3', title: 'Simple Harmonic Motion', built: true }, { id: '16.4', title: 'The Simple Pendulum', built: true }] },
  ],
};
/* One thing a view lists: its name and the section that says it. */
type Item = { readonly name: string; readonly section: SectionId };
const item = (name: string, section: string): Item => ({ name, section: sectionId(section) });
const ITEMS: readonly Item[] = [item('pendulum', '16.4'), item('period', '16.3'), item('amplitude', '16.3'), item('spring', '16.1'), item('speed', '2.1'), item('lost', '9.9')];
const group = (target: Target) => groupBySection(ITEMS, (i) => i.section, target, BOOK);
const shape = <T extends Item>(groups: readonly ChapterGroup<T>[]) => groups.map((c) => [c.chapter, ...c.sections.map((s) => `${s.section}: ${s.items.map((i) => i.name).join(', ')}`)]);

const book: Target = { level: 'book', book: BOOK.id };
const chapter: Target = { level: 'chapter', book: BOOK.id, chapter: chapterId('16') };
const section: Target = { level: 'section', book: BOOK.id, section: sectionId('16.3') };

test('the book holds everything, in the order the book sets', () => {
  const g = group(book);
  assert.deepEqual(shape(g), [['2', '2.1: speed'], ['16', '16.1: spring', '16.3: period, amplitude', '16.4: pendulum'], ['9.9', '9.9: lost']]);
  assert.equal(countOf(g), ITEMS.length);
});
test('a chapter holds its own sections, built or not, and nothing of the rest of the book', () => {
  assert.deepEqual(shape(group(chapter)), [['16', '16.1: spring', '16.3: period, amplitude', '16.4: pendulum']]);
});
test('a section holds its own items and nothing of its siblings', () => {
  assert.deepEqual(shape(group(section)), [['16', '16.3: period, amplitude']]);
});
test('a section with nothing to say is dropped, and so is a chapter of such sections', () => {
  assert.deepEqual(shape(groupBySection([item('speed', '2.1')], (i) => i.section, book, BOOK)), [['2', '2.1: speed']]);
  assert.deepEqual(groupBySection([], (i: Item) => i.section, book, BOOK), []);
});
test('a chapter and a section are named by their titles, a place the book has lost by its id', () => {
  const g = group(book);
  assert.deepEqual(g.map((c) => label(c.chapter, c.title)), ['2 · Kinematics', '16 · Oscillatory Motion and Waves', '9.9']);
  assert.deepEqual(g[1].sections.map((s) => label(s.section, s.title)), ['16.1 · Hookes Law', '16.3 · Simple Harmonic Motion', '16.4 · The Simple Pendulum']);
});
