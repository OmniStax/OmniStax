import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ask, answer, answerCall, call, chooseSibling, crumbsOf, fail, finish, firstWords, grow, latestLeafUnder, leavesOf,
  newChat, pagerOf, resend, retry, siblingsOf, spokenIn, stop, transcript, type Chat, type MessageId,
} from '../src/lib/chat/model';
import { askText, chip, contextBlock, withChip, withoutChip } from '../src/lib/chat/context';
import { systemPrompt, WIDGET } from '../src/lib/chat/prompt';
import { requestOf, failureOf, rejectsTools, trimBase, CORS_MESSAGE, DEFAULT_BASE, type Access, type ChatRequest, type ModelPick, type Provider, type StreamEvent } from '../src/lib/chat/providers/index';
import { PROVIDERS } from '../src/lib/chat/providers/all';
import { bodyOf as anthropicBody } from '../src/lib/chat/providers/anthropic';
import { bodyOf as openaiBody, foldCalls } from '../src/lib/chat/providers/openai';
import { bodyOf as geminiBody } from '../src/lib/chat/providers/gemini';
import { heightOf, partsOf } from '../src/lib/chat/widget';
import { accessOf, cardModels, isShown, menuOf, parseAi, providerReady, readyPick, toggleShown, visibleModels, withoutKeys } from '../src/lib/chat/settings';
import { TOOL_SPECS, figureSource, runTool, stepLabel, type Library } from '../src/lib/chat/tools';
import type { Corpus } from '../src/lib/search/model';
import { chatEntries, currentChats, findInChats } from '../src/lib/search/chats';
import { chatId } from '../src/lib/types/ids';

/* A chat with one question and one answer, the times set by hand so that the
   order of siblings never depends on how fast the test ran. */
const conversation = (): Chat => {
  let chat = newChat(chatId('abcd1234'), 1_000);
  const asked = ask(chat, 'Why does the period not depend on the mass?');
  chat = asked.chat;
  const answered = answer(chat, asked.id, 'claude-sonnet-5-5');
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

const OPENAI_PICK: ModelPick = { provider: 'openai', model: 'gpt-5-mini' };
const OPENAI_ACCESS: Access = { key: 'sk-test', baseUrl: 'https://api.openai.com' };
const PLAIN = { widgets: false, tools: [] };

/* The conversation, then an answer that read a section before it spoke. */
const withTools = (): { chat: Chat; answer: MessageId } => {
  let chat = conversation();
  const asked = ask(chat, 'What is simple harmonic motion?', [chip('image', 'asset:a1', 'Image', '', false, 'asset:a1')]);
  const a = answer(asked.chat, asked.id, 'gpt-5-mini');
  chat = grow(a.chat, a.id, 'Let me read it.');
  chat = call(chat, a.id, { kind: 'tool', id: 'c1', name: 'read_section', input: { book: 'college-physics-2e', section: '16.3' } });
  chat = answerCall(chat, a.id, 'c1', { output: '# 16.3 Simple Harmonic Motion\n\nA spring…' });
  chat = grow(chat, a.id, 'It is motion under a restoring force.');
  return { chat: finish(chat, a.id), answer: a.id };
};

test('the request is built from the chat alone, and each provider shapes it its own way', () => {
  const request = requestOf(conversation(), [chip('section', '16.4', '16.4', 'A pendulum swings…')], OPENAI_PICK, OPENAI_ACCESS, PLAIN);
  assert.equal(request.model, 'gpt-5-mini');
  assert.equal(request.key, 'sk-test');
  assert.equal(request.baseUrl, 'https://api.openai.com');
  assert.equal(request.turns.length, 2);
  const first = request.turns[0];
  assert.ok(first.role === 'user' && /A pendulum swings/.test(first.text), 'the chips ride on the last reader turn');
  assert.ok(!request.system.includes(WIDGET), 'the widget paragraph is off');
  assert.ok(!request.system.includes('read_section'), 'no tools, no tool paragraph');

  const openai = openaiBody(request);
  assert.equal(openai.messages[0].role, 'system');
  assert.equal(openai.stream, true);
  assert.equal(openai.tools, undefined);
  const anthropic = anthropicBody(request);
  assert.deepEqual(anthropic.system[0], { type: 'text', text: request.system, cache_control: { type: 'ephemeral' } });
  assert.equal(anthropic.messages.length, 2);
  const gemini = geminiBody(request);
  assert.deepEqual(gemini.contents.map((c) => c.role), ['user', 'model']);
});

test('grow keeps plain answers stepless, and a tool call splits the prose into steps', () => {
  const { chat, answer: id } = withTools();
  const m = chat.messages[id];
  assert.equal(m.text, 'Let me read it.\n\nIt is motion under a restoring force.', 'text stays the prose joined');
  assert.deepEqual(m.steps?.map((s) => s.kind), ['text', 'tool', 'text']);
  const plain = conversation();
  assert.equal(plain.messages[transcript(plain)[1].id].steps, undefined);
});

test('each provider sends tool calls, their results, images and the tools in its own shape', () => {
  const { chat } = withTools();
  const images = { 'asset:a1': 'data:image/png;base64,AAAA' };
  const at = { ...chat, leaf: transcript(chat)[3].id };
  const request = requestOf(at, [], OPENAI_PICK, OPENAI_ACCESS, { widgets: true, tools: TOOL_SPECS, images });
  assert.match(request.system, /read_section/);
  assert.match(request.system, /widget/);

  const o = openaiBody(request);
  assert.equal(o.tools?.length, TOOL_SPECS.length);
  const roles = o.messages.map((m) => m.role);
  assert.deepEqual(roles, ['system', 'user', 'assistant', 'user', 'assistant', 'tool', 'assistant']);
  const askedWithImage = o.messages[3];
  assert.ok(askedWithImage.role === 'user' && Array.isArray(askedWithImage.content) && askedWithImage.content[0].type === 'image_url');
  const called = o.messages[4];
  assert.ok(called.role === 'assistant' && called.tool_calls?.[0].function.name === 'read_section');
  assert.ok(o.messages[5].role === 'tool' && o.messages[5].tool_call_id === 'c1');

  const a = anthropicBody({ ...request, provider: 'anthropic' });
  assert.deepEqual(a.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
  assert.equal(a.messages[2].content[0].type, 'image');
  assert.equal(a.messages[3].content[1].type, 'tool_use');
  assert.equal(a.messages[4].content[0].type, 'tool_result');
  assert.deepEqual(a.messages[4].content[0].cache_control, { type: 'ephemeral' }, 'the last reader turn is cached');
  assert.equal(a.tools?.[0].name, 'list_books');

  const g = geminiBody({ ...request, provider: 'gemini' });
  assert.deepEqual(g.contents.map((c) => c.role), ['user', 'model', 'user', 'model', 'user', 'model']);
  assert.ok('inlineData' in g.contents[2].parts[0]);
  assert.ok(g.contents[3].parts.some((p) => 'functionCall' in p));
  assert.ok('functionResponse' in g.contents[4].parts[0]);
  assert.equal(g.tools?.[0].functionDeclarations.length, TOOL_SPECS.length);
});

/* A fetch that answers with one SSE body, and remembers what it was asked. */
const fakeFetch = (events: readonly unknown[]): { calls: { url: string; body: unknown }[] } => {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string, init?: { body?: string }) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    const text = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');
    return new Response(text, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
  return { calls };
};
const drain = async (p: Provider, r: ChatRequest): Promise<StreamEvent[]> => {
  const out: StreamEvent[] = [];
  for await (const e of p.stream(r, new AbortController().signal)) out.push(e);
  return out;
};
const bare = (provider: ChatRequest['provider'], baseUrl: string): ChatRequest =>
  ({ provider, model: 'm', key: 'k', baseUrl, system: 's', turns: [{ role: 'user', text: 'hi', images: [] }], tools: TOOL_SPECS });

test('each provider streams text and assembles its tool calls', async () => {
  const real = globalThis.fetch;
  try {
    const o = fakeFetch([
      { choices: [{ delta: { content: 'Hel' } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'x1', function: { name: 'sea', arguments: '{"book":' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'rch', arguments: '"b"}' } }] } }] },
      '[DONE]',
    ]);
    assert.deepEqual(await drain(PROVIDERS.local, bare('local', 'http://localhost:1234')), [
      { kind: 'text', text: 'Hel' }, { kind: 'call', id: 'x1', name: 'search', input: { book: 'b' } },
    ]);
    assert.equal(o.calls[0].url, 'http://localhost:1234/v1/chat/completions');

    const a = fakeFetch([
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi' } },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 't1', name: 'lookup' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"kind":"concept"}' } },
      { type: 'content_block_stop', index: 1 },
    ]);
    assert.deepEqual(await drain(PROVIDERS.anthropic, bare('anthropic', 'https://api.anthropic.com')), [
      { kind: 'text', text: 'Hi' }, { kind: 'call', id: 't1', name: 'lookup', input: { kind: 'concept' } },
    ]);
    assert.equal((a.calls[0].body as { tools: unknown[] }).tools.length, TOOL_SPECS.length);

    fakeFetch([{ candidates: [{ content: { parts: [{ text: 'Yo' }, { functionCall: { name: 'list_books', args: {} } }] } }] }]);
    assert.deepEqual(await drain(PROVIDERS.gemini, bare('gemini', 'https://g')), [
      { kind: 'text', text: 'Yo' }, { kind: 'call', id: 'call_0', name: 'list_books', input: {} },
    ]);
  } finally { globalThis.fetch = real; }
});

test('the OpenAI-shaped providers are asked at their own addresses', () => {
  assert.equal(DEFAULT_BASE.deepseek, 'https://api.deepseek.com');
  assert.equal(DEFAULT_BASE.openrouter, 'https://openrouter.ai/api');
  assert.equal(DEFAULT_BASE.mistral, 'https://api.mistral.ai');
  assert.equal(trimBase('http://localhost:11434/v1/'), 'http://localhost:11434');
  assert.equal(foldCalls(new Map(), { tool_calls: [{ index: 2, id: 'q', function: { name: 'a', arguments: '{' } }] }).get(2)?.args, '{');
});

test('a host that refuses a browser is reported in the words the spec sets', () => {
  assert.equal(failureOf(new TypeError('Failed to fetch')), CORS_MESSAGE);
  assert.equal(failureOf(new Error('401 Unauthorized')), '401 Unauthorized');
});

test('the widget paragraph is appended only when inline HTML is on', () => {
  assert.ok(!systemPrompt(false).includes(WIDGET));
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

test('the AI settings read back leniently, migrate the first shape, and go into a backup without their keys', () => {
  const legacy = parseAi({ provider: 'compatible', keys: { gemini: 'secret' }, models: { gemini: 'gemini-2.5-pro', compatible: 'mock-1' }, baseUrl: 'http://localhost:1234' });
  assert.equal(legacy.keys.gemini, 'secret');
  assert.equal(legacy.endpoints[0].baseUrl, 'http://localhost:1234');
  assert.deepEqual(legacy.last, { provider: 'local', model: 'local/mock-1' });
  assert.ok(isShown(legacy, { provider: 'local', model: 'local/mock-1' }));
  assert.deepEqual(legacy.added.gemini, [], 'a model in code is not added twice');
  assert.deepEqual(accessOf(legacy, { provider: 'local', model: 'local/mock-1' }), { key: '', baseUrl: 'http://localhost:1234' });

  const fresh = parseAi('nonsense');
  assert.equal(fresh.inlineHtml, true);
  assert.deepEqual(fresh.last, { provider: 'anthropic', model: 'claude-sonnet-5-5' });
  assert.equal(accessOf(fresh, fresh.last!), null, 'no key, no access');
  const menu = menuOf(fresh);
  assert.equal(menu[0].label, 'Anthropic');
  assert.equal(menu[0].entries[0].ready, false);
  assert.equal(menu[0].ready, false);
  assert.deepEqual(menu[0].entries.map((e) => e.name).slice(0, 2), ['claude-sonnet-5-5', 'claude-opus-5-5']);
  assert.equal(readyPick(fresh, fresh.last), null, 'no key, no pick');
  assert.ok(!providerReady(fresh, 'local'));

  const kept = parseAi(JSON.parse(JSON.stringify({ ...fresh, keys: { ...fresh.keys, openai: 'sk' } })));
  assert.equal(kept.keys.openai, 'sk');
  assert.ok(providerReady(kept, 'openai'));
  assert.deepEqual(readyPick(kept, { provider: 'openai', model: 'gpt-5' }), { provider: 'openai', model: 'gpt-5' });
  assert.equal(withoutKeys(kept).keys.openai, '');
  assert.deepEqual(cardModels(toggleShown(kept, { provider: 'openai', model: 'gpt-5' }), 'openai').slice(0, 2), ['gpt-5', 'gpt-5-mini']);
  assert.ok(!isShown(toggleShown(fresh, fresh.shown[0]), fresh.shown[0]));
});

test('a long model list shows the ticked first, filters, and caps until asked for all', () => {
  const models = Array.from({ length: 40 }, (_, i) => `m${i}`);
  const ticked = (m: string): boolean => m === 'm30';
  const capped = visibleModels(models, ticked, '', false);
  assert.equal(capped.rows.length, 15);
  assert.equal(capped.rows[0], 'm30');
  assert.equal(capped.found, 40);
  assert.equal(visibleModels(models, ticked, '', true).rows.length, 40);
  assert.deepEqual(visibleModels(models, ticked, 'm3', false).rows.slice(0, 2), ['m30', 'm3']);
});

/* A library of one book, one section and one figure, for the tools. */
const corpus: Corpus = {
  book: 'bk', title: 'A Book', urls: {},
  concepts: [
    { id: 'hookes-law', kind: 'axiom', name: "Hooke's law", section: '16.1', status: 'built', statement: 'springs', terms: [], forms: [{ id: 'eq-hooke', section: '16.1', tex: 'F=-kx', latex: 'F=-kx' }] },
    { id: 'deformation', kind: 'definition', name: 'Deformation', section: '16.1', status: 'built', statement: 'a change in shape', terms: ['deformation'], forms: [] },
    { id: 'force-constant', kind: 'definition', name: 'Force constant', section: '16.1', status: 'built', statement: 'how stiff a spring is', symbol: 'k', terms: [], forms: [] },
  ] as unknown as Corpus['concepts'],
  variables: [{ sym: 'k', concept: 'force-constant', meaning: 'spring constant', unit: 'N/m', section: '16.1' }, { sym: 'N', meaning: 'number of coils', unit: '', section: '16.1' }] as unknown as Corpus['variables'],
  pages: [{ id: '16.1', title: "Hooke's Law", url: '', chapter: '16', terms: [], blocks: [{ span: 's1', head: '', text: 'A spring stretches in proportion to the force.', toks: '' }] }],
};
const fakeLibrary: Library = {
  books: async () => [{ id: 'bk', title: 'A Book' }],
  chapters: async (b) => (b === 'bk' ? [{ id: '16', title: '16 Oscillatory Motion', sections: [{ id: '16.1', title: "Hooke's Law", built: true }] }] : null),
  section: async (b, s) => (b === 'bk' && s === '16.1' ? { title: "Hooke's Law", text: 'A spring stretches.' } : null),
  corpus: async (b) => (b === 'bk' ? corpus : null),
  figure: async (_b, _s, id, source) => (id === 'sim-spring' ? { caption: 'A spring', alt: 'a mass on a spring', params: [{ label: 'Mass', value: 2, unit: 'kg' }], ...(source ? { source: 'draw()' } : {}) } : null),
};

test('the tools read the books through the library and answer with links', async () => {
  assert.match((await runTool(fakeLibrary, 'list_books', {})).output ?? '', /bk — A Book/);
  assert.match((await runTool(fakeLibrary, 'table_of_contents', { book: 'bk', chapter: '16' })).output ?? '', /\[\[bk\/16\.1\]\] Hooke's Law/);
  const read = await runTool(fakeLibrary, 'read_section', { book: 'bk', section: '16.1' });
  assert.match(read.output ?? '', /^# 16\.1 Hooke's Law/);
  assert.equal(stepLabel({ kind: 'tool', id: 'c', name: 'read_section', input: { section: '16.1' }, output: read.output }), "Read 16.1 Hooke's Law");
  assert.match((await runTool(fakeLibrary, 'search', { book: 'bk', query: 'spring' })).output ?? '', /\[\[bk\/16\.1\]\]/);
  assert.equal((await runTool(fakeLibrary, 'lookup', { book: 'bk', kind: 'definition', query: 'deformation' })).output,
    '[[concept:bk/16.1:deformation]] Deformation (definition): a change in shape; word [[def:bk/16.1:deformation]]');
  assert.equal((await runTool(fakeLibrary, 'lookup', { book: 'bk', kind: 'formula', query: 'hooke' })).output,
    "![[eq:bk/16.1:eq-hooke]] $F=-kx$ states [[concept:bk/16.1:hookes-law]] Hooke's law (axiom)");
  assert.match((await runTool(fakeLibrary, 'lookup', { book: 'bk', kind: 'definition', query: 'k' })).output ?? '', /^\[\[concept:bk\/16\.1:force-constant\]\][^\n]*symbol \[\[sym:bk\/16\.1:k\]\] \$k\$ \(N\/m\)/);
  assert.equal((await runTool(fakeLibrary, 'lookup', { book: 'bk', kind: 'definition', query: 'coils' })).output, '[[sym:bk/16.1:N]] $N$: number of coils', 'a symbol that names no concept');
  assert.match((await runTool(fakeLibrary, 'lookup', { book: 'bk', kind: 'concept', query: 'hooke' })).output ?? '', /^\[\[concept:bk\/16\.1:hookes-law\]\] Hooke's law \(axiom\): springs; formula !\[\[eq:bk\/16\.1:eq-hooke\]\] \$F=-kx\$$/);
  const fig = await runTool(fakeLibrary, 'figure', { book: 'bk', section: '16.1', id: 'sim-spring' });
  assert.match(fig.output ?? '', /Mass: 2 kg/);
  assert.ok(!/Source/.test(fig.output ?? ''), 'source only when asked');
  assert.match((await runTool(fakeLibrary, 'figure', { book: 'bk', section: '16.1', id: 'sim-spring', include_source: true })).output ?? '', /draw\(\)/);
  assert.match((await runTool(fakeLibrary, 'read_section', { book: 'bk', section: '9.9' })).error ?? '', /no built section/);
  assert.match((await runTool(fakeLibrary, 'nope', {})).error ?? '', /no tool/);
});

/* "work" in a book with a concept for every symbol that mentions work: the
   definitions are found before the cap, the one named exactly so comes first,
   and a question phrased in words finds it too. */
test('lookup sifts by kind before it caps, and ranks the exact name first', async () => {
  const many = Array.from({ length: 64 }, (_, i) => ({ id: `work-by-${i}`, kind: 'result', name: `Work done by force ${i}`, section: '7.1', status: 'built', statement: 'work', terms: [], forms: [] }));
  const work = { id: 'work', kind: 'definition', name: 'Work', section: '7.1', status: 'built', statement: 'the transfer of energy by a force', symbol: 'W', terms: [], forms: [{ id: 'eq-work', section: '7.1', tex: '\\kW = \\kF d', latex: 'W = Fd' }] };
  const concepts = [...many, { id: 'work-energy', kind: 'definition', name: 'Work-energy theorem', section: '7.2', status: 'built', statement: 'net work', terms: [], forms: [] }, work] as unknown as Corpus['concepts'];
  const variables = [{ sym: 'W', concept: 'work', meaning: 'work', unit: 'J', section: '7.1' }] as unknown as Corpus['variables'];
  const big: Corpus = { ...corpus, concepts, variables };
  const lib: Library = { ...fakeLibrary, corpus: async (b) => (b === 'bk' ? big : null), symbolTex: (_b, sym) => (sym === 'W' ? '\\kW' : null) };
  const found = (await runTool(lib, 'lookup', { book: 'bk', kind: 'definition', query: 'work' })).output ?? '';
  assert.equal(found.split('\n')[0], '[[concept:bk/7.1:work]] Work (definition): the transfer of energy by a force; symbol [[sym:bk/7.1:W]] $\\kW$ (J); formula ![[eq:bk/7.1:eq-work]] $\\kW = \\kF d$');
  assert.match((await runTool(lib, 'lookup', { book: 'bk', kind: 'definition', query: 'definition of work' })).output ?? '', /^\[\[concept:bk\/7\.1:work\]\]/);
  assert.match((await runTool(lib, 'lookup', { book: 'bk', kind: 'definition', query: 'W' })).output ?? '', /^\[\[concept:bk\/7\.1:work\]\]/);
  assert.match((await runTool(lib, 'lookup', { book: 'nope', kind: 'definition', query: 'work' })).error ?? '', /^No book nope\.$/);
});

test('a figure\'s source is its own block and the helpers every figure shares', () => {
  const js = "const { el } = F;\nfunction helper() {}\n{\n  const d = sim('sim-a', 300);\n}\n{\n  const d = sim('sim-b', 300);\n}";
  const src = figureSource(js, 'sim-b');
  assert.match(src, /helper/);
  assert.match(src, /sim-b/);
  assert.ok(!src.includes('sim-a'));
  assert.equal(figureSource(js, 'sim-z'), js);
});

test('a refusal that names tools is told apart from any other', () => {
  assert.ok(rejectsTools('This model does not support tools'));
  assert.ok(rejectsTools('function calling is not enabled for this model'));
  assert.ok(!rejectsTools('401 Unauthorized'));
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

test('the chat corpus reads the session over the disk and drops deleted chats', () => {
  const disk = { ...conversation(), name: 'old' };
  const live = { ...conversation(), name: 'new' };
  const other = { ...newChat(chatId('zzzz0000')), name: 'gone' };
  const got = currentChats([disk, other], { [live.id]: live }, new Set([live.id]));
  assert.deepEqual(got.map((c) => c.name), ['new']);
  assert.equal(chatEntries(got)[0].name, 'new');
});
