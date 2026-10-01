import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnder, childrenOf, newChat, transcript } from '../src/lib/chat/model';
import { ageOf, lastAsked, markdownOf, NODE, nodeSize, opening, openSize, replyParent, startsDay, withLeaf } from '../src/lib/chat/tree';
import { chatId } from '../src/lib/types/ids';

const T = Date.UTC(2026, 8, 29, 12);
const twoTurns = () => {
  const a = addUnder(newChat(chatId('abcdefgh'), T), newChat(chatId('abcdefgh'), T).root, { role: 'user', text: 'q', at: T });
  const b = addUnder(a.chat, a.id, { role: 'assistant', text: 'a', at: T + 1 });
  const c = addUnder(b.chat, b.id, { role: 'user', text: 'q2', at: T + 2 });
  return { chat: c.chat, q: a.id, a: b.id, q2: c.id };
};

test('withLeaf stands on the message itself, not the newest branch under it', () => {
  const { chat, a } = twoTurns();
  assert.equal(withLeaf(chat, a).leaf, a);
  assert.deepEqual(transcript(withLeaf(chat, a)).map((m) => m.text), ['q', 'a']);
});

test('a reply under an answer goes under it; under a question it forks beside it', () => {
  const { chat, a, q2 } = twoTurns();
  assert.equal(replyParent(chat, a), a);
  assert.equal(replyParent(chat, q2), a);
  const forked = addUnder(withLeaf(chat, replyParent(chat, q2)), replyParent(chat, q2), { role: 'user', text: 'other' });
  assert.equal(childrenOf(forked.chat, a).length, 2);
});

test('the opening cuts at a word and nodes grow with it up to a cap', () => {
  assert.equal(opening('short', 10), 'short');
  assert.equal(opening('one two three four', 15), 'one two three…');
  const { chat, q } = twoTurns();
  const small = nodeSize(chat.messages[q], NODE);
  const big = nodeSize({ ...chat.messages[q], text: 'word '.repeat(400) }, NODE);
  assert.ok(big.h > small.h);
  assert.equal(big.h, NODE.chrome + NODE.lines * NODE.line);
});

test('ages read in the largest whole unit', () => {
  assert.equal(ageOf(T - 20_000, T), 'just now');
  assert.equal(ageOf(T - 5 * 60_000, T), '5 min ago');
  assert.equal(ageOf(T - 3 * 3_600_000, T), '3 h ago');
  assert.equal(ageOf(T - 2 * 86_400_000, T), '2 d ago');
});

test('a day divider stands above the first message and where the day changes', () => {
  const m = (at: number) => ({ ...twoTurns().chat.messages[twoTurns().q], at });
  const path = [m(T), m(T + 60_000), m(T + 2 * 86_400_000)];
  assert.deepEqual(path.map((_, i) => startsDay(path, i)), [true, false, true]);
});

test('an expanded node is wide and takes its measured height once it has one', () => {
  const { chat, q } = twoTurns();
  const long = { ...chat.messages[q], text: 'word '.repeat(400) };
  assert.equal(openSize(long, NODE).w, NODE.wide);
  assert.ok(openSize(long, NODE).h > nodeSize(long, NODE).h);
  assert.equal(openSize(long, NODE, 120).h, NODE.chrome + 120);
});

test('the transcript copies as Markdown and the last question is found', () => {
  const { chat } = twoTurns();
  assert.equal(markdownOf(chat), '**You**\n\nq\n\n**Assistant**\n\na\n\n**You**\n\nq2');
  assert.equal(lastAsked(transcript(chat))?.text, 'q2');
  assert.equal(lastAsked([]), null);
});
