/* A phrase the section's builder judged to name a concept is written
   <span data-concept="…">: the build gives it the concept's type, so it wears that
   type's colour as a <span data-type> does, and an untyped concept's phrase stays ink.
   A span that already carries a type keeps its own. */
import type { ConceptRowDTO } from './schema';
import { type ConceptId, type TypeId, conceptId } from '../types/ids';

/* The type each typed concept of a book wears. */
export type ConceptTypes = ReadonlyMap<ConceptId, TypeId>;

export const conceptTypes = (concepts: readonly ConceptRowDTO[]): ConceptTypes =>
  new Map(concepts.flatMap((c) => (c.type ? [[c.id, c.type] as const] : [])));

const CONCEPT_SPAN = /<span\b[^>]*\sdata-concept="([^"]*)"[^>]*>/g;

const typedTag = (types: ConceptTypes, tag: string, id: string): string => {
  const type = types.get(conceptId(id));
  if (type === undefined || /\sdata-type=/.test(tag)) return tag;
  return `${tag.slice(0, -1)} data-type="${type}">`;
};

/* The HTML with every concept span of a typed concept carrying its type. Running it twice changes nothing. */
export const typeConceptSpans = (types: ConceptTypes, html: string): string =>
  html.replace(CONCEPT_SPAN, (tag, id: string) => typedTag(types, tag, id));

/* Every concept id the HTML's spans name, each once. */
export const conceptSpanIds = (html: string): readonly string[] =>
  [...new Set(Array.from(html.matchAll(CONCEPT_SPAN), (m) => m[1]))];
