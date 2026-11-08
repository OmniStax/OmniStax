/* The page's side of the one Python worker: started the first time anything
   asks, fed one request at a time, and torn down and started afresh when a
   request outlives its deadline. A request's clock starts when the worker takes
   it, not when it was asked, so a calculation queued behind a long code run is
   not timed out for the wait. The first request of a kind also waits for
   Pyodide and that kind's packages to arrive, and has six times as long. */
import type { PyKind, PyMessage, PyPost } from './worker';

/* Why a request failed: Python or its packages never arrived, or the request
   ran past its deadline and took the worker with it. */
export type PyFailure = 'load' | 'timeout';
export class PyError extends Error {
  constructor(readonly reason: PyFailure) { super(reason); }
}
export const COLD = 6;

type Job = { readonly id: number; readonly kind: PyKind; readonly request: string; readonly ms: number; readonly done: (reply: string) => void; readonly fail: (e: PyError) => void };
let worker: Worker | null = null;
let next = 0;
let running: (Job & { readonly timer: ReturnType<typeof setTimeout> }) | null = null;
const queue: Job[] = [];
const warm = new Set<PyKind>();

/* Whatever was running fails; whatever waits behind it goes to a fresh worker. */
const restart = (why: PyFailure): void => {
  worker?.terminate(); worker = null; warm.clear();
  const job = running; running = null;
  if (job) { clearTimeout(job.timer); job.fail(new PyError(why)); }
  pump();
};
const workerFor = (): Worker => {
  if (worker) return worker;
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<PyPost>) => {
    const m = e.data, job = running; if (!job || job.id !== m.id) return;
    running = null; clearTimeout(job.timer);
    if ('failed' in m) job.fail(new PyError('load')); else { warm.add(job.kind); job.done(m.reply); }
    pump();
  };
  w.onerror = () => restart('load');
  return worker = w;
};
const pump = (): void => {
  if (running) return;
  const job = queue.shift(); if (!job) return;
  const w = workerFor();
  running = { ...job, timer: setTimeout(() => restart('timeout'), warm.has(job.kind) ? job.ms : job.ms * COLD) };
  w.postMessage({ id: job.id, kind: job.kind, request: job.request } satisfies PyMessage);
};

/* One request of a kind, answered as the string its `run` returned. */
export const askPython = (kind: PyKind, request: string, ms: number): Promise<string> =>
  new Promise((done, fail) => { queue.push({ id: next++, kind, request, ms, done, fail }); pump(); });
/* Whether a kind has answered since the worker last started, so its next request needs no long wait. */
export const isWarm = (kind: PyKind): boolean => warm.has(kind);
