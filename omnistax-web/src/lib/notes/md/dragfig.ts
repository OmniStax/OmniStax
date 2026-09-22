/* A figure of the book dragged into a note. The panels drag their rows out with
   `dragout`, but a figure is not a row of a panel: it is in the section's own
   HTML, adopted into a pane, so nothing in Svelte holds it and the action is
   attached here instead, once, as the section is prepared.

   The handle is the head the figure prints — the `.sim-head` of a simulation,
   the `<figcaption>` of a still figure — because that is the line naming it,
   and it is where the eyebrow ("Sim", "Figure 7.3") already stands. What it
   carries is what every other drag carries: the embed text for the thing, here
   `![[fig:7.2:sim-area]]`, the section and the id the section's own HTML gives
   the figure. The buttons in a head are not part of the grip: a press on one is
   a press on it, so they are marked as the action's `data-nodrag`. */
import { dragout } from './dragout';
import type { SectionId } from '../../types/ids';

/* The figures a section draws, and the line of each that names it. */
const FIGURES = 'figure[id]';
const HEAD = '.sim-head, figcaption';
/* A head is fitted once, however often the section is prepared again. */
const FITTED = 'dragfig';

/* The id as the section writes it, without the section the DOM qualified it
   with: "7.2-sim-area" → "sim-area". */
export const localFigureId = (domId: string, sec: SectionId): string =>
  (domId.startsWith(`${sec}-`) ? domId.slice(sec.length + 1) : domId);

export const dragFigures = (root: HTMLElement, sec: SectionId): void => {
  root.querySelectorAll<HTMLElement>(FIGURES).forEach((fig) => {
    const head = fig.querySelector<HTMLElement>(HEAD);
    if (!head || head.dataset[FITTED] === '1') return;
    head.dataset[FITTED] = '1';
    head.querySelectorAll<HTMLElement>('button, a').forEach((b) => { b.dataset.nodrag = ''; });
    dragout(head, { kind: 'figure', section: sec, id: localFigureId(fig.id, sec) });
  });
};
