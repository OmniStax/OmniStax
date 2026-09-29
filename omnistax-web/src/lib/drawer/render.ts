/* The ink of a drawing, put onto a 2D context. The module is pure over the
   context it is handed: it reads nothing of the page and keeps nothing of its
   own, so the same calls draw the finished strokes into the offscreen bitmap,
   the live stroke onto the canvas above it, and the whole page into the
   thumbnail a note embeds.

   Boxes and frames are not drawn here. They are HTML, laid over the canvas
   inside one transformed container, because a card renders KaTeX and follows
   links and a picture of one would do neither. */
import { headAngles, linkPath, nib, type LinkPath } from './geometry';
import type { Paint } from './colour';
import type { DrawItem, Heads, InkTool, Point } from './model';

/* A highlighter is wide and half transparent and multiplies into what is under
   it, so that two passes darken as a real one does; a pen is opaque. */
const ALPHA: Readonly<Record<InkTool, number>> = { pen: 1, highlighter: 0.4 };
const WIDTH: Readonly<Record<InkTool, number>> = { pen: 1, highlighter: 6 };
const BLEND: Readonly<Record<InkTool, GlobalCompositeOperation>> = { pen: 'source-over', highlighter: 'multiply' };

/* Everything one item sets on the context is set back afterwards, so that the
   caller can draw a hundred items without thinking about what the last one
   left behind. */
const styled = (ctx: CanvasRenderingContext2D, f: () => void): void => { ctx.save(); try { f(); } finally { ctx.restore(); } };

/* A pen stroke is drawn as a run of segments rather than one path, because the
   nib changes width along it with the pressure; a highlighter is one path at
   one width, which is what stops a translucent stroke from darkening at every
   join where two segments overlap. */
const strokeInk = (ctx: CanvasRenderingContext2D, tool: InkTool, color: string, size: number, points: readonly Point[]): void => {
  styled(ctx, () => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = ALPHA[tool];
    ctx.globalCompositeOperation = BLEND[tool];
    const base = size * WIDTH[tool];
    if (points.length === 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[0][0], points[0][1], Math.max(0.5, nib(base, points[0][2]) / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (tool === 'highlighter') {
      ctx.lineWidth = base;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.stroke();
      return;
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      ctx.lineWidth = Math.max(0.4, nib(base, (a[2] + b[2]) / 2));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  });
};

/* The head of an arrow: two strokes back along the shaft, at a fixed angle and
   a length that grows with the line's own width so that a thick arrow does not
   end in a pinprick. */
const ARROW_ANGLE = Math.PI / 7;
const arrowHead = (ctx: CanvasRenderingContext2D, to: readonly [number, number], a: number, size: number): void => {
  const len = Math.max(9, size * 4);
  ctx.beginPath();
  ctx.moveTo(to[0] - Math.cos(a - ARROW_ANGLE) * len, to[1] - Math.sin(a - ARROW_ANGLE) * len);
  ctx.lineTo(to[0], to[1]);
  ctx.lineTo(to[0] - Math.cos(a + ARROW_ANGLE) * len, to[1] - Math.sin(a + ARROW_ANGLE) * len);
  ctx.stroke();
};

/* A connector: its curve and a head at either end it asks for. */
export const drawPath = (ctx: CanvasRenderingContext2D, p: LinkPath, color: string, size: number, heads: Heads): void => {
  styled(ctx, () => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, size);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.a[0], p.a[1]);
    ctx.bezierCurveTo(p.c1[0], p.c1[1], p.c2[0], p.c2[1], p.b[0], p.b[1]);
    ctx.stroke();
    const at = headAngles(p);
    if (heads.start) arrowHead(ctx, p.a, at.start, size);
    if (heads.end) arrowHead(ctx, p.b, at.end, size);
  });
};

const drawShape = (ctx: CanvasRenderingContext2D, item: Extract<DrawItem, { kind: 'shape' }>, paint: Paint): void => {
  styled(ctx, () => {
    const color = paint(item.color);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, item.size);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    /* A filled shape wears its own colour behind its outline, thinned so that
       what is under it still reads through. */
    ctx.fillStyle = color;
    const [x0, y0] = item.from, [x1, y1] = item.to;
    if (item.shape === 'line') { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); return; }
    const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    ctx.beginPath();
    if (item.shape === 'rect') ctx.rect(x, y, w, h);
    else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (item.fill) { ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.stroke();
  });
};

/* One item onto the context, in the coordinates the drawing keeps: the caller
   has already set whatever scale and offset the view is at. A connector is
   drawn between its elements, so it is handed the whole drawing to find them. */
export const drawItem = (ctx: CanvasRenderingContext2D, item: DrawItem, paint: Paint, all: readonly DrawItem[] = [item]): void => {
  if (item.kind === 'stroke') { strokeInk(ctx, item.tool, paint(item.color), item.size, item.points); return; }
  if (item.kind === 'shape') { drawShape(ctx, item, paint); return; }
  if (item.kind !== 'link') return;
  const p = linkPath(all, item);
  if (p) drawPath(ctx, p, paint(item.color), item.size, item.heads);
};

export const drawItems = (ctx: CanvasRenderingContext2D, items: readonly DrawItem[], paint: Paint, all: readonly DrawItem[] = items): void =>
  items.forEach((i) => drawItem(ctx, i, paint, all));

/* The stroke the pen is laying down this moment, before it has become an item:
   the same ink, so that what the reader sees while drawing is exactly what is
   left behind when they lift the pen. */
export const drawLive = (ctx: CanvasRenderingContext2D, tool: InkTool, color: string, size: number, points: readonly Point[]): void => {
  if (points.length) strokeInk(ctx, tool, color, size, points);
};

/* The dashed loop the lasso is being drawn with, and the outline it leaves
   round what it caught. Both are drawn in screen units — the caller passes the
   scale so the dashes do not grow with the zoom. */
export const drawLasso = (ctx: CanvasRenderingContext2D, poly: readonly (readonly [number, number])[], color: string, scale: number): void => {
  if (poly.length < 2) return;
  styled(ctx, () => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    poly.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.stroke();
  });
};

/* ── the canvas itself ───────────────────────────────────────────────────── */

/* A canvas is sized in CSS pixels and backed by device pixels, as the book's
   own figures are (`fig/figlib.ts`): the backing store is the ratio the screen
   reports, capped at two, and the context is scaled by it so that everything
   drawn afterwards is in CSS pixels. */
export const DPR_CAP = 2;
export const dprOf = (): number => Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, DPR_CAP);

/* Give a canvas a backing store of this size at this ratio, and hand back its
   context ready to draw in CSS pixels. A canvas already at that size is left
   alone, since setting width clears it. */
export const fitCanvas = (canvas: HTMLCanvasElement, w: number, h: number, dpr: number = dprOf()): CanvasRenderingContext2D | null => {
  const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
};
