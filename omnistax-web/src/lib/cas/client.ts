/* The calculator as the page reads it: one request to the engine and the answer
   it gives, the worker started the first time anything asks, and the small
   pure pieces the page draws with (a step's sentence split into text and
   formulas, the grapher's address, the expression an address carries). */
import type { CasMessage, CasPost } from './worker';
import { t } from '../i18n';

export type CasOp = 'integral' | 'derivative';
export type CasRequest = {
  readonly op: CasOp; readonly text: string;
  readonly lower?: string; readonly upper?: string;
  /* only set the input as TeX, which is what the preview asks */
  readonly preview?: boolean;
};
/* One step of the working: a sentence, the equation it arrives at, and the steps that work out its parts. */
export type CasStep = { readonly say: string; readonly math: string; readonly sub: readonly CasStep[] };
export type CasAnswer = {
  readonly ok: true; readonly op: CasOp; readonly input: string; readonly variable: string;
  /* null where no closed form was found */
  readonly result: string | null;
  /* null where the answer was found without step-by-step working */
  readonly steps: readonly CasStep[] | null;
  /* the expression and its answer in the input's notation, for the grapher */
  readonly graph: readonly string[];
};
export type CasPreview = { readonly ok: true; readonly input: string };
export type CasRefusal = { readonly ok: false; readonly error: string };
export type CasReply = CasAnswer | CasPreview | CasRefusal;

/* A request SymPy has not answered by then is abandoned with its worker. */
export const TIMEOUT_MS = 20000;

type Waiting = { readonly done: (r: CasReply) => void; readonly fail: (e: Error) => void; readonly timer: ReturnType<typeof setTimeout> };
let worker: Worker | null = null;
let next = 0;
let engineReady = false;
const waiting = new Map<number, Waiting>();

const drop = (why: string): void => {
  worker?.terminate(); worker = null; engineReady = false;
  [...waiting.values()].forEach((w) => { clearTimeout(w.timer); w.fail(new Error(why)); });
  waiting.clear();
};
const workerFor = (): Worker => {
  if (worker) return worker;
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<CasPost>) => {
    const m = e.data, held = waiting.get(m.id); if (!held) return;
    waiting.delete(m.id); clearTimeout(held.timer);
    if ('failed' in m) held.fail(new Error(t('sheets.cas.loadFailed'))); else held.done(JSON.parse(m.reply) as CasReply);
  };
  w.onerror = () => drop(t('sheets.cas.loadFailed'));
  return worker = w;
};

export const ask = (q: CasRequest): Promise<CasReply> =>
  new Promise((done, fail) => {
    const id = next++, w = workerFor();
    /* The first request also waits for Pyodide and SymPy to arrive. */
    const timer = setTimeout(() => drop(t('sheets.cas.timeout')), engineReady ? TIMEOUT_MS : TIMEOUT_MS * 6);
    waiting.set(id, { done: (r) => { engineReady = true; done(r); }, fail, timer });
    w.postMessage({ id, request: JSON.stringify(q) } satisfies CasMessage);
  });

/* A step's sentence, "Substitute $u = x^2$", as text and formulas in turn. */
export type Piece = { readonly tex: boolean; readonly s: string };
export const pieces = (say: string): readonly Piece[] =>
  say.split('$').map((s, i) => ({ tex: i % 2 === 1, s })).filter((p) => p.s !== '');

/* The grapher with these expressions drawn, one `expr` each. */
export const graphHref = (page: string, exprs: readonly string[]): string => {
  const q = new URLSearchParams(exprs.map((e) => ['expr', e] as [string, string]));
  return `${page}?${q.toString()}`;
};
/* The expression an address hands this page, if it hands one. */
export const exprOf = (search: string): string | null => new URLSearchParams(search).get('expr');
