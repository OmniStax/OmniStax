import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ask, answer, chooseSibling, crumbsOf, fail, finish, firstWords, grow, latestLeafUnder, leavesOf,
  newChat, pagerOf, resend, retry, siblingsOf, spokenIn, stop, transcript, type Chat,
} from '../src/lib/chat/model';
import { askText, chip, contextBlock, withChip, withoutChip } from '../src/lib/chat/context';
import { systemPrompt } from '../src/lib/chat/prompt';
import { requestOf, failureOf, CORS_MESSAGE, type AiSettings } from '../src/lib/chat/providers/index';
import { bodyOf as anthropicBody } from '../src/lib/chat/providers/anthropic';
import { bodyOf as openaiBody } from '../src/lib/chat/providers/openai';
import { bodyOf as geminiBody } from '../src/lib/chat/providers/gemini';
import { heightOf, partsOf } from '../src/lib/chat/widget';
import { parseAi, withoutKeys } from '../src/lib/chat/settings';
import { chatEntries, findInChats } from '../src/lib/search/chats';
import { chatId } from '../src/lib/types/ids';

/* A chat with one question and one answer, the times set by hand so that the
   order of siblings never depends on how fast the test ran. */
const conversation = (): Chat => {
  let chat = newChat(chatId('abcd1234'), 1_000);
  const asked = ask(chat, 'Why does the period not depend on the mass?');
  chat = asked.chat;
  const answered = answer(chat, asked.id, 'claude-sonnet-5');
  chat = grow(answered.chat, answered.id, 'Because the restoring force grows with the mass too.');
  return finish(chat, answered.id);
};

test('a chat is the path from the root to the leaf, and the root is never shown', () => {
  const chat = conversation();
  const path = transcript(chat);
  assert.equal(path.length, 2);
  assert.deepEqual(path.map((m) => m.role), ['user', 'assistant']);
  assert.equal(path[1].state, 'done');
  assert.equal(chat.name, 'Why does the period not depend on…');
});

test('edit-and-resend makes a sibling and keeps the old message', () => {
  const chat = conversation();
  const first = transcript(chat)[0];
  const again = resend(chat, first.id, 'Why does the period not depend on the bob?');
  assert.equal(Object.keys(again.chat.messages).length, 4, 'nothing was thrown away');
  assert.equal(again.chat.leaf, again.id);
  assert.equal(siblingsOf(again.chat, again.id).length, 2);
  const pager = pagerOf(again.chat, again.id);
  assert.deepEqual(pager, { index: 1, count: 2 });
  /* Moving the pager back lands on the end of that branch, not on the fork. */
  const back = chooseSibling(again.chat, again.id, 0);
  assert.equal(back.leaf, latestLeafUnder(chat, first.id));
  assert.equal(transcript(back).length, 2);
});

test('retry asks again beside the answer that stands', () => {
  const chat = conversation();
  const first = transcript(chat)[1];
  const again = retry(chat, first.id, 'claude-opus-5');
  assert.equal(again.chat.messages[again.id].state, 'streaming');
  assert.equal(again.chat.messages[again.id].model, 'claude-opus-5');
  assert.equal(siblingsOf(again.chat, again.id).length, 2);
  assert.equal(transcript(again.chat)[1].id, again.id);
});

test('the breadcrumb names every fork on the path, and the leaves name every branch', () => {
  const chat = conversation();
  const first = transcript(chat)[0];
  const again = resend(chat, first.id, 'What if the string were twice as long?');
  const crumbs = crumbsOf(again.chat);
  assert.equal(crumbs.length, 1);
  assert.deepEqual([crumbs[0].index, crumbs[0].count], [1, 2]);
  assert.match(crumbs[0].words, /^What if the string/);
  const leaves = leavesOf(again.chat);
  assert.equal(leaves.length, 2);
  assert.ok(leaves.some((l) => l.name.startsWith('What if the string')));
});

test('a stopped answer keeps the words that came, and a failed one keeps why', () => {
  const chat = conversation();
  const id = transcript(chat)[1].id;
  assert.equal(stop(grow(chat, id, ' more'), id).messages[id].state, 'stopped');
  assert.match(stop(grow(chat, id, ' more'), id).messages[id].text, /more$/);
  const failed = fail(chat, id, CORS_MESSAGE);
  assert.equal(failed.messages[id].state, 'failed');
  assert.equal(failed.messages[id].error, CORS_MESSAGE);
});

test('chips are what the model is shown, and nothing else is', () => {
  const section = chip('section', '16.4', '16.4 · The Simple Pendulum', 'A pendulum swings…', true);
  const note = chip('note', 'note:a1b2c3d4', 'Damped motion', 'My own words');
  const both = withChip(withChip([], section), note);
  assert.equal(both.length, 2);
  assert.equal(withChip(both, section).length, 2, 'the same thing is not added twice');
  assert.equal(withoutChip(both, section).length, 1);
  assert.match(contextBlock(both), /Section of the textbook: 16.4/);
  assert.match(askText('Why?', both), /# My question\n\nWhy\?$/);
  assert.equal(askText('Why?', []), 'Why?', 'no chips, no preamble');
});

test('the request is built from the chat alone, and each provider shapes it its own way', () => {
  const settings: AiSettings = {
    provider: 'openai', models: { anthropic: 'claude-sonnet-5', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash', compatible: '' },
    baseUrl: '', keys: { anthropic: '', openai: 'sk-test', gemini: '', compatible: '' },
  };
  const request = requestOf(conversation(), [chip('section', '16.4', '16.4', 'A pendulum swings…')], settings);
  assert.equal(request.model, 'gpt-4o-mini');
  assert.equal(request.key, 'sk-test');
  assert.equal(request.baseUrl, 'https://api.openai.com');
  assert.equal(request.turns.length, 2);
  assert.match(request.turns[0].text, /A pendulum swings/, 'the chips ride on the last reader turn');
  assert.ok(!request.system.includes('widget'), 'the widget paragraph is off by default');

  const openai = openaiBody(request);
  assert.equal(openai.messages[0].role, 'system');
  assert.equal(openai.stream, true);
  const anthropic = anthropicBody(request);
  assert.equal(anthropic.system, request.system);
  assert.equal(anthropic.messages.length, 2);
  const gemini = geminiBody(request);
  assert.deepEqual(gemini.contents.map((c) => c.role), ['user', 'model']);
});

test('a compatible host is asked at the address the reader typed', () => {
  const settings: AiSettings = {
    provider: 'compatible', models: { anthropic: '', openai: '', gemini: '', compatible: 'local-model' },
    baseUrl: 'http://localhost:1234/', keys: { anthropic: '', openai: '', gemini: '', compatible: '' },
  };
  assert.equal(requestOf(newChat(chatId('abcd1234')), [], settings).baseUrl, 'http://localhost:1234');
});

test('a host that refuses a browser is reported in the words the spec sets', () => {
  assert.equal(failureOf(new TypeError('Failed to fetch')), CORS_MESSAGE);
  assert.equal(failureOf(new Error('401 Unauthorized')), '401 Unauthorized');
});

test('the widget paragraph is appended only when the chat asked for it', () => {
  assert.ok(!systemPrompt(false).includes('widget'));
  assert.match(systemPrompt(true), /fenced block tagged `widget`/);
});

test('a widget block is cut out of the answer only when widgets are on', () => {
  const answerText = 'Look:\n\n```widget\n<p>hi</p>\n```\n\nThat is it.';
  assert.deepEqual(partsOf(answerText, false).map((p) => p.kind), ['markdown']);
  const parts = partsOf(answerText, true);
  assert.deepEqual(parts.map((p) => p.kind), ['markdown', 'widget', 'markdown']);
  assert.equal(parts[1].kind === 'widget' && parts[1].html, '<p>hi</p>');
  assert.equal(parts[1].kind === 'widget' && parts[1].open, false);
  /* A fence still arriving is a widget that is not mounted yet. */
  const half = partsOf('```widget\n<p>hi', true);
  assert.equal(half[0].kind === 'widget' && half[0].open, true);
  assert.equal(heightOf({ height: 420 }), 420);
  assert.equal(heightOf({ height: 99_999 }), 1200, 'a widget cannot push the answer off the screen');
  assert.equal(heightOf('tall'), null);
});

test('the AI settings read back leniently and go into a backup without their keys', () => {
  const stored = parseAi({ provider: 'gemini', keys: { gemini: 'secret' }, models: { gemini: 'gemini-2.5-pro' } });
  assert.equal(stored.provider, 'gemini');
  assert.equal(stored.keys.gemini, 'secret');
  assert.equal(stored.models.anthropic, 'claude-sonnet-5', 'what is missing takes its default');
  assert.equal(withoutKeys(stored).keys.gemini, '');
  assert.equal(withoutKeys(stored).models.gemini, 'gemini-2.5-pro');
  assert.equal(parseAi('nonsense').provider, 'anthropic');
});

test('the search reads a chat as one entry per message', () => {
  const entries = chatEntries([conversation()]);
  assert.equal(entries.length, 2);
  const hits = findInChats(entries, 'restoring force');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].role, 'assistant');
  assert.equal(hits[0].chat, 'abcd1234');
  assert.ok(hits[0].excerpt.some((p) => p.hit));
  assert.equal(findInChats(entries, 'kangaroo').length, 0);
});

test('the first words of a message name a chat and a branch', () => {
  assert.equal(firstWords('one two three', 2), 'one two…');
  assert.equal(firstWords('  '), '');
  assert.equal(spokenIn(newChat(chatId('abcd1234'))).length, 0, 'the silent root is nobody\'s words');
});
