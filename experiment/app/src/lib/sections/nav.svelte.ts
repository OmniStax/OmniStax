/* Finding and revealing elements when the same document can be open twice:
   prefer the copy in the focused group, then any visible copy, then anything. */
import { layoutStore } from '../layout/store.svelte';
import { openTab, openSide, activate, homeSide, where, toggleCollapsed } from '../layout/model';
import { registry } from './registry.svelte';
import { type SpanId, type ItemId, itemKey, parseItemKey, sectionOfSpan, sectionOfItem, docItem } from '../types/ids';
import { FIG } from '../fig/figlib';
import { revealFolds } from './fold.svelte';

const cssId = (id: string): string => (typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(id) : id);
const allEls = (id: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(`[id="${cssId(id)}"]`));
const paneOf = (e: Element): HTMLElement | null => e.closest<HTMLElement>('.pane');
export const activePane = (index: number): HTMLElement | null => document.querySelector<HTMLElement>(`.group[data-index="${index}"] .pane:not([hidden])`);
/* The article the reading commands act on: the focused pane's, else any visible one. */
export const focusedArticle = (): HTMLElement | null =>
  activePane(layoutStore.layout.focus)?.querySelector<HTMLElement>('article[data-doc]') ?? document.querySelector<HTMLElement>('.pane:not([hidden]) article[data-doc]');
export const findEl = (id: string): HTMLElement | null => {
  const all = allEls(id); if (all.length < 2) return all[0] ?? null;
  const ap = activePane(layoutStore.layout.focus);
  return all.find((e) => ap?.contains(e)) ?? all.find((e) => { const p = paneOf(e); return p !== null && !p.hidden; }) ?? all.find((e) => paneOf(e)) ?? all[0];
};

/* Make the item that contains `node` visible: activate its tab, expand its box, or open it. */
export const reveal = (node: Element): boolean => {
  const host = node.closest<HTMLElement>('[data-doc], [data-view]'); if (!host) return false;
  const id: ItemId | null = host.dataset.doc ? parseItemKey('doc:' + host.dataset.doc) : parseItemKey('view:' + host.dataset.view);
  if (!id) return false;
  const key = itemKey(id); const l = layoutStore.layout;
  const pane = paneOf(node);
  const loc = pane?.isConnected ? { type: 'group' as const, index: Number(pane.dataset.group) } : where(l, key);
  if (id.kind !== 'view' && layoutStore.overlay) layoutStore.overlay = null;
  if (!loc) { layoutStore.apply((x) => (id.kind !== 'view' ? openTab(x, key, x.focus) : openSide(x, key, homeSide(x, key)))); return true; }
  if (loc.type === 'side') {
    if (matchMedia('(max-width: 900px)').matches) layoutStore.overlay = loc.side;
    if (l.collapsed.includes(key)) layoutStore.apply((x) => toggleCollapsed(x, key));
    return true;
  }
  const g = l.groups[loc.index];
  if (g && (g.active !== key || l.focus !== loc.index)) { layoutStore.apply((x) => activate(x, loc.index, key)); return true; }
  return false;
};
/* Tint the element a jump landed on, briefly; a repeat jump restarts the tint. */
const land = (el: HTMLElement): void => {
  el.classList.remove('landed'); void el.offsetWidth;
  el.classList.add('landed');
  el.addEventListener('animationend', () => el.classList.remove('landed'), { once: true });
};
export const jump = (target: HTMLElement | null, block: ScrollLogicalPosition = 'start', tint = true): void => {
  if (!target) return;
  const card = target.closest<HTMLElement & { exShow?: () => void }>('.exercise');
  if (card?.hidden && card.exShow) card.exShow();
  revealFolds(target);
  reveal(target);
  requestAnimationFrame(() => { target.scrollIntoView({ behavior: FIG.REDUCED ? 'auto' : 'smooth', block }); if (tint) land(target); });
};
export const go = (id: string, block: ScrollLogicalPosition = 'start'): void => jump(findEl(id), block);
export const goSpan = (id: SpanId | undefined): void => {
  if (!id) return;
  const t = findEl(id); if (t) { jump(t); return; }
  const sec = sectionOfSpan(id);
  openDoc(sec, 'text').then(() => go(id));
};
export const cite = (id: string): void => {
  const sec = findEl(id); if (!sec) return;
  const tgt = sec.querySelector<HTMLElement>('.cite-target') ?? sec;
  jump(tgt, 'center');
};
/* Open anything a tab can hold — a document, a figure, one exercise: activate it
   where it already is, or open it in the given group (default: focused), and
   load the section it comes out of. */
export const openItem = (key: string, group?: number): Promise<void> => {
  const l = layoutStore.layout;
  const loc = group == null ? where(l, key) : null;
  if (loc && loc.type === 'group') layoutStore.apply((x) => activate(x, loc.index, key));
  else layoutStore.apply((x) => openTab(x, key, group ?? x.focus));
  const id = parseItemKey(key); const sec = id ? sectionOfItem(id) : null;
  return sec ? registry.load(sec) : Promise.resolve();
};
export const openDoc = (sec: SectionId, doc: 'text' | 'exercises', group?: number): Promise<void> => openItem(itemKey(docItem(sec, doc)), group);
type SectionId = import('../types/ids').SectionId;
