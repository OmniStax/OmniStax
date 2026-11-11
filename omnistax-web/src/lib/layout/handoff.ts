/* What a page's components hold only in themselves — words typed and not yet
   sent, what is folded away — handed to the page a split opens beside it. A
   component says what it would lend for as long as it is mounted; a copy asks
   every lender of the one page and leaves the answers for the other, whose
   components take them once as they mount. After that the two pages are each
   their own. */
import type { ItemKey } from './model';

const lenders = new Map<ItemKey, Map<string, () => unknown>>();
const left = new Map<ItemKey, Map<string, unknown>>();

/* Lend one part of a page for as long as the component stands; the function returned stops it. */
export const lends = (page: ItemKey, part: string, give: () => unknown): (() => void) => {
  const parts = lenders.get(page) ?? new Map<string, () => unknown>();
  lenders.set(page, parts); parts.set(part, give);
  return () => { if (parts.get(part) === give) parts.delete(part); if (!parts.size && lenders.get(page) === parts) lenders.delete(page); };
};
/* What was left for one part of a page, taken. */
export const inherit = <T>(page: ItemKey, part: string): T | undefined => {
  const parts = left.get(page); if (!parts?.has(part)) return undefined;
  const value = parts.get(part) as T;
  parts.delete(part); if (!parts.size) left.delete(page);
  return value;
};
/* The same answers are left for the page that gave them: a split that turns a
   lone group into two draws that group again, and its components come back
   asking for what they held. */
export const handOver = (from: ItemKey, to: ItemKey): void => {
  const parts = lenders.get(from); if (!parts?.size) return;
  const given = [...parts].map(([part, give]) => [part, give()] as const);
  left.set(to, new Map(given)); left.set(from, new Map(given));
};
/* What nobody took is let go, so a page drawn again later does not find it. */
export const letGo = (...pages: readonly ItemKey[]): void => { pages.forEach((page) => left.delete(page)); };
