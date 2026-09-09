/* A wiki link is how one note points at something else: another note by its
   name, a section of the book by its number, or one highlight by its id. The
   syntax is Obsidian's — `[[…]]` for a link, `![[…]]` for an embed, and a
   `|alias` suffix for the words to show instead — and this module is the only
   place that knows it. Everything downstream works on the value parsed here,
   so the renderer, the autocomplete and the backlinks all read one grammar. */

/* The three things a link can name. They are strings, but never the same
   string twice, so each is given a name of its own. */
export type NoteName = string;      /* the name of a note, as the reader typed it: "Damped motion" */
export type SectionRef = string;    /* a section by number: "16.4" */
export type HighlightRef = string;  /* the id of one highlight: the part after hl: */

export type LinkTarget =
  | { readonly kind: 'note'; readonly name: NoteName }
  | { readonly kind: 'section'; readonly section: SectionRef }
  | { readonly kind: 'highlight'; readonly id: HighlightRef };

/* Any target may carry an alias, the words the reader wants shown in its place. */
export type Link = LinkTarget & { readonly alias?: string };

/* A section is written the way the book numbers it; anything after hl: is a
   highlight; whatever is left is the name of a note. */
const SECTION = /^\d+\.\d+$/;
const HIGHLIGHT = /^hl:(.+)$/;
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
  if (SECTION.test(target)) return withAlias({ kind: 'section', section: target }, alias);
  return withAlias({ kind: 'note', name: target }, alias);
};

/* The string form of a target, ignoring the alias: what a `data-link` carries,
   and what tells two links to the same place apart from two links elsewhere. */
export const linkKey = (link: Link): string =>
  link.kind === 'note' ? `note:${link.name}` : link.kind === 'section' ? `section:${link.section}` : `hl:${link.id}`;

/* The inner text that writes this link, the inverse of parseLink for the
   autocomplete: what goes between the brackets when a candidate is chosen. */
export const linkInner = (target: LinkTarget): string =>
  target.kind === 'note' ? target.name : target.kind === 'section' ? target.section : `hl:${target.id}`;

/* Every link a note makes, in the order it makes them; the backlinks of a note
   are the notes whose findLinks holds it. */
export const findLinks = (markdown: string): readonly Link[] =>
  [...markdown.matchAll(LINK_PATTERN)].map((m) => parseLink(m[1]));
