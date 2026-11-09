/* The one Python worker's owner, against a fake worker: requests go one at a
   time, a request's clock starts when the worker takes it, a cold kind gets six
   times as long, and a timeout restarts the worker without failing what waits. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

type Sent = { id: number; kind: string; request: string };
const made: FakeWorker[] = [];
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: Sent[] = [];
  dead = false;
  constructor() { made.push(this); }
  postMessage(m: Sent): void { this.sent.push(m); }
  terminate(): void { this.dead = true; }
  answer(reply: string): void { const m = this.sent[this.sent.length - 1]; this.onmessage?.({ data: { id: m.id, reply } }); }
}
(globalThis as unknown as { Worker: unknown }).Worker = FakeWorker;
const { askPython, isWarm, PyError, COLD } = await import('../src/lib/py/host');

test('requests go one at a time, and the next goes when the first is answered', async () => {
  const a = askPython('cas', 'one', 1000), b = askPython('cas', 'two', 1000);
  const w = made[0];
  assert.equal(made.length, 1);
  assert.deepEqual(w.sent.map((m) => m.request), ['one']);
  w.answer('1');
  assert.equal(await a, '1');
  assert.deepEqual(w.sent.map((m) => m.request), ['one', 'two']);
  w.answer('2');
  assert.equal(await b, '2');
  assert.ok(isWarm('cas'));
});

test('a timeout fails the request it caught, restarts the worker, and what waited goes to the new one', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const slow = askPython('cas', 'slow', 50), after = askPython('cas', 'after', 50);
  const first = made[made.length - 1];
  t.mock.timers.tick(60);
  await assert.rejects(slow, (e: unknown) => e instanceof PyError && e.reason === 'timeout');
  assert.ok(first.dead);
  assert.equal(isWarm('cas'), false, 'a fresh worker is cold');
  const fresh = made[made.length - 1];
  assert.notEqual(fresh, first);
  assert.deepEqual(fresh.sent.map((m) => m.request), ['after']);
  t.mock.timers.tick(50 * COLD - 1);
  fresh.answer('ok');
  assert.equal(await after, 'ok', 'a cold request has six times as long');
});

test('a worker that fails to load fails its request as a load failure', async () => {
  const p = askPython('cas', 'x', 1000);
  made[made.length - 1].onerror?.();
  await assert.rejects(p, (e: unknown) => e instanceof PyError && e.reason === 'load');
});
