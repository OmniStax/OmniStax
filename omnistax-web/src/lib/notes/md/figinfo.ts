/* What a note can say about a figure of the book. A figure is not in any table:
   it is in the section's own HTML, so what a card shows is read back out of the
   document the registry holds — the eyebrow the section prints ("Sim",
   "Figure 7.3"), the words of the head, the caption, and the address of a still
   picture where the figure draws one. A simulation draws itself with a script
   and has no picture to lend; the note shows its words and leaves the drawing
   in the book.

   The maths of a head may already be set, and KaTeX writes the symbols twice —
   once for a reader and once for a screen reader — so a span it wrote is read
   back as the TeX it was written from, and the note's own renderer sets it
   again. */
import type { FigureInfo } from './render';
import type { SectionId } from '../../types/ids';
import { localFigureId } from './dragfig';

const EYEBROW = '.eyebrow';
const HEAD = '.sim-head';
const CAPTION = 'figcaption';

/* The words of one element, with rendered maths back as `$…$` and the controls
   a head carries left out. */
const words = (el: Element): string => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('button, .eyebrow, .ai-mark').forEach((n) => n.remove());
  copy.querySelectorAll('.katex').forEach((k) => {
    const tex = k.querySelector('annotation')?.textContent ?? '';
    k.replaceWith(document.createTextNode(tex === '' ? '' : `$${tex}$`));
  });
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
};

const textOf = (el: Element | null): string => (el ? (el.textContent ?? '').replace(/\s+/g, ' ').trim() : '');

/* The figure of one section's document, by the id the section's HTML gives it.
   The document's ids are qualified by section, and a fragment that has not been
   qualified gives the bare id, so both are looked for. */
export const findFigure = (doc: ParentNode, sec: SectionId, id: string): HTMLElement | null => {
  const local = localFigureId(id, sec);
  return doc.querySelector<HTMLElement>(`figure[id="${CSS.escape(`${sec}-${local}`)}"], figure[id="${CSS.escape(local)}"]`);
};

export const figureInfo = (doc: ParentNode, sec: SectionId, id: string): FigureInfo | null => {
  const fig = findFigure(doc, sec, id);
  if (!fig) return null;
  const head = fig.querySelector(HEAD);
  const caption = fig.querySelector(CAPTION);
  const eyebrow = textOf((head ?? caption)?.querySelector(EYEBROW) ?? null);
  const src = fig.querySelector('img')?.getAttribute('src') ?? undefined;
  return {
    eyebrow: eyebrow || 'Figure',
    title: head ? words(head) : '',
    caption: caption ? words(caption) : '',
    section: sec,
    src,
  };
};
