/* The book's own things as a note, a chat answer and a drawing's frame all
   read them: a section, a highlight, and the four things of a chapter's tables,
   each found in the book the link names. A link written without its book is
   read against the fallback the caller gives, which is the focused book.

   The chapter tables are read out of the registry the way the hover cards
   read them, so a card in a note says what a card over the text says. */
import { registry } from '../sections/registry.svelte';
import { focus } from '../sections/focus.svelte';
import { label } from '../sections/grouping';
import { spansOf } from '../sections/concepts.svelte';
import { lookupVariable, symKey } from '../hover/data';
import { figFor } from '../fig/figlib';
import { notes } from './store.svelte';
import { figureInfo } from './md/figinfo';
import { isBook, parseLink } from './md/links';
import { bookId, conceptId, qualifiedId, sectionId, sectionRef, spanId, spanRef, type BookId, type SectionRef, type SpanRef } from '../types/ids';
import type { HighlightInfo, Resolver } from './md/render';

export type BookLookups = Pick<Resolver, 'section' | 'highlight' | 'equation' | 'term' | 'symbol' | 'concept' | 'figure'>;
export type Fallback = () => BookId;
export const focusedBook: Fallback = () => focus.book;

export const bookHighlight = (id: string): HighlightInfo | null => {
  const n = notes.get(id); if (!n) return null;
  return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(sectionRef(n.book, n.section))?.title ?? '') };
};

export class BookResolver {
  constructor(private readonly fallback: Fallback = focusedBook) {}

  ref(section: string, book?: BookId): SectionRef { return sectionRef(book ?? this.fallback(), sectionId(section)); }
  chapterDir(section: string, book?: BookId): string | undefined { return registry.chapterOf(this.ref(section, book))?.dir; }
  private chapterData(section: string, book?: BookId) {
    const ref = this.ref(section, book); const dir = registry.chapterOf(ref)?.dir;
    return dir ? registry.chapter(ref.book, dir) : undefined;
  }

  lookups(): BookLookups {
    return {
      section: (id, book) => { const e = registry.entry(this.ref(id, book)); return e?.built ? { title: e.title } : null; },
      highlight: bookHighlight,
      equation: (section, id, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const e = d.formulas.equations.find((x) => x.id === id); if (!e) return null;
        return { tex: e.tex, condition: e.condition, important: e.important, conceptName: d.concepts.concepts.find((c) => c.eq === e.id)?.name, anchor: e.anchor, section: e.section };
      },
      term: (section, term, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const g = d.formulas.glossary.find((x) => x.term.toLowerCase() === term.toLowerCase());
        return g ? { term: g.term, definition: g.definition, section: g.section } : null;
      },
      /* A chapter may give one symbol two meanings in two sections, so the
         section the link names picks which; the TeX is the book's own macro. */
      symbol: (section, sym, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const v = lookupVariable(d.formulas.variables, symKey(sym), section); if (!v) return null;
        const m = registry.manifest(this.ref(section, book).book);
        return { sym, tex: m.symbols[sym] ?? sym, meaning: v.meaning, unit: v.unit, typeLabel: v.type ? m.types[v.type]?.label : undefined, section: v.section, anchor: v.anchor };
      },
      figure: (section, id, book) => {
        const doc = registry.state(this.ref(section, book))?.docs.text;
        return doc ? figureInfo(doc, sectionId(section), id) : null;
      },
      concept: (section, id, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const c = d.concepts.concepts.find((x) => x.id === id); if (!c) return null;
        const eq = c.eq ? d.formulas.equations.find((e) => e.id === c.eq) : undefined;
        return { name: c.name, kind: c.kind, why: c.status === 'built' ? c.why : undefined, section: c.section, eqTex: eq?.tex, placeholder: c.status === 'placeholder' };
      },
    };
  }

  /* Where a card of the book goes: an equation and a symbol to the span that
     states them, a concept to the span that introduces it, a figure to itself,
     and anything else to the section that holds it. */
  target(embed: string): SpanRef | SectionRef | null {
    const t = parseLink(embed);
    if (t.kind === 'figure') return spanRef(this.ref(t.section, t.book).book, qualifiedId(sectionId(t.section), t.id));
    if (!isBook(t)) return null;
    const sec = this.ref(t.section, t.book); const at = this.lookups();
    const span = t.kind === 'equation' ? at.equation(t.section, t.id, t.book)?.anchor
      : t.kind === 'symbol' ? at.symbol(t.section, t.sym, t.book)?.anchor
        : t.kind === 'concept' ? spansOf(sec.book, conceptId(t.id)).intro[0] : undefined;
    return span ? spanRef(sec.book, spanId(span)) : sec;
  }

  /* The book a card stands in, on the card itself, so the book's colours
     reach it; then every line of TeX set by that book's renderer. */
  setMath(el: HTMLElement): void {
    for (const card of el.querySelectorAll<HTMLElement>('[data-embed]:not([data-book])')) {
      const t = parseLink(card.dataset.embed ?? '');
      if ('section' in t) card.dataset.book = this.ref(t.section, t.book).book;
    }
    const bookAt = (e: HTMLElement): BookId => bookId(e.closest<HTMLElement>('[data-book]')?.dataset.book ?? this.fallback());
    for (const t of el.querySelectorAll<HTMLElement>('.embed-tex[data-tex]')) {
      if (t.dataset.set === '1') continue;
      t.dataset.set = '1';
      figFor(bookAt(t)).tex(t, t.dataset.tex ?? '');
    }
    for (const m of el.querySelectorAll<HTMLElement>('[data-math]')) {
      if (m.dataset.math === 'set') continue;
      m.dataset.math = 'set';
      figFor(bookAt(m)).renderMath(m);
    }
  }
}

export const isSpan = (to: SpanRef | SectionRef): to is SpanRef => 'span' in to;
