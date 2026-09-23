/* A figure of the book, alive in a note. What a note holds is the figure
   itself — the same markup, the same script, the same controls — and not a
   picture of it: the registry builds a root holding that one figure out of the
   section's own source and boots the section's script on it, which is what a
   figure opened in a split of its own already does, so a simulation in a note
   draws exactly as it draws in the book, three dimensions and all.

   The note owns what it mounts. A card is filled once and the root is kept, so
   a rendering of the note puts the same element back rather than building a
   second figure, and what the reader set on it — a slider, a view turned round —
   survives. What the note no longer shows is released: the figure leaves the
   drawing loop, and a three-dimensional view disposes of its own renderer once
   it has been out of the document a while. */
import { FIG } from '../../fig/figlib';
import { registry } from '../../sections/registry.svelte';
import { sectionId, sectionRef, type SectionRef } from '../../types/ids';
import { assumedBook } from '../../sections/focus.svelte';
import { parseLink } from './links';
import { dragFigures } from './dragfig';

/* The card the renderer left for a figure, and the key it is filled against. */
const CARD = '.fig-embed[data-embed]';
const LIVE = 'live';

export type MountKey = string;   /* the embed text of the figure: "fig:7.2:sim-area" */

const build = (sec: SectionRef, fig: string): HTMLElement | null => {
  const root = registry.figureRoot(sec, fig);
  if (!root) return null;
  root.classList.add('fig-note');
  FIG.renderMath(root);
  /* The head and the caption keep the drag, so a figure held in one note can be
     carried into another. */
  dragFigures(root, sec.section);
  return root;
};

export class FigureMounts {
  private live: Record<MountKey, HTMLElement> = {};

  /* Fill every figure card of one rendered note, and let go of the figures it
     no longer holds. A card whose section is not loaded yet is left as the
     renderer wrote it — its head, its caption and its still picture — and is
     filled on the pass after the section lands. */
  fill(host: HTMLElement): void {
    const shown = new Set<MountKey>();
    for (const card of host.querySelectorAll<HTMLElement>(CARD)) {
      const t = parseLink(card.dataset.embed ?? '');
      if (t.kind !== 'figure') continue;
      const key: MountKey = `${t.section}:${t.id}`;
      const root = this.live[key] ?? build(sectionRef(t.book ?? assumedBook(), sectionId(t.section)), t.id);
      if (!root) continue;
      this.live[key] = root;
      shown.add(key);
      if (root.parentElement !== card) card.replaceChildren(root);
      card.classList.add(LIVE);
    }
    Object.keys(this.live).forEach((k) => { if (!shown.has(k)) this.drop(k); });
  }

  /* Everything this note held, let go at once: the note was closed, or another
     note took its place. */
  releaseAll(): void { Object.keys(this.live).forEach((k) => this.drop(k)); }

  private drop(key: MountKey): void {
    const root = this.live[key]; if (!root) return;
    delete this.live[key];
    FIG.release(root);
    root.remove();
  }
}
