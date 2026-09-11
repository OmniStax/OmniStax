/* The live layout: one reactive value, changed only through the pure model
   functions, saved to this browser after every change. */
import type { ItemKey, Layout } from './model';
import { closeGroup, closeItem, defaultLayout, ensureOwn, openTab, parseLayout, renamedSimKeys } from './model';
import { type ItemId, pageItem } from '../types/ids';

const KEY = 'omnistax-layout-v5';
/* How many closed tabs the shell can hand back, this reading only. */
const REOPEN = 20;

/* A tab as it was closed: what it showed and which group it stood in. */
type Closed = { readonly key: ItemKey; readonly group: number };
const load = (own: ItemId, known: (k: string) => boolean): Layout => {
  try { const parsed = parseLayout(JSON.parse(renamedSimKeys(localStorage.getItem(KEY) ?? 'null')), known); if (parsed) return ensureOwn(parsed, own); } catch { /* fall through */ }
  return ensureOwn(defaultLayout(own), own);
};

class LayoutStore {
  layout = $state.raw<Layout>(defaultLayout(pageItem('about')));
  overlay = $state<'left' | 'right' | null>(null);      /* narrow screens show the sidebar over the documents */
  private own: ItemId = pageItem('about');              /* what the page this shell mounted on is, until init says otherwise */

  /* The tabs the reader has closed, newest last, so that Reopen closed tab can
     put them back where they were. Kept for this reading of the page only:
     where a tab stood is not one of the reader's edits and is never saved. */
  private closed = $state.raw<readonly Closed[]>([]);

  init(own: ItemId, known: (k: string) => boolean): void { this.own = own; this.layout = load(own, known); }
  apply(f: (l: Layout) => Layout): void { this.layout = f(this.layout); this.save(); }

  /* Closing a tab from its own × remembers it; closing a group remembers every
     tab it held, in the order they stood in. */
  closeTab(index: number, key: ItemKey): void { this.remember([{ key, group: index }]); this.apply((x) => closeItem(x, key, index)); }
  closeGroup(index: number): void {
    const g = this.layout.groups[index];
    this.remember((g?.tabs ?? []).map((key) => ({ key, group: index })));
    this.apply((x) => closeGroup(x, index));
  }
  /* The last tab closed, back in the group it came from — or in the focused
     group, when that one has since gone. */
  reopenClosed(): void {
    const last = this.closed[this.closed.length - 1];
    if (!last) return;
    this.closed = this.closed.slice(0, -1);
    const at = last.group < this.layout.groups.length ? last.group : this.layout.focus;
    this.apply((x) => openTab(x, last.key, at));
  }
  get canReopen(): boolean { return this.closed.length > 0; }
  private remember(items: readonly Closed[]): void {
    if (!items.length) return;
    const next = [...this.closed, ...items];
    this.closed = next.length > REOPEN ? next.slice(next.length - REOPEN) : next;
  }
  reset(): void { this.layout = ensureOwn(defaultLayout(this.own), this.own); this.overlay = null; this.save(); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.layout)); } catch { /* private mode */ } }
}
export const layoutStore = new LayoutStore();
