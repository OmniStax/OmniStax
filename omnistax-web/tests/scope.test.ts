import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOLLOW_SECTION, LEVELS, atLevel, chapterOf, choose, crumbsOf, levelOf, narrow, parseScope, parseScopes, resolve, sameTarget, scopeAt, sectionsOf, siblingsOf, stepSibling, targetLabel, widen, inBook, UNKNOWN, type Target, type ViewScope } from '../src/lib/sections/scope';
import { bookId, chapterId, sectionId, sectionRef, type SectionId } from '../src/lib/types/ids';
import type { BookTree } from '../src/lib/commands/browser';

/* The book a view is scoped in: two chapters, and in the second one the first section is not built. */
const BOOK: BookTree = {
  id: bookId('college-physics-2e'),
  title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }, { id: '2.2', title: 'Vectors', built: false }] },
    { id: '16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hookes Law', built: false }, { id: '16.3', title: 'Simple Harmonic Motion', built: true }, { id: '16.4', title: 'The Simple Pendulum', built: true }] },
  ],
};
const B = BOOK.id;
const at = (s: SectionId) => sectionRef(B, s);
const here = sectionId('16.3'), sibling = sectionId('16.4'), elsewhere = sectionId('2.1'), unknown = sectionId('9.9');
const ch16 = chapterId('16');
const book: Target = { level: 'book', book: B };
const chapter: Target = { level: 'chapter', book: B, chapter: ch16 };
const section: Target = { level: 'section', book: B, section: here };
const follow = (level: 'book' | 'chapter' | 'section'): ViewScope => ({ follow: true, level });
const pin = (target: Target): ViewScope => ({ follow: false, target });

test('the levels run wider first, and a new view follows the page it is beside', () => {
  assert.deepEqual(LEVELS, ['book', 'chapter', 'section']);
  assert.deepEqual(FOLLOW_SECTION, { follow: true, level: 'section' });
  assert.equal(levelOf(FOLLOW_SECTION), 'section'); assert.equal(levelOf(pin(chapter)), 'chapter');
});
test('a following view resolves to the place around the focused section at its level', () => {
  assert.deepEqual(resolve(follow('section'), at(here), BOOK), section);
  assert.deepEqual(resolve(follow('chapter'), at(here), BOOK), chapter);
  assert.deepEqual(resolve(follow('book'), at(here), BOOK), book);
});
test('a pinned view resolves to its own target, whatever is being read', () => {
  assert.deepEqual(resolve(pin(chapter), at(elsewhere), BOOK), chapter);
  assert.deepEqual(resolve(pin(section), at(elsewhere), BOOK), section);
});
test('a focused section the book does not know has no chapter to follow', () => {
  assert.deepEqual(resolve(follow('chapter'), at(unknown), BOOK), book);
  assert.deepEqual(resolve(follow('section'), at(unknown), BOOK), { level: 'section', book: B, section: unknown });
  assert.equal(chapterOf(BOOK, unknown), null); assert.equal(chapterOf(BOOK, here), '16');
});

test('widening walks out to the book and stops there', () => {
  assert.deepEqual(widen(follow('section'), BOOK), follow('chapter'));
  assert.deepEqual(widen(follow('chapter'), BOOK), follow('book'));
  assert.deepEqual(widen(follow('book'), BOOK), follow('book'));
});
test('widening keeps a pin, and its book, out to the book', () => {
  assert.deepEqual(widen(pin(section), BOOK), pin(chapter));
  assert.deepEqual(widen(pin(chapter), BOOK), pin(book), 'a pin keeps its book');
  assert.deepEqual(widen(pin({ level: 'section', book: B, section: unknown }), BOOK), pin(book));
});
test('narrowing walks in to a section and stops there', () => {
  assert.deepEqual(narrow(follow('book'), at(here), BOOK), follow('chapter'));
  assert.deepEqual(narrow(follow('chapter'), at(here), BOOK), follow('section'));
  assert.deepEqual(narrow(follow('section'), at(here), BOOK), follow('section'));
  assert.deepEqual(narrow(pin(section), at(elsewhere), BOOK), pin(section));
});
test('a pinned chapter narrows to the section being read when it is one of its own', () => {
  assert.deepEqual(narrow(pin(chapter), at(sibling), BOOK), pin({ level: 'section', book: B, section: sibling }));
});
test('a pinned chapter narrows to its first built section when the reader is elsewhere', () => {
  assert.deepEqual(narrow(pin(chapter), at(elsewhere), BOOK), pin(section));
  assert.deepEqual(narrow(pin({ level: 'chapter', book: B, chapter: chapterId('99') }), at(elsewhere), BOOK), pin({ level: 'chapter', book: B, chapter: chapterId('99') }));
});
test('atLevel repeats the steps until the level asked for is reached', () => {
  assert.deepEqual(atLevel(follow('section'), 'book', at(here), BOOK), follow('book'));
  assert.deepEqual(atLevel(follow('book'), 'section', at(here), BOOK), follow('section'));
  assert.deepEqual(atLevel(pin(section), 'book', at(here), BOOK), pin(book));
  assert.deepEqual(atLevel(pin(chapter), 'section', at(elsewhere), BOOK), pin(section));
  assert.deepEqual(atLevel(pin(section), 'section', at(here), BOOK), pin(section));
});

test('a target covers the built sections under it, in book order', () => {
  assert.deepEqual(sectionsOf(book, BOOK), ['2.1', '16.3', '16.4']);
  assert.deepEqual(sectionsOf(chapter, BOOK), ['16.3', '16.4']);
  assert.deepEqual(sectionsOf(section, BOOK), ['16.3']);
  assert.deepEqual(sectionsOf({ level: 'chapter', book: B, chapter: chapterId('99') }, BOOK), []);
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
  assert.deepEqual(crumbsOf(book, { id: bookId('empty'), title: 'Empty', chapters: [] }).map((c) => c.short), ['Book']);
});
test('a target is labelled by its own step of the trail', () => {
  assert.equal(targetLabel(book, BOOK), 'Book');
  assert.equal(targetLabel(chapter, BOOK), 'Ch 16');
  assert.equal(targetLabel(section, BOOK), '16.3');
});
test('two targets are the same when they name the same place', () => {
  assert.ok(sameTarget(chapter, { level: 'chapter', book: B, chapter: chapterId('16') }));
  assert.ok(!sameTarget(chapter, { level: 'chapter', book: B, chapter: chapterId('2') }));
  assert.ok(!sameTarget(section, { level: 'section', book: B, section: sibling }));
  assert.ok(sameTarget(book, { level: 'book', book: B })); assert.ok(!sameTarget(book, chapter));
});

test('choosing the place the open page lies in follows it again, and any other place pins', () => {
  assert.deepEqual(choose(section, at(here), BOOK), follow('section'));
  assert.deepEqual(choose(section, at(elsewhere), BOOK), pin(section));
  assert.deepEqual(choose(chapter, at(here), BOOK), follow('chapter'));
  assert.deepEqual(choose(chapter, at(elsewhere), BOOK), pin(chapter));
  assert.deepEqual(choose(book, at(here), BOOK), follow('book'), 'the book is the same book whatever is being read');
});

test('a chapter menu offers every chapter the book lists, and says which have something built', () => {
  assert.deepEqual(siblingsOf('chapter', section, BOOK), [
    { target: { level: 'chapter', book: B, chapter: chapterId('2') }, id: '2', title: 'Kinematics', built: true },
    { target: chapter, id: '16', title: 'Oscillatory Motion and Waves', built: true },
  ]);
  const unbuilt = { id: bookId('college-physics-2e'), title: 'College Physics', chapters: [...BOOK.chapters, { id: '17', title: 'Physics of Hearing', sections: [{ id: '17.1', title: 'Sound', built: false }] }] };
  assert.deepEqual(siblingsOf('chapter', book, unbuilt).map((c) => [c.id, c.built]), [['2', true], ['16', true], ['17', false]]);
});
test('a section menu offers the sections of the chapter the trail runs through, built or not', () => {
  assert.deepEqual(siblingsOf('section', section, BOOK).map((s) => [s.id, s.title, s.built]), [['16.1', 'Hookes Law', false], ['16.3', 'Simple Harmonic Motion', true], ['16.4', 'The Simple Pendulum', true]]);
  assert.deepEqual(siblingsOf('section', chapter, BOOK).map((s) => s.id), ['16.1', '16.3', '16.4']);
  assert.deepEqual(siblingsOf('section', book, BOOK).map((s) => s.id), ['2.1', '2.2'], 'the book stands at its first chapter, as the trail does');
  assert.deepEqual(siblingsOf('section', { level: 'section', book: B, section: unknown }, BOOK), []);
});

test('stepping at chapter level walks the chapters and holds at both ends', () => {
  const ch2: Target = { level: 'chapter', book: B, chapter: chapterId('2') };
  assert.deepEqual(stepSibling(pin(chapter), -1, at(here), BOOK), pin(ch2));
  assert.deepEqual(stepSibling(pin(ch2), 1, at(here), BOOK), follow('chapter'), 'the chapter being read is followed, not pinned');
  assert.deepEqual(stepSibling(pin(ch2), -1, at(here), BOOK), pin(ch2));
  assert.deepEqual(stepSibling(pin(chapter), 1, at(here), BOOK), pin(chapter));
});
test('stepping at section level runs through the built sections of the whole book', () => {
  const s21: Target = { level: 'section', book: B, section: elsewhere }, s164: Target = { level: 'section', book: B, section: sibling };
  assert.deepEqual(stepSibling(FOLLOW_SECTION, 1, at(here), BOOK), pin(s164));
  assert.deepEqual(stepSibling(pin(s164), -1, at(here), BOOK), follow('section'), 'stepping back onto the open page follows it again');
  assert.deepEqual(stepSibling(pin(s21), 1, at(here), BOOK), follow('section'), 'the step runs on past the end of a chapter');
  assert.deepEqual(stepSibling(pin(s21), -1, at(here), BOOK), pin(s21));
  assert.deepEqual(stepSibling(pin(s164), 1, at(here), BOOK), pin(s164));
  assert.deepEqual(stepSibling(FOLLOW_SECTION, 1, at(unknown), BOOK), FOLLOW_SECTION, 'a section the book does not know has nothing to step from');
});
test('the book has no siblings to step through', () => {
  assert.deepEqual(stepSibling(follow('book'), 1, at(here), BOOK), follow('book'));
  assert.deepEqual(stepSibling(follow('book'), -1, at(here), BOOK), follow('book'));
});

test('a stored scope is read back, and a stored pin on the book is no pin at all unless it names its book', () => {
  assert.deepEqual(parseScope({ follow: true, level: 'chapter' }, B), follow('chapter'));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'chapter', chapter: '16' } }, B), pin(chapter));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'section', section: '16.3' } }, B), pin(section));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'book' } }, B), follow('book'));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'book', book: 'chemistry-2e' } }, B), pin({ level: 'book', book: bookId('chemistry-2e') }));
  assert.deepEqual(parseScope({ follow: false, target: { level: 'section', book: 'chemistry-2e', section: '1.1' } }, B), pin({ level: 'section', book: bookId('chemistry-2e'), section: sectionId('1.1') }));
});
test('the pins the older shell wrote, one section per view, are read as pinned sections', () => {
  assert.deepEqual(parseScope('16.3', B), pin(section));
  assert.equal(parseScope('', B), null);
});
test('anything else out of storage is refused', () => {
  [null, undefined, 7, [], {}, { follow: true, level: 'page' }, { follow: false }, { follow: false, target: { level: 'chapter' } }, { follow: false, target: null }].forEach((raw) =>
    assert.equal(parseScope(raw, B), null, JSON.stringify(raw ?? null)));
});

test('every page of a view stands where it was left, and a new one follows the page being read', () => {
  const map = 'view:concepts@ab12cd', other = 'view:concepts@ef34gh';
  const saved = parseScopes({ concepts: '16.3', [map]: { follow: false, target: { level: 'chapter', chapter: '16' } }, [other]: { follow: true, level: 'book' }, 'view:formulas': 42 }, B);
  assert.deepEqual(saved['view:concepts'], pin(section), 'a pin saved against the bare kind belongs to that kind\'s singleton');
  assert.deepEqual(saved[map], pin(chapter)); assert.deepEqual(saved[other], follow('book'), 'two pages of one view stand where each was left');
  assert.equal('view:formulas' in saved, false, 'an entry that does not read as a scope is left out');
  assert.deepEqual(scopeAt(saved, 'view:concepts@999999'), FOLLOW_SECTION, 'a page nothing was saved for follows the section being read');
  assert.deepEqual(parseScopes(null, B), {}); assert.deepEqual(parseScopes('scopes', B), {});
});

test('a target names its book, and the same place in two books is two places', () => {
  const other = bookId('chemistry-2e');
  assert.ok(!sameTarget(chapter, { level: 'chapter', book: other, chapter: ch16 }));
  assert.deepEqual(resolve(follow('section'), sectionRef(other, sectionId('1.1')), BOOK), { level: 'section', book: other, section: sectionId('1.1') });
  assert.deepEqual(resolve(follow('chapter'), sectionRef(other, here), BOOK), { level: 'book', book: other }, 'another book\'s tree names no chapter of this one');
  assert.deepEqual(narrow(pin(chapter), sectionRef(other, sibling), BOOK), pin(section), 'the same number in another book is not the section being read');
  assert.deepEqual(choose({ level: 'book', book: other }, at(here), BOOK), pin({ level: 'book', book: other }));
  assert.deepEqual(narrow(pin(book), at(elsewhere), BOOK), pin({ level: 'chapter', book: B, chapter: chapterId('2') }));
});
test('a pin read before targets named their book takes the boot book', () => {
  const read = parseScope('16.3', UNKNOWN)!;
  assert.deepEqual(inBook(read, B), pin(section));
  assert.deepEqual(inBook(follow('book'), B), follow('book'));
});
