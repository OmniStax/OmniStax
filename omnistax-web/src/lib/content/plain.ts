/* A tag, its quoted attribute values whole (a value may hold a `>` or a `$`), or a comment. A `<` that
   opens no tag name followed by a space, `>` or `/` (`$a<b$`) is text. */
export const TAG = /<\/?[A-Za-z][\w:-]*(?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?\/?>|<!--[\s\S]*?-->/g;
/* The text between the tags, each run handed to f; the tags and their attribute values pass untouched. */
export const mapText = (html: string, f: (text: string) => string): string => {
  let out = '', last = 0;
  for (const m of html.matchAll(TAG)) { out += f(html.slice(last, m.index)) + m[0]; last = m.index! + m[0].length; }
  return out + f(html.slice(last));
};
/* The text one fragment of a head reads as: tags dropped, prerendered math back to the $…$ it was written as, entities decoded, whitespace collapsed.
   A tag walk, as in linkFigureRefs: KaTeX markup is a tree whose visual branch repeats the symbols, so inside it only the TeX annotation is kept. */
/* A heading may carry a note's marker after its words (root rule 13): the marker names no part of the heading,
   so a heading's name, in the outline, the search index or a card, is read without it. */
export const NOTE_MARK = /<sup\b[^>]*\bclass="fn\b[^"]*"[^>]*>[\s\S]*?<\/sup>/g;
export const NOTE_MARK_SELECTOR = 'sup.fn';
export const withoutNoteMarks = (html: string): string => html.replace(NOTE_MARK, '');
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
