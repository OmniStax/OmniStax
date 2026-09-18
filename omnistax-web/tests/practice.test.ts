import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY, DEFAULT_SETTINGS, availabilityOf, conceptsOf, dayOf, fillOf, freshnessOf,
  heatWeeks, newSessionId, poolOf, prepare, progressOf, rebuild, shareOf,
  standingOf, stateOf, stepDay, streakOf, togglePick, uniqueById, workByDay,
  type Attempt, type Catalog, type ConceptRecord, type Mastery, type Presentation,
  type RoundEnd,
} from '../src/lib/practice/model';
import type { Bloom, ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
import { conceptId, sectionId } from '../src/lib/types/ids';

const noon = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();
const D1 = noon(2026, 3, 2), D2 = noon(2026, 3, 3), D3 = noon(2026, 3, 4), D5 = noon(2026, 3, 6);
const sec = sectionId;
const concept = (id: string, section: string): ConceptDTO => ({ status: 'built', id: conceptId(id), kind: 'idea', section: sec(section), name: id, prereqs: [], why: '', evidence: '' });
const ex = (id: string, concepts: string[], bloom = 'apply', at: 'end' | 'inline' = 'end'): ExerciseDTO => ({
  id, sourceId: id, kind: 'problem', bloom: bloom as Bloom, concepts: concepts.map(conceptId),
  place: at === 'end' ? { at } : { at, after: 'x' as never }, prompt: id,
  answer: { type: 'open', generated_by: 'source' },
});
const concepts = [concept('a', '1.1'), concept('b', '1.1'), concept('c', '1.2'), concept('zero', '1.2')];
const rows = [
  { book: 'cp', section: sec('1.1'), ex: ex('a1', ['a'], 'remember') },
  { book: 'cp', section: sec('1.1'), ex: ex('ab', ['a', 'b']) },
  { book: 'cp', section: sec('1.1'), ex: ex('a3', ['a'], 'analyze') },
  { book: 'cp', section: sec('1.1'), ex: ex('b1', ['b'], 'remember') },
  { book: 'cp', section: sec('1.1'), ex: ex('b2', ['b']) },
  { book: 'cp', section: sec('1.2'), ex: ex('c1', ['c']) },
  { book: 'cp', section: sec('1.2'), ex: ex('try', ['c'], 'understand', 'inline') },
];
const cat: Catalog = {
  concepts,
  sectionsOf: (book, chapter) => book === 'cp' && chapter === '1' ? [sec('1.1'), sec('1.2')] : [],
  allSections: (book) => book === 'cp' ? [sec('1.1'), sec('1.2')] : [],
  exercises: rows,
};
const attempt = (id: string, at: number, ok: boolean, ids: string[], round?: ReturnType<typeof newSessionId>): Attempt => ({ book: 'cp', section: sec('1.1'), ex: id, at, ok, concepts: ids, ...(round ? { round } : {}) });
const record = (over: Partial<ConceptRecord> = {}): ConceptRecord => ({ level: 3, target: 3, mastered: true, masteredAt: D1, lastAt: D1, halfLife: 3, reviewedAt: D1, dueAt: D1 + 3 * DAY, selfAssessed: false, noDecay: false, ...over });

test('calendar helpers and completion streak count any submitted exercise', () => {
  assert.equal(dayOf(D1), '2026-03-02');
  assert.equal(stepDay('2026-03-02', 1), '2026-03-03');
  const list = [attempt('a1', D1, false, ['a']), attempt('a2', D2, true, ['a'])];
  assert.equal(streakOf(list, D3), 2, 'a wrong submitted answer still keeps the practice streak');
  assert.deepEqual(workByDay(list)[dayOf(D1)], { completed: 1, correct: 0 });
  assert.equal(streakOf(list, D5), 0);
  assert.equal(heatWeeks(D3, 2).length, 2);
});

test('attainment changes by one, wrong answers lower it, and active rounds do not settle early', () => {
  const round = newSessionId();
  const active = [attempt('a1', D1, true, ['a'], round), attempt('a2', D1 + 1, true, ['a'], round), attempt('a3', D1 + 2, true, ['a'], round)];
  assert.equal(rebuild(active, [], {}, DEFAULT_SETTINGS, { a: 3 }).a, undefined);
  const end: RoundEnd = { id: round, started: D1, at: D2, concepts: [], newlyMastered: ['a'] };
  const mastered = rebuild(active, [end], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(mastered.level, 3); assert.equal(mastered.mastered, true);
  const wrong = rebuild([...active, attempt('again', D3, false, ['a'])], [end], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(wrong.mastered, true, 'mastery is sticky');
});

test('an unmastered concept uses a discrete fraction and a lower target can master it immediately', () => {
  const list = [attempt('a1', D1, true, ['a']), attempt('a2', D2, true, ['a']), attempt('a3', D3, false, ['a'])];
  const r = rebuild(list, [], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(r.level, 1); assert.equal(r.target, 3); assert.equal(shareOf(r), 1 / 3); assert.equal(stateOf(r), 'practised');
  const lower = rebuild(list.slice(0, 2), [], {}, { ...DEFAULT_SETTINGS, masteryTarget: 2 }, { a: 3 }).a;
  assert.equal(lower.mastered, true); assert.equal(lower.level, 2);
});

test('concepts with one or two exercises use their available count as the denominator', () => {
  const available = availabilityOf(cat);
  assert.deepEqual(available, { a: 3, b: 3, c: 1 });
  const c = rebuild([attempt('c1', D1, true, ['c'])], [], {}, DEFAULT_SETTINGS, available).c;
  assert.equal(c.target, 1); assert.equal(c.mastered, true);
});

test('earned mastery survives a later increase in available exercises', () => {
  const earned: Attempt = { ...attempt('c1', D1, true, ['c']), mastered: ['c'], release: 'release-a' };
  const afterUpdate = rebuild([earned], [], {}, DEFAULT_SETTINGS, { c: 3 }).c;
  assert.equal(afterUpdate.mastered, true);
  assert.equal(afterUpdate.target, 3);
  assert.equal(afterUpdate.level, 3);
});

test('freshness begins at mastery, becomes due at one half-life, and successful due reviews double it', () => {
  const first: RoundEnd = { id: newSessionId(), started: D1, at: D1, concepts: [], newlyMastered: ['a'] };
  const base = rebuild([], [first], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(freshnessOf(base, DEFAULT_SETTINGS, D1 + 2 * DAY).due, false);
  assert.equal(freshnessOf(base, DEFAULT_SETTINGS, D1 + 3 * DAY).due, true);
  const review: RoundEnd = { id: newSessionId(), started: D1 + 3 * DAY, at: D1 + 3 * DAY, newlyMastered: [], concepts: [{ id: 'a', expected: 3, answered: 3, correct: 3, wasMastered: true, wasDue: true }] };
  const next = rebuild([], [first, review], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(next.halfLife, 6); assert.equal(next.dueAt, review.at + 6 * DAY);
});

test('partial good reviews preserve freshness, incomplete reviews cannot lengthen, and poor reviews schedule tomorrow', () => {
  const first: RoundEnd = { id: newSessionId(), started: D1, at: D1, concepts: [], newlyMastered: ['a'] };
  const review = (answered: number, correct: number): RoundEnd => ({ id: newSessionId(), started: D5, at: D5, newlyMastered: [], concepts: [{ id: 'a', expected: 3, answered, correct, wasMastered: true, wasDue: true }] });
  assert.equal(rebuild([], [first, review(2, 2)], {}, DEFAULT_SETTINGS, { a: 3 }).a.reviewedAt, D1);
  assert.equal(rebuild([], [first, review(3, 2)], {}, DEFAULT_SETTINGS, { a: 3 }).a.halfLife, 3);
  const poor = rebuild([], [first, review(2, 1)], {}, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(poor.dueAt, D5 + DAY);
});

test('self-assessment is separate, reversible, and can disable decay', () => {
  const self = { a: { level: 3, mastered: true, at: D2, noDecay: true } };
  const r = rebuild([], [], self, DEFAULT_SETTINGS, { a: 3 }).a;
  assert.equal(r.selfAssessed, true); assert.equal(r.noDecay, true); assert.equal(freshnessOf(r, DEFAULT_SETTINGS, D2 + 999 * DAY).permanent, true);
  assert.equal(rebuild([], [], {}, DEFAULT_SETTINGS, { a: 3 }).a, undefined);
});

test('inline Try Its never enter the practice pool or availability', () => {
  assert.deepEqual([...conceptsOf([{ book: 'cp', section: sec('1.2') }], cat)], ['c']);
  assert.deepEqual(poolOf([{ concept: conceptId('c') }], cat).map((r) => r.ex.id), ['c1']);
  assert.equal(availabilityOf(cat).c, 1);
});

test('the planner unions per-concept quotas, keeps shared coverage, and has no duplicate exercise', () => {
  const plan = prepare([{ book: 'cp', section: sec('1.1') }], {}, cat, [], [], DEFAULT_SETTINGS, D3);
  assert.equal(plan.target, 3); assert.equal(plan.shortages, 0);
  assert.equal(plan.sharedConcepts, 2);
  assert.equal(new Set(plan.drawn.map((d) => d.ex.id)).size, plan.drawn.length);
  assert.equal(plan.drawn.filter((d) => d.ex.concepts.includes(conceptId('a'))).length, 3);
  assert.equal(plan.drawn.filter((d) => d.ex.concepts.includes(conceptId('b'))).length, 3);
  assert.equal(plan.drawn.length, 5, 'the shared exercise serves both concepts');
});

test('the planner prefers never shown, then shown-unanswered, then least recently attempted', () => {
  const round = newSessionId();
  const shown: Presentation[] = [
    { book: 'cp', section: sec('1.1'), ex: 'a1', at: D1, round },
    { book: 'cp', section: sec('1.1'), ex: 'ab', at: D1, round },
  ];
  const attempts = [attempt('ab', D2, true, ['a', 'b'])];
  const settings = { ...DEFAULT_SETTINGS, masteryTarget: 1 };
  const plan = prepare([{ concept: conceptId('a') }], {}, cat, attempts, shown, settings, D3);
  assert.equal(plan.drawn[0].ex.id, 'a3', 'the remaining unseen exercise wins');
  const allShown = [...shown, { book: 'cp', section: sec('1.1'), ex: 'a3', at: D2, round }];
  assert.equal(prepare([{ concept: conceptId('a') }], {}, cat, attempts, allShown, settings, D3).drawn[0].ex.id, 'a1', 'shown but unanswered beats answered');
});

test('fresh mastered concepts are omitted unless the global toggle includes them', () => {
  const mastery: Mastery = { a: record({ reviewedAt: D3, dueAt: D3 + 3 * DAY }) };
  const pick = [{ concept: conceptId('a') }] as const;
  assert.equal(prepare(pick, mastery, cat, [], [], DEFAULT_SETTINGS, D3).drawn.length, 0);
  assert.ok(prepare(pick, mastery, cat, [], [], { ...DEFAULT_SETTINGS, includeFresh: true }, D3).drawn.length > 0);
  assert.ok(prepare(pick, mastery, cat, [], [], DEFAULT_SETTINGS, D3 + 4 * DAY).drawn.length > 0, 'due concepts return automatically');
});

test('standing, progress, toggles, fills, and ids use the shared model', () => {
  const mastery: Mastery = { a: record(), b: record({ mastered: false, level: 1 }) };
  assert.deepEqual(standingOf(concepts, mastery), { untouched: 2, practised: 1, mastered: 1 });
  assert.equal(fillOf('practised', .01), .15);
  assert.deepEqual(progressOf({ b: record({ mastered: false, level: 1 }) }, { b: record({ mastered: false, level: 2 }) }), [{ id: 'b', from: 'practised', to: 'practised', fromShare: 1 / 3, toShare: 2 / 3 }]);
  const pick = { concept: conceptId('a') };
  assert.deepEqual(togglePick(togglePick([], pick), pick), []);
  assert.equal(uniqueById([{ id: 'a', n: 1 }, { id: 'a', n: 2 }]).length, 1);
  assert.match(newSessionId(), /^[a-z0-9]{8}$/);
});
