/* Put an existing DOM element inside this node. Documents are static HTML that
   keep running figures and typed answers, so they are moved, never re-rendered.
   The reading place travels with the document: the first element at the top of
   the scroller and its offset, put back when a new pane takes the document in
   and whenever the pane's width changes. */
type Anchor = { readonly el: Element; readonly off: number };
const places = new WeakMap<HTMLElement, Anchor>();

const anchorIn = (root: Element, top: number): Element => {
  for (const c of root.children) {
    const r = c.getBoundingClientRect();
    if (r.bottom > top) return r.top < top && c.children.length ? anchorIn(c, top) : c;
  }
  return root;
};

export function adopt(node: HTMLElement, el: HTMLElement | null) {
  let doc: HTMLElement | null = null;
  const scroller = node.parentElement;
  const save = () => {
    if (!doc || doc.parentNode !== node || !scroller?.clientWidth) return;
    const top = scroller.getBoundingClientRect().top, a = anchorIn(doc, top);
    places.set(doc, { el: a, off: a.getBoundingClientRect().top - top });
  };
  const place = (e: HTMLElement | null) => { doc = e; if (e && e.parentNode !== node) node.replaceChildren(e); if (!e) node.replaceChildren(); };
  const restore = () => {
    const p = doc && places.get(doc);
    if (!p || doc?.parentNode !== node || !scroller?.clientWidth || !doc.contains(p.el)) return;
    const d = p.el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - p.off;
    if (Math.abs(d) >= 1) scroller.scrollBy({ top: d, behavior: 'instant' });
  };
  place(el);
  restore();
  let width = scroller?.clientWidth ?? 0;
  const resized = new ResizeObserver(() => { const w = scroller?.clientWidth ?? 0; if (w !== width) { width = w; restore(); } });
  scroller?.addEventListener('scroll', save, { passive: true });
  if (scroller) resized.observe(scroller);
  return { update: place, destroy: () => { scroller?.removeEventListener('scroll', save); resized.disconnect(); } };
}
