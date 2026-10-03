/* From a hovered node to its card: find the target the pointer is on, gather
   the facts from the DOM and the registry, and compose the card. This is the
   only file in the hover layer that reads the registry or the document. Every
   card is of the book its target stands in, read off the nearest `data-book`. */
import { registry } from '../sections/registry.svelte';
import { focus } from '../sections/focus.svelte';
import { goSpan, findEl, openDoc, reveal, bookOfEl, openItem } from '../sections/nav.svelte';
import { spansOf } from '../sections/concepts.svelte';
import { layoutStore } from '../layout/store.svelte';
import { openTab } from '../layout/model';
import { type BookId, type SectionId, type SectionRef, type SpanId, sectionId, sectionRef, spanId, spanRef, conceptId, sheetId, sectionOfSpan, newViewItem, sheetItem, itemKey } from '../types/ids';
import { sheets } from '../sheets/store.svelte';
import { componentsOf } from '../sheets/elements';
import { molarMass, parseComposition } from '../sheets/formula';
import { symOf, typeOf, symbolTarget, otherMeanings } from './data';
import type { ConceptDTO, VariableDTO } from '../content/schema';
import { conceptOfTerm, formById, statedOf } from '../sections/reference';
import { type Card, type Nav, definitionCard, variableCard, referenceCard, equationCard, conceptCard, formulaCard, matchEquation, firstSentence } from './resolve';

/* The elements a card can open for. An equation block has no underline; the rest are underlined by Hover.svelte. */
export const TARGET = '[data-sym], .term[data-term], a.xref, article a[href^="#"]:not(.figref), .fig-root a[href^="#"]:not(.figref), .katex-display, [data-concept], [data-eq], .formula[data-formula]';
export const targetOf = (node: EventTarget | null): HTMLElement | null => {
  const el = node instanceof Element ? node : null; if (!el) return null;
  if (el.closest('.hover-card')) return null;
  const t = el.closest<HTMLElement>(TARGET);   /* the nearest wins: a symbol inside an equation block is the symbol */
  return t?.hasAttribute('data-sym') ? t.closest<HTMLElement>('[data-concept]') ?? t : t;   /* except on a concept, whose name may set a symbol in math: the concept wins */
};

/* The section a node is read in: its article or figure root, else the focused
   document when that is of the same book. */
const sectionOf = (book: BookId, el: Element): SectionId | null => {
  const sec = el.closest<HTMLElement>('[data-sec]')?.dataset.sec;
  return sec ? sectionId(sec) : focus.section?.book === book ? focus.section.section : null;
};
const chapterData = (ref: SectionRef) => { const dir = registry.chapterOf(ref)?.dir; return dir ? registry.chapter(ref.book, dir) : undefined; };

/* A heading's text without the MathML twin of its math, and without the example number. */
export const headingText = (h: Element | null | undefined): string | undefined => {
  if (!h) return undefined;
  const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
  return c.textContent?.replace(/\s+/g, ' ').replace(/^Example [\d.]+ · /, '').trim();
};
const spanTitle = (book: BookId, id: SpanId): string | undefined => headingText(findEl(book, id)?.querySelector('h2, h3'));
/* The name a list of places gives a span: the heading as the book prints it,
   example number and all, since the number is half of how a reader knows it.
   A span of a section not yet loaded has no heading here, and is left unnamed. */
export const spanName = (book: BookId, id: SpanId): string | undefined => {
  const h = findEl(book, id)?.querySelector('h2, h3'); if (!h) return undefined;
  const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
};
/* Spans as places: the named ones by heading, and the unnamed ones of a section not
   yet loaded gathered into one place per section, named by the section's title. */
const places = (book: BookId, ids: readonly SpanId[]): { id: SpanId; title: string }[] => {
  const named = ids.flatMap((id) => { const t = spanName(book, id); return t ? [{ id, title: t }] : []; });
  const rest = ids.filter((id) => !spanName(book, id)); const secs = [...new Set(rest.map(sectionOfSpan))];
  return [...named, ...secs.map((sec) => ({ id: rest.find((id) => sectionOfSpan(id) === sec)!, title: `${sec} · ${registry.entry(sectionRef(book, sec))?.title ?? 'section'}` }))];
};

/* A card sends the reader to a view of that kind: the page of it already open,
   wherever it stands, since a second one would only say the same thing; and where
   none is open, a page of its own as a tab of the focused group. */
const showView = (view: 'reference' | 'concepts', split = false): void => {
  if (split) { void openItem(itemKey(newViewItem(view)), 'new'); return; }
  const host = document.querySelector<HTMLElement>(`.view[data-view="${view}"]`);
  if (host) { reveal(host); return; }
  layoutStore.apply((x) => openTab(x, newViewItem(view), x.focus));
};
/* What a card of one book can do, every place it names being in that book. */
export const navFor = (book: BookId): Nav => {
  const go = (id: SpanId, split?: boolean): void => goSpan(spanRef(book, id), split);
  const openExternal = (sec: SectionId): void => { window.open(registry.entry(sectionRef(book, sec))?.openstax ?? registry.manifest(book).openstax, '_blank', 'noopener'); };
  /* The elements sheet, standing on one element: the page of it, opened wherever
     a tab opens, with the element pinned before it draws. */
  const showElement = (symbol: string, split?: boolean): void => {
    const entry = sheets.elementsEntry(book); if (!entry) return;
    sheets.pin(symbol);
    void openItem(itemKey(sheetItem(book, sheetId(entry.id))), split ? 'new' : undefined);
  };
  return { goSpan: go, openSection: (sec, split) => { openDoc(sectionRef(book, sec), 'text', split ? 'new' : undefined); }, showView, openExternal, showElement };
};

/* ---------- the definition card's facts ----------
   Whichever of a concept's word, symbol or form the reader hovered, the card
   is the same: the concept's name and the symbol (the hovered one, else the
   concept's own), the forms that state it, and the span that introduces it. */
type Named = { readonly sym?: string; readonly variable?: VariableDTO; readonly elsewhere?: VariableDTO; readonly section: SectionId };
const definition = (book: BookId, c: ConceptDTO, from: Named): Card => {
  const sym = from.sym ?? c.symbol;
  const rows = registry.variables(book).filter((v) => v.concept === c.id && v.sym === sym);
  const v = from.variable ?? rows.find((x) => x.section === from.section) ?? rows[0];
  const redefined = !!from.variable && (!!from.variable.redefines || !!from.elsewhere);
  return definitionCard({
    concept: c, tex: sym ? registry.manifest(book).symbols[sym] ?? sym : undefined, unit: v?.unit || undefined,
    meaning: redefined ? from.variable?.meaning : undefined, elsewhere: from.elsewhere,
    intro: spansOf(book, conceptId(c.id)).intro[0],
  }, navFor(book));
};

/* ---------- resolvers, one per kind ---------- */
const variable = (book: BookId, t: HTMLElement): Card | null => {
  const sym = symOf(t); const sec = sectionOf(book, t); if (!sym || !sec) return null;
  const data = chapterData(sectionRef(book, sec));
  const m = registry.manifest(book); const type = typeOf(t); const typeLabel = type ? m.types[type]?.label : undefined;
  const target = data ? symbolTarget(data.variables, sym, sec, (id) => registry.concept(book, id)) : undefined;
  const other = data ? otherMeanings(data.variables, sym, sec)[0] : undefined;
  if (target?.kind === 'concept') return definition(book, target.concept, { sym, variable: target.variable, elsewhere: other, section: sec });
  const card = variableCard({ sym, tex: m.symbols[sym] ?? sym, typeLabel, section: sec, formulasLoaded: !!data, variable: target?.variable }, navFor(book));
  return other && card.body ? { ...card, body: `${card.body} ${elsewhere(other)}` } : card;
};
const elsewhere = (v: VariableDTO): string => `Elsewhere in this chapter (${v.section}): ${v.meaning.replace(/[.\s]+$/, '')}.`;
/* A glossary word is a word of its concept: the chapter's concepts are asked
   first, and then every concept of the book loaded so far. */
const term = (book: BookId, t: HTMLElement): Card | null => {
  const name = t.dataset.term; const sec = sectionOf(book, t); if (!name || !sec) return null;
  const ch = registry.chapterOf(sectionRef(book, sec));
  const near = (x: ConceptDTO): boolean => !!ch?.sections.some((s) => s.id === x.section);
  const c = conceptOfTerm(chapterData(sectionRef(book, sec))?.concepts ?? [], name, near) ?? conceptOfTerm(registry.concepts(book), name, near);
  return c ? definition(book, c, { section: sec }) : null;
};
const reference = (book: BookId, t: HTMLElement): Card | null => {
  const id = t.getAttribute('href')?.slice(1); if (!id) return null;
  const el = findEl(book, id); if (!el || !(el.matches('.example[id]') || el.matches('section[id]'))) return null;
  const title = headingText(el.querySelector('h2, h3')) ?? id;
  const p = el.querySelector('p'); const body = p ? firstSentence(headingText(p) ?? '') : undefined;
  return referenceCard({ id: spanId(id), title: t.dataset.xref ? `Example ${t.dataset.xref} · ${title}` : title, body }, navFor(book));
};
/* An equation set on the page is known by its TeX; one named by a link, as an
   answer names it, by its id. Either way it is a form of a concept, and the
   form of a definition opens the definition's card. */
const equation = (book: BookId, t: HTMLElement): Card | null => {
  const sec = sectionOf(book, t); const data = sec ? chapterData(sectionRef(book, sec)) : undefined; if (!data) return null;
  const tex = t.dataset.eq ? undefined : t.querySelector('.katex-mathml annotation')?.textContent;
  const found = t.dataset.eq ? formById(data.concepts, t.dataset.eq) ?? formById(registry.concepts(book), t.dataset.eq) : tex ? matchEquation(tex, statedOf(data.concepts)) : undefined;
  if (!found) return null;
  const { form, concept } = found;
  if (concept.kind === 'definition') return definition(book, concept, { section: form.section });
  return equationCard({ form, concept, introducedIn: form.anchor ? spanTitle(book, spanId(form.anchor)) : undefined }, navFor(book));
};

/* A concept's places are the spans of its own book that introduce and use it,
   by their headings. Its card waits on `readyFor` to have that book's chapters. */
const concept = (book: BookId, t: HTMLElement): Card | null => {
  const id = t.dataset.concept; if (!id) return null;
  const c = registry.concept(book, id); if (!c) return null;
  const sp = spansOf(book, conceptId(id));
  return conceptCard({ concept: c, intro: places(book, sp.intro), uses: places(book, sp.uses), built: !!registry.entry(sectionRef(book, sectionId(c.section)))?.built, onMap: t.matches('.node') }, navFor(book));
};
/* What must arrive before a target's card can be told: for a concept, every
   built chapter of its book; for a term, a symbol or an equation named away
   from its page, as in an answer, the chapter holding it; for the rest, nothing. */
const TABLED = '[data-concept], .term[data-term], [data-sym], [data-eq]';
const unloaded = (book: BookId, dir: string): boolean => { const s = registry.chapterStatusOf(book, dir); return s !== 'loaded' && s !== 'failed'; };
export const readyFor = (t: HTMLElement): Promise<void> | null => {
  const book = bookOfEl(t); if (!book || !t.matches(TABLED)) return null;
  if (!registry.hasBook(book)) return registry.ensureBook(book).then((m) => (m ? readyFor(t) ?? undefined : undefined));
  if (!t.matches('[data-concept]')) {
    const sec = sectionOf(book, t); const dir = sec ? registry.chapterOf(sectionRef(book, sec))?.dir : undefined;
    return dir && unloaded(book, dir) ? registry.loadChapters(book, [dir]).catch(() => {}) : null;
  }
  const dirs = registry.manifest(book).chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir);
  const wanted = dirs.filter((d) => unloaded(book, d));
  return wanted.length ? registry.loadChapters(book, wanted) : null;
};

/* A formula: the composition the marker wrote on the span, named and weighed
   from the book's elements sheet. */
const formula = (book: BookId, t: HTMLElement): Card | null => {
  const text = t.dataset.formula; if (!text) return null;
  const atoms = parseComposition(t.dataset.composition ?? '');
  const sheet = sheets.elements(book);
  const parts = sheet ? componentsOf(sheet, atoms).map(({ element, count }) => ({ symbol: element.symbol, name: element.name, count })) : atoms.map((a) => ({ symbol: a.symbol, name: a.symbol, count: a.count }));
  const mass = molarMass(atoms, sheets.table(book));
  return formulaCard({ formula: text, parts, ...(mass ? { mass } : {}) }, navFor(book));
};

/* The card for a target, or null when there is nothing to say. */
export const cardFor = (t: HTMLElement): Card | null => {
  const book = bookOfEl(t); if (!book) return null;
  if (t.hasAttribute('data-sym')) return variable(book, t);
  if (t.matches('.term')) return term(book, t);
  if (t.matches('.katex-display, [data-eq]')) return equation(book, t);
  if (t.matches('[data-concept]')) return concept(book, t);
  if (t.matches('.formula[data-formula]')) return formula(book, t);
  if (t.matches('a[href^="#"]')) return reference(book, t);
  return null;
};
/* Equation blocks open more slowly: the reader is likely just reading them. */
export const openDelay = (t: HTMLElement): number => (t.matches('.katex-display') ? 500 : 250);
