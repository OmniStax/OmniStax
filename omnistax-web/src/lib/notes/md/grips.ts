/* The corner a card of a note is sized by. Dragging it sets the card's width
   as it goes, and the width it is let go at is handed back with the embed the
   card stands for and which of that embed's cards it is, so the note can write
   it into the link: `![[eq:16.1:eq-hooke|w=420]]`. */
import type { EmbedWidth } from './links';

export type SizeWrite = (inner: string, n: number, width: EmbedWidth) => void;

const CARDS = '.book-embed[data-embed], .fig-embed[data-embed], .drawing-embed[data-embed], .stub-embed[data-embed], .file-embed[data-embed], .chat-embed[data-embed], .hl-embed[data-hl]';
const MIN_WIDTH = 160;

const innerOf = (card: HTMLElement): string => (card.dataset.hl !== undefined ? `hl:${card.dataset.hl}` : card.dataset.embed ?? '');

const startSize = (e: PointerEvent, grip: HTMLElement, card: HTMLElement, done: (width: EmbedWidth) => void): void => {
  e.preventDefault(); e.stopPropagation();
  const x0 = e.clientX, w0 = card.getBoundingClientRect().width;
  const room = card.parentElement?.getBoundingClientRect().width ?? Infinity;
  let width = Math.round(w0);
  grip.setPointerCapture(e.pointerId);
  const move = (m: PointerEvent): void => {
    width = Math.round(Math.min(room, Math.max(MIN_WIDTH, w0 + (m.clientX - x0))));
    card.style.width = `${width}px`;
  };
  const up = (): void => {
    grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
    if (width !== Math.round(w0)) done(width);
  };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
};

/* Read when the drag ends, since a figure's card says its values in its embed
   and those may have moved since the grip was put on. */
const placeOf = (host: HTMLElement, card: HTMLElement): { readonly inner: string; readonly n: number } => {
  const inner = innerOf(card);
  return { inner, n: [...host.querySelectorAll<HTMLElement>(CARDS)].filter((c) => innerOf(c) === inner).indexOf(card) };
};

export const addEmbedGrips = (host: HTMLElement, write: SizeWrite): void => {
  for (const card of host.querySelectorAll<HTMLElement>(CARDS)) {
    if (card.querySelector(':scope > .embed-grip')) continue;
    const grip = document.createElement('span');
    grip.className = 'embed-grip'; grip.title = 'Drag to resize';
    grip.addEventListener('pointerdown', (e) => startSize(e, grip, card, (w) => { const p = placeOf(host, card); write(p.inner, p.n, w); }));
    grip.addEventListener('click', (e) => e.stopPropagation());
    card.appendChild(grip);
  }
};
