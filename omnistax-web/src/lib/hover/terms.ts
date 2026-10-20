/* Marking example and figure references in a section's prose, as a pure
   transform of its HTML: every "Example 16.2" or "Figure 16.4" the book holds
   becomes a link. Text inside links, headings and rendered math is never
   touched, nor is a figure's caption or an exercise card. A glossary word is
   not marked here: it is underlined only where the builder judged it names a
   concept and wrote <span data-concept="…"> (RULES item 7). The tokeniser is
   the same tag-splitting scan the build uses for figure references
   (content/fragment.ts). */

export type ExampleNumber = string & { readonly __brand: 'ExampleNumber' };   /* "16.2" */
export const exampleNumber = (s: string): ExampleNumber => s as ExampleNumber;

/* Where a text run sits: in a paragraph or list item (a formula may be marked), and under nothing that forbids it. */
export type Context = { readonly block: number; readonly link: number; readonly heading: number; readonly math: number };
export const TOP: Context = { block: 0, link: 0, heading: 0, math: 0 };            /* the whole article */
export const IN_BLOCK: Context = { ...TOP, block: 1 };                             /* the innerHTML of one <p> or <li> */

/* One piece of the split: a tag, or the run of text between two tags. */
export type Token = string;
export const tokens = (html: string): Token[] => html.split(/(<[^>]+>)/).filter((t) => t !== '');
const isTag = (t: Token): boolean => t.startsWith('<');
const tagName = (t: Token): string => /^<\/?([a-zA-Z][\w-]*)/.exec(t)?.[1]?.toLowerCase() ?? '';
const closes = (t: Token): boolean => t.startsWith('</');
const selfClosing = (t: Token): boolean => t.endsWith('/>');
const hasClass = (t: Token, c: string): boolean => new RegExp(`\\bclass="[^"]*\\b${c}\\b`).test(t);

const BLOCK = new Set(['p', 'li']);
const HEADING = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/* Rendered math is a <span class="katex…"> tree (and its <math> twin); a figure caption, an exercise host,
   and a thing of the book an answer already names by a link are forbidden as wholes. */
const FORBIDS = (t: Token): boolean => tagName(t) === 'math' || (tagName(t) === 'span' && hasClass(t, 'katex')) || tagName(t) === 'figure' || hasClass(t, 'exercises') || hasClass(t, 'book-word') || hasClass(t, 'wiki');

/* The context of every token, from a scan that opens and closes at each tag. Forbidding subtrees are tracked by depth. */
export const contexts = (ts: readonly Token[], start: Context): Context[] => {
  let c = start; let forbid: string[] = [];   /* tag names of open forbidding elements */
  const out: Context[] = [];
  for (const t of ts) {
    out.push(forbid.length ? { ...c, math: 1 } : c);
    if (!isTag(t) || selfClosing(t)) continue;
    const n = tagName(t); const close = closes(t);
    if (forbid.length) { if (close && n === forbid[forbid.length - 1]) forbid = forbid.slice(0, -1); else if (!close && n === forbid[forbid.length - 1]) forbid = [...forbid, n]; continue; }
    if (!close && FORBIDS(t)) { forbid = [n]; continue; }
    const d = close ? -1 : 1;
    if (BLOCK.has(n)) c = { ...c, block: Math.max(0, c.block + d) };
    else if (n === 'a') c = { ...c, link: Math.max(0, c.link + d) };
    else if (HEADING.has(n)) c = { ...c, heading: Math.max(0, c.heading + d) };
  }
  return out;
};
const free = (c: Context): boolean => c.link === 0 && c.heading === 0 && c.math === 0;
/* Where a run of text may be marked up: in a paragraph or list item, and under no link, heading or rendered math. */
export const wrappable = (c: Context): boolean => free(c) && c.block > 0;
/* The examples an article holds, by book number: <div class="example" id="16.1-ex-car"><h3>Example 16.1 · …</h3>.
   A number is 16.1, or a book's 1.9.1 or A.1.2 where examples count within the section or an appendix. */
export const exampleIds = (html: string): ReadonlyMap<ExampleNumber, string> =>
  new Map([...html.matchAll(/<div\b[^>]*\bclass="[^"]*\bexample\b[^"]*"[^>]*\bid="([^"]+)"[^>]*>\s*<h3[^>]*>\s*Example ((?:\d+|[A-Z])(?:\.\d+)+)/g)].map(([, id, n]) => [exampleNumber(n), id]));
const EXREF = /\bExample ((?:\d+|[A-Z])(?:\.\d+)+)(?![\d.])/g;
/* Every "Figure 16.4" in free text becomes a link when the figure is known, as the build links the book's own. */
const FIGREF = /\bFigure ((?:\d+|[A-Z])\.\d+)(?![\d.])/g;
export const wrapFigureRefs = (html: string, figures: ReadonlyMap<string, string>, start: Context = TOP): string => {
  if (figures.size === 0) return html;
  const ts = tokens(html); const cs = contexts(ts, start);
  return ts.map((t, i) => (isTag(t) || !free(cs[i]) ? t : t.replace(FIGREF, (run, n: string) => { const id = figures.get(n); return id ? `<a class="figref" href="#${id}" data-figref="${n}">${run}</a>` : run; }))).join('');
};
/* Every "Example 16.2" in free text becomes a link when the example is known. */
export const wrapExampleRefs = (html: string, examples: ReadonlyMap<ExampleNumber, string>, start: Context = TOP): string => {
  if (examples.size === 0) return html;
  const ts = tokens(html); const cs = contexts(ts, start);
  return ts.map((t, i) => (isTag(t) || !free(cs[i]) ? t : t.replace(EXREF, (run, n: string) => { const id = examples.get(exampleNumber(n)); return id ? `<a class="xref" href="#${id}" data-xref="${n}">${run}</a>` : run; }))).join('');
};
