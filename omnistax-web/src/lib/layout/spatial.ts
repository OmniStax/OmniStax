/* Which group lies in a given direction on the screen. The split tree alone
   cannot answer that — a group two levels down may still sit immediately to the
   right — so the choice is made from the rectangles the browser reports. Pure,
   so it can be checked without a browser. */

export type Rect = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
export type Dir = 'left' | 'right' | 'up' | 'down';
export type GroupRect = { readonly index: number; readonly rect: Rect };

const TOLERANCE = 4;   /* neighbours that share a rule may overlap by a pixel or two and still count as beyond it */
const gap = (from: Rect, r: Rect, dir: Dir): number =>
  dir === 'right' ? r.left - from.right : dir === 'left' ? from.left - r.right : dir === 'down' ? r.top - from.bottom : from.top - r.bottom;
const overlap = (from: Rect, r: Rect, dir: Dir): number =>
  dir === 'left' || dir === 'right' ? Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top) : Math.min(from.right, r.right) - Math.max(from.left, r.left);

/* The group to move to: one that lies beyond the focused group's far edge and
   still shares some of the other axis with it, nearest first and, where two are
   equally near, the one that faces the focused group most squarely. */
export const groupToward = (from: Rect, others: readonly GroupRect[], dir: Dir): number | null => {
  const ranked = others
    .map((o) => ({ index: o.index, gap: gap(from, o.rect, dir), overlap: overlap(from, o.rect, dir) }))
    .filter((o) => o.gap >= -TOLERANCE && o.overlap > 0)
    .sort((a, b) => a.gap - b.gap || b.overlap - a.overlap);
  return ranked.length ? ranked[0].index : null;
};
