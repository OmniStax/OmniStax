import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOOM_POINTS, DAY, DEFAULT_SETTINGS, applyAttempt, conceptsOf, dayOf, decayed, draw, dueAt, hash, heatWeeks, pointsByBook, pointsByDay, pointsOf, rebuild, standingOf, stateOf, stepDay, streakOf, summarize, togglePick, total,
  type Attempt, type Catalog, type ConceptRecord, type Curriculum, type Mastery, type PracticeSettings,
} from '../src/lib/practice/model';
import type { Bloom, ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
import { conceptId, sectionId } from '../src/lib/types/ids';

/* dayOf reads the local calendar, so every timestamp here is built at local
   noon: twelve hours from either boundary, whatever the zone and whatever the
   clock does in the spring. Elapsed time is counted in whole DAYs of
   milliseconds, which is what the decay uses. */
const noon = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();
const D1 = noon(2026, 3, 2), D2 = noon(2026, 3, 3), D3 = noon(2026, 3, 4), D5 = noon(2026, 3, 6);
const S = DEFAULT_SETTINGS;
const sec = (s: string) => sectionId(s);

/* The book the session is drawn from: displacement in chapter 2, then Hooke's
   law, simple harmonic motion and period up the chain in chapter 16. `ghost`
   stands for a section nobody has built. */
const concept = (id: string, section: string, prereqs: string[] = [], placeholder = false): ConceptDTO => {
  const row = { id: conceptId(id), kind: 'idea' as const, section: sectionId(section), name: id, prereqs: prereqs.map(conceptId) };
  return placeholder ? { status: 'placeholder', ...row } : { status: 'built', ...row };
};
const CONCEPTS: readonly ConceptDTO[] = [
  concept('displacement', '2.1'),
  concept('hookes-law', '16.1', ['displacement']),
  concept('shm', '16.3', ['hookes-law']),
  concept('period', '16.3', ['shm']),
  concept('ghost', '16.3', [], true),
];
const prereqsOf = (id: string): readonly string[] => CONCEPTS.find((c) => c.id === id)?.prereqs ?? [];

/* The pipeline writes the level as the schema spells it; these fixtures also spell it as it never would, since the points table is meant to hold whatever comes. */
const ex = (id: string, bloom: string, concepts: string[], weights?: Record<string, number>): ExerciseDTO =>
  ({ id, sourceId: id, kind: 'problem', bloom: bloom as Bloom, concepts: concepts.map(conceptId), place: { at: 'end' }, prompt: id, answer: { type: 'open', generated_by: 'source' }, ...(weights ? { weights } : {}) });
const EX: readonly { book: string; section: ReturnType<typeof sec>; ex: ExerciseDTO }[] = [
  { book: 'cp', section: sec('2.1'), ex: ex('d1', 'remember', ['displacement']) },
  { book: 'cp', section: sec('2.1'), ex: ex('d2', 'apply', ['displacement']) },
  { book: 'cp', section: sec('16.1'), ex: ex('h1', 'remember', ['hookes-law']) },
  { book: 'cp', section: sec('16.1'), ex: ex('h2', 'apply', ['hookes-law']) },
  { book: 'cp', section: sec('16.1'), ex: ex('h3', 'analyze', ['hookes-law']) },
  { book: 'cp', section: sec('16.3'), ex: ex('s1', 'remember', ['shm']) },
  { book: 'cp', section: sec('16.3'), ex: ex('s2', 'apply', ['shm']) },
  { book: 'cp', section: sec('16.3'), ex: ex('s3', 'apply', ['shm']) },
  { book: 'cp', section: sec('16.3'), ex: ex('p1', 'understand', ['period']) },
  { book: 'cp', section: sec('16.3'), ex: ex('p2', 'evaluate', ['period']) },
];
const CHAPTERS: Readonly<Record<string, string[]>> = { '2': ['2.1'], '16': ['16.1', '16.3'] };
const CAT: Catalog = {
  concepts: CONCEPTS,
  sectionsOf: (book, chapter) => (book === 'cp' ? (CHAPTERS[chapter] ?? []).map(sec) : []),
  allSections: (book) => (book === 'cp' ? ['2.1', '16.1', '16.3'].map(sec) : []),
  exercises: EX,
};

const attempt = (id: string, at: number, ok: boolean, earned: Record<string, number>, self = false): Attempt =>
  ({ book: 'cp', section: sec('16.1'), ex: id, at, ok, self, earned: ok ? earned : Object.fromEntries(Object.keys(earned).map((k) => [k, 0])) });
const rec = (over: Partial<ConceptRecord> = {}): ConceptRecord => ({ score: 12, lastAt: D1, days: 3, lastDay: dayOf(D1), mastered: true, halfLife: 7, earned: 12, ...over });
const ids = (drawn: readonly { ex: ExerciseDTO }[]): string[] => drawn.map((d) => d.ex.id);

/* ---------- points ---------- */

test('an exercise is worth its Bloom level to every concept it tests, and two points when the level is not one we know', () => {
  assert.deepEqual([BLOOM_POINTS.remember, BLOOM_POINTS.understand, BLOOM_POINTS.apply, BLOOM_POINTS.analyze, BLOOM_POINTS.evaluate, BLOOM_POINTS.create], [1, 2, 3, 4, 5, 6]);
  assert.equal(BLOOM_POINTS.analyse, BLOOM_POINTS.analyze, 'the pipeline spells it either way');
  assert.deepEqual(pointsOf(ex('x', 'Apply', ['shm', 'period'])), { shm: 3, period: 3 }, 'the level is read without regard to case, and both concepts are evidenced');
  assert.deepEqual(pointsOf(ex('x', 'wondering', ['shm'])), { shm: 2 });
});
test('the weights the pipeline wrote stand in for the table, so a passing mention counts for less', () => {
  assert.deepEqual(pointsOf(ex('x', 'analyze', ['hookes-law', 'displacement'], { 'hookes-law': 4, displacement: 1 })), { 'hookes-law': 4, displacement: 1 });
});

/* ---------- decay ---------- */

test('a score halves over a half-life, and stands still when spaced review is off', () => {
  const r = rec({ score: 12, lastAt: D1, halfLife: 7 });
  assert.equal(decayed(r, D1, S), 12);
  assert.equal(decayed(r, D1 + 7 * DAY, S), 6);
  assert.equal(decayed(r, D1 + 14 * DAY, S), 3);
  assert.equal(decayed(r, D1 + 14 * DAY, { ...S, spaced: false }), 12);
});

/* ---------- one answer at a time ---------- */

test('a right answer adds its points and starts the streak', () => {
  const m = applyAttempt({}, attempt('h1', D1, true, { 'hookes-law': 3 }), prereqsOf, S);
  const r = m['hookes-law'];
  assert.equal(r.score, 3); assert.equal(r.earned, 3); assert.equal(r.days, 1); assert.equal(r.lastDay, dayOf(D1)); assert.equal(r.mastered, false);
  assert.equal(stateOf(r, D1, S), 'practised');
});
test('a wrong answer earns nothing, drops the streak and halves the half-life, never below the base', () => {
  const day2 = applyAttempt(applyAttempt({}, attempt('h1', D1, true, { 'hookes-law': 5 }), prereqsOf, S), attempt('h2', D2, true, { 'hookes-law': 5 }), prereqsOf, S);
  assert.equal(day2['hookes-law'].days, 2); assert.equal(day2['hookes-law'].halfLife, 14, 'each further day of the streak doubles it');
  const wrong = applyAttempt(day2, attempt('h3', D3, false, { 'hookes-law': 4 }), prereqsOf, S);
  const r = wrong['hookes-law'];
  assert.equal(r.earned, day2['hookes-law'].earned, 'a wrong answer is worth nothing');
  assert.ok(r.score < day2['hookes-law'].score, 'and the score has only faded');
  assert.equal(r.days, 0); assert.equal(r.lastDay, '');
  assert.equal(r.halfLife, 7);
  assert.equal(applyAttempt(wrong, attempt('h3', D5, false, { 'hookes-law': 4 }), prereqsOf, S)['hookes-law'].halfLife, 7, 'and never shorter than the base');
});
test('the streak counts distinct days in a row: twice in one day is one, and a day missed starts again', () => {
  const once = applyAttempt({}, attempt('h1', D1, true, { 'hookes-law': 3 }), prereqsOf, S);
  const twice = applyAttempt(once, attempt('h2', D1 + 3600_000, true, { 'hookes-law': 3 }), prereqsOf, S);
  assert.equal(twice['hookes-law'].days, 1); assert.equal(twice['hookes-law'].earned, 6, 'though both answers are worth their points');
  assert.equal(twice['hookes-law'].halfLife, once['hookes-law'].halfLife, 'a second answer the same day does not stretch the spacing');
  const next = applyAttempt(twice, attempt('h3', D2, true, { 'hookes-law': 3 }), prereqsOf, S);
  assert.equal(next['hookes-law'].days, 2);
  assert.equal(applyAttempt(next, attempt('h3', D5, true, { 'hookes-law': 3 }), prereqsOf, S)['hookes-law'].days, 1, 'two days later the run is broken');
});
test('mastery wants the threshold and the days in a row, not one of them', () => {
  const big = applyAttempt({}, attempt('h1', D1, true, { 'hookes-law': 20 }), prereqsOf, S);
  assert.equal(big['hookes-law'].mastered, false, 'twenty points in one sitting is not three days');
  const slow = [D1, D2, D3].reduce((m, at) => applyAttempt(m, attempt('h1', at, true, { 'hookes-law': 1 }), prereqsOf, S), {} as Mastery);
  assert.equal(slow['hookes-law'].days, 3);
  assert.equal(slow['hookes-law'].mastered, false, 'three days of one point apiece is not the threshold');
  const both = [D1, D2, D3].reduce((m, at) => applyAttempt(m, attempt('h1', at, true, { 'hookes-law': 5 }), prereqsOf, S), {} as Mastery);
  assert.equal(both['hookes-law'].mastered, true);
  assert.ok(both['hookes-law'].score >= S.threshold);
  assert.equal(stateOf(both['hookes-law'], D3, S), 'mastered');
});
test('a self-checked answer is ignored outright when the reader has turned them off', () => {
  const a = attempt('h1', D1, true, { 'hookes-law': 3 }, true);
  assert.deepEqual(applyAttempt({}, a, prereqsOf, { ...S, selfChecked: false }), {});
  assert.equal(applyAttempt({}, a, prereqsOf, S)['hookes-law'].earned, 3);
});
test('a right answer keeps what it rests on fresh, all the way down, without paying it anything', () => {
  const before: Mastery = { displacement: rec({ score: 8, lastAt: D1, days: 1, lastDay: dayOf(D1), mastered: false, halfLife: 7, earned: 8 }) };
  /* period sits on shm sits on hookes-law sits on displacement, and shm has no record of its own to stop the walk. */
  const after = applyAttempt(before, attempt('p1', D3, true, { period: 2 }), prereqsOf, S);
  const d = after.displacement;
  assert.equal(d.lastAt, D3, 'its clock is put back to now');
  assert.equal(d.score, 8 * 0.5 ** (2 / 7), 'having faded for the two days since it was last used');
  assert.equal(d.earned, 8, 'and earned nothing');
  assert.equal(d.days, 1); assert.equal(d.lastDay, dayOf(D1), 'the streak is untouched');
  assert.equal(after.shm, undefined, 'a concept never practised gets no record out of it');
  assert.equal(decayed(d, D3, S), d.score, 'which is what keeps it from decaying further');
});
test('a wrong answer freshens nothing below it', () => {
  const before: Mastery = { displacement: rec({ score: 8, lastAt: D1, earned: 8 }) };
  assert.equal(applyAttempt(before, attempt('h1', D3, false, { 'hookes-law': 3 }), prereqsOf, S).displacement.lastAt, D1);
});
test('a cycle in the prerequisites is walked once and let go', () => {
  const loop = (id: string): readonly string[] => (id === 'a' ? ['b'] : id === 'b' ? ['a'] : []);
  const before: Mastery = { b: rec({ score: 4, lastAt: D1, earned: 4 }) };
  const after = applyAttempt(before, attempt('x', D3, true, { a: 3 }), loop, S);
  assert.equal(after.b.lastAt, D3);
  assert.equal(after.a.earned, 3);
});
test('the records are a fold over the attempts, whatever order they arrive in, and the total never goes down', () => {
  const list = [attempt('h1', D3, true, { 'hookes-law': 5 }), attempt('h1', D1, true, { 'hookes-law': 5 }), attempt('h1', D2, true, { 'hookes-law': 5 })];
  const m = rebuild(list, prereqsOf, S);
  assert.equal(m['hookes-law'].days, 3);
  assert.equal(total(m), 15);
  assert.equal(total(rebuild([...list].reverse(), prereqsOf, S)), 15);
  assert.equal(rebuild([], prereqsOf, S)['hookes-law'], undefined);
});
test('the points are counted book by book, and a book answered only wrongly still has a line', () => {
  const list: readonly Attempt[] = [
    attempt('h1', D1, true, { 'hookes-law': 3 }),
    attempt('h2', D2, true, { 'hookes-law': 2, displacement: 1 }),
    { ...attempt('u1', D2, false, { shm: 4 }), book: 'up' },
  ];
  assert.deepEqual(pointsByBook(list), { cp: 6, up: 0 });
  assert.deepEqual(pointsByBook([]), {});
});

/* ---------- the four states ---------- */

test('untouched, practised, mastered and due', () => {
  assert.equal(stateOf(undefined, D1, S), 'untouched');
  assert.equal(stateOf(rec({ earned: 0, mastered: false }), D1, S), 'untouched', 'a record with nothing earned is nothing yet');
  assert.equal(stateOf(rec({ score: 4, mastered: false, earned: 4 }), D1, S), 'practised');
  assert.equal(stateOf(rec({ score: 12 }), D1, S), 'mastered');
  assert.equal(stateOf(rec({ score: 12 }), D1 + 7 * DAY, S), 'due', 'six points left of the ten it wants');
  assert.equal(stateOf(rec({ score: 12 }), D1 + 7 * DAY, { ...S, spaced: false }), 'mastered', 'with decay frozen nothing ever comes due');
});
test('when a mastered concept comes due', () => {
  assert.equal(dueAt(rec({ score: 20, lastAt: D1, halfLife: 7 }), S), D1 + 7 * DAY, 'twenty points is one half-life above ten');
  assert.equal(dueAt(rec({ score: 40, lastAt: D1, halfLife: 7 }), S), D1 + 14 * DAY);
  assert.equal(dueAt(rec({ score: 6, lastAt: D1 }), S), D1, 'already below, it is due as of its last answer');
  assert.equal(dueAt(rec({ mastered: false, earned: 4, score: 4 }), S), null);
  assert.equal(dueAt(rec({ score: 20 }), { ...S, spaced: false }), null);
});

/* ---------- the curriculum ---------- */

test('a pick of a section, a chapter or a book comes to the concepts those sections teach', () => {
  const of = (c: Curriculum) => [...conceptsOf(c, CAT)].sort();
  assert.deepEqual(of([{ book: 'cp', section: sec('16.3') }]), ['period', 'shm'], 'the placeholder in that section is left out');
  assert.deepEqual(of([{ book: 'cp', chapter: '16' }]), ['hookes-law', 'period', 'shm']);
  assert.deepEqual(of([{ book: 'cp' }]), ['displacement', 'hookes-law', 'period', 'shm']);
  assert.deepEqual(of([{ book: 'elsewhere' }]), [], 'a book this build does not hold comes to nothing');
});
test('a concept is picked on its own, and a placeholder cannot be', () => {
  assert.deepEqual([...conceptsOf([{ concept: conceptId('shm') }], CAT)], ['shm']);
  assert.deepEqual([...conceptsOf([{ concept: conceptId('ghost') }], CAT)], []);
  assert.deepEqual([...conceptsOf([{ book: 'cp', section: sec('2.1') }, { concept: conceptId('period') }], CAT)].sort(), ['displacement', 'period']);
});
test('picking the same thing twice takes it back out', () => {
  const p = { book: 'cp', section: sec('16.1') };
  assert.deepEqual(togglePick(togglePick([], p), { book: 'cp', section: sec('16.1') }), []);
  assert.equal(togglePick([p], { book: 'cp', chapter: '16' }).length, 2, 'a chapter is not the section inside it');
});

/* ---------- drawing a session ---------- */

const SMALL: PracticeSettings = { ...S, session: 8 };

test('an untouched concept is met at the lowest Bloom level first, and worked upward', () => {
  const out = draw([{ book: 'cp', section: sec('16.1') }], {}, CAT, [], SMALL, D3, 'seed');
  assert.deepEqual(ids(out), ['h1', 'h2', 'h3']);
  assert.deepEqual([...new Set(out.map((d) => d.why))], ['frontier']);
});
test('a concept with a score is met at the harder end instead', () => {
  const m: Mastery = { 'hookes-law': rec({ score: 4, mastered: false, earned: 4, lastAt: D3 }) };
  assert.deepEqual(ids(draw([{ book: 'cp', section: sec('16.1') }], m, CAT, [], SMALL, D3, 'seed')), ['h3', 'h2', 'h1']);
});
test('the frontier is what the reader is ready for: a concept whose prerequisites inside the curriculum are mastered', () => {
  const book: Curriculum = [{ book: 'cp' }];
  const fresh = draw(book, {}, CAT, [], SMALL, D3, 'seed');
  assert.deepEqual(ids(fresh).slice(0, 2), ['d1', 'd2'], 'only displacement rests on nothing, so the session opens on it');
  assert.deepEqual(fresh.slice(0, 2).map((d) => d.why), ['frontier', 'frontier']);
  assert.equal(fresh[2].why, 'more', 'everything above it is still out of reach');
  const known: Mastery = { displacement: rec({ score: 12, lastAt: D3, earned: 12 }) };
  const next = draw(book, known, CAT, [], SMALL, D3, 'seed');
  assert.deepEqual(ids(next).slice(0, 3), ['h1', 'h2', 'h3'], 'with displacement mastered, Hookes law is the frontier');
  assert.deepEqual([...new Set(next.slice(0, 3).map((d) => d.why))], ['frontier']);
});
test('review comes first and takes no more of the session than its share', () => {
  /* Four concepts due at once, each further past the threshold than the last. */
  const due = (halves: number): ConceptRecord => rec({ score: 16, halfLife: 7, lastAt: D3 - halves * 7 * DAY, earned: 16 });
  const m: Mastery = { displacement: due(4), 'hookes-law': due(3), shm: due(2), period: due(1) };
  const out = draw([{ book: 'cp' }], m, CAT, [], SMALL, D3, 'seed');
  assert.equal(out.length, 8);
  assert.deepEqual(out.map((d) => d.why).slice(0, 3), ['review', 'review', 'review'], 'a third of eight, rounded, is three');
  assert.equal(out[3].why, 'more');
  assert.deepEqual(out.slice(0, 3).map((d) => d.ex.concepts[0]), ['displacement', 'hookes-law', 'shm'], 'the most overdue first');
});
test('an exercise answered rightly in the last two days is left alone', () => {
  const done: Attempt = { book: 'cp', section: sec('16.1'), ex: 'h1', at: D3 - DAY, ok: true, self: false, earned: { 'hookes-law': 1 } };
  assert.deepEqual(ids(draw([{ book: 'cp', section: sec('16.1') }], {}, CAT, [done], SMALL, D3, 'seed')), ['h2', 'h3']);
  assert.deepEqual(ids(draw([{ book: 'cp', section: sec('16.1') }], {}, CAT, [{ ...done, at: D3 - 3 * DAY }], SMALL, D3, 'seed')), ['h1', 'h2', 'h3'], 'three days on it comes round again');
  const overdue: Mastery = { 'hookes-law': rec({ score: 16, lastAt: D3 - 28 * DAY, earned: 16 }) };
  assert.ok(ids(draw([{ book: 'cp', section: sec('16.1') }], overdue, CAT, [done], SMALL, D3, 'seed')).includes('h1'), 'unless the concept has come due');
});
test('a session never draws the same exercise twice and never draws more than its size', () => {
  const out = draw([{ book: 'cp' }], {}, CAT, [], SMALL, D3, 'seed');
  assert.equal(out.length, 8);
  assert.equal(new Set(ids(out)).size, 8);
  const big = draw([{ book: 'cp' }], {}, CAT, [], { ...S, session: 40 }, D3, 'seed');
  assert.equal(big.length, EX.length, 'and stops when the exercises run out');
});
test('a pick of a concept reaches into any section that tests it', () => {
  const out = draw([{ concept: conceptId('shm') }], {}, CAT, [], SMALL, D3, 'seed');
  assert.deepEqual(ids(out).sort(), ['s1', 's2', 's3']);
});
test('a shuffled session is the same on a refresh and another one on another seed', () => {
  const c: Curriculum = [{ concept: conceptId('shm') }];
  const two = { ...S, session: 2 };
  const shuffled = (seed: string) => draw(c, {}, CAT, [], two, D3, seed, { order: 'random' });
  const monday = shuffled('2026-03-04');
  assert.deepEqual(ids(monday), ids(shuffled('2026-03-04')), 'a refresh is the same session');
  assert.equal(ids(monday)[0], 's1', 'the lowest level first, whatever the seed');
  assert.notDeepEqual(ids(monday), ids(shuffled('2026-03-05')), 'and the tie between the two apply exercises falls the other way on another seed');
});
test('the tiebreak is a hash of the seed and where the exercise lives', () => {
  assert.equal(hash('a'), hash('a'));
  assert.notEqual(hash('seed:cp/16.3/s2'), hash('seed:cp/16.3/s3'));
  assert.ok(Number.isInteger(hash('seed:cp/16.3/s2')) && hash('seed:cp/16.3/s2') >= 0);
});

/* ---------- the order a session comes in ---------- */

/* One concept, four exercises of the same level in three sections of two books,
   so that every tie falls to where the exercise stands rather than to what it
   is worth. The manifest builds 16.1 before 2.1, which the order the exercises
   were listed in does not. */
const ORDERED: Catalog = {
  concepts: [concept('displacement', '2.1')],
  sectionsOf: () => [],
  allSections: (book) => (book === 'cp' ? ['16.1', '2.1'].map(sec) : book === 'up' ? [sec('9.9')] : []),
  exercises: [
    { book: 'cp', section: sec('2.1'), ex: ex('a', 'remember', ['displacement']) },
    { book: 'up', section: sec('9.9'), ex: ex('z', 'remember', ['displacement']) },
    { book: 'cp', section: sec('16.1'), ex: ex('b', 'remember', ['displacement']) },
    { book: 'cp', section: sec('16.1'), ex: ex('c', 'remember', ['displacement']) },
  ],
};
const ONE: Curriculum = [{ concept: conceptId('displacement') }];

test('by default a tie falls to where the exercise stands: the book on the shelf, the section in the manifest, the exercise in the section', () => {
  assert.deepEqual(ids(draw(ONE, {}, ORDERED, [], S, D3, 'seed')), ['b', 'c', 'a', 'z'], 'the book being read first, its chapter 16 before its chapter 2, and the other book after both');
  assert.deepEqual(ids(draw(ONE, {}, ORDERED, [], S, D3, 'another seed')), ['b', 'c', 'a', 'z'], 'and the seed does not come into it');
});
test('a shuffled draw takes the seed instead, and the same seed twice is the same draw', () => {
  const shuffled = (seed: string) => ids(draw(ONE, {}, ORDERED, [], S, D3, seed, { order: 'random' }));
  assert.deepEqual(shuffled('one'), shuffled('one'));
  assert.deepEqual([...shuffled('one')].sort(), ['a', 'b', 'c', 'z'], 'the same four, in an order of its own');
  assert.notDeepEqual(shuffled('one'), ['b', 'c', 'a', 'z']);
});
test('an excluded exercise is never drawn, and the size stands in for the session', () => {
  assert.deepEqual(ids(draw(ONE, {}, ORDERED, [], S, D3, 'seed', { exclude: new Set(['cp/16.1/b', 'up/9.9/z']) })), ['c', 'a']);
  assert.deepEqual(ids(draw(ONE, {}, ORDERED, [], S, D3, 'seed', { size: 2 })), ['b', 'c']);
  assert.deepEqual(ids(draw(ONE, {}, ORDERED, [], S, D3, 'seed', { size: 1, exclude: new Set(['cp/16.1/b']) })), ['c'], 'the two together are what a re-draw of what is left asks for');
});

/* ---------- what the dashboard reads ---------- */

test('the points are counted day by day, and a day answered only wrongly is a day with nothing on it', () => {
  const list: readonly Attempt[] = [
    attempt('h1', D1, true, { 'hookes-law': 3 }),
    attempt('h2', D1, true, { 'hookes-law': 2, displacement: 1 }),
    attempt('h3', D2, false, { 'hookes-law': 4 }),
  ];
  assert.deepEqual(pointsByDay(list), { [dayOf(D1)]: 6, [dayOf(D2)]: 0 });
  assert.deepEqual(pointsByDay([]), {});
});
test('the streak is the days in a row with a right answer, counted back from today or from yesterday', () => {
  const D4 = noon(2026, 3, 5);
  const run: readonly Attempt[] = [D1, D2, D3].map((at) => attempt('h1', at, true, { 'hookes-law': 3 }));
  assert.equal(streakOf(run, D3), 3, 'three days up to today');
  assert.equal(streakOf(run, D4), 3, 'today is not over, so a streak that ended yesterday still stands');
  assert.equal(streakOf(run, D5), 0, 'with yesterday empty as well it is broken');
  assert.equal(streakOf([attempt('h1', D1, true, { 'hookes-law': 3 }), attempt('h1', D3, true, { 'hookes-law': 3 })], D3), 1, 'a day missed starts it again');
  assert.equal(streakOf([attempt('h1', D3, false, { 'hookes-law': 3 })], D3), 0, 'a wrong answer is not a day kept');
  assert.equal(streakOf([], D3), 0);
});
test('how a set of concepts stands, counted by state and only where the book is built', () => {
  const m: Mastery = {
    displacement: rec({ score: 12, lastAt: D3, earned: 12 }),
    'hookes-law': rec({ score: 4, mastered: false, earned: 4, lastAt: D3 }),
    shm: rec({ score: 16, lastAt: D3 - 28 * DAY, earned: 16 }),
    ghost: rec({ score: 12, lastAt: D3, earned: 12 }),
  };
  assert.deepEqual(standingOf(CONCEPTS, m, S, D3), { untouched: 1, practised: 1, mastered: 1, due: 1 }, 'period is untouched and the placeholder is not counted at all');
  assert.deepEqual(standingOf([], {}, S, D3), { untouched: 0, practised: 0, mastered: 0, due: 0 });
});
test('the heatmap is fifty-two weeks of seven days, ending on today', () => {
  const weeks = heatWeeks(D3);
  const dow = new Date(D3).getDay();
  assert.equal(weeks.length, 52);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks[51][dow], dayOf(D3), 'today stands on its own weekday in the last column');
  assert.deepEqual(weeks[51].slice(dow + 1), Array.from({ length: 6 - dow }, () => ''), 'the days still to come are empty, and the column keeps its seven cells');
  assert.equal(weeks[51][0], stepDay(dayOf(D3), -dow), 'the last column opens on this week\'s Sunday');
  assert.equal(weeks[0][0], stepDay(weeks[51][0], -51 * 7), 'and the first one fifty-one weeks before it');
  assert.equal(weeks.flat().filter((d) => d === '').length, 6 - dow, 'nothing else is empty');
  assert.equal(heatWeeks(D3, 4).length, 4);
});

/* ---------- what the summary says ---------- */

test('the summary names only what moved, in an order that does not wander', () => {
  const before: Mastery = { displacement: rec({ score: 12, lastAt: D3, earned: 12 }), shm: rec({ score: 4, mastered: false, earned: 4, lastAt: D3 }) };
  const after: Mastery = { ...before, shm: rec({ score: 12, lastAt: D3, earned: 12 }), period: rec({ score: 3, mastered: false, earned: 3, lastAt: D3 }) };
  assert.deepEqual(summarize(before, after, D3, S), [{ id: 'period', from: 'untouched', to: 'practised' }, { id: 'shm', from: 'practised', to: 'mastered' }]);
  assert.deepEqual(summarize(before, before, D3, S), []);
  assert.deepEqual(summarize(before, before, D3 + 28 * DAY, S), [], 'a state read at the same moment on both sides cannot have moved');
});
