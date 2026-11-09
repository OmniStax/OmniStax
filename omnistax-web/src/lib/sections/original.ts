/* An interactive figure that replaced a book figure can show that figure in
   its place. The figure carries the originals in data-original (paths,
   comma-separated), the book number in data-figure ("3.3 + 3.4 + 3.5" where
   the figure folds several book figures, and then every folded image is among
   the originals), the book caption in data-original-caption and, where the
   book says how wide it prints each image, those widths in
   data-original-width; the button and the image block are made here, on
   demand. The button reads "Original" while
   the live figure is shown and "Live" while the book's is, the word naming the
   drawing it will bring back. The book's caption keeps the figure's own label
   (root RULES item 14): "Figure N" where the figure carries the book's number,
   and "Figure" alone where the book's figure is unnumbered, since a figure with
   an original transforms a book figure and is a Figure, never a Sim. */

const CLS = 'show-original';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

/* The paths of the originals and, aligned with them, the widths the book prints them at: data-original-width
   is comma-separated in the same order, and absent where the book gives no width. */
import { t } from '../i18n/index';
import type { Fig } from '../fig/figlib';

/* The book's caption is plain text in its attribute (the build sets no markup inside a tag), and may
   write maths as $…$: shown, it is set by the figure library under the page's macros; as an image's
   alt text it is read with the dollars and the macro names dropped. */
const withMath = (host: HTMLElement): void => { (globalThis as { FIG?: Fig }).FIG?.renderMath(host); };
const altOf = (caption: string): string => caption.replace(/\$([^$]*)\$/g, (_, m: string) => m.replace(/\\k(?=[A-Za-z])|\\(?=[A-Za-z])|[{}]/g, ''));

const list = (csv: string | undefined): readonly string[] => (csv ?? '').split(',').map((p) => p.trim()).filter(Boolean);
type Original = { readonly src: string; readonly width?: string };
const originalsOf = (fig: HTMLElement): readonly Original[] => {
  const widths = list(fig.dataset.originalWidth);
  return list(fig.dataset.original).map((src, i) => (widths[i] === undefined ? { src } : { src, width: widths[i] }));
};

/* One image of the book's figure. Where the book says how wide it prints it, the image carries that as
   data-width and as the custom property --book-w the stylesheet sizes it from, as a photograph's <img> does. */
const imageOf = ({ src, width }: Original, alt: string): HTMLImageElement => {
  const img = el('img'); img.src = src; img.loading = 'lazy'; img.alt = alt;
  if (width !== undefined) { img.dataset.width = width; img.style.setProperty('--book-w', width); }
  return img;
};

/* Rule 26.4: the caption swaps with the figure. The book's caption is built into the
   head, where the live figure's own number and description sit, so the one that is
   showing is the one the reader reads; the stylesheet hides the other. A correction of
   the caption waits as a marker at the figure's end and follows the caption's words. */
export const originalEyebrow = (number: string | undefined): string => (number ? `Figure ${number}` : 'Figure');
const captionOf = (fig: HTMLElement, head: HTMLElement): HTMLElement => {
  const have = head.querySelector<HTMLElement>(':scope > .ocap'); if (have) return have;
  const cap = el('p', 'ocap'); const num = el('span', 'eyebrow'); num.textContent = originalEyebrow(fig.dataset.figure);
  const text = el('span'); text.textContent = fig.dataset.originalCaption ?? ''; text.append(...fig.querySelectorAll(':scope > sup.fn')); cap.append(num, text); head.appendChild(cap);
  withMath(text);
  return cap;
};

const originalOf = (fig: HTMLElement): HTMLElement => {
  const have = fig.querySelector<HTMLElement>(':scope > .original'); if (have) return have;
  const box = el('div', 'original'); const caption = altOf(fig.dataset.originalCaption ?? '');
  originalsOf(fig).forEach((o) => box.appendChild(imageOf(o, caption)));
  fig.appendChild(box);
  return box;
};

const labelOf = (shown: boolean): string => t(shown ? 'views.original.live' : 'views.original.original');
const titleOf = (shown: boolean): string => t(shown ? 'views.original.showLive' : 'views.original.showOriginal');

const toggle = (fig: HTMLElement, button: HTMLButtonElement): void => {
  const shown = fig.classList.toggle(CLS);
  originalOf(fig).hidden = !shown;
  const head = fig.querySelector<HTMLElement>(':scope > .sim-head'); if (head) captionOf(fig, head).hidden = !shown;
  button.textContent = labelOf(shown); button.title = titleOf(shown); button.setAttribute('aria-pressed', String(shown));
};

/* One button per figure that has an original; one click listener per root, delegated. */
export const originalButtons = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('figure.sim[data-original] .sim-head').forEach((head) => {
    if (head.querySelector('.fig-original')) return;
    const b = el('button', 'fig-original'); b.type = 'button'; b.textContent = labelOf(false); b.title = titleOf(false); b.setAttribute('aria-pressed', 'false');
    head.appendChild(b);
  });
  if (root.dataset.original) return;
  root.dataset.original = '1';
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.fig-original'); if (!b) return;
    const fig = b.closest<HTMLElement>('figure.sim'); if (!fig) return;
    e.preventDefault(); toggle(fig, b);
  });
};
