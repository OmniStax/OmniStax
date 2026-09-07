/* Scroll-spy on the focused pane: which span is under the reading line, so the
   contents and the concept map can follow. */
import { type SpanId, spanId } from '../types/ids';

export type SpyState = { readonly span: SpanId | null; readonly section: SpanId | null };
class Spy {
  current = $state<SpyState>({ span: null, section: null });
  read(pane: HTMLElement | null): void {
    const doc = pane?.querySelector<HTMLElement>('[data-doc]');
    if (!pane || !doc) { this.current = { span: null, section: null }; return; }
    const line = pane.getBoundingClientRect().top + pane.clientHeight * 0.25;
    let hit: HTMLElement | null = null;
    doc.querySelectorAll<HTMLElement>('section[id], .example[id]').forEach((sp) => { const r = sp.getBoundingClientRect(); if (r.top <= line && r.bottom > line) hit = sp; });
    const el = hit as HTMLElement | null;
    const sec = el?.closest('section');
    const next: SpyState = { span: el ? spanId(el.id) : null, section: sec ? spanId(sec.id) : el ? spanId(el.id) : null };
    if (next.span !== this.current.span || next.section !== this.current.section) this.current = next;
  }
}
export const spy = new Spy();
