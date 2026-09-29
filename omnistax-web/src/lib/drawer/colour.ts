/* The colour a drawing keeps. It is a palette token — `ink`, `accent`, a
   book's `c-force` — or a hex the reader chose for themselves, and a token is
   only turned into a colour when something is painted, so ink drawn white on
   the dark theme reads black on the light one. */

export type Colour = string;
export type Paint = (c: Colour) => string;

export const INK_TOKENS = ['ink', 'accent', 'warm', 'ok', 'bad', 'muted'] as const;
export type InkToken = (typeof INK_TOKENS)[number];
export const DEFAULT_COLOUR: Colour = 'ink';

/* The values `global.css` gives the ink tokens in each theme, which is how a
   hex stored by an older build is known for the token it was read off. The
   accent and the warm colour follow the book's position and time colours, so
   only their fallbacks can be recognised. */
export const THEMES: Readonly<Record<'light' | 'dark', Readonly<Record<InkToken, string>>>> = {
  light: { ink: '#1b1f27', accent: '#1d4ed8', warm: '#b45309', ok: '#15803d', bad: '#b91c1c', muted: '#5d6470' },
  dark: { ink: '#e7e9ee', accent: '#1d4ed8', warm: '#b45309', ok: '#4ade80', bad: '#f87171', muted: '#9aa2af' },
};
/* What the first build painted with before the theme had been read. */
const OLD_FALLBACK = '#111111';

const TOKEN = /^[a-z][a-z0-9-]*$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const isToken = (c: Colour): boolean => TOKEN.test(c);
export const cssOf = (c: Colour): string => (isToken(c) ? `var(--${c})` : c);

const tokenOfHex = (hex: string): InkToken | null => {
  const h = hex.toLowerCase();
  if (h === OLD_FALLBACK) return 'ink';
  return INK_TOKENS.find((t) => THEMES.light[t] === h) ?? INK_TOKENS.find((t) => THEMES.dark[t] === h) ?? null;
};

/* A colour as it is read back: a token stays a token, a hex equal to a token's
   value in either theme becomes that token, any other hex stays itself, and
   anything else is ink. */
export const readColour = (raw: unknown): Colour => {
  const c = typeof raw === 'string' ? raw.trim() : '';
  if (isToken(c)) return c;
  if (HEX.test(c)) return tokenOfHex(c) ?? c.toLowerCase();
  return DEFAULT_COLOUR;
};

/* A paint that reads tokens off an element's computed style, remembering each
   answer until it is thrown away, which the tab does when the theme turns. */
export const paintFrom = (el: Element | null, fallback: Readonly<Record<InkToken, string>> = THEMES.light): Paint => {
  const seen = new Map<Colour, string>();
  const style = el && typeof getComputedStyle !== 'undefined' ? getComputedStyle(el) : null;
  return (c) => {
    if (!isToken(c)) return c;
    const had = seen.get(c);
    if (had) return had;
    const v = style?.getPropertyValue(`--${c}`).trim() || (fallback as Record<string, string>)[c] || fallback.muted;
    seen.set(c, v);
    return v;
  };
};

/* Paper: a thumbnail is a picture of a page, so its tokens are the light
   theme's whatever the reader is in. */
export const paperPaint = (el: Element | null): Paint => {
  const live = paintFrom(el);
  return (c) => (isToken(c) ? (THEMES.light as Record<string, string>)[c] ?? live(c) : c);
};
