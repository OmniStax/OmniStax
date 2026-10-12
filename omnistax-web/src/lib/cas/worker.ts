/* The calculator's engine, off the main thread: Pyodide with SymPy, fetched the
   first time a request arrives, then cas.py run once and its `run` called for
   every request after. One message in, one message out, keyed by the id it came with. */
import source from './cas.py?raw';

/* Pinned, so the service worker's copy of it never goes stale. */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
export type CasMessage = { readonly id: number; readonly request: string };
export type CasPost = { readonly id: number; readonly reply: string } | { readonly id: number; readonly failed: true };

type Pyodide = {
  readonly loadPackage: (names: readonly string[]) => Promise<unknown>;
  readonly runPython: (code: string) => unknown;
  readonly globals: { readonly get: (name: string) => (request: string) => string };
};
type Loader = { readonly loadPyodide: (o: { readonly indexURL: string }) => Promise<Pyodide> };

let engine: Promise<(request: string) => string> | null = null;
const start = (): Promise<(request: string) => string> =>
  engine ??= (import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`) as Promise<Loader>)
    .then((m) => m.loadPyodide({ indexURL: PYODIDE }))
    .then(async (py) => { await py.loadPackage(['sympy']); py.runPython(source); return py.globals.get('run'); });

const post = (m: CasPost): void => (self as unknown as Worker).postMessage(m);
self.onmessage = (e: MessageEvent<CasMessage>) => {
  const { id, request } = e.data;
  start().then((run) => post({ id, reply: run(request) }), () => { engine = null; post({ id, failed: true }); });
};
