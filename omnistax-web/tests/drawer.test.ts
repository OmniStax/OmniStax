/* The Drawer's pure parts: the drawing as a value, the sums the canvas needs,
   and the storage boundary. Nothing here touches a canvas or a database — the
   model is a function from Drawing to Drawing and the geometry is arithmetic,
   which is exactly what makes them worth testing on their own. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addItem, amend, canRedo, canUndo, emptyDrawing, grownTo, moveItems, newDrawItemId, parseDrawing,
  parseRows, redo, removeItems, replaceItem, rowByName, rowOf, scaleItems, setBoxBody, step, timeline, undo,
  GROW_STEP, PAGE_HEIGHT, type Drawing, type DrawItem, type Point,
} from '../src/lib/drawer/model';
import {
  bounds, boundsOf, distanceToSegment, erasedAt, handleUnder, inPolygon, lassoed, lowestPoint,
  nib, resized, simplify, snapped, type Vec,
} from '../src/lib/drawer/geometry';
import { toolForKey, isInk, TOOL_KEY, TOOLS } from '../src/lib/drawer/tools';
import { assetEmbed, assetOfEmbed } from '../src/lib/drawer/snapshot';
import { drawingId } from '../src/lib/types/ids';

const at = (x: number, y: number, p = 0.5): Point => [x, y, p];
const stroke = (points: readonly Point[], id = newDrawItemId()): DrawItem =>
  ({ kind: 'stroke', id, tool: 'pen', color: '#000', size: 2, points });
const box = (x: number, y: number, w = 100, h = 50, id = newDrawItemId()): DrawItem =>
  ({ kind: 'box', id, x, y, w, h, body: '' });

/* ── the drawing as a value ──────────────────────────────────────────────── */

test('a drawing starts empty and every change hands back a new value', () => {
  const d = emptyDrawing('Untitled', drawingId('aaaaaaaa'), 1000);
  assert.equal(d.items.length, 0);
  assert.equal(d.created, 1000);
  const one = addItem(d, stroke([at(1, 1), at(2, 2)]), 2000);
  assert.notEqual(one, d, 'the old value is untouched');
  assert.equal(d.items.length, 0);
  assert.equal(one.items.length, 1);
  assert.equal(one.updated, 2000, 'a change says when it happened');
});

test('removing what is not there changes nothing at all, which keeps it off the undo stack', () => {
  const d = addItem(emptyDrawing('d'), stroke([at(0, 0)]));
  assert.equal(removeItems(d, [newDrawItemId()]), d, 'the very same value comes back');
  assert.equal(moveItems(d, [], 10, 10), d);
  assert.equal(moveItems(d, d.items.map((i) => i.id), 0, 0), d, 'a drag that went nowhere is no change');
});

test('moving carries strokes by their points and boxes by their corner', () => {
  const s = stroke([at(0, 0), at(10, 10)]);
  const b = box(100, 100);
  const d = addItem(addItem(emptyDrawing('d'), s), b);
  const moved = moveItems(d, [s.id, b.id], 5, -3);
  const ms = moved.items[0];
  const mb = moved.items[1];
  assert.equal(ms.kind, 'stroke');
  if (ms.kind === 'stroke') assert.deepEqual([...ms.points[0]], [5, -3, 0.5]);
  assert.equal(mb.kind, 'box');
  if (mb.kind === 'box') assert.deepEqual([mb.x, mb.y], [105, 97]);
});

test('scaling maps every point out of the old box and into the new one', () => {
  const s = stroke([at(0, 0), at(10, 0), at(10, 10)]);
  const d = addItem(emptyDrawing('d'), s);
  const from = { x: 0, y: 0, w: 10, h: 10 };
  const to = { x: 0, y: 0, w: 20, h: 10 };
  const wider = scaleItems(d, [s.id], from, to);
  const got = wider.items[0];
  assert.equal(got.kind, 'stroke');
  if (got.kind !== 'stroke') return;
  assert.deepEqual([got.points[1][0], got.points[1][1]], [20, 0]);
  /* The nib follows the smaller of the two factors, so a shape stretched one
     way keeps an even outline. */
  assert.equal(got.size, 2, 'height did not change, so the width of the ink does not either');
});

test('a text box keeps its body, and setting the body it already has is no change', () => {
  const b = box(0, 0);
  const d = addItem(emptyDrawing('d'), b);
  const written = setBoxBody(d, b.id, 'hello $x$');
  const got = written.items[0];
  assert.equal(got.kind === 'box' && got.body, 'hello $x$');
  assert.equal(setBoxBody(written, b.id, 'hello $x$'), written);
  /* A stroke has no body to set, so it is left exactly as it was. */
  const inked = addItem(emptyDrawing('d'), stroke([at(0, 0)]));
  assert.equal(setBoxBody(inked, inked.items[0].id, 'x'), inked);
});

test('replacing an item that is not there leaves the drawing alone', () => {
  const d = addItem(emptyDrawing('d'), stroke([at(0, 0)]));
  assert.equal(replaceItem(d, box(0, 0)), d);
});

/* ── the page that grows ─────────────────────────────────────────────────── */

test('the page grows downward in steps and never shrinks back', () => {
  const d = emptyDrawing('d');
  assert.equal(d.height, PAGE_HEIGHT);
  assert.equal(grownTo(d, 100), d, 'ink well inside the page changes nothing');
  const taller = grownTo(d, PAGE_HEIGHT + 10);
  assert.ok(taller.height > PAGE_HEIGHT);
  assert.equal(taller.height % GROW_STEP, 0, 'it grows a whole step at a time');
  assert.equal(grownTo(taller, 10), taller, 'rubbing the ink out does not take the room back');
});

/* ── the drawing's own undo ──────────────────────────────────────────────── */

test('a step can be taken back and done again, and a nudge is not a step', () => {
  const a = emptyDrawing('d', drawingId('aaaaaaaa'), 1);
  const b = addItem(a, stroke([at(0, 0)]), 2);
  const c = addItem(b, stroke([at(1, 1)]), 3);

  let t = timeline(a);
  assert.equal(canUndo(t), false);
  assert.equal(canRedo(t), false);
  t = step(t, b);
  t = step(t, c);
  assert.equal(t.now, c);
  t = undo(t);
  assert.equal(t.now, b);
  assert.equal(canRedo(t), true);
  t = undo(t);
  assert.equal(t.now, a);
  assert.equal(canUndo(t), false, 'there is nothing before the beginning');
  assert.equal(undo(t), t);
  t = redo(t);
  assert.equal(t.now, b);
});

test('a step forward throws the future away, as every editor does', () => {
  const a = emptyDrawing('d');
  const b = addItem(a, stroke([at(0, 0)]));
  const c = addItem(a, stroke([at(9, 9)]));
  let t = step(timeline(a), b);
  t = undo(t);
  t = step(t, c);
  assert.equal(canRedo(t), false);
  assert.equal(t.now, c);
});

test('a change that changed nothing is not a step, and a nudge leaves the stack alone', () => {
  const a = emptyDrawing('d');
  const t = timeline(a);
  assert.equal(step(t, a), t);
  const b = addItem(a, stroke([at(0, 0)]));
  const nudged = amend(t, b);
  assert.equal(nudged.now, b);
  assert.equal(canUndo(nudged), false, 'the live stroke is not its own step');
});

/* ── the geometry ────────────────────────────────────────────────────────── */

test('an item’s bounds take in the width of its own ink', () => {
  const b = bounds(stroke([at(0, 0), at(10, 0)]));
  assert.equal(b.x, -1, 'half a nib to the left');
  assert.equal(b.w, 12);
  assert.equal(boundsOf([]), null, 'a selection of nothing has no box');
});

test('the lowest ink is what tells the page when to grow', () => {
  assert.equal(lowestPoint([]), 0);
  const low = lowestPoint([stroke([at(0, 10)]), box(0, 100, 10, 40)]);
  assert.equal(low, 140);
});

test('a point is inside a closed path by the crossing rule', () => {
  const square: Vec[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(inPolygon(square, 5, 5), true);
  assert.equal(inPolygon(square, 15, 5), false);
  assert.equal(inPolygon([[0, 0], [1, 1]], 0.5, 0.5), false, 'two points are not a loop');
});

test('the lasso takes a stroke mostly inside it and a box whose middle is inside', () => {
  const inside = stroke([at(2, 2), at(3, 3), at(4, 4)]);
  const outside = stroke([at(80, 80), at(90, 90)]);
  const half = stroke([at(2, 2), at(80, 80), at(90, 90)]);
  const b = box(1, 1, 8, 8);
  const items = [inside, outside, half, b];
  const loop: Vec[] = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const caught = lassoed(items, loop).map((i) => i.id);
  assert.ok(caught.includes(inside.id));
  assert.ok(caught.includes(b.id), 'the box’s middle is within');
  assert.ok(!caught.includes(outside.id));
  assert.ok(!caught.includes(half.id), 'a stroke caught at one end is left where it lies');
  assert.deepEqual(lassoed(items, [[0, 0]]), [], 'a single point catches nothing');
});

test('the distance to a segment is measured to the nearest place on it', () => {
  assert.equal(distanceToSegment(5, 3, 0, 0, 10, 0), 3);
  assert.equal(distanceToSegment(-4, 0, 0, 0, 10, 0), 4, 'past the end it is the distance to the end');
  assert.equal(distanceToSegment(0, 5, 0, 0, 0, 0), 5, 'a segment of no length is a point');
});

test('the eraser takes the strokes it crosses and leaves boxes and frames alone', () => {
  const s = stroke([at(0, 0), at(10, 0)]);
  const b = box(0, 0, 20, 20);
  const items = [s, b];
  assert.deepEqual(erasedAt(items, 5, 1, 2).map((i) => i.id), [s.id]);
  assert.deepEqual(erasedAt(items, 5, 40, 2), [], 'nothing near, nothing rubbed out');
  assert.ok(!erasedAt(items, 10, 10, 2).some((i) => i.kind === 'box'), 'a box is picked up, not rubbed out');
});

test('the nib widens with pressure and the ink is thinned of points it does not need', () => {
  assert.equal(nib(10, 0.5), 10);
  assert.ok(nib(10, 1) > nib(10, 0));
  const dense: Point[] = Array.from({ length: 50 }, (_, i) => at(i * 0.1, 0));
  const thin = simplify(dense, 1);
  assert.ok(thin.length < dense.length);
  assert.deepEqual(thin[0], dense[0]);
  assert.deepEqual(thin[thin.length - 1], dense[dense.length - 1], 'the stroke ends where the pen left off');
  const two: Point[] = [at(0, 0), at(1, 1)];
  assert.equal(simplify(two), two, 'there is nothing to thin out of two points');
});

test('Shift snaps a line to an eighth of the circle and a rectangle to a square', () => {
  const [x, y] = snapped('line', [0, 0], [10, 1]);
  assert.ok(Math.abs(y) < 1e-9, 'a shallow line lies flat');
  assert.ok(Math.abs(x - Math.hypot(10, 1)) < 1e-9, 'and keeps the length it was drawn at');
  const corner = snapped('rect', [0, 0], [10, 4]);
  assert.deepEqual(corner, [10, 10], 'the square takes the longer side');
  assert.deepEqual(snapped('ellipse', [0, 0], [-6, 3]), [-6, 6], 'and follows the way it was dragged');
});

test('a handle is found within its reach, and dragging one moves only its own edges', () => {
  const b = { x: 0, y: 0, w: 100, h: 50 };
  assert.equal(handleUnder(b, 0, 0, 5), 'nw');
  assert.equal(handleUnder(b, 100, 50, 5), 'se');
  assert.equal(handleUnder(b, 50, 25, 5), null, 'the middle is not a handle');
  const pulled = resized(b, 'se', 10, 10);
  assert.deepEqual(pulled, { x: 0, y: 0, w: 110, h: 60 });
  const west = resized(b, 'w', 20, 0);
  assert.deepEqual(west, { x: 20, y: 0, w: 80, h: 50 });
  /* A box is never allowed to turn inside out. */
  const squashed = resized(b, 'e', -500, 0);
  assert.ok(squashed.w >= 8);
});

/* ── the tools ───────────────────────────────────────────────────────────── */

test('every tool answers to one letter, and no two share one', () => {
  const letters = TOOLS.map((t) => TOOL_KEY[t]);
  assert.equal(new Set(letters).size, letters.length);
  assert.equal(toolForKey('p'), 'pen');
  assert.equal(toolForKey('E'), 'eraser', 'a capital is the same key');
  assert.equal(toolForKey('q'), null);
  assert.equal(isInk('pen'), true);
  assert.equal(isInk('lasso'), false);
});

test('a snapshot embed says it is an asset and reads back as one', () => {
  const embed = assetEmbed('abc123' as never);
  assert.equal(embed, 'asset:abc123');
  assert.equal(assetOfEmbed(embed), 'abc123');
  assert.equal(assetOfEmbed('fig:16.1:sim-x'), null, 'a card is not a picture');
});

/* ── the storage boundary ────────────────────────────────────────────────── */

test('a sound record reads back whole', () => {
  const d = addItem(addItem(emptyDrawing('Kinematics', drawingId('bbbbbbbb'), 5), stroke([at(1, 2, 0.8)])), box(3, 4));
  const back = parseDrawing(JSON.parse(JSON.stringify(d)));
  assert.ok(back);
  assert.equal(back.id, d.id);
  assert.equal(back.name, 'Kinematics');
  assert.equal(back.items.length, 2);
});

test('a record of the wrong shape is refused, and one bad item is dropped rather than the page', () => {
  assert.equal(parseDrawing(null), null);
  assert.equal(parseDrawing({ name: 'no id', items: [] }), null);
  assert.equal(parseDrawing({ id: 'x', name: 'no items' }), null);
  const mixed = parseDrawing({
    id: 'cccccccc', name: 'mixed', width: 100, height: 100, created: 1, updated: 2,
    items: [
      { kind: 'stroke', id: 'a', tool: 'pen', color: '#000', size: 2, points: [[0, 0, 0.5]] },
      { kind: 'stroke', id: 'b', tool: 'pen', color: '#000', size: 2, points: [] },   /* no points at all */
      { kind: 'nonsense', id: 'c' },
      { kind: 'frame', id: 'd', x: 0, y: 0, w: 10, h: 10, embed: '' },                 /* a frame holding nothing */
    ],
  });
  assert.ok(mixed);
  assert.deepEqual(mixed.items.map((i) => i.id), ['a'], 'one good stroke survives its bad neighbours');
});

test('a frame keeps what it opens, and only when it has one', () => {
  const back = parseDrawing({
    id: 'dddddddd', name: 'f', width: 10, height: 10, created: 1, updated: 1,
    items: [
      { kind: 'frame', id: 'a', x: 0, y: 0, w: 10, h: 10, embed: 'asset:z', open: 'fig:16.1:sim-x' },
      { kind: 'frame', id: 'b', x: 0, y: 0, w: 10, h: 10, embed: 'def:16.1:work' },
    ],
  });
  assert.ok(back);
  const [shot, card] = back.items;
  assert.equal(shot.kind === 'frame' && shot.open, 'fig:16.1:sim-x');
  assert.equal(card.kind === 'frame' && 'open' in card, false, 'a card has nowhere else to go');
});

test('the rows the explorer reads carry a name and no ink, and a name is matched however it is capitalised', () => {
  const d: Drawing = emptyDrawing('Free body', drawingId('eeeeeeee'), 7);
  const row = rowOf(d);
  assert.deepEqual(row, { id: d.id, name: 'Free body', created: 7, updated: 7 });
  assert.equal('items' in row, false, 'a row is never the ink');
  const rows = parseRows([row, { nonsense: true }, { id: 'ffffffff', name: 'Other' }]);
  assert.equal(rows.length, 2);
  assert.equal(rowByName(rows, '  free BODY ')?.id, d.id);
  assert.equal(rowByName(rows, 'nothing'), undefined);
  assert.deepEqual(parseRows('not a list'), []);
});
