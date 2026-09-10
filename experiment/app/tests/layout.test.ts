import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout as make, openTab, splitRight, splitDown, split, openInSplit, closeItem, closeGroup, closeOtherGroups, activate, where, groupsWith, openSide, ensureOwn, parseLayout, prune, focusNext, activateNext, moveToNewGroup, groupIndex, resizeSplit, evenSizes, nodeAt, instancesOf, VIEW_KEYS, SIDEBAR_VIEW_KEYS, GROUP_VIEW_KEYS, type Layout, type SplitNode, type SplitPath } from '../src/lib/layout/model';
import { sectionId, noteId, parseItemKey, itemKey, docItem, figItem, exItem, pageItem, noteItem, viewItem, newViewItem, viewKindOf, PALETTE_ONLY_KINDS } from '../src/lib/types/ids';
import { focusedSection } from '../src/lib/layout/model';
import { groupToward, type Rect } from '../src/lib/layout/spatial';

const s = sectionId('2.1');
const own = docItem(s, 'text');
const text = 'doc:2.1/text', ex = 'doc:2.1/exercises', map = 'view:concepts', notes = 'view:annotations';
/* The layout functions all take the item a page is; every test below reads the section page. */
const defaultLayout = (id = own) => make(id);

test('default layout opens text and exercises as tabs, and the explorer in the sidebar', () => {
  const l = defaultLayout();
  assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.equal(l.groups[0].active, text);
  assert.deepEqual(l.sides.left.items, ['view:explorer']); assert.deepEqual(l.sides.right.items, []);
});
test('a page of its own opens alone', () => {
  const l = defaultLayout(pageItem('about'));
  assert.deepEqual(l.groups[0].tabs, ['page:about']); assert.equal(l.groups[0].active, 'page:about');
});
test('split right duplicates the active document and focuses the new group', () => {
  const l = splitRight(defaultLayout(), 0);
  assert.equal(l.groups.length, 2); assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.deepEqual(l.groups[1].tabs, [text]); assert.equal(l.focus, 1);
  assert.deepEqual(groupsWith(l, text), [0, 1]);
});
test('split right moves a view instead of copying it', () => {
  const a = openTab(defaultLayout(), map, 0);
  const l = splitRight(a, 0);
  assert.deepEqual(groupsWith(l, map), [1]); assert.equal(where(l, map)?.type, 'group');
});
test('closing one copy leaves the other', () => {
  const l = closeItem(splitRight(defaultLayout(), 0), text, 0);
  assert.deepEqual(l.groups[0].tabs, [ex]); assert.deepEqual(l.groups[1].tabs, [text]);
});
test('closing the last tab of a second group prunes it', () => {
  const l = closeItem(splitRight(defaultLayout(), 0), text, 1);
  assert.equal(l.groups.length, 1); assert.equal(l.focus, 0);
});
test('openTab with from moves a tab between groups', () => {
  const two = splitRight(defaultLayout(), 0);
  const l = openTab(two, ex, 1, { from: two.groups[0].key });
  assert.deepEqual(l.groups[0].tabs, [text]); assert.deepEqual(l.groups[1].tabs, [text, ex]); assert.equal(l.groups[1].active, ex);
});
test('openTab on an already open tab only activates it', () => {
  const l = openTab(defaultLayout(), text, 0);
  assert.deepEqual(l.groups[0].tabs, [text, ex]); assert.equal(l.groups[0].active, text);
});
test('openTab with before reorders', () => {
  const l = openTab(defaultLayout(), ex, 0, { before: text });
  assert.deepEqual(l.groups[0].tabs, [ex, text]);
});
test('a view opened in a sidebar leaves every other place', () => {
  const l = openSide(openTab(defaultLayout(), notes, 0), notes, 'left');
  assert.equal(where(l, notes)?.type, 'side'); assert.deepEqual(groupsWith(l, notes), []); assert.equal(l.home[notes], 'left');
});
test('a view that no sidebar holds is asked for there and opens as a tab', () => {
  const l = openSide(defaultLayout(), map, 'left');
  assert.deepEqual(l.sides.left.items, ['view:explorer'], 'the concept map is not a sidebar view');
  assert.equal(where(l, map)?.type, 'group'); assert.equal(l.groups[0].active, map);
});
test('the rail draws the two sidebar views first and the three group views below', () => {
  assert.deepEqual(SIDEBAR_VIEW_KEYS, ['view:explorer', 'view:annotations']);
  assert.deepEqual(GROUP_VIEW_KEYS, ['view:concepts', 'view:formulas', 'view:definitions']);
  /* The colour menu is asked for in the command palette, so the rail draws no button for it. */
  assert.deepEqual(PALETTE_ONLY_KINDS.map((k) => itemKey(viewItem(k))), ['view:colours']);
  assert.equal(GROUP_VIEW_KEYS.includes('view:colours'), false);
  assert.equal(VIEW_KEYS.length, SIDEBAR_VIEW_KEYS.length + GROUP_VIEW_KEYS.length + PALETTE_ONLY_KINDS.length);
});
test('openInSplit opens the view beside what is being read, and finds it where it already is', () => {
  const l = openInSplit(defaultLayout(), map);
  assert.equal(l.groups.length, 2); assert.deepEqual(l.groups[1].tabs, [map]); assert.equal(l.focus, 1);
  const again = openInSplit(activate(l, 0, text), map);
  assert.equal(again.groups.length, 2, 'a second ask makes no third group'); assert.equal(again.focus, 1); assert.equal(again.groups[1].active, map);
});
test('openInSplit takes a view out of the sidebar and gives it a group', () => {
  const side = openSide(defaultLayout(), notes, 'left');
  const l = openInSplit(side, notes);
  assert.equal(where(l, notes)?.type, 'group'); assert.deepEqual(l.sides.left.items, ['view:explorer']);
});
test('ensureOwn opens the page\'s own item wherever the layout left it', () => {
  const bare = ensureOwn(defaultLayout(pageItem('about')), pageItem('book'));
  assert.deepEqual(bare.groups[0].tabs, ['page:book', 'page:about']); assert.equal(bare.groups[0].active, 'page:book');
  const already = ensureOwn(defaultLayout(), own);
  assert.deepEqual(already.groups[0].tabs, [text, ex], 'the item is where it was, and is made active');
  assert.equal(already.groups[0].active, text);
});
test('a view key names a kind, and one page of that kind when it carries an instance', () => {
  const page = newViewItem('concepts');
  const k = itemKey(page);
  assert.match(k, /^view:concepts@[a-z0-9]{6}$/);
  assert.deepEqual(parseItemKey(k), page, 'a page reads back as itself');
  assert.deepEqual(parseItemKey(map), viewItem('concepts'), 'and the bare key as the singleton');
  assert.notEqual(itemKey(newViewItem('concepts')), k, 'every page opened is another one');
  assert.equal(viewKindOf(k), 'concepts'); assert.equal(viewKindOf(map), 'concepts');
  assert.equal(viewKindOf(text), null); assert.equal(viewKindOf('view:nothing@ab12cd'), null);
  assert.equal(parseItemKey('view:concepts@AB12CD'), null, 'an instance is six lowercase letters and digits');
  assert.equal(parseItemKey('view:concepts@ab12c'), null);
});
test('the rail opens another page of a view and leaves the ones already open', () => {
  const one = split(defaultLayout(), 0, 'right', newViewItem('concepts'));
  const two = split(one, one.focus, 'right', newViewItem('concepts'));
  const open = instancesOf(two, 'concepts');
  assert.equal(two.groups.length, 3, 'each page took a group of its own');
  assert.equal(open.length, 2); assert.deepEqual(open, [two.groups[1].active, two.groups[2].active]);
  assert.deepEqual(instancesOf(two, 'formulas'), [], 'a view nobody opened stands nowhere');
  const gone = closeItem(two, open[1]);
  assert.deepEqual(instancesOf(gone, 'concepts'), [open[0]], 'closing one page leaves the other');
  assert.deepEqual(instancesOf(openSide(defaultLayout(), notes, 'left'), 'annotations'), [notes], 'a sidebar view counts as the page it is');
});
test('page and note keys round-trip and belong to no section', () => {
  assert.equal(itemKey(pageItem('about')), 'page:about'); assert.equal(itemKey(pageItem('book')), 'page:book');
  assert.deepEqual(parseItemKey('page:about'), pageItem('about'));
  assert.equal(parseItemKey('page:elsewhere'), null);
  const n = noteId('a1b2c3d4');
  assert.equal(itemKey(noteItem(n)), 'note:a1b2c3d4'); assert.deepEqual(parseItemKey('note:a1b2c3d4'), noteItem(n));
  assert.equal(parseItemKey('note:TOOLOUD'), null); assert.equal(parseItemKey('note:abc'), null);
  const l = splitRight(defaultLayout(), 0, 'note:a1b2c3d4');
  assert.deepEqual(l.groups[1].tabs, ['note:a1b2c3d4']);
  assert.equal(focusedSection(l, sectionId('9.9')), '9.9', 'a note leaves the views where they stood');
});
test('parseLayout rejects unknown items and duplicate tabs, assigns keys', () => {
  const known = (k: string) => [text, ex, map].includes(k);
  assert.equal(parseLayout({ sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } }, groups: [{ tabs: ['doc:9.9/text'], active: 'doc:9.9/text' }] }, known), null);
  assert.equal(parseLayout({ sides: { left: { width: 1, items: [] }, right: { width: 1, items: [] } }, groups: [{ tabs: [text, text], active: text }] }, known), null);
  const ok = parseLayout({ sides: { left: { width: 250, items: [map] }, right: { width: 300, items: [] } }, groups: [{ tabs: [text], active: text }], focus: 5 }, known);
  assert.ok(ok); assert.equal(ok!.focus, 0); assert.equal(typeof ok!.groups[0].key, 'string');
});
test('prune keeps one empty group', () => {
  const l = prune({ ...defaultLayout(), groups: [] });
  assert.equal(l.groups.length, 1); assert.deepEqual(l.groups[0].tabs, []);
});
test('an empty group keeps its place until it is closed', () => {
  const l = prune(closeItem(defaultLayout(), ex, 0));
  assert.equal(l.groups.length, 1); assert.deepEqual(l.groups[0].tabs, [text], 'a group with tabs is untouched');
  const empty = closeItem(closeItem(defaultLayout(), ex, 0), text, 0);
  assert.equal(empty.groups.length, 1); assert.deepEqual(empty.groups[0].tabs, [], 'the last group stays, empty');
});

test('figure keys round-trip and belong to their section', () => {
  const k = itemKey(figItem(s, 'demo-plane'));
  assert.equal(k, 'fig:2.1/demo-plane'); assert.deepEqual(parseItemKey(k), figItem(s, 'demo-plane'));
  assert.equal(parseItemKey('fig:2.1/'), null);
  const l = splitRight(defaultLayout(), 0, k);
  assert.deepEqual(l.groups[1].tabs, [k]); assert.equal(focusedSection(l, sectionId('9.9')), '2.1');
});

test('exercise keys round-trip and belong to their section', () => {
  const k = itemKey(exItem(s, 'cq1'));
  assert.equal(k, 'ex:2.1/cq1'); assert.deepEqual(parseItemKey(k), exItem(s, 'cq1'));
  assert.equal(parseItemKey('ex:2.1/'), null); assert.equal(parseItemKey('ex:2.1/a/b'), null);
  const l = splitRight(defaultLayout(), 0, k);
  assert.deepEqual(l.groups[1].tabs, [k]); assert.equal(focusedSection(l, sectionId('9.9')), '2.1');
});

/* The shape of a tree, with each group written as its position in the array. */
const shape = (l: Layout): unknown => {
  const of = (n: SplitNode): unknown => (n.type === 'leaf' ? groupIndex(l, n.group) : { [n.dir]: n.children.map(of) });
  return of(l.tree);
};

test('split down arranges the two groups as a column', () => {
  const l = splitDown(defaultLayout(), 0);
  assert.equal(l.groups.length, 2); assert.deepEqual(shape(l), { column: [0, 1] }); assert.equal(l.focus, 1);
});
test('splitting right inside a column nests a row there', () => {
  const l = splitRight(splitDown(defaultLayout(), 0), 1);
  assert.equal(l.groups.length, 3); assert.deepEqual(shape(l), { column: [0, { row: [1, 2] }] });
});
test('a third group split right of the second joins the row it is already in', () => {
  const l = splitRight(splitRight(defaultLayout(), 0), 1);
  assert.deepEqual(shape(l), { row: [0, 1, 2] });
});
test('splitting left and up put the new group before the old one', () => {
  assert.deepEqual(shape(split(defaultLayout(), 0, 'left')), { row: [0, 1] });
  assert.deepEqual(shape(split(defaultLayout(), 0, 'up')), { column: [0, 1] });
  assert.equal(split(defaultLayout(), 0, 'left').focus, 0, 'the new group leads, and it is the focused one');
});
test('closing the middle of three leaves a flat row', () => {
  const three = splitRight(splitRight(defaultLayout(), 0), 1);
  const l = closeGroup(three, 1);
  assert.equal(l.groups.length, 2); assert.deepEqual(shape(l), { row: [0, 1] });
});
test('a split of one child gives way to that child', () => {
  const nested = splitRight(splitDown(defaultLayout(), 0), 1);
  const l = closeGroup(nested, 2);
  assert.deepEqual(shape(l), { column: [0, 1] });
  assert.deepEqual(shape(closeGroup(l, 1)), 0);
});
test('the group array follows the depth-first order of the tree', () => {
  const l = split(splitDown(defaultLayout(), 0), 0, 'right');
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
  const sized = resizeSplit(splitRight(defaultLayout(), 0), [], [3, 1]);
  const l = splitRight(sized, 0);
  assert.deepEqual(shape(l), { row: [0, 1, 2] });
  assert.deepEqual(sizesAt(l, []), [1.5, 1.5, 1], 'the target splits in two and its neighbour keeps its share');
});
test('a group that goes hands its share to the sibling before it, or to the one after when it stood first', () => {
  const three = resizeSplit(splitRight(splitRight(defaultLayout(), 0), 1), [], [1, 2, 4]);
  assert.deepEqual(sizesAt(closeGroup(three, 1), []), [3, 4], 'the middle group gives its share to the one before it');
  assert.deepEqual(sizesAt(closeGroup(three, 2), []), [1, 6], 'so does the last');
  assert.deepEqual(sizesAt(closeGroup(three, 0), []), [3, 4], 'the first has nothing before it, so the one after takes it');
});
test('opening a view beside a group and closing it again leaves the shares as they were', () => {
  const two = splitRight(defaultLayout(), 0);
  const cycle = (l: Layout): Layout => closeItem(split(l, 0, 'right', map), map);
  assert.equal(sizesAt(two, []), undefined, 'two groups start out sharing the row evenly');
  assert.deepEqual(sizesAt(split(two, 0, 'right', map), []), [0.5, 0.5, 1], 'the view takes half of the group it opened beside');
  assert.equal(sizesAt(cycle(two), []), undefined, 'and gives it back when it closes');
  const six = Array.from({ length: 6 }).reduce<Layout>((l) => cycle(l), two);
  assert.equal(six.groups.length, 2); assert.equal(sizesAt(six, []), undefined, 'six openings and closings drift nowhere');
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
  const two = splitRight(defaultLayout(), 0);
  assert.equal(resizeSplit(two, [], [1]), two, 'too few shares');
  assert.equal(resizeSplit(two, [], [1, 1, 1]), two, 'too many shares');
  assert.equal(resizeSplit(two, [], [1, 0]), two, 'a group of no width');
  assert.equal(resizeSplit(two, [], [2, -1]), two, 'a group of less than none');
  assert.equal(resizeSplit(two, [0], [1, 1]), two, 'a path that names a leaf');
  assert.deepEqual(sizesAt(resizeSplit(two, [], [2, 1]), []), [2, 1]);
});
test('evenSizes forgets every share in the tree', () => {
  const nested = splitRight(splitDown(defaultLayout(), 0), 1);
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
  const three = splitRight(splitRight(defaultLayout(), 0), 1);
  assert.equal(three.focus, 2);
  assert.equal(focusNext(three, 1).focus, 0);
  assert.equal(focusNext(three, -1).focus, 1);
  assert.equal(focusNext(defaultLayout(), 1).focus, 0, 'one group has nowhere to go');
});
test('activateNext steps through the tabs of a group and wraps', () => {
  const l = defaultLayout();
  assert.equal(activateNext(l, 0, 1).groups[0].active, ex);
  assert.equal(activateNext(l, 0, -1).groups[0].active, ex);
  assert.equal(activateNext(activateNext(l, 0, 1), 0, 1).groups[0].active, text);
});
test('moveToNewGroup takes the tab away from the group it came from', () => {
  const l = moveToNewGroup(defaultLayout(), 0, 'down');
  assert.deepEqual(l.groups[0].tabs, [ex]); assert.deepEqual(l.groups[1].tabs, [text]);
  assert.deepEqual(shape(l), { column: [0, 1] }); assert.deepEqual(groupsWith(l, text), [1]);
});
test('splitting a group with nothing open gives it an empty neighbour', () => {
  const one = closeGroup(defaultLayout(), 0);
  assert.deepEqual(one.groups[0].tabs, []);
  const l = splitRight(one, 0);
  assert.equal(l.groups.length, 2); assert.deepEqual(l.groups[1].tabs, []); assert.equal(l.groups[1].active, null);
  assert.deepEqual(shape(l), { row: [0, 1] }); assert.equal(l.focus, 1, 'the new group takes the focus');
  assert.deepEqual(shape(splitDown(one, 0)), { column: [0, 1] });
  assert.equal(sizesAt(l, []), undefined, 'the two halves share the slot evenly');
});
test('moveToNewGroup on an empty group splits it in two', () => {
  const l = moveToNewGroup(closeGroup(defaultLayout(), 0), 0, 'down');
  assert.equal(l.groups.length, 2); assert.deepEqual(l.groups[0].tabs, []); assert.deepEqual(l.groups[1].tabs, []);
  assert.deepEqual(shape(l), { column: [0, 1] });
});
test('an empty group sits out the work done in the others', () => {
  const two = splitRight(closeGroup(defaultLayout(), 0), 0);       /* two empty groups */
  const opened = openTab(two, text, 1);
  assert.equal(opened.groups.length, 2); assert.deepEqual(opened.groups[0].tabs, []);
  const more = openTab(opened, ex, 1);
  assert.equal(activate(more, 1, text).groups.length, 2);
  assert.equal(resizeSplit(more, [], [1, 3]).groups.length, 2);
  assert.deepEqual(sizesAt(resizeSplit(more, [], [1, 3]), []), [1, 3]);
});
test('a group that is emptied by an operation goes, one that was empty stays', () => {
  const two = splitRight(defaultLayout(), 0);
  assert.equal(closeItem(two, text, 1).groups.length, 1, 'closing the last tab drops the group');
  const moved = openTab(two, text, 0, { from: two.groups[1].key });
  assert.equal(moved.groups.length, 1, 'moving the only tab out drops the source');
  assert.deepEqual(moved.groups[0].tabs, [text, ex]);
});
test('closeGroup takes an empty group away, closeOtherGroups keeps one with its tabs', () => {
  const two = splitRight(closeGroup(defaultLayout(), 0), 0);
  const l = closeGroup(two, 1);
  assert.equal(l.groups.length, 1); assert.equal(l.groups[0].key, two.groups[0].key); assert.deepEqual(shape(l), 0);
  const three = splitRight(splitRight(defaultLayout(), 0), 1);
  const alone = closeOtherGroups(three, 0);
  assert.equal(alone.groups.length, 1); assert.equal(alone.groups[0].key, three.groups[0].key);
  assert.deepEqual(alone.groups[0].tabs, [text, ex]); assert.equal(alone.focus, 0);
});
test('parseLayout keeps in a sidebar only what a sidebar holds', () => {
  const raw = { sides: { left: { width: 250, items: ['view:explorer', map, 'view:gone', text] }, right: { width: 300, items: [notes] } }, groups: [{ key: 'a', tabs: [text], active: text }] };
  const l = parseLayout(raw, (k) => [text, ex, map, notes, 'view:explorer'].includes(k));
  assert.ok(l);
  assert.deepEqual(l!.sides.left.items, ['view:explorer'], 'a tab-only view, an unknown one and a document all go');
  assert.deepEqual(l!.sides.right.items, [notes]);
});
test('parseLayout keeps every empty group it is given', () => {
  const raw = { sides, groups: [{ key: 'a', tabs: [], active: null }, { key: 'b', tabs: [text], active: text }, { key: 'c', tabs: [] }], focus: 2 };
  const l = parseLayout(raw, known);
  assert.ok(l); assert.equal(l!.groups.length, 3); assert.deepEqual(shape(l!), { row: [0, 1, 2] });
  assert.deepEqual(l!.groups.map((g) => g.tabs), [[], [text], []]); assert.equal(l!.focus, 2);
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
