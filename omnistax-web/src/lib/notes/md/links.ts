/* A wiki link is how one note points at something else: another note by its
   name, a section of the book by its number, one highlight by its id, or one
   thing the book itself holds — an equation of the formula sheet, a term of
   the glossary, a symbol with a meaning, a concept of the map. The syntax is
   Obsidian's — `[[…]]` for a link, `![[…]]` for an embed, and a `|alias`
   suffix for the words to show instead — and this module is the only place
   that knows it. Everything downstream works on the value parsed here, so the
   renderer, the autocomplete and the backlinks all read one grammar.

   What the book holds is named by the section that holds it and then its key
   within that section, `eq:16.1:eq-hooke`, because a chapter's tables are
   fetched only when something asks for them: the section says which chapter
   to fetch, and stands in the words while it is on its way. */

/* The things a link can name. They are strings, but never the same string
   twice, so each is given a name of its own. */
export type NoteName = string;      /* the name of a note, as the reader typed it: "Damped motion" */
export type SectionRef = string;    /* a section by number: "16.4" */
export type HighlightRef = string;  /* the id of one highlight: the part after hl: */
export type EquationRef = string;   /* the id of an equation in its chapter's table: "eq-hooke" */
export type TermRef = string;       /* a glossary term as the book spells it: "deformation" */
export type SymbolRef = string;     /* the key of a symbol in the book's table: "F", "Δx" */
export type ConceptRef = string;    /* a concept's canonical id: "hookes-law" */

export type LinkTarget =
  | { readonly kind: 'note'; readonly name: NoteName }
  | { readonly kind: 'section'; readonly section: SectionRef }
  | { readonly kind: 'highlight'; readonly id: HighlightRef }
  | { readonly kind: 'equation'; readonly section: SectionRef; readonly id: EquationRef }
  | { readonly kind: 'term'; readonly section: SectionRef; readonly term: TermRef }
  | { readonly kind: 'symbol'; readonly section: SectionRef; readonly sym: SymbolRef }
  | { readonly kind: 'concept'; readonly section: SectionRef; readonly id: ConceptRef };

/* The kinds that live in the book's tables rather than in the reader's own
   things: every one of them is written as kind, section, key. */
export type BookKind = 'equation' | 'term' | 'symbol' | 'concept';
export type BookTarget = Extract<LinkTarget, { kind: BookKind }>;
export const BOOK_PREFIX: Readonly<Record<BookKind, string>> = { equation: 'eq', term: 'def', symbol: 'sym', concept: 'concept' };
export const isBook = (t: LinkTarget): t is BookTarget => t.kind in BOOK_PREFIX;

/* Any target may carry an alias, the words the reader wants shown in its place. */
export type Link = LinkTarget & { readonly alias?: string };

/* A section is written the way the book numbers it; anything after hl: is a
   highlight; eq:, def:, sym: and concept: name the book's own things, section
   first; whatever is left is the name of a note. */
const SECTION = /^\d+\.\d+$/;
const HIGHLIGHT = /^hl:(.+)$/;
const BOOK = /^(eq|def|sym|concept):(\d+\.\d+):(.+)$/;
const bookTarget = (prefix: string, section: SectionRef, key: string): LinkTarget =>
  prefix === 'eq' ? { kind: 'equation', section, id: key }
    : prefix === 'def' ? { kind: 'term', section, term: key }
      : prefix === 'sym' ? { kind: 'symbol', section, sym: key }
        : { kind: 'concept', section, id: key };
/* Both the link and the embed form, as they appear in a note's markdown. */
export const LINK_PATTERN = /!?\[\[([^\]\n]+)\]\]/g;

const withAlias = (target: LinkTarget, alias: string | undefined): Link => (alias ? { ...target, alias } : target);

/* `inner` is what stands between the brackets, alias and all. */
export const parseLink = (inner: string): Link => {
  const bar = inner.indexOf('|');
  const target = (bar < 0 ? inner : inner.slice(0, bar)).trim();
  const alias = bar < 0 ? undefined : inner.slice(bar + 1).trim() || undefined;
  const hl = HIGHLIGHT.exec(target);
  if (hl) return withAlias({ kind: 'highlight', id: hl[1].trim() }, alias);
  const book = BOOK.exec(target);
  if (book) return withAlias(bookTarget(book[1], book[2], book[3].trim()), alias);
  if (SECTION.test(target)) return withAlias({ kind: 'section', section: target }, alias);
  return withAlias({ kind: 'note', name: target }, alias);
};

/* The string form of a target, ignoring the alias: what a `data-link` carries,
   and what tells two links to the same place apart from two links elsewhere. */
export const linkKey = (link: Link): string =>
  link.kind === 'note' ? `note:${link.name}` : link.kind === 'section' ? `section:${link.section}` : linkInner(link);

/* The key of a book thing within its section: the part after the section. */
export const bookKey = (t: BookTarget): string =>
  t.kind === 'equation' || t.kind === 'concept' ? t.id : t.kind === 'term' ? t.term : t.sym;

/* The inner text that writes this link, the inverse of parseLink for the
   autocomplete: what goes between the brackets when a candidate is chosen. */
export const linkInner = (target: LinkTarget): string =>
  target.kind === 'note' ? target.name
    : target.kind === 'section' ? target.section
      : target.kind === 'highlight' ? `hl:${target.id}`
        : `${BOOK_PREFIX[target.kind]}:${target.section}:${bookKey(target)}`;

/* The text a note holds to show a thing whole, as a card: what a row dragged
   out of a panel drops into the editor, and what the picker writes for one. */
export const embedText = (target: LinkTarget): string => `![[${linkInner(target)}]]`;

/* Every link a note makes, in the order it makes them; the backlinks of a note
   are the notes whose findLinks holds it. */
export const findLinks = (markdown: string): readonly Link[] =>
  [...markdown.matchAll(LINK_PATTERN)].map((m) => parseLink(m[1]));
