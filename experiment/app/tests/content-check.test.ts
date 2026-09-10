import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../omnistax.config';
import { loadBook } from '../src/lib/content/load';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import {
  CHECKS, checkAnchors, checkBinds, checkConcepts, checkContent, checkFigures, checkRefs, checkSources, checkSpans, checkTypes,
  contentOf, errorsOf,
} from '../src/lib/content/check';
import type { Check, Content, Finding } from '../src/lib/content/check';

/* ---------- the book on disk ---------- */

const REAL = await contentOf(await loadBook(config.content.root, config.content.bookId));
const said = (findings: readonly Finding[]): readonly string[] => findings.map((f) => `${f.where}: ${f.what}`);

test('the book on disk passes every check', () => {
  assert.deepEqual(said(errorsOf(checkContent(REAL))), []);
});
test('the book on disk is not empty, so the checks above had something to read', () => {
  assert.ok(REAL.chapters.length > 0 && REAL.chapters.flatMap((c) => c.sections).length > 0);
  assert.ok(CHECKS.every((check) => typeof check === 'function'));
});
test('a concept whose chapter the book has not added yet is said out loud, and is no error', () => {
  const waiting = checkContent(REAL).filter((f) => f.level === 'info');
  assert.ok(waiting.every((f) => /waits on section/.test(f.what)), said(waiting).join('\n'));
});

/* ---------- one fixture per rule, each broken on purpose ---------- */

/* The smallest book that passes: one chapter, one built section, one concept
   the section introduces, and a text with the one span they all name. */
const TEXT = '<section id="hookes-law"><h2>Hooke’s law</h2><figure class="demo" id="demo-ruler" data-figure="16.2"></figure></section>';
const SOURCE = ':::exercise {fs-1} type=problem\nPROBLEM: How far?\n';

const bookOf = (o: object) => BookSchema.parse({
  id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: ['ch16'],
  types: [{ id: 'force', label: 'force' }, { id: 'position', label: 'position' }],
  exercise_kinds: [{ id: 'problem', label: 'Problem' }],
  concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke’s law', why: 'w', evidence: 'e' }],
  ...o,
});
const chapterOf = (o: object) => ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Waves', sections: [{ id: '16.1', title: 'Hooke’s Law' }], ...o });
const sectionOf = (o: object) => SectionSchema.parse({
  id: '16.1', chapter: '16', title: 'Hooke’s Law', built: '2026-09-10',
  figures: [{ id: 'demo-ruler', kind: 'demo', number: '16.2', draws: ['force'] }],
  coverage: [{ span: 'hookes-law', concept: 'hookes-law', verb: 'introduces' }],
  exercises: [{ id: 'p1', source_id: 'fs-1', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'How far?', answer: { type: 'open' } }],
  ...o,
});
type Parts = { readonly book?: object; readonly chapter?: object; readonly section?: object; readonly textHtml?: string; readonly sourceMd?: string | null };
const fixture = (p: Parts = {}): Content => ({
  book: bookOf(p.book ?? {}),
  chapters: [{ dto: chapterOf(p.chapter ?? {}), sections: [{ dto: sectionOf(p.section ?? {}), textHtml: p.textHtml ?? TEXT, sourceMd: p.sourceMd === undefined ? SOURCE : p.sourceMd }] }],
});
/* What one rule says about one fixture, as one string per finding. */
const run = (check: Check, p: Parts = {}): readonly string[] => said(check(fixture(p)));

test('the smallest whole book has nothing wrong with it', () => {
  assert.deepEqual(said(errorsOf(checkContent(fixture()))), []);
});

test('checkRefs: an id that names no row is an error, and a chapter nobody has added is a note', () => {
  assert.deepEqual(run(checkRefs), []);
  assert.match(run(checkRefs, { book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', why: 'w', evidence: 'e', eq: 'eq-nowhere' }] } })[0], /eq "eq-nowhere" names no row/);
  assert.match(run(checkRefs, { section: { exercises: [{ id: 'p1', source_id: 'fs-1', kind: 'riddle', bloom: 'Apply', place: { at: 'end' }, prompt: 'p', answer: { type: 'open' } }] } })[0], /kind "riddle" names no row/);
  assert.match(run(checkRefs, { section: { exercise_concepts: [{ exercise: 'p9', concept: 'hookes-law' }] } })[0], /exercise "p9" names no row/);
  const alongside = (c: object) => ({ book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', why: 'w', evidence: 'e' }, c] } });
  const waiting = checkRefs(fixture(alongside({ id: 'newtons-first-law', kind: 'idea', section: '4.2', name: 'N' })));
  assert.deepEqual(waiting.map((f) => f.level), ['info']);
  assert.match(waiting[0].what, /waits on section "4.2"/);
  const missing = checkRefs(fixture(alongside({ id: 'shm', kind: 'idea', section: '16.9', name: 'S' })));
  assert.deepEqual(said(missing), ['book.json concepts[shm]: is introduced in section "16.9", which chapter 16 does not list'], 'a section of a chapter the book does list is not allowed to be missing');
});

test('checkTypes: a variable of a type the book never declared', () => {
  const variables = [{ sym: 'x', meaning: 'position', unit: 'm', section: '16.1' }];
  assert.deepEqual(run(checkTypes, { chapter: { variables } }), []);
  assert.match(run(checkTypes, { chapter: { variables: [{ ...variables[0], type: 'colour' }] } })[0], /type "colour" names no row/);
  assert.match(run(checkTypes, { book: { symbols: [{ sym: 'x', latex: 'x', type: 'colour' }] } })[0], /type "colour" names no row/);
});

test('checkBinds: a figure that draws a type the book never declared', () => {
  assert.deepEqual(run(checkBinds), []);
  const said = run(checkBinds, { section: { figures: [{ id: 'demo-ruler', kind: 'demo', number: '16.2', draws: ['stiffness'] }] } });
  assert.match(said[0], /draws "stiffness" names no row/);
  assert.match(said[1], /binds unknown type "stiffness"/);
});

test('checkAnchors: an anchor the section has no id for, and one whose section is not built', () => {
  const equations = (anchor: string) => [{ id: 'eq-hooke', section: '16.1', latex: 'F = -kx', anchor, important: true }];
  assert.deepEqual(run(checkAnchors, { chapter: { equations: equations('16.1-hookes-law') } }), []);
  assert.match(run(checkAnchors, { chapter: { equations: equations('16.1-elastic-energy') } })[0], /section 16.1 has no id "elastic-energy"/);
  assert.match(run(checkAnchors, { chapter: { equations: equations('16.3-shm') } })[0], /section 16.3 is not built/);
  assert.match(run(checkAnchors, { chapter: { variables: [{ sym: 'x', meaning: 'm', unit: 'm', section: '16.1', anchor: '16.1-nowhere' }] } })[0], /has no id "nowhere"/);
});

test('checkSpans: a span, a cite and a place the text has no id for', () => {
  assert.deepEqual(run(checkSpans), []);
  assert.match(run(checkSpans, { section: { coverage: [{ span: 'elastic-energy', concept: 'hookes-law', verb: 'introduces' }] } })[0], /span "elastic-energy" is no id/);
  const ex = { id: 'p1', source_id: 'fs-1', kind: 'problem', bloom: 'Apply', prompt: 'p', answer: { type: 'open' } };
  assert.match(run(checkSpans, { section: { exercises: [{ ...ex, place: { at: 'end' }, cite: 'nowhere' }] } })[0], /cite "nowhere" is no id/);
  assert.match(run(checkSpans, { section: { exercises: [{ ...ex, place: { at: 'inline', after: 'nowhere' } }] } })[0], /place.after "nowhere" is no id/);
});

test('checkFigures: a row with no figure, a figure with no row, and a number the two disagree on', () => {
  assert.deepEqual(run(checkFigures), []);
  assert.match(run(checkFigures, { section: { figures: [{ id: 'demo-ruler', kind: 'demo', number: '16.2' }, { id: 'demo-scale', kind: 'demo' }] } })[0], /is no <figure> of the section’s text/);
  assert.match(run(checkFigures, { section: { figures: [] } })[0], /<figure id="demo-ruler"> is no row/);
  assert.match(run(checkFigures, { section: { figures: [{ id: 'demo-ruler', kind: 'demo', number: '16.4' }] } })[0], /numbered 16.4 in the table and 16.2 in the text/);
});

test('checkSources: a source_id the source it was taken from does not hold', () => {
  const only = (o: object) => ({ section: { exercises: [{ id: 'p1', source_id: 'fs-1', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'p', answer: { type: 'open' }, ...o }] } });
  assert.deepEqual(run(checkSources), []);
  assert.match(run(checkSources, { sourceMd: 'nothing here' })[0], /source_id "fs-1" is nowhere in the source.md of 16.1/);
  assert.match(run(checkSources, { sourceMd: null })[0], /keeps no source.md beside it/);
  assert.deepEqual(run(checkSources, { sourceMd: null, section: { exercises: [] } }), [], 'a section that sets no exercises needs no source');
  assert.match(run(checkSources, only({ source_section: '16.9' }))[0], /source_section "16.9" is no section the app has built/);

  /* An item the book prints in one section and the pipeline places in another is
     looked for in the source it says it came from, and nowhere else. */
  const two = (o: object): Content => {
    const one = fixture(only(o));
    return { ...one, chapters: [{ ...one.chapters[0], sections: [{ dto: sectionOf({ id: '16.3', ...only(o).section }), textHtml: TEXT, sourceMd: 'no ids here' }, one.chapters[0].sections[0]] }] };
  };
  assert.deepEqual(said(checkSources(two({ source_section: '16.1' }))), [], 'the source it names is the one that is read');
  assert.match(said(checkSources(two({})))[0], /source_id "fs-1" is nowhere in the source.md of 16.3; it is in the source of 16.1/);
});

test('checkConcepts: a built concept with nothing to say for itself', () => {
  assert.deepEqual(run(checkConcepts), []);
  const bare = { id: 'hookes-law', kind: 'result', section: '16.1', name: 'H' };
  const said = run(checkConcepts, { book: { concepts: [bare] } });
  assert.match(said[0], /says no why/);
  assert.match(said[1], /shows no evidence/);
  assert.match(run(checkConcepts, { section: { coverage: [{ span: 'hookes-law', concept: 'hookes-law', verb: 'uses' }] } })[0], /no coverage row introduces it/);
  assert.deepEqual(checkConcepts({ book: bookOf({ concepts: [bare] }), chapters: [{ dto: chapterOf({}), sections: [] }] }), [], 'a concept nobody has built the section for is a placeholder and says none of it');
});
