/* A row of a panel is dragged into a note. What the note wants is the embed
   text for the thing the row stands for — `![[eq:16.1:eq-hooke]]` for an
   equation, `![[hl:…]]` for a highlight — so the drag carries nothing but that
   string as `text/plain`: in edit mode CodeMirror takes it and writes it where
   the pointer is, in read mode the note's dropzone appends it, and anywhere
   else in the world it is text a reader can paste.

   This is not the layout's drag. The tab strips, the rail and the group bodies
   accept only what the layout's own `draggable` started, which they know by the
   drag it holds in flight; nothing here touches that, so a row dragged out of a
   panel is never mistaken for a tab being moved. While the drag is in flight the
   document wears `dragging-out`, which is how a note knows to show where the
   card would land. */
import { embedText, type LinkTarget } from './links';

/* The mark on the document, and the fields a press must be left to: a reader
   selecting the words of an annotation is not reaching for the card, and a
   panel says with `data-nodrag` where else that is true of it. */
const IN_FLIGHT = 'dragging-out';
const NO_DRAG = 'input, textarea, select, [data-nodrag]';

export function dragout(node: HTMLElement, target: LinkTarget) {
  let link = target;
  node.draggable = true;
  /* The drag begins at the press, so that is where it is decided: a press on
     one of the card's own controls unsets `draggable` for the gesture it starts
     and the click it ends in, and the next press anywhere else sets it again. */
  const press = (e: PointerEvent) => {
    const t = e.target;
    node.draggable = !(t instanceof Element && t.closest(NO_DRAG));
  };
  const start = (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', embedText(link));
    e.dataTransfer.effectAllowed = 'copy';
    document.documentElement.classList.add(IN_FLIGHT);
  };
  const end = () => document.documentElement.classList.remove(IN_FLIGHT);
  node.addEventListener('pointerdown', press);
  node.addEventListener('dragstart', start);
  node.addEventListener('dragend', end);
  return {
    update(next: LinkTarget) { link = next; },
    /* A row that goes away under the drag never sees its own `dragend`, so the
       mark is taken off here too. */
    destroy() {
      node.removeEventListener('pointerdown', press);
      node.removeEventListener('dragstart', start);
      node.removeEventListener('dragend', end);
      end();
    },
  };
}
