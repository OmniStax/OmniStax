/* The live layout: one reactive value, changed only through the pure model
   functions, saved to this browser after every change. */
import type { Layout } from './model';
import { defaultLayout, parseLayout, ensureOwn } from './model';
import { type ItemId, pageItem } from '../types/ids';

const KEY = 'omnistax-layout-v5';
const load = (own: ItemId, known: (k: string) => boolean): Layout => {
  try { const parsed = parseLayout(JSON.parse(localStorage.getItem(KEY) ?? 'null'), known); if (parsed) return ensureOwn(parsed, own); } catch { /* fall through */ }
  return ensureOwn(defaultLayout(own), own);
};

class LayoutStore {
  layout = $state.raw<Layout>(defaultLayout(pageItem('about')));
  overlay = $state<'left' | 'right' | null>(null);      /* narrow screens show the sidebar over the documents */
  private own: ItemId = pageItem('about');              /* what the page this shell mounted on is, until init says otherwise */

  init(own: ItemId, known: (k: string) => boolean): void { this.own = own; this.layout = load(own, known); }
  apply(f: (l: Layout) => Layout): void { this.layout = f(this.layout); this.save(); }
  reset(): void { this.layout = ensureOwn(defaultLayout(this.own), this.own); this.overlay = null; this.save(); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.layout)); } catch { /* private mode */ } }
}
export const layoutStore = new LayoutStore();
