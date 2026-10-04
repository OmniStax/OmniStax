import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import { conceptsOfChapter, coverageOf, exercisesOf, macroExpansion, macroTypesOf, metaOf, pageMacrosOf, splitSub, typesWorn } from '../src/lib/content/load';
import { prerenderMath } from '../src/lib/math/prerender';

/* The tables as the three files write them, small enough to read whole: a book
   whose chapter 16 rests on a chapter 2 that has been built and on a chapter 4
   that has not, and one section of it. */
const BOOK = BookSchema.parse({
  id: 'college-physics-2e', title: 'College Physics 2e', publisher: 'OpenStax', license: 'CC BY-NC-SA 4.0',
  chapters: ['ch02', 'ch16'],
  types: [{ id: 'force', label: 'force', dimension: 'N' }, { id: 'position', label: 'position', dimension: 'm' }],
  concepts: [
    { id: 'displacement', kind: 'idea', section: '2.1', name: 'Displacement', statement: 'w' },
    { id: 'newtons-first-law', kind: 'idea', section: '4.2', name: 'Newton’s first law' },
    { id: 'restoring-force', kind: 'idea', section: '16.1', name: 'Restoring force', statement: 'w' },
    { id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke’s law', statement: 'w', forms: [{ id: 'eq-hooke', latex: 'F = -kx', ktex: '\\kF = -\\kk\\kx' }, { id: 'eq-dl', latex: 'F = k\\Delta L', section: '5.3' }] },
    { id: 'shm', kind: 'idea', section: '16.3', name: 'Simple harmonic motion' },
  ],
  concept_prereqs: [
    { concept: 'restoring-force', prereq: 'displacement' },
    { concept: 'restoring-force', prereq: 'newtons-first-law' },
    { concept: 'hookes-law', prereq: 'restoring-force' },
  ],
});
const CH16 = ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hooke’s Law' }, { id: '16.3', title: 'Simple Harmonic Motion' }] });
const SECTION = SectionSchema.parse({
  id: '16.1', chapter: '16', title: 'Hooke’s Law', built: '2026-09-07',
  figures: [
    { id: 'sim-ruler', kind: 'sim', number: '16.2', draws: ['position', 'force'] },
    { id: 'sim-spring-scale', kind: 'sim', draws: ['force'] },
  ],
  coverage: [
    { span: 'hookes-law', concept: 'hookes-law', verb: 'introduces' },
    { span: 'hookes-law', concept: 'restoring-force', verb: 'uses' },
    { span: 'hookes-law', concept: 'displacement', verb: 'uses' },
    { span: 'ex-car', concept: 'hookes-law', verb: 'reinforces' },
  ],
  exercises: [
    { id: 'cq1', source_id: 'fs-1', source_number: '5.17', kind: 'conceptual-question', bloom: 'Understand', place: { at: 'inline', after: 'hookes-law' }, prompt: 'Why?', answer: { type: 'open' } },
    { id: 'p1', source_id: 'fs-2', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'How far?', answer: { type: 'number', value: 1.5, unit: 'm' } },
  ],
  exercise_concepts: [
    { exercise: 'cq1', concept: 'restoring-force' },
    { exercise: 'p1', concept: 'hookes-law', weight: 5 },
    { exercise: 'p1', concept: 'displacement' },
  ],
});

test('a strict table refuses a key nobody declared', () => {
  assert.throws(() => ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Waves', colour: 'blue' }), /Unrecognized key/);
});

test('a chapter draws the concepts its sections teach and everything those rest on', () => {
  const built = new Set(['2.1', '16.1']);
  const { concepts } = conceptsOfChapter(BOOK, CH16, [], built);
  assert.deepEqual(concepts.map((c) => c.id), ['displacement', 'newtons-first-law', 'restoring-force', 'hookes-law', 'shm'], 'a prerequisite in another chapter comes with the concept that rests on it');
  assert.deepEqual(concepts.find((c) => c.id === 'hookes-law')?.prereqs, ['restoring-force']);
  assert.deepEqual(concepts.find((c) => c.id === 'restoring-force')?.prereqs, ['displacement', 'newtons-first-law']);
});
test('a concept stands as a placeholder until the section that introduces it is built', () => {
  const { concepts } = conceptsOfChapter(BOOK, CH16, [], new Set(['2.1', '16.1']));
  const status = Object.fromEntries(concepts.map((c) => [c.id, c.status]));
  assert.deepEqual(status, { displacement: 'built', 'newtons-first-law': 'placeholder', 'restoring-force': 'built', 'hookes-law': 'built', shm: 'placeholder' });
  const none = conceptsOfChapter(BOOK, CH16, [], new Set()).concepts;
  assert.deepEqual(none.map((c) => c.status), ['placeholder', 'placeholder', 'placeholder', 'placeholder', 'placeholder']);
  assert.equal(none.find((c) => c.id === 'hookes-law' && c.status === 'placeholder' && !('statement' in c)) !== undefined, true, 'a placeholder states nothing');
});

test('a concept carries its forms placed, the main form first, each in the section that states it', () => {
  const { concepts } = conceptsOfChapter(BOOK, CH16, [], new Set(['16.1']));
  const hooke = concepts.find((c) => c.id === 'hookes-law');
  assert.deepEqual(hooke?.forms.map((f) => [f.id, f.section, f.tex]), [['eq-hooke', '16.1', '\\kF = -\\kk\\kx'], ['eq-dl', '5.3', 'F = k\\Delta L']]);
  assert.deepEqual(concepts.find((c) => c.id === 'shm')?.forms, []);
});

test('a page wears what its figures draw, its variables rows carry and its text marks, in one order', () => {
  const rows = [{ sym: 'm', concept: 'mass', type: 'mass', meaning: 'm', unit: 'kg', section: '16.1' }] as never;
  assert.deepEqual(typesWorn(SECTION.figures, rows, '<span data-type="energy">energy</span>'), ['energy', 'force', 'mass', 'position']);
  assert.deepEqual(typesWorn([], [], ''), []);
});

test('a subscript is cut at its first underscore outside braces, a braced group or a command whole', () => {
  assert.deepEqual(splitSub('F_x'), { main: 'F', sub: 'x', rest: '' });
  assert.deepEqual(splitSub('v_{0}^2'), { main: 'v', sub: '0', rest: '^2' });
  assert.deepEqual(splitSub('E_\\text{cell}'), { main: 'E', sub: '\\text{cell}', rest: '' });
  assert.deepEqual(splitSub('\\vec{F}_{a_b}'), { main: '\\vec{F}', sub: 'a_b', rest: '' });
  assert.equal(splitSub('\\Delta x'), null);
});

test('a page sets a symbol by its variables row there, and splits the subscript of one that names a referent', () => {
  const F = { sym: 'F_x', latex: 'F_x', macro: '\\kFx', type: 'force' } as never;
  const L = { sym: 'L', latex: 'L', macro: '\\kL' } as never;
  const row = (sym: string, extra: object) => ({ sym, meaning: '', unit: '', section: '4.7', ...extra }) as never;
  assert.deepEqual(pageMacrosOf([F, L], [row('F_x', { type: 'force' })]), {}, 'a row that agrees with the book sets nothing of its own');
  assert.deepEqual(pageMacrosOf([F, L], [row('L', { type: 'position' })]), { '\\kL': '\\htmlClass{kv-position}{\\htmlData{sym=L}{L}}' });
  assert.deepEqual(pageMacrosOf([F, L], [row('F_x', { type: 'force', ref: 'tug-1' })]), { '\\kFx': '\\htmlClass{kv-force}{\\htmlData{sym=F_x}{F_{\\htmlData{ref=tug-1}{x}}}}' });
  assert.deepEqual(pageMacrosOf([F, L], [row('F_x', {})]), { '\\kFx': 'F_x' }, 'a row of no type sets the symbol in ink there');
  assert.equal(macroExpansion(F), '\\htmlClass{kv-force}{\\htmlData{sym=F_x}{F_x}}');
});

test('a macro wears on a page the type its expansion there sets: the row\'s, else the symbol\'s, never ink', () => {
  const F = { sym: 'F_x', latex: 'F_x', macro: '\\kFx', type: 'force' } as never;
  const L = { sym: 'L', latex: 'L', macro: '\\kL' } as never;
  const row = (sym: string, extra: object) => ({ sym, meaning: '', unit: '', section: '4.7', ...extra }) as never;
  assert.deepEqual(macroTypesOf([F, L], []), { '\\kFx': 'force' });
  assert.deepEqual(macroTypesOf([F, L], [row('L', { type: 'position' }), row('F_x', { type: 'force', ref: 'tug-1' })]), { '\\kFx': 'force', '\\kL': 'position' });
  assert.deepEqual(macroTypesOf([F, L], [row('F_x', {})]), {}, 'a row of no type sets the symbol in ink there');
});

test('coverage folds to one row per span, qualified by its section', () => {
  assert.deepEqual(coverageOf(SECTION), [
    { span: '16.1-hookes-law', introduces: ['hookes-law'], uses: ['restoring-force', 'displacement'], reinforces: [] },
    { span: '16.1-ex-car', introduces: [], uses: [], reinforces: ['hookes-law'] },
  ]);
});

test('an exercise carries the concepts it tests, and the points the pipeline gave them', () => {
  const [cq1, p1] = exercisesOf(SECTION);
  assert.deepEqual(cq1.concepts, ['restoring-force']);
  assert.equal(cq1.weights, undefined, 'legacy weights remain optional');
  assert.deepEqual(cq1.place, { at: 'inline', after: 'hookes-law' });
  assert.equal(cq1.sourceId, 'fs-1');
  assert.equal(cq1.sourceNumber, '5.17');
  assert.deepEqual(p1.concepts, ['hookes-law', 'displacement']);
  assert.deepEqual(p1.weights, { 'hookes-law': 5 });
  assert.deepEqual(p1.place, { at: 'end' });
});

/* Every reader-facing string of section.json is swept for math on the way in, not only the
   prose and the summary: a lead or a footer note that writes $F = kx$ reaches the page as
   rendered markup, the way the text does, rather than printing its dollars. */
test('the lead and the notes are swept for math like the text', () => {
  const dto = SectionSchema.parse({
    id: '16.1', chapter: '16', title: 'Hooke’s Law', built: '2026-09-07',
    lead: 'The restoring force $F = -kx$ grows with the stretch.',
    notes: 'The deformation table was left out; $x$ is measured from the rest length.',
  });
  const meta = metaOf(dto, { url: '/x/' }, (h) => prerenderMath(h, {}));
  assert.ok(!meta.lead.includes('$'), 'the lead carries no dollars');
  assert.ok(meta.lead.includes('katex'), 'the lead carries rendered math');
  assert.ok(meta.lead.startsWith('The restoring force '), 'the words around the math are kept');
  assert.ok(!meta.notes.includes('$') && meta.notes.includes('katex'), 'the notes are swept the same way');
  /* a page with neither stays empty, so the footer and the lead are still left off */
  const bare = SectionSchema.parse({ id: '16.3', chapter: '16', title: 'Simple Harmonic Motion', built: '2026-09-07' });
  assert.equal(metaOf(bare, { url: '/y/' }, (h) => (h ? prerenderMath(h, {}) : '')).lead, '');
});

/* A lead marks its words as the text does, and writes the page's macros: the spans reach the page for the
   colour rules and paintRefs, a split symbol's subscript among them. */
test('a lead keeps its type and referent spans and sets the page\'s macros', () => {
  const dto = SectionSchema.parse({
    id: '4.4', chapter: '4', title: 'Newton’s Third Law', built: '2026-09-07',
    lead: 'How <span data-ref="tug-1">the tug</span> pulls with a <span data-type="force">force</span> $\\kF$.',
  });
  const macros = { '\\kF': '\\htmlClass{kv-force}{\\htmlData{sym=F}{F_{\\htmlData{ref=tug-1}{1}}}}' };
  const lead = metaOf(dto, { url: '/x/' }, (h) => prerenderMath(h, macros)).lead;
  assert.match(lead, /<span data-ref="tug-1">the tug<\/span>/);
  assert.match(lead, /<span data-type="force">force<\/span>/);
  assert.match(lead, /kv-force/);
  assert.equal(lead.match(/data-ref="tug-1"/g)?.length, 2, 'the subscript carries the referent too');
  assert.deepEqual(typesWorn([], [], dto.lead), ['force']);
});
