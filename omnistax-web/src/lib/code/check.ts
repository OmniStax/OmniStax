/* Checking code without a grader, the parts that need no runner: a result
   against what a test expects, the growth class a list of step counts fits, the
   sizes the growth check measures, the verdict a reader is shown, and which
   outcome is evidence (root rule 20). Pure; both runners and the build check
   share it, so a test passes or fails for the same reason everywhere. */
import { GROWTHS, codeFormOf, type CodeAnswerDTO, type CodeTestDTO, type Growth } from '../content/schema';
import { t } from '../i18n/index';
import type { CodeInput, CountPoint, CountReport, Measured, RunError, RunTest, TestRun } from './types';

/* ---------- comparing a result ---------- */

/* A float matches to one part in a billion unless the answer names a tolerance. */
export const CODE_TOL = 1e-9;
const near = (a: number, b: number, tol: number): boolean =>
  a === b || (Number.isInteger(a) && Number.isInteger(b) ? false : Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-300));

/* Two JSON values equal, floats to the tolerance. */
export const sameValue = (got: unknown, want: unknown, tol = CODE_TOL): boolean => {
  if (typeof got === 'number' && typeof want === 'number') return near(got, want, tol);
  if (Array.isArray(got) || Array.isArray(want)) {
    return Array.isArray(got) && Array.isArray(want) && got.length === want.length && got.every((g, i) => sameValue(g, want[i], tol));
  }
  if (got !== null && want !== null && typeof got === 'object' && typeof want === 'object') {
    const g = got as Record<string, unknown>, w = want as Record<string, unknown>;
    const keys = Object.keys(w);
    return Object.keys(g).length === keys.length && keys.every((k) => k in g && sameValue(g[k], w[k], tol));
  }
  return got === want;
};

/* Two lists equal as multisets at the top level: keon's three_sum returns a set, whose order means nothing. */
export const sameUnordered = (got: unknown, want: unknown, tol = CODE_TOL): boolean => {
  if (!Array.isArray(got) || !Array.isArray(want) || got.length !== want.length) return false;
  const left = [...got];
  return want.every((w) => { const i = left.findIndex((g) => sameValue(g, w, tol)); if (i < 0) return false; left.splice(i, 1); return true; });
};

/* What a program printed against what it should: exactly; token by token, numbers to the tolerance;
   or, by default, line by line with trailing spaces and the blank lines at the end let go (one Kattis
   sample prints a trailing space). */
const lines = (s: string): readonly string[] => {
  const out = s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd());
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
};
export const sameStdout = (got: string, want: string, compare: CodeAnswerDTO['compare'], tol = CODE_TOL): boolean => {
  if (compare === 'exact') return got === want;
  if (compare === 'tokens') {
    const g = got.split(/\s+/).filter(Boolean), w = want.split(/\s+/).filter(Boolean);
    return g.length === w.length && g.every((x, i) => x === w[i] || (/^-?\d/.test(w[i]) && !Number.isNaN(Number(x)) && near(Number(x), Number(w[i]), tol)));
  }
  const g = lines(got), w = lines(want);
  return g.length === w.length && g.every((x, i) => x === w[i]);
};

/* ---------- one test ---------- */

export type TestVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly why: 'wrong' | 'raised' | 'noRaise' | 'otherError' | 'limit' | 'stopped' };

export const judge = (answer: CodeAnswerDTO, test: CodeTestDTO, run: TestRun): TestVerdict => {
  if (run.skipped) return { ok: false, why: 'stopped' };
  if (run.limit) return { ok: false, why: 'limit' };
  const tol = answer.tol ?? CODE_TOL;
  if (test.raises !== undefined) return run.error ? (run.error.types.includes(test.raises) ? { ok: true } : { ok: false, why: 'otherError' }) : { ok: false, why: 'noRaise' };
  if (run.error) return { ok: false, why: 'raised' };
  if (codeFormOf(test) === 'stdin') return sameStdout(run.stdout, test.stdout ?? '', answer.compare, tol) ? { ok: true } : { ok: false, why: 'wrong' };
  const same = answer.compare === 'unordered' ? sameUnordered(run.value, test.expect, tol) : sameValue(run.value, test.expect, tol);
  return same ? { ok: true } : { ok: false, why: 'wrong' };
};

/* A test as the runner takes it. */
export const runTestOf = (test: CodeTestDTO): RunTest =>
  test.stdin !== undefined ? { stdin: test.stdin, ...(test.stdout === undefined ? {} : { stdout: test.stdout }) } : { args: test.args ?? [] };
/* Run runs the visible tests; Submit runs them all. */
export const visibleTests = (a: CodeAnswerDTO): readonly CodeTestDTO[] => a.tests.filter((x) => x.visible);

/* ---------- growth ---------- */

/* log f(n) for each class, in the log domain so 2ⁿ at n = 64 stays a number. */
const LOG_F: Readonly<Record<Growth, (n: number) => number>> = {
  '1': () => 0,
  'log n': (n) => Math.log(Math.log2(n)),
  n: (n) => Math.log(n),
  'n log n': (n) => Math.log(n) + Math.log(Math.log2(n)),
  'n^2': (n) => 2 * Math.log(n),
  'n^3': (n) => 3 * Math.log(n),
  '2^n': (n) => n * Math.LN2,
};
export const rank = (g: Growth): number => GROWTHS.indexOf(g);
/* Whether a is a faster-growing class than b. */
export const worse = (a: Growth, b: Growth): boolean => rank(a) > rank(b);

/* The class whose log(count / f(n)) spreads least over the points; a tie goes to the slower-growing class. */
export const fitGrowth = (points: readonly CountPoint[]): Growth | null => {
  const usable = points.filter((p) => p.n >= 2 && p.steps >= 1);
  if (usable.length < 2) return null;
  const spread = (g: Growth): number => {
    const r = usable.map((p) => Math.log(p.steps) - LOG_F[g](p.n));
    return Math.max(...r) - Math.min(...r);
  };
  return GROWTHS.reduce<{ g: Growth; s: number } | null>((best, g) => {
    const s = spread(g);
    return best === null || s < best.s - 1e-9 ? { g, s } : best;
  }, null)?.g ?? null;
};

/* The sizes: from 64, doubling while a run stays under half the budget, at most twelve times; where
   that leaves fewer than four points (a steep class runs out at once), halving below 64 until it does.
   The last four are fitted. */
export const COUNT_BUDGET = 2_000_000;
export const COUNT_START = 64;
export const COUNT_DOUBLINGS = 12;
export const COUNT_FIT = 4;
export const measureGrowth = async (measure: (n: number) => Promise<Measured>): Promise<CountReport> => {
  const points: CountPoint[] = [];
  const charged = new Set<string>();
  const take = (n: number, m: Measured): 'kept' | 'cut' => {
    m.charged?.forEach((c) => charged.add(c));
    if (m.cut) return 'cut';
    points.push({ n, steps: m.steps });
    return 'kept';
  };
  for (let d = 0, n = COUNT_START; d <= COUNT_DOUBLINGS; d++, n *= 2) {
    const m = await measure(n);
    if (m.error || m.killed) return { ok: false, n, ...(m.error ? { error: m.error } : {}), ...(m.killed ? { killed: true } : {}) };
    if (take(n, m) === 'cut' || m.steps >= COUNT_BUDGET / 2) break;
  }
  for (let n = COUNT_START / 2; points.length < COUNT_FIT && n >= 2; n /= 2) {
    const m = await measure(n);
    if (m.error || m.killed) return { ok: false, n, ...(m.error ? { error: m.error } : {}), ...(m.killed ? { killed: true } : {}) };
    take(n, m);
  }
  const fitted = [...points].sort((a, b) => a.n - b.n).slice(-COUNT_FIT);
  return { ok: true, points: fitted, growth: fitGrowth(fitted), charged: [...charged].sort() };
};
/* Whether a count is within the answer's bound. A count that fits no class ran out of steps on every size, which no bound but 2ⁿ allows. */
export const withinBound = (growth: Growth | null, bound: Growth): boolean => (growth === null ? bound === '2^n' : !worse(growth, bound));

/* ---------- a submit, and what it is evidence of ---------- */

export type SubmitOutcome =
  | { readonly kind: 'pass'; readonly growth?: Growth | null; readonly charged?: readonly string[] }
  | { readonly kind: 'fail'; readonly index: number; readonly test: CodeTestDTO; readonly run: TestRun; readonly why: Exclude<TestVerdict, { ok: true }>['why'] }
  | { readonly kind: 'broken'; readonly error?: RunError; readonly killed?: true }
  | { readonly kind: 'slow'; readonly growth: Growth | null; readonly bound: Growth; readonly charged: readonly string[] }
  | { readonly kind: 'grewBroken'; readonly n: number; readonly error?: RunError; readonly killed?: true };

/* The first test that fails, or null when every one passes. */
export const firstFailure = (answer: CodeAnswerDTO, tests: readonly CodeTestDTO[], results: readonly TestRun[]): Extract<SubmitOutcome, { kind: 'fail' }> | null => {
  for (let i = 0; i < tests.length; i++) {
    const v = judge(answer, tests[i], results[i] ?? { skipped: true });
    if (!v.ok) return { kind: 'fail', index: i, test: tests[i], run: results[i] ?? { skipped: true }, why: v.why };
  }
  return null;
};

/* What a reader's action is evidence of (decisions 1 and 2): a submit that passes within the bound
   is +1; a failed or too-slow submit records nothing, so the reader can keep going; giving up before
   a pass is −1; Run never records. null is "record nothing". */
export type CodeEvent = { readonly kind: 'run' } | { readonly kind: 'submit'; readonly outcome: SubmitOutcome } | { readonly kind: 'giveUp'; readonly passed: boolean };
export const evidenceOf = (e: CodeEvent): boolean | null =>
  e.kind === 'submit' ? (e.outcome.kind === 'pass' ? true : null) : e.kind === 'giveUp' ? (e.passed ? null : false) : null;

/* ---------- what the reader is shown ---------- */

export const GROWTH_TEXT: Readonly<Record<Growth, string>> = { '1': '1', 'log n': 'log n', n: 'n', 'n log n': 'n log n', 'n^2': 'n²', 'n^3': 'n³', '2^n': '2ⁿ' };
/* What the count charged besides the lines, said so the reader knows what was measured. */
export const countedText = (charged: readonly string[]): string =>
  charged.length ? t('exercises.code.countedAlso', { what: charged.join(', ') }) : t('exercises.code.counted');

/* The line under a submit. */
export const verdictText = (o: SubmitOutcome): string => {
  switch (o.kind) {
    case 'pass': return o.growth ? `${t('exercises.code.passGrowth', { growth: GROWTH_TEXT[o.growth] })} ${countedText(o.charged ?? [])}` : t('exercises.code.pass');
    case 'slow': return `${o.growth ? t('exercises.code.slow', { growth: GROWTH_TEXT[o.growth], bound: GROWTH_TEXT[o.bound] }) : t('exercises.code.slowUnknown', { bound: GROWTH_TEXT[o.bound] })} ${countedText(o.charged)}`;
    case 'fail': return o.test.visible ? t('exercises.code.failed', { n: o.index + 1 }) : t('exercises.code.hiddenFailed');
    case 'broken': return o.killed ? t('exercises.code.killed') : errorText(o.error);
    case 'grewBroken': return o.killed ? t('exercises.code.killed') : t('exercises.code.grewBroken', { n: o.n, error: errorText(o.error) });
  }
};
export const errorText = (e: RunError | undefined): string =>
  e === undefined ? t('exercises.code.loadFailed') : `${e.line === null ? '' : `${t('exercises.code.line', { line: e.line })} `}${e.type}${e.message ? `: ${e.message}` : ''}`;
/* Why one test failed, in a line. */
export const whyText = (test: CodeTestDTO, run: TestRun, why: Exclude<TestVerdict, { ok: true }>['why']): string => {
  if (run.skipped || why === 'stopped') return t('exercises.code.skipped');
  switch (why) {
    case 'limit': return run.limit === 'lines' ? t('exercises.code.limitLines') : t('exercises.code.limitTime');
    case 'noRaise': return t('exercises.code.noRaise', { type: test.raises ?? '' });
    case 'otherError': return t('exercises.code.otherError', { type: test.raises ?? '', got: errorText(run.error) });
    case 'raised': return errorText(run.error);
    case 'wrong': return t('exercises.code.wrong');
  }
};
/* A value as a test row prints it: JSON, cut short. */
export const shown = (v: unknown, max = 200): string => {
  const s = v === undefined ? '' : JSON.stringify(v) ?? String(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
/* A test's input as a row prints it: the call, or the stdin. */
export const inputText = (test: CodeTestDTO, entry: string | undefined): string =>
  test.stdin !== undefined ? test.stdin : `${entry ?? ''}(${(test.args ?? []).map((a) => shown(a)).join(', ')})`;
/* A grow result checked into an input of the answer's form. */
export const inputOf = (value: unknown, stdin: boolean): CodeInput => {
  if (stdin) { if (typeof value !== 'string') throw new Error('grow must return the stdin text for a program'); return { stdin: value }; }
  if (!Array.isArray(value)) throw new Error('grow must return the argument list for a call');
  return { args: value };
};
