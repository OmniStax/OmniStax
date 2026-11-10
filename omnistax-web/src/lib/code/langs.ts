/* The languages a code listing may be shown in (METHOD decision 20 of the CS book): every listing the book
   shows, a code set in the text or a debugger figure's code panel, may carry the same code as the source's
   pseudocode and in Python, Java, C++ and JavaScript, and the reader picks one for the whole book. Where a
   source prints pseudocode and the book also gives code for it, the two are one listing: the pseudocode is
   its first button and what a reader who has chosen nothing sees, and a listing with no pseudocode shows
   them Python. These are the languages shown, not the ones a code exercise runs (`CODE_LANGS` in
   content/schema.ts, Python and JavaScript). Pure: the reader's choice is kept by settings/codelang.ts. */

export const LISTING_LANGS = ['pseudocode', 'python', 'java', 'cpp', 'javascript'] as const;
export type ListingLang = (typeof LISTING_LANGS)[number];
/* what a reader who has chosen nothing is shown, where the listing has it */
export const DEFAULT_LISTING_LANG: ListingLang = 'pseudocode';
/* what a listing shows where it lacks the reader's language, and the language every listing of code has */
export const FALLBACK_LISTING_LANG: ListingLang = 'python';
/* Proper names, the same in every language of the app; pseudocode's label is a word, so i18n gives it (code.pseudocode). */
export const LISTING_LABELS: Readonly<Record<ListingLang, string>> = { pseudocode: 'Pseudocode', python: 'Python', java: 'Java', cpp: 'C++', javascript: 'JavaScript' };

export const isListingLang = (v: unknown): v is ListingLang => typeof v === 'string' && (LISTING_LANGS as readonly string[]).includes(v);
/* The languages given, in the book's order (pseudocode, Python, Java, C++, JavaScript), each once. */
export const inOrder = (langs: Iterable<string>): ListingLang[] => { const s = new Set(langs); return LISTING_LANGS.filter((l) => s.has(l)); };

/* The language a listing shows: the reader's choice (unchosen, the default) where the listing has it, else Python,
   else the first it has. */
export const pickLang = (available: readonly ListingLang[], preferred: ListingLang | null | undefined): ListingLang => {
  const want = preferred ?? DEFAULT_LISTING_LANG;
  if (available.includes(want)) return want;
  if (available.includes(FALLBACK_LISTING_LANG)) return FALLBACK_LISTING_LANG;
  return inOrder(available)[0] ?? FALLBACK_LISTING_LANG;
};

/* A translated variant names what translated it, the way a section's `ai` names a maker: the model's API id
   and, after a space, the effort it ran at, `data-ai="claude-opus-5-5 high"`. */
export const AI_EFFORT_WORDS = ['low', 'medium', 'high', 'max'] as const;
export type MakerSpec = { readonly model: string; readonly effort?: (typeof AI_EFFORT_WORDS)[number] };
export const parseMaker = (s: string): MakerSpec | null => {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  const [model, effort] = parts;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/.test(model)) return null;
  if (effort === undefined) return { model };
  return (AI_EFFORT_WORDS as readonly string[]).includes(effort) ? { model, effort: effort as MakerSpec['effort'] } : null;
};
