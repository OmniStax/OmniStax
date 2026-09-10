/* Marking glossary terms and example references in a section's prose, as a
   pure transform of its HTML. The first mention of each glossary term in a
   paragraph or list item becomes <span class="term" data-term="…">; every
   "Example 16.2" whose example is in the same section becomes a link. Text
   inside links, headings and rendered math is never touched, nor is a figure's
   caption or an exercise card. The tokeniser is the same tag-splitting scan
   the build uses for figure references (content/fragment.ts). */

export type Term = string;                                   /* a glossary term as the chapter's chapter.json spells it */
export type ExampleNumber = string & { readonly __brand: 'ExampleNumber' };   /* "16.2" */
export const exampleNumber = (s: string): ExampleNumber => s as ExampleNumber;

/* Where a text run sits: in a paragraph or list item (a term may be marked), and under nothing that forbids it. */
export type Context = { readonly block: number; readonly link: number; readonly heading: number; readonly math: number };
export const TOP: Context = { block: 0, link: 0, heading: 0, math: 0 };            /* the whole article */
export const IN_BLOCK: Context = { ...TOP, block: 1 };                             /* the innerHTML of one <p> or <li> */

type Token = string;
const tokens = (html: string): Token[] => html.split(/(<[^>]+>)/).filter((t) => t !== '');
const isTag = (t: Token): boolean => t.startsWith('<');
const tagName = (t: Token): string => /^<\/?([a-zA-Z][\w-]*)/.exec(t)?.[1]?.toLowerCase() ?? '';
const closes = (t: Token): boolean => t.startsWith('</');
const selfClosing = (t: Token): boolean => t.endsWith('/>');
const hasClass = (t: Token, c: string): boolean => new RegExp(`\\bclass="[^"]*\\b${c}\\b`).test(t);

const BLOCK = new Set(['p', 'li']);
const HEADING = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/* Rendered math is a <span class="katex…"> tree (and its <math> twin); a figure caption and an exercise host are forbidden as wholes. */
const FORBIDS = (t: Token): boolean => tagName(t) === 'math' || (tagName(t) === 'span' && hasClass(t, 'katex')) || tagName(t) === 'figure' || hasClass(t, 'exercises');

/* The context of every token, from a scan that opens and closes at each tag. Forbidding subtrees are tracked by depth. */
const contexts = (ts: readonly Token[], start: Context): Context[] => {
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
const termable = (c: Context): boolean => free(c) && c.block > 0;

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* A term as a pattern: whole words, any whitespace between them, case-insensitive. */
const termRe = (term: Term): RegExp => new RegExp(`(?<![\\w-])${term.trim().split(/\s+/).map(escapeRe).join('\\s+')}(?![\\w-])`, 'i');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const open = (term: Term): string => `<span class="term" data-term="${esc(term)}" tabindex="0">`;
const mark = (term: Term, text: string): string => `${open(term)}${text}</span>`;

export type Wrapped = { readonly html: string; readonly done: ReadonlySet<Term> };

/* Pass one: a term set in <em>…</em> on its own. */
export const wrapEmTerms = (html: string, terms: readonly Term[], done: ReadonlySet<Term> = new Set(), start: Context = TOP): Wrapped => {
  const ts = tokens(html); const cs = contexts(ts, start); const got = new Set(done);
  const out = [...ts];
  for (let i = 0; i + 2 < ts.length; i++) {
    if (tagName(ts[i]) !== 'em' || closes(ts[i]) || isTag(ts[i + 1]) || tagName(ts[i + 2]) !== 'em' || !closes(ts[i + 2]) || !termable(cs[i + 1])) continue;
    const text = ts[i + 1].trim();
    const term = terms.find((t) => !got.has(t) && termRe(t).test(text) && text.replace(termRe(t), '').trim() === '');
    if (!term) continue;
    got.add(term); out[i] = open(term) + ts[i]; out[i + 2] = ts[i + 2] + '</span>';
  }
  return { html: out.join(''), done: got };
};
/* Pass two: the first plain mention of each term still unmarked. */
export const wrapPlainTerms = (html: string, terms: readonly Term[], done: ReadonlySet<Term> = new Set(), start: Context = TOP): Wrapped => {
  const ts = tokens(html); const cs = contexts(ts, start); const got = new Set(done);
  const out = ts.map((t, i) => {
    if (isTag(t) || !termable(cs[i])) return t;
    return terms.reduce((s, term) => {
      if (got.has(term)) return s;
      const m = termRe(term).exec(s); if (!m) return s;
      got.add(term); return s.slice(0, m.index) + mark(term, m[0]) + s.slice(m.index + m[0].length);
    }, t);
  });
  return { html: out.join(''), done: got };
};
/* Both passes over one article: an emphasised mention wins over an earlier plain one. */
export const wrapTerms = (html: string, terms: readonly Term[]): string => {
  const em = wrapEmTerms(html, terms); return wrapPlainTerms(em.html, terms, em.done).html;
};

/* The examples an article holds, by book number: <div class="example" id="16.1-ex-car"><h3>Example 16.1 · …</h3>. */
export const exampleIds = (html: string): ReadonlyMap<ExampleNumber, string> =>
  new Map([...html.matchAll(/<div\b[^>]*\bclass="[^"]*\bexample\b[^"]*"[^>]*\bid="([^"]+)"[^>]*>\s*<h3[^>]*>\s*Example (\d+\.\d+)/g)].map(([, id, n]) => [exampleNumber(n), id]));
const EXREF = /\bExample (\d+\.\d+)(?![\d.])/g;
/* Every "Example 16.2" in free text becomes a link when the example is known. */
export const wrapExampleRefs = (html: string, examples: ReadonlyMap<ExampleNumber, string>, start: Context = TOP): string => {
  if (examples.size === 0) return html;
  const ts = tokens(html); const cs = contexts(ts, start);
  return ts.map((t, i) => (isTag(t) || !free(cs[i]) ? t : t.replace(EXREF, (run, n: string) => { const id = examples.get(exampleNumber(n)); return id ? `<a class="xref" href="#${id}" data-xref="${n}">${run}</a>` : run; }))).join('');
};
