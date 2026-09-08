/* What section each companion view describes. By default a view follows the
   focused document; a pinned view holds a section of its own until unpinned.
   Pins are remembered in this browser. */
import { focus } from './focus.svelte';
import type { SectionId, ViewKind } from '../types/ids';

const KEY = 'omnia-scope';
const load = (): Partial<Record<ViewKind, SectionId>> => { try { const o = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return typeof o === 'object' && o ? o : {}; } catch { return {}; } };

class Scope {
  pinned = $state<Partial<Record<ViewKind, SectionId>>>(load());
  sectionFor(kind: ViewKind): SectionId { return this.pinned[kind] ?? focus.section; }
  isPinned(kind: ViewKind): boolean { return this.pinned[kind] !== undefined; }
  pin(kind: ViewKind, section: SectionId): void { this.pinned = { ...this.pinned, [kind]: section }; this.save(); }
  unpin(kind: ViewKind): void { const { [kind]: _, ...rest } = this.pinned; this.pinned = rest; this.save(); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.pinned)); } catch { /* private mode */ } }
}
export const scope = new Scope();
