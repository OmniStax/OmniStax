import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout, openTab, splitRight, splitDown, split, closeItem, closeGroup, where, groupsWith, openSide, parseLayout, prune, focusNext, activateNext, moveToNewGroup, groupIndex, resizeSplit, evenSizes, nodeAt, type Layout, type SplitNode, type SplitPath } from '../src/lib/layout/model';
import { sectionId, parseItemKey, itemKey, figItem } from '../src/lib/types/ids';
import { focusedSection } from '../src/lib/layout/model';
import { groupToward, type Rect } from '../src/lib/layout/spatial';

const s = sectionId('2.1');
const text = 'doc:2.1/text', ex = 'doc:2.1/exercises', map = 'view:concepts';

test('default layout opens text and exercises as tabs', () => {
  const l = defaultLayout(s);
  assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.equal(l.groups[0].active, text);
});
test('split right duplicates the active document and focuses the new group', () => {
  const l = splitRight(defaultLayout(s), 0);
  assert.equal(l.groups.length, 2); assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.deepEqual(l.groups[1].tabs, [text]); assert.equal(l.focus, 1);
  assert.deepEqual(groupsWith(l, text), [0, 1]);
});
test('split right moves a view instead of copying it', () => {
  const a = openTab(defaultLayout(s), map, 0);
  const l = splitRight(a, 0);
  assert.deepEqual(groupsWith(l, map), [1]); assert.equal(where(l, map)?.type, 'group');
});
test('closing one copy leaves the other', () => {
  const l = closeItem(splitRight(defaultLayout(s), 0), text, 0);
  assert.deepEqual(l.groups[0].tabs, [ex]); assert.deepEqual(l.groups[1].tabs, [text]);
});
test('closing the last tab of a second group prunes it', () => {
  const l = closeItem(splitRight(defaultLayout(s), 0), text, 1);
  assert.equal(l.groups.length, 1); assert.equal(l.focus, 0);
});
test('openTab with from moves a tab between groups', () => {
  const two = splitRight(defaultLayout(s), 0);
  const l = openTab(two, ex, 1, { from: two.groups[0].key });
  assert.deepEqual(l.groups[0].tabs, [text]); assert.deepEqual(l.groups[1].tabs, [text, ex]); assert.equal(l.groups[1].active, ex);
});
test('openTab on an already open tab only activates it', () => {
  const l = openTab(defaultLayout(s), text, 0);
  assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.equal(l.groups[0].active, text);
});
test('openTab with before reorders', () => {
  const l = openTab(defaultLayout(s), ex, 0, { before: text });
  assert.deepEqual(l.groups[0].tabs, [ex, text]);
});
test('a view opened in a sidebar leaves every other place', () => {
  const l = openSide(openTab(defaultLayout(s), map, 0), map, 'right');
  assert.equal(where(l, map)?.type, 'side'); assert.deepEqual(groupsWith(l, map), []); assert.equal(l.home[map], 'right');
});
test('parseLayout rejects unknown items and duplicate tabs, assigns keys', () => {
  const known = (k: string) => [text, ex, map].includes(k);
  assert.equal(parseLayout({ sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } }, groups: [{ tabs: ['doc:9.9/text'], active: 'doc:9.9/text' }] }, known), null);
  assert.equal(parseLayout({ sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } }, groups: [{ tabs: [text, text], active: text }] }, known), null);
  const ok = parseLayout({ sides: { left: { width: 250, items: [map] }, right: { width: 300, items: [] } }, groups: [{ tabs: [text], active: text }], focus: 5 }, known);
  assert.ok(ok); assert.equal(ok!.focus, 0); assert.equal(typeof ok!.groups[0].key, 'string');
});
test('prune keeps one empty group', () => {
  const l = prune({ ...defaultLayout(s), groups: [] });
  assert.equal(l.groups.length, 1); assert.deepEqual(l.groups[0].tabs, []);
});

test('figure keys round-trip and belong to their section', () => {
  const k = itemKey(figItem(s, 'demo-plane'));
  assert.equal(k, 'fig:2.1/demo-plane'); assert.deepEqual(parseItemKey(k), figItem(s, 'demo-plane'));
  assert.equal(parseItemKey('fig:2.1/'), null);
  const l = splitRight(defaultLayout(s), 0, k);
  assert.deepEqual(l.groups[1].tabs, [k]); assert.equal(focusedSection(l, sectionId('9.9')), '2.1');
});

/* The shape of a tree, with each group written as its position in the array. */
const shape = (l: Layout): unknown => {
  const of = (n: SplitNode): unknown => (n.type === 'leaf' ? groupIndex(l, n.group) : { [n.dir]: n.children.map(of) });
  return of(l.tree);
};

test('split down arranges the two groups as a column', () => {
  const l = splitDown(defaultLayout(s), 0);
  assert.equal(l.groups.length, 2); assert.deepEqual(shape(l), { column: [0, 1] }); assert.equal(l.focus, 1);
});
test('splitting right inside a column nests a row there', () => {
  const l = splitRight(splitDown(defaultLayout(s), 0), 1);
  assert.equal(l.groups.length, 3); assert.deepEqual(shape(l), { column: [0, { row: [1, 2] }] });
});
test('a third group split right of the second joins the row it is already in', () => {
  const l = splitRight(splitRight(defaultLayout(s), 0), 1);
  assert.deepEqual(shape(l), { row: [0, 1, 2] });
});
test('splitting left and up put the new group before the old one', () => {
  assert.deepEqual(shape(split(defaultLayout(s), 0, 'left')), { row: [0, 1] });
  assert.deepEqual(shape(split(defaultLayout(s), 0, 'up')), { column: [0, 1] });
  assert.equal(split(defaultLayout(s), 0, 'left').focus, 0, 'the new group leads, and it is the focused one');
});
test('closing the middle of three leaves a flat row', () => {
  const three = splitRight(splitRight(defaultLayout(s), 0), 1);
  const l = closeGroup(three, 1);
  assert.equal(l.groups.length, 2); assert.deepEqual(shape(l), { row: [0, 1] });
});
test('a split of one child gives way to that child', () => {
  const nested = splitRight(splitDown(defaultLayout(s), 0), 1);
  const l = closeGroup(nested, 2);
  assert.deepEqual(shape(l), { column: [0, 1] });
  assert.deepEqual(shape(closeGroup(l, 1)), 0);
});
test('the group array follows the depth-first order of the tree', () => {
  const l = split(splitDown(defaultLayout(s), 0), 0, 'right');
  assert.deepEqual(shape(l), { column: [{ row: [0, 1] }, 2] });
  assert.equal(groupIndex(l, l.groups[l.focus].key), l.focus);
});
test('parseLayout without a tree arranges the saved groups in a row', () => {
  const known = (k: string) => [text, ex, map].includes(k);
  const l = parseLayout({ sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } }, groups: [{ key: 'a', tabs: [text], active: text }, { key: 'b', tabs: [ex], active: ex }] }, known);
  assert.ok(l); assert.deepEqual(shape(l!), { row: [0, 1] });
});
test('parseLayout repairs a tree that names a group it has not got', () => {
  const known = (k: string) => [text, ex, map].includes(k);
  const raw = {
    sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } },
    groups: [{ key: 'a', tabs: [text], active: text }, { key: 'b', tabs: [ex], active: ex }],
    tree: { type: 'split', dir: 'column', children: [{ type: 'leaf', group: 'a' }, { type: 'leaf', group: 'gone' }] },
  };
  const l = parseLayout(raw, known);
  assert.ok(l); assert.equal(l!.groups.length, 2);
  assert.deepEqual(shape(l!), { row: [0, 1] }, 'the lone leaf collapses and the forgotten group joins the root row');
});
/* The shares a split hands out, as the layout has them written down. */
const sizesAt = (l: Layout, path: SplitPath): readonly number[] | undefined => { const n = nodeAt(l.tree, path); return n && n.type === 'split' ? n.sizes : undefined; };
const sides = { left: { width: 1, items: [] }, right: { width: 1, items: [] } };
const known = (k: string) => [text, ex, map].includes(k);

test('splitting a group inside a sized row halves that group alone', () => {
  const sized = resizeSplit(splitRight(defaultLayout(s), 0), [], [3, 1]);
  const l = splitRight(sized, 0);
  assert.deepEqual(shape(l), { row: [0, 1, 2] });
  assert.deepEqual(sizesAt(l, []), [1.5, 1.5, 1], 'the target splits in two and its neighbour keeps its share');
});
test('closing a group takes its share away with it', () => {
  const three = resizeSplit(splitRight(splitRight(defaultLayout(s), 0), 1), [], [1, 2, 3]);
  assert.deepEqual(sizesAt(closeGroup(three, 1), []), [1, 3]);
});
test('a row nested in a row is flattened, its shares scaled into the slot it had', () => {
  const raw = {
    sides,
    groups: [{ key: 'a', tabs: [text], active: text }, { key: 'b', tabs: [ex], active: ex }, { key: 'c', tabs: [map], active: map }],
    tree: { type: 'split', dir: 'row', sizes: [1, 3], children: [{ type: 'leaf', group: 'a' }, { type: 'split', dir: 'row', sizes: [1, 3], children: [{ type: 'leaf', group: 'b' }, { type: 'leaf', group: 'c' }] }] },
  };
  const l = parseLayout(raw, known);
  assert.ok(l); assert.deepEqual(shape(l!), { row: [0, 1, 2] });
  assert.deepEqual(sizesAt(l!, []), [1, 0.75, 2.25], 'the inner pair still divides the three parts it was given');
});
test('resizeSplit takes only a full set of positive shares for a split it can find', () => {
  const two = splitRight(defaultLayout(s), 0);
  assert.equal(resizeSplit(two, [], [1]), two, 'too few shares');
  assert.equal(resizeSplit(two, [], [1, 1, 1]), two, 'too many shares');
  assert.equal(resizeSplit(two, [], [1, 0]), two, 'a group of no width');
  assert.equal(resizeSplit(two, [], [2, -1]), two, 'a group of less than none');
  assert.equal(resizeSplit(two, [0], [1, 1]), two, 'a path that names a leaf');
  assert.deepEqual(sizesAt(resizeSplit(two, [], [2, 1]), []), [2, 1]);
});
test('evenSizes forgets every share in the tree', () => {
  const nested = splitRight(splitDown(defaultLayout(s), 0), 1);
  const sized = resizeSplit(resizeSplit(nested, [], [3, 1]), [1], [1, 4]);
  assert.deepEqual(sizesAt(sized, []), [3, 1]); assert.deepEqual(sizesAt(sized, [1]), [1, 4]);
  const l = evenSizes(sized);
  assert.equal(sizesAt(l, []), undefined); assert.equal(sizesAt(l, [1]), undefined);
  assert.deepEqual(shape(l), { column: [0, { row: [1, 2] }] }, 'only the shares go');
});
test('parseLayout keeps sound shares and ignores the rest', () => {
  const saved = (sizes: unknown) => ({
    sides,
    groups: [{ key: 'a', tabs: [text], active: text }, { key: 'b', tabs: [ex], active: ex }],
    tree: { type: 'split', dir: 'row', sizes, children: [{ type: 'leaf', group: 'a' }, { type: 'leaf', group: 'b' }] },
  });
  assert.deepEqual(sizesAt(parseLayout(saved([2, 1]), known)!, []), [2, 1]);
  assert.equal(sizesAt(parseLayout(saved([1, 2, 3]), known)!, []), undefined, 'more shares than children');
  assert.equal(sizesAt(parseLayout(saved(['2', '1']), known)!, []), undefined, 'shares that are not numbers');
  assert.equal(sizesAt(parseLayout(saved([1, 0]), known)!, []), undefined, 'a share of nothing');
  assert.equal(sizesAt(parseLayout(saved('wide'), known)!, []), undefined, 'no array at all');
});

test('focusNext walks the groups and wraps at either end', () => {
  const three = splitRight(splitRight(defaultLayout(s), 0), 1);
  assert.equal(three.focus, 2);
  assert.equal(focusNext(three, 1).focus, 0);
  assert.equal(focusNext(three, -1).focus, 1);
  assert.equal(focusNext(defaultLayout(s), 1).focus, 0, 'one group has nowhere to go');
});
test('activateNext steps through the tabs of a group and wraps', () => {
  const l = defaultLayout(s);
  assert.equal(activateNext(l, 0, 1).groups[0].active, ex);
  assert.equal(activateNext(l, 0, -1).groups[0].active, ex);
  assert.equal(activateNext(activateNext(l, 0, 1), 0, 1).groups[0].active, text);
});
test('moveToNewGroup takes the tab away from the group it came from', () => {
  const l = moveToNewGroup(defaultLayout(s), 0, 'down');
  assert.deepEqual(l.groups[0].tabs, [ex]); assert.deepEqual(l.groups[1].tabs, [text]);
  assert.deepEqual(shape(l), { column: [0, 1] }); assert.deepEqual(groupsWith(l, text), [1]);
});
test('the spatial picker takes the nearest group that way', () => {
  const rect = (left: number, top: number, right: number, bottom: number): Rect => ({ left, top, right, bottom });
  const from = rect(0, 0, 100, 100);
  const others = [{ index: 1, rect: rect(100, 40, 200, 100) }, { index: 2, rect: rect(100, 0, 200, 40) }, { index: 3, rect: rect(0, 100, 100, 200) }, { index: 4, rect: rect(200, 0, 300, 100) }];
  assert.equal(groupToward(from, others, 'right'), 1, 'both touch the right edge, so the wider overlap wins');
  assert.equal(groupToward(from, others, 'down'), 3);
  assert.equal(groupToward(from, others, 'left'), null);
  assert.equal(groupToward(from, others, 'up'), null);
  assert.equal(groupToward(from, [{ index: 4, rect: rect(200, 0, 300, 100) }], 'right'), 4, 'a distant group still counts when nothing is nearer');
  assert.equal(groupToward(from, [{ index: 5, rect: rect(100, 200, 200, 300) }], 'right'), null, 'no shared height, no move');
});
