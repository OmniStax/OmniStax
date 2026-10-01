/* The Definitions and Formulas lists as concepts (RULES item 6). A definition
   row is one concept with the words and the symbols that name it and the
   formulas that define it; a word or a symbol that names no concept stands on
   a row of its own. A formula carries the concept it states. Pure, so the views
   only have to group and render. */
import type { ConceptDTO, ConceptKind, CoverageDTO, EquationDTO, GlossaryDTO, VariableDTO } from '../content/schema';
import { type SectionId, sectionId } from '../types/ids';

export const KIND_LABEL: Readonly<Record<ConceptKind, string>> = { definition: 'Definition', axiom: 'Axiom', result: 'Result', idea: 'Idea', skill: 'Skill' };
/* The five kinds in the order the legends teach them. */
export const KINDS = Object.keys(KIND_LABEL) as readonly ConceptKind[];

/* The loaded tables of a book, as the lists read them. */
export type ConceptTables = {
  readonly concepts: readonly ConceptDTO[];
  readonly coverage: readonly CoverageDTO[];
  readonly variables: readonly VariableDTO[];
  readonly equations: readonly EquationDTO[];
  readonly glossary: readonly GlossaryDTO[];
};

export type DefinitionRow = {
  readonly key: string;
  readonly concept?: ConceptDTO;
  readonly section: SectionId;                  /* where the row stands in the list */
  readonly words: readonly GlossaryDTO[];
  readonly symbols: readonly VariableDTO[];     /* one row per symbol: the meaning it has in the section read */
  readonly formulas: readonly EquationDTO[];
  readonly unit: string;
};

/* A concept's name without its formula: "Displacement, $\kdx = …$" is "Displacement"; a name that is only a formula is "". */
export const wordOf = (name: string): string => name.replace(/\$[^$]*\$/g, '').replace(/[\s,;:]+$/, '').replace(/^[\s,;:]+/, '').replace(/\s+/g, ' ').trim();

const by = <T, K>(xs: readonly T[], key: (x: T) => K | undefined): Map<K, T[]> =>
  xs.reduce((m, x) => { const k = key(x); if (k !== undefined) m.set(k, [...(m.get(k) ?? []), x]); return m; }, new Map<K, T[]>());

/* One row per symbol: the row of `here` where the symbol has one, else of `home`, else the first. */
const perSymbol = (vars: readonly VariableDTO[], here: SectionId | undefined, home: SectionId): readonly VariableDTO[] =>
  [...by(vars, (v) => v.sym).values()].map((rows) => rows.find((v) => v.section === here) ?? rows.find((v) => v.section === home) ?? rows[0]);

/* The formulas that state a concept: the ones the sheet keeps, else the one the concept names. */
export const formulasOf = (c: ConceptDTO | undefined, eqs: readonly EquationDTO[]): readonly EquationDTO[] => {
  const important = eqs.filter((e) => e.important);
  return important.length ? important : eqs.filter((e) => e.id === c?.eq);
};

/* The rows in the book's order: by section, then by the span that brings each in. */
export const definitionRows = (t: ConceptTables, inScope: (s: SectionId) => boolean, here?: SectionId): readonly DefinitionRow[] => {
  const spanAt = new Map(t.coverage.map((c, i) => [c.span as string, i]));
  const introAt = new Map<string, number>();
  t.coverage.forEach((c, i) => c.introduces.forEach((id) => { if (!introAt.has(id)) introAt.set(id, i); }));
  const known = new Map(t.concepts.map((c) => [c.id as string, c]));
  const linked = (id: string | undefined): string | undefined => (id && known.has(id) ? id : undefined);
  const vars = by(t.variables, (v) => linked(v.concept)), words = by(t.glossary, (g) => linked(g.concept)), eqs = by(t.equations, (e) => linked(e.concept));
  const anchorAt = (v: VariableDTO): number => (v.anchor ? spanAt.get(v.anchor) : undefined) ?? Infinity;

  const conceptRows = t.concepts
    .filter((c) => vars.has(c.id) || words.has(c.id) || (c.kind === 'definition' && introAt.has(c.id)))
    .map((c): readonly [DefinitionRow, number] => {
      const v = vars.get(c.id) ?? [], w = words.get(c.id) ?? [];
      const own = sectionId(c.section);
      const home = inScope(own) ? own : [...v, ...w].map((r) => sectionId(r.section)).find(inScope) ?? own;
      const symbols = perSymbol(v, here, home);
      const at = home === own ? introAt.get(c.id) ?? Math.min(...v.map(anchorAt)) : Math.min(...v.filter((r) => r.section === home).map(anchorAt));
      return [{ key: c.id, concept: c, section: home, words: w, symbols, formulas: c.kind === 'definition' ? formulasOf(c, eqs.get(c.id) ?? []) : [], unit: symbols.find((s) => s.unit)?.unit ?? '' }, at];
    });
  const loneSymbols = [...by(t.variables.filter((v) => !linked(v.concept)), (v) => `${v.sym}@${v.section}`).values()].map(([v]): readonly [DefinitionRow, number] =>
    [{ key: `sym:${v.sym}@${v.section}`, section: sectionId(v.section), words: [], symbols: [v], formulas: [], unit: v.unit }, anchorAt(v)]);
  const loneWords = t.glossary.filter((g) => !linked(g.concept)).map((g): readonly [DefinitionRow, number] =>
    [{ key: `term:${g.term}@${g.section}`, section: sectionId(g.section), words: [g], symbols: [], formulas: [], unit: '' }, Infinity]);
  return [...conceptRows, ...loneSymbols, ...loneWords].map(([row, at], i) => ({ row, at, i })).sort((a, b) => a.at - b.at || a.i - b.i).map((x) => x.row);
};

/* What a formula says it is, on the line above it in the Formulas list. A
   definition's formula defines its symbol, or its word where it has none. */
export type FormulaLabel =
  | { readonly kind: 'defines'; readonly tex?: string; readonly word: string }
  | { readonly kind: 'states'; readonly tag: string; readonly word: string }
  | { readonly kind: 'none' };
export const formulaLabel = (e: EquationDTO, concepts: ReadonlyMap<string, ConceptDTO>, symbolOf: (c: ConceptDTO) => string | undefined): FormulaLabel => {
  const c = e.concept ? concepts.get(e.concept) : undefined;
  if (!c) return { kind: 'none' };
  if (c.kind === 'definition') return { kind: 'defines', tex: symbolOf(c), word: wordOf(c.name) };
  return { kind: 'states', tag: KIND_LABEL[c.kind], word: wordOf(c.name) };
};
