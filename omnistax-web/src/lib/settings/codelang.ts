/* The reader's code language for a book: the one language every code listing of that book shows, a code set
   in the text and a debugger figure's code panel alike, Python until they choose another. Any listing's
   button group changes it and every listing of the book follows at once, on every page and in every tab of
   this browser; the book's Theme page shows it too. Kept per book in this browser under one key, holding only
   a choice other than the default, as a JSON string ("java") so the backup reads it as it reads the
   highlights. Plain TypeScript, so the figures' library reads it as the shell does
   (codelang.svelte.ts is the shell's reactive view of it). */
import { readerWritesAllowed } from '../backup/guard';
import { DEFAULT_LISTING_LANG, isListingLang, type ListingLang } from '../code/langs';

export const codeLangKey = (book: string): string => `omnistax-code-lang-${book}`;
export const CODE_LANG_KEY = /^omnistax-code-lang-(.+)$/;
const EVENT = 'omnistax:code-lang';

/* What was stored, read past anything that is not a known language. */
export const parseCodeLang = (raw: string | null): ListingLang | null => {
  if (raw === null) return null;
  try { const v: unknown = JSON.parse(raw); return isListingLang(v) ? v : null; } catch { return null; }
};

const storage = (): Storage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
/* What this tab was told, which stands even where the choice could not be written (a restore holding writes) */
const told = new Map<string, ListingLang>();
/* The book's code language: the reader's choice, else Python. */
export const codeLangOf = (book: string): ListingLang => {
  const got = told.get(book); if (got) return got;
  let raw: string | null = null;
  try { raw = storage()?.getItem(codeLangKey(book)) ?? null; } catch { /* private mode */ }
  return parseCodeLang(raw) ?? DEFAULT_LISTING_LANG;
};

type Listener = (book: string, lang: ListingLang) => void;
const listeners = new Set<Listener>();
const tell = (book: string, lang: ListingLang): void => { told.set(book, lang); listeners.forEach((f) => { try { f(book, lang); } catch (e) { console.error(e); } }); };
let wired = false;
/* Another tab of this browser that changes it reaches this one through the storage event. */
const wire = (): void => {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('storage', (e) => {
    const m = e.key ? CODE_LANG_KEY.exec(e.key) : null;
    if (m) tell(m[1], parseCodeLang(e.newValue) ?? DEFAULT_LISTING_LANG);
  });
  window.addEventListener(EVENT, (e) => { const d = (e as CustomEvent<{ book: string; lang: ListingLang }>).detail; tell(d.book, d.lang); });
};

/* The reader chooses a language for a book; Python, the default, clears the choice. */
export const setCodeLang = (book: string, lang: ListingLang): void => {
  if (!book || !isListingLang(lang)) return;
  if (readerWritesAllowed()) {
    try {
      const s = storage();
      if (lang === DEFAULT_LISTING_LANG) s?.removeItem(codeLangKey(book)); else s?.setItem(codeLangKey(book), JSON.stringify(lang));
    } catch { /* private mode */ }
  }
  wire();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { book, lang } }));
  else tell(book, lang);
};

/* Called with the book and its language whenever a book's changes; returns the way to stop. */
export const onCodeLang = (f: Listener): (() => void) => { wire(); listeners.add(f); return () => { listeners.delete(f); }; };
