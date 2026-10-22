/* The reader's UI language, live. The choice is remembered in this browser
   under omnistax-lang (absent: follow the browser, "system"), and the language
   in force is mirrored into index.ts's current locale so pure modules calling
   t() speak it too. Components write {i18n.t('settings.title')}: t reads
   this.locale, so every template expression that calls it re-renders when the
   language changes. Astro prerenders the shell, so localStorage and navigator
   may be missing here; each read falls back.

   The language in force at boot is, in order: the one the address asks for
   (?lang=zh-CN, which becomes the reader's choice and is taken off the
   address), the reader's remembered choice, the first of the browser's
   languages the app has a catalog for, English. */
import { readerWritesAllowed } from '../backup/guard';
import { type Locale, type MessageKey, type Params, localeOfQuery, matchLocale, parseLocale, setCurrentLocale, tIn } from './index';

export type LocaleChoice = Locale | 'system';
export const LANG_KEY = 'omnistax-lang';

const read = (): string | null => { try { return localStorage.getItem(LANG_KEY); } catch { return null; } };
const write = (v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(LANG_KEY, v); } catch { /* private mode */ } };
const remove = (): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(LANG_KEY); } catch { /* private mode */ } };
const readChoice = (): LocaleChoice => parseLocale(read()) ?? 'system';
/* The browser's languages, most wanted first; none at build time. */
export const browserLanguages = (): readonly string[] => {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
};

class I18n {
  choice = $state<LocaleChoice>(readChoice());
  system = $state<Locale>(matchLocale(browserLanguages()));
  get locale(): Locale { return this.choice === 'system' ? this.system : this.choice; }
  t = (key: MessageKey, params?: Params): string => tIn(this.locale, key, params);
  setChoice(c: LocaleChoice): void {
    this.choice = c;
    if (c === 'system') remove(); else write(c);
    setCurrentLocale(this.locale);
  }
  /* The browser's languages again, after a languagechange. */
  refreshSystem(): void { this.system = matchLocale(browserLanguages()); setCurrentLocale(this.locale); }
  /* Called once by the shell as it mounts, before the commands are said. The
     address's ?lang= wins and is remembered; the rest of the order is what
     the fields above were read with. A page that carries no book (the front
     page, the 404 page) has no content language of its own, so its <html
     lang> is the reader's; a page of a book keeps the book's. Returns the way
     to stop listening. */
  boot(opts: { readonly book: boolean }): () => void {
    if (typeof location !== 'undefined') {
      const { locale, rest } = localeOfQuery(location.search);
      if (locale) {
        this.setChoice(locale);
        try { history.replaceState(history.state, '', `${location.pathname}${rest}${location.hash}`); } catch { /* file:// */ }
      }
    }
    this.refreshSystem();
    const onChange = (): void => this.refreshSystem();
    if (typeof window !== 'undefined') window.addEventListener('languagechange', onChange);
    const stop = opts.book || typeof document === 'undefined' ? () => {} : $effect.root(() => { $effect(() => { document.documentElement.lang = this.locale; }); });
    return () => { if (typeof window !== 'undefined') window.removeEventListener('languagechange', onChange); stop(); };
  }
}
export const i18n = new I18n();

setCurrentLocale(i18n.locale);
$effect.root(() => { $effect(() => { setCurrentLocale(i18n.locale); }); });
