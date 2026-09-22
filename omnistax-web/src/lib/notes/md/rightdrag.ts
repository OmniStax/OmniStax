/* Selecting words with the right button.

   The reader's left button drags a card out of a panel, so the gesture that
   would ordinarily sweep across the words — press and pull — is spoken for.
   The right button takes its place. No browser makes a selection out of a
   right-button drag on its own, so the whole gesture is built here out of
   pointer events: the press fixes one end of the selection at the caret under
   it, every move puts the other end at the caret under the pointer, and the
   menu a right button would normally raise is swallowed only when the pointer
   actually travelled — a right click that stayed still is still a right click,
   and still gets its menu.

   Nothing here decides which button does what; that is the caller's. These are
   the pieces it needs: where the caret is under a point, and whether a gesture
   has gone far enough to be a drag. */

/* How far the pointer must travel before a press counts as a drag rather than
   a click, in CSS pixels. */
export const DRAG_SLOP = 4;

/* Squared distance, so the test never takes a square root. */
export const crossedSlop = (dx: number, dy: number, slop: number = DRAG_SLOP): boolean =>
  dx * dx + dy * dy >= slop * slop;

/* One end of a selection: a node and an offset into it. */
export type Caret = { node: Node; offset: number };

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/* The caret under a point. Chromium and Firefox answer `caretPositionFromPoint`,
   WebKit `caretRangeFromPoint`; between them every engine the book runs in can
   say where in the text a pixel falls. */
export function caretAt(x: number, y: number, doc: Document = document): Caret | null {
  const d = doc as CaretDocument;
  if (typeof d.caretPositionFromPoint === 'function') {
    const p = d.caretPositionFromPoint(x, y);
    if (p) return { node: p.offsetNode, offset: p.offset };
  }
  if (typeof d.caretRangeFromPoint === 'function') {
    const r = d.caretRangeFromPoint(x, y);
    if (r) return { node: r.startContainer, offset: r.startOffset };
  }
  return null;
}

/* Put the selection between two carets. `setBaseAndExtent` says both ends at
   once and, unlike `extend`, does not mind which way round they are. */
export function selectBetween(from: Caret, to: Caret, win: Window = window): void {
  const sel = win.getSelection();
  if (!sel) return;
  try { sel.setBaseAndExtent(from.node, from.offset, to.node, to.offset); } catch { /* ends in different roots */ }
}

/* A selection gesture in flight: it takes the moves, and it knows whether it
   has travelled far enough that the menu at its end should be swallowed. */
export type SelectDrag = { move: (x: number, y: number) => void; readonly moved: boolean };

/* Begin selecting from a point. Null where the point is over no text at all,
   in which case the caller should leave the gesture to the browser. */
export function beginSelect(x: number, y: number, doc: Document = document): SelectDrag | null {
  const anchor = caretAt(x, y, doc);
  if (!anchor) return null;
  const win = doc.defaultView ?? window;
  let moved = false;
  selectBetween(anchor, anchor, win);
  return {
    get moved() { return moved; },
    move(mx: number, my: number) {
      if (!moved && !crossedSlop(mx - x, my - y)) return;
      moved = true;
      const focus = caretAt(mx, my, doc);
      if (focus) selectBetween(anchor, focus, win);
    },
  };
}
