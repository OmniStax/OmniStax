/* Scroll-spy on the focused pane: which span is under the reading line, so the
   contents and the concept map can follow. A folded span is only as tall as its
   heading and still counts while that straddles the line; a span hidden inside a
   folded one has an empty box and never does. The shell re-reads after a fold. */
import { type SpanRef, bookId, spanId, spanRef } from '../types/ids';

export type SpyState = { readonly span: SpanRef | null; readonly section: SpanRef | null };
const NONE: SpyState = { span: null, section: null };
const sameRef = (a: SpanRef | null, b: SpanRef | null): boolean => a?.book === b?.book && a?.span === b?.span;
class Spy {
  current = $state<SpyState>(NONE);
  read(pane: HTMLElement | null): void {
    const doc = pane?.querySelector<HTMLElement>('[data-doc]');
    const book = doc?.closest<HTMLElement>('[data-book]')?.dataset.book;
    if (!pane || !doc || !book) { this.current = NONE; return; }
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
    const ref = (id: string): SpanRef => spanRef(bookId(book), spanId(id));
    const sec = el?.closest('section');
    const next: SpyState = { span: el ? ref(el.id) : null, section: sec ? ref(sec.id) : el ? ref(el.id) : null };
    if (!sameRef(next.span, this.current.span) || !sameRef(next.section, this.current.section)) this.current = next;
  }
}
export const spy = new Spy();
