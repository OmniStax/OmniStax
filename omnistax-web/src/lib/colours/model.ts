/* The colours of the book's quantities, as a plain immutable value. Colour is a
   function of type: the book declares its types, and the app dresses them from
   a scheme — the default the book stores (book.json `colours`), and the OKLab
   palette laid along the order for any type it does not cover. What the reader
   chooses stands over that scheme. They choose two things: the order the
   quantities stand in, which is what every palette lays its hues along, and a
   colour at a place — the whole book, one chapter, or one section — which
   reaches every lower place that has not chosen its own, so nothing is ever
   copied downwards and clearing a setting simply hands the type back to the
   tier above.

   Everything here is pure: the store applies these functions, saves the result
   and writes the stylesheet they build. */
import { z } from 'zod';
import type { BookManifest, RefGroupEntry, SectionEntry } from '../content/schema';
import { pagesOf } from '../content/roles';
import { type BookId, type ChapterId, type SectionId, chapterId, sectionId } from '../types/ids';
import type { Target } from '../sections/scope';
import { type Palette, type PaletteId, DEFAULT_VISION, OKLAB } from './palettes';
import { type Vision, isVision } from './oklab';
import { oklabHues } from './sample';
import {
  type DealtGroup, type GroupWeight, type PaletteOrder, type RefHues, type RefSettings, DEFAULT_REFERENTS, TARGET_DEFAULT, clampTarget, clashOrder, dealGroup, huesOfGroups,
  inPaletteOrder, isPaletteOrder, isRefMode, referentHues, sameOrder, targetOf,
} from './referents';
import { type CountKey, fixedHueOf, isCategoryKey } from './counts';

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
  t.level === 'section' ? { level: 'section', chapter: chapterOfSection(t.section), section: t.section } : t.level === 'chapter' ? { level: 'chapter', chapter: t.chapter } : { level: 'book' };
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
export type Choices = { readonly order: readonly TypeKey[]; readonly overrides: Overrides; readonly vision?: Vision; readonly referents?: RefSettings };
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
export const isEmpty = (c: Choices): boolean => c.order.length === 0 && noOverrides(c.overrides) && c.vision === undefined && c.referents === undefined;

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

/* The same with both values of every colour given, as the OKLab palette gives them. */
export const applyHues = (c: Choices, place: Place, types: readonly TypeKey[], hues: readonly Hue[]): Choices | null => {
  if (types.length > hues.length) return null;
  const chosen = Object.fromEntries(types.map((t, i) => [t, normHue(hues[i])] as const));
  return overriding(c, withPlace(c.overrides, place, { ...at(c.overrides, place), ...chosen }));
};

/* The vision the reader has said they read with, else the one the book's
   default was worked out for. */
export const visionOf = (m: Pick<BookManifest, 'colours'>, c: Choices): Vision => c.vision ?? m.colours?.vision ?? DEFAULT_VISION;
export const setVision = (c: Choices, vision: Vision | undefined): Choices => {
  if (c.vision === vision) return c;
  const { vision: _, ...rest } = c;
  return vision === undefined ? rest : { ...rest, vision };
};

/* The referent palette, how a group deals it, the target distance and, smart, the order it is walked in, the
   default until the reader chooses; a setting equal to the default is stored as nothing. In order keeps no order. */
export const referentsOf = (c: Choices): RefSettings => c.referents ?? DEFAULT_REFERENTS;
const sameReferents = (a: RefSettings, b: RefSettings): boolean =>
  a.palette === b.palette && a.mode === b.mode && targetOf(a) === targetOf(b) && sameOrder(a.order, b.order);
export const setReferents = (c: Choices, next: RefSettings): Choices => {
  const kept: RefSettings = {
    palette: next.palette, mode: next.mode,
    ...(targetOf(next) === TARGET_DEFAULT ? {} : { target: targetOf(next) }),
    ...(next.mode === 'smart' && next.order ? { order: [...next.order] } : {}),
  };
  if (sameReferents(referentsOf(c), kept)) return c;
  const { referents: _, ...rest } = c;
  return sameReferents(kept, DEFAULT_REFERENTS) ? rest : { ...rest, referents: kept };
};
const parseReferents = (raw: unknown): RefSettings | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { palette?: unknown; mode?: unknown; target?: unknown; order?: unknown };
  const target = typeof r.target === 'number' && Number.isFinite(r.target) ? { target: clampTarget(r.target) } : {};
  const order = r.mode === 'smart' && isPaletteOrder(r.order) ? { order: r.order } : {};
  return typeof r.palette === 'string' && r.palette !== '' && isRefMode(r.mode) ? { palette: r.palette as PaletteId, mode: r.mode, ...target, ...order } : undefined;
};

/* ---------- the order, and the scheme that follows it ---------- */

const chapterEntry = (m: BookManifest, chapter: ChapterId) => m.chapters.find((c) => c.id === String(chapter));

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
   takes, in the reader's order, the next OKLab colour no stored type wears, for
   the vision the default was worked out for. A book that stores no default is
   the OKLab palette laid along the order. */
export type Scheme = { readonly palette: Palette; readonly hues: Readonly<Record<TypeKey, Hue>> };
export const schemeOf = (m: Pick<BookManifest, 'types' | 'colours'>, c: Choices): Scheme => {
  const order = orderOf(m, c);
  const stored = m.colours?.assign ?? {};
  const kept = order.filter((k) => k in stored);
  const rest = order.filter((k) => !(k in stored));
  const worn = new Set(kept.map((k) => normHex(stored[k].light)));
  const spare = oklabHues(order.length + kept.length, m.colours?.vision ?? DEFAULT_VISION).filter((h) => !worn.has(normHex(h.light)));
  return {
    palette: OKLAB,
    hues: Object.fromEntries([
      ...kept.map((k) => [k, normHue(stored[k])] as const),
      ...rest.map((k, i) => [k, normHue(spare[i])] as const),
    ]),
  };
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
export const effectiveHue = (m: BookManifest, c: Choices, type: TypeKey, place: Place, scheme: Scheme = schemeOf(m, c)): { readonly hue: Hue | null; readonly from: Source } => {
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
  const dressed = scheme.hues[type];
  return dressed ? { hue: dressed, from: { kind: 'scheme', palette: scheme.palette.id } } : { hue: null, from: { kind: 'none' } };
};

/* The types a place shows, in the reader's order. The book shows every type it
   declares. A section shows the types its page wears, and a chapter what its
   built sections wear between them; a place that wears none yet shows them all. */
export const typesAt = (m: BookManifest, c: Choices, place: Place): readonly TypeKey[] => {
  const all = orderOf(m, c);
  if (place.level === 'book') return all;
  const ch = chapterEntry(m, place.chapter);
  const worn = new Set<TypeKey>(place.level === 'section'
    ? ch?.sections.find((s) => s.id === String(place.section))?.types ?? []
    : (ch?.sections ?? []).filter((s) => s.built).flatMap((s) => s.types));
  return worn.size === 0 ? all : all.filter((k) => worn.has(k));
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

/* A page of the book and the place its colours are read at: a chapter's pages at
   their own section place, the book's own front and back pages at the book. */
type PageAt = { readonly entry: SectionEntry; readonly place: Place };
const pagesAt = (m: BookManifest): readonly PageAt[] => [
  ...m.chapters.flatMap((ch) => pagesOf(ch).map((entry): PageAt => ({ entry, place: { level: 'section', chapter: chapterId(ch.id), section: sectionId(entry.id) } }))),
  ...[m.intro, m.summary].flatMap((entry): PageAt[] => (entry ? [{ entry, place: { level: 'book' } }] : [])),
];
const pageAt = (m: BookManifest, id: string): PageAt | null => pagesAt(m).find((p) => p.entry.id === id) ?? null;
const shownAt = (m: BookManifest, c: Choices, at: PageAt, scheme: Scheme, keys: readonly CountKey[]): readonly Hue[] =>
  keys.flatMap((k) => (isCategoryKey(k) ? effectiveHue(m, c, k, at.place, scheme).hue : fixedHueOf(k)) ?? []);

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
const referentsAtPage = (m: BookManifest, c: Choices, at: PageAt, scheme: Scheme = schemeOf(m, c)): PageReferents => {
  const vision = visionOf(m, c);
  const settings = referentsOf(c);
  const own = referentHues(settings, vision);
  const palette = settings.mode === 'smart' ? inPaletteOrder(own, walkOrder(m, settings)) : own;
  const deal = { palette, mode: settings.mode, vision, target: targetOf(settings) };
  const groups = groupsOf(at.entry).map((g): GroupReferents => ({
    ...dealGroup({ ids: g.referents, shown: shownAt(m, c, at, scheme, g.shows) }, deal), figures: g.figures,
  }));
  return { hues: huesOfGroups(groups), groups, palette, vision };
};
export const pageReferents = (m: BookManifest, c: Choices, page: string): PageReferents | null => {
  const at = pageAt(m, page);
  return at ? referentsAtPage(m, c, at) : null;
};

const withReferents = (m: BookManifest): readonly PageAt[] => pagesAt(m).filter((at) => at.entry.referents?.length);

/* Every page of the book with referents, each with its groups dealt under these choices. */
export const bookReferents = (m: BookManifest, c: Choices): readonly PageReferents[] => {
  const scheme = schemeOf(m, c);
  return withReferents(m).map((at) => referentsAtPage(m, c, at, scheme));
};

/* The order smart walks a referent palette in for this book: every referent group of the book, weighed by its
   referents, with the colours its scope shows under these choices and their vision. */
export const referentOrder = (m: BookManifest, c: Choices, palette: RefSettings['palette'], target: number): PaletteOrder => {
  const vision = visionOf(m, c);
  const scheme = schemeOf(m, c);
  const groups = withReferents(m).flatMap((at) => groupsOf(at.entry).map((g): GroupWeight => ({ size: g.referents.length, shown: shownAt(m, c, at, scheme, g.shows) })));
  return clashOrder(referentHues({ palette, mode: 'smart' }, vision), groups, vision, target);
};

/* ---------- the stylesheet ---------- */

const varsOf = (order: readonly TypeKey[], hues: Readonly<Record<TypeKey, Hue>>, mode: 'light' | 'dark'): string => {
  const keys = Object.keys(hues).sort((a, b) => (order.indexOf(a) + 1 || Infinity) - (order.indexOf(b) + 1 || Infinity));
  return keys.map((k) => `--c-${k}:${hues[k][mode]}`).join(';');
};

/* One block of the sheet, all of it under the book's own attribute so two books on one page never colour each
   other: the scheme on the book, then the reader's book overrides after it, so that theirs win without either
   rule having to be marked important; then each chapter's, then each section's, later and so winning at equal
   weight. A tier's attribute may sit on the element that carries the book or on one inside it, so each is
   written both ways. The prefix is the theme's switch on an ancestor. */
const blockOf = (m: BookManifest, c: Choices, scheme: Scheme, mode: 'light' | 'dark', prefix: string): string => {
  const order = orderOf(m, c);
  const o = c.overrides;
  const book = `${prefix}[data-book="${m.id}"]`;
  const rule = (sel: string, hues: Readonly<Record<TypeKey, Hue>>): string => {
    const vars = varsOf(order, hues, mode);
    return vars ? `${sel}{${vars}}` : '';
  };
  const both = (tier: string): string => `${book}${tier},${book} ${tier}`;
  const chapters = m.chapters.map((ch) => rule(both(`[data-chapter="${ch.dir}"]`), o.chapters[ch.id] ?? {})).join('');
  const sections = m.chapters.flatMap((ch) => ch.sections.map((sec) => rule(both(`[data-sec="${sec.id}"]`), o.sections[sec.id] ?? {}))).join('');
  return rule(book, scheme.hues) + rule(book, o.book) + chapters + sections;
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
  referents: z.unknown().optional().transform(parseReferents),
});
export type ColourFileDTO = z.infer<typeof zColourFile>;

export const toFile = (book: BookId, c: Choices): ColourFileDTO =>
  ({ format: 'omnistax-colours', version: 1, book, order: [...c.order], overrides: c.overrides, ...(c.vision ? { vision: c.vision } : {}), ...(c.referents ? { referents: c.referents } : {}) });

/* A file read back. It is refused when it is not a colour file at all — which is
   what storage written before the envelope existed reads as, so an older
   browser simply starts afresh — and when it belongs to another book, since a
   quantity of one book means nothing in another. */
export const fromFile = (raw: unknown, book: BookId): { readonly ok: true; readonly choices: Choices } | { readonly ok: false; readonly reason: 'not-colours' | 'other-book' } => {
  const read = zColourFile.safeParse(raw);
  if (!read.success) return { ok: false, reason: 'not-colours' };
  if (read.data.book !== book) return { ok: false, reason: 'other-book' };
  const { order, overrides, vision, referents } = read.data;
  return { ok: true, choices: { order, overrides, ...(vision ? { vision } : {}), ...(referents ? { referents } : {}) } };
};
