/* The colours the reader chooses for the book's types, as a plain immutable
   value. Colour is a function of type, and the book pins a hue to every type it
   declares; this is where a reader says otherwise. A colour is set at a place —
   the whole book, one chapter, or one section — and it reaches every lower place
   that has not chosen its own, so nothing is ever copied downwards and clearing
   a setting simply hands the type back to the tier above.

   Everything here is pure: the store applies these functions, saves the result
   and writes the stylesheet they build. */
import type { BookManifest } from '../content/schema';
import { type ChapterId, type SectionId, chapterId } from '../types/ids';
import type { Target } from '../sections/scope';

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
export const EMPTY: Overrides = { book: {}, chapters: {}, sections: {} };

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
export const isEmpty = (o: Overrides): boolean =>
  isEmptyRecord(o.book) && Object.values(o.chapters).every(isEmptyRecord) && Object.values(o.sections).every(isEmptyRecord);

/* The boundary with storage, where anything may come back. A type whose colour
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
export const parseOverrides = (raw: unknown): Overrides => {
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

export const setHue = (o: Overrides, place: Place, type: TypeKey, hue: Hue): Overrides =>
  withPlace(o, place, { ...at(o, place), [type]: normHue(hue) });
export const clearHue = (o: Overrides, place: Place, type: TypeKey): Overrides => {
  const hues = { ...at(o, place) };
  if (!(type in hues)) return o;
  delete hues[type];
  return withPlace(o, place, hues);
};
/* Every type at that one place, handed back to the tier above in one step. */
export const clearPlace = (o: Overrides, place: Place): Overrides =>
  isEmptyRecord(at(o, place)) ? o : withPlace(o, place, {});

/* A palette dressed onto the types in the order they are given, each type taking
   the next hue, so no two of them come out the same. A palette with fewer hues
   than there are types cannot say what the rest would be, and is refused. */
export const applyPalette = (o: Overrides, place: Place, types: readonly TypeKey[], hues: readonly Hex[]): Overrides | null => {
  if (types.length > hues.length) return null;
  const chosen = Object.fromEntries(types.map((t, i) => [t, { light: normHex(hues[i]), dark: darkOf(hues[i]) }] as const));
  return withPlace(o, place, { ...at(o, place), ...chosen });
};

/* ---------- the manifest's own colours ---------- */

const typeOrder = (m: BookManifest): readonly TypeKey[] => Object.keys(m.types);
const isGlobalTier = (m: BookManifest, type: TypeKey): boolean => Boolean(m.types[type]?.light);
const chapterEntry = (m: BookManifest, chapter: ChapterId) => m.chapters.find((c) => c.id === String(chapter));

/* The hue the book itself gives a type at a place: the global tier from the
   book's types, and for a chapter-tier type the pool hue that chapter binds it
   to. Above the chapter there is nothing to read, so a chapter-tier type has no
   built-in colour at book level. */
export const defaultHue = (m: BookManifest, type: TypeKey, place: Place): Hue | null => {
  const t = m.types[type];
  if (!t) return null;
  if (t.light) return { light: normHex(t.light), dark: normHex(t.dark ?? darkOf(t.light)) };
  if (place.level === 'book') return null;
  const bound = chapterEntry(m, place.chapter)?.colors[type];
  const hue = bound ? m.pool.find((p) => p.id === bound) : undefined;
  return hue ? { light: normHex(hue.light), dark: normHex(hue.dark) } : null;
};

export type Source = 'section' | 'chapter' | 'book' | 'default' | 'none';

/* The colour that shows at a place, and which tier it came from: the place's own
   setting, else the chapter's, else the book's, else what the book itself says. */
export const effectiveHue = (o: Overrides, m: BookManifest, type: TypeKey, place: Place): { readonly hue: Hue | null; readonly from: Source } => {
  if (place.level === 'section') {
    const own = ownHue(o, type, place);
    if (own) return { hue: own, from: 'section' };
  }
  if (place.level !== 'book') {
    const chapter: Place = { level: 'chapter', chapter: place.chapter };
    const own = ownHue(o, type, chapter);
    if (own) return { hue: own, from: 'chapter' };
  }
  const book = ownHue(o, type, { level: 'book' });
  if (book) return { hue: book, from: 'book' };
  const built = defaultHue(m, type, place);
  return built ? { hue: built, from: 'default' } : { hue: null, from: 'none' };
};

/* The types a place shows. The book shows every type it declares. A chapter shows
   the global tier, the chapter-tier types it binds, and anything its built
   sections colour. A section shows what its page binds, and a page that binds
   nothing colours every type. */
export const typesAt = (m: BookManifest, place: Place): readonly TypeKey[] => {
  const all = typeOrder(m);
  if (place.level === 'book') return all;
  const ch = chapterEntry(m, place.chapter);
  if (place.level === 'section') {
    const binds = ch?.sections.find((s) => s.id === String(place.section))?.binds ?? [];
    return binds.length === 0 ? all : all.filter((k) => binds.includes(k));
  }
  const shown = new Set<TypeKey>([
    ...all.filter((k) => isGlobalTier(m, k)),
    ...Object.keys(ch?.colors ?? {}),
    ...(ch?.sections ?? []).filter((s) => s.built).flatMap((s) => s.binds),
  ]);
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

const varsOf = (m: BookManifest, hues: Readonly<Record<TypeKey, Hue>>, mode: 'light' | 'dark'): string => {
  const order = typeOrder(m);
  const keys = Object.keys(hues).sort((a, b) => (order.indexOf(a) + 1 || Infinity) - (order.indexOf(b) + 1 || Infinity));
  return keys.map((k) => `--c-${k}:${hues[k][mode]}`).join(';');
};

/* One block of the sheet: the book's own overrides on the root, then each
   chapter's, then each section's. The chapter selector is the one ShellPage
   writes, so a reader's chapter colour lands exactly where the book's does; a
   section names its chapter as well, and the two attributes together outrank the
   chapter's rule without either of them having to be marked important. */
const blockOf = (o: Overrides, m: BookManifest, mode: 'light' | 'dark', root: string, prefix: string): string => {
  const rule = (sel: string, hues: Readonly<Record<TypeKey, Hue>>): string => {
    const vars = varsOf(m, hues, mode);
    return vars ? `${sel}{${vars}}` : '';
  };
  const both = (tail: string): string => `${prefix}${tail},${prefix} ${tail}`;
  const book = rule(root, o.book);
  const chapters = m.chapters.map((c) => rule(both(`[data-chapter="${c.dir}"]`), o.chapters[c.id] ?? {})).join('');
  const sections = m.chapters.flatMap((c) => c.sections.map((s) => rule(both(`[data-chapter="${c.dir}"][data-sec="${s.id}"]`), o.sections[s.id] ?? {}))).join('');
  return book + chapters + sections;
};

/* The sheet the store hangs in the head. Dark comes in the same three states the
   book's own colours come in — light, the system's dark, and dark asked for —
   so an override follows the theme the way everything else does. */
export const cssFor = (o: Overrides, m: BookManifest): string => {
  const dark = ':root:not([data-theme="light"])';
  const guarded = blockOf(o, m, 'dark', dark, dark);
  return [
    blockOf(o, m, 'light', ':root', ''),
    guarded ? `@media (prefers-color-scheme: dark){${guarded}}` : '',
    blockOf(o, m, 'dark', ':root[data-theme="dark"]', ':root[data-theme="dark"]'),
  ].join('');
};
