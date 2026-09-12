/* Scroll-spy on the focused pane: which span is under the reading line, so the
   contents and the concept map can follow. A folded span is only as tall as its
   heading and still counts while that straddles the line; a span hidden inside a
   folded one has an empty box and never does. The shell re-reads after a fold. */
import { type SpanId, spanId } from '../types/ids';

export type SpyState = { readonly span: SpanId | null; readonly section: SpanId | null };
class Spy {
  current = $state<SpyState>({ span: null, section: null });
  read(pane: HTMLElement | null): void {
    const doc = pane?.querySelector<HTMLElement>('[data-doc]');
    if (!pane || !doc) { this.current = { span: null, section: null }; return; }
    const line = pane.getBoundingClientRect().top + pane.clientHeight * 0.25;
    /* The spans stand in document order, so the walk stops at the first one that
       begins below the reading line: everything after it begins lower still.
       Measuring a span asks the browser for the page's layout, and this runs on
       every scroll and every time the layout settles, so the spans below the
       line are worth not measuring at all. */
    const spans = doc.querySelectorAll<HTMLElement>('section[id], .example[id]');
    let el: HTMLElement | null = null;
    for (const sp of spans) {
      const r = sp.getBoundingClientRect();
      if (r.top > line) break;
      if (r.height > 0 && r.bottom > line) el = sp;
    }
    const sec = el?.closest('section');
    const next: SpyState = { span: el ? spanId(el.id) : null, section: sec ? spanId(sec.id) : el ? spanId(el.id) : null };
    if (next.span !== this.current.span || next.section !== this.current.section) this.current = next;
  }
}
export const spy = new Spy();
