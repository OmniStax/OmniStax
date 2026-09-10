import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOOM_POINTS, DAY, DEFAULT_SETTINGS, applyAttempt, conceptsOf, dayOf, decayed, draw, dueAt, hash, pointsOf, rebuild, stateOf, summarize, togglePick, total,
  type Attempt, type Catalog, type ConceptRecord, type Curriculum, type Mastery, type PracticeSettings,
} from '../src/lib/practice/model';
import type { ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
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
const concept = (id: string, section: string, prereqs: string[] = [], placeholder = false): ConceptDTO => ({ id, kind: 'idea', section, name: id, prereqs, placeholder });
const CONCEPTS: readonly ConceptDTO[] = [
  concept('displacement', '2.1'),
  concept('hookes-law', '16.1', ['displacement']),
  concept('shm', '16.3', ['hookes-law']),
  concept('period', '16.3', ['shm']),
  concept('ghost', '16.3', [], true),
];
const prereqsOf = (id: string): readonly string[] => CONCEPTS.find((c) => c.id === id)?.prereqs ?? [];

const ex = (id: string, bloom: string, concepts: string[], weights?: Record<string, number>): ExerciseDTO =>
  ({ id, kind: 'problem', bloom, concepts, place: 'end', prompt: id, answer: { type: 'open', generated_by: 'source' }, ...(weights ? { weights, weights_by: 'ai' as const } : {}) });
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
test('the same day draws the same session, another day draws another', () => {
  const c: Curriculum = [{ concept: conceptId('shm') }];
  const two = { ...S, session: 2 };
  const monday = draw(c, {}, CAT, [], two, D3, '2026-03-04');
  assert.deepEqual(ids(monday), ids(draw(c, {}, CAT, [], two, D3, '2026-03-04')), 'a refresh is the same session');
  assert.equal(ids(monday)[0], 's1', 'the lowest level first, whatever the seed');
  assert.notDeepEqual(ids(monday), ids(draw(c, {}, CAT, [], two, D3, '2026-03-05')), 'and the tie between the two apply exercises falls the other way tomorrow');
});
test('the tiebreak is a hash of the seed and where the exercise lives', () => {
  assert.equal(hash('a'), hash('a'));
  assert.notEqual(hash('seed:cp/16.3/s2'), hash('seed:cp/16.3/s3'));
  assert.ok(Number.isInteger(hash('seed:cp/16.3/s2')) && hash('seed:cp/16.3/s2') >= 0);
});

/* ---------- what the summary says ---------- */

test('the summary names only what moved, in an order that does not wander', () => {
  const before: Mastery = { displacement: rec({ score: 12, lastAt: D3, earned: 12 }), shm: rec({ score: 4, mastered: false, earned: 4, lastAt: D3 }) };
  const after: Mastery = { ...before, shm: rec({ score: 12, lastAt: D3, earned: 12 }), period: rec({ score: 3, mastered: false, earned: 3, lastAt: D3 }) };
  assert.deepEqual(summarize(before, after, D3, S), [{ id: 'period', from: 'untouched', to: 'practised' }, { id: 'shm', from: 'practised', to: 'mastered' }]);
  assert.deepEqual(summarize(before, before, D3, S), []);
  assert.deepEqual(summarize(before, before, D3 + 28 * DAY, S), [], 'a state read at the same moment on both sides cannot have moved');
});
