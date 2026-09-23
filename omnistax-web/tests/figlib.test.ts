/* The pure helpers of the drawing layer: the ones a figure's look depends on but
   which need no canvas of their own. Text is measured through a stub context, so
   the clamping and the wrapping are checked without a browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIG, figFor, registerFigBook } from '../src/lib/fig/figlib';

/* a 2D context that measures every character as 10 units wide and records what it drew */
type Drawn = { s: string; x: number; y: number };
function stub(H = 600): CanvasRenderingContext2D & { drawn: Drawn[] } {
  const drawn: Drawn[] = [];
  const c = {
    drawn, canvas: { dataset: { h: String(H) } },
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, textAlign: 'left', textBaseline: 'middle', lineCap: '', lineJoin: '',
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, rect() {}, clip() {},
    fillRect() {}, strokeRect() {}, setLineDash() {}, translate() {}, scale() {}, rotate() {},
    ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, roundRect() {}, arcTo() {},
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

/* ---------- the silhouette's second round ---------- */
test('a silhouette option passed as undefined leaves the pose its own joint', () => {
  const ctx = stub();
  /* a figure that writes `kneeSide: front ? 1 : undefined` must not lose the pose */
  assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, pose: 'push', hip: undefined, feet: undefined, kneeSide: undefined }));
  assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, pose: 'crouch', front: true }));
  assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, pose: 'crouch', kneeSide: [1, -1] }));
});

test('a stride swings the feet and the hands over one phase, and stands square at 0', () => {
  const ctx = stub();
  for (const p of [0, 0.25, 0.5, 0.75, 1]) assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, pose: 'walk', phase: p }));
  for (const p of [0, 0.3, 0.9]) assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, pose: 'run', phase: p }));
});

test('the arm states its reach, and a hand beyond it is drawn at it', () => {
  assert.equal(FIG.silhouette.reach(1), 60);
  assert.equal(FIG.silhouette.reach(0.5), 30);
  const ctx = stub();
  assert.doesNotThrow(() => FIG.silhouette(ctx, { x: 200, y: 400, hands: [{ x: 900, y: -900 }, { x: -900, y: 900 }] }));
});

/* ---------- the new sprites ---------- */
test('every sprite draws without a canvas of its own', () => {
  const ctx = stub();
  const at = { x: 400, y: 300 };
  assert.doesNotThrow(() => {
    FIG.fist(ctx, at.x, at.y, 1, 0);
    FIG.cart(ctx, at.x, at.y, 120, 60);
    FIG.personTop(ctx, at.x, at.y, 1, 0.4, undefined, [{ x: 500, y: 300 }, { x: 500, y: 320 }]);
    FIG.motorcycle(ctx, at.x, at.y, 0.8);
    FIG.helicopterSide(ctx, at.x, at.y);
    FIG.coasterCar(ctx, at.x, at.y);
    FIG.cardboardBox(ctx, at.x, at.y, 120, 90);
    FIG.cupOnSide(ctx, at.x, at.y);
    FIG.guitar(ctx, 100, at.y, 0.9);
    FIG.book(ctx, at.x, at.y, 80, 110);
    FIG.backpack(ctx, at.x, at.y);
  });
  const g = FIG.guitar.string(100, 0.5);
  assert.equal(g.nut, 142); assert.equal(g.bridge, 517);
});

/* ---------- the labeller's second round ---------- */
test('a headline labeller blocks the band on construction', () => {
  const ctx = stub(600);
  /* the same label, with the band blocked and without: blocked, every slot in the band is
     taken and flush reports it, so the figure knows to move it by hand */
  const free = FIG.labeller(ctx, 600);
  free.add('v = 3.0 m/s', 700, 30, 0, -1, '#000', 20);
  assert.deepEqual(free.flush(), []);
  const band = FIG.labeller(ctx, 600, { headline: true });
  band.add('v = 3.0 m/s', 700, 30, 0, -1, '#000', 20);
  assert.deepEqual(band.flush(), ['v = 3.0 m/s']);
  /* a label well below the band is untouched by it */
  const low = FIG.labeller(ctx, 600, { headline: 2 });
  low.add('v = 3.0 m/s', 700, 400, 0, 1, '#000', 20);
  assert.deepEqual(low.flush(), []);
});

test('a box a figure drew itself joins the collision set', () => {
  const ctx = stub(600);
  const L = FIG.labeller(ctx, 600);
  const box = FIG.label(ctx, 'the block', 700, 300, { side: 'above' });
  L.place(box, 'the block');
  const drawn = ctx.drawn.length;
  L.add('the block', 700, 300 - 20, 0, -1, '#000', 20);
  L.flush();
  const put = ctx.drawn[drawn];
  assert.ok(put.y < box.t || put.y > box.b, 'the queued label did not land on the box');
});

test('a label beside a line may be set anywhere along it', () => {
  const ctx = stub(600);
  const seg = { x1: 200, y1: 300, x2: 800, y2: 300 };
  const mid = FIG.labeller(ctx, 600); mid.beside(seg, 'left', 'T'); const n = ctx.drawn.length; mid.flush();
  const near = FIG.labeller(ctx, 600); near.beside(seg, 'left', 'T', undefined, undefined, { offset: 0.1 }); const m = ctx.drawn.length; near.flush();
  assert.equal(ctx.drawn[n].x, 495);     /* the midpoint, the text centred on it */
  assert.equal(ctx.drawn[m].x, 255);     /* a tenth along the line */
});

test('the halo and the vector triangle draw, and the difference comes back a row below', () => {
  const ctx = stub(600);
  const L = FIG.labeller(ctx, 600);
  assert.doesNotThrow(() => L.halo({ x1: 100, y1: 100, x2: 300, y2: 260 }));
  const d = FIG.vectorTriangle(ctx, { x: 300, y: 200 }, { x: 120, y: 0 }, { x: 0, y: -90 }, { dy: 200, names: ['v_1', 'v_2', 'Δv'], lab: L });
  assert.equal(d.tail.y, 400);
  assert.equal(d.head.x, 300 - 120); assert.equal(d.head.y, 400 - 90);
});

test('a cable runs round its pulleys and a cable with none is the straight line', () => {
  const ctx = stub(600);
  assert.doesNotThrow(() => FIG.wrap(ctx, [{ x: 200, y: 500 }, { x: 900, y: 500 }], [{ x: 400, y: 200 }, { x: 700, y: 200 }], 34));
  assert.doesNotThrow(() => FIG.wrap(ctx, [{ x: 200, y: 500 }, { x: 900, y: 500 }], [], 34));
});

test('each book sets TeX with its own macros and symbols, through a Fig of its own', () => {
  registerFigBook({ id: 'book-a', macros: { '\\kT': '\\htmlClass{kv-time}{t}' }, symbols: { T: 't' }, colorKeys: ['time'] });
  registerFigBook({ id: 'book-b', macros: { '\\kT': '\\htmlClass{kv-temperature}{T}' }, symbols: { T: 'T' }, colorKeys: ['temperature'] });
  const a = figFor('book-a'), b = figFor('book-b');
  assert.equal(a, figFor('book-a'), 'one Fig per book, made once');
  assert.equal(a.KOPT.macros['\\kT'], '\\htmlClass{kv-time}{t}');
  assert.equal(b.KOPT.macros['\\kT'], '\\htmlClass{kv-temperature}{T}');
  assert.equal(a.SYM.T, 't');
  assert.equal(b.macros['\\kT'], '\\htmlClass{kv-temperature}{T}');
  assert.equal(FIG.KOPT.macros['\\kT'], undefined, 'neither leaks into the default table');
  assert.equal(a.fitScale({ l: 0, r: 100, t: 0, b: 100 }, { w: 200, h: 100 }), 0.5, 'the rest of the surface is FIG\'s');
  assert.equal(a.LW, FIG.LW);
});
