/* Finding one thing among what a view lists. A concept, a symbol, a term and a
   formula each have a key — the name the view prints it by — and a line of text
   beside it: why the concept matters, what the symbol stands for, the term's
   definition, the condition a formula holds under. A query finds an item when
   every word of it is somewhere in the key or in the text, case aside, and the
   items whose key is hit stand before the ones only their text is. What the
   view searches is what its level covers and no more; that cut is the view's,
   made before the list comes here. Pure. */

/* The two strings an item is found by. */
export type Findable = { readonly key: string; readonly text: string };
export type Found<T> = { readonly item: T; readonly where: 'key' | 'text' };

/* The words of a query, lowercased; a blank query has none and finds nothing. */
export const wordsOf = (query: string): readonly string[] => query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);

/* Whether every word is in the string, case aside. TeX control words and braces are
   let through as they are, so `\omega` finds `\omega` and `omega` finds it too. */
const hasAll = (s: string, words: readonly string[]): boolean => { const l = s.toLowerCase(); return words.every((w) => l.includes(w)); };

/* The items a query finds, key hits first and the given order kept within each group. */
export const search = <T>(query: string, items: readonly T[], of: (item: T) => Findable): readonly Found<T>[] => {
  const words = wordsOf(query);
  if (!words.length) return [];
  const hit = items.flatMap((item): Found<T>[] => {
    const f = of(item);
    return hasAll(f.key, words) ? [{ item, where: 'key' }] : hasAll(`${f.key} ${f.text}`, words) ? [{ item, where: 'text' }] : [];
  });
  return [...hit.filter((h) => h.where === 'key'), ...hit.filter((h) => h.where === 'text')];
};
