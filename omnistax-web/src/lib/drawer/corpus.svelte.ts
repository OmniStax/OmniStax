/* Every drawing the reader has, read from IndexedDB once; the drawings opened
   this session come from the store, which holds them as they are being drawn.
   A drawing whose row has gone was deleted. */
import { drawings, exportDrawings } from './store.svelte';
import type { Drawing } from './model';

class DrawingCorpus {
  private stored = $state.raw<readonly Drawing[]>([]);
  private asked = false;
  readonly current: readonly Drawing[] = $derived.by(() => {
    const live = new Set<string>(drawings.rows.map((r) => r.id));
    const byId = new Map<string, Drawing>(this.stored.map((d) => [d.id, d]));
    Object.values(drawings.open).forEach((d) => byId.set(d.id, d));
    return [...byId.values()].filter((d) => live.has(d.id));
  });

  async load(): Promise<void> {
    if (this.asked) return;
    this.asked = true;
    this.stored = await exportDrawings();
  }
}
export const drawingCorpus = new DrawingCorpus();
