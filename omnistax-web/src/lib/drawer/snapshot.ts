/* A figure of the book, dropped on a drawing, is a picture of it as it stood
   at that moment and not the figure itself. A simulation reads pointer
   positions off its own canvas, and a canvas scaled and slid about under a
   drawing's transform would read them all wrong; so the frame holds a
   snapshot, with a glyph that opens the live figure in a split beside the
   drawing, where it has the pane to itself and works as it always did.

   The picture is composited here: whatever the figure drew, and the caption
   under it, into one data URL, which goes into the asset store so that it
   survives a reload as a pasted note image does. */
import { putAsset } from '../notes/assets';
import { assetId, type AssetId } from '../notes/assets';
import { dprOf } from './render';

/* What a snapshot is worth holding: the picture, and how big it came out, so
   that the frame it lands in has the figure's own shape rather than a square. */
export type Snapshot = { readonly asset: AssetId; readonly width: number; readonly height: number };

/* How wide a snapshot is drawn, and the most it may be tall: a figure taller
   than this is fitted rather than cropped, since a cropped figure says less
   than a small whole one. */
const SHOT_WIDTH = 520;
const MAX_HEIGHT = 720;
const CAPTION_PAD = 8;
const CAPTION_SIZE = 12;

/* One frame's wait, so that a figure booted a moment ago has drawn once. A
   script that draws on its own loop has drawn by then; one that draws on a
   resize has been resized by the pane it was put in. */
const nextFrame = (): Promise<void> => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'undefined') { resolve(); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

/* The words under a figure, as the section prints them, cut to what will fit
   on two lines of the card. */
const captionOf = (root: HTMLElement): string => {
  const cap = root.querySelector('figcaption, .fig-caption');
  return (cap?.textContent ?? '').replace(/\s+/g, ' ').trim();
};

/* What the figure drew: its own canvas where it has one, the still picture
   where it is drawn with an `<img>`, and nothing at all where it is neither —
   a figure made of typeset prose, which no picture would improve. */
const pictureOf = (root: HTMLElement): HTMLCanvasElement | HTMLImageElement | null =>
  root.querySelector<HTMLCanvasElement>('canvas') ?? root.querySelector<HTMLImageElement>('img');

const sizeOf = (el: HTMLCanvasElement | HTMLImageElement): { w: number; h: number } => {
  const rect = el.getBoundingClientRect();
  const w = rect.width || (el instanceof HTMLCanvasElement ? el.width : el.naturalWidth) || SHOT_WIDTH;
  const h = rect.height || (el instanceof HTMLCanvasElement ? el.height : el.naturalHeight) || SHOT_WIDTH * 0.6;
  return { w, h };
};

/* The caption, wrapped by hand: a 2D context measures but does not wrap, and a
   figure's words are a line or two, so the greedy rule is enough. */
const wrapped = (ctx: CanvasRenderingContext2D, text: string, width: number, lines: number): readonly string[] => {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) { line = next; continue; }
    out.push(line);
    line = word;
    if (out.length === lines) return out;
  }
  if (line && out.length < lines) out.push(line);
  return out;
};

/* Draw the picture and its caption into one canvas. The ground is painted
   white rather than left clear, because a snapshot is a picture of paper and
   is looked at on the drawing's own page, which is paper too; a figure drawn
   for the dark theme therefore still reads. */
const composite = (picture: HTMLCanvasElement | HTMLImageElement, caption: string): HTMLCanvasElement | null => {
  const { w, h } = sizeOf(picture);
  const scale = Math.min(SHOT_WIDTH / w, MAX_HEIGHT / h, 1);
  const pw = Math.max(1, Math.round(w * scale)), ph = Math.max(1, Math.round(h * scale));
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  probe.font = `${CAPTION_SIZE}px system-ui, sans-serif`;
  const lines = caption ? wrapped(probe, caption, pw - 2 * CAPTION_PAD, 2) : [];
  const capHeight = lines.length ? lines.length * (CAPTION_SIZE + 4) + 2 * CAPTION_PAD : 0;

  const out = document.createElement('canvas');
  const dpr = dprOf();
  out.width = Math.round(pw * dpr); out.height = Math.round((ph + capHeight) * dpr);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pw, ph + capHeight);
  try { ctx.drawImage(picture, 0, 0, pw, ph); } catch { return null; }   /* an image from elsewhere taints the canvas */
  if (lines.length) {
    ctx.fillStyle = '#4a4a4a';
    ctx.font = `${CAPTION_SIZE}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, CAPTION_PAD, ph + CAPTION_PAD + i * (CAPTION_SIZE + 4)));
  }
  return out;
};

const blobOf = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => { try { canvas.toBlob((b) => resolve(b), 'image/png'); } catch { resolve(null); } });

/* A figure root the registry has built, as a stored picture. Nothing at all
   when the figure drew no picture or the canvas cannot be read, and then the
   frame shows the caption card and the open glyph instead, which says what the
   figure is and still opens it. */
export const snapshotFigure = async (root: HTMLElement): Promise<Snapshot | null> => {
  await nextFrame();
  const picture = pictureOf(root);
  if (!picture) return null;
  const canvas = composite(picture, captionOf(root));
  if (!canvas) return null;
  const blob = await blobOf(canvas);
  if (!blob) return null;
  try {
    const asset = await putAsset(blob);
    return { asset, width: canvas.width / dprOf(), height: canvas.height / dprOf() };
  } catch { return null; }
};

/* An image file dropped straight onto the page: the same store, and the size
   it wants to be drawn at, so the frame it lands in is the picture's shape. */
export const snapshotImage = async (file: File): Promise<Snapshot | null> => {
  try {
    const asset = await putAsset(file);
    const size = await imageSize(file).catch(() => null);
    return { asset, width: size?.w ?? 320, height: size?.h ?? 240 };
  } catch { return null; }
};

const imageSize = (file: File): Promise<{ w: number; h: number }> => new Promise((resolve, reject) => {
  if (typeof Image === 'undefined' || typeof URL === 'undefined') { reject(new Error('no image in this environment')); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('the image could not be read')); };
  img.src = url;
});

/* What a frame's embed says when it holds a picture rather than a card, and
   reading it back. A snapshot also names the thing it is a picture of, which
   is what the open glyph follows. */
export const ASSET_EMBED = 'asset:';
export const assetEmbed = (id: AssetId): string => `${ASSET_EMBED}${id}`;
export const assetOfEmbed = (embed: string): AssetId | null =>
  embed.startsWith(ASSET_EMBED) ? assetId(embed.slice(ASSET_EMBED.length)) : null;

/* The size a frame is given for a snapshot: the picture's own shape, capped so
   that a tall figure does not fill the page it was dropped on. */
export const frameSize = (s: Snapshot): { readonly w: number; readonly h: number } => {
  const k = Math.min(1, SHOT_WIDTH / Math.max(1, s.width));
  return { w: Math.round(s.width * k), h: Math.round(s.height * k) };
};
