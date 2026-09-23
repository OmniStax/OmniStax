/* Finding and revealing elements when the same document can be open twice:
   prefer the copy in the focused group, then any visible copy, then anything.
   An id is unique only within its book, so every look is scoped to one. */
import { layoutStore } from '../layout/store.svelte';
import { openTab, openSide, activate, homeSide, where, toggleCollapsed } from '../layout/model';
import { registry } from './registry.svelte';
import { type BookId, type SpanRef, type SectionRef, type ItemId, type FileId, bookId, itemKey, parseItemKey, sectionOfSpan, sectionOfItem, sectionRef, docItem, fileItem, spanId } from '../types/ids';
import { fileOpens } from '../files/open.svelte';
import { FIG } from '../fig/figlib';
import { revealFolds } from './fold.svelte';

const cssId = (id: string): string => (typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(id) : id);
const allEls = (book: BookId, id: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-book="${cssId(book)}"] [id="${cssId(id)}"], [data-book="${cssId(book)}"][id="${cssId(id)}"]`))
    .filter((e) => !e.closest('[data-fig-probe]'));
const paneOf = (e: Element): HTMLElement | null => e.closest<HTMLElement>('.pane');
export const activePane = (index: number): HTMLElement | null => document.querySelector<HTMLElement>(`.group[data-index="${index}"] .pane:not([hidden])`);
/* The article the reading commands act on: the focused pane's, else any visible one. */
export const focusedArticle = (): HTMLElement | null =>
  activePane(layoutStore.layout.focus)?.querySelector<HTMLElement>('article[data-doc]') ?? document.querySelector<HTMLElement>('.pane:not([hidden]) article[data-doc]');
/* The book an element of book content belongs to, read off the nearest root that says. */
export const bookOfEl = (el: Element): BookId | null => { const b = el.closest<HTMLElement>('[data-book]')?.dataset.book; return b ? bookId(b) : null; };
export const findEl = (book: BookId, id: string): HTMLElement | null => {
  const all = allEls(book, id); if (all.length < 2) return all[0] ?? null;
  const ap = activePane(layoutStore.layout.focus);
  return all.find((e) => ap?.contains(e)) ?? all.find((e) => { const p = paneOf(e); return p !== null && !p.hidden; }) ?? all.find((e) => paneOf(e)) ?? all[0];
};

/* Make the item that contains `node` visible: activate its tab, expand its box, or open it. */
export const reveal = (node: Element): boolean => {
  const host = node.closest<HTMLElement>('[data-doc], [data-view]'); if (!host) return false;
  const book = bookOfEl(host);
  /* A view says which page of itself this is, since several of one kind may stand open. */
  const id: ItemId | null = host.dataset.doc ? (book ? parseItemKey(`doc:${book}/${host.dataset.doc}`) : null) : parseItemKey(host.dataset.item ?? 'view:' + host.dataset.view);
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
  const card = target.closest<HTMLElement>('.exercise');   /* a card the one-at-a-time list is holding back is stepped to first */
  if (card?.hidden) card.closest<HTMLElement & { exShow?: (id: string) => void }>('.list')?.exShow?.(card.id);
  revealFolds(target);
  reveal(target);
  requestAnimationFrame(() => { target.scrollIntoView({ behavior: FIG.REDUCED ? 'auto' : 'smooth', block }); if (tint) land(target); });
};
export const go = (book: BookId, id: string, block: ScrollLogicalPosition = 'start'): void => jump(findEl(book, id), block);
export const goSpan = (ref: SpanRef | undefined): void => {
  if (!ref) return;
  const t = findEl(ref.book, ref.span); if (t) { jump(t); return; }
  void openDoc(sectionRef(ref.book, sectionOfSpan(ref.span)), 'text').then(() => go(ref.book, ref.span));
};
/* The passage a problem was set on, landed in the middle of the pane so the
   reader can read around it. The card may be standing in a practice session
   with the section's text open nowhere, so a target that is not in the document
   yet is not a dead end: the text is opened and the look retried over a few
   frames, since the document may still be mounting when the open resolves. */
export const cite = (book: BookId, id: string, tries = 12): void => {
  const sec = findEl(book, id);
  if (sec) { jump(sec.querySelector<HTMLElement>('.cite-target') ?? sec, 'center'); return; }
  if (tries <= 0) return;
  void openDoc(sectionRef(book, sectionOfSpan(spanId(id))), 'text').then(() => requestAnimationFrame(() => cite(book, id, tries - 1)));
};
/* Open anything a tab can hold — a document, a figure, a standing page, or a
   note: activate it where it already is, or open it in the given group
   (default: focused), and load the section it comes out of. A page and a note
   come out of no section, so for them there is nothing to fetch. */
export const openItem = (key: string, group?: number): Promise<void> => {
  const l = layoutStore.layout;
  const loc = group == null ? where(l, key) : null;
  if (loc && loc.type === 'group') layoutStore.apply((x) => activate(x, loc.index, key));
  else layoutStore.apply((x) => openTab(x, key, group ?? x.focus));
  const id = parseItemKey(key); const ref = id ? sectionOfItem(id) : null;
  return ref ? registry.load(ref) : Promise.resolve();
};
export const openDoc = (ref: SectionRef, doc: 'text', group?: number): Promise<void> => openItem(itemKey(docItem(ref, doc)), group);
/* A file the reader imported, at the page a link named. The page is asked for
   beside the tab rather than written into its key: a file open twice is one
   document, so the key names the file and nothing else. */
export const openFile = (file: FileId, page?: number, group?: number): Promise<void> => {
  if (page !== undefined) fileOpens.askPage(file, page);
  return openItem(itemKey(fileItem(file)), group);
};
