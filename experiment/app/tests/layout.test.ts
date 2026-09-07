import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout, openTab, splitRight, closeItem, where, groupsWith, openSide, parseLayout, prune } from '../src/lib/layout/model';
import { sectionId, parseItemKey, itemKey, figItem } from '../src/lib/types/ids';
import { focusedSection } from '../src/lib/layout/model';

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
