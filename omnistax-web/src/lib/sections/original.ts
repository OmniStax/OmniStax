/* An interactive figure that replaced a book figure can show that figure in
   its place. The figure carries the originals in data-original (paths,
   comma-separated), the book number in data-figure ("3.3 + 3.4 + 3.5" where
   the figure folds several book figures, and then every folded image is among
   the originals), the book caption in data-original-caption and, where the
   book says how wide it prints each image, those widths in
   data-original-width; the button and the image block are made here, on
   demand. The button reads "Original" while
   the live figure is shown and "Live" while the book's is: a figure with an
   original always replaces a book figure, so it is a Figure and never a Sim,
   and the word on the button names the drawing it will bring back. */

const CLS = 'show-original';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

/* The paths of the originals and, aligned with them, the widths the book prints them at: data-original-width
   is comma-separated in the same order, and absent where the book gives no width. */
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

const originalOf = (fig: HTMLElement): HTMLElement => {
  const have = fig.querySelector<HTMLElement>(':scope > .original'); if (have) return have;
  const box = el('div', 'original'); const caption = fig.dataset.originalCaption ?? '';
  originalsOf(fig).forEach((o) => box.appendChild(imageOf(o, caption)));
  const cap = el('p', 'ocap'); const num = el('span', 'eyebrow'); num.textContent = fig.dataset.figure ? `Figure ${fig.dataset.figure}` : 'Figure';
  const text = el('span'); text.textContent = caption; cap.append(num, text); box.appendChild(cap);
  fig.appendChild(box);
  return box;
};

const labelOf = (shown: boolean): string => (shown ? 'Live' : 'Original');
const titleOf = (shown: boolean): string => (shown ? 'Show the live figure' : 'Show the book’s original figure');

const toggle = (fig: HTMLElement, button: HTMLButtonElement): void => {
  const shown = fig.classList.toggle(CLS);
  originalOf(fig).hidden = !shown;
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
