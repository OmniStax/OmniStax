/* The canvas of round two: colours kept as tokens, connectors that follow
   their elements, and groups that carry what lies inside them. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addGroup, addItem, drawItemId, emptyDrawing, endPoint, groupAround, moveItems, parseDrawing, removeItems,
  scaleItems, setColour, type Drawing, type DrawItem, type LinkItem,
} from '../src/lib/drawer/model';
import { connectableAt, linkPath, linkUnder, membersOf, nearestSide, placedBounds, pointOn } from '../src/lib/drawer/geometry';
import { cssOf, readColour, THEMES } from '../src/lib/drawer/colour';
import { chatId, drawingId } from '../src/lib/types/ids';
import { answer, ask, newChat, patch } from '../src/lib/chat/model';
import { chatItemAt, plainCopy } from '../src/lib/drawer/chatcopy';

const id = drawItemId;
const card = (key: string, x: number, y: number, w = 100, h = 60): DrawItem => ({ kind: 'box', id: id(key), x, y, w, h, body: '' });
const link = (from: LinkItem['from'], to: LinkItem['to'], key = 'L'): LinkItem =>
  ({ kind: 'link', id: id(key), from, to, curve: 'straight', heads: { start: false, end: true }, color: 'ink', size: 2, label: '' });
const drawingOf = (...items: DrawItem[]): Drawing => items.reduce((d, i) => addItem(d, i, 1), emptyDrawing('d', drawingId('aaaaaaaa'), 0));
const linkIn = (d: Drawing): LinkItem => d.items.find((i): i is LinkItem => i.kind === 'link')!;

/* ── colour ──────────────────────────────────────────────────────────────── */

test('a colour is kept as a token, and a hex that was a token in either theme is read back as it', () => {
  assert.equal(readColour('ink'), 'ink');
  assert.equal(readColour('c-force'), 'c-force');
  assert.equal(readColour(THEMES.dark.ink.toUpperCase()), 'ink', 'white ink drawn on dark');
  assert.equal(readColour(THEMES.light.ink), 'ink');
  assert.equal(readColour(THEMES.dark.bad), 'bad');
  assert.equal(readColour('#111111'), 'ink', 'the first build\'s fallback');
  assert.equal(readColour('#A1B2C3'), '#a1b2c3', 'a colour of the reader\'s own stays hex');
  assert.equal(readColour(42), 'ink');
  assert.equal(readColour('red; background:url(x)'), 'ink');
  assert.equal(cssOf('accent'), 'var(--accent)');
  assert.equal(cssOf('#a1b2c3'), '#a1b2c3');
});

test('strokes stored with resolved hex come back as tokens', () => {
  const d = parseDrawing({ id: 'bbbbbbbb', name: 'n', items: [
    { kind: 'stroke', id: 'a', tool: 'pen', color: '#E7E9EE', size: 2, points: [[0, 0, 0.5]] },
    { kind: 'stroke', id: 'b', tool: 'pen', color: '#123456', size: 2, points: [[0, 0, 0.5]] },
  ] });
  assert.deepEqual(d?.items.map((i) => ('color' in i ? i.color : null)), ['ink', '#123456']);
});

test('a swatch picked recolours what is selected and nothing else', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 200, 0));
  const next = setColour(d, [id('a')], 'warm', 2);
  assert.equal(next.items[0].kind === 'box' && next.items[0].color, 'warm');
  assert.equal(next.items[1], d.items[1]);
  assert.equal(setColour(next, [id('a')], 'warm'), next, 'the same colour again is no change');
});

/* ── connectors ──────────────────────────────────────────────────────────── */

test('an arrow stored as a shape migrates to a connector with two free ends', () => {
  const d = parseDrawing({ id: 'cccccccc', name: 'n', items: [
    { kind: 'shape', id: 'a', shape: 'arrow', color: '#1b1f27', size: 3, fill: false, from: [1, 2], to: [30, 40] },
  ] });
  const l = d?.items[0];
  assert.equal(l?.kind, 'link');
  if (l?.kind !== 'link') return;
  assert.deepEqual([l.from, l.to], [{ x: 1, y: 2 }, { x: 30, y: 40 }]);
  assert.deepEqual(l.heads, { start: false, end: true });
  assert.equal(l.color, 'ink');
});

test('a connector fixed to a side follows its element when it moves or is resized', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 300, 0), link({ item: id('a'), side: 'e' }, { item: id('b'), side: 'w' }));
  assert.deepEqual(linkPath(d.items, linkIn(d))?.a, [100, 30]);
  const moved = moveItems(d, [id('a')], 10, 50);
  assert.deepEqual(linkPath(moved.items, linkIn(moved))?.a, [110, 80]);
  assert.equal(linkIn(moved), linkIn(d), 'the connector itself is untouched: it names a side, not a point');
  const grown = scaleItems(d, [id('b')], { x: 300, y: 0, w: 100, h: 60 }, { x: 300, y: 0, w: 200, h: 120 });
  assert.deepEqual(linkPath(grown.items, linkIn(grown))?.b, [300, 60]);
});

test('deleting an element leaves the connector\'s end where it stood, free', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 300, 0), link({ item: id('a'), side: 'e' }, { item: id('b'), side: 'n' }));
  const gone = removeItems(d, [id('b')]);
  const l = linkIn(gone);
  assert.deepEqual(l.to, { x: 350, y: 0 });
  assert.deepEqual(l.from, { item: id('a'), side: 'e' });
  assert.equal(removeItems(gone, [l.id]).items.length, 1);
});

test('moving a selection moves a connector\'s free ends and leaves its fixed ones to their element', () => {
  const d = drawingOf(card('a', 0, 0), link({ item: id('a'), side: 's' }, { x: 50, y: 200 }));
  const moved = moveItems(d, [id('L')], 5, 5);
  assert.deepEqual(linkIn(moved).to, { x: 55, y: 205 });
  assert.deepEqual(linkIn(moved).from, { item: id('a'), side: 's' });
});

test('a bezier leaves each attached side at right angles to it', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 300, 200), { ...link({ item: id('a'), side: 's' }, { item: id('b'), side: 'w' }), curve: 'bezier' });
  const p = linkPath(d.items, linkIn(d));
  assert.ok(p);
  assert.equal(p.c1[0], p.a[0], 'leaves the south side straight down');
  assert.ok(p.c1[1] > p.a[1]);
  assert.equal(p.c2[1], p.b[1], 'arrives at the west side level');
  assert.ok(p.c2[0] < p.b[0]);
  const mid = pointOn(p, 0.5);
  assert.ok(linkUnder(d.items, mid[0], mid[1], 2)?.id === id('L'), 'the curve itself is what is hit');
  assert.equal(linkUnder(d.items, 250, 0, 2), null);
});

test('a connector\'s box is asked of the drawing, so it moves with its element', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 300, 0), link({ item: id('a'), side: 'e' }, { item: id('b'), side: 'w' }));
  const before = placedBounds(d.items, linkIn(d));
  const moved = moveItems(d, [id('b')], 200, 0);
  assert.ok(placedBounds(moved.items, linkIn(moved)).w > before.w + 150);
});

test('a connector let go over an element fixes to its nearest side; groups lie beneath', () => {
  const box = { x: 0, y: 0, w: 100, h: 60 };
  assert.equal(nearestSide(box, 95, 30), 'e');
  assert.equal(nearestSide(box, 50, 58), 's');
  const d = addGroup(drawingOf(card('a', 50, 50)), { kind: 'group', id: id('g'), x: 0, y: 0, w: 400, h: 400, label: 'G' });
  assert.equal(connectableAt(d.items, 60, 60)?.id, id('a'));
  assert.equal(connectableAt(d.items, 300, 300)?.id, id('g'));
  assert.equal(connectableAt(d.items, 60, 60, 0, 'a')?.id, id('g'), 'a connector does not fix to where it began');
  assert.equal(connectableAt(d.items, 900, 900), null);
  const ink: DrawItem = { kind: 'stroke', id: id('s'), tool: 'pen', color: 'ink', size: 2, points: [[1000, 1000, 0.5], [1010, 1010, 0.5]] };
  assert.equal(connectableAt(addItem(d, ink).items, 1005, 1005), null, 'ink is not connectable');
  assert.deepEqual(endPoint(d.items, { item: id('gone'), side: 'n' }), null);
});

/* ── groups ──────────────────────────────────────────────────────────────── */

test('a group made round a selection lies beneath it and carries what lies inside', () => {
  const d = drawingOf(card('a', 0, 0), card('b', 500, 500));
  const grouped = groupAround(d, { x: 0, y: 0, w: 100, h: 60 }, id('g'));
  assert.equal(grouped.items[0].kind, 'group', 'beneath everything else');
  const g = grouped.items[0];
  if (g.kind !== 'group') return;
  assert.deepEqual(membersOf(grouped.items, g).map((i) => i.id), [id('a')]);
});

test('link, group and chat items survive the storage boundary', () => {
  const d = drawingOf(card('a', 0, 0), link({ item: id('a'), side: 'e' }, { x: 9, y: 9 }),
    { kind: 'group', id: id('g'), x: 0, y: 0, w: 10, h: 10, label: 'G', color: 'ok' },
    { kind: 'chat', id: id('c'), x: 0, y: 0, w: 400, h: 300, chat: 'abcdefgh', root: 'm1' });
  const back = parseDrawing(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(back?.items, d.items);
  const bad = parseDrawing({ id: 'dddddddd', name: 'n', items: [{ kind: 'link', id: 'x', from: { item: 'a', side: 'up' }, to: { x: 0, y: 0 } }] });
  assert.equal(bad?.items.length, 0, 'an end that names no side is not read');
});

/* ── chats ───────────────────────────────────────────────────────────────── */

test('a chat copied plain is a card per message joined parent to child, laid out as a tree', () => {
  const q = ask(newChat(chatId('abcdefgh'), 1), 'Why is the sky blue?');
  const a = answer(q.chat, q.id, 'm');
  const a2 = answer(patch(a.chat, a.id, { text: 'Scattering.' }), q.id, 'm');
  const chat = patch(a2.chat, a2.id, { text: 'Rayleigh.' });
  const items = plainCopy(chat, [100, 50]);
  const cards = items.filter((i) => i.kind === 'box');
  const links = items.filter((i): i is LinkItem => i.kind === 'link');
  assert.equal(cards.length, 3, 'the empty anchor is not written');
  assert.equal(links.length, 2);
  const top = cards.find((c) => c.kind === 'box' && c.body === 'Why is the sky blue?');
  assert.ok(top && top.kind === 'box');
  assert.equal(top.y, 50, 'the tree hangs from where it was put');
  assert.equal(top.color, 'accent', "the reader's own words are tinted");
  assert.ok(links.every((l) => 'item' in l.from && l.from.item === top.id && 'side' in l.to && l.to.side === 'n'));
  const kids = cards.filter((c) => c !== top);
  assert.ok(kids.every((k) => k.kind === 'box' && k.y > top.y + top.h), 'answers sit under the question');
  assert.notEqual(kids[0].kind === 'box' && kids[0].x, kids[1].kind === 'box' && kids[1].x, 'siblings side by side');
});

test('a referenced chat is one item naming the chat, and its root only when it is not the anchor', () => {
  const chat = newChat(chatId('abcdefgh'), 1);
  const whole = chatItemAt(chat, [0, 0], chat.root);
  assert.equal(whole.kind === 'chat' && 'root' in whole, false);
  const part = chatItemAt(chat, [0, 0], 'm1' as never);
  assert.equal(part.kind === 'chat' && part.root, 'm1');
});
