/* Where each document group is drawn. The split tree lays out an empty slot per
   group, and the groups themselves stand in one flat list beside the tree, each
   set over its slot. A group is therefore drawn once and stays: splitting,
   closing a neighbour or any other change of the tree's shape moves and sizes
   it, and nothing inside it — a draft, a scroll position, a running figure —
   is made again. */
import type { GroupKey } from '../types/ids';

export type Box = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
const same = (a: Box | undefined, b: Box): boolean => !!a && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

class Slots {
  boxes = $state.raw<Readonly<Record<string, Box>>>({});
  private readonly nodes = new Map<GroupKey, HTMLElement>();
  private host: HTMLElement | null = null;
  /* A slot that changes size may have pushed any other along, so every one is read again. */
  private readonly watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { this.measure(); });

  /* Read every slot against the host; true when any of them moved. */
  measure(): boolean {
    const host = this.host; if (!host) return false;
    const origin = host.getBoundingClientRect();
    const next: Record<string, Box> = {};
    this.nodes.forEach((node, key) => { const r = node.getBoundingClientRect(); next[key] = { left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height }; });
    const keys = Object.keys(next);
    if (keys.length === Object.keys(this.boxes).length && keys.every((k) => same(this.boxes[k], next[k]))) return false;
    this.boxes = next; return true;
  }
  setHost(node: HTMLElement | null): void { if (this.host) this.watch?.unobserve(this.host); this.host = node; if (node) { this.watch?.observe(node); this.measure(); } }
  add(key: GroupKey, node: HTMLElement): void { this.nodes.set(key, node); this.watch?.observe(node); this.measure(); }
  remove(key: GroupKey, node: HTMLElement): void { this.watch?.unobserve(node); if (this.nodes.get(key) === node) this.nodes.delete(key); }
}
export const slots = new Slots();

/* The element the groups are set against. */
export function slotHost(node: HTMLElement) {
  slots.setHost(node);
  return { destroy() { slots.setHost(null); } };
}
/* The place the tree keeps for one group. */
export function slot(node: HTMLElement, key: GroupKey) {
  let k = key; slots.add(k, node);
  return {
    update(next: GroupKey) { if (next === k) return; slots.remove(k, node); k = next; slots.add(k, node); },
    destroy() { slots.remove(k, node); },
  };
}
