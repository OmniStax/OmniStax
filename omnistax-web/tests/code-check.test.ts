/* Code exercises without a runner (src/lib/code/check.ts): comparison, the
   growth fit and the sizes it measures, the verdict text, and which outcome is
   evidence. Then the build's reference check end to end, under the machine's
   CPython, the way `npm run check:code` runs it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { AnswerSchema, SectionSchema, type CodeAnswerDTO } from '../src/lib/content/schema';
import {
  COUNT_START, evidenceOf, firstFailure, fitGrowth, inputText, judge, measureGrowth, sameStdout, sameUnordered, sameValue, verdictText, withinBound, worse,
  type SubmitOutcome,
} from '../src/lib/code/check';
import { evaluate, seeded } from '../src/lib/code/grow';
import { draftKey, withDraft } from '../src/lib/code/drafts';
import { cpythonRunner, growInNode } from '../src/lib/code/node';
import { checkReferences } from '../src/lib/code/references';
import type { CountPoint, Measured } from '../src/lib/code/types';

const code = (o: object): CodeAnswerDTO => AnswerSchema.parse({ type: 'code', python: { entry: 'f', reference: 'def f(x):\n    return x\n' }, tests: [{ args: [1], expect: 1, visible: true }, { args: [2], expect: 2 }], ...o }) as CodeAnswerDTO;

test('values compare as JSON, floats to the tolerance and integers exactly', () => {
  assert.ok(sameValue([1, [2, { a: null }]], [1, [2, { a: null }]]));
  assert.ok(!sameValue([1, 2], [2, 1]));
  assert.ok(sameValue(0.1 + 0.2, 0.3));
  assert.ok(!sameValue(1, 2));
  assert.ok(!sameValue(1.5, 1.6, 0.01) && sameValue(1.5, 1.505, 0.01));
  assert.ok(!sameValue({ a: 1 }, { a: 1, b: 2 }));
  assert.ok(!sameValue(null, 0) && !sameValue(true, 1));
});

test('unordered is a multiset at the top level only', () => {
  assert.ok(sameUnordered([[-1, 0, 1], [-1, -1, 2]], [[-1, -1, 2], [-1, 0, 1]]));
  assert.ok(!sameUnordered([[0, -1, 1]], [[-1, 0, 1]]), 'the inner lists keep their order');
  assert.ok(!sameUnordered([1, 1, 2], [1, 2, 2]));
});

test('stdout compares by lines with trailing space let go, exactly, or by tokens', () => {
  assert.ok(sameStdout('3 \n4\n\n', '3\n4', undefined));
  assert.ok(!sameStdout('3 4', '3\n4', undefined));
  assert.ok(!sameStdout('3 \n', '3\n', 'exact'));
  assert.ok(sameStdout('3   4\n0.3000000001', '3 4 0.3', 'tokens', 1e-6));
  assert.ok(!sameStdout('3 5', '3 4', 'tokens'));
});

test('a test is judged by its form: a value, the error it raises, stdout, or a limit', () => {
  const a = code({ tests: [{ args: [1], expect: [1, 2], visible: true }, { args: [-1], raises: 'ValueError' }] });
  const run = { stdout: '', stdoutCut: false, steps: 3 };
  assert.deepEqual(judge(a, a.tests[0], { ...run, value: [1, 2] }), { ok: true });
  assert.deepEqual(judge(a, a.tests[0], { ...run, value: [2, 1] }), { ok: false, why: 'wrong' });
  assert.deepEqual(judge(code({ ...a, compare: 'unordered' }), a.tests[0], { ...run, value: [2, 1] }), { ok: true });
  const err = (type: string, types: string[]) => ({ ...run, error: { type, types, message: '', line: 2 } });
  assert.deepEqual(judge(a, a.tests[1], err('ValueError', ['ValueError', 'Exception'])), { ok: true });
  assert.deepEqual(judge(a, a.tests[1], err('UnicodeError', ['UnicodeError', 'ValueError', 'Exception'])), { ok: true }, 'a subclass raises its base');
  assert.deepEqual(judge(a, a.tests[1], err('KeyError', ['KeyError'])), { ok: false, why: 'otherError' });
  assert.deepEqual(judge(a, a.tests[1], { ...run, value: 0 }), { ok: false, why: 'noRaise' });
  assert.deepEqual(judge(a, a.tests[0], err('TypeError', ['TypeError'])), { ok: false, why: 'raised' });
  assert.deepEqual(judge(a, a.tests[0], { ...run, limit: 'time' }), { ok: false, why: 'limit' });
  assert.deepEqual(judge(a, a.tests[0], { skipped: true }), { ok: false, why: 'stopped' });
  const p = code({ python: { reference: 'print(input())' }, tests: [{ stdin: 'a\n', stdout: 'a\n', visible: true }, { stdin: 'b', stdout: 'b' }] });
  assert.deepEqual(judge(p, p.tests[0], { ...run, stdout: 'a \n' }), { ok: true });
  assert.equal(inputText(a.tests[0], 'f'), 'f(1)');
});

test('the first failing test is the one shown', () => {
  const a = code({});
  const ok = { stdout: '', stdoutCut: false, steps: 1 };
  assert.equal(firstFailure(a, a.tests, [{ ...ok, value: 1 }, { ...ok, value: 2 }]), null);
  assert.equal(firstFailure(a, a.tests, [{ ...ok, value: 1 }, { ...ok, value: 3 }])?.index, 1);
});

test('the growth fit names the class whose ratio spreads least', () => {
  const pts = (f: (n: number) => number, ns = [64, 128, 256, 512]): CountPoint[] => ns.map((n) => ({ n, steps: Math.round(f(n)) }));
  assert.equal(fitGrowth(pts(() => 7)), '1');
  assert.equal(fitGrowth(pts((n) => 3 * Math.log2(n) + 5)), 'log n');
  assert.equal(fitGrowth(pts((n) => 2 * n + 5)), 'n');
  assert.equal(fitGrowth(pts((n) => n * Math.log2(n) + 3 * n)), 'n log n');
  assert.equal(fitGrowth(pts((n) => n * n / 2 + n)), 'n^2');
  assert.equal(fitGrowth(pts((n) => n ** 3)), 'n^3');
  assert.equal(fitGrowth(pts((n) => 2 ** n, [2, 4, 8, 16])), '2^n');
  assert.equal(fitGrowth([{ n: 64, steps: 10 }]), null);
  assert.ok(worse('n^2', 'n') && !worse('n', 'n') && !worse('log n', 'n'));
  assert.ok(withinBound('n', 'n log n') && !withinBound('n^2', 'n') && !withinBound(null, 'n') && withinBound(null, '2^n'));
});

test('the sizes double from 64 under half the budget, and halve below it when a steep class runs out', async () => {
  const sizes = async (f: (n: number) => number): Promise<{ asked: number[]; report: Awaited<ReturnType<typeof measureGrowth>> }> => {
    const asked: number[] = [];
    const report = await measureGrowth(async (n): Promise<Measured> => { asked.push(n); const s = f(n); return s > 2e6 ? { steps: 2e6, cut: 'lines' } : { steps: s, charged: n > 100 ? ['in'] : [] }; });
    return { asked, report };
  };
  const linear = await sizes((n) => 3 * n);
  assert.equal(linear.asked[0], COUNT_START);
  assert.equal(linear.asked.length, 13, 'twelve doublings at most');
  assert.ok(linear.report.ok && linear.report.growth === 'n' && linear.report.points.length === 4);
  assert.ok(linear.report.ok && linear.report.charged.includes('in'));
  const cubic = await sizes((n) => n ** 3);
  assert.deepEqual(cubic.asked, [64, 128, 32, 16, 8]);
  assert.ok(cubic.report.ok && cubic.report.growth === 'n^3');
  const exponential = await sizes((n) => 2 ** n);
  assert.ok(exponential.report.ok && exponential.report.growth === '2^n');
  const broken = await measureGrowth(async (n) => (n > 64 ? { steps: 0, error: { type: 'RecursionError', types: [], message: '', line: 3 } } : { steps: n }));
  assert.deepEqual(broken.ok ? null : broken.n, 128);
});

test('the verdict names the growth, the bound and what was counted', () => {
  assert.equal(verdictText({ kind: 'slow', growth: 'n^2', bound: 'n', charged: [] }), 'Correct. Your solution makes about n² steps; this problem wants n. Steps counted: each line run.');
  assert.equal(verdictText({ kind: 'pass', growth: 'n', charged: ['in', 'sorted()'] }), 'All tests pass, in about n steps. Steps counted: each line run, plus in, sorted().');
  assert.equal(verdictText({ kind: 'pass' }), 'All tests pass.');
  const t = code({}).tests;
  assert.equal(verdictText({ kind: 'fail', index: 0, test: t[0], run: { skipped: true }, why: 'stopped' }), 'Test 1 fails.');
  assert.equal(verdictText({ kind: 'fail', index: 1, test: t[1], run: { skipped: true }, why: 'stopped' }), 'A hidden test fails.');
  assert.equal(verdictText({ kind: 'broken', error: { type: 'SyntaxError', types: [], message: 'invalid syntax', line: 2 } }), 'Line 2: SyntaxError: invalid syntax');
});

test('evidence: a pass within the bound is +1, giving up before a pass is −1, and nothing else records', () => {
  const t = code({}).tests[0];
  const outcomes: readonly [SubmitOutcome, boolean | null][] = [
    [{ kind: 'pass' }, true],
    [{ kind: 'slow', growth: 'n^2', bound: 'n', charged: [] }, null],
    [{ kind: 'fail', index: 0, test: t, run: { skipped: true }, why: 'stopped' }, null],
    [{ kind: 'broken', killed: true }, null],
    [{ kind: 'grewBroken', n: 128 }, null],
  ];
  for (const [outcome, want] of outcomes) assert.equal(evidenceOf({ kind: 'submit', outcome }), want, outcome.kind);
  assert.equal(evidenceOf({ kind: 'run' }), null);
  assert.equal(evidenceOf({ kind: 'giveUp', passed: false }), false);
  assert.equal(evidenceOf({ kind: 'giveUp', passed: true }), null);
});

test('grow is seeded: the same n builds the same input, and Math.random is the seeded rand', () => {
  const run = (body: string, rand: unknown) => new Function('rand', body)(rand);
  const src = '(n, rand) => [Array.from({ length: n }, () => rand.int(0, 9)), Math.random()]';
  assert.deepEqual(evaluate(src, 8, run), evaluate(src, 8, run));
  assert.notDeepEqual(evaluate(src, 8, run), evaluate(src, 9, run));
  assert.equal(seeded(1)(), seeded(1)());
  assert.deepEqual(evaluate('(n) => { throw new Error("no") }', 1, run), { ok: false, error: 'no' });
});

test('a draft equal to the starter is let go', () => {
  const k = draftKey({ book: 'b', section: '2.3', ex: 'p1', lang: 'python' });
  assert.equal(k, 'b|2.3|p1|python');
  assert.deepEqual(withDraft({}, k, 'x = 1', ''), { [k]: 'x = 1' });
  assert.deepEqual(withDraft({ [k]: 'x = 1', o: 'y' }, k, '', ''), { o: 'y' });
});

/* ---------- the build check, under CPython ---------- */

const hasPython = spawnSync('python3', ['-I', '-c', 'import sys; sys.exit(sys.version_info < (3, 12))']).status === 0;
const TWO_SUM = {
  type: 'code', bound: 'n', grow: '(n, rand) => [Array.from({ length: n }, (_, i) => 2 * i), -1]',
  tests: [{ args: [[2, 7, 11, 15], 9], expect: [0, 1], visible: true }, { args: [[3, 3], 6], expect: [0, 1] }, { args: [[1, 2], 7], expect: null }],
};
const page = (answer: object) => ({ dto: SectionSchema.parse({ id: '2.3', chapter: '2', title: 'T', built: '2026-11-08', exercises: [{ id: 'p1', source_id: 'x', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'p', answer }] }) });
const LINEAR = 'def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return None\n';
const QUADRATIC = 'def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return None\n';
const LIST_IN = 'def two_sum(nums, target):\n    seen = []\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen.index(target - x), i]\n        seen.append(x)\n    return None\n';

test('check:code passes a linear reference, and fails a quadratic one, or one whose `in` scans a list', { skip: !hasPython && 'no python3 ≥ 3.12' }, async () => {
  const python = cpythonRunner();
  const run = (reference: string, o: object = {}) => checkReferences([page({ ...TWO_SUM, python: { entry: 'two_sum', reference }, ...o })], { python }, growInNode);
  assert.deepEqual(await run(LINEAR), []);
  assert.match((await run(QUADRATIC))[0].what, /grows as n², past the bound n/);
  assert.match((await run(LIST_IN))[0].what, /grows as n², past the bound n/);
  const loose = await run(LINEAR, { bound: 'n^2' });
  assert.deepEqual(loose.map((f) => f.level), ['warning']);
  assert.match(loose[0].what, /below the bound n²: the bound is loose/);
  const wrong = await run('def two_sum(nums, target):\n    return [0, 1]\n');
  assert.match(wrong[0].what, /fails test 3: A different result/);
  const program = page({ type: 'code', python: { reference: 'a, b = map(int, input().split())\nprint(a + b)\n' }, tests: [{ stdin: '1 2\n', stdout: '3\n', visible: true }, { stdin: '5 5', stdout: '10 ' }] });
  assert.deepEqual(await checkReferences([program], { python }, growInNode), []);
});
