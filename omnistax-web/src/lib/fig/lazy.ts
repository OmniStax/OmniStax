/* A library fetched on first use. Work asked of it before it lands waits, in order, and is done
   once it does; a fetch that fails is tried again on a widening timer while work waits, so one
   dropped chunk never leaves a formula unset for the life of the page. */
export type Lazy<T> = { readonly now: () => T | null; readonly use: (f: (lib: T) => void) => void };
export type RetryMs = readonly number[];

const RETRY_MS: RetryMs = [300, 1000, 3000, 10000, 30000];

export function lazy<T>(load: () => Promise<T>, retryMs: RetryMs = RETRY_MS): Lazy<T> {
  let lib: T | null = null, fetching = false, timer: ReturnType<typeof setTimeout> | null = null, fails = 0;
  let waiting: ((lib: T) => void)[] = [];
  const land = (got: T): void => {
    lib = got; fetching = false;
    const due = waiting; waiting = [];
    due.forEach((f) => { try { f(got); } catch (e) { console.error(e); } });
  };
  const fail = (): void => {
    fetching = false;
    timer = setTimeout(() => { timer = null; fetch(); }, retryMs[Math.min(fails++, retryMs.length - 1)]);
  };
  const fetch = (): void => {
    if (fetching || timer) return;
    fetching = true;
    load().then(land, fail);
  };
  return {
    now: () => lib,
    use: (f) => { if (lib) { f(lib); return; } waiting.push(f); fetch(); },
  };
}

/* A browser keeps a failed module fetch against its address, and every later import() of that
   address fails without asking the network. So an import that failed, where the error names the
   chunk (Chromium and Firefox do), is asked for again under a fresh query, which is a new address
   to the module map and the same file to the server. */
type ChunkUrl = string;
export const failedChunk = (e: unknown): ChunkUrl | null =>
  e instanceof Error ? (/\bhttps?:\/\/[^\s'"?#]+\.m?js\b/.exec(e.message)?.[0] ?? null) : null;
export function importing<M>(first: () => Promise<M>, again: (url: ChunkUrl) => Promise<unknown> = (u) => import(/* @vite-ignore */ u)): () => Promise<M> {
  let failed: ChunkUrl | null = null, tries = 0;
  return () => {
    const go = failed ? (again(`${failed}?retry=${++tries}`) as Promise<M>) : first();
    return go.catch((e: unknown) => { failed = failedChunk(e) ?? failed; throw e; });
  };
}
