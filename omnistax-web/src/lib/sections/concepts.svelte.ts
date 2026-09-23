/* The pinned concept and what it points at: the spans that introduce and use
   it, and the exercises that test it. Exercise cards read `pinned` themselves. */
import { registry } from './registry.svelte';
import type { ExerciseDTO } from '../content/schema';
import { type BookId, type ConceptId, type SectionId, type SpanId, spanId } from '../types/ids';

export type Spans = { readonly intro: readonly SpanId[]; readonly uses: readonly SpanId[] };
export const spansOf = (book: BookId, id: ConceptId): Spans => {
  const intro: SpanId[] = [], uses: SpanId[] = [];
  registry.coverage(book).forEach((c) => { if (c.introduces.includes(id)) intro.push(spanId(c.span)); if ([...c.uses, ...c.reinforces].includes(id)) uses.push(spanId(c.span)); });
  return { intro, uses };
};
/* The exercises that test a concept, each with the section it is set in, kept whole
   so a caller can name the exercise by its kind. */
export const testers = (book: BookId, id: ConceptId): readonly { section: SectionId; ex: ExerciseDTO }[] =>
  registry.sectionsOf(book).flatMap(([section, s]) => s.exercises.filter((e) => e.concepts.includes(id)).map((ex) => ({ section, ex })));

class Pin {
  pinned = $state<ConceptId | null>(null);
  toggle(id: ConceptId): void { this.pinned = this.pinned === id ? null : id; }
  clear(): void { this.pinned = null; }
}
export const pin = new Pin();
