/* The pinned concept and what it points at: the spans that introduce and use
   it, and the exercises that test it. Exercise cards read `pinned` themselves. */
import { registry } from './registry.svelte';
import { type ConceptId, type SpanId, spanId, exerciseDomId, sectionId } from '../types/ids';

export type Spans = { readonly intro: readonly SpanId[]; readonly uses: readonly SpanId[] };
export const spansOf = (id: ConceptId): Spans => {
  const intro: SpanId[] = [], uses: SpanId[] = [];
  registry.coverage.forEach((c) => { if (c.introduces.includes(id)) intro.push(spanId(c.span)); if ([...c.uses, ...c.reinforces].includes(id)) uses.push(spanId(c.span)); });
  return { intro, uses };
};
export const testedBy = (id: ConceptId): SpanId[] =>
  Object.entries(registry.sections).flatMap(([sec, s]) => s.exercises.filter((e) => e.concepts.includes(id)).map((e) => exerciseDomId(sectionId(sec), e.id)));

class Pin {
  pinned = $state<ConceptId | null>(null);
  toggle(id: ConceptId): void { this.pinned = this.pinned === id ? null : id; }
  clear(): void { this.pinned = null; }
}
export const pin = new Pin();
