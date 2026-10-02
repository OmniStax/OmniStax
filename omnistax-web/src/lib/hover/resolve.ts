/* The cards. Every hover target resolves to one shape: a kind, a title, a
   short body, perhaps a symbol or equation to set in TeX, and one or two
   actions. Composition is pure: the facts come in as plain records and the
   navigation as callbacks, so the cards can be tested without a DOM. */
import type { VariableDTO, FormDTO, ConceptDTO } from '../content/schema';
import type { SpanId, SectionId } from '../types/ids';
import type { Stated } from '../sections/reference';
import { KIND_LABEL as CONCEPT_KIND } from '../sections/reference';

export type Kind = 'definition' | 'variable' | 'reference' | 'equation' | 'concept' | 'formula';
export type Action = { readonly label: string; readonly run: (split?: boolean) => void };
/* Places the card points at, under a lead of their own: "Introduced in", "Used
   in". A long list is cut short and the rest stand behind one
   trailing action, which opens the page holding them all. */
export type RefGroup = { readonly label: string; readonly links: readonly Action[]; readonly more?: Action };
/* An element as a formula card shows it: a chip on the element's own colour,
   the symbol, how many atoms of it the formula has, and the element's page. */
export type Chip = { readonly symbol: string; readonly name: string; readonly count: number; readonly run: (split?: boolean) => void };
/* A line under the body with a lead of its own: "Holds under", "In this section". */
export type Note = { readonly label: string; readonly text: string };
export type Card = {
  readonly kind: Kind;
  readonly eyebrow: string;          /* the kind line above the title: "Definition", "Term", "Formula · Result" */
  readonly unit?: string;            /* after the eyebrow, in its own case */
  readonly title: string;            /* plain text, or text with $…$ for the math action */
  readonly tex?: string;             /* set in place of a text title: the symbol or the equation */
  readonly body?: string;            /* one or two sentences, $…$ allowed */
  readonly notes?: readonly Note[];  /* $…$ allowed */
  readonly refs?: readonly RefGroup[];
  readonly chips?: readonly Chip[];   /* a formula's composition, one chip per element */
  readonly actions: readonly Action[];
};

/* What the cards can do. The shell's navigation is injected so this file stays pure. */
export type Nav = {
  readonly goSpan: (id: SpanId, split?: boolean) => void;   /* split: in a new group beside the focused one */
  readonly openSection: (sec: SectionId, split?: boolean) => void;
  readonly showView: (view: 'definitions' | 'formulas' | 'concepts', split?: boolean) => void;
  readonly openExternal: (sec: SectionId) => void;   /* the publisher's page for a section this app has not built */
  readonly showElement: (symbol: string, split?: boolean) => void;   /* opens the book's elements sheet with that element pinned */
};

const KIND_LABEL: Readonly<Record<Kind, string>> = { definition: 'Definition', variable: 'Symbol', reference: 'Reference', equation: 'Formula', concept: 'Concept', formula: 'Formula' };
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
  if (!f.formulasLoaded) return { kind: 'variable', eyebrow, title: f.sym, tex: f.tex, body: `Defined in ${f.section}.`, actions: [{ label: 'Go to section', run: (s?: boolean) => nav.openSection(f.section, s) }] };
  if (!v) return { kind: 'variable', eyebrow, title: f.sym, tex: f.tex, actions: [] };
  const anchor = v.anchor ? spanIdOf(v.anchor) : undefined;
  return {
    kind: 'variable', eyebrow, title: f.sym, tex: f.tex, body: sentence(v.meaning),
    actions: [
      anchor ? { label: 'Go to definition', run: (s?: boolean) => nav.goSpan(anchor, s) } : { label: 'Go to section', run: (s?: boolean) => nav.openSection(v.section as SectionId, s) },
      { label: 'Show in Definitions', run: (s?: boolean) => nav.showView('definitions', s) },
    ],
  };
};

/* ---------- definition ----------
   One card for a concept named by a word, a symbol or a form, whichever the
   reader hovered: its name and symbol, what the concept is, what the symbol
   means here where the chapter gives it another meaning too, its unit and the
   forms that state it, and the way back to where the book brings it in. The
   concept's kind heads the card, so a word that names a law says so. */
export const FORMULAS_SHOWN = 3;
export type DefinitionFacts = {
  readonly concept: ConceptDTO;
  readonly tex?: string;                     /* the symbol, where the concept has one */
  readonly unit?: string;
  readonly meaning?: string;                 /* the symbol's meaning in this section, given where the chapter redefines it */
  readonly elsewhere?: VariableDTO;          /* the other meaning */
  readonly intro?: SpanId;                   /* the span that introduces the concept */
};
const formulaGroup = (forms: readonly FormDTO[], nav: Nav): RefGroup[] => {
  const shown = forms.slice(0, FORMULAS_SHOWN);
  return shown.length ? [{ label: shown.length > 1 ? 'Formulas' : 'Formula', links: shown.map((e) => ({ label: `$${e.tex}$`, run: (s?: boolean) => (e.anchor ? nav.goSpan(spanIdOf(e.anchor), s) : nav.openSection(e.section, s)) })) }] : [];
};
export const definitionCard = (f: DefinitionFacts, nav: Nav): Card => {
  const c = f.concept;
  const statement = statementOf(c);
  const notes: Note[] = [
    ...(f.meaning ? [{ label: 'In this section', text: sentence(f.meaning) }] : []),
    ...(f.elsewhere ? [{ label: `Elsewhere in this chapter (${f.elsewhere.section})`, text: sentence(f.elsewhere.meaning) }] : []),
  ];
  return {
    kind: 'definition',
    eyebrow: CONCEPT_KIND[c.kind], ...(f.unit ? { unit: f.unit } : {}),
    title: [c.name, f.tex ? `$${f.tex}$` : ''].filter((s) => s !== '').join(' · '),
    body: statement ? sentence(statement) : undefined,
    ...(notes.length ? { notes } : {}),
    refs: formulaGroup(c.forms, nav),
    actions: [
      { label: 'Go to where it is first introduced', run: (s?: boolean) => (f.intro ? nav.goSpan(f.intro, s) : nav.openSection(secIdOf(c.section), s)) },
      { label: 'Show in Definitions', run: (s?: boolean) => nav.showView('definitions', s) },
    ],
  };
};

/* ---------- example or section reference ---------- */
export type ReferenceFacts = { readonly id: SpanId; readonly title: string; readonly body?: string };
export const referenceCard = (f: ReferenceFacts, nav: Nav): Card => ({ kind: 'reference', eyebrow: KIND_LABEL.reference, title: f.title, body: f.body, actions: [{ label: 'Go', run: (s?: boolean) => nav.goSpan(f.id, s) }] });
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
export const matchEquation = (annotation: string, forms: readonly Stated[]): Stated | undefined => {
  const key = normTex(annotation); if (key === '') return undefined;
  return forms.find((s) => normTex(s.form.tex) === key);
};
/* What a concept states, where it has a statement to give: a placeholder stands for a section nobody has built, and says nothing. */
const statementOf = (c: ConceptDTO | undefined): string | undefined => (c && c.status === 'built' ? c.statement : undefined);
/* A form of an axiom, a result, an idea or a skill: the concept's name, kind
   and statement, and what the form holds under. A form of a definition opens
   the definition's card instead. */
export type EquationFacts = Stated & { readonly introducedIn?: string };   /* introducedIn: the heading text of the anchor span */
export const equationCard = (f: EquationFacts, nav: Nav): Card => {
  const e = f.form; const anchor = e.anchor ? spanIdOf(e.anchor) : undefined;
  const statement = statementOf(f.concept);
  const body = statement ? sentence(statement) : f.introducedIn ? `Introduced in “${f.introducedIn}”.` : undefined;
  return {
    kind: 'equation', eyebrow: `${KIND_LABEL.equation} · ${CONCEPT_KIND[f.concept.kind]}`, title: f.concept.name, body,
    ...(e.condition ? { notes: [{ label: 'Holds under', text: sentence(e.condition) }] } : {}),
    actions: [
      ...(anchor ? [{ label: 'Go to where it is introduced', run: (s?: boolean) => nav.goSpan(anchor, s) }] : [{ label: 'Go to section', run: (s?: boolean) => nav.openSection(e.section, s) }]),
      { label: 'Show in Formulas', run: (s?: boolean) => nav.showView('formulas', s) },
    ],
  };
};


/* ---------- chemical formula ---------- */

/* A formula in the prose: what it is made of, what a mole of it weighs, and the
   way through to the elements page. The composition comes off the span the
   marker wrote, so the card does not parse the formula a second time; the
   masses come from the book's elements sheet, and where the sheet has not been
   read yet the card says what it can and leaves the arithmetic out. */
export type FormulaFacts = {
  readonly formula: string;
  readonly parts: readonly { readonly symbol: string; readonly name: string; readonly count: number }[];
  readonly mass?: { readonly total: number; readonly working: string };
};
export const formulaCard = (f: FormulaFacts, nav: Nav): Card => {
  const first = f.parts[0];
  const names = f.parts.map((p) => p.name).join(', ');
  return {
    kind: 'formula', eyebrow: KIND_LABEL.formula, title: f.formula,
    body: f.mass ? f.mass.working : names,
    chips: f.parts.map((p) => ({ ...p, run: (s?: boolean) => nav.showElement(p.symbol, s) })),
    actions: first ? [{ label: 'Go to the elements', run: (s?: boolean) => nav.showElement(first.symbol, s) }] : [],
  };
};

/* ---------- concept ---------- */
/* A concept: what it states, and then the book itself — the span that introduces
   it and the spans that go on using it. Where the text uses a concept everywhere, the list would be
   the section's table of contents, so it is cut short and the section stands for
   the rest. A placeholder concept belongs to a section not built here. */
export const USES_SHOWN = 4;
export type Place = { readonly id: SpanId; readonly title: string };          /* a span of the text, by heading */
export type ConceptFacts = {
  readonly concept: ConceptDTO;
  readonly intro: readonly Place[];      /* spans whose coverage introduces it */
  readonly uses: readonly Place[];       /* spans whose coverage uses or reinforces it */
  readonly built: boolean;               /* the concept's section is built in this app */
  readonly onMap: boolean;               /* the card opened from the concept map itself, so it need not offer the map */
};
export const conceptCard = (f: ConceptFacts, nav: Nav): Card => {
  const c = f.concept, sec = secIdOf(c.section), first = f.intro[0];
  const eyebrow = `${CONCEPT_KIND[c.kind]} · section ${c.section}`;
  if (c.status === 'placeholder') return {
    kind: 'concept', eyebrow, title: c.name, body: `Section ${c.section} is not built yet.`,
    actions: [f.built ? { label: 'Go to section', run: (s?: boolean) => nav.openSection(sec, s) } : { label: 'Open in OpenStax', run: () => nav.openExternal(sec) }],
  };
  const uses = f.uses.slice(0, USES_SHOWN);
  const refs: RefGroup[] = [];
  if (f.intro.length) refs.push({ label: 'Introduced in', links: f.intro.map((p) => ({ label: p.title, run: (s?: boolean) => nav.goSpan(p.id, s) })) });
  if (uses.length) refs.push({ label: 'Used in', links: uses.map((p) => ({ label: p.title, run: (s?: boolean) => nav.goSpan(p.id, s) })), ...(f.uses.length > uses.length ? { more: { label: `and ${f.uses.length - uses.length} more`, run: (s?: boolean) => nav.openSection(sec, s) } } : {}) });
  return {
    kind: 'concept', eyebrow, title: c.name, body: c.statement ? sentence(c.statement) : undefined, refs,
    actions: [
      { label: 'Go to definition', run: (s?: boolean) => (first ? nav.goSpan(first.id, s) : nav.openSection(sec, s)) },
      ...(c.forms.length ? [{ label: 'Show in Formulas', run: (s?: boolean) => nav.showView('formulas', s) }] : []),
      ...(f.onMap ? [] : [{ label: 'Show in Concept map', run: (s?: boolean) => nav.showView('concepts', s) }]),
    ],
  };
};
