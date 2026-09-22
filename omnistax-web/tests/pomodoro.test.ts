import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Instant, type Session, LENGTH, clampLength, clockText, idle, instant, isOver, logged, lose, parseLog, pause, record, remaining, resume, setLength, start, stop, tick,
} from '../src/lib/pomodoro/model';

/* A clock the test winds by hand: every function takes the instant it reckons
   from, so nothing here waits on a real second. */
const at = (ms: number): Instant => instant(1_000_000 + ms);
const MIN = 60_000;
/* Run the clock forward to an instant, as the store's beat does. */
const run = (s: Session, ms: number): Session => tick(s, at(ms));

test('a fresh session is idle, at the length it was asked for', () => {
  const s = idle();
  assert.equal(s.phase, 'idle');
  assert.equal(s.minutes, LENGTH.default);
  assert.equal(remaining(s, at(0)), 25 * MIN);
  assert.equal(clockText(remaining(s, at(0))), '25:00');
});

test('a length is clamped to what a sitting can be, and a nonsense one falls back to the default', () => {
  assert.equal(clampLength(0), LENGTH.min);
  assert.equal(clampLength(500), LENGTH.max);
  assert.equal(clampLength(24.6), 25);
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
  const done = record(run(going, MIN), at(MIN), '  read the second section  ');
  assert.deepEqual(done, { start: at(0), end: at(MIN), minutes: 1, summary: 'read the second section', completed: true });
  const lost = record(lose(going, at(20_000)), at(20_000));
  assert.equal(lost?.completed, false);
  assert.equal(lost?.summary, '');
});

test('the history keeps the newest first and no more than its cap', () => {
  const one = (i: number) => ({ start: i, end: i + MIN, minutes: 1, summary: `#${i}`, completed: true });
  const log = [3, 2, 1].reduce<readonly ReturnType<typeof one>[]>((acc, i) => logged(acc, one(i), 2), []);
  assert.deepEqual(log.map((p) => p.summary), ['#1', '#2']);
});

test('a history read back from this browser is only as much of it as parses', () => {
  const good = [{ start: 1, end: 2, minutes: 25, summary: 'x', completed: true }];
  assert.deepEqual(parseLog(good), good);
  assert.deepEqual(parseLog([{ start: 'soon' }]), []);
  assert.deepEqual(parseLog(null), []);
  assert.deepEqual(parseLog('[]'), []);
});
