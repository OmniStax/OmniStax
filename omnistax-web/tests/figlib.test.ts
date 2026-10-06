/* The pure helpers of the drawing layer: the ones a figure's look depends on but
   which need no canvas of their own. Text is measured through a stub context, so
   the clamping and the wrapping are checked without a browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIG, figFor, registerFigBook } from '../src/lib/fig/figlib';
import { handParts, GRIP } from '../src/lib/fig/hand';

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
    for (const view of ['palm', 'back', 'side'] as const) for (const thumb of ['up', 'along', 'out'] as const)
      FIG.hand(ctx, at.x, at.y, { view, thumb, curl: 0.6, right: view !== 'back', aim: [1, -1] });
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

/* Anything at all: every property is another one, every call and `new` makes one, and a number of it is 0. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anything = (own: Record<PropertyKey, unknown> = {}): any => new Proxy(function () {}, {
  get: (_, p) => (p in own ? own[p] : p === Symbol.toPrimitive ? () => 0 : p === 'then' ? undefined : (own[p] = anything())),
  set: (_, p, v) => { own[p] = v; return true; },
  apply: () => anything(), construct: () => anything(),
});
test('a 3D view is disposed by F.release of a root holding it, never by being out of the document', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const was = { window: g.window, document: g.document, raf: g.requestAnimationFrame };
  let disposed = 0, frames: ((t: number) => void)[] = [];
  const renderer = anything({ dispose: () => { disposed += 1; } });
  g.window = { THREE: anything({ WebGLRenderer: function () { return renderer; } }) };
  g.document = anything({ createElement: () => anything() });
  g.requestAnimationFrame = (f: (t: number) => void) => { frames.push(f); return 0; };
  try {
    const v = FIG.view3d(anything());
    Object.assign(v.wrap, { isConnected: false });
    for (let i = 0; i < 600; i += 1) { const due = frames; frames = []; due.forEach((f) => f(i * 16)); }
    assert.equal(disposed, 0, 'six hundred frames away and still alive');
    FIG.release(anything({ contains: (n: unknown) => n !== v.wrap }));
    assert.equal(disposed, 0, 'a root without it leaves it be');
    FIG.release(anything({ contains: (n: unknown) => n === v.wrap }));
    assert.equal(disposed, 1);
  } finally { Object.assign(g, { window: was.window, document: was.document, requestAnimationFrame: was.raf }); }
});

/* A stage that keeps what is appended to it, under a window whose THREE is `three`. */
const onStage = <T>(three: unknown, f: (stage: { kids: { className?: string }[] }) => T): T => {
  const g = globalThis as unknown as Record<string, unknown>;
  const was = { window: g.window, document: g.document, raf: g.requestAnimationFrame };
  g.window = { THREE: three };
  g.document = anything({ createElement: () => { const own: Record<string, unknown> = { childElementCount: 0 }; own.appendChild = () => { (own.childElementCount as number) += 1; }; return anything(own); } });
  g.requestAnimationFrame = () => 0;
  const kids: { className?: string }[] = [];
  try { return f(anything({ kids, appendChild: (e: { className?: string }) => { kids.push(e); return e; }, dataset: {} })); }
  finally { Object.assign(g, { window: was.window, document: was.document, requestAnimationFrame: was.raf }); }
};
test('a 3D view draws a button row only for the buttons it asks for: spin when idle, zoom when asked, views when given', () => {
  const bars = (o: Record<string, unknown>) => onStage(anything({ WebGLRenderer: function () { return anything(); } }), (stage) => {
    FIG.view3d(stage as unknown as HTMLElement, o);
    return stage.kids.filter((k) => k.className === 'view3d-bar').length;
  });
  assert.equal(bars({}), 0, 'none by default');
  assert.equal(bars({ spin: 'off' }), 0);
  assert.equal(bars({ spin: 'idle' }), 1);
  assert.equal(bars({ zoom: true }), 1);
  assert.equal(bars({ views: [{ label: 'front', yaw: 0, pitch: 0 }] }), 1);
});
test('without WebGL a 3D view shows one line and every call on it, its parts included, is a safe no-op', () => {
  const thrower = anything({ WebGLRenderer: function () { throw new Error('no WebGL'); } });
  for (const three of [thrower, undefined]) onStage(three, (stage) => {
    const v = FIG.view3d(stage as unknown as HTMLElement, { spin: 'idle', zoom: true });
    assert.equal(stage.kids.map((k) => k.className).join(' '), 'three-none');
    const g = v.part(0);
    g.add({}); g.remove({}); g.clear(); g.position.set(1, 2, 3); g.rotation.y = 0.4; g.quaternion.copy({}); g.scale.set(2, 2, 2);
    g.userData.k = 1; g.visible = false;
    assert.ok(g.userData.k === 1 && (three !== undefined || Array.isArray(g.children)));
    v.label('a', [0, 0, 0], g); v.headline('h'); v.pickable(g, 'g'); v.setView(0, 0); v.invalidate(); v.clear(); v.dispose();
    assert.equal(v.project([0, 0, 0], g).join(), '0,0');
  });
});
test('a library-formatted negative takes a true minus, and one that rounds to zero no sign', () => {
  assert.equal(FIG.fmt(-1.5, 1), '\u22121.5');
  assert.equal(FIG.fmt(-0.04, 1), '0.0');
  assert.equal(FIG.fmt(-1e-12, 2), '0.00');
  assert.equal(FIG.fmt(3, 2), '3.00');
});

/* ---------- the hand ---------- */
test('the hand keeps its finger lengths as it curls, and at full curl the fingers close round the grip', () => {
  const sticks = (curl: number) => handParts({ curl }).filter((p) => p.body === 'middle').map((p) => ('a' in p ? Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) : 0));
  sticks(0).forEach((l, i) => assert.ok(Math.abs(l - sticks(1)[i]) < 1e-12));
  const flat = handParts({ curl: 0 }).filter((p) => p.body === 'index');
  flat.forEach((p) => 'a' in p && assert.ok(Math.abs(p.b[2] - p.a[2]) < 1e-12, 'straight fingers lie in the palm\'s plane'));
  const shut = handParts({ curl: 1 }).filter((p) => p.body === 'index');
  shut.forEach((p) => 'a' in p && assert.ok(Math.abs(Math.hypot(p.b[0] - GRIP[0], p.b[2] - GRIP[2]) - 0.056) < 1e-9, 'each joint on the grip circle'));
  const up = handParts({ thumb: 'up' }).filter((p) => p.body === 'thumb'), along = handParts({ thumb: 'along' }).filter((p) => p.body === 'thumb');
  const tip = (ps: typeof up) => { const p = ps[ps.length - 1]; return 'b' in p ? p.b : p.c; };
  assert.ok(tip(up)[1] > tip(along)[1] && tip(along)[0] > tip(up)[0], 'up runs across the fingers, along runs with them');
});

/* ---------- a typeset headline ---------- */
test('a $…$ run in a headline is set by KaTeX under the book\'s macros, so it wears the type class', async () => {
  registerFigBook({ id: 'book-tex', macros: { '\\kF': '\\htmlClass{kv-force}{F}', '\\km': '\\htmlClass{kv-mass}{m}', '\\ka': '\\htmlClass{kv-acceleration}{a}' }, symbols: {}, colorKeys: ['force', 'mass', 'acceleration'] });
  const F = figFor('book-tex');
  let html: string | null = null;
  for (let i = 0; i < 200 && html === null; i += 1) { html = F.typeset('\\kF = \\km\\ka'); if (html === null) await new Promise((r) => setTimeout(r, 10)); }
  assert.ok(html, 'KaTeX lands');
  assert.match(html!, /kv-force/);
  assert.match(html!, /kv-acceleration/);
});

test('off the page a TeX run is drawn plain, and wrapping still splits a plain headline as before', () => {
  const ctx = stub();
  assert.equal(FIG.headline(ctx, 'The net force $\\kF = \\km\\ka$ pushes it.'), 1);
  assert.equal(ctx.drawn.map((d) => d.s).join(''), 'The net force F = ma pushes it.');
  const long = 'A cart of mass $\\km = 2$ kg pulled with a constant force is pushed further and further along the track until it leaves the end';
  const two = stub();
  assert.equal(FIG.topline(two, long), 2);
  assert.ok(two.drawn.some((d) => d.s.includes('m = 2')), 'the run stays whole on one line');
  const plain = stub();
  assert.equal(FIG.topline(plain, 'It costs $100 to fill the field with bills stacked flat, and that is a sentence long enough to need a second line on the canvas.'), 2);
  assert.ok(plain.drawn.some((d) => d.s.includes('$100')), 'a lone dollar stays a dollar');
});

/* a context on a 1400-unit canvas shown `css` pixels wide, measuring each character as half its font size */
function pane(css: number): CanvasRenderingContext2D & { rects: number[][] } {
  const rects: number[][] = [];
  const c = Object.assign(stub(), {
    rects, canvas: { dataset: { h: '600' }, width: 1400, offsetWidth: css },
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    measureText(this: { font: string }, t: string) { return { width: t.length * 0.5 * +(/([\d.]+)px/.exec(this.font)?.[1] ?? 0) }; },
    fillRect: (x: number, y: number, w: number, h: number) => { rects.push([x, y, w, h]); },
  });
  return c as unknown as CanvasRenderingContext2D & { rects: number[][] };
}

test('a label is measured at the size the layer shows it, floor and pane scale included', () => {
  const half = pane(700), full = pane(1400);
  const w = FIG.measure(half, 'r1 panel', { size: 17 }), nominal = FIG.measure(full, 'r1 panel', { size: 17 });
  assert.equal(nominal, 8 * 0.5 * 17);
  assert.equal(w, 8 * 0.5 * 22);                                  /* 11 px at half scale is 22 canvas units */
  assert.ok(Math.abs(w / nominal - 22 / 17) < 1e-9);
  const sub = FIG.measure(half, 'r_1', { size: 17 });
  assert.equal(sub, 0.5 * 22 + 0.5 * 20);                         /* the subscript held at its 10 px floor */
  assert.equal(FIG.measure(pane(0), 'r1 panel', { size: 17 }), nominal);   /* detached: the size asked for */
});

test('a bg panel encloses its text as the layer shows it', () => {
  const ctx = pane(700), s = 'r_2 = 4.0 cm';
  FIG.text(ctx, s, 700, 300, '#000', { size: 17, align: 'center', bg: '#fff' });
  const [x, y, w, h] = ctx.rects[0], tw = FIG.measure(ctx, s, { size: 17 });
  assert.ok(x <= 700 - tw / 2 && x + w >= 700 + tw / 2, 'the panel spans the text');
  assert.ok(y <= 300 - 11 && y + h >= 300 + 11, 'and its 22-unit height');
  const box = FIG.label(ctx, s, 700, 300, { size: 17 });
  assert.ok(box.r - box.l >= tw, 'a label returns the box its text takes');
});
