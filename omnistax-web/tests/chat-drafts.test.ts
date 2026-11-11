import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitDrafts, parseDrafts } from '../src/lib/chat/drafts.svelte';
import { chip } from '../src/lib/chat/context';

test('drafts are read back by chat, and what is not a draft is left out', () => {
  const c = chip('section', 'calculus/2.1', '2.1', 'the text');
  const got = parseDrafts({ aaaaaaaa: { text: 'hello', chips: [c, { kind: 'nope' }] }, bbbbbbbb: { text: '', chips: [] }, 'not an id': { text: 'x' }, cccccccc: 7 });
  assert.deepEqual(got, { aaaaaaaa: { text: 'hello', chips: [c] } });
  assert.deepEqual(parseDrafts(null), {}); assert.deepEqual(parseDrafts([1]), {});
});

test('a record too long to keep loses its longest chips first and never its words', () => {
  const long = chip('section', 'calculus/2.1', '2.1', 'x'.repeat(5000)), short = chip('note', 'note:a1b2c3d4', 'n', 'short');
  const all = { aaaaaaaa: { text: 'my words', chips: [long, short] } };
  assert.deepEqual(JSON.parse(fitDrafts(all)), all);
  assert.deepEqual(JSON.parse(fitDrafts(all, 1000)), { aaaaaaaa: { text: 'my words', chips: [short] } });
  assert.deepEqual(JSON.parse(fitDrafts(all, 10)), { aaaaaaaa: { text: 'my words', chips: [] } });
});
