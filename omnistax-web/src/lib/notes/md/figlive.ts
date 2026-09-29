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
   it has been out of the document a while.

   Each embed of a figure is a figure of its own, at the values its link
   stores; a control the reader moves writes its value back into the link. */
import { figFor } from '../../fig/figlib';
import { onParams, paramsOf, setParams, type Param, type ParamValues } from '../../fig/params';
import { registry } from '../../sections/registry.svelte';
import { sectionId, sectionRef, type BookId, type SectionRef } from '../../types/ids';
import { linkKey, parseLink } from './links';
import { dragFigures } from './dragfig';

/* The card the renderer left for a figure, and the key it is filled against. */
const CARD = '.fig-embed[data-embed]';
const LIVE = 'live';

export type MountKey = string;   /* the figure and which of its embeds in the note: "college-physics-2e/7.2:sim-area#1" */
export type FigureKey = string;  /* the embed's linkKey, values aside: "fig:college-physics-2e/7.2:sim-area" */
/* The reader moved a control of the n-th embed of a figure; `gesture` names the one drag it belongs to. */
export type ParamsWrite = (figure: FigureKey, n: number, values: ParamValues, gesture: string) => void;

const build = (sec: SectionRef, fig: string): HTMLElement | null => {
  const root = registry.figureRoot(sec, fig);
  if (!root) return null;
  root.classList.add('fig-note');
  figFor(sec.book).renderMath(root);
  /* The head and the caption keep the drag, so a figure held in one note can be
     carried into another. */
  dragFigures(root, sec);
  return root;
};

/* A script that waits on three.js makes its controls a turn or more after the root is built. */
const whenControls = (root: HTMLElement, go: () => void): (() => void) => {
  if (paramsOf(root).length) { go(); return () => {}; }
  const mo = new MutationObserver(() => { if (!paramsOf(root).length) return; mo.disconnect(); go(); });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
};

const differs = (want: ParamValues, now: readonly Param[]): boolean => now.some((p) => p.id in want && want[p.id] !== p.value);

type Mount = { readonly root: HTMLElement; want: ParamValues; readonly stop: () => void };

export class FigureMounts {
  private live: Record<MountKey, Mount> = {};
  private gesture = 0;
  private quiet = false;
  constructor(private readonly fallback: () => BookId, private readonly write?: ParamsWrite) {}

  /* Fill every figure card of one rendered note, and let go of the figures it
     no longer holds. A card whose section is not loaded yet is left as the
     renderer wrote it — its head, its caption and its still picture — and is
     filled on the pass after the section lands. A stored value that moved
     under a live figure (an undo) is set back on it. */
  fill(host: HTMLElement): void {
    const shown = new Set<MountKey>();
    const seen: Record<FigureKey, number> = {};
    for (const card of host.querySelectorAll<HTMLElement>(CARD)) {
      const t = parseLink(card.dataset.embed ?? '');
      if (t.kind !== 'figure') continue;
      const ref = sectionRef(t.book ?? this.fallback(), sectionId(t.section));
      const fk = linkKey(t), n = (seen[fk] = (seen[fk] ?? -1) + 1);
      const key: MountKey = `${ref.book}/${ref.section}:${t.id}#${n}`;
      const want = t.params ?? {};
      const m = this.live[key] ?? this.mount(ref, t.id, fk, n, want);
      if (!m) continue;
      this.live[key] = m;
      shown.add(key);
      if (differs(want, paramsOf(m.root))) this.quietly(() => setParams(m.root, want));
      m.want = want;
      if (m.root.parentElement !== card) card.replaceChildren(m.root);
      card.classList.add(LIVE);
    }
    Object.keys(this.live).forEach((k) => { if (!shown.has(k)) this.drop(k); });
  }

  /* Everything this note held, let go at once: the note was closed, or another
     note took its place. */
  releaseAll(): void { Object.keys(this.live).forEach((k) => this.drop(k)); }

  private mount(ref: SectionRef, id: string, fk: FigureKey, n: number, want: ParamValues): Mount | null {
    const root = build(ref, id); if (!root) return null;
    let off = (): void => {};
    const bump = (): void => { this.gesture += 1; };
    const hands = ['pointerdown', 'keydown'] as const;
    hands.forEach((ev) => root.addEventListener(ev, bump, { capture: true }));
    const mount: Mount = { root, want, stop: () => { stopWait(); off(); hands.forEach((ev) => root.removeEventListener(ev, bump, { capture: true })); } };
    const stopWait = whenControls(root, () => {
      this.quietly(() => setParams(root, mount.want));
      off = onParams(root, (values) => { if (!this.quiet) this.write?.(fk, n, values, `${fk}#${n}@${this.gesture}`); });
    });
    return mount;
  }

  private quietly(f: () => void): void { this.quiet = true; try { f(); } finally { this.quiet = false; } }

  private drop(key: MountKey): void {
    const m = this.live[key]; if (!m) return;
    delete this.live[key];
    m.stop();
    figFor(m.root.dataset.book ?? '').release(m.root);
    m.root.remove();
  }
}
