/* What a book teaches, as concepts (RULES item 6): the concept is the one
   record, and its word, its symbol and its forms hang off it. These are the
   pure lookups every reader of the concepts shares — the cards, the notes, the
   marking of the text — so that a term, a symbol and an equation of one
   concept are found the same way wherever they are hovered. */
import type { ConceptDTO, ConceptKind, FormDTO } from '../content/schema';

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
