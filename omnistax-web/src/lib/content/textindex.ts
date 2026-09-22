/* The text of a book as the search reads it: one block per paragraph, list
   item, heading or caption of every built page, each with the span it stands in
   and the heading that span stands under, so that a hit can say where it is and
   be gone to. The build writes the blocks of a whole book as one file beside
   its pages, search.json, and the shell fetches it the first time the reader
   searches. The walk is the tag-splitting scan the build uses everywhere else
   (fragment.ts, hover/terms.ts), so what the search sees is what the page
   prints, tags dropped and rendered maths folded back to the $…$ it was written
   as. Pure. */
import { plainText } from './fragment';

/* One block of prose: the qualified id of the span it lies in ("16.3-shm-period"; the
   page's own id when it lies in none), the heading over that span, and its text. */
export type TextBlockDTO = { readonly span: string; readonly head: string; readonly text: string; readonly toks?: string };
/* One page of the book with its blocks, named as the explorer names it. Its terms are
   the words of the whole page, once each and sorted, and a block's toks are which of
   them it holds: the search builds its index off these without scanning a line of prose.
   A page written before they existed has neither, and the client tokenises the text. */
export type TextPageDTO = { readonly id: string; readonly title: string; readonly url: string; readonly chapter: string; readonly terms?: readonly string[]; readonly blocks: readonly TextBlockDTO[] };
export type TextIndexDTO = { readonly pages: readonly TextPageDTO[] };

const tagName = (t: string): string => /^<\/?([a-zA-Z][\w-]*)/.exec(t)?.[1]?.toLowerCase() ?? '';
const idOf = (t: string): string | null => /\bid="([^"]+)"/.exec(t)?.[1] ?? null;
const hasClass = (t: string, c: string): boolean => new RegExp(`\\bclass="[^"]*\\b${c}\\b`).test(t);

/* A span is a section or an example with an id. A block is what the prose is set in;
   inside a figure only the caption and the sim's head count, and the drawing, its
   controls and the original's caption are left out. */
const isSpan = (t: string): boolean => (tagName(t) === 'section' || (tagName(t) === 'div' && hasClass(t, 'example'))) && idOf(t) !== null;
const BLOCKS = new Set(['p', 'li', 'h2', 'h3', 'h4', 'figcaption']);
const HEADINGS = new Set(['h2', 'h3', 'h4']);
const LISTS = new Set(['ul', 'ol']);

type Open = { readonly tag: string; readonly id: string | null; head: string };   /* an open section or div; id null where it is no span */
type Block = { readonly tag: string; html: string; depth: number };              /* the block being gathered; depth: its own tag opened again inside it */

/* Every block of one page's text, in the order the page prints them. A block's
   span is the innermost section or example open round it, or the page itself;
   its head is the last heading seen in that span, or its own text where it is one. */
export const textBlocks = (html: string, page: string): readonly TextBlockDTO[] => {
  const out: TextBlockDTO[] = [];
  const open: Open[] = [{ tag: '', id: null, head: '' }];   /* the page itself, then whatever stands open inside it */
  let figure = 0;
  let block: Block | null = null;
  const span = (): Open => [...open].reverse().find((s) => s.id !== null) ?? open[0];
  const emit = (): void => {
    if (block === null) return;
    const b = block; block = null;
    const text = plainText(b.html); if (text === '') return;
    const s = span(); const heading = HEADINGS.has(b.tag);
    if (heading) s.head = text;
    out.push({ span: s.id === null ? page : `${page}-${s.id}`, head: heading ? text : s.head, text });
  };
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part === '') continue;
    if (!part.startsWith('<')) { if (block) block.html += part; continue; }
    const n = tagName(part); const close = part.startsWith('</'); const selfClosing = part.endsWith('/>');
    if (block !== null) {
      if (n === block.tag && !selfClosing) {
        if (!close) block.depth += 1;
        else if (block.depth === 0) { emit(); continue; }
        else block.depth -= 1;
      }
      /* a list inside an item ends the item's own text: the items inside are blocks of their own */
      else if (block.tag === 'li' && LISTS.has(n)) { emit(); continue; }
      block.html += part; continue;
    }
    if (n === 'figure') { figure = Math.max(0, figure + (close ? -1 : selfClosing ? 0 : 1)); continue; }
    if (close) { if ((n === 'section' || n === 'div') && open.length > 1 && open[open.length - 1].tag === n) open.pop(); continue; }
    if (selfClosing) continue;
    if (n === 'div' && hasClass(part, 'sim-head')) { block = { tag: 'div', html: '', depth: 0 }; continue; }
    if (n === 'section' || n === 'div') { open.push({ tag: n, id: isSpan(part) ? idOf(part) : null, head: '' }); continue; }
    if (BLOCKS.has(n) && (figure === 0 || n === 'figcaption')) block = { tag: n, html: '', depth: 0 };
  }
  emit();
  return out;
};

/* The words of a line as both the index and a query are cut: lowercased, split on
   everything that is neither letter nor digit, so that "\\sqrt{m/k}" and "sqrt m k"
   are the same three words. Pure. */
export const tokensOf = (s: string): readonly string[] => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t !== '');

/* A page with its dictionary: every word it holds once, sorted, and each block pointing
   at the ones it holds. The text stays as it is — a hit is still shown as the page
   prints it — and only the words are laid out for the index. */
export const withTokens = (page: TextPageDTO): TextPageDTO => {
  const terms = [...new Set(page.blocks.flatMap((b) => tokensOf(b.text)))].sort();
  const at = new Map(terms.map((t, i) => [t, i]));
  const toks = (text: string): readonly number[] => [...new Set(tokensOf(text).map((t) => at.get(t) ?? -1))].sort((a, b) => a - b);
  return { ...page, terms, blocks: page.blocks.map((b) => ({ ...b, toks: packToks(toks(b.text)) })) };
};

/* Which words a block holds, written small: the gaps between them rather than the
   numbers themselves, five bits to a character with a sixth saying more follows, so
   that a word costs about one character where a plain list of numbers costs five. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export const packToks = (ids: readonly number[]): string => {
  let prev = 0, out = '';
  for (const id of ids) {
    let d = id - prev; prev = id;
    do { const low = d & 31; d >>>= 5; out += ALPHABET[low | (d > 0 ? 32 : 0)]; } while (d > 0);
  }
  return out;
};
export const unpackToks = (packed: string): readonly number[] => {
  const out: number[] = [];
  let cur = 0, shift = 0, prev = 0;
  for (const ch of packed) {
    const v = ALPHABET.indexOf(ch); if (v < 0) return out;
    cur |= (v & 31) << shift; shift += 5;
    if (v & 32) continue;
    prev += cur; out.push(prev); cur = 0; shift = 0;
  }
  return out;
};
