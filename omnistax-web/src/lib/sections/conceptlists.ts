/* The Definitions and Formulas lists as concepts (RULES item 6). A definition
   row is one concept with the symbol that names it and the form that defines
   it. A formula carries the concept it states. Pure, so the views only have
   to group and render. */
import { type ConceptDTO, type CoverageDTO, type FormDTO, type VariableDTO, mainForm } from '../content/schema';
import { type SectionId, sectionId } from '../types/ids';
import { KIND_LABEL } from './reference';

export { KIND_LABEL, KINDS } from './reference';

/* The loaded tables of a book, as the lists read them. */
export type ConceptTables = {
  readonly concepts: readonly ConceptDTO[];
  readonly coverage: readonly CoverageDTO[];
  readonly variables: readonly VariableDTO[];
};

export type DefinitionRow = {
  readonly key: string;
  readonly concept: ConceptDTO;
  readonly section: SectionId;
  readonly symbols: readonly VariableDTO[];
  readonly formulas: readonly FormDTO[];
  readonly unit: string;
};

/* The rows in the book's order: by section, then by the span that brings each in. */
export const definitionRows = (t: ConceptTables, inScope: (s: SectionId) => boolean, here?: SectionId): readonly DefinitionRow[] => {
  const introAt = new Map<string, number>();
  t.coverage.forEach((c, i) => c.introduces.forEach((id) => { if (!introAt.has(id)) introAt.set(id, i); }));
  return t.concepts
    .filter((c) => inScope(sectionId(c.section)) && (c.symbol !== undefined || c.terms.length > 0 || (c.kind === 'definition' && introAt.has(c.id))))
    .map((c, i) => {
      const rows = t.variables.filter((v) => v.concept === c.id && v.sym === c.symbol);
      const v = rows.find((r) => r.section === here) ?? rows.find((r) => r.section === c.section) ?? rows[0];
      const main = mainForm(c);
      const row: DefinitionRow = { key: c.id, concept: c, section: sectionId(c.section), symbols: v ? [v] : [], formulas: c.kind === 'definition' && main ? [main] : [], unit: v?.unit ?? '' };
      return { row, at: introAt.get(c.id) ?? Infinity, i };
    })
    .sort((a, b) => a.at - b.at || a.i - b.i).map((x) => x.row);
};

/* What a formula says it is, on the line above it in the Formulas list. A
   definition's formula defines its symbol, or its name where it has none. */
export type FormulaLabel =
  | { readonly kind: 'defines'; readonly tex?: string; readonly word: string }
  | { readonly kind: 'states'; readonly tag: string; readonly word: string };
export const formulaLabel = (c: ConceptDTO, symbolOf: (c: ConceptDTO) => string | undefined): FormulaLabel =>
  (c.kind === 'definition' ? { kind: 'defines', tex: symbolOf(c), word: c.name } : { kind: 'states', tag: KIND_LABEL[c.kind], word: c.name });
