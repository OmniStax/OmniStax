/* Folded headings and hidden figures, remembered in this browser. Both are
   sets of qualified ids, so the state follows a document into every pane it
   is open in: applyState() puts the class on every element with the id.
   The toggles are buttons put into the headings and figure heads when a
   document is prepared (registry.svelte.ts), one delegated click listener
   per root, like the "Original" button. */
import { FOLDABLE, HIDEABLE, FOLDED_CLASS, HIDDEN_CLASS, FOLD_HEAD_CLASS, foldableOf, hideableOf, headingOf, toggleId, addIds, removeIds, parseIds, renamedSimId } from './fold';
export { FOLDABLE, HIDEABLE, foldableOf, hideableOf, headingOf } from './fold';

type StorageKey = 'omnistax-folded' | 'omnistax-hidden-figs';
const load = (key: StorageKey): readonly string[] => {
  if (typeof localStorage === 'undefined') return [];
  try { return parseIds(JSON.parse(localStorage.getItem(key) ?? 'null'))?.map(renamedSimId) ?? []; } catch { return []; }
};
const save = (key: StorageKey, ids: readonly string[]): void => { try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* private mode */ } };

class IdSet {
  ids = $state.raw<readonly string[]>([]);
  constructor(private readonly key: StorageKey) { this.ids = load(key); }
  has(id: string): boolean { return this.ids.includes(id); }
  toggle(id: string): void { this.set(toggleId(this.ids, id)); }
  add(ids: readonly string[]): void { this.set(addIds(this.ids, ids)); }
  remove(ids: readonly string[]): void { this.set(removeIds(this.ids, ids)); }
  private set(next: readonly string[]): void { if (next.length === this.ids.length && next.every((x, i) => x === this.ids[i])) return; this.ids = next; save(this.key, next); }
}
export const folded = new IdSet('omnistax-folded');
export const hiddenFigs = new IdSet('omnistax-hidden-figs');

/* Whole-document actions, for the commands. */
export const foldAllIn = (root: ParentNode | null): void => { if (root) folded.add(foldableOf(root).map((e) => e.id)); };
export const unfoldAllIn = (root: ParentNode | null): void => { if (root) folded.remove(foldableOf(root).map((e) => e.id)); };
export const hideFigsIn = (root: ParentNode | null): void => { if (root) hiddenFigs.add(hideableOf(root).map((e) => e.id)); };
export const showFigsIn = (root: ParentNode | null): void => { if (root) hiddenFigs.remove(hideableOf(root).map((e) => e.id)); };
/* Before scrolling to an element, open whatever folded or hidden thing holds it. */
export const revealFolds = (target: Element): void => {
  const spans: string[] = [];
  for (let e = target.closest<HTMLElement>(FOLDABLE); e; e = e.parentElement?.closest<HTMLElement>(FOLDABLE) ?? null) spans.push(e.id);
  if (spans.some((id) => folded.has(id))) folded.remove(spans);
  const fig = target.closest<HTMLElement>(HIDEABLE); if (fig && hiddenFigs.has(fig.id)) hiddenFigs.remove([fig.id]);
};

/* ---------- buttons and classes in the DOM ---------- */
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.className = cls; return e; };
const foldButtonOf = (span: HTMLElement): HTMLButtonElement | null => headingOf(span)?.querySelector<HTMLButtonElement>(':scope > button.fold') ?? null;
const hideButtonOf = (fig: HTMLElement): HTMLButtonElement | null => fig.querySelector<HTMLButtonElement>(':scope > .sim-head > button.fig-hide, :scope > figcaption > button.fig-hide');

const syncSpan = (span: HTMLElement, on: boolean): void => {
  span.classList.toggle(FOLDED_CLASS, on);
  const b = foldButtonOf(span); if (!b) return;
  b.setAttribute('aria-expanded', String(!on)); b.title = on ? 'Unfold' : 'Fold';
};
const syncFig = (fig: HTMLElement, on: boolean): void => {
  fig.classList.toggle(HIDDEN_CLASS, on);
  const b = hideButtonOf(fig); if (!b) return;
  b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Show figure' : 'Hide figure';
};
/* Put the remembered state on every span and figure under `root`. Reads the
   stores, so an effect that calls it follows them. */
export const applyState = (root: ParentNode): void => {
  const f = folded.ids, h = hiddenFigs.ids;
  foldableOf(root).forEach((s) => syncSpan(s, f.includes(s.id)));
  hideableOf(root).forEach((g) => syncFig(g, h.includes(g.id)));
};

/* A chevron before each span's heading. In document order a section comes
   before the example inside it, so a section without an h2 claims the example's
   h3 and that example folds with its section rather than on its own. */
const foldButtons = (root: HTMLElement): void => {
  foldableOf(root).forEach((span) => {
    const h = headingOf(span); if (!h || h.querySelector(':scope > button.fold')) return;
    if (h.parentElement !== span) h.parentElement?.classList.add(FOLD_HEAD_CLASS);
    const b = el('button', 'fold'); b.type = 'button'; b.dataset.fold = span.id; b.title = 'Fold'; b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-label', 'Fold this heading'); b.innerHTML = CHEVRON;
    h.prepend(b);
  });
};
/* An eye at the right of each figure's head or caption. */
const hideButtons = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('figure.sim[id] > .sim-head, figure.photo[id] > figcaption').forEach((head) => {
    if (head.querySelector(':scope > button.fig-hide')) return;
    const b = el('button', 'fig-hide'); b.type = 'button'; b.dataset.fig = head.parentElement!.id; b.title = 'Hide figure'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Hide this figure'); b.innerHTML = EYE;
    head.appendChild(b);
  });
};
/* Called for every text document as it is prepared, copies included. */
export const foldControls = (root: HTMLElement): void => {
  foldButtons(root); hideButtons(root); applyState(root);
  if (root.dataset.fold) return;
  root.dataset.fold = '1';
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.fold, button.fig-hide'); if (!b) return;
    e.preventDefault();
    if (b.dataset.fold) folded.toggle(b.dataset.fold); else if (b.dataset.fig) hiddenFigs.toggle(b.dataset.fig);
  });
};
