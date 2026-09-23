/* Going to a hit, of whatever book: it opens the page it lies in as a tab and
   lands on the thing itself: the paragraph a block of prose was cut from, found
   again by its opening words; the span that introduces a concept; the span a
   symbol or a formula is anchored to; the first mention of a term, which the
   prose marks. */
import { spansOf } from '../sections/concepts.svelte';
import { findEl, goSpan, jump, openDoc } from '../sections/nav.svelte';
import { registry } from '../sections/registry.svelte';
import { bookId, conceptId, sectionId, sectionRef, spanId, spanRef, type BookId } from '../types/ids';
import type { Hit } from './model';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
/* The opening words of a block, up to its first maths, which reads the same in the
   page's text as in the index; too short an opening names nothing. */
const opening = (text: string): string | null => { const o = squash(text.split('$')[0]).slice(0, 60); return o.length >= 12 ? o : null; };
const BLOCKS = 'p, li, h2, h3, h4, figcaption, .sim-head';
/* The block of a span whose text opens the way the hit's did; the span itself when none does. */
const blockIn = (root: HTMLElement, text: string): HTMLElement => {
  const o = opening(text); if (o === null) return root;
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCKS)).find((el) => squash(el.textContent ?? '').includes(o)) ?? root;
};
/* The article of a page, whichever pane it is open in. */
const articleOf = (book: BookId, page: string): HTMLElement | null => document.querySelector<HTMLElement>(`article[data-book="${CSS.escape(book)}"][data-doc="${CSS.escape(page)}/text"]`);
/* The span a hit names, or the whole article when the hit lies in none. */
const hostOf = (book: BookId, page: string, span: string): HTMLElement | null => (span === page ? articleOf(book, page) : findEl(book, span) ?? articleOf(book, page));

const goText = (book: BookId, page: string, span: string, text: string): void => {
  void openDoc(sectionRef(book, sectionId(page)), 'text').then(() => { const host = hostOf(book, page, span); if (host) jump(blockIn(host, text), 'center'); });
};
const goTerm = (book: BookId, section: string, term: string): void => {
  void openDoc(sectionRef(book, sectionId(section)), 'text').then(() => {
    const host = articleOf(book, section); if (!host) return;
    jump(host.querySelector<HTMLElement>(`.term[data-term="${CSS.escape(term)}"]`) ?? host, 'center');
  });
};
const goAnchored = (book: BookId, section: string, anchor: string | undefined): void => { if (anchor) goSpan(spanRef(book, spanId(anchor))); else void openDoc(sectionRef(book, sectionId(section)), 'text'); };

/* The concept's coverage lives in its chapter, which is loaded before the spans are read. */
const goConcept = async (book: BookId, id: string, section: string): Promise<void> => {
  const ref = sectionRef(book, sectionId(section));
  await registry.ensureBook(book);
  const ch = registry.chapterOf(ref); if (ch) await registry.loadChapter(book, ch.dir).catch(() => {});
  const sp = spansOf(book, conceptId(id)); const t = sp.intro[0] ?? sp.uses[0];
  if (t) goSpan(spanRef(book, t)); else void openDoc(ref, 'text');
};

export const goHit = (hit: Hit): void => {
  const book = bookId(hit.book);
  switch (hit.kind) {
    case 'text': goText(book, hit.page.id, hit.span, hit.text); return;
    case 'concept': void goConcept(book, hit.concept.id, hit.concept.section); return;
    case 'definition':
      if (hit.def.kind === 'symbol') goAnchored(book, hit.def.symbol.section, hit.def.symbol.anchor);
      else goTerm(book, hit.def.term.section, hit.def.term.term);
      return;
    case 'formula': goAnchored(book, hit.equation.section, hit.equation.anchor);
  }
};
