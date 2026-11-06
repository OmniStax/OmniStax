/* Speech input for the chat box: the browser's own speech recognition (the
   Web Speech API), its words put into the field as they are heard, never sent
   on their own. What is here is pure: whether it can run, in which language,
   and how what was said joins what was typed. dictation.svelte.ts runs it.

   Chrome, Edge and Safari have it; Firefox does not. The desktop app is
   Chromium without the key Chrome's recognition service asks for, so it has
   the API and fails on start; the button is off there from the start. Chrome
   recognises on Google's servers, so it is off offline too. */

/* The constructor, under either of its names, or null. */
export type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionResultEvent = { readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }> & { readonly isFinal: boolean }> };
export type RecognitionCtor = new () => Recognition;
export const recognitionOf = (w: object | undefined): RecognitionCtor | null => {
  if (!w) return null;
  const o = w as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return o.SpeechRecognition ?? o.webkitSpeechRecognition ?? null;
};

/* Whether the button can be pressed, and if not, why. */
export type Availability = 'ready' | 'unsupported' | 'desktop' | 'offline';
export const availability = (o: { readonly api: boolean; readonly desktop: boolean; readonly online: boolean }): Availability =>
  !o.api ? 'unsupported' : o.desktop ? 'desktop' : !o.online ? 'offline' : 'ready';

/* The languages offered, as BCP 47 tags: the ones Chrome's recognition takes,
   since no browser lists what it can recognise. Their names come from the
   browser in the reader's language (languageName). */
export const DICTATION_LANGS: readonly string[] = [
  'af-ZA', 'am-ET', 'ar-AE', 'ar-EG', 'ar-SA', 'az-AZ', 'bg-BG', 'bn-BD', 'bn-IN', 'ca-ES', 'cs-CZ', 'da-DK',
  'de-AT', 'de-CH', 'de-DE', 'el-GR', 'en-AU', 'en-CA', 'en-GB', 'en-IE', 'en-IN', 'en-NZ', 'en-PH', 'en-SG', 'en-US', 'en-ZA',
  'es-AR', 'es-CL', 'es-CO', 'es-ES', 'es-MX', 'es-PE', 'es-US', 'et-EE', 'eu-ES', 'fa-IR', 'fi-FI', 'fil-PH',
  'fr-BE', 'fr-CA', 'fr-CH', 'fr-FR', 'gl-ES', 'gu-IN', 'he-IL', 'hi-IN', 'hr-HR', 'hu-HU', 'hy-AM', 'id-ID', 'is-IS',
  'it-IT', 'ja-JP', 'jv-ID', 'ka-GE', 'kk-KZ', 'km-KH', 'kn-IN', 'ko-KR', 'lo-LA', 'lt-LT', 'lv-LV', 'mk-MK', 'ml-IN',
  'mn-MN', 'mr-IN', 'ms-MY', 'my-MM', 'nb-NO', 'ne-NP', 'nl-BE', 'nl-NL', 'pa-IN', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO',
  'ru-RU', 'si-LK', 'sk-SK', 'sl-SI', 'sq-AL', 'sr-RS', 'su-ID', 'sv-SE', 'sw-KE', 'sw-TZ', 'ta-IN', 'ta-LK', 'te-IN',
  'th-TH', 'tr-TR', 'uk-UA', 'ur-IN', 'ur-PK', 'uz-UZ', 'vi-VN', 'yue-Hant-HK', 'zh-CN', 'zh-TW', 'zu-ZA',
];
export const isDictationLang = (v: string): boolean => DICTATION_LANGS.includes(v);

/* The language to listen in: the reader's choice, else OmniStax's own. English
   takes the browser's variety of it where that is one (en-GB, en-IN), since
   the accents differ more than the words. */
export const listeningLang = (choice: string, appLocale: string, browserLangs: readonly string[] = []): string => {
  if (choice && isDictationLang(choice)) return choice;
  if (appLocale === 'zh-CN') return 'zh-CN';
  return browserLangs.find((l) => /^en-/i.test(l) && isDictationLang(l)) ?? 'en-US';
};

/* A tag's name in the reader's language: "English (United Kingdom)", "英语（英国）". */
export const languageName = (tag: string, uiLocale: string): string => {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(tag);
    return name && name !== tag ? name : tag;
  } catch { return tag; }
};
/* The offered tags, by their names in the reader's language. */
export const languagesByName = (uiLocale: string): readonly { readonly tag: string; readonly name: string }[] =>
  DICTATION_LANGS.map((tag) => ({ tag, name: languageName(tag, uiLocale) })).sort((a, b) => a.name.localeCompare(b.name, uiLocale));

/* Languages written without spaces between words. */
const UNSPACED = /^(zh|ja|th|lo|km|my|yue)\b/i;
/* What was said, put between what was typed before the cursor and after it:
   a space where the words would otherwise run together, none in a language
   written without them. */
export const joinDictated = (before: string, said: string, after: string, lang: string): string => {
  const words = said.trim();
  if (!words) return before + after;
  const spaced = !UNSPACED.test(lang);
  const lead = spaced && before && !/\s$/.test(before) ? ' ' : '';
  const tail = spaced && after && !/^\s/.test(after) ? ' ' : '';
  return `${before}${lead}${words}${tail}${after}`;
};

/* Everything heard so far in one go: the settled words, then the ones still
   being guessed at. */
export const heardOf = (e: RecognitionResultEvent): string => {
  let out = '';
  for (let i = 0; i < e.results.length; i++) out += e.results[i][0]?.transcript ?? '';
  return out;
};
