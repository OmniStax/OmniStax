/* A small picture of a drawing, for the card a note shows when it holds one.
   It is a scaled export of the very ink the tab draws — the same pure renderer
   over a canvas of its own — made the first time something asks for it and
   kept until the drawing changes, which is what `updated` says.

   It is filled in after the rendering rather than during it. A note's HTML is
   derived from its markdown, and a picture takes a turn of the loop to make:
   the renderer leaves a waiting card carrying the drawing's id, and the view
   fills it the same way it fills an image the reader pasted. That is the rule
   every asset in a note already follows, and it keeps the renderer pure. */
import type { DrawingId } from '../types/ids';
import { getDrawing } from './db';
import { drawItems, dprOf } from './render';
import { boundsOf } from './geometry';
import { paperPaint } from './colour';
import type { Drawing } from './model';

/* How wide a thumbnail is drawn, and the most it may be tall: a long drawing
   is shown from its top rather than squeezed into a stamp. */
const THUMB_WIDTH = 280;
const MAX_RATIO = 1.4;
/* A picture asked for at a width of its own is for reading, not a stamp, so it keeps more of a long page. */
const READ_RATIO = 4;
const PAD = 12;

export type ThumbSize = { readonly width?: number };

const paint = (d: Drawing, width = THUMB_WIDTH, ratio = MAX_RATIO, dpr = dprOf()): string | null => {
  if (typeof document === 'undefined') return null;
  /* There is no page to draw, so the card is the room the drawing takes up:
     everything on the plane, boxes and frames included, with a margin round
     it. A stroke alone in an empty plane fills its own card rather than
     sitting as a speck in the middle of one. */
  const ink = boundsOf(d.items);
  const box = ink ?? { x: 0, y: 0, w: width, h: width * 0.6 };
  const w = Math.max(1, box.w + 2 * PAD), h = Math.max(1, box.h + 2 * PAD);
  const k = width / w;
  const tw = width, th = Math.min(width * ratio, Math.max(40, h * k));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(tw * dpr); canvas.height = Math.round(th * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tw, th);
  ctx.scale(k, k);
  ctx.translate(-(box.x - PAD), -(box.y - PAD));
  drawItems(ctx, d.items, paperPaint(document.documentElement));
  try { return canvas.toDataURL('image/png'); } catch { return null; }
};

/* The picture and the stamp it was made at, so that a drawing changed makes a
   new one and a drawing untouched never does. */
type Cached = { readonly at: number; readonly url: string };
const made = new Map<string, Cached>();

/* The picture of one drawing, made if it has not been made since the drawing
   last changed. A drawing that is not there answers nothing, and the card
   keeps its name and its waiting ground. The value handed in is the ink where
   the caller already has it, which saves a read of the database. */
export const thumbnailOf = async (id: DrawingId, ink?: Drawing, size: ThumbSize = {}): Promise<string | null> => {
  const d = ink ?? await getDrawing(id);
  if (!d) return null;
  const tag = size.width ? `${id}@${size.width}` : id;
  const have = made.get(tag);
  if (have && have.at === d.updated) return have.url;
  const url = size.width ? paint(d, size.width, READ_RATIO, 1) : paint(d);
  if (url) made.set(tag, { at: d.updated, url });
  return url ?? have?.url ?? null;
};

/* What a rendered card is waiting for: the drawings named in one piece of HTML
   that have no picture in them yet. */
export const waitingThumbs = (host: HTMLElement): readonly string[] =>
  Array.from(host.querySelectorAll<HTMLElement>('.drawing-embed[data-drawing]'))
    .filter((el) => el.querySelector('img.drawing-thumb') === null)
    .map((el) => el.dataset.drawing ?? '')
    .filter((id) => id !== '');

/* Put the picture into every card of one rendering that is waiting for one.
   A card whose drawing has gone is left as it is: it still says what it named,
   which is more use than an empty frame. */
export const fillThumbs = async (host: HTMLElement, id: DrawingId, url: string): Promise<void> => {
  for (const el of host.querySelectorAll<HTMLElement>(`.drawing-embed[data-drawing="${CSS.escape(id)}"]`)) {
    if (el.querySelector('img.drawing-thumb')) continue;
    const img = document.createElement('img');
    img.className = 'drawing-thumb';
    img.src = url;
    img.alt = '';
    el.querySelector('.drawing-waiting')?.remove();
    el.appendChild(img);
  }
};
