/* What a code runner is to the rest of the app. One runner per language, each
   behind the same four calls, so the card, the build check and (slice 3) the
   JavaScript adapter never ask which one they hold. Everything a runner
   returns is JSON: a value, an error by name, and the steps it counted. */
import type { Growth } from '../content/schema';

export type Lang = 'python' | 'javascript';
/* What a language's half of an answer tells the runner: the function the tests
   call, or nothing for a program read on stdin. */
export type CodeSpec = { readonly entry?: string };
/* Seconds per test (or per size, counting) and a budget of steps. */
export type Limits = { readonly seconds?: number; readonly lines?: number };
/* One input: the arguments of a call, or a program's stdin. */
export type CodeInput = { readonly args: readonly unknown[] } | { readonly stdin: string };
/* A test as a runner takes it: an input, and the stdout it is compared with, whose length sets how much is kept. */
export type RunTest = CodeInput & { readonly stdout?: string };

export type RunError = { readonly type: string; readonly types: readonly string[]; readonly message: string; readonly line: number | null };
export type LimitHit = 'time' | 'lines';
export type TestRun =
  | { readonly value?: unknown; readonly error?: RunError; readonly limit?: LimitHit; readonly stdout: string; readonly stdoutCut: boolean; readonly steps: number; readonly skipped?: undefined }
  | { readonly skipped: true };
/* A run of tests: one result per test, or why none ran (the code does not
   compile), or `killed` when the host stopped the worker at its hard deadline. */
export type RunReport =
  | { readonly ok: true; readonly results: readonly TestRun[] }
  | { readonly ok: false; readonly error?: RunError; readonly killed?: true };

/* One size of the growth check: the steps the code took on grow(n), or how it stopped. */
export type Measured = { readonly steps: number; readonly cut?: LimitHit | null; readonly charged?: readonly string[]; readonly error?: RunError; readonly killed?: true };
export type CountPoint = { readonly n: number; readonly steps: number };
export type CountReport =
  | { readonly ok: true; readonly points: readonly CountPoint[]; readonly growth: Growth | null; readonly charged: readonly string[] }
  | { readonly ok: false; readonly n: number; readonly error?: RunError; readonly killed?: true };
/* A worst-case input of size n, as the answer's `grow` builds it. */
export type Grow = (n: number) => Promise<CodeInput>;

/* "Line L finished; these are the variables now", at a depth of calls. */
export type TraceFrame = { readonly line: number; readonly vars: Readonly<Record<string, unknown>>; readonly depth: number; readonly fn?: string };
export type TraceReport = {
  readonly ok: boolean; readonly frames: readonly TraceFrame[]; readonly truncated: boolean; readonly stdout: string;
  readonly value?: unknown; readonly error?: RunError; readonly limit?: LimitHit;
};

export interface Runner {
  readonly lang: Lang;
  load(): Promise<void>;
  run(code: string, spec: CodeSpec, tests: readonly RunTest[], limits?: Limits): Promise<RunReport>;
  count(code: string, spec: CodeSpec, grow: Grow, limits?: Limits): Promise<CountReport>;
  trace(code: string, spec: CodeSpec, input: CodeInput, options?: { readonly maxFrames?: number }): Promise<TraceReport>;
}
