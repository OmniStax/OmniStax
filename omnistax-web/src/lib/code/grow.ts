/* An answer's `grow`: a JavaScript function (n, rand) => input, written for
   both languages, that builds a worst-case input of size n. It runs seeded, so
   the same n always builds the same input: rand() is a number in [0, 1),
   rand.int(lo, hi) an integer between them, and Math.random is rand. The build
   evaluates it in node (code/node.ts); the browser in a worker of its own
   (grow.worker.ts), so a grow that never returns costs a terminate. */
export type Rand = (() => number) & { readonly int: (lo: number, hi: number) => number };

/* mulberry32: small, fast, and the same on every engine. */
export const seeded = (seed: number): Rand => {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)) });
};

/* The body both evaluators run, with `rand` in scope: Math.random seeded, and grow called on n. */
export const growBody = (src: string, n: number): string => `Math.random = rand; return (${src})(${JSON.stringify(n)}, rand);`;
/* Each size has its own seed, so adding a size never changes another's input. */
export const seedOf = (n: number): number => n * 2654435761;

export type GrowAsk = { readonly src: string; readonly n: number };
export type GrowReply = { readonly ok: true; readonly json: string } | { readonly ok: false; readonly error: string };

/* What a grow returns, as JSON, so it crosses a worker or a vm boundary as one string. */
export const evaluate = (src: string, n: number, run: (body: string, rand: Rand) => unknown): GrowReply => {
  try {
    const json = JSON.stringify(run(growBody(src, n), seeded(seedOf(n))));
    return json === undefined ? { ok: false, error: 'grow returned nothing' } : { ok: true, json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

/* The browser's grow: one short-lived worker per call, terminated at the deadline. */
export const GROW_MS = 3000;
export const growInWorker = (src: string, n: number): Promise<unknown> =>
  new Promise((done, fail) => {
    const w = new Worker(new URL('./grow.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { w.terminate(); fail(new Error('grow did not return in time')); }, GROW_MS);
    w.onmessage = (e: MessageEvent<GrowReply>) => {
      clearTimeout(timer); w.terminate();
      if (e.data.ok) done(JSON.parse(e.data.json)); else fail(new Error(e.data.error));
    };
    w.onerror = () => { clearTimeout(timer); w.terminate(); fail(new Error('grow could not run')); };
    w.postMessage({ src, n } satisfies GrowAsk);
  });
