import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossedSlop, caretAt, DRAG_SLOP } from '../src/lib/notes/md/rightdrag';

/* When a press becomes a drag: far enough in any direction, and the default
   slop is what a right-button sweep is measured against. */
test('crossedSlop turns on at the threshold and not before', () => {
  assert.equal(crossedSlop(0, 0), false);
  assert.equal(crossedSlop(DRAG_SLOP - 1, 0), false);
  assert.equal(crossedSlop(DRAG_SLOP, 0), true);
  assert.equal(crossedSlop(0, -DRAG_SLOP), true);
  assert.equal(crossedSlop(3, 3), true, 'diagonals count their distance, not one axis');
  assert.equal(crossedSlop(5, 0, 10), false, 'a longer slop, for a finger that must rest');
  assert.equal(crossedSlop(10, 0, 10), true);
});

/* Both engine spellings of "what is under this pixel" are read, and a document
   with neither answers nothing rather than throwing. */
test('caretAt reads either engine, and neither', () => {
  const node = { nodeName: '#text' } as unknown as Node;
  const chromium = { caretPositionFromPoint: () => ({ offsetNode: node, offset: 3 }) } as unknown as Document;
  assert.deepEqual(caretAt(1, 2, chromium), { node, offset: 3 });
  const webkit = { caretRangeFromPoint: () => ({ startContainer: node, startOffset: 7 }) } as unknown as Document;
  assert.deepEqual(caretAt(1, 2, webkit), { node, offset: 7 });
  assert.equal(caretAt(1, 2, {} as Document), null);
  const empty = { caretPositionFromPoint: () => null } as unknown as Document;
  assert.equal(caretAt(1, 2, empty), null);
});
