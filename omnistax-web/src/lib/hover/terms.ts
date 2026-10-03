/* Marking glossary terms and example references in a section's prose, as a
   pure transform of its HTML. Every mention of a glossary term in a paragraph
   or list item becomes <span class="term" data-term="…">; every "Example 16.2"
   whose example is in the same section becomes a link. Text inside links,
   headings, rendered math and terms already marked is never touched, nor is a
   figure's caption or an exercise card. The tokeniser is the same tag-splitting
   scan the build uses for figure references (content/fragment.ts). */

export type Term = string;                                   /* a glossary term as the chapter's chapter.json spells it */
export type ExampleNumber = string & { readonly __brand: 'ExampleNumber' };   /* "16.2" */
export const exampleNumber = (s: string): ExampleNumber => s as ExampleNumber;

/* Where a text run sits: in a paragraph or list item (a term may be marked), and under nothing that forbids it. */
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
const isTermSpan = (t: Token): boolean => tagName(t) === 'span' && /\bclass="term"/.test(t);
/* Rendered math is a <span class="katex…"> tree (and its <math> twin); a figure caption, an exercise host, a term
   already marked, and a thing of the book an answer already names by a link are forbidden as wholes. */
const FORBIDS = (t: Token): boolean => tagName(t) === 'math' || (tagName(t) === 'span' && hasClass(t, 'katex')) || isTermSpan(t) || tagName(t) === 'figure' || hasClass(t, 'exercises') || hasClass(t, 'book-word') || hasClass(t, 'wiki');

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
const termable = wrappable;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* A term as a pattern: whole words, any whitespace between them, case-insensitive. */
const termRe = (term: Term): RegExp => new RegExp(`(?<![\\w-])${term.trim().split(/\s+/).map(escapeRe).join('\\s+')}(?![\\w-])`, 'i');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const mark = (term: Term, text: string): string => `<span class="term" data-term="${esc(term)}" tabindex="0">${text}</span>`;

/* Every mention of every term, the longer term first: a shorter one matches only unmarked text, never inside
   a span a longer one made ("metal" within "alkaline earth metal"). */
export const wrapTerms = (html: string, terms: readonly Term[], start: Context = TOP): string => {
  const ts = tokens(html); const cs = contexts(ts, start);
  const longFirst = [...terms].sort((a, b) => b.trim().length - a.trim().length).map((term) => ({ term, re: new RegExp(termRe(term).source, 'gi') }));
  type Piece = { readonly text: string; readonly marked: boolean };
  const split = (p: Piece, { term, re }: (typeof longFirst)[number]): readonly Piece[] => {
    if (p.marked) return [p];
    const ms = [...p.text.matchAll(re)]; if (ms.length === 0) return [p];
    const ends = ms.map((m) => m.index + m[0].length);
    return [...ms.flatMap((m, i) => [{ text: p.text.slice(i ? ends[i - 1] : 0, m.index), marked: false }, { text: mark(term, m[0]), marked: true }]), { text: p.text.slice(ends[ends.length - 1]), marked: false }];
  };
  return ts.map((t, i) => (isTag(t) || !termable(cs[i]) ? t : longFirst.reduce<readonly Piece[]>((ps, at) => ps.flatMap((p) => split(p, at)), [{ text: t, marked: false }]).map((p) => p.text).join(''))).join('');
};

/* The examples an article holds, by book number: <div class="example" id="16.1-ex-car"><h3>Example 16.1 · …</h3>. */
export const exampleIds = (html: string): ReadonlyMap<ExampleNumber, string> =>
  new Map([...html.matchAll(/<div\b[^>]*\bclass="[^"]*\bexample\b[^"]*"[^>]*\bid="([^"]+)"[^>]*>\s*<h3[^>]*>\s*Example (\d+\.\d+)/g)].map(([, id, n]) => [exampleNumber(n), id]));
const EXREF = /\bExample (\d+\.\d+)(?![\d.])/g;
/* Every "Figure 16.4" in free text becomes a link when the figure is known, as the build links the book's own. */
const FIGREF = /\bFigure (\d+\.\d+)(?![\d.])/g;
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
