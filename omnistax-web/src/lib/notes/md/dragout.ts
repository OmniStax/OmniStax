/* A row of a panel is dragged into a note. What the note wants is the embed
   text for the thing the row stands for — `![[eq:16.1:eq-hooke]]` for an
   equation, `![[hl:…]]` for a highlight — so the drag carries nothing but that
   string as `text/plain`: in edit mode CodeMirror takes it and writes it where
   the pointer is, in read mode the note's dropzone appends it, and anywhere
   else in the world it is text a reader can paste.

   Three gestures land here. On a mouse the left button drags the card and the
   right one sweeps a selection across the words — the browser does neither of
   those by itself on a right button, so that selection is built by hand in
   `rightdrag`. A reader who would rather keep the left button on the text can
   trade the two over in settings, and then the card is dragged with the right
   button, which no browser will start a native drag from; that drag is carried
   by the pointer instead and handed to the same drop targets. On a touch screen
   a plain drag is still the page scrolling; it is a long press that picks the
   card up, by the same pointer-carried route.

   This is not the layout's drag. The tab strips, the rail and the group bodies
   accept only what the layout's own `draggable` started, which they know by the
   drag it holds in flight; nothing here touches that, so a row dragged out of a
   panel is never mistaken for a tab being moved. While the drag is in flight the
   document wears `dragging-out`, which is how a note knows to show where the
   card would land. */
import { embedText, type LinkTarget } from './links';
import { beginSelect, crossedSlop, type SelectDrag } from './rightdrag';
import { settings } from '../../settings/store.svelte';

/* The mark on the document, and the fields a press must be left to: a reader
   selecting the words of an annotation is not reaching for the card, and a
   panel says with `data-nodrag` where else that is true of it. */
const IN_FLIGHT = 'dragging-out';
const NO_DRAG = 'input, textarea, select, [data-nodrag]';
/* How long a finger must rest before the card comes up rather than the page
   scrolling under it, and how far it may stray in that time. */
const LONG_PRESS_MS = 400;
const LONG_PRESS_SLOP = 10;

/* The toast that says which button is doing what. One at a time, so the shell
   mounts a single listener and every dragging row talks to it. */
type ToastListener = (dragging: boolean) => void;
let toastListener: ToastListener | null = null;
export const onDragToast = (fn: ToastListener | null): void => { toastListener = fn; };
const toast = (dragging: boolean): void => { toastListener?.(dragging); };

const mark = (on: boolean): void => {
  document.documentElement.classList.toggle(IN_FLIGHT, on);
  toast(on);
};

/* A drag the pointer carries, for the cases the browser will not start one:
   a right button, and a finger. The drop targets read a `DragEvent`, so that
   is what they are given — the same event with the same payload, dispatched
   at whatever the pointer is over. */
function carriedDrag(text: string) {
  let data: DataTransfer;
  try {
    data = new DataTransfer();
    data.setData('text/plain', text);
    data.effectAllowed = 'copy';
  } catch { return null; }     /* no synthetic drags in this engine */
  const at = (type: string, x: number, y: number): void => {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    try { el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, dataTransfer: data })); } catch { /* no DragEvent constructor */ }
  };
  mark(true);
  return {
    move: (x: number, y: number) => at('dragover', x, y),
    drop: (x: number, y: number) => { at('drop', x, y); mark(false); },
    cancel: () => mark(false),
  };
}

type Carried = ReturnType<typeof carriedDrag>;

export function dragout(node: HTMLElement, target: LinkTarget) {
  let link = target;
  /* At most one of these is live at a time: the words being swept, the card
     being carried, and the timer waiting for a finger to settle. */
  let sweep: SelectDrag | null = null;
  let carried: Carried = null;
  let press: { x: number; y: number } | null = null;
  let timer = 0;
  let suppressMenu = false;

  const stopTimer = (): void => { if (timer) { clearTimeout(timer); timer = 0; } };
  const noDrag = (t: EventTarget | null): boolean => t instanceof Element && t.closest(NO_DRAG) !== null;
  /* Scrolling is the page's until the card is up, and then it is not. */
  const holdPage = (e: TouchEvent): void => { if (carried) e.preventDefault(); };

  const lift = (x: number, y: number): void => {
    carried = carriedDrag(embedText(link));
    if (carried) carried.move(x, y);
  };

  const down = (e: PointerEvent) => {
    const swapped = settings.swapDragButtons;
    const dragBtn = swapped ? 2 : 0;
    /* The native drag is only ever the left button's, so it is off whenever the
       card is on the right one — and off for the press that lands on a control. */
    node.draggable = !swapped && !noDrag(e.target);
    if (noDrag(e.target)) return;
    press = { x: e.clientX, y: e.clientY };
    suppressMenu = false;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      /* A finger scrolls and selects as it always did until it has rested. */
      stopTimer();
      timer = window.setTimeout(() => { timer = 0; if (press) lift(press.x, press.y); }, LONG_PRESS_MS);
      return;
    }
    if (e.button === dragBtn && swapped) { node.setPointerCapture?.(e.pointerId); lift(e.clientX, e.clientY); e.preventDefault(); return; }
    if (e.button === 2 && !swapped) {
      sweep = beginSelect(e.clientX, e.clientY);
      if (sweep) { node.setPointerCapture?.(e.pointerId); e.preventDefault(); }
      return;
    }
  };

  const move = (e: PointerEvent) => {
    if (carried) { carried.move(e.clientX, e.clientY); return; }
    if (sweep) { sweep.move(e.clientX, e.clientY); suppressMenu = sweep.moved; return; }
    /* A finger that set off before it had rested is scrolling, not lifting. */
    if (timer && press && crossedSlop(e.clientX - press.x, e.clientY - press.y, LONG_PRESS_SLOP)) stopTimer();
  };

  const up = (e: PointerEvent) => {
    stopTimer();
    if (carried) { carried.drop(e.clientX, e.clientY); carried = null; suppressMenu = e.button === 2; }
    sweep = null;
    press = null;
    node.releasePointerCapture?.(e.pointerId);
  };

  const cancel = () => { stopTimer(); carried?.cancel(); carried = null; sweep = null; press = null; };

  /* The menu belongs to a right click that stayed still. A right button that
     travelled was a gesture of ours, and takes its menu with it. */
  const menu = (e: MouseEvent) => { if (suppressMenu) { e.preventDefault(); suppressMenu = false; } };

  const start = (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', embedText(link));
    e.dataTransfer.effectAllowed = 'copy';
    mark(true);
  };
  const end = () => mark(false);

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('contextmenu', menu);
  node.addEventListener('touchmove', holdPage, { passive: false });
  node.addEventListener('dragstart', start);
  node.addEventListener('dragend', end);
  node.draggable = !settings.swapDragButtons;
  /* A `draggable` element is unselectable in the engines' own stylesheets — the
     whole of it is the thing being dragged, so there is nothing in it to sweep
     across. Here there is: the right button sweeps it. So the rule is said back. */
  node.style.userSelect = 'text';
  node.style.setProperty('-webkit-user-select', 'text');
  return {
    update(next: LinkTarget) { link = next; },
    /* A row that goes away under the drag never sees its own `dragend`, so the
       mark is taken off here too. */
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('contextmenu', menu);
      node.removeEventListener('touchmove', holdPage);
      node.removeEventListener('dragstart', start);
      node.removeEventListener('dragend', end);
      cancel();
      end();
    },
  };
}
