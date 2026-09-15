/* The pure helpers of the drawing layer: the ones a figure's look depends on but
   which need no canvas of their own. Text is measured through a stub context, so
   the clamping and the wrapping are checked without a browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIG } from '../src/lib/fig/figlib';

/* a 2D context that measures every character as 10 units wide and records what it drew */
type Drawn = { s: string; x: number; y: number };
function stub(H = 600): CanvasRenderingContext2D & { drawn: Drawn[] } {
  const drawn: Drawn[] = [];
  const c = {
    drawn, canvas: { dataset: { h: String(H) } },
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, textAlign: 'left', textBaseline: 'middle', lineCap: '', lineJoin: '',
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, rect() {}, clip() {},
    fillRect() {}, strokeRect() {}, setLineDash() {}, translate() {}, scale() {}, rotate() {},
    measureText: (t: string) => ({ width: t.length * 10 }),
    fillText: (s: string, x: number, y: number) => { drawn.push({ s, x, y }); },
  };
  return c as unknown as CanvasRenderingContext2D & { drawn: Drawn[] };
}

test('fitScale takes the smaller of the two fits and never rescales a scene past its box', () => {
  const box = { l: 100, r: 1300, t: 100, b: 500 };
  assert.equal(FIG.fitScale(box, { w: 1200, h: 400 }), 1);
  assert.equal(FIG.fitScale(box, { w: 600, h: 400 }), 1);       /* the height is the tighter fit */
  assert.equal(FIG.fitScale(box, { w: 2400, h: 100 }), 0.5);    /* the width is */
  assert.equal(FIG.fitScale(box, { w: 0, h: 0 }), 0);
});

test('a label is clamped inside the canvas at both edges', () => {
  const ctx = stub(600);
  const right = FIG.label(ctx, 'terminal speed', 1395, 300, { side: 'right' });
  assert.ok(right.r <= FIG.LW - 16 + 1e-6, 'the right edge stays on the canvas');
  const left = FIG.label(ctx, 'terminal speed', 5, 300, { side: 'left' });
  assert.ok(left.l >= 16 - 1e-6, 'the left edge stays on the canvas');
  const low = FIG.label(ctx, 'the floor', 700, 598, { side: 'below' });
  assert.ok(low.b <= 600 - 16 + 1e-6, 'the bottom edge stays on the canvas');
  const high = FIG.label(ctx, 'the ceiling', 700, 2, { side: 'above' });
  assert.ok(high.t >= 16 - 1e-6, 'the top edge stays on the canvas');
});

test('the headline wraps to two lines only when one will not fit', () => {
  const ctx = stub();
  assert.equal(FIG.headline(ctx, 'It is 3.0 m up.'), 1);
  assert.equal(ctx.drawn.length, 1);
  const long = 'After 4.00 s the dragster is at x = 402 m, since the distance it covers grows with the square of the time it has been accelerating';
  assert.equal(FIG.headline(ctx, long), 2);
  assert.equal(ctx.drawn.length, 3);
  assert.equal(FIG.topline(ctx, long), 2);
});

test('the silhouette states the height a scene scales it to', () => {
  assert.equal(FIG.silhouette.height(1), 150);
  assert.equal(FIG.silhouette.height(0.5), 75);
  assert.equal(FIG.silhouette.height(), 150);
  assert.equal(FIG.silhouette.pose('stand').feet.length, 2);
});
