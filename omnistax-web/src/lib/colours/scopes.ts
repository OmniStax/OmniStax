/* Which referents of a page are seen together. A referent's scope is the
   figures that draw it, the text block (`<section id>`) each of them sits in, and
   every block that names it in a <span data-ref>; the lead, the summary and the
   exercises' lead are blocks of their own. Referents whose scopes share a figure
   or a block are one group, which is dealt its colours together; groups that
   never meet may wear the same ones. Each group carries what its scope shows: the
   categories of its blocks' typed words and macros, and the draws, conventions and facts of
   its figures, keyed as counts.ts keys them. Pure throughout. */
import type { RefGroupEntry } from '../content/schema';
import { type CountKey, type MacroTypes, SPECTRUM, conventionKey, factKey, macroKeys } from './counts';

export type BlockId = string;
export type FigureId = string;
type ScopeItem = string;   /* `f:<figure>` or `b:<block>` */

export type ScopedReferent = { readonly id: string; readonly figures: readonly FigureId[] };
export type ScopedFigure = { readonly id: FigureId; readonly draws: readonly string[]; readonly conventions: readonly string[]; readonly facts: readonly string[] };
/* A page as the grouping reads it: the text, the prose that stands apart from it by block name, and the
   types its macros wear, absent where only the groups are wanted and not what they show. */
export type ScopedPage = {
  readonly referents: readonly ScopedReferent[];
  readonly figures: readonly ScopedFigure[];
  readonly text: string;
  readonly asides: Readonly<Record<BlockId, string>>;
  readonly macros?: MacroTypes;
};

export const TOP: BlockId = '@top';
export const asidesOf = (lead: string, summary: string, exercises: string): Readonly<Record<BlockId, string>> =>
  ({ '@lead': lead, '@summary': summary, '@exercises': exercises });

type Block = { readonly id: BlockId; readonly html: string };

const SECTION_TAG = /<section\b[^>]*?\sid="([^"]+)"[^>]*>|<\/section>/g;
/* The text cut at its section tags, each run of it under the innermost section open there. */
export const blocksOf = (html: string): readonly Block[] => {
  const tags = [...html.matchAll(SECTION_TAG)];
  const cuts = tags.reduce<{ readonly open: readonly BlockId[]; readonly from: number; readonly out: readonly Block[] }>((acc, m) => {
    const here = { id: acc.open[acc.open.length - 1] ?? TOP, html: html.slice(acc.from, m.index) };
    const open = m[1] === undefined ? acc.open.slice(0, -1) : [...acc.open, m[1]];
    return { open, from: (m.index ?? 0) + m[0].length, out: [...acc.out, here] };
  }, { open: [], from: 0, out: [] });
  return [...cuts.out, { id: cuts.open[cuts.open.length - 1] ?? TOP, html: html.slice(cuts.from) }].filter((b) => b.html !== '');
};

const values = (html: string, re: RegExp): readonly string[] => Array.from(html.matchAll(re), (m) => m[1]);
const FIGURE_ID = /<figure\b[^>]*?\sid="([^"]+)"/g;
const REF = /<[^>]*\sdata-ref="([^"]+)"/g;
const TYPED = /<[^>]*\sdata-type="([^"]+)"/g;
const refsIn = (html: string): readonly string[] => values(html, REF).flatMap((v) => v.split(/\s+/).filter(Boolean));

const pageBlocks = (p: ScopedPage): readonly Block[] =>
  [...blocksOf(p.text), ...Object.entries(p.asides).map(([id, html]) => ({ id, html }))];

const scopeOf = (r: ScopedReferent, blocks: readonly Block[], figureBlock: ReadonlyMap<FigureId, BlockId>): ReadonlySet<ScopeItem> => new Set([
  ...r.figures.flatMap((f) => [`f:${f}`, ...(figureBlock.has(f) ? [`b:${figureBlock.get(f)}`] : [])]),
  ...blocks.filter((b) => refsIn(b.html).includes(r.id)).map((b) => `b:${b.id}`),
]);

type Forming = { readonly ids: readonly string[]; readonly items: ReadonlySet<ScopeItem> };
const meets = (a: ReadonlySet<ScopeItem>, b: ReadonlySet<ScopeItem>): boolean => [...a].some((x) => b.has(x));
/* Each referent in table order joins every group its scope meets, and those groups become one. */
const join = (groups: readonly Forming[], next: Forming): readonly Forming[] => {
  const touching = groups.filter((g) => meets(g.items, next.items));
  const merged: Forming = {
    ids: [...touching.flatMap((g) => g.ids), ...next.ids],
    items: new Set([...touching.flatMap((g) => [...g.items]), ...next.items]),
  };
  return [...groups.filter((g) => !touching.includes(g)), merged];
};

/* The page's referent groups, each with its referents in table order, the figures it covers and the colour keys it shows; the groups stand in the order of their first referent. */
export const referentGroups = (p: ScopedPage): readonly RefGroupEntry[] => {
  if (p.referents.length === 0) return [];
  const blocks = pageBlocks(p);
  const figureBlock = new Map(blocks.flatMap((b) => values(b.html, FIGURE_ID).map((f) => [f, b.id] as const)));
  const order = new Map(p.referents.map((r, i) => [r.id, i]));
  const rows = new Map(p.figures.map((f) => [f.id, f]));
  const formed = p.referents.reduce<readonly Forming[]>((gs, r) => join(gs, { ids: [r.id], items: scopeOf(r, blocks, figureBlock) }), []);
  const groupOf = (g: Forming): RefGroupEntry => {
    const inBlocks = new Set([...g.items].filter((x) => x.startsWith('b:')).map((x) => x.slice(2)));
    const figures = [...new Set([
      ...[...g.items].filter((x) => x.startsWith('f:')).map((x) => x.slice(2)),
      ...[...figureBlock].filter(([, b]) => inBlocks.has(b)).map(([f]) => f),
    ])];
    const shows: readonly CountKey[] = [
      ...blocks.filter((b) => inBlocks.has(b.id)).flatMap((b) => [...values(b.html, TYPED), ...macroKeys(b.html, p.macros ?? {})]),
      ...figures.flatMap((f) => rows.get(f) ?? []).flatMap((f) => [
        ...f.draws, ...f.conventions.map(conventionKey), ...f.facts.filter((x) => x !== SPECTRUM).map(factKey),
      ]),
    ];
    return { referents: [...g.ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)), figures, shows: [...new Set(shows)].sort() };
  };
  return formed.map(groupOf).sort((a, b) => (order.get(a.referents[0]) ?? 0) - (order.get(b.referents[0]) ?? 0));
};
