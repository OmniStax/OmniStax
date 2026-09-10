/* Render $…$ inside this node once it is in the DOM, and again when its content changes. */
import { FIG } from '../../lib/fig/figlib';
export function math(node: HTMLElement, _dep?: unknown) {
  FIG.renderMath(node);
  return { update() { FIG.renderMath(node); } };
}

/* The same, for content that changes under the reader: the action writes the
   HTML itself rather than standing beside a `{@html}` block. Rendering the maths
   replaces the text nodes KaTeX finds, and Svelte cannot take back nodes that
   are no longer the ones it put there — the block it owns empties on the next
   change. Where the words change, then, this owns them from the start. */
export function mathHtml(node: HTMLElement, html: string | null | undefined) {
  const write = (s: string | null | undefined): void => { node.innerHTML = s ?? ''; FIG.renderMath(node); };
  write(html);
  return { update: write };
}
