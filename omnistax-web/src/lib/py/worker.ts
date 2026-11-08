/* Every Python the app runs, off the main thread, in one Pyodide: the
   calculator's engine and, beside it, whatever else asks by its own kind. The
   interpreter is fetched the first time anything asks; each kind's own
   packages and source load the first time that kind asks, into a namespace of
   its own, and its `run` is called for every request after. One message in,
   one message out, keyed by the id it came with. */
import casSource from '../cas/cas.py?raw';

/* Pinned, so the service worker's copy of it never goes stale. */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
export type PyKind = 'cas';
export type PyMessage = { readonly id: number; readonly kind: PyKind; readonly request: string };
export type PyPost = { readonly id: number; readonly reply: string } | { readonly id: number; readonly failed: true };

type PyDict = { readonly get: (name: string) => unknown };
type Pyodide = {
  readonly loadPackage: (names: readonly string[]) => Promise<unknown>;
  readonly runPython: (code: string, options?: { readonly globals?: PyDict }) => unknown;
  readonly toPy: (value: unknown) => PyDict;
};
type Loader = { readonly loadPyodide: (o: { readonly indexURL: string; readonly env?: Readonly<Record<string, string>> }) => Promise<Pyodide> };
type Run = (request: string) => string;

/* A source run once in a dict of its own, so two kinds may each call their entry `run`. */
const own = (py: Pyodide, source: string): Run => {
  const ns = py.toPy({});
  py.runPython(source, { globals: ns });
  return ns.get('run') as Run;
};
/* What each kind needs before its first request: its packages, then its source. */
const KINDS: Readonly<Record<PyKind, (py: Pyodide) => Promise<Run>>> = {
  cas: async (py) => { await py.loadPackage(['sympy']); return own(py, casSource); },
};

/* The hash seed is fixed, so a set prints in the same order on every load. */
let interpreter: Promise<Pyodide> | null = null;
const pyodide = (): Promise<Pyodide> =>
  interpreter ??= (import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`) as Promise<Loader>)
    .then((m) => m.loadPyodide({ indexURL: PYODIDE, env: { PYTHONHASHSEED: '0' } }))
    .catch((e: unknown) => { interpreter = null; throw e; });
const engines = new Map<PyKind, Promise<Run>>();
const engine = (kind: PyKind): Promise<Run> => {
  const held = engines.get(kind); if (held) return held;
  const next = pyodide().then(KINDS[kind]);
  next.catch(() => engines.delete(kind));
  engines.set(kind, next);
  return next;
};

const post = (m: PyPost): void => (self as unknown as Worker).postMessage(m);
self.onmessage = (e: MessageEvent<PyMessage>) => {
  const { id, kind, request } = e.data;
  engine(kind).then((run) => post({ id, reply: run(request) })).catch(() => post({ id, failed: true }));
};
