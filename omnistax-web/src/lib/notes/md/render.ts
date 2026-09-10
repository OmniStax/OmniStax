/* A note's markdown into the HTML the reader sees. The module is pure: every
   lookup it needs — a note by name, a section by number, a highlight, an image
   the reader pasted — arrives as a resolver, so the same markdown renders the
   same way in a test as it does in the app.

   marked does the markdown itself, and four extensions add what the note
   syntax asks for beyond it: wiki links and highlight embeds, images carrying
   a width, and KaTeX for `$…$` and `$$…$$`. Doing this as extensions rather
   than as passes over the text keeps code spans and fenced blocks literal —
   a dollar sign inside backticks stays a dollar sign. Raw HTML written in a
   note is escaped and never passed through, and an image or link whose address
   is not one of the few shapes allowed loses it. */
import { Marked, type Token, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import katex from 'katex';
import { parseLink, type HighlightRef, type Link, type NoteName, type SectionRef } from './links';

export type NoteRef = string;    /* the id of a note document, what a resolved note link points at */
export type AssetRef = string;   /* the id of a stored image */
export type DataUrl = string;

export type SectionInfo = { readonly title: string };
export type HighlightInfo = { readonly quote: string; readonly color: string; readonly text: string; readonly section: string };

/* Everything the renderer cannot know by itself. Each lookup answers null when
   the thing is gone, and the link renders dead rather than breaking. */
export type Resolver = {
  note(name: NoteName): NoteRef | null;
  section(id: SectionRef): SectionInfo | null;
  highlight(id: HighlightRef): HighlightInfo | null;
  asset(id: AssetRef): DataUrl | null;
};

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── wiki links ─────────────────────────────────────────────────────────── */

const anchor = (target: string, label: string): string => `<a class="wiki" data-link="${esc(target)}" href="#">${esc(label)}</a>`;
/* One rule for everything that resolves to nothing: the words, marked dead, and no link to follow. */
const dead = (label: string): string => `<span class="wiki dead">${esc(label)}</span>`;

const highlightEmbed = (id: HighlightRef, r: Resolver, fallback: string): string => {
  const h = r.highlight(id);
  if (!h) return dead(fallback);
  return `<div class="hl-embed hl-${esc(h.color)}" data-hl="${esc(id)}"><blockquote>${esc(h.quote)}</blockquote>` +
    `<div class="hl-meta">${esc(h.section)}</div><div class="hl-text">${esc(h.text)}</div></div>`;
};

/* A highlight is shown whole, as a quote card, whether it was written as a
   link or as an embed; the reader means the same thing by both. */
const renderLink = (link: Link, r: Resolver): string => {
  if (link.kind === 'highlight') return highlightEmbed(link.id, r, link.alias ?? `hl:${link.id}`);
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

/* A highlight embed alone on a line becomes a block of its own, so the quote
   card is not wrapped in a paragraph. */
const hlBlock = (r: Resolver): TokenizerAndRendererExtension => ({
  name: 'hlBlock', level: 'block',
  start: (src: string) => { const m = /\n!?\[\[hl:[^\]\n]+\]\][ \t]*(?:\n|$)/.exec(src); return m ? m.index + 1 : undefined; },
  tokenizer(src: string) {
    const m = /^!?\[\[(hl:[^\]\n]+)\]\][ \t]*(?:\n+|$)/.exec(src);
    return m ? { type: 'hlBlock', raw: m[0], text: m[1] } : undefined;
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
    extensions: [blockMath, inlineMath, hlBlock(r), wikiLink(r)],
    walkTokens: disarm,
    renderer: {
      /* HTML a reader wrote in a note is shown, not run. */
      html: ({ text }: Tokens.HTML | Tokens.Tag) => esc(text),
      image: ({ href, text }: Tokens.Image) => renderImage(href, text, r),
    },
  });

export const render = (markdown: string, r: Resolver): string => engine(r).parse(markdown, { async: false });
