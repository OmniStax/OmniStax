/* The app's own words in the reader's language. Pure: no runes and no DOM, so
   a test or a plain .ts module can import it; the live choice is
   store.svelte.ts, which mirrors itself into setCurrentLocale.

   A message is a template: {name} is replaced by a parameter, and
   {count, plural, one {# chapter} other {# chapters}} picks a branch by
   Intl.PluralRules for the locale (zero, one, two, few, many, other; other is
   required), with # standing for the number. No other ICU syntax. A
   placeholder with no parameter is left as written. */
import { en, type Catalog, type MessageKey } from './en';
import { zhCN } from './zh-CN';

export type { Catalog, MessageKey } from './en';
export { en } from './en';

export const LOCALES = ['en', 'zh-CN'] as const;
export type Locale = typeof LOCALES[number];
/* Each name in its own language, never translated. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', 'zh-CN': '中文（简体）' };
export const DEFAULT_LOCALE: Locale = 'en';
export const CATALOGS: Readonly<Record<Locale, Catalog>> = { en, 'zh-CN': zhCN };

export type Params = Readonly<Record<string, string | number>>;
export type TFn = (key: MessageKey, params?: Params) => string;

/* A locale of the catalog, by its exact tag, ignoring case (ZH-cn is zh-CN). */
export const parseLocale = (s: string | null | undefined): Locale | null => {
  if (!s) return null;
  const want = s.trim().replace(/_/g, '-').toLowerCase();
  return LOCALES.find((l) => l.toLowerCase() === want) ?? null;
};

/* The language an address asks for, ?lang=zh-CN, and the query without it, so
   the address the reader keeps names no language: a link can open the app in
   one once, and the choice is the reader's from then on. An unknown tag is
   ignored and left where it is. */
export const localeOfQuery = (search: string): { readonly locale: Locale | null; readonly rest: string } => {
  const q = new URLSearchParams(search);
  const locale = parseLocale(q.get('lang'));
  if (!locale) return { locale: null, rest: search };
  q.delete('lang');
  const rest = q.toString();
  return { locale, rest: rest ? `?${rest}` : '' };
};

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

/* ---------- templates ---------- */

const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;
type PluralCategory = typeof PLURAL_CATEGORIES[number];
const isCategory = (s: string): s is PluralCategory => (PLURAL_CATEGORIES as readonly string[]).includes(s);

const rules = new Map<string, Intl.PluralRules>();
const pluralRules = (locale: string): Intl.PluralRules => {
  let r = rules.get(locale);
  if (!r) { r = new Intl.PluralRules(locale); rules.set(locale, r); }
  return r;
};

/* The index of the brace that closes the one at `open`, or -1. */
const closing = (s: string, open: number): number => {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return -1;
};

type Branches = ReadonlyMap<PluralCategory, string>;
/* `one {…} other {…}`, or null when it is not that shape. */
const branchesOf = (body: string): Branches | null => {
  const out = new Map<PluralCategory, string>();
  let i = 0;
  while (i < body.length) {
    const m = /^\s*([a-z]+)\s*\{/.exec(body.slice(i));
    if (!m) return /^\s*$/.test(body.slice(i)) ? out : null;
    const cat = m[1];
    const open = i + m[0].length - 1, close = closing(body, open);
    if (!isCategory(cat) || close < 0) return null;
    out.set(cat, body.slice(open + 1, close));
    i = close + 1;
  }
  return out;
};

const PLURAL = /^\s*([A-Za-z_][\w]*)\s*,\s*plural\s*,([\s\S]*)$/;
const NAME = /^\s*([A-Za-z_][\w]*)\s*$/;

const render = (template: string, params: Params, locale: Locale, hash: string | null): string => {
  let out = '';
  for (let i = 0; i < template.length; i++) {
    const c = template[i];
    if (c === '#' && hash !== null) { out += hash; continue; }
    if (c !== '{') { out += c; continue; }
    const close = closing(template, i);
    if (close < 0) { out += template.slice(i); break; }
    const whole = template.slice(i, close + 1), inner = template.slice(i + 1, close);
    i = close;
    const name = NAME.exec(inner);
    if (name) { const v = params[name[1]]; out += v === undefined ? whole : String(v); continue; }
    const plural = PLURAL.exec(inner);
    const branches = plural ? branchesOf(plural[2]) : null;
    const n = plural ? params[plural[1]] : undefined;
    const other = branches?.get('other');
    if (!branches || other === undefined || n === undefined || !Number.isFinite(Number(n))) { out += whole; continue; }
    const num = Number(n);
    const chosen = branches.get(pluralRules(locale).select(num)) ?? other;
    out += render(chosen, params, locale, String(n));
  }
  return out;
};

export const format = (template: string, params: Params, locale: Locale): string => render(template, params, locale, null);

/* What a template asks for: the plain placeholders and, for each plural, its
   categories. Two translations of one message must ask for the same things. */
export type TemplateShape = { readonly names: readonly string[]; readonly plurals: Readonly<Record<string, readonly string[]>> };
export const templateShape = (template: string): TemplateShape => {
  const names = new Set<string>(); const plurals: Record<string, string[]> = {};
  const walk = (t: string): void => {
    for (let i = 0; i < t.length; i++) {
      if (t[i] !== '{') continue;
      const close = closing(t, i);
      if (close < 0) return;
      const inner = t.slice(i + 1, close);
      i = close;
      const name = NAME.exec(inner);
      if (name) { names.add(name[1]); continue; }
      const plural = PLURAL.exec(inner);
      const branches = plural ? branchesOf(plural[2]) : null;
      if (!plural || !branches) continue;
      plurals[plural[1]] = [...branches.keys()].sort();
      branches.forEach(walk);
    }
  };
  walk(template);
  return { names: [...names].sort(), plurals };
};

/* ---------- lookup ---------- */

/* The message in this locale, else in English, else the key itself. */
export const tIn = (locale: Locale, key: MessageKey, params: Params = {}): string => {
  const template = CATALOGS[locale]?.[key] ?? en[key] ?? key;
  return format(template, params, locale);
};

/* The language pure modules speak in: the store sets it, tests may too. */
let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<(l: Locale) => void>();
export const currentLocale = (): Locale => current;
export const setCurrentLocale = (l: Locale): void => {
  if (l === current) return;
  current = l;
  listeners.forEach((cb) => cb(l));
};
/* Called on every change of the current locale; returns the way to stop. */
export const onLocaleChange = (cb: (l: Locale) => void): (() => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export const t: TFn = (key, params) => tIn(current, key, params);
