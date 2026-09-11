/* Going to a hit. In the book being read a hit opens the page it lies in as a
   tab and lands on the thing itself: the paragraph a block of prose was cut
   from, found again by its opening words; the span that introduces a concept;
   the span a symbol or a formula is anchored to; the first mention of a term,
   which the prose marks. In another book the shell has no page for it, so the
   hit is a link out: the page's own address, with the span to land on in the
   hash, which the shell reads when that page opens. */
import { registry } from '../sections/registry.svelte';
import { spansOf } from '../sections/concepts.svelte';
import { findEl, goSpan, jump, openDoc } from '../sections/nav.svelte';
import { conceptId, sectionId, spanId } from '../types/ids';
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
const articleOf = (page: string): HTMLElement | null => document.querySelector<HTMLElement>(`article[data-doc="${CSS.escape(page)}/text"]`);
/* The span a hit names, or the whole article when the hit lies in none. */
const hostOf = (page: string, span: string): HTMLElement | null => (span === page ? articleOf(page) : findEl(span) ?? articleOf(page));

const goText = (page: string, span: string, text: string): void => {
  void openDoc(sectionId(page), 'text').then(() => { const host = hostOf(page, span); if (host) jump(blockIn(host, text), 'center'); });
};
const goTerm = (section: string, term: string): void => {
  void openDoc(sectionId(section), 'text').then(() => {
    const host = articleOf(section); if (!host) return;
    jump(host.querySelector<HTMLElement>(`.term[data-term="${CSS.escape(term)}"]`) ?? host, 'center');
  });
};
const goAnchored = (section: string, anchor: string | undefined): void => { if (anchor) goSpan(spanId(anchor)); else void openDoc(sectionId(section), 'text'); };

/* Where a hit of another book is: the page's address with the span in the hash. */
const away = (url: string | undefined, hash?: string): void => { if (url) location.assign(hash ? `${url}#${hash}` : url); };

export const goHit = (hit: Hit, urls: Readonly<Record<string, string>>): void => {
  const home = hit.book === registry.manifest.id;
  switch (hit.kind) {
    case 'text':
      if (home) goText(hit.page.id, hit.span, hit.text); else away(urls[hit.page.id] ?? hit.page.url, hit.span === hit.page.id ? undefined : hit.span);
      return;
    case 'concept': {
      const c = hit.concept;
      if (!home) { away(urls[c.section]); return; }
      const sp = spansOf(conceptId(c.id)); const t = sp.intro[0] ?? sp.uses[0];
      if (t) goSpan(t); else void openDoc(sectionId(c.section), 'text');
      return;
    }
    case 'definition':
      if (hit.def.kind === 'symbol') { const v = hit.def.symbol; if (home) goAnchored(v.section, v.anchor); else away(urls[v.section], v.anchor); return; }
      { const t = hit.def.term; if (home) goTerm(t.section, t.term); else away(urls[t.section]); return; }
    case 'formula': {
      const e = hit.equation;
      if (home) goAnchored(e.section, e.anchor); else away(urls[e.section], e.anchor);
    }
  }
};
