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
export type TextBlockDTO = { readonly span: string; readonly head: string; readonly text: string };
/* One page of the book with its blocks, named as the explorer names it. */
export type TextPageDTO = { readonly id: string; readonly title: string; readonly url: string; readonly chapter: string; readonly blocks: readonly TextBlockDTO[] };
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
