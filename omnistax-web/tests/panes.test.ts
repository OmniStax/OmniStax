import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settlePanes, type PaneSlot } from '../src/lib/layout/panes';
import type { Group } from '../src/lib/layout/model';
import type { GroupKey } from '../src/lib/types/ids';

const g = (key: string, ...tabs: string[]): Group => ({ key: key as GroupKey, tabs, active: tabs[0] ?? null });
const ids = (): (() => number) => { let n = 0; return () => (n += 1); };
const show = (ps: readonly PaneSlot[]): string[] => ps.map((p) => `${p.id}:${p.group}|${p.tab}`);

test('a tab that moves to another group keeps its pane, and nothing else is touched', () => {
  const id = ids();
  const a = settlePanes([], [g('A', 'doc', 'chat'), g('B', 'note')], id);
  assert.deepEqual(show(a), ['1:A|doc', '2:A|chat', '3:B|note']);
  const b = settlePanes(a, [g('A', 'doc'), g('B', 'note', 'chat')], id);
  assert.deepEqual(show(b), ['1:A|doc', '2:B|chat', '3:B|note']);
  assert.equal(b[0], a[0]); assert.equal(b[2], a[2]);
  /* the same groups again is the same list */
  assert.equal(settlePanes(b, [g('A', 'doc'), g('B', 'note', 'chat')], id), b);
  assert.equal(settlePanes(b, [g('B', 'chat', 'note'), g('A', 'doc')], id), b);
});

test('a split carries the tab into the new group; a closed tab loses its pane and a new one goes on the end', () => {
  const id = ids();
  const a = settlePanes([], [g('A', 'doc', 'chat')], id);
  const b = settlePanes(a, [g('A', 'doc'), g('C', 'chat')], id);
  assert.deepEqual(show(b), ['1:A|doc', '2:C|chat']);
  const c = settlePanes(b, [g('A', 'view'), g('C', 'chat')], id);
  assert.deepEqual(show(c), ['2:C|chat', '3:A|view']);
});

test('one item in two groups is two panes, and only the one that lost its group moves', () => {
  const id = ids();
  const a = settlePanes([], [g('A', 'doc'), g('B', 'doc')], id);
  assert.deepEqual(show(a), ['1:A|doc', '2:B|doc']);
  const b = settlePanes(a, [g('A', 'doc'), g('C', 'doc')], id);
  assert.deepEqual(show(b), ['1:A|doc', '2:C|doc']);
  /* a group closing into its neighbour, which already shows the item, leaves one */
  assert.deepEqual(show(settlePanes(b, [g('A', 'doc')], id)), ['1:A|doc']);
});
