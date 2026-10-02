/* A lazily fetched library: work waits in order, a failed fetch is tried again, one fetch at a time,
   and a failed chunk is asked for again under a fresh address. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lazy, importing, failedChunk } from '../src/lib/fig/lazy';

const tick = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));

test('work asked before the library lands is done in order once it does, and later work at once', async () => {
  let loads = 0;
  const L = lazy(async () => { loads++; return 'lib'; });
  const done: string[] = [];
  L.use((v) => done.push('a ' + v));
  L.use((v) => done.push('b ' + v));
  assert.equal(L.now(), null);
  await tick();
  assert.deepEqual(done, ['a lib', 'b lib']);
  L.use((v) => done.push('c ' + v));
  assert.deepEqual(done, ['a lib', 'b lib', 'c lib']);
  assert.equal(loads, 1);
});

test('a failed fetch is tried again and the waiting work is done when it succeeds', async () => {
  let loads = 0;
  const L = lazy(async () => { if (++loads < 3) throw new Error('dropped chunk'); return 7; }, [5]);
  const done: number[] = [];
  L.use((v) => done.push(v));
  await tick();
  assert.deepEqual(done, []);
  L.use((v) => done.push(v + 1));
  await tick(40);
  assert.equal(loads, 3);
  assert.deepEqual(done, [7, 8]);
  assert.equal(L.now(), 7);
});

test('nothing is fetched again while a fetch or a retry is pending', async () => {
  let loads = 0;
  const L = lazy(async () => { if (++loads < 2) throw new Error('offline'); return 0; }, [30]);
  L.use(() => {});
  L.use(() => {});
  await tick();
  L.use(() => {});
  assert.equal(loads, 1);
  await tick(45);
  assert.equal(loads, 2);
});

test('one piece of work that throws does not stop the rest', async () => {
  const L = lazy(async () => 1);
  const done: number[] = [];
  const err = console.error;
  console.error = () => {};
  L.use(() => { throw new Error('bad tex'); });
  L.use((v) => done.push(v));
  await tick();
  console.error = err;
  assert.deepEqual(done, [1]);
});

test('the chunk a failed dynamic import names is read off the error, without its query', () => {
  assert.equal(failedChunk(new TypeError('Failed to fetch dynamically imported module: http://127.0.0.1:8117/assets/mathjax.D4jxE5kW.js')), 'http://127.0.0.1:8117/assets/mathjax.D4jxE5kW.js');
  assert.equal(failedChunk(new TypeError('error loading dynamically imported module: https://x.org/a/katex.B1.js?retry=2')), 'https://x.org/a/katex.B1.js');
  assert.equal(failedChunk(new TypeError('Importing a module script failed.')), null);
  assert.equal(failedChunk('nope'), null);
});

test('an import that failed is asked for again under a fresh address, or as before where the error names none', async () => {
  const asked: string[] = [];
  let firsts = 0;
  const failing = (msg: string) => async (): Promise<string> => { firsts++; throw new TypeError(msg); };
  const named = importing(failing('Failed to fetch dynamically imported module: http://h/assets/m.X1.js'), async (u) => { asked.push(u); if (asked.length < 2) throw new TypeError(`Failed to fetch dynamically imported module: ${u}`); return 'm'; });
  await assert.rejects(named());
  await assert.rejects(named());
  assert.equal(await named(), 'm');
  assert.deepEqual(asked, ['http://h/assets/m.X1.js?retry=1', 'http://h/assets/m.X1.js?retry=2']);
  assert.equal(firsts, 1);
  const unnamed = importing(failing('Importing a module script failed.'), async () => { throw new Error('never'); });
  await assert.rejects(unnamed());
  await assert.rejects(unnamed());
  assert.equal(firsts, 3);
});
