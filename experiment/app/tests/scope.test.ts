import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLLOW_SECTION, LEVELS, atLevel, chapterOf, crumbsOf, levelOf, narrow, parseScope, resolve, sameTarget, sectionsOf, targetLabel, widen, type Target, type ViewScope } from '../src/lib/sections/scope';
import { chapterId, sectionId } from '../src/lib/types/ids';
import type { BookTree } from '../src/lib/commands/browser';

/* The book a view is scoped in: two chapters, and in the second one the first section is not built. */
const BOOK: BookTree = {
  title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }, { id: '2.2', title: 'Vectors', built: false }] },
    { id: '16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hookes Law', built: false }, { id: '16.3', title: 'Simple Harmonic Motion', built: true }, { id: '16.4', title: 'The Simple Pendulum', built: true }] },
  ],
};
const here = sectionId('16.3'), sibling = sectionId('16.4'), elsewhere = sectionId('2.1'), unknown = sectionId('9.9');
const ch16 = chapterId('16');
const book: Target = { level: 'book' };
const chapter: Target = { level: 'chapter', chapter: ch16 };
const section: Target = { level: 'section', section: here };
const follow = (level: 'book' | 'chapter' | 'section'): ViewScope => ({ follow: true, level });
const pin = (target: Target): ViewScope => ({ follow: false, target });

test('the levels run wider first, and a new view follows the page it is beside', () => {
  assert.deepEqual(LEVELS, ['book', 'chapter', 'section']);
  assert.deepEqual(FOLLOW_SECTION, { follow: true, level: 'section' });
  assert.equal(levelOf(FOLLOW_SECTION), 'section'); assert.equal(levelOf(pin(chapter)), 'chapter');
});
test('a following view resolves to the place around the focused section at its level', () => {
  assert.deepEqual(resolve(follow('section'), here, BOOK), section);
  assert.deepEqual(resolve(follow('chapter'), here, BOOK), chapter);
  assert.deepEqual(resolve(follow('book'), here, BOOK), book);
});
test('a pinned view resolves to its own target, whatever is being read', () => {
  assert.deepEqual(resolve(pin(chapter), elsewhere, BOOK), chapter);
  assert.deepEqual(resolve(pin(section), elsewhere, BOOK), section);
});
test('a focused section the book does not know has no chapter to follow', () => {
  assert.deepEqual(resolve(follow('chapter'), unknown, BOOK), book);
  assert.deepEqual(resolve(follow('section'), unknown, BOOK), { level: 'section', section: unknown });
  assert.equal(chapterOf(BOOK, unknown), null); assert.equal(chapterOf(BOOK, here), '16');
});

test('widening walks out to the book and stops there', () => {
  assert.deepEqual(widen(follow('section'), BOOK), follow('chapter'));
  assert.deepEqual(widen(follow('chapter'), BOOK), follow('book'));
  assert.deepEqual(widen(follow('book'), BOOK), follow('book'));
});
test('widening keeps a pin until the book, where a pin means nothing', () => {
  assert.deepEqual(widen(pin(section), BOOK), pin(chapter));
  assert.deepEqual(widen(pin(chapter), BOOK), follow('book'));
  assert.deepEqual(widen(pin({ level: 'section', section: unknown }), BOOK), follow('book'));
});
test('narrowing walks in to a section and stops there', () => {
  assert.deepEqual(narrow(follow('book'), here, BOOK), follow('chapter'));
  assert.deepEqual(narrow(follow('chapter'), here, BOOK), follow('section'));
  assert.deepEqual(narrow(follow('section'), here, BOOK), follow('section'));
  assert.deepEqual(narrow(pin(section), elsewhere, BOOK), pin(section));
});
test('a pinned chapter narrows to the section being read when it is one of its own', () => {
  assert.deepEqual(narrow(pin(chapter), sibling, BOOK), pin({ level: 'section', section: sibling }));
});
test('a pinned chapter narrows to its first built section when the reader is elsewhere', () => {
  assert.deepEqual(narrow(pin(chapter), elsewhere, BOOK), pin(section));
  assert.deepEqual(narrow(pin({ level: 'chapter', chapter: chapterId('99') }), elsewhere, BOOK), pin({ level: 'chapter', chapter: chapterId('99') }));
});
test('atLevel repeats the steps until the level asked for is reached', () => {
  assert.deepEqual(atLevel(follow('section'), 'book', here, BOOK), follow('book'));
  assert.deepEqual(atLevel(follow('book'), 'section', here, BOOK), follow('section'));
  assert.deepEqual(atLevel(pin(section), 'book', here, BOOK), follow('book'));
  assert.deepEqual(atLevel(pin(chapter), 'section', elsewhere, BOOK), pin(section));
  assert.deepEqual(atLevel(pin(section), 'section', here, BOOK), pin(section));
});

test('a target covers the built sections under it, in book order', () => {
  assert.deepEqual(sectionsOf(book, BOOK), ['2.1', '16.3', '16.4']);
  assert.deepEqual(sectionsOf(chapter, BOOK), ['16.3', '16.4']);
  assert.deepEqual(sectionsOf(section, BOOK), ['16.3']);
  assert.deepEqual(sectionsOf({ level: 'chapter', chapter: chapterId('99') }, BOOK), []);
});

test('a section target names all three places, short and long', () => {
  const crumbs = crumbsOf(section, BOOK);
  assert.deepEqual(crumbs.map((c) => c.level), ['book', 'chapter', 'section']);
  assert.deepEqual(crumbs.map((c) => c.short), ['Book', 'Ch 16', '16.3']);
  assert.deepEqual(crumbs.map((c) => c.long), ['College Physics', '16 Oscillatory Motion and Waves', '16.3 Simple Harmonic Motion']);
  assert.deepEqual(crumbs.map((c) => c.target), [book, chapter, section]);
});
test('a chapter target names the section narrowing would land on', () => {
  assert.deepEqual(crumbsOf(chapter, BOOK).map((c) => c.short), ['Book', 'Ch 16', '16.3']);
  assert.deepEqual(crumbsOf(book, BOOK).map((c) => c.short), ['Book', 'Ch 2', '2.1']);
  assert.deepEqual(crumbsOf(book, { title: 'Empty', chapters: [] }).map((c) => c.short), ['Book']);
});
test('a target is labelled by its own step of the trail', () => {
  assert.equal(targetLabel(book, BOOK), 'Book');
  assert.equal(targetLabel(chapter, BOOK), 'Ch 16');
  assert.equal(targetLabel(section, BOOK), '16.3');
});
test('two targets are the same when they name the same place', () => {
  assert.ok(sameTarget(chapter, { level: 'chapter', chapter: chapterId('16') }));
  assert.ok(!sameTarget(chapter, { level: 'chapter', chapter: chapterId('2') }));
  assert.ok(!sameTarget(section, { level: 'section', section: sibling }));
  assert.ok(sameTarget(book, { level: 'book' })); assert.ok(!sameTarget(book, chapter));
});

test('a stored scope is read back, and a stored pin on the book is no pin at all', () => {
  assert.deepEqual(parseScope({ follow: true, level: 'chapter' }), follow('chapter'));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'chapter', chapter: '16' } }), pin(chapter));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'section', section: '16.3' } }), pin(section));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'book' } }), follow('book'));
});
test('the pins the older shell wrote, one section per view, are read as pinned sections', () => {
  assert.deepEqual(parseScope('16.3'), pin(section));
  assert.equal(parseScope(''), null);
});
test('anything else out of storage is refused', () => {
  [null, undefined, 7, [], {}, { follow: true, level: 'page' }, { follow: false }, { follow: false, target: { level: 'chapter' } }, { follow: false, target: null }].forEach((raw) =>
    assert.equal(parseScope(raw), null, JSON.stringify(raw ?? null)));
});
