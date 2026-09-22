/* Screen lock: while a session runs, the reader is meant to stay with the page.
   Let the pointer leave the window — or hide the tab — for longer than the
   grace, and the session is lost. Coming back inside before the grace runs out
   cancels it, so brushing past the edge of the screen costs nothing.

   This leans on a mouse, so it is offered on desktop only: a touch pointer
   never "leaves" anything, and the toggle is hidden there. */
import { LOCK_GRACE } from './model';

export type Unwatch = () => void;

export const hasPointer = (): boolean => {
  if (typeof window === 'undefined') return false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return !coarse && (navigator.maxTouchPoints ?? 0) === 0;
};

/* Watch the window, calling back once the reader has been away for the grace.
   Hands back the way to stop watching, which also drops a countdown in flight. */
export const watchAway = (onLost: () => void, grace: number = LOCK_GRACE): Unwatch => {
  if (typeof document === 'undefined') return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const back = (): void => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  const away = (): void => { if (timer === null) timer = setTimeout(() => { timer = null; onLost(); }, grace); };
  const root = document.documentElement;
  /* A pointerleave that names another element inside the page is the pointer
     moving between children, not leaving the window. */
  const left = (e: PointerEvent | MouseEvent): void => { if (!(e as PointerEvent).relatedTarget) away(); };
  const hidden = (): void => (document.visibilityState === 'hidden' ? away() : back());
  root.addEventListener('pointerleave', left);
  root.addEventListener('mouseleave', left);
  root.addEventListener('pointerenter', back);
  window.addEventListener('focus', back);
  window.addEventListener('blur', away);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    back();
    root.removeEventListener('pointerleave', left);
    root.removeEventListener('mouseleave', left);
    root.removeEventListener('pointerenter', back);
    window.removeEventListener('focus', back);
    window.removeEventListener('blur', away);
    document.removeEventListener('visibilitychange', hidden);
  };
};
