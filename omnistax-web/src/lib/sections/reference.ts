/* What a book teaches, as concepts (RULES item 6): the concept is the one
   record, and its word, its symbol and its forms hang off it. These are the
   pure lookups every reader of the concepts shares — the Reference view, the
   cards, the notes, the marking of the text — so that a term, a symbol and an
   equation of one concept are found the same way wherever they are hovered. */
import type { ConceptDTO, ConceptKind, CoverageDTO, FormDTO, VariableDTO } from '../content/schema';

export const KIND_LABEL: Readonly<Record<ConceptKind, string>> = { definition: 'Definition', axiom: 'Axiom', result: 'Result', idea: 'Idea', skill: 'Skill' };
/* The five kinds in the order the legends teach them. */
export const KINDS = Object.keys(KIND_LABEL) as readonly ConceptKind[];

/* One form with the concept it states. */
export type Stated = { readonly form: FormDTO; readonly concept: ConceptDTO };
export const statedOf = (concepts: readonly ConceptDTO[]): readonly Stated[] => concepts.flatMap((concept) => concept.forms.map((form) => ({ form, concept })));
export const formById = (concepts: readonly ConceptDTO[], id: string): Stated | undefined => statedOf(concepts).find((s) => s.form.id === id);

/* The concept a glossary word names, the case of the word aside. The book may
   gloss one word twice ("power" of a force and of a lens), so the concepts the
   reader stands near are asked first. */
export const conceptOfTerm = (concepts: readonly ConceptDTO[], term: string, near: (c: ConceptDTO) => boolean = () => true): ConceptDTO | undefined => {
  const t = term.trim().toLowerCase();
  const named = concepts.filter((c) => c.terms.some((w) => w.toLowerCase() === t));
  return named.find(near) ?? named[0];
};

/* The words to mark in a chapter's prose: the terms of the concepts it
   introduces and of the ones its spans deal with, among the concepts its data
   carries, so that every word marked has a card to open. */
export const chapterTerms = (concepts: readonly ConceptDTO[], sections: ReadonlySet<string>, covered: ReadonlySet<string>): readonly string[] =>
  [...new Set(concepts.filter((c) => sections.has(c.section) || covered.has(c.id)).flatMap((c) => c.terms))];

/* One row of the Reference view: a concept the book has built, and the unit of
   the symbol it is denoted by, read off that symbol's meaning in the concept's
   own section where it has one there. */
export type ReferenceRow = { readonly concept: ConceptDTO; readonly unit: string };
export const referenceRows = (concepts: readonly ConceptDTO[], coverage: readonly CoverageDTO[], variables: readonly VariableDTO[]): readonly ReferenceRow[] => {
  const introAt = new Map<string, number>();
  coverage.forEach((c, i) => c.introduces.forEach((id) => { if (!introAt.has(id)) introAt.set(id, i); }));
  const unitOf = (c: ConceptDTO): string => {
    const rows = variables.filter((v) => v.concept === c.id && v.sym === c.symbol);
    return (rows.find((v) => v.section === c.section) ?? rows[0])?.unit ?? '';
  };
  return concepts
    .filter((c) => c.status === 'built')
    .map((concept, i) => ({ row: { concept, unit: unitOf(concept) }, at: introAt.get(concept.id) ?? Infinity, i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map((x) => x.row);
};
