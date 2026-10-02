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
import { conceptOfTerm, formById } from '../sections/reference';
import { mainForm } from '../content/schema';
import { figFor } from '../fig/figlib';
import { notes } from './store.svelte';
import { figureInfo } from './md/figinfo';
import { isBook, parseLink } from './md/links';
import { bookId, conceptId, qualifiedId, sectionId, sectionRef, spanId, spanRef, type BookId, type SectionRef, type SpanRef } from '../types/ids';
import type { HighlightInfo, Resolver } from './md/render';

export type BookLookups = Pick<Resolver, 'section' | 'highlight' | 'equation' | 'term' | 'symbol' | 'concept' | 'figure'>;
export type Fallback = () => BookId | null;
export const focusedBook: Fallback = () => focus.book;

export const bookHighlight = (id: string): HighlightInfo | null => {
  const n = notes.get(id); if (!n) return null;
  return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(sectionRef(n.book, n.section))?.title ?? '') };
};

export class BookResolver {
  constructor(private readonly fallback: Fallback = focusedBook) {}

  ref(section: string, book?: BookId): SectionRef | null { const b = book ?? this.fallback(); return b ? sectionRef(b, sectionId(section)) : null; }
  chapterDir(section: string, book?: BookId): string | undefined { const ref = this.ref(section, book); return ref ? registry.chapterOf(ref)?.dir : undefined; }
  private chapterData(section: string, book?: BookId) {
    const ref = this.ref(section, book); const dir = ref ? registry.chapterOf(ref)?.dir : undefined;
    return ref && dir ? registry.chapter(ref.book, dir) : undefined;
  }

  lookups(): BookLookups {
    return {
      section: (id, book) => { const ref = this.ref(id, book); const e = ref ? registry.entry(ref) : undefined; return e?.built ? { title: e.title } : null; },
      highlight: bookHighlight,
      equation: (section, id, book) => {
        const ref = this.ref(section, book); const d = this.chapterData(section, book); if (!ref || !d) return null;
        const found = formById(d.concepts, id) ?? formById(registry.concepts(ref.book), id); if (!found) return null;
        const { form, concept } = found;
        return { tex: form.tex, condition: form.condition, conceptName: concept.name, anchor: form.anchor, section: form.section };
      },
      /* A glossary word is a word of its concept; the card says the concept's statement. */
      term: (section, term, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const ch = this.ref(section, book); const own = ch ? registry.chapterOf(ch) : undefined;
        const c = conceptOfTerm(d.concepts, term, (x) => !!own?.sections.some((s) => s.id === x.section)); if (!c) return null;
        return { term: c.terms.find((w) => w.toLowerCase() === term.trim().toLowerCase()) ?? term, definition: c.status === 'built' ? c.statement ?? '' : '', section: c.section };
      },
      /* A chapter may give one symbol two meanings in two sections, so the
         section the link names picks which; the TeX is the book's own macro. */
      symbol: (section, sym, book) => {
        const ref = this.ref(section, book); const d = this.chapterData(section, book); if (!ref || !d) return null;
        const v = lookupVariable(d.variables, symKey(sym), section); if (!v) return null;
        const m = registry.manifest(ref.book);
        return { sym, tex: m.symbols[sym] ?? sym, meaning: v.meaning, unit: v.unit, typeLabel: v.type ? m.types[v.type]?.label : undefined, section: v.section, anchor: v.anchor };
      },
      figure: (section, id, book) => {
        const ref = this.ref(section, book); const doc = ref ? registry.state(ref)?.docs.text : undefined;
        return doc ? figureInfo(doc, sectionId(section), id) : null;
      },
      concept: (section, id, book) => {
        const d = this.chapterData(section, book); if (!d) return null;
        const c = d.concepts.find((x) => x.id === id); if (!c) return null;
        return { name: c.name, kind: c.kind, statement: c.status === 'built' ? c.statement : undefined, section: c.section, eqTex: mainForm(c)?.tex, placeholder: c.status === 'placeholder' };
      },
    };
  }

  /* Where a card of the book goes: an equation and a symbol to the span that
     states them, a concept to the span that introduces it, a figure to itself,
     and anything else to the section that holds it. */
  target(embed: string): SpanRef | SectionRef | null {
    const t = parseLink(embed);
    if (!isBook(t) && t.kind !== 'figure') return null;
    const sec = this.ref(t.section, t.book); if (!sec) return null;
    if (t.kind === 'figure') return spanRef(sec.book, qualifiedId(sectionId(t.section), t.id));
    const at = this.lookups();
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
      const ref = 'section' in t ? this.ref(t.section, t.book) : null; if (ref) card.dataset.book = ref.book;
    }
    const bookAt = (e: HTMLElement): BookId => bookId(e.closest<HTMLElement>('[data-book]')?.dataset.book ?? this.fallback() ?? '');
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
