import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countOf, groupBySection, label, outsideLabel, type ChapterGroup } from '../src/lib/sections/grouping';
import { chapterId, sectionId, type SectionId } from '../src/lib/types/ids';
import type { Target } from '../src/lib/sections/scope';
import type { BookTree } from '../src/lib/commands/browser';

/* The book the views group in: two chapters, and in the second one the first section is not built. */
const BOOK: BookTree = {
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

const book: Target = { level: 'book' };
const chapter: Target = { level: 'chapter', chapter: chapterId('16') };
const section: Target = { level: 'section', section: sectionId('16.3') };

test('the book holds everything, in the order the book sets, and nothing is outside it', () => {
  const g = group(book);
  assert.deepEqual(shape(g.inside), [['2', '2.1: speed'], ['16', '16.1: spring', '16.3: period, amplitude', '16.4: pendulum'], ['9.9', '9.9: lost']]);
  assert.deepEqual(g.outside, []);
  assert.equal(countOf(g.inside), ITEMS.length);
});
test('a chapter holds its own sections, built or not, and the rest of the book lies outside', () => {
  const g = group(chapter);
  assert.deepEqual(shape(g.inside), [['16', '16.1: spring', '16.3: period, amplitude', '16.4: pendulum']]);
  assert.deepEqual(shape(g.outside), [['2', '2.1: speed'], ['9.9', '9.9: lost']]);
  assert.equal(countOf(g.inside) + countOf(g.outside), ITEMS.length);
});
test('a section holds its own items, its siblings among the rest', () => {
  const g = group(section);
  assert.deepEqual(shape(g.inside), [['16', '16.3: period, amplitude']]);
  assert.deepEqual(shape(g.outside), [['2', '2.1: speed'], ['16', '16.1: spring', '16.4: pendulum'], ['9.9', '9.9: lost']]);
});
test('a section with nothing to say is dropped, and so is a chapter of such sections', () => {
  const g = groupBySection([item('speed', '2.1')], (i) => i.section, book, BOOK);
  assert.deepEqual(shape(g.inside), [['2', '2.1: speed']]);
  assert.deepEqual(groupBySection([], (i: Item) => i.section, book, BOOK), { inside: [], outside: [] });
});
test('a chapter and a section are named by their titles, a place the book has lost by its id', () => {
  const g = group(book);
  assert.deepEqual(g.inside.map((c) => label(c.chapter, c.title)), ['2 · Kinematics', '16 · Oscillatory Motion and Waves', '9.9']);
  assert.deepEqual(g.inside[1].sections.map((s) => label(s.section, s.title)), ['16.1 · Hookes Law', '16.3 · Simple Harmonic Motion', '16.4 · The Simple Pendulum']);
});
test('the fold below the target names what is beyond it, and at the book names nothing', () => {
  assert.equal(outsideLabel(section), 'Elsewhere in the chapter');
  assert.equal(outsideLabel(chapter), 'Elsewhere in the book');
  assert.equal(outsideLabel(book), '');
});
