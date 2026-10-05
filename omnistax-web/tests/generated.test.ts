import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, prepare, quotaOf, type Catalog, type PracticeSettings } from '../src/lib/practice/model';
import { catalogOf, parseGenerated, pickStored, recordOf, type GeneratedExercise } from '../src/lib/practice/generated';
import { generate } from '../src/lib/practice/generate';
import { parseGrade } from '../src/lib/practice/grade';
import type { ChatRequest, Provider, StreamEvent } from '../src/lib/chat/providers/index';
import type { Library } from '../src/lib/chat/tools';
import type { ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
import { conceptId, sectionId } from '../src/lib/types/ids';

const include: PracticeSettings = { ...DEFAULT_SETTINGS, generated: 'include' };
const bookOnly: PracticeSettings = { ...DEFAULT_SETTINGS, generated: 'book-only' };
const sec = sectionId;
const concept = (id: string): ConceptDTO => ({ status: 'built', id: conceptId(id), kind: 'idea', section: sec('1.1'), name: id, terms: [], forms: [], prereqs: [], statement: '' });
const ex = (id: string, concepts: string[]): ExerciseDTO => ({ id, sourceId: id, kind: 'problem', bloom: 'Apply', concepts: concepts.map(conceptId), place: { at: 'end' }, prompt: id, answer: { type: 'open', generated_by: 'source' } });
const cat: Catalog = {
  concepts: [concept('ohm'), concept('series'), concept('loop')],
  sectionsOf: () => [sec('1.1')], allSections: () => [sec('1.1')],
  exercises: [
    { book: 'cp', section: sec('1.1'), ex: ex('o1', ['ohm']) }, { book: 'cp', section: sec('1.1'), ex: ex('o2', ['ohm']) },
    ...['s1', 's2', 's3', 's4', 's5'].map((id) => ({ book: 'cp', section: sec('1.1'), ex: ex(id, ['series']) })),
  ],
};
const model = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5' };
const stored = (concept: string, uses: number, created: number): GeneratedExercise => ({
  ...recordOf({ prompt: `${concept} ${uses}`, facet: 'f', bloom: 'Apply', answer: { type: 'open', solution: 's', generated_by: 'ai' } }, { book: 'cp', section: '1.1', concept, model }, created), uses,
});

test('a concept wants the round default or its override, the book gives what it has, and generated items fill the gap', () => {
  assert.deepEqual(quotaOf('ohm', 2, include), { wanted: 3, book: 2, gap: 1 });
  assert.deepEqual(quotaOf('ohm', 2, include, { perConcept: 5, wanted: { ohm: 1 } }), { wanted: 1, book: 1, gap: 0 });
  assert.deepEqual(quotaOf('loop', 0, include, { perConcept: 4 }), { wanted: 4, book: 0, gap: 4 });
  assert.deepEqual(quotaOf('ohm', 2, bookOnly, { perConcept: 5 }), { wanted: 2, book: 2, gap: 0 }, 'book only caps the wish at the book');
  assert.deepEqual(quotaOf('ohm', 2, include, { wanted: { ohm: 40 } }).wanted, 9);
});

test('the plan reports each gap, keeps a book-less concept only when generated items are included, and draws the extras', () => {
  const picks = [{ book: 'cp' }, { concept: conceptId('loop') }];
  const plan = prepare(picks, {}, cat, [], [], include, 0);
  assert.deepEqual(plan.quotas.ohm, { wanted: 3, book: 2, gap: 1 });
  assert.equal(plan.quotas.series.gap, 0);
  assert.deepEqual(plan.quotas.loop, { wanted: 3, book: 0, gap: 3 });
  assert.equal(plan.drawn.length, 5);
  assert.equal(prepare(picks, {}, cat, [], [], bookOnly, 0).concepts.includes('loop'), false);
  const extra = [stored('ohm', 0, 1), stored('loop', 0, 2), stored('loop', 0, 3), stored('loop', 0, 4)].map(catalogOf);
  const full = prepare(picks, {}, cat, [], [], include, 0, {}, extra);
  assert.equal(full.drawn.length, 9);
  assert.equal(full.drawn.filter((d) => d.ex.id.startsWith('ai:')).length, 4);
  assert.equal(new Set(full.drawn.map((d) => d.ex.id)).size, 9);
  const zero = prepare(picks, {}, cat, [], [], include, 0, { wanted: { series: 0 } });
  assert.equal(zero.concepts.includes('series'), false, 'a concept wanted zero times sits the round out');
});

test('stored items are reused least used first, and ones already answered right only when nothing else is left', () => {
  const a = stored('ohm', 2, 1), b = stored('ohm', 0, 2), c = stored('ohm', 1, 3), other = stored('loop', 0, 4);
  const right = [{ book: 'cp', section: sec('1.1'), ex: `ai:${b.id}`, at: 5, ok: true, concepts: ['ohm'] }];
  assert.deepEqual(pickStored([a, b, c, other], 'ohm', 2, []).map((g) => g.id), [b.id, c.id]);
  assert.deepEqual(pickStored([a, b, c, other], 'ohm', 2, right).map((g) => g.id), [c.id, a.id]);
  assert.deepEqual(pickStored([a, b, c], 'ohm', 3, right).map((g) => g.id), [c.id, a.id, b.id]);
});

const fence = (body: unknown): string => `Here.\n\`\`\`json\n${JSON.stringify(body)}\n\`\`\`\n`;
const good = { prompt: 'A $2\\,\\Omega$ resistor carries 3 A. Find the voltage.', facet: 'voltage from current and resistance', bloom: 'apply', answer: { type: 'number', value: 6, unit: 'V', solution: 'V = IR = 6 V' } };

test('the generated parser reads every good item, names a bad one, and fails without a fence', () => {
  const ok = parseGenerated(fence([good]));
  assert.equal(ok.items.length, 1); assert.deepEqual(ok.errors, []);
  assert.equal(ok.items[0].bloom, 'Apply');
  assert.equal(ok.items[0].answer.generated_by, 'ai', 'generated_by is forced to ai');
  const mixed = parseGenerated(fence([good, { prompt: 'no answer', facet: 'x', bloom: 'Apply' }]));
  assert.equal(mixed.items.length, 1); assert.equal(mixed.errors.length, 1); assert.match(mixed.errors[0], /^Item 2: answer/);
  const bare = parseGenerated(JSON.stringify([good]));
  assert.equal(bare.items.length, 0); assert.match(bare.errors[0], /fenced/);
  assert.match(parseGenerated('```json\n{"prompt": 1}\n```').errors[0], /array/);
});

test('the grade parser reads a verdict and feedback, and says why when it cannot', () => {
  assert.deepEqual(parseGrade(fence({ verdict: 'Partial', feedback: ' The unit is off. ' })), { verdict: 'partial', feedback: 'The unit is off.' });
  assert.deepEqual(parseGrade('{"verdict":"right","feedback":"Yes."}'), { verdict: 'right', feedback: 'Yes.' });
  assert.ok('error' in parseGrade(fence({ verdict: 'maybe' })));
  assert.ok('error' in parseGrade('It looks right to me.'));
});

/* A provider that answers from a script, one reply per request, and keeps what it was sent. */
const scripted = (replies: readonly (readonly StreamEvent[])[]): Provider & { sent: ChatRequest[] } => {
  const sent: ChatRequest[] = [];
  return {
    id: 'anthropic', sent,
    async *stream(request) { const reply = replies[sent.length] ?? []; sent.push(request); for (const e of reply) yield e; },
    models: async () => [],
  };
};
const library: Library = {
  books: async () => [], chapters: async () => null, corpus: async () => null, figure: async () => null,
  section: async (book, s) => (book === 'cp' && s === '1.1' ? { title: 'Ohm', text: 'V = IR.' } : null),
};
const ask = { book: 'cp', bookTitle: 'College Physics', section: '1.1', concept: { id: 'ohm', name: 'Ohm’s law', kind: 'axiom', statement: 'V = IR' }, count: 2, existing: ['o1'], facets: ['units'] };
const access = { key: 'k', baseUrl: 'https://api.anthropic.com' };

test('generation reads the section through a tool, retries once on an unreadable answer, and returns the items', async () => {
  const provider = scripted([
    [{ kind: 'call', id: 't1', name: 'read_section', input: { book: 'cp', section: '1.1' } }],
    [{ kind: 'text', text: 'Sure, here they are.' }],
    [{ kind: 'text', text: fence([good, good]).slice(0, 20) }, { kind: 'text', text: fence([good, good]).slice(20) }],
  ]);
  const items = await generate({ provider, library }, ask, model, access, new AbortController().signal);
  assert.equal(items.length, 2);
  assert.equal(provider.sent.length, 3);
  assert.deepEqual(provider.sent[0].tools.map((t) => t.name), ['read_section', 'search', 'lookup']);
  assert.match((provider.sent[0].turns[0] as { text: string }).text, /Write 2 items/);
  const toolTurn = provider.sent[1].turns[1];
  assert.ok(toolTurn.role === 'assistant' && toolTurn.steps.some((s) => s.kind === 'tool' && s.output?.includes('V = IR.')));
  const retry = provider.sent[2].turns.at(-1);
  assert.ok(retry?.role === 'user' && /could not be read/.test(retry.text));
});

test('generation that never yields an item throws', async () => {
  const provider = scripted([[{ kind: 'text', text: 'no' }], [{ kind: 'text', text: 'still no' }]]);
  await assert.rejects(generate({ provider, library }, ask, model, access, new AbortController().signal), /fenced/);
});

test('a backup carries generated exercises, and one written before them parses with none', async () => {
  const { BACKUP_FORMAT, BACKUP_VERSION, parseBackup } = await import('../src/lib/backup/schema');
  const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-10-04T12:00:00.000Z', app: { readerFormat: 1 }, records: [], assets: [], books: [] };
  assert.deepEqual(parseBackup(base).generated, []);
  const g = stored('ohm', 1, 5);
  assert.equal(parseBackup({ ...base, generated: [g] }).generated[0].id, g.id);
  assert.throws(() => parseBackup({ ...base, generated: [{ ...g, answer: { type: 'nope' } }] }));
});
