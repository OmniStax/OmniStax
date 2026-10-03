import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../omnistax.config';
import { loadBooks, withInheritedTypes } from '../src/lib/content/load';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import {
  CHECKS, UNLINKED_ROWS_ARE_ERRORS, checkAnchors, checkBinds, checkConceptLinks, checkConceptNames, checkConcepts, checkContent, checkFigureRefs, checkFigures, checkRefs, checkSources, checkSpans, checkTypes, checkTypeSpans, checkReferents, checkWidths, checkPrereqCycles, prereqLoops,
  citedNumbers, contentOf, errorsOf, warningsOf,
} from '../src/lib/content/check';
import type { Check, Content, Finding } from '../src/lib/content/check';

/* ---------- the book on disk ---------- */

/* Every book the build carries, as the checks read it: one content record a book, each checked on its own. */
const BOOKS = await Promise.all((await loadBooks(config.content.root, config.content.books)).map(contentOf));
const said = (findings: readonly Finding[]): readonly string[] => findings.map((f) => `${f.where}: ${f.what}`);

test('every book on disk passes every check', () => {
  BOOKS.forEach((book) => assert.deepEqual(said(errorsOf(checkContent(book))), [], book.book.id));
});
test('the books on disk are not empty, so the checks above had something to read', () => {
  assert.ok(BOOKS.length > 0);
  assert.ok(BOOKS.every((b) => b.chapters.length > 0 && b.chapters.flatMap((c) => c.sections).length > 0));
  assert.ok(CHECKS.every((check) => typeof check === 'function'));
});
test('a concept whose chapter the book has not added yet is said out loud, and is no error', () => {
  const waiting = BOOKS.flatMap((b) => checkContent(b)).filter((f) => f.level === 'info');
  assert.ok(waiting.every((f) => /waits on section/.test(f.what)), said(waiting).join('\n'));
});
test('the only warnings a book on disk raises are a figure it has not built yet, a sheet cell the book prints with a word in it, a row not yet linked to its concept, and a lead not yet cut to rule 21\'s length', () => {
  BOOKS.forEach((book) => {
    const built = new Set(book.chapters.map((ch) => ch.dto.id));
    const raised = warningsOf(checkContent(book));
    const figure = (f: Finding): boolean => /cites Figure (\d+)\.\d+/.test(f.what) && !built.has(/cites Figure (\d+)\./.exec(f.what)![1]);
    /* a reference table prints "0.9999720 (density maximum)" where a column holds numbers; the page leaves that row out of the order and says so here */
    const cell = (f: Finding): boolean => /which is not a number/.test(f.what);
    const unlinked = (f: Finding): boolean => !UNLINKED_ROWS_ARE_ERRORS && f.what === 'names no concept';
    /* the leads written before rule 21 capped them run long until they are rewritten */
    const lead = (f: Finding): boolean => /^has a lead of \d+ words/.test(f.what);
    assert.ok(raised.every((f) => figure(f) || cell(f) || unlinked(f) || lead(f)), said(raised).join('\n'));
  });
});

/* ---------- one fixture per rule, each broken on purpose ---------- */

/* The smallest book that passes: one chapter, one built section, one concept
   the section introduces, and a text with the one span they all name. */
const figureOf = (attrs: string, eyebrow: string | undefined): string =>
  `<figure ${attrs}>${eyebrow === undefined ? '' : `<div class="sim-head"><span class="eyebrow">${eyebrow}</span><span>Drag the ruler.</span></div>`}</figure>`;
const TEXT = `<section id="hookes-law"><h2>Hooke’s law</h2>${figureOf('class="sim" id="sim-ruler" data-figure="16.2"', 'Figure 16.2')}</section>`;
const SOURCE = ':::exercise {fs-1} type=problem\nPROBLEM: How far?\n';

const bookOf = (o: object) => BookSchema.parse({
  id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: ['ch16'],
  types: [{ id: 'force', label: 'force' }, { id: 'position', label: 'position' }],
  exercise_kinds: [{ id: 'problem', label: 'Problem' }],
  concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke’s law', statement: 'w' }],
  ...o,
});
const chapterOf = (o: object) => ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Waves', sections: [{ id: '16.1', title: 'Hooke’s Law' }], ...o });
const sectionOf = (o: object) => SectionSchema.parse({
  id: '16.1', chapter: '16', title: 'Hooke’s Law', lead: 'What a spring does when it is stretched.', built: '2026-09-10',
  figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.2', draws: ['force'] }],
  coverage: [{ span: 'hookes-law', concept: 'hookes-law', verb: 'introduces' }],
  exercises: [{ id: 'p1', source_id: 'fs-1', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'How far?', answer: { type: 'open' } }],
  ...o,
});
type Parts = { readonly book?: object; readonly chapter?: object; readonly section?: object; readonly textHtml?: string; readonly sourceMd?: string | null };
const fixture = (p: Parts = {}): Content => ({
  book: bookOf(p.book ?? {}),
  sheets: [],
  chapters: [{ dto: chapterOf(p.chapter ?? {}), sections: [{ dto: sectionOf(p.section ?? {}), textHtml: p.textHtml ?? TEXT, sourceMd: p.sourceMd === undefined ? SOURCE : p.sourceMd }] }],
});
/* What one rule says about one fixture, as one string per finding. */
const run = (check: Check, p: Parts = {}): readonly string[] => said(check(fixture(p)));

test('the smallest whole book has nothing wrong with it', () => {
  assert.deepEqual(said(errorsOf(checkContent(fixture()))), []);
});

test('checkRefs: an id that names no row is an error, and a chapter nobody has added is a note', () => {
  assert.deepEqual(run(checkRefs), []);
  assert.match(run(checkRefs, { book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', statement: 'w', symbol: 'k' }] } })[0], /symbol "k" names no row/);
  assert.match(run(checkRefs, { book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', statement: 'w', forms: [{ id: 'eq-hooke', latex: 'F', section: '16.9' }] }] } })[0], /forms\[eq-hooke\]: section "16.9" names no row/);
  assert.match(run(checkRefs, { section: { exercises: [{ id: 'p1', source_id: 'fs-1', kind: 'riddle', bloom: 'Apply', place: { at: 'end' }, prompt: 'p', answer: { type: 'open' } }] } })[0], /kind "riddle" names no row/);
  assert.match(run(checkRefs, { section: { exercise_concepts: [{ exercise: 'p9', concept: 'hookes-law' }] } })[0], /exercise "p9" names no row/);
  assert.match(run(checkRefs, { chapter: { variables: [{ sym: 'k', concept: 'spring-constant', meaning: 'm', section: '16.1' }] } })[0], /concept "spring-constant" names no row/);
  const alongside = (c: object) => ({ book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', statement: 'w' }, c] } });
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

test('checkTypes: a concept of an undeclared type, an override equal to what it inherits, and a concept\u2019s own symbol overridden', () => {
  const concept = { id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke\u2019s law', statement: 'w' };
  const variables = [{ sym: 'x', concept: 'hookes-law', meaning: 'stretch', unit: 'm', section: '16.1' }];
  assert.deepEqual(run(checkTypes, { book: { symbols: [{ sym: 'F', latex: 'F' }], concepts: [{ ...concept, symbol: 'F', type: 'force' }] }, chapter: { variables } }), []);
  assert.match(run(checkTypes, { book: { concepts: [{ ...concept, type: 'colour' }] } })[0], /type "colour" names no row/);
  assert.match(run(checkTypes, { book: { symbols: [{ sym: 'F', latex: 'F', type: 'force' }], concepts: [{ ...concept, symbol: 'F', type: 'force' }] } })[0], /symbols\[F\]: overrides its type with "force", which is the type it inherits/);
  assert.match(run(checkTypes, { book: { concepts: [{ ...concept, type: 'force' }] }, chapter: { variables: [{ ...variables[0], type: 'force' }] } })[0], /variables\[x\]: overrides its type with "force"/);
  assert.deepEqual(run(checkTypes, { book: { concepts: [{ ...concept, type: 'force' }] }, chapter: { variables: [{ ...variables[0], type: 'position' }] } }), [], 'an override that differs is what an override is for');
  assert.match(run(checkTypes, { book: { symbols: [{ sym: 'F', latex: 'F', type: 'position' }], concepts: [{ ...concept, symbol: 'F', type: 'force' }] } })[0], /names type "force" and its own symbol "F" overrides it with "position"/);
});

test('withInheritedTypes: a symbol and a variables row take the type of the concept they denote, and an override wins', () => {
  const book = bookOf({
    symbols: [{ sym: 'F', latex: 'F' }, { sym: 'x', latex: 'x' }, { sym: 'k', latex: 'k', type: 'position' }, { sym: 'y', latex: 'y' }],
    concepts: [{ id: 'force', kind: 'definition', section: '16.1', name: 'force', symbol: 'F', type: 'force' }, { id: 'position', kind: 'definition', section: '16.1', name: 'position', type: 'position' }],
  });
  const chapter = chapterOf({ variables: [
    { sym: 'x', concept: 'position', meaning: 'm', section: '16.1' }, { sym: 'k', concept: 'force', meaning: 'm', section: '16.1' },
    { sym: 'y', concept: 'position', meaning: 'm', section: '16.1' }, { sym: 'y', meaning: 'm', section: '16.1' },
  ] });
  const { book: b, chapters: [ch] } = withInheritedTypes(book, [chapter]);
  assert.deepEqual(b.symbols.map((s) => s.type), ['force', 'position', 'position', undefined], 'y is named by a row of no concept, so it reaches no one concept');
  assert.deepEqual(ch.variables.map((v) => v.type), ['position', 'force', 'position', undefined]);
});

test('checkTypeSpans: words marked with an undeclared type, and with one the page does not bind', () => {
  assert.deepEqual(run(checkTypeSpans, { textHtml: `${TEXT}<p>the <span data-type="force">pull</span></p>` }), []);
  assert.match(run(checkTypeSpans, { textHtml: `${TEXT}<p>the <span data-type="colour">red</span></p>` })[0], /type "colour", which the book does not declare/);
  const said = checkTypeSpans(fixture({ textHtml: `${TEXT}<p>the <span data-type="position">place</span></p>` }));
  assert.deepEqual(said.map((f) => f.level), ['warning']); assert.match(said[0].what, /does not bind/);
});

test('checkReferents: a referent twice, in no figure, of no type, unnamed, and a span that names none', () => {
  const block = { id: 'block-1', label: 'block 1', figure: 'sim-ruler' };
  const named = `${TEXT}<p><span data-ref="block-1">Block 1</span> slides.</p>`;
  assert.deepEqual(run(checkReferents, { section: { referents: [block, { ...block, id: 'block-2', type: 'force' }] }, textHtml: `${named}<p><span data-ref="block-2">it</span></p>` }), []);
  assert.match(run(checkReferents, { section: { referents: [block, block] }, textHtml: named }).join('\n'), /declared twice/);
  assert.match(run(checkReferents, { section: { referents: [{ ...block, figure: 'sim-gone' }] }, textHtml: named })[0], /figure "sim-gone" names no row/);
  assert.match(run(checkReferents, { section: { referents: [{ ...block, type: 'colour' }] }, textHtml: named })[0], /type "colour" names no row/);
  assert.match(run(checkReferents, { section: { referents: [{ ...block, type: 'position' }] }, textHtml: named })[0], /does not bind/);
  const unnamed = checkReferents(fixture({ section: { referents: [block] } }));
  assert.deepEqual(unnamed.map((f) => f.level), ['warning']); assert.match(unnamed[0].what, /named by no <span data-ref>/);
  assert.match(run(checkReferents, { textHtml: named })[0], /<span data-ref="block-1"> is no row of the referents table/);
});

test('checkBinds: a figure that draws a type the book never declared', () => {
  assert.deepEqual(run(checkBinds), []);
  const said = run(checkBinds, { section: { figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.2', draws: ['stiffness'] }] } });
  assert.match(said[0], /draws "stiffness" names no row/);
  assert.match(said[1], /binds unknown type "stiffness"/);
});

test('checkAnchors: an anchor the section has no id for, and one whose section is not built', () => {
  const formed = (anchor: string) => ({ book: { concepts: [{ id: 'hookes-law', kind: 'result', section: '16.1', name: 'H', statement: 'w', forms: [{ id: 'eq-hooke', latex: 'F = -kx', anchor }] }] } });
  assert.deepEqual(run(checkAnchors, formed('16.1-hookes-law')), []);
  assert.match(run(checkAnchors, formed('16.1-elastic-energy'))[0], /section 16.1 has no id "elastic-energy"/);
  assert.match(run(checkAnchors, formed('16.3-shm'))[0], /section 16.3 is not built/);
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
  assert.match(run(checkFigures, { section: { figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.2' }, { id: 'sim-scale', kind: 'sim' }] } })[0], /is no <figure> of the section’s text/);
  assert.match(run(checkFigures, { section: { figures: [] } })[0], /<figure id="sim-ruler"> is no row/);
  assert.match(run(checkFigures, { section: { figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.4' }] } })[0], /numbered 16.4 in the table and 16.2 in the text/);
});

/* A sim that folds several book figures prints them all, and the text must print the same joined string. */
const FOLDED = TEXT.replaceAll('16.2', '16.2 + 16.3');
const folded = (folds: readonly string[], more: readonly object[] = []) => ({ figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.2', folds }, ...more] });
test('checkFigures: a folded figure whose text does not print the joined string, or whose fold repeats a number', () => {
  assert.deepEqual(run(checkFigures, { section: folded(['16.3']), textHtml: FOLDED }), []);
  assert.match(run(checkFigures, { section: folded(['16.3']) })[0], /numbered 16.2 \+ 16.3 in the table and 16.2 in the text/);
  assert.match(run(checkFigures, { section: folded([]), textHtml: FOLDED })[0], /numbered 16.2 in the table and 16.2 \+ 16.3 in the text/);
  assert.match(run(checkFigures, { section: folded(['16.2']), textHtml: TEXT.replaceAll('16.2', '16.2 + 16.2') })[0], /folds 16.2, which is its own number/);
  const two = `${FOLDED}${figureOf('class="sim" id="sim-scale" data-figure="16.3"', 'Figure 16.3')}`;
  const clash = run(checkFigures, { section: folded(['16.3'], [{ id: 'sim-scale', kind: 'sim', number: '16.3' }]), textHtml: two });
  assert.deepEqual(clash, ['16.1/section.json figures[sim-ruler]: folds 16.3, which figure "sim-scale" already carries']);
  assert.match(run(checkFigures, { section: { figures: [{ id: 'sim-ruler', kind: 'sim', folds: ['16.3'] }] }, textHtml: TEXT.replace(' data-figure="16.2"', '').replace('Figure 16.2', 'Sim') })[0], /folds 16.3 but carries no number of its own/);
});

/* The eyebrow follows from the row: Sim for an interactive figure that replaces nothing, Figure with the book's numbers for
   one that transforms a book figure, Figure or Figure N for a faithful copy, Figure N for a photograph. */
const labelled = (row: object, attrs: string, eyebrow: string | undefined) => ({ section: { figures: [row] }, textHtml: figureOf(attrs, eyebrow) });
test('checkFigures: the eyebrow of every figure reads what its row says', () => {
  const sim = { id: 'sim-ruler', kind: 'sim' };
  assert.deepEqual(run(checkFigures, labelled(sim, 'class="sim" id="sim-ruler"', 'Sim')), []);
  assert.deepEqual(run(checkFigures, labelled(sim, 'class="sim" id="sim-ruler"', 'Animation')), ['16.1/section.json figures[sim-ruler]: reads "Animation" in the text and should read "Sim"']);
  assert.deepEqual(run(checkFigures, labelled(sim, 'class="sim" id="sim-ruler"', 'Figure')), ['16.1/section.json figures[sim-ruler]: reads "Figure" in the text and should read "Sim"']);
  assert.deepEqual(run(checkFigures, labelled(sim, 'class="sim" id="sim-ruler"', undefined)), ['16.1/section.json figures[sim-ruler]: has no eyebrow in the text; it should read "Sim"']);
  assert.deepEqual(run(checkFigures, { textHtml: TEXT.replace('Figure 16.2', 'Sim') }), ['16.1/section.json figures[sim-ruler]: reads "Sim" in the text and should read "Figure 16.2"'], 'a sim that replaces a book figure is a Figure');
  assert.deepEqual(run(checkFigures, { section: folded(['16.3']), textHtml: FOLDED.replace('Figure 16.2 + 16.3', 'Figure 16.2') }), ['16.1/section.json figures[sim-ruler]: reads "Figure 16.2" in the text and should read "Figure 16.2 + 16.3"'], 'a folded figure reads every number');
  assert.deepEqual(run(checkFigures, { textHtml: TEXT.replace('Figure 16.2</span>', 'Figure 16.2<span class="tag">3D</span></span>') }), [], 'a badge nested in the eyebrow is not part of the label');
  const copy = { id: 'fig-paths', kind: 'figure' };
  assert.deepEqual(run(checkFigures, labelled(copy, 'class="sim" id="fig-paths"', 'Figure')), []);
  assert.deepEqual(run(checkFigures, labelled({ ...copy, number: '16.5' }, 'class="sim" id="fig-paths" data-figure="16.5"', 'Figure 16.5')), []);
  assert.deepEqual(run(checkFigures, labelled(copy, 'class="sim" id="fig-paths"', 'Sim')), ['16.1/section.json figures[fig-paths]: reads "Sim" in the text and should read "Figure"']);
  const photo = { id: 'fig-guitar', kind: 'photo', number: '16.8' };
  assert.deepEqual(run(checkFigures, { section: { figures: [photo] }, textHtml: '<figure class="photo" id="fig-guitar" data-figure="16.8"><img src="x"><figcaption><span class="eyebrow">Figure 16.8</span><span>The strings.</span></figcaption></figure>' }), []);
  assert.deepEqual(run(checkFigures, labelled(photo, 'class="photo" id="fig-guitar" data-figure="16.8"', 'Figure')), ['16.1/section.json figures[fig-guitar]: reads "Figure" in the text and should read "Figure 16.8"']);
  assert.deepEqual(run(checkFigures, labelled({ id: 'fig-guitar', kind: 'photo' }, 'class="photo" id="fig-guitar"', 'Figure')), ['16.1/section.json figures[fig-guitar]: is a photograph with no number, so its eyebrow has nothing to read']);
});

/* The book's display widths ride on the row as `widths`, one per image, and on the text as data-width (a photograph's
   <img>) or data-original-width (a figure's originals, comma-separated); both are absent where the row is empty. */
const photoText = (img: string) => `<figure class="photo" id="fig-guitar" data-figure="16.8"><img src="x"${img}><figcaption><span class="eyebrow">Figure 16.8</span><span>The strings.</span></figcaption></figure>`;
const simText = (attr: string) => figureOf(`class="sim" id="sim-ruler" data-figure="16.2" data-original="/a.jpg,/b.jpg"${attr}`, 'Figure 16.2');
test('checkWidths: a row gives one width per image, and the text carries the same numbers', () => {
  const photo = (widths: readonly number[]) => ({ id: 'fig-guitar', kind: 'photo', number: '16.8', widths });
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([])] }, textHtml: photoText('') }), []);
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([250])] }, textHtml: photoText(' data-width="250"') }), []);
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([250, 300])] }, textHtml: photoText(' data-width="250"') }), ['16.1/section.json figures[fig-guitar]: gives 2 widths for 1 images']);
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([250])] }, textHtml: photoText('') }), ['16.1/section.json figures[fig-guitar]: gives widths 250, but carries no data-width in the text']);
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([])] }, textHtml: photoText(' data-width="250"') }), ['16.1/section.json figures[fig-guitar]: gives no widths, but its data-width in the text reads "250"']);
  assert.deepEqual(run(checkWidths, { section: { figures: [photo([250])] }, textHtml: photoText(' data-width="300"') }), ['16.1/section.json figures[fig-guitar]: gives widths 250 and its data-width in the text reads "300"']);
  const sim = (widths: readonly number[]) => ({ id: 'sim-ruler', kind: 'sim', number: '16.2', originals: ['/a.jpg', '/b.jpg'], widths });
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([])] }, textHtml: simText('') }), []);
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([400, 300])] }, textHtml: simText(' data-original-width="400,300"') }), []);
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([400])] }, textHtml: simText(' data-original-width="400"') }), ['16.1/section.json figures[sim-ruler]: gives 1 widths for 2 images']);
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([400, 300])] }, textHtml: simText(' data-original-width="300,400"') }), ['16.1/section.json figures[sim-ruler]: gives widths 400,300 and its data-original-width in the text reads "300,400"']);
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([400, 300])] }, textHtml: simText('') }), ['16.1/section.json figures[sim-ruler]: gives widths 400,300, but carries no data-original-width in the text']);
  assert.deepEqual(run(checkWidths, { section: { figures: [{ id: 'sim-ruler', kind: 'sim', number: '16.2', widths: [400] }] }, textHtml: TEXT }), ['16.1/section.json figures[sim-ruler]: gives 1 widths for 0 images'], 'a sim with no originals shows no image');
  assert.deepEqual(run(checkWidths, { section: { figures: [sim([400, 300])] }, textHtml: '' }), [], 'a row with no <figure> is checkFigures’ finding, not this one');
});

test('checkFigureRefs: a figure the prose cites that no row carries is a warning, and a fold carries its numbers', () => {
  const cite = (html: string) => ({ textHtml: `${TEXT}<p>${html}</p>` });
  assert.deepEqual(run(checkFigureRefs, cite('See Figure 16.2.')), []);
  const missing = checkFigureRefs(fixture(cite('See Figures 16.2 and 16.3.')));
  assert.deepEqual(missing.map((f) => f.level), ['warning']);
  assert.deepEqual(said(missing), ['16.1/text.html: cites Figure 16.3, which no figure row of the book carries, so it stays plain text']);
  assert.deepEqual(run(checkFigureRefs, { section: folded(['16.3']), textHtml: `${FOLDED}<p>See Figures 16.2 and 16.3.</p>` }), [], 'a folded number is carried');
  assert.deepEqual(run(checkFigureRefs, cite('<figure class="photo"><figcaption><span class="eyebrow">Figure 16.9</span></figcaption></figure>')), [], 'an eyebrow names its own figure and is no citation');
  assert.deepEqual(errorsOf(checkFigureRefs(fixture(cite('Figure 4.1')))), [], 'a warning is no error');
  assert.deepEqual(citedNumbers('Figure 2.9, Figures 2.10 and 2.9, Example 2.3, <span class="eyebrow">Figure 2.1</span>'), ['2.9', '2.10']);
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

test('checkConcepts: a built concept with no statement, or not exactly one span that introduces it', () => {
  assert.deepEqual(run(checkConcepts), []);
  const bare = { id: 'hookes-law', kind: 'axiom', section: '16.1', name: 'H' };
  assert.deepEqual(run(checkConcepts, { book: { concepts: [bare] } }), ['book.json concepts[hookes-law]: is taught in a built section and has no statement']);
  assert.match(run(checkConcepts, { section: { coverage: [{ span: 'hookes-law', concept: 'hookes-law', verb: 'uses' }] } })[0], /no coverage row introduces it/);
  const twice = [{ span: 'hookes-law', concept: 'hookes-law', verb: 'introduces' }, { span: 'sim-ruler', concept: 'hookes-law', verb: 'introduces' }];
  assert.deepEqual(run(checkConcepts, { section: { coverage: twice } }), ['book.json concepts[hookes-law]: is introduced 2 times (16.1#hookes-law, 16.1#sim-ruler); exactly one span introduces a concept']);
  assert.deepEqual(checkConcepts({ book: bookOf({ concepts: [bare] }), sheets: [], chapters: [{ dto: chapterOf({}), sections: [] }] }), [], 'a concept nobody has built the section for is a placeholder and says none of it');
});

test('checkConceptLinks: a variables row that names no concept', () => {
  assert.deepEqual(run(checkConceptLinks), []);
  const level = UNLINKED_ROWS_ARE_ERRORS ? 'error' : 'warning';
  const found = checkConceptLinks(fixture({ chapter: { variables: [{ sym: 'k', meaning: 'the spring constant', section: '16.1' }, { sym: 'x', concept: 'hookes-law', meaning: 'stretch', section: '16.1' }] } }));
  assert.deepEqual(found.map((f) => f.level), [level]);
  assert.deepEqual(said(found), ['ch16/chapter.json variables[16.1/k]: names no concept']);
});
test('checkConceptNames: two forms of one id and two concepts of one name are errors', () => {
  assert.deepEqual(run(checkConceptNames), []);
  const form = (id: string) => ({ id, latex: 'F' });
  const concepts = [
    { id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke’s law', statement: 'w', terms: ['power'], forms: [form('eq-hooke')] },
    { id: 'spring', kind: 'idea', section: '16.1', name: 'hooke’s law', statement: 'w', terms: ['power'], forms: [form('eq-hooke')] },
  ];
  const found = checkConceptNames(fixture({ book: { concepts } }));
  assert.deepEqual(found.map((f) => [f.level, f.what]), [['error', 'share the form id "eq-hooke"'], ['error', 'share the name "hooke’s law"']], 'a glossary word on two concepts is the book glossing it twice');
});

test('checkPrereqCycles: a loop in the concept map is an error that names it, and a DAG says nothing', () => {
  const edge = (concept: string, prereq: string) => ({ concept, prereq });
  assert.deepEqual(prereqLoops([edge('b', 'a'), edge('c', 'b'), edge('c', 'a')]), []);
  assert.deepEqual(prereqLoops([edge('b', 'a'), edge('c', 'b'), edge('a', 'c'), edge('d', 'c')]), [['a', 'b', 'c', 'a']]);
  assert.deepEqual(prereqLoops([edge('a', 'a')]), [['a', 'a']]);
  assert.equal(prereqLoops([edge('b', 'a'), edge('a', 'b'), edge('y', 'x'), edge('x', 'y')]).length, 2, 'two separate loops are each named');
  assert.deepEqual(run(checkPrereqCycles), []);
  assert.deepEqual(run(checkPrereqCycles, { book: { concept_prereqs: [edge('hookes-law', 'hookes-law')] } }),
    ['book.json concept_prereqs: closes a loop, each concept resting on the one before: hookes-law → hookes-law']);
});
