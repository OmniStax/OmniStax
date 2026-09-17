/* The width an image carries in a note's markdown, read and written. This is
   the one piece of the note syntax the app needs without the renderer: the
   drag handle over a rendered image writes a new width back into the text,
   and the renderer itself — markdown and KaTeX, the better part of a megabyte
   — is fetched only when a note is first read. Pure, and both directions live
   here so they cannot drift. */

/* `![alt|320](src)` is Obsidian's way of sizing an image; the width is kept in
   `data-width` as well so the drag handle can read back what it set. */
export type AltParts = { readonly name: string; readonly width: string | null };
export const splitAlt = (alt: string): AltParts => {
  const bar = alt.indexOf('|');
  if (bar < 0) return { name: alt, width: null };
  const w = alt.slice(bar + 1).trim();
  return { name: alt.slice(0, bar), width: /^\d+$/.test(w) ? w : null };
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
