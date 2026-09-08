/* The live layout: one reactive value, changed only through the pure model
   functions, saved to this browser after every change. */
import type { Layout } from './model';
import { defaultLayout, parseLayout, ensureOwn } from './model';
import type { SectionId } from '../types/ids';

const KEY = 'omnistax-layout-v4';
const load = (section: SectionId, known: (k: string) => boolean): Layout => {
  try { const parsed = parseLayout(JSON.parse(localStorage.getItem(KEY) ?? 'null'), known); if (parsed) return ensureOwn(parsed, section); } catch { /* fall through */ }
  return ensureOwn(defaultLayout(section), section);
};

class LayoutStore {
  layout = $state.raw<Layout>(defaultLayout('0.0' as SectionId));
  overlay = $state<'left' | 'right' | null>(null);      /* narrow screens show one sidebar at a time */
  private section: SectionId = '0.0' as SectionId;

  init(section: SectionId, known: (k: string) => boolean): void { this.section = section; this.layout = load(section, known); }
  apply(f: (l: Layout) => Layout): void { this.layout = f(this.layout); this.save(); }
  reset(): void { this.layout = ensureOwn(defaultLayout(this.section), this.section); this.overlay = null; this.save(); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.layout)); } catch { /* private mode */ } }
}
export const layoutStore = new LayoutStore();
