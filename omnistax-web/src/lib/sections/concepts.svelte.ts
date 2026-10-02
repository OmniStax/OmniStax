/* The pinned concept and what it points at: the spans that introduce and use
   it, and the exercises that test it. Exercise cards read `pinned` themselves. */
import { registry } from './registry.svelte';
import type { ExerciseDTO } from '../content/schema';
import { goSpanFromView, openSectionFromView, type Opening } from './nav.svelte';
import { type BookId, type ConceptId, type SectionId, type SpanId, spanId, spanRef, sectionRef, sectionId } from '../types/ids';

export type Spans = { readonly intro: readonly SpanId[]; readonly uses: readonly SpanId[] };
export const spansOf = (book: BookId, id: ConceptId): Spans => {
  const intro: SpanId[] = [], uses: SpanId[] = [];
  registry.coverage(book).forEach((c) => { if (c.introduces.includes(id)) intro.push(spanId(c.span)); if ([...c.uses, ...c.reinforces].includes(id)) uses.push(spanId(c.span)); });
  return { intro, uses };
};
/* Where a concept is introduced, opened as a reference view opens things; its
   section when no span is known to introduce it. The spans are read from the
   concept's chapter, which is loaded first. */
export const goConceptFromView = async (book: BookId, id: ConceptId, how: Opening): Promise<void> => {
  await registry.ensureBook(book);
  const c = registry.concept(book, id); if (!c) return;
  const ref = sectionRef(book, sectionId(c.section));
  const ch = registry.chapterOf(ref); if (ch) await registry.loadChapter(book, ch.dir).catch(() => {});
  const at = spansOf(book, id).intro[0];
  if (at) goSpanFromView(spanRef(book, at), how); else void openSectionFromView(ref, how);
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
