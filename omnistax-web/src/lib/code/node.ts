/* The runners as the build and the tests use them, in node: runner.py under
   the machine's own CPython, and grow in a vm context. A reference may come
   from a downloaded source, so Python runs isolated (`python3 -I`: no
   environment, no user site, no script directory on the path) from a fresh
   temporary directory each time, which is deleted after (decision 17). */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { inputOf, measureGrowth } from './check';
import { evaluate, GROW_MS } from './grow';
import type { CodeInput, CodeSpec, CountReport, Grow, Limits, Measured, RunReport, RunTest, Runner, TraceReport } from './types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(HERE, 'runner.py');
const COSTS = path.join(HERE, 'costs.json');
const SLACK_S = 3;

/* One request to a fresh CPython, or `killed` when it outlived its deadline. */
const ask = <T,>(python: string, q: object, seconds: number): T | { readonly ok: false; readonly killed: true } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnistax-code-'));
  try {
    const done = spawnSync(python, ['-I', RUNNER, COSTS], { cwd: dir, input: JSON.stringify(q), encoding: 'utf8', timeout: (seconds + SLACK_S) * 1000, maxBuffer: 64 * 1024 * 1024 });
    if (done.error && (done.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') return { ok: false, killed: true };
    if (done.error) throw done.error;
    if (done.status !== 0) throw new Error(`${python} -I runner.py exited ${done.status}: ${done.stderr.trim().split('\n').pop() ?? ''}`);
    return JSON.parse(done.stdout) as T;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export const cpythonRunner = (python = process.env.OMNISTAX_PYTHON ?? 'python3'): Runner => ({
  lang: 'python',
  load: async () => {
    const v = spawnSync(python, ['-I', '-c', 'import sys; print(sys.version_info >= (3, 12))'], { encoding: 'utf8' });
    if (v.error || v.stdout.trim() !== 'True') throw new Error(`${python} is not Python 3.12 or later, which the runner needs (sys.monitoring)`);
  },
  run: async (code: string, spec: CodeSpec, tests: readonly RunTest[], limits: Limits = {}): Promise<RunReport> =>
    ask<RunReport>(python, { mode: 'run', code, entry: spec.entry, tests, limits }, (limits.seconds ?? 2) * Math.max(tests.length, 1)),
  count: (code: string, spec: CodeSpec, grow: Grow, limits: Limits = {}): Promise<CountReport> =>
    measureGrowth(async (n) => {
      const r = ask<Measured>(python, { mode: 'count', code, entry: spec.entry, input: await grow(n), limits }, limits.seconds ?? 5);
      return 'killed' in r && r.killed ? { steps: 0, killed: true } : r;
    }),
  trace: async (code: string, spec: CodeSpec, input: CodeInput, options: { readonly maxFrames?: number } = {}): Promise<TraceReport> => {
    const r = ask<TraceReport>(python, { mode: 'trace', code, entry: spec.entry, input, maxFrames: options.maxFrames }, 2);
    return 'killed' in r ? { ok: false, frames: [], truncated: false, stdout: '', limit: 'time' } : r;
  },
});

/* An answer's grow in a vm context of its own, with a deadline. */
export const growInNode = (src: string, stdin: boolean): Grow => async (n) => {
  const reply = evaluate(src, n, (body, rand) => vm.runInNewContext(`(function (rand) { ${body} })(rand)`, { rand }, { timeout: GROW_MS }));
  if (!reply.ok) throw new Error(`grow(${n}): ${reply.error}`);
  return inputOf(JSON.parse(reply.json), stdin);
};
