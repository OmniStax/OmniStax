/* From a hovered node to its card: find the target the pointer is on, gather
   the facts from the DOM and the registry, and compose the card. This is the
   only file in the hover layer that reads the registry or the document. */
import { registry } from '../sections/registry.svelte';
import { focus } from '../sections/focus.svelte';
import { goSpan, findEl, openDoc, reveal } from '../sections/nav.svelte';
import { pin, spansOf, testers } from '../sections/concepts.svelte';
import { layoutStore } from '../layout/store.svelte';
import { split } from '../layout/model';
import { type SectionId, type SpanId, sectionId, spanId, conceptId, sectionOfSpan, exerciseDomId, newViewItem } from '../types/ids';
import { symOf, typeOf, lookupVariable } from './data';
import { type Card, type Nav, variableCard, figureCard, termCard, referenceCard, equationCard, conceptCard, introducingSpan, matchEquation, firstSentence } from './resolve';

/* The elements a card can open for. An equation block has no underline; the rest are underlined by Hover.svelte. */
export const TARGET = '[data-sym], a.figref[data-figref], .term[data-term], a.xref, article a[href^="#"], .fig-root a[href^="#"], .ex-root a[href^="#"], .katex-display, [data-concept]';
export const targetOf = (node: EventTarget | null): HTMLElement | null => {
  const el = node instanceof Element ? node : null; if (!el) return null;
  if (el.closest('.hover-card')) return null;
  const t = el.closest<HTMLElement>(TARGET);   /* the nearest wins: a symbol inside an equation block is the symbol */
  return t?.hasAttribute('data-sym') ? t.closest<HTMLElement>('[data-concept]') ?? t : t;   /* except on a concept, whose name may set a symbol in math: the concept wins */
};

/* The section a node is read in: its article or figure root, else the focused document. */
const sectionOf = (el: Element): SectionId => sectionId(el.closest<HTMLElement>('[data-sec]')?.dataset.sec ?? focus.section);
const chapterData = (sec: SectionId) => { const dir = registry.chapterOf(sec)?.dir; return dir ? registry.chapters[dir] : undefined; };

/* A heading's text without the MathML twin of its math, and without the example number. */
export const headingText = (h: Element | null | undefined): string | undefined => {
  if (!h) return undefined;
  const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
  return c.textContent?.replace(/\s+/g, ' ').replace(/^Example [\d.]+ · /, '').trim();
};
const spanTitle = (id: SpanId): string | undefined => headingText(findEl(id)?.querySelector('h2, h3'));
/* The name a list of places gives a span: the heading as the book prints it,
   example number and all, since the number is half of how a reader knows it.
   A span of a section not yet loaded has no heading here, and is left unnamed. */
export const spanName = (id: SpanId): string | undefined => {
  const h = findEl(id)?.querySelector('h2, h3'); if (!h) return undefined;
  const c = h.cloneNode(true) as HTMLElement; c.querySelectorAll('.katex-mathml').forEach((m) => m.remove()); return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
};
/* Spans as places: the named ones by heading, and the unnamed ones of a section not
   yet loaded gathered into one place per section, named by the section's title. */
const places = (ids: readonly SpanId[]): { id: SpanId; title: string }[] => {
  const named = ids.flatMap((id) => { const t = spanName(id); return t ? [{ id, title: t }] : []; });
  const rest = ids.filter((id) => !spanName(id)); const secs = [...new Set(rest.map(sectionOfSpan))];
  return [...named, ...secs.map((sec) => ({ id: rest.find((id) => sectionOfSpan(id) === sec)!, title: `${sec} · ${registry.entry(sec)?.title ?? 'section'}` }))];
};

/* A card sends the reader to a view of that kind: the page of it already open,
   wherever it stands, since a second one would only say the same thing; and where
   none is open, a page of its own beside what is being read. */
const showView = (view: 'definitions' | 'formulas' | 'concepts'): void => {
  const host = document.querySelector<HTMLElement>(`.view[data-view="${view}"]`);
  if (host) { reveal(host); return; }
  layoutStore.apply((x) => split(x, x.focus, 'right', newViewItem(view)));
};
const showOriginal = (figure: SpanId): void => {
  goSpan(figure);
  const show = () => { const f = findEl(figure); const b = f?.querySelector<HTMLButtonElement>('button.fig-original'); if (f && b && !f.classList.contains('show-original')) b.click(); };
  const f = findEl(figure); if (f) { show(); return; }
  openDoc(sectionOfSpan(figure), 'text').then(() => requestAnimationFrame(show));
};
const openExternal = (sec: SectionId): void => { window.open(registry.entry(sec)?.openstax ?? registry.manifest.openstax, '_blank', 'noopener'); };
export const nav: Nav = {
  goSpan, openSection: (sec) => { openDoc(sec, 'text'); }, showView, showOriginal, openExternal,
  showExercises: (sec, id) => { if (pin.pinned !== id) pin.toggle(id); openDoc(sec, 'exercises'); },   /* the problem set, with the cards that test the concept already marked */
};

/* ---------- resolvers, one per kind ---------- */
const variable = (t: HTMLElement): Card | null => {
  const sym = symOf(t); if (!sym) return null;
  const sec = sectionOf(t); const data = chapterData(sec);
  const type = typeOf(t); const typeLabel = type ? registry.manifest.types[type]?.label : undefined;
  return variableCard({ sym, tex: registry.manifest.symbols[sym] ?? sym, typeLabel, section: sec, formulasLoaded: !!data, variable: data ? lookupVariable(data.formulas.variables, sym, sec) : undefined }, nav);
};
const figure = (t: HTMLElement): Card | null => {
  const n = t.dataset.figref; const id = t.getAttribute('href')?.slice(1); if (!n || !id) return null;
  const fig = findEl(id);
  const caption = fig ? (fig.querySelector('.sim-head span:not(.eyebrow)')?.textContent ?? fig.dataset.originalCaption)?.replace(/\s+/g, ' ').trim() : undefined;
  return figureCard({ number: n, id: spanId(id), section: sectionOfSpan(spanId(id)), caption, hasOriginal: !!fig?.dataset.original }, nav);
};
const term = (t: HTMLElement): Card | null => {
  const name = t.dataset.term; if (!name) return null;
  const sec = sectionOf(t); const data = chapterData(sec);
  const g = data?.formulas.glossary.find((x) => x.term.toLowerCase() === name.toLowerCase());
  const anchor = data ? introducingSpan(name, data.concepts.concepts, data.concepts.coverage) : undefined;
  const home = g ? sectionId(g.section) : sec;
  const top = registry.state(home)?.docs.text?.querySelector<HTMLElement>('section[id]')?.id;   /* the section's first span, when it is loaded */
  return termCard({ term: g?.term ?? name, definition: g?.definition, section: home, anchor: anchor ?? (top ? spanId(top) : undefined) }, nav);
};
const reference = (t: HTMLElement): Card | null => {
  const id = t.getAttribute('href')?.slice(1); if (!id) return null;
  const el = findEl(id); if (!el || !(el.matches('.example[id]') || el.matches('section[id]'))) return null;
  const title = headingText(el.querySelector('h2, h3')) ?? id;
  const p = el.querySelector('p'); const body = p ? firstSentence(headingText(p) ?? '') : undefined;
  return referenceCard({ id: spanId(id), title: t.dataset.xref ? `Example ${t.dataset.xref} · ${title}` : title, body }, nav);
};
const equation = (t: HTMLElement): Card | null => {
  const tex = t.querySelector('.katex-mathml annotation')?.textContent; if (!tex) return null;
  const data = chapterData(sectionOf(t)); if (!data) return null;
  const e = matchEquation(tex, data.formulas.equations); if (!e) return null;
  const concept = data.concepts.concepts.find((c) => c.eq === e.id);
  return equationCard({ equation: e, concept, introducedIn: e.anchor ? spanTitle(spanId(e.anchor)) : undefined }, nav);
};

/* A concept's places: the spans that introduce and use it by their headings, and
   the problems that test it by the names the book prints on them — an exercise
   set in another section says so, since the card is read from this one. */
const concept = (t: HTMLElement): Card | null => {
  const id = t.dataset.concept; if (!id) return null;
  const c = registry.concept(id); if (!c) return null;
  const cid = conceptId(id), sec = sectionId(c.section), sp = spansOf(cid);
  const tested = testers(cid).map(({ section, ex }) => ({ id: exerciseDomId(section, ex.id), label: `${section === sec ? '' : `${section} · `}${registry.manifest.exerciseKinds[ex.kind] ?? ex.kind} ${ex.id}` }));
  return conceptCard({ concept: c, intro: places(sp.intro), uses: places(sp.uses), tested, built: !!registry.entry(sec)?.built, onMap: t.matches('.node') }, nav);
};

/* The card for a target, or null when there is nothing to say. */
export const cardFor = (t: HTMLElement): Card | null => {
  if (t.hasAttribute('data-sym')) return variable(t);
  if (t.matches('a.figref')) return figure(t);
  if (t.matches('.term')) return term(t);
  if (t.matches('.katex-display')) return equation(t);
  if (t.matches('[data-concept]')) return concept(t);
  if (t.matches('a[href^="#"]')) return reference(t);
  return null;
};
/* Equation blocks open more slowly: the reader is likely just reading them. */
export const openDelay = (t: HTMLElement): number => (t.matches('.katex-display') ? 500 : 250);
