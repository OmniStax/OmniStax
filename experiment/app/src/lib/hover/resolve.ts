/* The cards. Every hover target resolves to one shape: a kind, a title, a
   short body, perhaps a symbol or equation to set in TeX, and one or two
   actions. Composition is pure: the facts come in as plain records and the
   navigation as callbacks, so the cards can be tested without a DOM. */
import type { VariableDTO, EquationDTO, ConceptDTO } from '../content/schema';
import type { SpanId, SectionId } from '../types/ids';

export type Kind = 'variable' | 'figure' | 'term' | 'reference' | 'equation' | 'concept';
export type Action = { readonly label: string; readonly run: () => void };
export type Card = {
  readonly kind: Kind;
  readonly eyebrow: string;          /* the kind line above the title: "Force · N", "Figure", "Equation · important" */
  readonly title: string;            /* plain text, or text with $…$ for the math action */
  readonly tex?: string;             /* set in place of a text title: the symbol or the equation */
  readonly body?: string;            /* one or two sentences, $…$ allowed */
  readonly actions: readonly Action[];
};

/* What the cards can do. The shell's navigation is injected so this file stays pure. */
export type Nav = {
  readonly goSpan: (id: SpanId) => void;
  readonly openSection: (sec: SectionId) => void;
  readonly showView: (view: 'definitions' | 'formulas' | 'concepts') => void;
  readonly showOriginal: (figure: SpanId) => void;
  readonly openExternal: (sec: SectionId) => void;   /* the publisher's page for a section this app has not built */
};

const KIND_LABEL: Readonly<Record<Kind, string>> = { variable: 'Symbol', figure: 'Figure', term: 'Term', reference: 'Reference', equation: 'Equation', concept: 'Concept' };
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sentence = (s: string): string => { const t = s.trim(); return t === '' ? '' : /[.!?]$/.test(t) ? cap(t) : cap(t) + '.'; };
const spanIdOf = (s: string): SpanId => s as SpanId;
const secIdOf = (s: string): SectionId => s as SectionId;

/* ---------- variable ---------- */
export type VariableFacts = {
  readonly sym: string;
  readonly tex: string;                      /* the macro from the book's symbol table, or the key itself */
  readonly typeLabel?: string;               /* "Force" */
  readonly variable?: VariableDTO;
  readonly section: SectionId;               /* the section the hover sits in */
  readonly formulasLoaded: boolean;
};
export const variableCard = (f: VariableFacts, nav: Nav): Card => {
  const v = f.variable;
  const eyebrow = [KIND_LABEL.variable, f.typeLabel, v?.unit].filter((s): s is string => !!s).join(' · ');
  if (!f.formulasLoaded) return { kind: 'variable', eyebrow, title: f.sym, tex: f.tex, body: `Defined in ${f.section}.`, actions: [{ label: 'Go to section', run: () => nav.openSection(f.section) }] };
  if (!v) return { kind: 'variable', eyebrow, title: f.sym, tex: f.tex, actions: [] };
  const anchor = v.anchor ? spanIdOf(v.anchor) : undefined;
  return {
    kind: 'variable', eyebrow, title: f.sym, tex: f.tex, body: sentence(v.meaning),
    actions: [
      anchor ? { label: 'Go to definition', run: () => nav.goSpan(anchor) } : { label: 'Go to section', run: () => nav.openSection(v.section as SectionId) },
      { label: 'Show in Definitions', run: () => nav.showView('definitions') },
    ],
  };
};

/* ---------- figure ---------- */
export type FigureFacts = { readonly number: string; readonly id: SpanId; readonly section: SectionId; readonly caption?: string; readonly hasOriginal: boolean };
export const figureCard = (f: FigureFacts, nav: Nav): Card => ({
  kind: 'figure', eyebrow: KIND_LABEL.figure, title: `Figure ${f.number}`,
  body: f.caption !== undefined ? f.caption : `Figure ${f.number} is in section ${f.section}.`,
  actions: [{ label: 'Go to figure', run: () => nav.goSpan(f.id) }, ...(f.hasOriginal ? [{ label: 'Show original', run: () => nav.showOriginal(f.id) }] : [])],
});

/* ---------- glossary term ---------- */
export type TermFacts = { readonly term: string; readonly definition?: string; readonly section: SectionId; readonly anchor?: SpanId };
export const termCard = (f: TermFacts, nav: Nav): Card => ({
  kind: 'term', eyebrow: KIND_LABEL.term, title: f.term, body: f.definition !== undefined ? sentence(f.definition) : undefined,
  actions: [{ label: 'Go to section', run: () => (f.anchor ? nav.goSpan(f.anchor) : nav.openSection(f.section)) }],
});
/* The span that introduces the concept named like a term, from a chapter's coverage; a concept's name may carry math ("Force constant $\kk$"). */
const plainName = (s: string): string => s.replace(/\$[^$]*\$/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
export const introducingSpan = (term: string, concepts: readonly ConceptDTO[], coverage: readonly { span: string; introduces: readonly string[] }[]): SpanId | undefined => {
  const c = concepts.find((x) => plainName(x.name) === term.trim().toLowerCase()); if (!c) return undefined;
  const cov = coverage.find((x) => x.introduces.includes(c.id)); return cov ? spanIdOf(cov.span) : undefined;
};

/* ---------- example or section reference ---------- */
export type ReferenceFacts = { readonly id: SpanId; readonly title: string; readonly body?: string };
export const referenceCard = (f: ReferenceFacts, nav: Nav): Card => ({ kind: 'reference', eyebrow: KIND_LABEL.reference, title: f.title, body: f.body, actions: [{ label: 'Go', run: () => nav.goSpan(f.id) }] });
/* The first sentence of a paragraph, for a reference card's body. */
export const firstSentence = (text: string): string => { const t = text.replace(/\s+/g, ' ').trim(); const m = /^.*?[.!?](?=\s|$)/.exec(t); return m ? m[0] : t; };

/* ---------- equation ---------- */
/* TeX as the sheet and the page may each spell it: no spacing of any kind, one \frac, bare single-token exponents,
   no closing punctuation (inside a final \text{} too), no trailing "(constant a)" qualifier. */
export const normTex = (s: string): string =>
  s.replace(/\s+|\\[,;!]|\\quad/g, '')
    .replace(/\\[td]frac/g, '\\frac').replace(/([\^_])\{(\w)\}/g, '$1$2')
    .replace(/\(\\text\{[^}]*\}[^)]*\)$/, '').replace(/[.,;]+$/, '').replace(/(\\text\{[^}]*?)[.,;]+\}$/, '$1}')
    .replace(/\(\\text\{[^}]*\}[^)]*\)$/, '').replace(/[.,;]+$/, '');
export const matchEquation = (annotation: string, equations: readonly EquationDTO[]): EquationDTO | undefined => {
  const key = normTex(annotation); if (key === '') return undefined;
  return equations.find((e) => normTex(e.tex) === key);
};
export type EquationFacts = { readonly equation: EquationDTO; readonly concept?: ConceptDTO; readonly introducedIn?: string };   /* introducedIn: the heading text of the anchor span */
export const equationCard = (f: EquationFacts, nav: Nav): Card => {
  const e = f.equation; const anchor = e.anchor ? spanIdOf(e.anchor) : undefined;
  const eyebrow = e.important ? `${KIND_LABEL.equation} · important` : KIND_LABEL.equation;
  const title = f.concept?.name ?? (f.introducedIn ? `In “${f.introducedIn}”` : `Section ${e.section}`);
  const body = f.concept?.why ?? (f.introducedIn && f.concept ? `Introduced in “${f.introducedIn}”.` : undefined);
  return {
    kind: 'equation', eyebrow, title, body,
    actions: [
      ...(anchor ? [{ label: 'Go to where it is introduced', run: () => nav.goSpan(anchor) }] : [{ label: 'Go to section', run: () => nav.openSection(e.section as SectionId) }]),
      ...(e.important ? [{ label: 'Show in Formulas', run: () => nav.showView('formulas') }] : []),
    ],
  };
};

/* ---------- concept ---------- */
/* A concept a problem tests: what it is, where the text introduces it, and how much of
   the problem set rests on it. A placeholder concept belongs to a section not built here. */
export type ConceptFacts = { readonly concept: ConceptDTO; readonly anchor?: SpanId; readonly introducedIn?: string; readonly tested: number; readonly built: boolean };
export const conceptCard = (f: ConceptFacts, nav: Nav): Card => {
  const c = f.concept, sec = secIdOf(c.section), anchor = f.anchor;
  const eyebrow = `${KIND_LABEL.concept} · ${c.kind} · section ${c.section}`;
  if (c.placeholder) return {
    kind: 'concept', eyebrow, title: c.name, body: `Section ${c.section} is not built yet.`,
    actions: [f.built ? { label: 'Go to section', run: () => nav.openSection(sec) } : { label: 'Open in OpenStax', run: () => nav.openExternal(sec) }],
  };
  const body = [c.why ? sentence(c.why) : '', f.introducedIn ? `Introduced in “${f.introducedIn}”.` : '', `Tested by ${f.tested} exercise${f.tested === 1 ? '' : 's'}.`].filter((s) => s !== '').join(' ');
  return {
    kind: 'concept', eyebrow, title: c.name, body,
    actions: [
      { label: 'Go to definition', run: () => (anchor ? nav.goSpan(anchor) : nav.openSection(sec)) },
      { label: 'Show in Concept map', run: () => nav.showView('concepts') },
    ],
  };
};
