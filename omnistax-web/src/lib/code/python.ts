/* The Python runner in the browser: runner.py in the app's one Pyodide,
   through py/host.ts. The runner's own limits stop runaway Python without a
   restart; the host's deadline, set here to those limits plus three seconds,
   catches what they cannot and takes the worker (and the calculator's warm
   SymPy) with it. */
import { askPython, isWarm, PyError } from '../py/host';
import { measureGrowth } from './check';
import type { CodeInput, CodeSpec, CountReport, Grow, Limits, Measured, RunReport, RunTest, Runner, TraceReport } from './types';

const RUN = { seconds: 2, lines: 5_000_000 };
const COUNT = { seconds: 5, lines: 2_000_000 };
const SLACK_S = 3;

/* A request's reply, or `killed` when the host stopped it at the deadline. */
const ask = async <T,>(q: object, seconds: number): Promise<T | { readonly ok: false; readonly killed: true }> => {
  try {
    return JSON.parse(await askPython('code', JSON.stringify(q), (seconds + SLACK_S) * 1000)) as T;
  } catch (e) {
    if (e instanceof PyError && e.reason === 'timeout') return { ok: false, killed: true };
    throw e;
  }
};

export const pythonRunner: Runner = {
  lang: 'python',
  load: async () => { await askPython('code', JSON.stringify({ mode: 'ping' }), 10_000); },
  run: async (code: string, spec: CodeSpec, tests: readonly RunTest[], limits: Limits = {}): Promise<RunReport> => {
    const lim = { ...RUN, ...limits };
    return ask<RunReport>({ mode: 'run', code, entry: spec.entry, tests, limits: lim }, lim.seconds * Math.max(tests.length, 1));
  },
  count: (code: string, spec: CodeSpec, grow: Grow, limits: Limits = {}): Promise<CountReport> => {
    const lim = { ...COUNT, ...limits };
    return measureGrowth(async (n) => {
      const input = await grow(n);
      const r = await ask<Measured & { readonly ok: boolean }>({ mode: 'count', code, entry: spec.entry, input, limits: lim }, lim.seconds);
      return 'killed' in r && r.killed ? { steps: 0, killed: true } : r as Measured;
    });
  },
  trace: async (code: string, spec: CodeSpec, input: CodeInput, options: { readonly maxFrames?: number } = {}): Promise<TraceReport> => {
    const r = await ask<TraceReport>({ mode: 'trace', code, entry: spec.entry, input, maxFrames: options.maxFrames }, 2);
    return 'killed' in r ? { ok: false, frames: [], truncated: false, stdout: '', limit: 'time' } : r;
  },
};
/* Whether Python is loaded, so the card can say "Loading Python…" only when it is. */
export const pythonReady = (): boolean => isWarm('code');
