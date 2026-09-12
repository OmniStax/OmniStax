/* The elements sheet as the page reads it: where every cell stands, what a cell
   is filled with, and what the filters and the search let through. All of it is
   pure — rows in, numbers and predicates out — so the component draws and does
   not decide.

   The table is the one the book prints: eighteen columns and seven rows, with
   the lanthanides and the actinides lifted out and set below it. A cell is
   filled by whatever the reader has asked for: the book's own three-way
   shading, the family an element belongs to, the block it stands in, or one of
   the four trends, which are a ramp from the least to the greatest value the
   table holds. */
import type { ElementDTO, ElementsSheetDTO } from '../content/sheets';
import { type Composition, type ElementSymbol, type ElementTable, elementSymbol } from './formula';

/* The lanthanides and the actinides, which the table prints below it. */
const F_ROWS: readonly (readonly [number, number])[] = [[57, 71], [89, 103]];
export const COLUMNS = 18, PERIODS = 7;

/* Where a cell stands in the grid the page draws: a column of 1 to 18 and a
   row, with the two f-block rows at 8 and 9 under the table proper. */
export type Cell = { readonly element: ElementDTO; readonly column: number; readonly row: number };
export const cellsOf = (elements: readonly ElementDTO[]): readonly Cell[] =>
  elements.map((element): Cell => {
    const z = element.number;
    const strip = F_ROWS.findIndex(([a, b]) => z >= a && z <= b);
    if (strip >= 0) return { element, column: 4 + (z - F_ROWS[strip][0]), row: PERIODS + 1 + strip };
    return { element, column: element.group ?? 3, row: element.period };
  });
/* The two cells that stand in for the strips in the table proper: group 3 of periods 6 and 7. */
export type Placeholder = { readonly label: string; readonly column: number; readonly row: number; readonly from: number };
export const placeholders = (): readonly Placeholder[] =>
  F_ROWS.map(([a, b], i) => ({ label: `${a}–${b}`, column: 3, row: 6 + i, from: a }));

/* ---------- what a cell is filled with ---------- */

/* The four numbers the table can be read as a ramp of. */
export const TRENDS = ['electronegativity', 'ionization', 'radius', 'weight'] as const;
export type Trend = (typeof TRENDS)[number];
export type TrendMeta = { readonly label: string; readonly unit: string };
export const TREND_META: Readonly<Record<Trend, TrendMeta>> = {
  electronegativity: { label: 'Electronegativity', unit: 'Pauling' },
  ionization: { label: 'First ionization energy', unit: 'kJ/mol' },
  radius: { label: 'Covalent radius', unit: 'pm' },
  weight: { label: 'Atomic weight', unit: 'amu' },
};
/* How the table is coloured: the book's shading, a family, a block, or a trend.
   An ADT, because a trend carries which trend it is and the other two carry
   nothing. */
export type Colouring =
  | { readonly by: 'classification' }
  | { readonly by: 'category' }
  | { readonly by: 'block' }
  | { readonly by: 'trend'; readonly trend: Trend };

export const trendValue = (e: ElementDTO, t: Trend): number | null => (t === 'weight' ? e.weight : e[t]);
/* The least and the greatest value of a trend across the table, which the ramp runs between. */
export type Range = { readonly lo: number; readonly hi: number };
export const rangeOf = (elements: readonly ElementDTO[], t: Trend): Range | null => {
  const vs = elements.flatMap((e) => { const v = trendValue(e, t); return v === null ? [] : [v]; });
  return vs.length === 0 ? null : { lo: Math.min(...vs), hi: Math.max(...vs) };
};
/* Where a value sits on the ramp, 0 at the least and 1 at the greatest; nothing
   where the element has no value, and the cell is left unfilled. */
export const rampAt = (v: number | null, r: Range | null): number | null =>
  (v === null || r === null || r.hi === r.lo ? (v === null ? null : 0.5) : (v - r.lo) / (r.hi - r.lo));

/* ---------- the filters ---------- */

/* What the reader has narrowed the table to. Every field is a set, and an empty
   set is no narrowing at all, so the default is the whole table and the
   predicate reads the same for one choice and for several. */
export type Filters = {
  readonly groups: ReadonlySet<number>;
  readonly periods: ReadonlySet<number>;
  readonly blocks: ReadonlySet<string>;
  readonly states: ReadonlySet<string>;
  readonly categories: ReadonlySet<string>;
  readonly query: string;
};
export const NO_FILTERS: Filters = { groups: new Set(), periods: new Set(), blocks: new Set(), states: new Set(), categories: new Set(), query: '' };

const lets = <T,>(set: ReadonlySet<T>, v: T | null): boolean => set.size === 0 || (v !== null && set.has(v));
/* The search: a name or a symbol, from the front, either case, so "ir" finds iron and iridium and "Fe" finds iron. */
const matches = (e: ElementDTO, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return e.name.toLowerCase().startsWith(q) || e.symbol.toLowerCase() === q || e.symbol.toLowerCase().startsWith(q) || String(e.number) === q;
};
export const passes = (e: ElementDTO, f: Filters): boolean =>
  lets(f.groups, e.group) && lets(f.periods, e.period) && lets(f.blocks, e.block) && lets(f.states, e.state) && lets(f.categories, e.category) && matches(e, f.query);

/* ---------- the table as everything else reads it ---------- */

/* The sheet by symbol, which is what the formula recogniser resolves against
   and what a card sums a molar mass from. */
export const tableOf = (sheet: ElementsSheetDTO): ElementTable =>
  new Map(sheet.elements.map((e) => [elementSymbol(e.symbol), { name: e.name, weight: e.weight }] as const));
export const bySymbol = (sheet: ElementsSheetDTO, symbol: ElementSymbol): ElementDTO | undefined =>
  sheet.elements.find((e) => e.symbol === symbol);
/* The elements a composition names, in the order the formula writes them, each with what the table says of it. */
export const componentsOf = (sheet: ElementsSheetDTO, atoms: Composition): readonly { readonly element: ElementDTO; readonly count: number }[] =>
  atoms.flatMap((a) => { const element = bySymbol(sheet, a.symbol); return element ? [{ element, count: a.count }] : []; });

/* The order the keyboard walks the cells in: reading order down the table, so
   an arrow moves to the cell beside or below the one it stands on. */
export const neighbour = (cells: readonly Cell[], from: Cell, dx: number, dy: number): Cell | undefined => {
  const row = from.row + dy, column = from.column + dx;
  const exact = cells.find((c) => c.row === row && c.column === column);
  if (exact) return exact;
  const line = cells.filter((c) => c.row === row);
  if (line.length === 0 || (dx !== 0 && dy === 0)) return undefined;
  return line.reduce((best, c) => (Math.abs(c.column - column) < Math.abs(best.column - column) ? c : best));
};

/* ---------- the fills the table wears ---------- */

/* The colours are the app's, as they are everywhere else: the book says what
   its elements are and the app says what a family or a block looks like. They
   are written in OKLCH so that one hue gives a muted tint on a light ground and
   a muted shade on a dark one, and so that turning colour coding off is the
   same expression with no chroma in it. The element palette is not any of this:
   it is the book's own drawing convention and it stays whatever the reader
   chooses, which is why a card's swatch comes from `F.el` and not from here. */
export type Hue = number;
const CLASS_HUE: Readonly<Record<string, Hue>> = { metal: 250, metalloid: 150, nonmetal: 70 };
const CATEGORY_HUE: Readonly<Record<string, Hue>> = {
  'alkali metal': 20, 'alkaline earth metal': 55, 'transition metal': 250, 'post-transition metal': 285,
  metalloid: 150, nonmetal: 95, halogen: 190, 'noble gas': 320, lanthanide: 130, actinide: 350,
};
const BLOCK_HUE: Readonly<Record<string, Hue>> = { s: 20, p: 95, d: 250, f: 320 };

/* One flat tint: light on a light ground, dark on a dark one, and grey where the reader has turned colour coding off. */
const tint = (hue: Hue | undefined, dark: boolean, colour: boolean): string =>
  (hue === undefined ? 'transparent' : dark ? `oklch(0.32 ${colour ? 0.045 : 0} ${hue})` : `oklch(0.93 ${colour ? 0.045 : 0} ${hue})`);
/* One step of the ramp, from the least value to the greatest. */
const ramp = (t: number, dark: boolean, colour: boolean): string =>
  (dark ? `oklch(${0.24 + 0.34 * t} ${colour ? 0.02 + 0.11 * t : 0.001} 250)` : `oklch(${0.97 - 0.3 * t} ${colour ? 0.02 + 0.12 * t : 0.001} 250)`);
/* The colour of one cell, under the colouring the reader has chosen. A cell the
   trend has no value for is left unfilled, so the gap in the data is visible. */
export const fillOf = (c: Colouring, e: ElementDTO, range: Range | null, dark: boolean, colour: boolean): string => {
  if (c.by === 'classification') return tint(CLASS_HUE[e.classification], dark, colour);
  if (c.by === 'category') return tint(CATEGORY_HUE[e.category], dark, colour);
  if (c.by === 'block') return tint(BLOCK_HUE[e.block], dark, colour);
  const t = rampAt(trendValue(e, c.trend), range);
  return t === null ? 'transparent' : ramp(t, dark, colour);
};
/* The swatches a legend draws: one per family or block, or the ends of the ramp. */
export type Swatch = { readonly label: string; readonly fill: string };
export const legendOf = (c: Colouring, elements: readonly ElementDTO[], range: Range | null, dark: boolean, colour: boolean): readonly Swatch[] => {
  const seen = (key: (e: ElementDTO) => string, hues: Readonly<Record<string, Hue>>): readonly Swatch[] =>
    [...new Set(elements.map(key))].sort((a, b) => (hues[a] ?? 0) - (hues[b] ?? 0)).map((label) => ({ label, fill: tint(hues[label], dark, colour) }));
  if (c.by === 'classification') return seen((e) => e.classification, CLASS_HUE);
  if (c.by === 'category') return seen((e) => e.category, CATEGORY_HUE);
  if (c.by === 'block') return seen((e) => `${e.block}`, BLOCK_HUE);
  if (!range) return [];
  const n = 5;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { label: i === 0 || i === n - 1 ? String(Number((range.lo + t * (range.hi - range.lo)).toPrecision(3))) : '', fill: ramp(t, dark, colour) };
  });
};
