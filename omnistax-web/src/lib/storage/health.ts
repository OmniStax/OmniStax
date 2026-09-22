/* Whether the reader's data is safe where it is. Everything the reader owns —
   notes, highlights, practice, and now whole files — lives in this browser,
   and a browser may throw it away when space runs short. The one place that
   says so is the Storage block in Settings; nothing else nags.

   Two questions are asked of the browser. `navigator.storage.persist()` asks
   it to promise not to clear this origin, which it answers once and for all,
   so the answer is remembered rather than asked again on every write.
   `navigator.storage.estimate()` says how much is used and how much there is. */

/* The answer is deliberately not in the backup's whitelist: it is a fact about
   this browser and not about the reader, and carrying "granted" into a browser
   that never promised anything would make the block lie. */
export const PERSIST_KEY = 'omnistax-storage-persist';

/* What the browser said when it was asked. `unsupported` is not a refusal: the
   engine has no such promise to make, which on a desktop browser is usually
   fine and on Safari is not. */
export type Persistence = 'granted' | 'denied' | 'unsupported' | 'unasked';
const ANSWERS: readonly Persistence[] = ['granted', 'denied', 'unsupported'];

export const rememberedPersistence = (): Persistence => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return (ANSWERS as readonly string[]).includes(raw ?? '') ? (raw as Persistence) : 'unasked';
  } catch { return 'unasked'; }
};

const remember = (answer: Persistence): Persistence => {
  try { localStorage.setItem(PERSIST_KEY, answer); } catch { /* private mode */ }
  return answer;
};

/* Asked once, on the first write of a file blob. A browser that has already
   promised says so without a prompt; one that has refused is not asked again,
   since asking a second time is how a reader learns to say no faster. */
export const askToPersist = async (): Promise<Persistence> => {
  const known = rememberedPersistence();
  if (known !== 'unasked') return known;
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage || typeof storage.persist !== 'function') return remember('unsupported');
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) return remember('granted');
    return remember((await storage.persist()) ? 'granted' : 'denied');
  } catch { return remember('unsupported'); }
};

/* How much of the browser's allowance this origin is using. Both numbers may
   be missing, and a browser that rounds them is telling the truth as far as it
   will: the block says "Using X of Y" and nothing more precise. */
export type Estimate = { readonly usage: number | null; readonly quota: number | null };

export const estimate = async (): Promise<Estimate> => {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  if (!storage || typeof storage.estimate !== 'function') return { usage: null, quota: null };
  try {
    const e = await storage.estimate();
    return { usage: typeof e.usage === 'number' ? e.usage : null, quota: typeof e.quota === 'number' ? e.quota : null };
  } catch { return { usage: null, quota: null }; }
};

/* The fraction of the allowance in use, for the bar; nothing where either
   number is missing. */
export const usedFraction = (e: Estimate): number | null =>
  e.usage === null || e.quota === null || e.quota <= 0 ? null : Math.min(1, e.usage / e.quota);

/* ── what the reader is told ─────────────────────────────────────────────── */

/* Safari clears a site's data after seven days without a visit unless the app
   is on the home screen, which no other engine does, so the block says so
   where it is true and nowhere else. The test is the engine and not the brand:
   every browser on iOS is WebKit. */
export const isWebkit = (ua: string, vendor = ''): boolean =>
  /iP(?:hone|ad|od)/.test(ua) || (/Safari/.test(ua) && !/Chrom|Chromium|Edg|OPR|Android/.test(ua)) || /Apple/.test(vendor) && !/Chrom/.test(ua);

export const PERSIST_WORDS: Readonly<Record<Persistence, string>> = {
  granted: 'Your browser has promised to keep this data.',
  denied: 'Your browser may clear this data when space runs low. Install OmniStax as an app or bookmark it, then reopen this page, and keep a backup. Self-hosting removes the limit.',
  unsupported: 'Your browser may clear this data when space runs low. Install OmniStax as an app or bookmark it, then reopen this page, and keep a backup. Self-hosting removes the limit.',
  unasked: 'Import a file or write a note and your browser will be asked to keep this data.',
};

export const SAFARI_WORDS = 'Safari deletes a site’s data after seven days without a visit, unless the app is on your home screen.';

/* The whole of what the block draws, worked out in one place so the component
   only lays it out. */
export type Health = {
  readonly persistence: Persistence;
  readonly estimate: Estimate;
  readonly fraction: number | null;
  readonly words: string;
  readonly safari: boolean;
};

export const healthOf = (persistence: Persistence, e: Estimate, webkit: boolean): Health =>
  ({ persistence, estimate: e, fraction: usedFraction(e), words: PERSIST_WORDS[persistence], safari: webkit });

export const readHealth = async (): Promise<Health> => {
  const [e] = await Promise.all([estimate()]);
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const vendor = typeof navigator === 'undefined' ? '' : navigator.vendor ?? '';
  return healthOf(rememberedPersistence(), e, isWebkit(ua, vendor));
};
