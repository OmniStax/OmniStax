/* A tidy tree of boxes of any size: root at the top, each child row under its
   parent's box, siblings left to right in the order given, every subtree pushed
   against its left neighbours only as far as keeps them apart, and each parent
   centred over its first and last child. Pure, so a chat, a drawing and a note
   embed lay out the same way. */

export type Size = { readonly w: number; readonly h: number };
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type Gaps = { readonly x: number; readonly y: number };

const GAPS: Gaps = { x: 24, y: 32 };

type Placed<Id> = readonly (readonly [Id, Box])[];

const shifted = <Id>(boxes: Placed<Id>, dx: number, dy = 0): Placed<Id> =>
  boxes.map(([id, b]) => [id, { ...b, x: b.x + dx, y: b.y + dy }] as const);

const overlapY = (a: Box, b: Box): boolean => a.y < b.y + b.h && b.y < a.y + a.h;

/* How far right `next` must move to clear everything already placed by the gap. */
const clearance = <Id>(placed: Placed<Id>, next: Placed<Id>, gap: number): number =>
  placed.reduce((most, [, a]) => next.reduce((m, [, b]) => (overlapY(a, b) ? Math.max(m, a.x + a.w + gap - b.x) : m), most), -Infinity);

/* A subtree with its root's box at y = 0 and its left edge at x = 0. */
const subtree = <Id>(id: Id, childrenOf: (id: Id) => readonly Id[], sizeOf: (id: Id) => Size, gaps: Gaps, seen: Set<Id>): Placed<Id> => {
  seen.add(id);
  const { w, h } = sizeOf(id);
  const kids = childrenOf(id).filter((k) => !seen.has(k));
  if (kids.length === 0) return [[id, { x: 0, y: 0, w, h }]];
  const rows = kids.map((k) => shifted(subtree(k, childrenOf, sizeOf, gaps, seen), 0, h + gaps.y));
  const { boxes, roots } = rows.reduce<{ boxes: Placed<Id>; roots: Box[] }>((acc, row) => {
    const prev = acc.roots[acc.roots.length - 1];
    /* Sibling order holds even for boxes of no height, which overlap nothing. */
    const dx = prev === undefined ? 0 : Math.max(clearance(acc.boxes, row, gaps.x), prev.x + prev.w + gaps.x - row[0][1].x);
    const moved = shifted(row, dx);
    return { boxes: [...acc.boxes, ...moved], roots: [...acc.roots, moved[0][1]] };
  }, { boxes: [], roots: [] });
  const first = roots[0], last = roots[roots.length - 1];
  const centre = (first.x + first.w / 2 + last.x + last.w / 2) / 2;
  const all: Placed<Id> = [[id, { x: centre - w / 2, y: 0, w, h }], ...boxes];
  const left = Math.min(...all.map(([, b]) => b.x));
  return shifted(all, -left);
};

export const layoutTree = <Id>(root: Id, childrenOf: (id: Id) => readonly Id[], sizeOf: (id: Id) => Size, gaps: Gaps = GAPS): ReadonlyMap<Id, Box> =>
  new Map(subtree(root, childrenOf, sizeOf, gaps, new Set()));

/* The rectangle every box lies in. */
export const boundsOf = (boxes: Iterable<Box>): Box => {
  const all = [...boxes];
  if (all.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...all.map((b) => b.x)), y = Math.min(...all.map((b) => b.y));
  return { x, y, w: Math.max(...all.map((b) => b.x + b.w)) - x, h: Math.max(...all.map((b) => b.y + b.h)) - y };
};

/* Whether two boxes share any point, which is what a lasso touching a box means. */
export const meets = (a: Box, b: Box): boolean => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
