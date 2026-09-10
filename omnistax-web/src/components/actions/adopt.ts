/* Put an existing DOM element inside this node. Documents are static HTML that
   keep running figures and typed answers, so they are moved, never re-rendered. */
export function adopt(node: HTMLElement, el: HTMLElement | null) {
  const place = (e: HTMLElement | null) => { if (e && e.parentNode !== node) node.replaceChildren(e); if (!e) node.replaceChildren(); };
  place(el);
  return { update: place };
}
