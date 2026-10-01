import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enrol, onParams, paramsOf, setParams, type ParamValue } from '../src/lib/fig/params';

/* Just enough of an element for the registry: a figure under a root. */
const figure = (): Element => ({ matches: (s: string) => s === 'figure', querySelectorAll: () => [] }) as unknown as Element;
const rootOf = (...figs: Element[]): Element => Object.assign(new EventTarget(), { matches: () => false, querySelectorAll: () => figs }) as unknown as Element;

const slider = (fig: Element, want: string, v0: number) => {
  let v = v0;
  const input = new EventTarget();
  enrol(fig, want, (id) => ({
    id, input, drive: (x: ParamValue) => { v = +x; input.dispatchEvent(new Event('input')); },
    param: () => ({ id, label: want, kind: 'range', value: v, min: 0, max: 10 }),
  }));
};

test('controls take their class, then numbered ids, per figure', () => {
  const a = figure(), b = figure();
  slider(a, 'm', 1); slider(a, 'm', 2); slider(a, 'k', 3); slider(a, 'm', 4); slider(b, 'm', 5);
  assert.deepEqual(paramsOf(rootOf(a)).map((p) => p.id), ['m', 'm-2', 'k', 'm-3']);
  assert.deepEqual(paramsOf(a).map((p) => p.id), ['m', 'm-2', 'k', 'm-3']);
  assert.deepEqual(paramsOf(rootOf(b)).map((p) => [p.id, p.value]), [['m', 5]]);
  assert.deepEqual(paramsOf(rootOf()), []);
});

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 300));

test('set drives the controls and a listener hears the values once they settle', async () => {
  const f = figure(), root = rootOf(f);
  slider(f, 'x', 1); slider(f, 'y', 2);
  const heard: Record<string, ParamValue>[] = [];
  const off = onParams(root, (v) => heard.push({ ...v }));
  setParams(root, { y: 7, nope: 3 });
  setParams(root, { y: 8 });
  assert.deepEqual(paramsOf(root).map((p) => p.value), [1, 8]);
  assert.deepEqual(heard, []);
  await settle();
  assert.deepEqual(heard, [{ x: 1, y: 8 }]);
  off();
  setParams(root, { x: 4 });
  await settle();
  assert.equal(heard.length, 1);
});

test('a control held by the pointer is heard only when it is let go', async () => {
  const f = figure(), root = rootOf(f);
  slider(f, 'x', 1);
  const heard: Record<string, ParamValue>[] = [];
  const off = onParams(root, (v) => heard.push({ ...v }));
  root.dispatchEvent(new Event('pointerdown'));
  setParams(root, { x: 5 });
  await settle();
  assert.deepEqual(heard, []);
  globalThis.dispatchEvent?.(new Event('pointerup'));
  off();
});

test('a quiet setting is not heard', async () => {
  const f = figure(), root = rootOf(f);
  slider(f, 'x', 1);
  const heard: Record<string, ParamValue>[] = [];
  let quiet = true;
  const off = onParams(root, (v) => heard.push({ ...v }), () => quiet);
  setParams(root, { x: 5 });
  quiet = false;
  await settle();
  assert.deepEqual(heard, []);
  off();
});
