/* Drag and drop of items between rails, sidebars, tab strips and group bodies.
   One module-level drag in flight; the actions below attach the handlers. */
import type { GroupKey } from '../types/ids';
import type { ItemKey } from './model';

export type Drag = { readonly key: ItemKey; readonly from: GroupKey | null };
let current: Drag | null = null;
const DROP_CLASSES = ['drop', 'drop-left', 'drop-right', 'drop-up', 'drop-down'];
export const dragging = (): Drag | null => current;

/* What a handle drags: an item that stands somewhere, or one made as the drag
   begins — a rail button's page of its view, new each time it is dragged out. */
export type Dragged = Drag | { readonly make: () => ItemKey; readonly from: GroupKey | null };
export function draggable(node: HTMLElement, params: Dragged) {
  let p = params; node.draggable = true;
  const start = (e: DragEvent) => { const d: Drag = 'make' in p ? { key: p.make(), from: p.from } : p; current = d; e.dataTransfer?.setData('text/plain', d.key); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
  const end = () => { current = null; document.querySelectorAll(DROP_CLASSES.map((c) => `.${c}`).join(',')).forEach((z) => z.classList.remove(...DROP_CLASSES)); };
  node.addEventListener('dragstart', start); node.addEventListener('dragend', end);
  return { update(next: Dragged) { p = next; }, destroy() { node.removeEventListener('dragstart', start); node.removeEventListener('dragend', end); } };
}

export type DropHandlers = { over?: (e: DragEvent, d: Drag) => void; leave?: (e: DragEvent) => void; drop: (d: Drag, e: DragEvent) => void };
export function dropzone(node: HTMLElement, h: DropHandlers) {
  let handlers = h;
  const over = (e: DragEvent) => { if (!current) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; handlers.over?.(e, current); };
  const leave = (e: DragEvent) => { if (!node.contains(e.relatedTarget as Node | null)) handlers.leave?.(e); };
  const drop = (e: DragEvent) => { if (!current) return; e.preventDefault(); handlers.leave?.(e); const d = current; current = null; handlers.drop(d, e); };
  node.addEventListener('dragover', over); node.addEventListener('dragleave', leave); node.addEventListener('drop', drop);
  return { update(next: DropHandlers) { handlers = next; }, destroy() { node.removeEventListener('dragover', over); node.removeEventListener('dragleave', leave); node.removeEventListener('drop', drop); } };
}
