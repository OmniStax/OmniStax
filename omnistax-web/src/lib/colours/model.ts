/* The colours of the book's quantities, as a plain immutable value. Colour is a
   function of type: the book declares its types, and the app dresses them from
   a scheme — the default the book stores (book.json `colours`), and the
   palette it was taken from laid along the order for any type it does not cover. What the reader
   chooses stands over that scheme, for the whole book: the order the
   quantities stand in, which is what every palette lays its hues along, and a
   colour for a type, which clearing hands back to the scheme.

   Everything here is pure: the store applies these functions, saves the result
   and writes the stylesheet they build. */
import { z } from 'zod';
import type { BookManifest, RefGroupEntry, SectionEntry } from '../content/schema';
import { pagesOf } from '../content/roles';
import type { BookId } from '../types/ids';
import { type Palette, type PaletteId, DEFAULT_VISION, FAMILIES, paletteById, paletteId, pairsOf } from './palettes';
import { type Vision, INKS, isVision } from './oklab';
import {
  type DealtGroup, type GroupWeight, type PaletteOrder, type RefHues, type RefMode, type RefSettings, DEFAULT_REFERENTS, TARGET_DEFAULT, clashOrder, dealGroup, huesOfGroups,
  inPaletteOrder, isPaletteOrder, isRefMode, referentHues, sameOrder,
} from './referents';
import { type CountKey, fixedHueOf, isCategoryKey } from './counts';

export type Hex = string;                          /* '#RRGGBB', normalised by normHex */
export type Hue = { readonly light: Hex; readonly dark: Hex };
export type TypeKey = string;                      /* a key of manifest.types */

/* The colours the reader set, one per type. */
export type Overrides = Readonly<Record<TypeKey, Hue>>;
/* The palette the reader last laid over the types and how, which the page marks as in use. */
export type Categories = { readonly palette: PaletteId; readonly mode: RefMode };

/* What the reader has chosen: the order the quantities stand in, the colours
   they set, the vision, the palette they applied and the referent settings. */
export type Choices = { readonly order: readonly TypeKey[]; readonly overrides: Overrides; readonly vision?: Vision; readonly categories?: Categories; readonly referents?: RefSettings };
export const NO_CHOICES: Choices = { order: [], overrides: {} };

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
   slot is whatever the reader had already chosen for this same type,
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
/* Whether the reader has chosen anything at all, which is what the store asks
   before it writes: a book they have left alone is stored as nothing. */
export const isEmpty = (c: Choices): boolean =>
  c.order.length === 0 && isEmptyRecord(c.overrides) && c.vision === undefined && c.categories === undefined && c.referents === undefined;

/* The boundary with the file, where anything may come back. A type whose colour
   does not read as a pair of hexes is left out. The file keeps the colours under
   `overrides.book`, where the app has always written them; the chapter and section
   tables older files carry beside it are no longer read. */
const parseHues = (raw: unknown): Record<TypeKey, Hue> => {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([k, v]) => {
    if (typeof v !== 'object' || v === null) return [];
    const h = v as { light?: unknown; dark?: unknown };
    if (typeof h.light !== 'string' || typeof h.dark !== 'string' || !isHex(h.light) || !isHex(h.dark)) return [];
    return [[k, { light: normHex(h.light), dark: normHex(h.dark) }] as const];
  }));
};
const parseOverrides = (raw: unknown): Overrides =>
  typeof raw === 'object' && raw !== null ? parseHues((raw as { book?: unknown }).book) : {};

/* What the reader set for a type, and nothing of the scheme. */
export const ownHue = (c: Choices, type: TypeKey): Hue | null => c.overrides[type] ?? null;

export const setHue = (c: Choices, type: TypeKey, hue: Hue): Choices => ({ ...c, overrides: { ...c.overrides, [type]: normHue(hue) } });
/* An operation that changes nothing hands back the very value it was given, so
   the store can tell a real edit from a gesture that came to nothing. */
export const clearHue = (c: Choices, type: TypeKey): Choices => {
  if (!(type in c.overrides)) return c;
  const { [type]: _, ...rest } = c.overrides;
  return { ...c, overrides: rest };
};

/* Hues laid onto the types in the order they are given, each type taking the
   next, so no two of them come out the same. Fewer hues than types cannot say
   what the rest would be, and are refused. */
export const applyHues = (c: Choices, types: readonly TypeKey[], hues: readonly Hue[]): Choices | null => {
  if (types.length > hues.length) return null;
  const chosen = Object.fromEntries(types.map((t, i) => [t, normHue(hues[i])] as const));
  return { ...c, overrides: { ...c.overrides, ...chosen } };
};

/* The palette the reader laid over the types, and how; the book's own until they do. */
export const setCategories = (c: Choices, categories: Categories | undefined): Choices => {
  if (c.categories?.palette === categories?.palette && c.categories?.mode === categories?.mode) return c;
  const { categories: _, ...rest } = c;
  return categories ? { ...rest, categories } : rest;
};
const parseCategories = (raw: unknown): Categories | undefined => {
  const r = raw as { palette?: unknown; mode?: unknown } | null;
  return r && typeof r === 'object' && typeof r.palette === 'string' && r.palette !== '' && isRefMode(r.mode) ? { palette: r.palette as PaletteId, mode: r.mode } : undefined;
};

/* The vision the reader has said they read with, else the one the book's
   default was worked out for. */
export const visionOf = (m: Pick<BookManifest, 'colours'>, c: Choices): Vision => c.vision ?? m.colours?.vision ?? DEFAULT_VISION;
export const setVision = (c: Choices, vision: Vision | undefined): Choices => {
  if (c.vision === vision) return c;
  const { vision: _, ...rest } = c;
  return vision === undefined ? rest : { ...rest, vision };
};

/* The referent palette, how a group deals it and, smart, the order it is walked in, the
   default until the reader chooses; a setting equal to the default is stored as nothing. In order keeps no order. */
export const referentsOf = (c: Choices): RefSettings => c.referents ?? DEFAULT_REFERENTS;
const sameReferents = (a: RefSettings, b: RefSettings): boolean =>
  a.palette === b.palette && a.mode === b.mode && sameOrder(a.order, b.order);
export const setReferents = (c: Choices, next: RefSettings): Choices => {
  const kept: RefSettings = {
    palette: next.palette, mode: next.mode,
    ...(next.mode === 'smart' && next.order ? { order: [...next.order] } : {}),
  };
  if (sameReferents(referentsOf(c), kept)) return c;
  const { referents: _, ...rest } = c;
  return sameReferents(kept, DEFAULT_REFERENTS) ? rest : { ...rest, referents: kept };
};
const parseReferents = (raw: unknown): RefSettings | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { palette?: unknown; mode?: unknown; order?: unknown };
  const order = r.mode === 'smart' && isPaletteOrder(r.order) ? { order: r.order } : {};
  return typeof r.palette === 'string' && r.palette !== '' && isRefMode(r.mode) ? { palette: r.palette as PaletteId, mode: r.mode, ...order } : undefined;
};

/* ---------- the order, and the scheme that follows it ---------- */

/* The quantities in the reader's order: the ones they have placed, in the order
   they placed them, and then every type the book declares that they have not
   touched, in the order the book declares them. A key the book no longer has is
   dropped, so a colour file from an older printing still reads. */
export const orderOf = (m: Pick<BookManifest, 'types'>, c: Choices): readonly TypeKey[] => {
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

/* The colours the book wears before the reader touches anything. A type the
   book's stored default names wears the colour stored for it; every other type
   takes, in the reader's order, the next colour of the stored default's palette
   that no stored type wears, for the vision the default was worked out for. A
   book that stores no default is the hue-families palette laid along the order. */
export type Scheme = { readonly palette: Palette; readonly hues: Readonly<Record<TypeKey, Hue>> };
export const schemeOf = (m: Pick<BookManifest, 'types' | 'colours'>, c: Choices): Scheme => {
  const order = orderOf(m, c);
  const stored = m.colours?.assign ?? {};
  const kept = order.filter((k) => k in stored);
  const rest = order.filter((k) => !(k in stored));
  const worn = new Set(kept.map((k) => normHex(stored[k].light)));
  const own = m.colours ? paletteById(paletteId(m.colours.palette)) : null;
  const palette = own?.kind === 'variable' ? own : FAMILIES;
  const spare = (pairsOf(palette, order.length + kept.length, m.colours?.vision ?? DEFAULT_VISION) ?? []).filter((h) => !worn.has(normHex(h.light)));
  return {
    palette,
    hues: Object.fromEntries([
      ...kept.map((k) => [k, normHue(stored[k])] as const),
      ...rest.map((k, i) => [k, normHue(spare[i])] as const),
    ]),
  };
};

/* Where the colour a type shows came from: the reader, the scheme the book
   wears under their choices, or nothing at all. */
export type Source =
  | { readonly kind: 'own' }
  | { readonly kind: 'scheme'; readonly palette: PaletteId }
  | { readonly kind: 'none' };

/* The colour a type shows and where it came from: the reader's own, else the
   scheme's. Every type the book declares has a scheme hue, so nothing at all is
   left only for a key the manifest does not know. */
export const effectiveHue = (m: Pick<BookManifest, 'types' | 'colours'>, c: Choices, type: TypeKey, scheme: Scheme = schemeOf(m, c)): { readonly hue: Hue | null; readonly from: Source } => {
  const own = ownHue(c, type);
  if (own) return { hue: own, from: { kind: 'own' } };
  const dressed = scheme.hues[type];
  return dressed ? { hue: dressed, from: { kind: 'scheme', palette: scheme.palette.id } } : { hue: null, from: { kind: 'none' } };
};

/* The symbols a type carries, as the book's macros write them: a macro that
   marks its body with the type's class is one of that type's symbols. The names
   come back in the order the book declares them, and the surface renders each
   name as TeX. */
export const symbolsOf = (m: BookManifest, type: TypeKey): readonly string[] => {
  const mark = new RegExp(`kv-${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
  return Object.entries(m.macros).flatMap(([name, body]) => (mark.test(body) ? [name] : []));
};

/* A quantity of a large book carries a dozen symbols or more, and a row that prints
   every one of them is a row the reader cannot read. How many stand on the line, then,
   is measured: the symbols' own widths in the order they are declared, the room the
   row gives them, and the room the ellipsis wants where some are left behind. One
   symbol always stands, however narrow the row, so that the line is never only an
   ellipsis. Pure, so that what the row draws is decided away from the DOM. */
export const fitCount = (widths: readonly number[], room: number, ellipsis: number, gap = 0): number => {
  const span = (n: number): number => widths.slice(0, n).reduce((a, w) => a + w, 0) + Math.max(n - 1, 0) * gap;
  if (widths.length === 0 || span(widths.length) <= room) return widths.length;
  let n = 0;
  while (n < widths.length && span(n + 1) + gap + ellipsis <= room) n++;
  return Math.max(n, 1);
};

/* ---------- the referents of a page ---------- */

/* The pages of the book: every chapter's, then its own front and back pages. */
const pagesAt = (m: BookManifest): readonly SectionEntry[] => [
  ...m.chapters.flatMap((ch) => pagesOf(ch)),
  ...[m.intro, m.summary].flatMap((entry) => (entry ? [entry] : [])),
];
const pageAt = (m: BookManifest, id: string): SectionEntry | null => pagesAt(m).find((p) => p.id === id) ?? null;
/* What a referent group's scope shows: the ink, and the colour of every key it counts. */
const shownAt = (m: BookManifest, c: Choices, scheme: Scheme, keys: readonly CountKey[]): readonly Hue[] =>
  [...INKS, ...keys.flatMap((k) => (isCategoryKey(k) ? effectiveHue(m, c, k, scheme).hue : fixedHueOf(k)) ?? [])];

/* A page's referent groups as the manifest ships them, or one group of them all, showing every colour of the page, where it ships none. */
export const groupsOf = (e: Pick<SectionEntry, 'referents' | 'refGroups' | 'counts'>): readonly RefGroupEntry[] => e.refGroups ?? (e.referents?.length
  ? [{ referents: e.referents.map((r) => r.id), figures: [...new Set(e.referents.flatMap((r) => r.figures))], shows: Object.keys(e.counts ?? {}) }]
  : []);

/* The order smart walks the palette in: the reader's own, kept when they applied it, else the book's stored one
   for the default palette, else the palette's own. */
const walkOrder = (m: Pick<BookManifest, 'colours'>, s: RefSettings): PaletteOrder | undefined => {
  const book = m.colours?.referentOrder;
  return s.order ?? (s.palette === DEFAULT_REFERENTS.palette && isPaletteOrder(book) ? book : undefined);
};

/* A page's referents dealt their colours, group by group: the palette as they walk it and the vision it was measured for. */
export type GroupReferents = DealtGroup & { readonly figures: readonly string[] };
export type PageReferents = { readonly hues: RefHues; readonly groups: readonly GroupReferents[]; readonly palette: readonly Hue[]; readonly vision: Vision };
const referentsAtPage = (m: BookManifest, c: Choices, at: SectionEntry, scheme: Scheme = schemeOf(m, c)): PageReferents => {
  const vision = visionOf(m, c);
  const settings = referentsOf(c);
  const own = referentHues(settings, vision);
  const palette = settings.mode === 'smart' ? inPaletteOrder(own, walkOrder(m, settings)) : own;
  const deal = { palette, mode: settings.mode, vision, target: TARGET_DEFAULT };
  const groups = groupsOf(at).map((g): GroupReferents => ({
    ...dealGroup({ ids: g.referents, shown: shownAt(m, c, scheme, g.shows) }, deal), figures: g.figures,
  }));
  return { hues: huesOfGroups(groups), groups, palette, vision };
};
export const pageReferents = (m: BookManifest, c: Choices, page: string): PageReferents | null => {
  const at = pageAt(m, page);
  return at ? referentsAtPage(m, c, at) : null;
};

const withReferents = (m: BookManifest): readonly SectionEntry[] => pagesAt(m).filter((at) => at.referents?.length);

/* Every page of the book with referents, each with its groups dealt under these choices. */
export const bookReferents = (m: BookManifest, c: Choices): readonly PageReferents[] => {
  const scheme = schemeOf(m, c);
  return withReferents(m).map((at) => referentsAtPage(m, c, at, scheme));
};

/* The order smart walks a referent palette in for this book: every referent group of the book, weighed by its
   referents, with the colours its scope shows under these choices and their vision. */
export const referentOrder = (m: BookManifest, c: Choices, palette: RefSettings['palette']): PaletteOrder => {
  const vision = visionOf(m, c);
  const scheme = schemeOf(m, c);
  const groups = withReferents(m).flatMap((at) => groupsOf(at).map((g): GroupWeight => ({ size: g.referents.length, shown: shownAt(m, c, scheme, g.shows) })));
  return clashOrder(referentHues({ palette, mode: 'smart' }, vision), groups, vision, TARGET_DEFAULT);
};

/* ---------- the stylesheet ---------- */

const varsOf = (order: readonly TypeKey[], hues: Readonly<Record<TypeKey, Hue>>, mode: 'light' | 'dark'): string => {
  const keys = Object.keys(hues).sort((a, b) => (order.indexOf(a) + 1 || Infinity) - (order.indexOf(b) + 1 || Infinity));
  return keys.map((k) => `--c-${k}:${hues[k][mode]}`).join(';');
};

/* One block of the sheet, all of it under the book's own attribute so two books on one page never colour each
   other: the scheme on the book, then the reader's overrides after it, so that theirs win without either rule
   having to be marked important. The prefix is the theme's switch on an ancestor. */
const blockOf = (m: BookManifest, c: Choices, scheme: Scheme, mode: 'light' | 'dark', prefix: string): string => {
  const order = orderOf(m, c);
  const book = `${prefix}[data-book="${m.id}"]`;
  const rule = (hues: Readonly<Record<TypeKey, Hue>>): string => {
    const vars = varsOf(order, hues, mode);
    return vars ? `${book}{${vars}}` : '';
  };
  return rule(scheme.hues) + rule(c.overrides);
};

/* The whole sheet: the one the book is built with, and the one the store hangs
   in the head over it. Dark comes in the three states the theme comes in —
   light, the system's dark, and dark asked for — so a colour follows the theme
   the way everything else does. The scheme is always there, so the sheet is
   never empty. */
export const cssFor = (m: BookManifest, c: Choices): string => {
  const scheme = schemeOf(m, c);
  const guarded = blockOf(m, c, scheme, 'dark', ':root:not([data-theme="light"]) ');
  return [
    blockOf(m, c, scheme, 'light', ''),
    guarded ? `@media (prefers-color-scheme: dark){${guarded}}` : '',
    blockOf(m, c, scheme, 'dark', ':root[data-theme="dark"] '),
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
  vision: z.unknown().optional().transform((v) => (isVision(v) ? v : undefined)),
  categories: z.unknown().optional().transform(parseCategories),
  referents: z.unknown().optional().transform(parseReferents),
});
/* What is written: the choices with the colours under `overrides.book`, as every file has had them. */
export type ColourFileDTO = {
  readonly format: 'omnistax-colours'; readonly version: 1; readonly book: BookId; readonly order: readonly TypeKey[];
  readonly overrides: { readonly book: Overrides }; readonly vision?: Vision; readonly categories?: Categories; readonly referents?: RefSettings;
};

export const toFile = (book: BookId, c: Choices): ColourFileDTO =>
  ({ format: 'omnistax-colours', version: 1, book, order: [...c.order], overrides: { book: c.overrides }, ...(c.vision ? { vision: c.vision } : {}), ...(c.categories ? { categories: c.categories } : {}), ...(c.referents ? { referents: c.referents } : {}) });

/* A file read back. It is refused when it is not a colour file at all — which is
   what storage written before the envelope existed reads as, so an older
   browser simply starts afresh — and when it belongs to another book, since a
   quantity of one book means nothing in another. */
export const fromFile = (raw: unknown, book: BookId): { readonly ok: true; readonly choices: Choices } | { readonly ok: false; readonly reason: 'not-colours' | 'other-book' } => {
  const read = zColourFile.safeParse(raw);
  if (!read.success) return { ok: false, reason: 'not-colours' };
  if (read.data.book !== book) return { ok: false, reason: 'other-book' };
  const { order, overrides, vision, categories, referents } = read.data;
  return { ok: true, choices: { order, overrides, ...(vision ? { vision } : {}), ...(categories ? { categories } : {}), ...(referents ? { referents } : {}) } };
};
