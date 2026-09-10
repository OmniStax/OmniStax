import { test } from 'node:test';
import assert from 'node:assert/strict';
import { builtSections, mergeCatalog, parseConcepts, parseExercises, parseManifest, type ForeignBook } from '../src/lib/practice/books';
import type { Catalog } from '../src/lib/practice/model';
import type { ConceptDTO, ExerciseDTO } from '../src/lib/content/schema';
import { sectionId } from '../src/lib/types/ids';

const sec = (s: string) => sectionId(s);

/* A second book off the wire, as `/university-physics/book.json` would give it:
   one chapter with a built section and an unbuilt one, and two rows that are
   not chapters at all. */
const RAW_MANIFEST = {
  id: 'up', title: 'University Physics', publisher: 'OpenStax', license: 'CC BY 4.0',
  chapters: [
    {
      id: '15', dir: 'ch15', title: 'Oscillations', concepts: '/up/ch15/concepts.json', formulas: '/up/ch15/formulas.json',
      sections: [
        { id: '15.1', title: 'Simple Harmonic Motion', built: true, url: '/up/ch15/15.1/', fragment: '/up/ch15/15.1/doc.html', figuresJs: '/up/ch15/15.1/figures.js' },
        { id: '15.9', title: 'Damping', built: false, url: '/up/ch15/15.9/' },
        { title: 'a section with no id' },
        'not a section at all',
      ],
    },
    { title: 'a chapter with neither id nor dir', sections: [] },
    42,
  ],
};

const concept = (id: string, section: string, name: string, prereqs: string[] = []): ConceptDTO => ({ id, kind: 'idea', section, name, prereqs, placeholder: false });
const ex = (id: string, concepts: string[]): ExerciseDTO => ({ id, kind: 'problem', bloom: 'apply', concepts, place: 'end', prompt: id, answer: { type: 'open', generated_by: 'source' } });

const HOME: Catalog = {
  concepts: [concept('hookes-law', '16.1', 'Hooke’s law'), concept('shm', '16.3', 'Simple harmonic motion')],
  sectionsOf: (book, chapter) => (book === 'cp' && chapter === '16' ? [sec('16.1'), sec('16.3')] : []),
  allSections: (book) => (book === 'cp' ? [sec('16.1'), sec('16.3')] : []),
  exercises: [{ book: 'cp', section: sec('16.1'), ex: ex('h1', ['hookes-law']) }],
};
const foreign = (): ForeignBook => ({
  manifest: parseManifest(RAW_MANIFEST)!,
  concepts: [concept('hookes-law', '15.1', 'The spring law'), concept('torque', '15.4', 'Torque')],
  coverage: [],
  exercises: { '15.1': [ex('u1', ['hookes-law']), ex('u2', ['torque'])] },
});

/* ---------- the manifest ---------- */

test('a manifest off the wire keeps what a session draws on and drops what is not a chapter or a section', () => {
  const m = parseManifest(RAW_MANIFEST);
  assert.ok(m);
  assert.equal(m.id, 'up');
  assert.equal(m.title, 'University Physics');
  assert.deepEqual(m.chapters.map((c) => [c.id, c.dir, c.title]), [['15', 'ch15', 'Oscillations']], 'the two rows that are not chapters come to nothing');
  assert.equal(m.chapters[0].concepts, '/up/ch15/concepts.json');
  assert.deepEqual(m.chapters[0].sections.map((s) => [s.id, s.built, s.url]), [['15.1', true, '/up/ch15/15.1/'], ['15.9', false, '/up/ch15/15.9/']], 'a section without an id is dropped');
  assert.deepEqual(builtSections(m).map((s) => s.id), ['15.1'], 'only a built section has a problem set to fetch');
});
test('a manifest defaults what it is not read for, and comes to nothing without an id or without chapters', () => {
  const m = parseManifest({ id: 'up', chapters: [{ dir: 'ch15', sections: [{ id: '15.1', built: true, url: '/up/ch15/15.1/' }] }] });
  assert.ok(m);
  assert.equal(m.chapters[0].id, 'ch15', 'a chapter named only by its directory answers to it either way');
  assert.equal(m.chapters[0].sections[0].fragment, '/up/ch15/15.1/doc.html', 'the fragment and the figure module follow from the url');
  assert.deepEqual([m.publisher, m.authors, m.exerciseKinds], ['', [], {}]);
  assert.equal(parseManifest(null), null);
  assert.equal(parseManifest({ id: 'up' }), null, 'a book with no chapters has nothing to practise');
  assert.equal(parseManifest({ chapters: [] }), null);
});

/* ---------- concepts and exercises ---------- */

test('a chapter’s concepts are read by the schema the book being read uses, and garbage comes back empty', () => {
  const p = parseConcepts({ chapter: '15', concepts: [{ id: 'torque', section: '15.4', name: 'Torque' }], coverage: [{ span: '15.4', introduces: ['torque'] }] });
  assert.deepEqual(p.concepts.map((c) => c.id), ['torque']);
  assert.deepEqual(p.coverage.map((c) => c.span), ['15.4']);
  assert.deepEqual(parseConcepts('not a file'), { concepts: [], coverage: [] });
});
test('a problem set with a row the app cannot read comes back empty rather than half read', () => {
  const good = { id: 'u1', kind: 'problem', bloom: 'apply', concepts: ['torque'], prompt: 'p', answer: { type: 'open' } };
  assert.deepEqual(parseExercises([good]).map((e) => e.id), ['u1']);
  assert.deepEqual(parseExercises([good, { id: 'u2' }]), [], 'the whole array fails: an exercise that will not parse is one the session must not draw');
  assert.deepEqual(parseExercises(null), []);
});

/* ---------- the merged catalogue ---------- */

test('the same concept taught by two books is one concept, and the book being read is the one that names it', () => {
  const cat = mergeCatalog(HOME, [['up', foreign()]]);
  assert.deepEqual(cat.concepts.map((c) => c.id), ['hookes-law', 'shm', 'torque'], 'canonical ids: the first seen wins');
  assert.equal(cat.concepts.find((c) => c.id === 'hookes-law')?.name, 'Hooke’s law');
  assert.equal(mergeCatalog(HOME, []), HOME, 'with no book loaded beside it the catalogue is the one the shell built');
});
test('a foreign chapter answers for its built sections, by its id or by its directory, and the book being read still answers for itself', () => {
  const cat = mergeCatalog(HOME, [['up', foreign()]]);
  assert.deepEqual(cat.sectionsOf('up', '15'), [sec('15.1')]);
  assert.deepEqual(cat.sectionsOf('up', 'ch15'), [sec('15.1')], 'the manifest is matched either way, since a pick may carry either');
  assert.deepEqual(cat.sectionsOf('up', '99'), []);
  assert.deepEqual(cat.allSections('up'), [sec('15.1')], 'the unbuilt section is not drawn from');
  assert.deepEqual(cat.sectionsOf('cp', '16'), [sec('16.1'), sec('16.3')]);
  assert.deepEqual(cat.allSections('cp'), [sec('16.1'), sec('16.3')]);
});
test('every exercise carries the book it came from, since section ids are not unique across books', () => {
  const cat = mergeCatalog(HOME, [['up', foreign()]]);
  assert.deepEqual(cat.exercises.map((e) => [e.book, String(e.section), e.ex.id]), [
    ['cp', '16.1', 'h1'],
    ['up', '15.1', 'u1'],
    ['up', '15.1', 'u2'],
  ], 'the book being read first, then what the loaded books set');
});
