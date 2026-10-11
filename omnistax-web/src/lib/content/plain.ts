/* The text one fragment of a head reads as: tags dropped, prerendered math back to the $…$ it was written as, entities decoded, whitespace collapsed.
   A tag walk, as in linkFigureRefs: KaTeX markup is a tree whose visual branch repeats the symbols, so inside it only the TeX annotation is kept. */
const KATEX = /^<span\b[^>]*\bclass="katex/;
const TEX = /^<annotation\b[^>]*x-tex/;
const unesc = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const plainText = (html: string): string => {
  let depth = 0, tex = false, out = '';   /* depth: elements open inside a katex span, 0 outside one; tex: the text that follows is an annotation's */
  html.split(/(<[^>]+>)/).forEach((part) => {
    if (!part.startsWith('<')) { out += tex ? `$${part.trim()}$` : depth === 0 ? part : ''; return; }
    if (depth === 0) { if (KATEX.test(part)) depth = 1; return; }
    depth += part.startsWith('</') ? -1 : part.endsWith('/>') ? 0 : 1;
    tex = TEX.test(part);
  });
  return unesc(out).replace(/\s+/g, ' ').trim();
};
