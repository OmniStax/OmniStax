import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type DayKey, type Instant, type Pomodoro, type Session, CATEGORY_COLORS, LENGTH, addCategory, amended, axisStep, clampLength, clampSeed, clockText, colorOf, dayKey, dropped, faceMs, finish, idle, instant, isOver, logged, lose, millis, monthBefore, nameOf, nextColor, parseClock, parseLog, pause, ranMs, rangeBars, recolourCategory, record, remaining, removeCategory, renameCategory, resume, seedOf, setLength, setMode, setSeed, spanText, start, stop, tick, unfiled, unitFor,
} from '../src/lib/pomodoro/model';

/* A clock the test winds by hand: every function takes the instant it reckons
   from, so nothing here waits on a real second. */
const at = (ms: number): Instant => instant(1_000_000 + ms);
const MIN = 60_000;
/* Run the clock forward to an instant, as the store's beat does. */
const run = (s: Session, ms: number): Session => tick(s, at(ms));
/* One written-down sitting, as the stats read it. */
const entry = (id: string, start: number, ran: number, categories: readonly string[]): Pomodoro =>
  ({ id, start, end: start + ran, minutes: Math.round(ran / 60_000), summary: id, completed: true, mode: 'pomodoro', categories: [...categories] });

test('a fresh session is idle, at the length it was asked for', () => {
  const s = idle();
  assert.equal(s.phase, 'idle');
  assert.equal(s.minutes, LENGTH.default);
  assert.equal(remaining(s, at(0)), 25 * MIN);
  assert.equal(clockText(remaining(s, at(0))), '25:00');
});

test('a length is clamped to what a sitting can be, and a nonsense one falls back to the default', () => {
  assert.equal(clampLength(0), LENGTH.min);
  assert.equal(clampLength(5000), LENGTH.max);
  assert.equal(clampLength(24.5004), 24.5, 'to the whole second');
  assert.equal(clampLength(Number.NaN), LENGTH.default);
});

test('the clock reads the time left, rounded up, and only says 0:00 when the session is over', () => {
  const s = start(setLength(idle(), 1), at(0));
  assert.equal(clockText(remaining(s, at(0))), '1:00');
  assert.equal(clockText(remaining(s, at(1))), '1:00', 'a sliver gone is still a whole minute to read');
  assert.equal(clockText(remaining(s, at(30_500))), '0:30');
  assert.equal(clockText(remaining(s, at(MIN))), '0:00');
});

test('a running session counts down, reaches its end once, and stays done', () => {
  const s = start(setLength(idle(), 1), at(0));
  assert.equal(s.phase, 'running');
  assert.equal(run(s, 30_000), s, 'a tick before the end changes nothing at all');
  const done = run(s, MIN);
  assert.equal(done.phase, 'done');
  assert.equal(remaining(done, at(MIN + 5_000)), 0);
  assert.equal(run(done, MIN + 5_000), done);
  assert.equal(isOver(done), true);
});

test('a pause stops the count and a resume takes it up where it stopped', () => {
  const run1 = start(setLength(idle(), 2), at(0));
  const held = pause(run1, at(30_000));
  assert.equal(held.phase, 'paused');
  assert.equal(remaining(held, at(90_000)), 90_000, 'the minute it was held for cost nothing');
  const again = resume(held, at(90_000));
  assert.equal(again.phase, 'running');
  assert.equal(remaining(again, at(120_000)), 60_000);
  assert.equal(tick(again, at(200_000)).phase, 'done');
});

test('starting is refused while a session is under way, and begins afresh from either end', () => {
  const going = start(idle(), at(0));
  assert.equal(start(going, at(10_000)), going);
  assert.equal(start(pause(going, at(10_000)), at(20_000)).phase, 'paused');
  const done = run(start(setLength(idle(), 1), at(0)), MIN);
  const next = start(done, at(MIN + 1_000));
  assert.equal(next.phase, 'running');
  assert.equal(next.startedAt, at(MIN + 1_000));
  assert.equal(next.spent, 0);
});

test('screen lock loses a live session, keeping how far it got, and cannot touch one that is over', () => {
  const going = start(setLength(idle(), 10), at(0));
  const lost = lose(going, at(4 * MIN));
  assert.equal(lost.phase, 'lost');
  assert.equal(lost.spent, 4 * MIN);
  assert.equal(isOver(lost), true);
  assert.equal(lose(lost, at(5 * MIN)), lost);
  assert.equal(lose(idle(), at(0)).phase, 'idle');
});

test('a stop gives the session up and keeps the length for the next one', () => {
  const back = stop(start(setLength(idle(), 40), at(0)));
  assert.equal(back.phase, 'idle');
  assert.equal(back.minutes, 40);
  assert.equal(back.startedAt, null);
});

test('the length is the reader\'s between sessions and never during one', () => {
  assert.equal(setLength(idle(), 50).minutes, 50);
  const going = start(idle(), at(0));
  assert.equal(setLength(going, 50).minutes, LENGTH.default);
  assert.equal(setLength(pause(going, at(1)), 50).minutes, LENGTH.default);
  const done = run(start(setLength(idle(), 1), at(0)), MIN);
  assert.equal(setLength(done, 50).minutes, 50, 'but an ended session is ready to be set for the next');
});

test('only an ended session is written down, and it says whether it got there', () => {
  const going = start(setLength(idle(), 1), at(0));
  assert.equal(record(going, at(10_000)), null);
  const done = record(run(going, MIN), at(MIN), '  read the second section  ', ['cat1'], 'e1');
  assert.deepEqual(done, { id: 'e1', start: at(0), end: at(MIN), minutes: 1, summary: 'read the second section', completed: true, mode: 'pomodoro', categories: ['cat1'] });
  assert.equal(record(lose(going, at(20_000)), at(20_000), 'gone', ['c1']), null, 'a lost one is never written');
});

test('the history keeps the newest first and no more than its cap', () => {
  const one = (i: number) => ({ id: `#${i}`, start: i, end: i + MIN, minutes: 1, summary: `#${i}`, completed: true, mode: 'pomodoro' as const, categories: [] });
  const log = [3, 2, 1].reduce<readonly Pomodoro[]>((acc, i) => logged(acc, one(i), 2), []);
  assert.deepEqual(log.map((p) => p.summary), ['#1', '#2']);
});

test('a history read back from this browser is only as much of it as parses', () => {
  const good = [{ start: 1, end: 2, minutes: 25, summary: 'x', completed: true }];
  /* An entry written before categories and modes existed reads as a countdown filed under nothing, and is given a steady id. */
  assert.deepEqual(parseLog(good), [{ ...good[0], id: '1-0', mode: 'pomodoro', categories: [] }]);
  assert.deepEqual(parseLog([good[0], { start: 'soon' }, { ...good[0], start: 5, categories: ['a'], mode: 'stopwatch' }]).map((p) => p.mode), ['pomodoro', 'stopwatch'], 'a bad entry is dropped and the rest are kept');
  assert.deepEqual(parseLog([{ start: 'soon' }]), []);
  assert.deepEqual(parseLog(null), []);
  assert.deepEqual(parseLog('[]'), []);
});

/* Round two: the stopwatch, the categories, and the figures the stats are drawn from. */
test('a stopwatch counts up from nothing, or from the stretch it was seeded with', () => {
  const watch = setMode(idle(), 'stopwatch');
  assert.equal(watch.mode, 'stopwatch');
  assert.equal(faceMs(watch, at(0)), 0);
  const seeded = setSeed(watch, seedOf(0, 10));
  assert.equal(seeded.seed, 10 * MIN);
  assert.equal(clockText(faceMs(seeded, at(0))), '10:00');
  const going = start(seeded, at(0));
  assert.equal(clockText(faceMs(going, at(90_000))), '11:30');
  /* It has no end of its own: a tick never finishes it, only the reader does. */
  assert.equal(run(going, 60 * MIN).phase, 'running');
  const done = finish(going, at(5 * MIN));
  assert.equal(done.phase, 'done');
  assert.equal(isOver(done), true);
  /* Written down, it reads as having begun where the seed put it. */
  const p = record(done, at(5 * MIN), 'a walk', [], 'e1');
  assert.equal(p?.start, at(-10 * MIN));
  assert.equal(ranMs(p!), 15 * MIN);
  assert.equal(p?.mode, 'stopwatch');
});

test('the mode and the seed are the reader\'s between sittings and never during one', () => {
  const going = start(setMode(idle(), 'stopwatch'), at(0));
  assert.equal(setMode(going, 'pomodoro').mode, 'stopwatch');
  assert.equal(setSeed(going, 60_000).seed, 0);
  /* A countdown has no seed at all, and going back to one puts it away. */
  assert.equal(setSeed(idle(), 60_000).seed, 0);
  assert.equal(setMode(setSeed(setMode(idle(), 'stopwatch'), 60_000), 'pomodoro').seed, 0);
  assert.equal(seedOf(1, 30), 90 * MIN);
  assert.equal(seedOf(Number.NaN, 90), 90 * MIN);
  assert.equal(clampSeed(-5), 0);
});

test('a sitting an older build wrote down as lost is forgotten on reading', () => {
  const kept = { start: 1, end: 2, minutes: 25, summary: 'x', completed: true };
  assert.deepEqual(parseLog([kept, { ...kept, start: 3, completed: false }]).map((p) => p.start), [1]);
});

test('the clock face reads minutes, mm:ss or h:mm:ss, and a length keeps its seconds', () => {
  assert.equal(parseClock('25'), 25 * MIN);
  assert.equal(parseClock(' 999 '), 999 * MIN);
  assert.equal(parseClock('12:30'), 12.5 * MIN);
  assert.equal(parseClock('1:05:00'), 65 * MIN);
  assert.equal(parseClock('1000'), null);
  assert.equal(parseClock('5:75'), null);
  assert.equal(parseClock('abc'), null);
  assert.equal(clockText(remaining(setLength(idle(), 12.5), at(0))), '12:30');
});

test('categories are made, renamed, recoloured and struck out, and a sitting keeps the rest', () => {
  const one = addCategory([], ' Physics ', CATEGORY_COLORS[0], 'c1');
  assert.deepEqual(one, [{ id: 'c1', name: 'Physics', color: CATEGORY_COLORS[0] }]);
  assert.equal(addCategory(one, '  ', CATEGORY_COLORS[1], 'c2'), one, 'a nameless category is not made');
  assert.equal(addCategory(one, 'physics', CATEGORY_COLORS[1], 'c2'), one, 'nor a second of the same name');
  const two = addCategory(one, 'Chemistry', nextColor(one), 'c2');
  assert.equal(two[1].color, CATEGORY_COLORS[1], 'a new one takes the first hue no other has');
  assert.equal(renameCategory(two, 'c2', 'Chem')[1].name, 'Chem');
  assert.equal(renameCategory(two, 'c2', '  ')[1].name, 'Chemistry', 'and is never left nameless');
  assert.equal(recolourCategory(two, 'c1', '#123456')[0].color, '#123456');
  assert.deepEqual(removeCategory(two, 'c1').map((c) => c.id), ['c2']);
  const log = [entry('e1', 0, MIN, ['c1', 'c2']), entry('e2', 0, MIN, ['c1'])];
  assert.deepEqual(unfiled(log, 'c1').map((p) => p.categories), [['c2'], []]);
  assert.equal(colorOf(two, 'c2'), CATEGORY_COLORS[1]);
  assert.equal(nameOf(two, 'nobody'), '');
});

test('an entry is amended and struck out by its id, not by where it stands', () => {
  const log = [entry('e1', 0, MIN, []), entry('e2', MIN, MIN, [])];
  const moved = { ...log[0], start: 5 * MIN, end: 6 * MIN };
  assert.deepEqual(amended(log, moved).map((p) => p.start), [5 * MIN, MIN]);
  assert.deepEqual(dropped(log, 'e1').map((p) => p.id), ['e2']);
});

test('a range is cut by the day, the week, the month or the year, as its length asks', () => {
  const k = (y: number, m: number, d: number): DayKey => dayKey(new Date(y, m - 1, d).getTime());
  assert.equal(unitFor(k(2026, 9, 17), k(2026, 9, 23)), 'day');
  assert.equal(unitFor(k(2026, 9, 16), k(2026, 9, 23)), 'week');
  assert.equal(unitFor(k(2026, 8, 24), k(2026, 9, 23)), 'week');
  assert.equal(unitFor(k(2026, 8, 22), k(2026, 9, 23)), 'month');
  assert.equal(unitFor(k(2025, 9, 24), k(2026, 9, 23)), 'month');
  assert.equal(unitFor(k(2025, 9, 20), k(2026, 9, 23)), 'year');
  assert.equal(monthBefore(k(2026, 9, 23), 12), k(2025, 9, 23));
});

test('a bar stacks each category at the full length of every sitting filed under it', () => {
  const noon = new Date(2026, 8, 21, 12).getTime();
  const dayAgo = new Date(2026, 8, 20, 12).getTime();
  const old = new Date(2026, 7, 1, 12).getTime();
  const log = [
    entry('a', noon, 30 * MIN, ['c1']),
    entry('b', noon, 30 * MIN, ['c1', 'c2']),
    entry('c', dayAgo, 20 * MIN, []),
    entry('d', old, 60 * MIN, ['c1']),
  ];
  const { unit, bars } = rangeBars(log, dayKey(dayAgo), dayKey(noon));
  assert.equal(unit, 'day');
  assert.equal(bars.length, 2);
  assert.equal(bars[1].total, 60 * MIN, 'both sittings, each counted once');
  assert.deepEqual(bars[1].parts, [{ id: 'c1', ms: 60 * MIN }, { id: 'c2', ms: 30 * MIN }]);
  assert.equal(bars[1].stacked, 90 * MIN);
  assert.deepEqual(bars[0].parts, [{ id: '', ms: 20 * MIN }], 'a sitting under nothing falls under the empty id');
  const months = rangeBars(log, dayKey(old), dayKey(noon));
  assert.equal(months.unit, 'month');
  assert.deepEqual(months.bars.map((b) => b.total), [60 * MIN, 80 * MIN]);
});

test('an axis steps in round lengths', () => {
  assert.equal(axisStep(20 * MIN), 5 * MIN);
  assert.equal(axisStep(3 * 60 * MIN), 60 * MIN);
});

test('a stretch of time is said the short way, and a long clock grows an hour', () => {
  assert.equal(spanText(0), '0s');
  assert.equal(spanText(45 * MIN), '45m');
  assert.equal(spanText(125 * MIN), '2h 05m');
  assert.equal(clockText(millis(45 * MIN)), '45:00');
  assert.equal(clockText(millis(65 * MIN)), '1:05:00');
});
