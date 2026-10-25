/* Which language, and which text in it. Every piece of reader-facing text
   follows one rule: the reader has one language (locale), each text is held
   per language, and a language that lacks the text falls back to English.
   The catalog's messages (tIn in index.ts) follow it, and so does everything
   kept apart from the catalog: the About introductions, release notes, page
   fragments, /download and the desktop shell. Pure and free of the catalogs,
   so a page that needs only the language (download.astro) imports this alone. */
export const LOCALES = ['en', 'zh-CN'] as const;
export type Locale = typeof LOCALES[number];
/* Each name in its own language, never translated. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', 'zh-CN': '中文（简体）' };
export const DEFAULT_LOCALE: Locale = 'en';

/* A locale of the catalog, by its exact tag, ignoring case (ZH-cn is zh-CN). */
export const parseLocale = (s: string | null | undefined): Locale | null => {
  if (!s) return null;
  const want = s.trim().replace(/_/g, '-').toLowerCase();
  return LOCALES.find((l) => l.toLowerCase() === want) ?? null;
};

/* The language an address is in: /zh-CN/… is Chinese content (a page of the
   site in Chinese, or a Chinese edition of a book); any other address names
   none. Its tag is written exactly, as the site writes it. */
export const localeOfPath = (pathname: string): Locale | null => {
  const first = pathname.split('/').filter(Boolean)[0];
  return LOCALES.find((l) => l !== DEFAULT_LOCALE && l === first) ?? null;
};
/* An address of the site in a language: /download in English, /zh-CN/download in Chinese. */
export const localePath = (path: string, locale: Locale): string => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);

const languageOf = (tag: string): string => tag.trim().replace(/_/g, '-').split('-')[0].toLowerCase();

/* The first of the reader's languages the app has a catalog for: an exact tag,
   else the first catalog of the same language (zh, zh-Hans, zh-TW → zh-CN
   while it is the only Chinese one); else en. */
export const matchLocale = (languages: readonly string[]): Locale => {
  for (const tag of languages) {
    const exact = parseLocale(tag);
    if (exact) return exact;
    const lang = languageOf(tag);
    const same = LOCALES.find((l) => languageOf(l) === lang);
    if (same) return same;
  }
  return DEFAULT_LOCALE;
};

/* The reader's language: the choice they made in the app (omnistax-lang), else
   the language of the address they came in by, else their browser's, else
   English. The app's store (store.svelte.ts) and download.astro both read it so. */
export const readerLocale = (pathname: string, stored: string | null, languages: readonly string[]): Locale =>
  parseLocale(stored) ?? localeOfPath(pathname) ?? matchLocale(languages);

/* A text held per language, English always among them. */
export type ByLocale<T> = { readonly en: T } & Partial<Readonly<Record<Locale, T>>>;
/* The text in this language, else in English. */
export const pick = <T>(texts: ByLocale<T>, locale: Locale): T => texts[locale] ?? texts[DEFAULT_LOCALE];

/* A static fragment in a language: /about.html in English, /about.zh-CN.html in Chinese. */
export const fragmentUrl = (name: string, locale: Locale): string =>
  `/${name}${locale === DEFAULT_LOCALE ? '' : `.${locale}`}.html`;

