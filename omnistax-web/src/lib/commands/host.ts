/* What the browser keeps for itself. A browser tab reserves a handful of chords
   — close the tab, open one, step between them — and never hands them to the
   page, whatever the page asks: Chromium's IsReservedCommandOrKey lists them,
   and Firefox marks its own reserved. Two windows are exempt in Chromium: one
   opened from an installed app, and a full-screen one, where only the key that
   leaves full screen is kept. Firefox keeps its set everywhere. Chords here are
   in the shell's own vocabulary, where Ctrl also means Cmd on a Mac, so the same
   list serves both. */
import { chord, type Chord } from './chord';

export type Browser = 'chromium' | 'firefox' | 'safari' | 'other';
export type Surface = 'tab' | 'app' | 'fullscreen';
export type Host = { readonly browser: Browser; readonly surface: Surface };

const chords = (list: readonly string[]): readonly Chord[] => list.map(chord).filter((c): c is Chord => c !== null);

/* The chords a browser tab keeps, by browser family. */
export const RESERVED: Readonly<Record<Browser, readonly Chord[]>> = {
  chromium: chords(['Ctrl+W', 'Ctrl+F4', 'Ctrl+Shift+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+Shift+N', 'Ctrl+Shift+T', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Ctrl+PageDown', 'Ctrl+PageUp', 'Ctrl+Shift+Q']),
  firefox: chords(['Ctrl+W', 'Ctrl+Shift+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+Shift+P', 'Ctrl+Q', 'Ctrl+Shift+Q', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'F11']),
  safari: chords(['Ctrl+W', 'Ctrl+Shift+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+Shift+N', 'Ctrl+Shift+T', 'Ctrl+Q', 'Ctrl+Tab', 'Ctrl+Shift+Tab']),
  other: [],
};

export const browserOf = (ua: string): Browser =>
  /Firefox\//.test(ua) ? 'firefox' : /Chrom(e|ium)\/|Edg\//.test(ua) ? 'chromium' : /Safari\//.test(ua) && /Version\//.test(ua) ? 'safari' : 'other';

/* Every chord this host keeps from the page: a Chromium tab its list, a Chromium
   app or full-screen window nothing, Firefox its list on every surface. */
export const keptChords = (h: Host): readonly Chord[] =>
  h.browser === 'chromium' && h.surface !== 'tab' ? [] : RESERVED[h.browser];
/* True when a press of `c` never reaches the page on this host. A sequence is
   kept when its first press is. */
export const kept = (h: Host, c: Chord): boolean => {
  const first = c.split(' ')[0] as Chord;
  return keptChords(h).includes(first);
};

export const BROWSER_NAMES: Readonly<Record<Browser, string>> = { chromium: 'Chrome', firefox: 'Firefox', safari: 'Safari', other: 'This browser' };
export const SURFACE_NAMES: Readonly<Record<Surface, string>> = { tab: 'a browser tab', app: 'an installed app', fullscreen: 'full screen' };
/* "Chrome, in a browser tab" */
export const hostName = (h: Host): string => `${BROWSER_NAMES[h.browser]}, in ${SURFACE_NAMES[h.surface]}`;
