/* The pinned concept and the spans that introduce and use it. Exercise cards
   read `pinned` themselves. */
import { registry } from './registry.svelte';
import { type ConceptId, type SpanId, spanId } from '../types/ids';

export type Spans = { readonly intro: readonly SpanId[]; readonly uses: readonly SpanId[] };
export const spansOf = (id: ConceptId): Spans => {
  const intro: SpanId[] = [], uses: SpanId[] = [];
  registry.coverage.forEach((c) => { if (c.introduces.includes(id)) intro.push(spanId(c.span)); if ([...c.uses, ...c.reinforces].includes(id)) uses.push(spanId(c.span)); });
  return { intro, uses };
};
class Pin {
  pinned = $state<ConceptId | null>(null);
  toggle(id: ConceptId): void { this.pinned = this.pinned === id ? null : id; }
  clear(): void { this.pinned = null; }
}
export const pin = new Pin();
