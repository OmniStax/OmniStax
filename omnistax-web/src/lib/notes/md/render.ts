/* A note's markdown into the HTML the reader sees. The module is pure: every
   lookup it needs — a note by name, a section by number, a highlight, an image
   the reader pasted — arrives as a resolver, so the same markdown renders the
   same way in a test as it does in the app.

   marked does the markdown itself, and four extensions add what the note
   syntax asks for beyond it: wiki links and the cards a note holds, images
   carrying a width, and KaTeX for `$…$` and `$$…$$`. Doing this as extensions
   rather than as passes over the text keeps code spans and fenced blocks
   literal — a dollar sign inside backticks stays a dollar sign. Raw HTML
   written in a note is escaped and never passed through, and an image or link
   whose address is not one of the few shapes allowed loses it. */
import { Marked, type Token, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import katex from 'katex';
import { isBook, linkInner, parseLink, type BookTarget, type ConceptRef, type EquationRef, type HighlightRef, type Link, type NoteName, type SectionRef, type SymbolRef, type TermRef } from './links';

export type NoteRef = string;    /* the id of a note document, what a resolved note link points at */
export type AssetRef = string;   /* the id of a stored image */
export type DataUrl = string;

export type SectionInfo = { readonly title: string };
export type HighlightInfo = { readonly quote: string; readonly color: string; readonly text: string; readonly section: string };

/* What the book's own things say on a card. Each is what one row of a chapter's
   tables holds, gathered for this one card and nothing more: the renderer never
   sees the tables, only the answer. A symbol and an equation are set in TeX, so
   they carry the source the view hands to the book's own renderer, which knows
   the macros the book writes its symbols with. */
export type EquationInfo = { readonly tex: string; readonly condition?: string; readonly important: boolean; readonly conceptName?: string; readonly anchor?: string; readonly section: string };
export type TermInfo = { readonly term: string; readonly definition: string; readonly section: string };
export type SymbolInfo = { readonly sym: string; readonly tex: string; readonly meaning: string; readonly unit: string; readonly typeLabel?: string; readonly section: string; readonly anchor?: string };
export type ConceptInfo = { readonly name: string; readonly kind: 'idea' | 'result' | 'skill'; readonly why?: string; readonly section: string; readonly eqTex?: string; readonly placeholder: boolean };

/* Everything the renderer cannot know by itself. Each lookup answers null when
   the thing is gone, and the link renders dead rather than breaking. A thing of
   the book is asked for by the section that holds it and its key within that
   section, and a chapter nobody has fetched yet answers null like a chapter
   that never held it: the view asks for the chapter and the note renders again
   when it lands. */
export type Resolver = {
  note(name: NoteName): NoteRef | null;
  section(id: SectionRef): SectionInfo | null;
  highlight(id: HighlightRef): HighlightInfo | null;
  asset(id: AssetRef): DataUrl | null;
  equation(section: SectionRef, id: EquationRef): EquationInfo | null;
  term(section: SectionRef, term: TermRef): TermInfo | null;
  symbol(section: SectionRef, sym: SymbolRef): SymbolInfo | null;
  concept(section: SectionRef, id: ConceptRef): ConceptInfo | null;
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── wiki links ─────────────────────────────────────────────────────────── */

const anchor = (target: string, label: string): string => `<a class="wiki" data-link="${esc(target)}" href="#">${esc(label)}</a>`;
/* One rule for everything that resolves to nothing: the words, marked dead, and
   no link to follow. A thing of the book keeps what names it as well, since a
   chapter that has not been fetched resolves to nothing too, and the view reads
   that back to ask for the chapter. */
const dead = (label: string, embed?: string): string =>
  `<span class="wiki dead"${embed ? ` data-embed="${esc(embed)}"` : ''}>${esc(label)}</span>`;

const highlightEmbed = (id: HighlightRef, r: Resolver, fallback: string): string => {
  const h = r.highlight(id);
  if (!h) return dead(fallback);
  return `<div class="hl-embed hl-${esc(h.color)}" data-hl="${esc(id)}"><blockquote>${esc(h.quote)}</blockquote>` +
    `<div class="hl-meta">${esc(h.section)}</div><div class="hl-text">${esc(h.text)}</div></div>`;
};

/* ── the book's own things, as cards ────────────────────────────────────── */

/* The book writes a definition as a phrase and a meaning as a clause; a card
   sets them as the sentences they stand for, the way the hover cards do. */
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sentence = (s: string): string => { const t = s.trim(); return t === '' ? '' : /[.!?]$/.test(t) ? cap(t) : `${cap(t)}.`; };
const meta = (...parts: readonly (string | undefined)[]): string => parts.filter((p): p is string => !!p && p.trim() !== '').join(' · ');

/* A card is an eyebrow and then its lines, in the order the reader reads them.
   A line is either words — which may carry `$…$`, and say so, so the view sets
   the maths in them — or TeX whole, which the view sets from the attribute:
   the book's macros are not KaTeX's, so nothing here renders it. */
type Line = { readonly cls: 'embed-title' | 'embed-body'; readonly text: string } | { readonly tex: string };
type Card = { readonly eyebrow: string; readonly lines: readonly Line[] };

const lineHtml = (l: Line): string =>
  'tex' in l ? `<div class="embed-tex" data-tex="${esc(l.tex)}"></div>`
    : `<div class="${l.cls}"${l.text.includes('$') ? ' data-math="1"' : ''}>${esc(l.text)}</div>`;

const cardHtml = (t: BookTarget, c: Card): string =>
  `<div class="book-embed kind-${t.kind}" data-embed="${esc(linkInner(t))}">` +
  `<div class="embed-eyebrow">${esc(c.eyebrow)}</div>` +
  c.lines.filter((l) => ('tex' in l ? l.tex.trim() !== '' : l.text.trim() !== '')).map(lineHtml).join('') +
  '</div>';

/* One card per kind, saying what the hover card for that thing says: an
   equation set whole under what holds it and what it states, a term under its
   definition, a symbol under its meaning, a concept under why it matters and
   the equation that states it. A concept whose section nobody has built says so
   instead, because it has nothing else to give. */
const bookCard = (t: BookTarget, r: Resolver): Card | null => {
  if (t.kind === 'equation') {
    const e = r.equation(t.section, t.id); if (!e) return null;
    return { eyebrow: meta('Equation', e.important ? 'important' : undefined, e.section, e.condition), lines: [{ tex: e.tex }, { cls: 'embed-body', text: e.conceptName ?? '' }] };
  }
  if (t.kind === 'term') {
    const g = r.term(t.section, t.term); if (!g) return null;
    return { eyebrow: meta('Term', g.section), lines: [{ cls: 'embed-title', text: g.term }, { cls: 'embed-body', text: sentence(g.definition) }] };
  }
  if (t.kind === 'symbol') {
    const v = r.symbol(t.section, t.sym); if (!v) return null;
    return { eyebrow: meta('Symbol', v.typeLabel, v.unit), lines: [{ tex: v.tex }, { cls: 'embed-body', text: sentence(v.meaning) }] };
  }
  const c = r.concept(t.section, t.id); if (!c) return null;
  const body = c.placeholder ? `Section ${c.section} is not built yet.` : sentence(c.why ?? '');
  return { eyebrow: meta('Concept', c.kind, `section ${c.section}`), lines: [{ cls: 'embed-title', text: c.name }, { cls: 'embed-body', text: body }, { tex: c.eqTex ?? '' }] };
};

const bookEmbed = (t: BookTarget & { readonly alias?: string }, r: Resolver): string => {
  const c = bookCard(t, r);
  return c ? cardHtml(t, c) : dead(t.alias ?? linkInner(t), linkInner(t));
};

/* A highlight is shown whole, as a quote card, whether it was written as a
   link or as an embed; the reader means the same thing by both, and so it is
   with the four things the book itself holds. */
const renderLink = (link: Link, r: Resolver): string => {
  if (link.kind === 'highlight') return highlightEmbed(link.id, r, link.alias ?? `hl:${link.id}`);
  if (isBook(link)) return bookEmbed(link, r);
  if (link.kind === 'section') {
    const s = r.section(link.section);
    const label = link.alias ?? (s ? `${link.section} · ${s.title}` : link.section);
    return s ? anchor(`section:${link.section}`, label) : dead(label);
  }
  const id = r.note(link.name);
  const label = link.alias ?? link.name;
  return id ? anchor(`note:${id}`, label) : dead(label);
};

/* ── images ─────────────────────────────────────────────────────────────── */

/* Pasted images live in the asset store and are written `asset:<id>`; anything
   else must be an ordinary address, and an address of any other shape is dropped. */
const ASSET = /^asset:(.+)$/;
const SAFE_SRC = /^(?:https?:\/\/|data:image\/|#|\/|\.{1,2}\/)/i;
const SAFE_HREF = /^(?:https?:\/\/|mailto:|#|\/|\.{1,2}\/|[^:]*$)/i;

/* `![alt|320](src)` is Obsidian's way of sizing an image; the width is kept in
   `data-width` as well so the drag handle can read back what it set. */
const splitAlt = (alt: string): { readonly name: string; readonly width: string | null } => {
  const bar = alt.indexOf('|');
  if (bar < 0) return { name: alt, width: null };
  const w = alt.slice(bar + 1).trim();
  return { name: alt.slice(0, bar), width: /^\d+$/.test(w) ? w : null };
};

const renderImage = (href: string, alt: string, r: Resolver): string => {
  const { name, width } = splitAlt(alt);
  const asset = ASSET.exec(href);
  /* An asset the store has not handed over yet renders without a src; the
     component fills it in once the blob is read. */
  const src = asset ? r.asset(asset[1]) : SAFE_SRC.test(href) ? href : null;
  return `<img alt="${esc(name)}" data-src="${esc(href)}"` +
    (src ? ` src="${esc(src)}"` : '') +
    (asset ? ` data-asset="${esc(asset[1])}"` : '') +
    (width ? ` width="${width}" data-width="${width}"` : '') + '>';
};

/* Rewrite the one image with this address so it carries a width, whether or
   not it had one. Pure, and the inverse of what the renderer reads: dragging
   the handle writes the new width back into the note's markdown. */
export const setImageWidth = (markdown: string, src: string, width: number): string => {
  let done = false;
  return markdown.replace(/!\[([^\]\n]*)\]\(([^)\s]*)([^)]*)\)/g, (whole, alt: string, href: string, rest: string) => {
    if (done || href !== src) return whole;
    done = true;
    return `![${splitAlt(alt).name}|${Math.max(1, Math.round(width))}](${href}${rest})`;
  });
};

/* ── math ───────────────────────────────────────────────────────────────── */

const tex = (src: string, display: boolean): string =>
  katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false, output: 'htmlAndMathml' });

type Raw = { readonly text: string };
const textOf = (token: Tokens.Generic): string => (token as Tokens.Generic & Raw).text;

/* A `$$…$$` standing on lines of its own is a block, so KaTeX's display markup
   is not buried in a paragraph; `start` cuts the paragraph before it. */
const blockMath: TokenizerAndRendererExtension = {
  name: 'blockMath', level: 'block',
  start: (src: string) => { const m = /\n\$\$/.exec(src); return m ? m.index + 1 : undefined; },
  tokenizer(src: string) {
    const m = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src);
    return m ? { type: 'blockMath', raw: m[0], text: m[1] } : undefined;
  },
  renderer: (token) => tex(textOf(token), true),
};

/* Inline, `$$…$$` still means display and `$…$` means inline. Requiring the
   delimiters to hug their contents keeps prices and variables out of it. */
const inlineMath: TokenizerAndRendererExtension = {
  name: 'inlineMath', level: 'inline',
  start: (src: string) => { const i = src.indexOf('$'); return i < 0 ? undefined : i; },
  tokenizer(src: string) {
    const block = /^\$\$([\s\S]+?)\$\$/.exec(src);
    if (block) return { type: 'inlineMath', raw: block[0], text: block[1], display: true };
    const m = /^\$(?![\s$])((?:[^$\n\\]|\\.)+?)(?<![\s\\])\$/.exec(src);
    return m ? { type: 'inlineMath', raw: m[0], text: m[1], display: false } : undefined;
  },
  renderer: (token) => tex(textOf(token), (token as Tokens.Generic & { display?: boolean }).display === true),
};

/* ── the extensions that need the resolver ──────────────────────────────── */

const WIKI = /^(!?)\[\[([^\]\n]+)\]\]/;

/* Everything that renders as a card rather than as words: a highlight, and the
   four things of the book. Written alone on a line, each becomes a block of its
   own, so the card is not wrapped in a paragraph. The shapes are links.ts's own
   grammar, narrowed to what a card is made of, so that a note named `eq:later`
   stays a note. */
const CARD_LINK = String.raw`hl:[^\]\n]+|(?:eq|def|sym|concept):\d+\.\d+:[^\]\n]+`;

const cardBlock = (r: Resolver): TokenizerAndRendererExtension => ({
  name: 'cardBlock', level: 'block',
  start: (src: string) => { const m = new RegExp(String.raw`\n!?\[\[(?:${CARD_LINK})\]\][ \t]*(?:\n|$)`).exec(src); return m ? m.index + 1 : undefined; },
  tokenizer(src: string) {
    const m = new RegExp(String.raw`^!?\[\[(${CARD_LINK})\]\][ \t]*(?:\n+|$)`).exec(src);
    return m ? { type: 'cardBlock', raw: m[0], text: m[1] } : undefined;
  },
  renderer: (token) => renderLink(parseLink(textOf(token)), r),
});

const wikiLink = (r: Resolver): TokenizerAndRendererExtension => ({
  name: 'wikiLink', level: 'inline',
  start: (src: string) => { const i = src.search(/!?\[\[/); return i < 0 ? undefined : i; },
  tokenizer(src: string) {
    const m = WIKI.exec(src);
    return m ? { type: 'wikiLink', raw: m[0], text: m[2] } : undefined;
  },
  renderer: (token) => renderLink(parseLink(textOf(token)), r),
});

/* ── the whole ──────────────────────────────────────────────────────────── */

/* An ordinary link keeps marked's own rendering, but not an address that could
   run something; the walk rewrites those before the parser reaches them. */
const disarm = (token: Token): void => {
  const t = token as Tokens.Generic & { href?: string };
  if (token.type === 'link' && typeof t.href === 'string' && !SAFE_HREF.test(t.href.trim())) t.href = '#';
};

const engine = (r: Resolver): Marked =>
  new Marked({
    gfm: true, breaks: false,
    extensions: [blockMath, inlineMath, cardBlock(r), wikiLink(r)],
    walkTokens: disarm,
    renderer: {
      /* HTML a reader wrote in a note is shown, not run. */
      html: ({ text }: Tokens.HTML | Tokens.Tag) => esc(text),
      image: ({ href, text }: Tokens.Image) => renderImage(href, text, r),
    },
  });

export const render = (markdown: string, r: Resolver): string => engine(r).parse(markdown, { async: false });
