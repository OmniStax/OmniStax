/* The colours of the book's quantities, as a plain immutable value. Colour is a
   function of type: the book declares its types and says nothing about their
   hues, and the app dresses them from a scheme — the first published palette
   that can dress every one of them, and the ring when none can. What the reader
   chooses stands over that scheme. They choose two things: the order the
   quantities stand in, which is what every palette lays its hues along, and a
   colour at a place — the whole book, one chapter, or one section — which
   reaches every lower place that has not chosen its own, so nothing is ever
   copied downwards and clearing a setting simply hands the type back to the
   tier above.

   Everything here is pure: the store applies these functions, saves the result
   and writes the stylesheet they build. */
import { z } from 'zod';
import type { BookManifest } from '../content/schema';
import { type BookId, type ChapterId, type SectionId, chapterId } from '../types/ids';
import type { Target } from '../sections/scope';
import { type Palette, type PaletteId, huesOf, schemePalette } from './palettes';

export type Hex = string;                          /* '#RRGGBB', normalised by normHex */
export type Hue = { readonly light: Hex; readonly dark: Hex };
export type TypeKey = string;                      /* a key of manifest.types */

/* Where a colour is set: the tier and the place. This mirrors Target in
   sections/scope.ts, with the chapter a section lies in written down as well,
   since a section's rule is scoped by its chapter's directory. */
export type Place =
  | { readonly level: 'book' }
  | { readonly level: 'chapter'; readonly chapter: ChapterId }
  | { readonly level: 'section'; readonly chapter: ChapterId; readonly section: SectionId };

/* A section id names its chapter: "16.3" lies in chapter 16. */
const chapterOfSection = (s: SectionId): ChapterId => chapterId(String(s).split('.')[0]);
export const placeOf = (t: Target): Place =>
  t.level === 'section' ? { level: 'section', chapter: chapterOfSection(t.section), section: t.section } : t;
export const placeKey = (p: Place): string =>
  p.level === 'book' ? 'book' : p.level === 'chapter' ? `chapter:${p.chapter}` : `section:${p.section}`;
export const samePlace = (a: Place, b: Place): boolean => placeKey(a) === placeKey(b);

export type Overrides = {
  readonly book: Readonly<Record<TypeKey, Hue>>;
  readonly chapters: Readonly<Record<string /* ChapterId */, Readonly<Record<TypeKey, Hue>>>>;
  readonly sections: Readonly<Record<string /* SectionId */, Readonly<Record<TypeKey, Hue>>>>;
};
const EMPTY: Overrides = { book: {}, chapters: {}, sections: {} };

/* What the reader has chosen: the order the quantities stand in and the colours
   set at each place. The order is one list for the whole book, since a palette
   lays its hues along it and a quantity that moves should move everywhere. */
export type Choices = { readonly order: readonly TypeKey[]; readonly overrides: Overrides };
export const NO_CHOICES: Choices = { order: [], overrides: EMPTY };

/* ---------- colour arithmetic ---------- */

const HEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const isHex = (s: string): boolean => typeof s === 'string' && HEX.test(s.trim());
/* '#abc' and 'abc' both mean '#AABBCC'. Anything that is not a colour comes back
   black, so a caller that has not asked isHex first still gets a usable value. */
export const normHex = (s: string): Hex => {
  const m = typeof s === 'string' ? HEX.exec(s.trim()) : null;
  if (!m) return '#000000';
  const d = m[1].toUpperCase();
  return '#' + (d.length === 3 ? d.split('').map((c) => c + c).join('') : d);
};

type Hsl = { readonly h: number; readonly s: number; readonly l: number };   /* h in turns, s and l in 0..1 */
const toHsl = (hex: Hex): Hsl => {
  const d = normHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(d.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), span = max - min, l = (max + min) / 2;
  if (span === 0) return { h: 0, s: 0, l };
  const s = span / (l > 0.5 ? 2 - max - min : max + min);
  const h = max === r ? ((g - b) / span + (g < b ? 6 : 0)) : max === g ? (b - r) / span + 2 : (r - g) / span + 4;
  return { h: h / 6, s, l };
};
const channel = (p: number, q: number, t0: number): number => {
  const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};
const toHex = ({ h, s, l }: Hsl): Hex => {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const at = (t: number) => Math.round(255 * (s === 0 ? l : channel(p, q, t)));
  return normHex('#' + [at(h + 1 / 3), at(h), at(h - 1 / 3)].map((v) => v.toString(16).padStart(2, '0')).join(''));
};

/* A dark ground wants the same hue carried higher, and a light ground wants it
   deeper; the saturation is the reader's choice and stays where they left it. */
export const DARK_L = 0.7;
export const LIGHT_L = 0.42;
export const darkOf = (light: Hex): Hex => toHex({ ...toHsl(light), l: DARK_L });
export const lightOf = (dark: Hex): Hex => toHex({ ...toHsl(dark), l: LIGHT_L });
/* One colour picked while one theme is shown fills that theme's slot. The other
   slot is whatever the reader had already chosen for this same type and place,
   and otherwise the same hue carried across to the other ground. */
export const hueFrom = (picked: Hex, dark: boolean, keep: Hue | null): Hue => {
  const p = normHex(picked);
  return dark ? { light: keep ? normHex(keep.light) : lightOf(p), dark: p } : { light: p, dark: keep ? normHex(keep.dark) : darkOf(p) };
};
const normHue = (h: Hue): Hue => ({ light: normHex(h.light), dark: normHex(h.dark) });

/* ---------- hues worked out rather than published ---------- */

/* Two of the palettes are not lists at all but generators, so that a level with
   any number of quantities still gets exactly that many colours. They belong
   here with the rest of the colour arithmetic, and like everything here they are
   pure: the same count always gives the same hues, in the same order. */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const byte = (x: number): string => Math.round(255 * clamp01(x)).toString(16).padStart(2, '0');
const rgbHex = (r: number, g: number, b: number): Hex => normHex('#' + byte(r) + byte(g) + byte(b));

/* Linear light to the sRGB a screen is asked for. */
const encodeSrgb = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

/* n hues evenly spaced round the OKLCH hue circle, all at one lightness and one
   chroma, so that they differ in hue alone and none of them shouts over the
   rest. The ring starts at 25°, which puts a warm colour first, the way the
   published sets do. The conversion is Björn Ottosson's OKLab, and a hue that
   falls outside what a screen can show is simply clipped, since at this
   lightness and chroma the ring is very nearly in gamut all the way round. */
export const oklchRing = (n: number, l = 0.55, c = 0.14): Hex[] =>
  n < 1 ? [] : Array.from({ length: n }, (_, i) => {
    const h = ((25 + (360 * i) / n) * Math.PI) / 180;
    const a = c * Math.cos(h), b = c * Math.sin(h);
    const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const sc = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return rgbHex(
      encodeSrgb(clamp01(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc)),
      encodeSrgb(clamp01(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc)),
      encodeSrgb(clamp01(-0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc)),
    );
  });

/* D3's interpolateRainbow, sampled n times. The samples are taken at i / n
   rather than i / (n − 1) because the rainbow is cyclic: were the last sample
   taken at 1 it would be the same colour as the first. The curve is a cubehelix
   whose saturation and lightness fall away from the middle, and the cubehelix to
   RGB step is the one d3-color writes. */
export const d3Rainbow = (n: number): Hex[] =>
  n < 1 ? [] : Array.from({ length: n }, (_, i) => {
    const t = i / n, ts = Math.abs(t - 0.5);
    const s = 1.5 - 1.5 * ts, l = 0.8 - 0.9 * ts;
    const h = ((360 * t - 100 + 120) * Math.PI) / 180;
    const a = s * l * (1 - l), cos = Math.cos(h), sin = Math.sin(h);
    return rgbHex(
      l + a * (-0.14861 * cos + 1.78277 * sin),
      l + a * (-0.29227 * cos - 0.90649 * sin),
      l + a * (1.97294 * cos),
    );
  });

/* ---------- the value ---------- */

const isEmptyRecord = (r: Readonly<Record<string, unknown>>): boolean => Object.keys(r).length === 0;
const noOverrides = (o: Overrides): boolean =>
  isEmptyRecord(o.book) && Object.values(o.chapters).every(isEmptyRecord) && Object.values(o.sections).every(isEmptyRecord);
/* Whether the reader has chosen anything at all, which is what the store asks
   before it writes: a book they have left alone is stored as nothing. */
export const isEmpty = (c: Choices): boolean => c.order.length === 0 && noOverrides(c.overrides);

/* The boundary with the file, where anything may come back. A type whose colour
   does not read as a pair of hexes is left out, and so is everything above it
   that then holds nothing. */
const parseHues = (raw: unknown): Record<TypeKey, Hue> => {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([k, v]) => {
    if (typeof v !== 'object' || v === null) return [];
    const h = v as { light?: unknown; dark?: unknown };
    if (typeof h.light !== 'string' || typeof h.dark !== 'string' || !isHex(h.light) || !isHex(h.dark)) return [];
    return [[k, { light: normHex(h.light), dark: normHex(h.dark) }] as const];
  }));
};
const parseTable = (raw: unknown): Record<string, Readonly<Record<TypeKey, Hue>>> => {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([k, v]) => {
    const hues = parseHues(v);
    return k !== '' && !isEmptyRecord(hues) ? [[k, hues] as const] : [];
  }));
};
const parseOverrides = (raw: unknown): Overrides => {
  if (typeof raw !== 'object' || raw === null) return EMPTY;
  const o = raw as { book?: unknown; chapters?: unknown; sections?: unknown };
  return { book: parseHues(o.book), chapters: parseTable(o.chapters), sections: parseTable(o.sections) };
};

const at = (o: Overrides, p: Place): Readonly<Record<TypeKey, Hue>> =>
  p.level === 'book' ? o.book : p.level === 'chapter' ? o.chapters[p.chapter] ?? {} : o.sections[p.section] ?? {};

/* A table with one place rewritten, and the place dropped altogether once it
   holds nothing, so that an emptied chapter leaves no trace behind it. */
const withPlace = (o: Overrides, p: Place, hues: Readonly<Record<TypeKey, Hue>>): Overrides => {
  if (p.level === 'book') return { ...o, book: hues };
  const key = p.level === 'chapter' ? String(p.chapter) : String(p.section);
  const table = { ...(p.level === 'chapter' ? o.chapters : o.sections) };
  if (isEmptyRecord(hues)) delete table[key]; else table[key] = hues;
  return p.level === 'chapter' ? { ...o, chapters: table } : { ...o, sections: table };
};

/* What the reader set at exactly this place, and nothing from any tier above it. */
export const ownHue = (o: Overrides, type: TypeKey, place: Place): Hue | null => at(o, place)[type] ?? null;

/* The reader's choices with their overrides rewritten. An operation that changes
   nothing hands back the very value it was given, so the store can tell a real
   edit from a gesture that came to nothing. */
const overriding = (c: Choices, o: Overrides): Choices => (o === c.overrides ? c : { ...c, overrides: o });

export const setHue = (c: Choices, place: Place, type: TypeKey, hue: Hue): Choices =>
  overriding(c, withPlace(c.overrides, place, { ...at(c.overrides, place), [type]: normHue(hue) }));
export const clearHue = (c: Choices, place: Place, type: TypeKey): Choices => {
  const hues = { ...at(c.overrides, place) };
  if (!(type in hues)) return c;
  delete hues[type];
  return overriding(c, withPlace(c.overrides, place, hues));
};
/* Every type at that one place, handed back to the tier above in one step. */
export const clearPlace = (c: Choices, place: Place): Choices =>
  isEmptyRecord(at(c.overrides, place)) ? c : overriding(c, withPlace(c.overrides, place, {}));

/* A palette dressed onto the types in the order they are given, each type taking
   the next hue, so no two of them come out the same. A palette with fewer hues
   than there are types cannot say what the rest would be, and is refused. */
export const applyPalette = (c: Choices, place: Place, types: readonly TypeKey[], hues: readonly Hex[]): Choices | null => {
  if (types.length > hues.length) return null;
  const chosen = Object.fromEntries(types.map((t, i) => [t, { light: normHex(hues[i]), dark: darkOf(hues[i]) }] as const));
  return overriding(c, withPlace(c.overrides, place, { ...at(c.overrides, place), ...chosen }));
};

/* ---------- the order, and the scheme that follows it ---------- */

const chapterEntry = (m: BookManifest, chapter: ChapterId) => m.chapters.find((c) => c.id === String(chapter));

/* The quantities in the reader's order: the ones they have placed, in the order
   they placed them, and then every type the book declares that they have not
   touched, in the order the book declares them. A key the book no longer has is
   dropped, so a colour file from an older printing still reads. */
export const orderOf = (m: BookManifest, c: Choices): readonly TypeKey[] => {
  const declared = Object.keys(m.types);
  const placed = c.order.filter((k) => k in m.types);
  const seen = new Set(placed);
  return [...placed, ...declared.filter((k) => !seen.has(k))];
};

/* One quantity moved before another, or to the end when nothing follows it. The
   result carries the whole order rather than the part the reader touched, so
   what they see is what is kept and a later move starts from it. A move that
   leaves the order as it was hands back the very value it was given. */
export const moveType = (m: BookManifest, c: Choices, type: TypeKey, before: TypeKey | null): Choices => {
  const order = orderOf(m, c);
  if (type === before || !order.includes(type)) return c;
  const rest = order.filter((k) => k !== type);
  const to = before === null ? rest.length : rest.indexOf(before);
  if (to < 0) return c;
  const next = [...rest.slice(0, to), type, ...rest.slice(to)];
  return next.every((k, i) => k === order[i]) ? c : { ...c, order: next };
};

/* The palette the book wears before the reader touches anything, and the hues it
   gives each quantity. The palette is chosen for how many quantities the book
   has, and its hues are laid along the reader's order, so the first quantity
   takes the first hue and a quantity dragged upwards takes the hue above it. */
export type Scheme = { readonly palette: Palette; readonly hues: Readonly<Record<TypeKey, Hue>> };
export const schemeOf = (m: BookManifest, c: Choices): Scheme => {
  const order = orderOf(m, c);
  const palette = schemePalette(order.length);
  const hues = huesOf(palette, order.length) ?? [];
  return { palette, hues: Object.fromEntries(order.map((k, i) => [k, { light: normHex(hues[i]), dark: darkOf(hues[i]) }] as const)) };
};

/* Where the colour a place shows came from: one of the three tiers the reader
   sets, the scheme the book wears under them, or nothing at all. */
export type Source =
  | { readonly kind: 'section'; readonly section: SectionId }
  | { readonly kind: 'chapter'; readonly chapter: ChapterId }
  | { readonly kind: 'book' }
  | { readonly kind: 'scheme'; readonly palette: PaletteId }
  | { readonly kind: 'none' };

/* The colour that shows at a place and where it came from: the place's own
   setting, else the chapter's, else the book's, else the scheme. Every type the
   book declares has a scheme hue, so nothing at all is left only for a key the
   manifest does not know. */
export const effectiveHue = (m: BookManifest, c: Choices, type: TypeKey, place: Place): { readonly hue: Hue | null; readonly from: Source } => {
  const o = c.overrides;
  if (place.level === 'section') {
    const own = ownHue(o, type, place);
    if (own) return { hue: own, from: { kind: 'section', section: place.section } };
  }
  if (place.level !== 'book') {
    const own = ownHue(o, type, { level: 'chapter', chapter: place.chapter });
    if (own) return { hue: own, from: { kind: 'chapter', chapter: place.chapter } };
  }
  const book = ownHue(o, type, { level: 'book' });
  if (book) return { hue: book, from: { kind: 'book' } };
  const scheme = schemeOf(m, c);
  const dressed = scheme.hues[type];
  return dressed ? { hue: dressed, from: { kind: 'scheme', palette: scheme.palette.id } } : { hue: null, from: { kind: 'none' } };
};

/* The types a place shows, in the reader's order. The book shows every type it
   declares. A chapter shows what its built sections colour between them. A
   section shows what its page binds, and a page that binds nothing colours
   every type. */
export const typesAt = (m: BookManifest, c: Choices, place: Place): readonly TypeKey[] => {
  const all = orderOf(m, c);
  if (place.level === 'book') return all;
  const ch = chapterEntry(m, place.chapter);
  if (place.level === 'section') {
    const binds = ch?.sections.find((s) => s.id === String(place.section))?.binds ?? [];
    return binds.length === 0 ? all : all.filter((k) => binds.includes(k));
  }
  const built = (ch?.sections ?? []).filter((s) => s.built);
  if (built.some((s) => s.binds.length === 0)) return all;
  const shown = new Set<TypeKey>(built.flatMap((s) => s.binds));
  return all.filter((k) => shown.has(k));
};

/* The symbols a type carries, as the book's macros write them: a macro that
   marks its body with the type's class is one of that type's symbols. The names
   come back in the order the book declares them, and the surface renders each
   name as TeX. */
export const symbolsOf = (m: BookManifest, type: TypeKey): readonly string[] => {
  const mark = new RegExp(`kv-${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
  return Object.entries(m.macros).flatMap(([name, body]) => (mark.test(body) ? [name] : []));
};

/* ---------- the stylesheet ---------- */

const varsOf = (order: readonly TypeKey[], hues: Readonly<Record<TypeKey, Hue>>, mode: 'light' | 'dark'): string => {
  const keys = Object.keys(hues).sort((a, b) => (order.indexOf(a) + 1 || Infinity) - (order.indexOf(b) + 1 || Infinity));
  return keys.map((k) => `--c-${k}:${hues[k][mode]}`).join(';');
};

/* One block of the sheet: the scheme on the root, then the reader's book
   overrides on the root after it, so that theirs win without either rule having
   to be marked important; then each chapter's, then each section's. The chapter
   selector is the one ShellPage writes, so a reader's chapter colour lands
   exactly where the scheme's does; a section names its chapter as well, and the
   two attributes together outrank the chapter's rule. */
const blockOf = (m: BookManifest, c: Choices, scheme: Scheme, mode: 'light' | 'dark', root: string, prefix: string): string => {
  const order = orderOf(m, c);
  const o = c.overrides;
  const rule = (sel: string, hues: Readonly<Record<TypeKey, Hue>>): string => {
    const vars = varsOf(order, hues, mode);
    return vars ? `${sel}{${vars}}` : '';
  };
  const both = (tail: string): string => `${prefix}${tail},${prefix} ${tail}`;
  const chapters = m.chapters.map((ch) => rule(both(`[data-chapter="${ch.dir}"]`), o.chapters[ch.id] ?? {})).join('');
  const sections = m.chapters.flatMap((ch) => ch.sections.map((sec) => rule(both(`[data-chapter="${ch.dir}"][data-sec="${sec.id}"]`), o.sections[sec.id] ?? {}))).join('');
  return rule(root, scheme.hues) + rule(root, o.book) + chapters + sections;
};

/* The whole sheet: the one the page is built with, and the one the store hangs
   in the head over it. Dark comes in the three states the theme comes in —
   light, the system's dark, and dark asked for — so a colour follows the theme
   the way everything else does. The scheme is always there, so the sheet is
   never empty. */
export const cssFor = (m: BookManifest, c: Choices): string => {
  const scheme = schemeOf(m, c);
  const dark = ':root:not([data-theme="light"])';
  const guarded = blockOf(m, c, scheme, 'dark', dark, dark);
  return [
    blockOf(m, c, scheme, 'light', ':root', ''),
    guarded ? `@media (prefers-color-scheme: dark){${guarded}}` : '',
    blockOf(m, c, scheme, 'dark', ':root[data-theme="dark"]', ':root[data-theme="dark"]'),
  ].join('');
};

/* ---------- the file, which is also what storage holds ---------- */

/* What the reader exports and what this browser remembers are the same
   document, so one schema parses both. The envelope says what the file is and
   which book it belongs to; inside it, anything that does not read as a colour
   is simply left out, since a file may have been edited by hand. */
export const zColourFile = z.object({
  format: z.literal('omnistax-colours'),
  version: z.literal(1),
  book: z.string(),
  order: z.array(z.string()).default([]),
  overrides: z.unknown().transform(parseOverrides),
});
export type ColourFileDTO = z.infer<typeof zColourFile>;

export const toFile = (book: BookId, c: Choices): ColourFileDTO =>
  ({ format: 'omnistax-colours', version: 1, book, order: [...c.order], overrides: c.overrides });

/* A file read back. It is refused when it is not a colour file at all — which is
   what storage written before the envelope existed reads as, so an older
   browser simply starts afresh — and when it belongs to another book, since a
   quantity of one book means nothing in another. */
export const fromFile = (raw: unknown, book: BookId): { readonly ok: true; readonly choices: Choices } | { readonly ok: false; readonly reason: 'not-colours' | 'other-book' } => {
  const read = zColourFile.safeParse(raw);
  if (!read.success) return { ok: false, reason: 'not-colours' };
  if (read.data.book !== book) return { ok: false, reason: 'other-book' };
  return { ok: true, choices: { order: read.data.order, overrides: read.data.overrides } };
};
