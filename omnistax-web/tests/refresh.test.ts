/* What a reload gives back that is not one of the reader's records: a chat's
   draft, an answer the page went away under, and how a concept map was left. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chip } from '../src/lib/chat/context';
import { parseDrafts, withDraft } from '../src/lib/chat/drafts';
import * as M from '../src/lib/chat/model';
import { parseMapViews, writeMapViews } from '../src/lib/sections/mapview';
import { newChatId } from '../src/lib/types/ids';

test('a draft is its words and its chips, and one with neither is no draft', () => {
  const pin = chip('section', 'b/1.1', '1.1 · Motion', 'the text', true);
  let all = withDraft({}, 'c1', { text: 'why does' });
  all = withDraft(all, 'c1', { chips: [pin] });
  assert.deepEqual(all, { c1: { text: 'why does', chips: [pin] } });
  assert.deepEqual(parseDrafts(JSON.parse(JSON.stringify(all))), all);
  all = withDraft(all, 'c1', { text: '' });
  assert.deepEqual(all, { c1: { text: '', chips: [pin] } });
  assert.deepEqual(withDraft(all, 'c1', { chips: [] }), {});
  assert.deepEqual(parseDrafts({ a: { text: 5 }, b: { text: '', chips: [] }, c: { text: 'x', chips: [{ kind: 'nonsense', key: 'k', label: 'l', text: 't' }, null] } }), { c: { text: 'x', chips: [] } });
});

test('an answer still marked as arriving when the chat is read back is stopped, with what had come', () => {
  const asked = M.ask(M.newChat(newChatId()), 'why?');
  const { chat: waiting, id: answer } = M.answer(asked.chat, asked.id, 'm');
  const grown = M.grow(waiting, answer, 'Because');
  assert.equal(grown.messages[answer].state, 'streaming');
  const back = M.interrupted(grown);
  assert.equal(back.messages[answer].state, 'stopped');
  assert.equal(back.messages[answer].text, 'Because');
  assert.equal(back.updated, grown.updated, 'reading a chat back is not an edit');
  assert.equal(M.interrupted(back), back);
});

test('how the maps were left is read back as it was written, and nonsense is left out', () => {
  const kept = parseMapViews({
    held: { 'm|b|chapter|6': { x: 10, y: -4, k: 0.5 }, bad: { x: 1, y: 2, k: 0 } },
    picked: { 'm|b|chapter|6': { selected: ['a'], focus: ['a', 'b'] }, none: { selected: [], focus: null } },
    kinds: { m: 'disk', n: 'sideways' }, hidden: { m: ['skill'], n: [] },
  });
  assert.deepEqual(writeMapViews(kept), {
    held: { 'm|b|chapter|6': { x: 10, y: -4, k: 0.5 } },
    picked: { 'm|b|chapter|6': { selected: ['a'], focus: ['a', 'b'] } },
    kinds: { m: 'disk' }, hidden: { m: ['skill'] },
  });
  assert.deepEqual(writeMapViews(parseMapViews(null)), { held: {}, picked: {}, kinds: {}, hidden: {} });
});
