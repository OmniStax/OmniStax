/* Highlights on a document: a text index over the article's prose, offsets for
   a live selection, and the marks that wrap the anchored text. A document open
   twice is painted twice, from the same anchors. */
import { locate, type Anchor, type Span } from './anchor';

/* Text no reader sees as words: scripts, the hidden MathML, and the controls. */
const UNSEEN = 'script, style, .katex-mathml, button, input, select, textarea';
/* Text a highlight cannot hold on to. A figure's head and caption are the
   book's words, as in the search index; the rest of it — the drawing, its
   controls and readouts, and the original's caption, built only when asked
   for — changes with the figure's state or is not there in every copy. */
const UNANCHORED = `${UNSEEN}, figure > :not(.sim-head, figcaption), .ocap, .footer, .page-nav, .exercises .bar`;
type Seg = { readonly node: Text; readonly start: number };
export type Index = { readonly full: string; readonly segs: readonly Seg[] };

const indexOf = (root: HTMLElement, skip: string): Index => {
  const segs: Seg[] = []; let full = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE ? ((n as Element).matches(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = n as Text; segs.push({ node: t, start: full.length }); full += t.data; }
  return { full, segs };
};
/* The text highlights anchor in. */
export const textIndex = (root: HTMLElement): Index => indexOf(root, UNANCHORED);
/* The text a reader reads, live figures included: what a selection says. */
export const wordsIndex = (root: HTMLElement): Index => indexOf(root, UNSEEN);
/* Where a point (container, offset) of a Range falls in the index; null if it is in skipped content. */
const pointOffset = (ix: Index, container: Node, offset: number): number | null => {
  if (container.nodeType === Node.TEXT_NODE) { const s = ix.segs.find((x) => x.node === container); return s ? s.start + offset : null; }
  const probe = document.createRange(); probe.setStart(container, offset); probe.collapse(true);
  let pos = 0;
  for (const s of ix.segs) {
    const r = document.createRange(); r.selectNodeContents(s.node);
    if (probe.compareBoundaryPoints(Range.START_TO_START, r) <= 0) return pos;   /* the point is before this text */
    pos = s.start + s.node.data.length;
  }
  return pos;
};
export const rangeSpan = (ix: Index, range: Range): Span | null => {
  const start = pointOffset(ix, range.startContainer, range.startOffset), end = pointOffset(ix, range.endContainer, range.endOffset);
  return start === null || end === null || end <= start ? null : { start, end };
};
export const spanOfAnchor = (ix: Index, a: Anchor): Span | null => locate(ix.full, a);

const MARK = 'hl';
/* Wrap the text of a span in marks, one per text node it touches. Splitting text nodes does not change the index's string. */
export const wrap = (ix: Index, span: Span, id: string, color: string, noted: boolean): void => {
  ix.segs.forEach((seg) => {
    const len = seg.node.data.length, a = Math.max(span.start, seg.start), b = Math.min(span.end, seg.start + len);
    if (b <= a) return;   /* a copy is painted while still detached, before its pane adopts it */
    let node = seg.node;
    if (b - seg.start < len) node.splitText(b - seg.start);
    if (a > seg.start) node = node.splitText(a - seg.start);
    if (!node.data.trim() && node.data.length < 2) return;
    const m = document.createElement('mark'); m.className = `${MARK} ${MARK}-${color}`; m.dataset.note = id; if (noted) m.dataset.noted = '1';
    node.parentNode?.insertBefore(m, node); m.appendChild(node);
  });
};
export const unwrapAll = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>(`mark.${MARK}`).forEach((m) => { const p = m.parentNode; if (!p) return; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); });
  root.normalize();
};
export type Painted = { readonly id: string; readonly anchor: Anchor; readonly color: string; readonly noted: boolean };
/* Repaint a document from scratch: unwrap, index once, wrap every note that still anchors. Returns the ids that did not. */
export const paint = (root: HTMLElement, notes: readonly Painted[]): string[] => {
  unwrapAll(root); if (!notes.length) return [];
  const ix = textIndex(root); const lost: string[] = [];
  /* later spans first, so splitting a node never disturbs an earlier span's offsets in the same node */
  const placed = notes.map((n) => ({ n, s: spanOfAnchor(ix, n.anchor) })).filter((x): x is { n: Painted; s: Span } => { if (!x.s) lost.push(x.n.id); return !!x.s; });
  placed.sort((a, b) => b.s.start - a.s.start).forEach(({ n, s }) => wrap(textIndex(root), s, n.id, n.color, n.noted));
  return lost;
};
export const setNoted = (root: ParentNode, id: string, noted: boolean): void => root.querySelectorAll<HTMLElement>(`mark.${MARK}[data-note="${id}"]`).forEach((m) => { if (noted) m.dataset.noted = '1'; else delete m.dataset.noted; });
export const setColor = (root: ParentNode, id: string, color: string): void => root.querySelectorAll<HTMLElement>(`mark.${MARK}[data-note="${id}"]`).forEach((m) => { m.className = `${MARK} ${MARK}-${color}`; });
