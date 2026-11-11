import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answer, answerCall, ask, call, grow, newChat } from '../src/lib/chat/model';
import { chip } from '../src/lib/chat/context';
import { blendMacros, booksAround, booksNamed } from '../src/lib/chat/blend';
import { render, type Resolver } from '../src/lib/notes/md/render';
import type { ChatId } from '../src/lib/types/ids';

test('a message names the books of its chips, its tool calls and its links, in that order', () => {
  let { chat, id: q } = ask(newChat('aaaaaaaa' as ChatId), 'What is strain?', [chip('section', 'calculus/2.1', '2.1', '')]);
  const a = answer(chat, q, 'model'); chat = a.chat;
  chat = call(chat, a.id, { kind: 'tool', id: 't1', name: 'lookup', input: { book: 'college-physics-2e', query: 'strain' } });
  chat = answerCall(chat, a.id, 't1', { output: '…' });
  chat = call(chat, a.id, { kind: 'tool', id: 't2', name: 'list_books', input: {} });
  chat = grow(chat, a.id, 'See [[chemistry-2e/3.1]] and [[def:college-physics-2e/16.1:strain|strain]], not [[my note]].');
  assert.deepEqual(booksNamed(chat.messages[q]!), ['calculus']);
  assert.deepEqual(booksNamed(chat.messages[a.id]!), ['college-physics-2e', 'chemistry-2e']);
  /* an answer reads the books named on the way to it, nearest first */
  assert.deepEqual(booksAround(chat, a.id), ['college-physics-2e', 'chemistry-2e', 'calculus']);
  assert.deepEqual(booksAround(chat, q), ['calculus']);
});

test('a blend keeps the first book to name a macro, and is one table for the same books', () => {
  const own = { '\\kF': 'F_{own}' }, other = { '\\kF': 'F_{other}', '\\kdx': '\\Delta x' };
  const all = blendMacros([own, other]);
  assert.deepEqual(all, { '\\kF': 'F_{own}', '\\kdx': '\\Delta x' });
  assert.equal(blendMacros([own, other]), all);
  assert.notEqual(blendMacros([other, own]), all);
  assert.equal(blendMacros([own]), own);
});

test('display maths on lines of its own is set under the fallback table, so another book’s macro reads there', () => {
  const own = { '\\kF': 'F' }, other = { '\\kdx': '\\Delta x' };
  const resolver = (macros: Readonly<Record<string, string>>): Resolver =>
    new Proxy({ scope: () => ({ book: 'calculus', macros }) }, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => null) }) as unknown as Resolver;
  const src = 'Hooke:\n\n$$\\kF = -k\\,\\kdx$$\n';
  assert.match(render(src, resolver(own)), /\\kdx/);                        /* the chip's book alone: the macro comes out as its source */
  const out = render(src, resolver(blendMacros([own, other])));
  assert.doesNotMatch(out.replace(/<annotation[\s\S]*?<\/annotation>/g, ''), /\\kdx/);
  assert.match(out, /Δ/);
});
