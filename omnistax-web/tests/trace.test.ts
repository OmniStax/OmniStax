/* The trace engine of a debugger figure (src/lib/fig/trace.ts; docs/design-code-and-debugger.md §2.2, §2.3):
   blocks nested by containment, instances, stops per level, step / back / step into / step out, the default
   level, and the transport's time over the stops. Pure, so no DOM. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as TR from '../src/lib/fig/trace';
import { tokenize } from '../src/lib/fig/codepanel';

/* the two-pointer search of the design's example, numbered as it is shown:
    1 def two_pointer(nums, target):
    2     i = 0
    3     j = len(nums) - 1
    4     while i < j:
    5         s = nums[i] + nums[j]
    6         if s == target:
    7             return [i, j]
    8         if s < target:
    9             i += 1
   10         else:
   11             j -= 1
   12     return None                                                                 */
const BLOCKS: TR.BlockSpec[] = [
  { id: 'init', lines: [2, 3], label: 'start at both ends', touches: ['i', 'j'] },
  { id: 'loop', lines: [4, 11], label: 'close in' },
  { id: 'compare', lines: [5, 7], label: 'compare', touches: ['nums', 'i', 'j'] },
  { id: 'move', lines: [8, 11], label: 'move', touches: ['i', 'j'] },
];
function twoPointer(nums: number[], target: number): TR.Frame[] {
  return TR.record((at) => {
    at(1, { nums, target });
    let i = 0; at(2, { nums, target, i });
    let j = nums.length - 1; at(3, { nums, target, i, j });
    for (;;) {
      const go = i < j; at(4, { nums, target, i, j }, go ? undefined : ['exit']);
      if (!go) break;
      const s = nums[i] + nums[j]; at(5, { nums, target, i, j, s }, ['compare', i, j]);
      at(6, { nums, target, i, j, s });
      if (s === target) { at(7, { nums, target, i, j, s }, ['return', [i, j]]); return; }
      at(8, { nums, target, i, j, s });
      if (s < target) { i += 1; at(9, { nums, target, i, j, s }); } else { j -= 1; at(11, { nums, target, i, j, s }); }
    }
    at(12, { nums, target, i, j }, ['return', null]);
  });
}
const HIT = twoPointer([1, 3, 4, 6, 8, 11], 10);
const MISS = twoPointer([1, 3, 4, 6, 8, 11], 13);
const T = TR.tree(BLOCKS);
const lines = (fr: readonly TR.Frame[], idx: readonly number[]): number[] => idx.map((i) => fr[i].line);

test('blocks nest by line containment, and a partial overlap is an error', () => {
  assert.deepEqual(T.errors, []);
  const by = (id: string) => TR.byId(T, id)!;
  assert.equal(by('init').depth, 0); assert.equal(by('loop').depth, 0);
  assert.equal(by('compare').depth, 1); assert.equal(by('move').depth, 1);
  assert.equal(T.blocks[by('compare').parent!].id, 'loop');
  assert.deepEqual(by('loop').children.map((c) => T.blocks[c].id), ['compare', 'move']);
  assert.deepEqual(T.roots.map((r) => T.blocks[r].id), ['init', 'loop']);
  assert.equal(T.levels, 2);
  const bad = TR.tree([...BLOCKS, { id: 'straddle', lines: [3, 5] }, { id: 'twin', lines: [5, 7] }, { id: 'back', lines: [6, 2] }]);
  assert.equal(bad.errors.length, 3);
  assert.match(bad.errors[0], /straddle.*overlaps.*init/);
  assert.equal(bad.blocks.length, 4, 'the bad blocks are dropped and the good ones kept');
});

test('a recorded frame is a snapshot, capped at 64 items and three levels', () => {
  const a = [1, 2];
  const fr = TR.record((at) => { at(1, { a }); a.push(3); at(2, { a }); });
  assert.deepEqual(fr[0].vars.a, [1, 2]);
  assert.deepEqual(fr[1].vars.a, [1, 2, 3]);
  const long = TR.record((at) => at(1, { xs: Array.from({ length: 100 }, (_, k) => k), deep: [[[[1]]]], s: new Set([2, 1]) }));
  const xs = long[0].vars.xs as TR.Value[];
  assert.equal(xs.length, 65); assert.equal(xs[64], '…');
  assert.deepEqual(long[0].vars.deep, [[['…']]]);
  assert.deepEqual(long[0].vars.s, [2, 1]);
  const many = TR.record((at) => { for (let k = 0; ; k += 1) at(1, { k }); });
  assert.equal(many.length, TR.CAP_FRAMES); assert.equal(many.truncated, true);
});

test('each loop iteration is an instance, and an instance ends on its last line at its own depth', () => {
  const L = TR.lay(HIT, T);
  const of = (id: string) => L.instances.filter((x) => L.tree.blocks[x.block].id === id);
  assert.equal(of('init').length, 1);
  assert.deepEqual(lines(HIT, [of('init')[0].start, of('init')[0].end]), [2, 3]);
  /* 1+11 > 10, 1+8 < 10, 3+8 > 10, 3+6 < 10, 4+6 = 10: five iterations, the last returning */
  assert.equal(of('loop').length, 5);
  assert.equal(of('compare').length, 5);
  assert.equal(of('move').length, 4);
  of('loop').forEach((x) => assert.equal(HIT[x.start].line, 4));
  assert.equal(HIT[of('loop')[4].end].line, 7, 'the last iteration ends on the return');
  /* the miss ends on the failing test, an iteration of its own */
  const M = TR.lay(MISS, T), last = M.instances.filter((x) => M.tree.blocks[x.block].id === 'loop').at(-1)!;
  assert.equal(last.start, last.end); assert.equal(MISS[last.end].line, 4);
});

test('a call made inside an instance stays inside it, and calls on its first line join it', () => {
  /* 1 def f(n):  2   if n == 0: return  3   g(n)   — g's body is line 5, one deeper */
  const fr = TR.record((at) => {
    at(1, { n: 2 });
    at.enter('g'); at(5, { m: 2 }); at.leave(); at(2, { n: 2 });   /* line 2 calls g before it finishes */
    at(3, { n: 2 });
    at.enter('g'); at(5, { m: 1 }); at(5, { m: 0 }); at.leave(); at(3, { n: 1 });
    at(6, {});
  });
  const t = TR.tree([{ id: 'body', lines: [2, 3] }, { id: 'g', lines: [5, 5] }]);
  const L = TR.lay(fr, t);
  const body = L.instances.filter((x) => t.blocks[x.block].id === 'body');
  assert.equal(body.length, 1);
  assert.equal(body[0].start, 1, 'the frames of the call on line 2 open the instance');
  assert.equal(body[0].end, 6);
  const g = L.instances.filter((x) => t.blocks[x.block].id === 'g');
  assert.deepEqual(g.map((x) => [x.start, x.end, x.depth]), [[1, 1, 1], [4, 4, 1], [5, 5, 1]]);
});

test('stops at a level are the ends of its blocks and the shallower ones, with the first and last frame', () => {
  const L = TR.lay(HIT, T);
  const s0 = TR.stopsAt(L, 0), s1 = TR.stopsAt(L, 1);
  assert.equal(s0[0], 0); assert.equal(s0.at(-1), HIT.length - 1);
  assert.deepEqual(lines(HIT, s0), [1, 3, 11, 9, 11, 9, 7]);
  assert.deepEqual(lines(HIT, s1), [1, 3, 6, 11, 6, 9, 6, 11, 6, 9, 7]);
  assert.ok(s0.every((p) => s1.includes(p)), 'a coarser level is a subset of a finer one');
  assert.deepEqual(TR.stopsAt(L, 9), s1, 'a level past the deepest is the deepest');
});

test('the block a stop shows is the deepest at the level ending there, and touches add up its ancestors', () => {
  const L = TR.lay(HIT, T), s1 = TR.stopsAt(L, 1);
  assert.equal(TR.blockAt(L, s1[0], 1), null, 'the start shows no block');
  assert.equal(TR.blockAt(L, s1[1], 1)!.id, 'init');
  assert.equal(TR.blockAt(L, s1[2], 1)!.id, 'compare');
  assert.equal(TR.blockAt(L, s1[3], 1)!.id, 'move');
  assert.equal(TR.blockAt(L, s1[3], 0)!.id, 'loop', 'at level 0 the same stop shows the loop');
  assert.deepEqual([...TR.touchedAt(L, TR.blockAt(L, s1[3], 1))].sort(), ['i', 'j']);
  assert.deepEqual([...TR.touchedAt(L, TR.blockAt(L, s1[3], 0))], []);
  assert.deepEqual([...TR.executed(L, s1[2], s1[3])].sort((a, b) => a - b), [8, 11]);
  assert.deepEqual([...TR.executed(L, 0, 0)], [1]);
});

test('step, back, step into and step out move the cursor between stops and levels', () => {
  const L = TR.lay(HIT, T), s0 = TR.stopsAt(L, 0), s1 = TR.stopsAt(L, 1);
  let c: TR.Cursor = { p: 0, level: 0 };
  c = TR.step(L, c); assert.deepEqual(c, { p: s0[1], level: 0 });                          /* after init */
  c = TR.stepInto(L, c); assert.deepEqual(c, { p: s1[2], level: 1 }, 'into the loop: the end of its first child, the compare');
  c = TR.step(L, c); assert.deepEqual(c, { p: s1[3], level: 1 });                          /* the move */
  c = TR.back(L, c); assert.deepEqual(c, { p: s1[2], level: 1 }, 'back is exact');
  assert.deepEqual(TR.back(L, TR.step(L, c)), c, 'step then back returns');
  c = TR.stepOut(L, c); assert.deepEqual(c, { p: s0[2], level: 0 }, 'out: the end of the iteration');
  assert.deepEqual(TR.stepOut(L, c), { p: s0[2], level: 0 }, 'out at the top level stays');
  const end: TR.Cursor = { p: s1.at(-1)!, level: 1 };
  assert.deepEqual(TR.step(L, end), end, 'the last stop is the end');
  assert.deepEqual(TR.stepInto(L, end), end, 'into at the deepest level and the end stays');
  assert.deepEqual(TR.back(L, { p: 0, level: 1 }), { p: 0, level: 1 });
  /* every stop is reachable by steps alone, and back walks them in reverse */
  for (const L0 of [0, 1]) {
    const seen: number[] = [0]; let k: TR.Cursor = { p: 0, level: L0 };
    for (;;) { const n = TR.step(L, k); if (n.p === k.p) break; seen.push(n.p); k = n; }
    assert.deepEqual(seen, [...TR.stopsAt(L, L0)]);
    const rev: number[] = [k.p]; for (;;) { const n = TR.back(L, k); if (n.p === k.p) break; rev.push(n.p); k = n; }
    assert.deepEqual(rev, [...seen].reverse());
  }
});

test('3SUM: step into the outer loop reaches the inner search, step out returns to the outer iteration', () => {
  /* 1 def three_sum(a):  2   for k in range(n):  3     i, j = k + 1, n - 1  4     while i < j:  5       s = …  6       move */
  const a = [-1, 0, 1, 2];
  const fr = TR.record((at) => {
    at(1, { a });
    for (let k = 0; k < 2; k += 1) {
      at(2, { a, k });
      let i = k + 1, j = a.length - 1; at(3, { a, k, i, j });
      while (i < j) { at(4, { a, k, i, j }); at(5, { a, k, i, j, s: a[k] + a[i] + a[j] }); i += 1; at(6, { a, k, i, j }); }
      at(4, { a, k, i, j }, ['exit']);
    }
  });
  const t = TR.tree([{ id: 'outer', lines: [2, 6], touches: ['k'] }, { id: 'setup', lines: [3, 3], touches: ['i', 'j'] }, { id: 'search', lines: [4, 6], touches: ['i', 'j'] }, { id: 'step', lines: [5, 6] }]);
  assert.deepEqual(t.errors, []);
  const L = TR.lay(fr, t);
  assert.equal(L.instances.filter((x) => t.blocks[x.block].id === 'outer').length, 2);
  let c: TR.Cursor = { p: 0, level: 0 };
  c = TR.step(L, c); assert.equal(TR.blockAt(L, c.p, 0)!.id, 'outer');
  c = TR.back(L, c);
  c = TR.stepInto(L, c); assert.equal(c.level, 1); assert.equal(TR.blockAt(L, c.p, 1)!.id, 'setup');
  c = TR.step(L, c); assert.equal(TR.blockAt(L, c.p, 1)!.id, 'search');
  c = TR.stepInto(L, c); assert.equal(c.level, 2); assert.equal(TR.blockAt(L, c.p, 2)!.id, 'step');
  c = TR.stepOut(L, c); assert.equal(c.level, 1); assert.equal(TR.blockAt(L, c.p, 1)!.id, 'search');
  c = TR.stepOut(L, c); assert.equal(c.level, 0);
  assert.equal(c.p, L.instances.filter((x) => t.blocks[x.block].id === 'outer')[0].end, 'out of the search: the end of the first outer iteration');
});

test('the default level is the coarsest with three stops where every step changes something', () => {
  assert.equal(TR.defaultLevel(TR.lay(HIT, T)), 0);
  assert.equal(TR.defaultLevel(TR.lay(MISS, T)), 0);
  /* drop the events and the miss's last steps (the failing test, the return) change nothing a block names:
     no level qualifies, so the coarsest with three stops */
  const quiet = MISS.map(({ ev: _ev, ...f }) => f);
  assert.equal(TR.changes(TR.lay(quiet, T), TR.stopsAt(TR.lay(quiet, T), 0).at(-2)!, quiet.length - 1, 0), false);
  assert.equal(TR.defaultLevel(TR.lay(quiet, T)), 0);
  /* a level whose steps change nothing is passed over for a finer one that does */
  const flat = TR.record((at) => { at(1, { x: 0 }); at(2, { x: 0 }); at(3, { x: 0 }); at(4, { x: 1 }); at(5, { x: 2 }); });
  const ft = TR.tree([{ id: 'a', lines: [2, 5], touches: ['x'] }, { id: 'b', lines: [4, 4], touches: ['x'] }, { id: 'c', lines: [5, 5], touches: ['x'] }]);
  const FL = TR.lay(flat, ft);
  assert.equal(TR.stopsAt(FL, 0).length, 2);
  assert.equal(TR.defaultLevel(FL), 1);
  assert.equal(TR.defaultLevel(TR.lay([], ft)), ft.levels - 1, 'an empty trace takes the finest');
});

test('the transport time rests on a stop at whole values and moves to the next in between', () => {
  assert.deepEqual(TR.scrub(5, 0), { i: 0, from: 0, to: 0, k: 1 });
  assert.deepEqual(TR.scrub(5, 2), { i: 2, from: 1, to: 2, k: 1 });
  const mid = TR.scrub(5, 2.3);
  assert.equal(mid.from, 2); assert.equal(mid.to, 3); assert.ok(Math.abs(mid.k - 0.5) < 1e-9);
  assert.equal(TR.scrub(5, 2.8).k, 1, 'the move takes the first 60 % of the beat, then holds');
  assert.deepEqual(TR.scrub(5, Infinity), { i: 4, from: 3, to: 4, k: 1 }, 'reduced motion\'s end');
  assert.deepEqual(TR.scrub(5, 99), TR.scrub(5, 4));
  assert.deepEqual(TR.scrub(1, 3), { i: 0, from: 0, to: 0, k: 1 });
  /* scrubbing across the whole time visits every stop, in order, either way */
  const visits = (ts: number[]) => ts.map((t) => TR.scrub(7, t).to).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  const ts = Array.from({ length: 121 }, (_, k) => k * 0.05);
  assert.deepEqual(visits(ts), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(visits([...ts].reverse()), [6, 5, 4, 3, 2, 1, 0]);
});

test('the code tokenizer finds names outside strings and comments, across lines', () => {
  const py = tokenize('s = nums[i] + 1e5  # i moves\nx = "i\\"j" + \'\'\'i\nj\'\'\' + self.i', 'python');
  const names = (ls: ReturnType<typeof tokenize>) => ls.map((l) => l.filter((t) => t.t === 'name').map((t) => t.s));
  assert.deepEqual(names(py), [['s', 'nums', 'i'], ['x'], ['self']]);
  assert.equal(py[0].map((t) => t.s).join(''), 's = nums[i] + 1e5  # i moves', 'the tokens are the line');
  assert.equal(py[2][0].t, 'str', 'a triple-quoted string carries to the next line');
  const js = tokenize('let i = 0; /* i\n j */ j = `i ${x}`; // i\nk', 'javascript');
  assert.deepEqual(names(js), [['let', 'i'], ['j'], ['k']]);
});
