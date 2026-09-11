import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import { loadBook, pageNav } from '../src/lib/content/load';
import { fragment, qualifyIds } from '../src/lib/content/fragment';
import { aboutHtml, bookHtml } from '../src/lib/content/pages';
import { sectionOfUrl } from '../src/lib/content/urls';
import { checkContent, checkPages, checkAnchors, contentOf, errorsOf } from '../src/lib/content/check';
import type { Content } from '../src/lib/content/check';
import { bookPagesOf, neighboursOf, pageDir, pageId, pageLabel, pageRoleOf, pagesOf } from '../src/lib/content/roles';

/* ---------- the roles, pure ---------- */

test('a page id is the section number as it is, or the role qualified by its chapter, or bare for the book', () => {
  assert.equal(pageId('2.1', '2'), '2.1');
  assert.equal(pageId('intro', '2'), '2.intro');
  assert.equal(pageId('summary', '16'), '16.summary');
  assert.equal(pageId('intro', undefined), 'intro');
  assert.deepEqual(['2.1', '2.intro', '16.summary', 'intro', 'summary'].map(pageRoleOf), ['section', 'intro', 'summary', 'intro', 'summary']);
  assert.deepEqual(['2.1', '2.intro', 'summary'].map(pageDir), ['2.1', 'intro', 'summary'], 'the folder is the number or the role');
  assert.equal(pageLabel({ id: '2.1', title: 'Displacement' }), '2.1 Displacement');
  assert.equal(pageLabel({ id: '2.intro', title: 'Introduction to Kinematics' }), 'Introduction to Kinematics', 'the book prints no number on an introduction');
});

test('the pages of a chapter and of a book come in reading order, the introduction first and the summary last', () => {
  assert.deepEqual(pagesOf({ intro: 'i', sections: ['a', 'b'], summary: 's' }), ['i', 'a', 'b', 's']);
  assert.deepEqual(pagesOf({ sections: ['a'] }), ['a']);
  assert.deepEqual(bookPagesOf({ intro: 'p', chapters: [{ intro: 'i', sections: ['a'] }, { sections: ['b'], summary: 's' }], summary: 'z' }), ['p', 'i', 'a', 'b', 's', 'z']);
});

test('the neighbours of a page are the ones either side of it in the list, and a page the list lacks has none', () => {
  const is = (x: string) => (p: string) => p === x;
  assert.deepEqual(neighboursOf(['a', 'b', 'c'], is('b')), { prev: 'a', next: 'c' });
  assert.deepEqual(neighboursOf(['a', 'b', 'c'], is('a')), { next: 'b' }, 'nothing before the first');
  assert.deepEqual(neighboursOf(['a', 'b', 'c'], is('c')), { prev: 'b' }, 'nothing after the last');
  assert.deepEqual(neighboursOf(['a'], is('a')), {});
  assert.deepEqual(neighboursOf(['a', 'b'], is('z')), {});
});

/* ---------- the schema ---------- */

test('an introduction record is a section record with the literal id, read by the app under its chapter', () => {
  const intro = SectionSchema.parse({ id: 'intro', chapter: '2', title: 'Introduction', built: '2026-09-11' });
  assert.equal(intro.id, '2.intro'); assert.equal(intro.role, 'intro'); assert.equal(intro.lead, '');
  const preface = SectionSchema.parse({ id: 'intro', title: 'Preface', built: '2026-09-11' });
  assert.equal(preface.id, 'intro'); assert.equal(preface.chapter, undefined, 'the book’s own page belongs to no chapter');
  const section = SectionSchema.parse({ id: '2.1', chapter: '2', title: 'Displacement', built: '2026-09-11' });
  assert.equal(section.id, '2.1'); assert.equal(section.role, 'section');
});
test('a chapter and a book name their own pages by module and slug, and the old scalar is refused', () => {
  const ch = ChapterSchema.parse({ id: '2', dir: 'ch02', title: 'K', intro: { module: 'm42122', slug: '2-introduction' } });
  assert.deepEqual(ch.intro, { module: 'm42122', slug: '2-introduction' }); assert.equal(ch.summary, undefined);
  assert.equal('summary' in ch, false, 'a page the chapter does not print is no key at all');
  assert.throws(() => ChapterSchema.parse({ id: '2', dir: 'ch02', title: 'K', intro_module: 'm42122' }), /Unrecognized key/);
  const book = BookSchema.parse({ id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: [], intro: { module: 'm42955', slug: 'preface' } });
  assert.deepEqual(book.intro, { module: 'm42955', slug: 'preface' });
});

/* ---------- the loader, on a fixture book with a preface and a chapter introduction ---------- */

const ROOT = path.resolve(import.meta.dirname, 'fixtures/framed-book');
const TREE = await loadBook(ROOT, 'framed');
const M = TREE.manifest;

test('the tree and the manifest carry the front pages beside the sections, built and addressed', () => {
  assert.equal(TREE.intro?.meta.id, 'intro'); assert.equal(TREE.intro?.role, 'intro'); assert.equal(TREE.summary, undefined);
  const ch = TREE.chapters[0];
  assert.equal(ch.intro?.meta.id, '2.intro'); assert.deepEqual(ch.sections.map((s) => s.meta.id), ['2.1'], 'the sections stay the sections');
  assert.deepEqual(bookPagesOf(M).map((p) => p.id), ['intro', '2.intro', '2.1', '2.2']);
  assert.deepEqual(M.intro && [M.intro.built, M.intro.url, M.intro.fragment, M.intro.openstax], [true, '/framed/intro/', '/framed/intro/doc.html', 'https://example.org/pages/preface']);
  assert.deepEqual(M.chapters[0].intro && [M.chapters[0].intro.url, M.chapters[0].intro.openstax, M.chapters[0].intro.exercises], ['/framed/ch02/intro/', 'https://example.org/pages/2-introduction-to-kinematics', []]);
  assert.equal(M.chapters[0].sections[0].url, '/framed/ch02/2.1/');
  assert.equal(M.chapters[0].summary, undefined);
});
test('a figure the introduction keeps is linked from a section that cites it, across the chapter', () => {
  assert.match(TREE.chapters[0].sections[0].textHtml, /<a class="figref" href="#2\.intro-fig-bird" data-figref="2\.1">Figure 2\.1<\/a>/);
  assert.equal(qualifyIds('<a href="#2.intro-fig-bird">x</a><a href="#local">y</a>', '2.1'), '<a href="#2.intro-fig-bird">x</a><a href="#2.1-local">y</a>', 'a link qualified by another page is left alone');
});
test('the front page’s article has the book’s words and nothing invented, and no problem set beside it', () => {
  const ch = TREE.chapters[0];
  const html = fragment(TREE.dto, ch.dto, ch.intro!, pageNav(TREE, ch.intro!));
  assert.match(html, /<article data-doc="2\.intro\/text" data-sec="2\.intro" data-chapter="ch02" data-title="Introduction to Kinematics"/);
  assert.match(html, /<div class="eyebrow">Chapter 2 · Kinematics<\/div>/);
  assert.doesNotMatch(html, /<p class="lead">/, 'an empty lead prints no line');
  assert.doesNotMatch(html, /data-doc="2\.intro\/exercises"/);
  assert.doesNotMatch(html, /class="section-end"/);
  assert.match(html, /Access for free at <a href="https:\/\/example.org\/pages\/2-introduction-to-kinematics">/);
  assert.match(html, /<p>The trailer is left out.<\/p><\/footer>/);
  const preface = fragment(TREE.dto, null, TREE.intro!, pageNav(TREE, TREE.intro!));
  assert.match(preface, /<article data-doc="intro\/text" data-sec="intro" data-title="Preface"/);
  assert.doesNotMatch(preface, /data-chapter=/, 'the book’s own page belongs to no chapter');
  assert.match(preface, /<div class="eyebrow">A Framed Book<\/div>/);
});
test('a section’s summary stands at the end of its text, math rendered, before the way on to practice', () => {
  const ch = TREE.chapters[0];
  const html = fragment(TREE.dto, ch.dto, ch.sections[0], pageNav(TREE, ch.sections[0]));
  const summary = html.indexOf('<section class="summary" id="2.1-section-summary"><h2>Section summary</h2>');
  assert.ok(summary > html.indexOf('</section>'), 'after the last span');
  assert.ok(summary < html.indexOf('class="section-end"'), 'before the practise row');
  assert.match(html.slice(summary), /class="katex"/, 'the summary’s math is prerendered');
  assert.doesNotMatch(html.slice(summary, html.indexOf('class="section-end"')), /\$\\Delta/, 'and no dollar is left');
});
test('the front of the book lists the preface before the chapters and the introduction before 2.1', () => {
  const html = bookHtml(M);
  const at = (s: string) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('href="/framed/intro/">Preface</a>') < at('Chapter 2'));
  assert.ok(at('href="/framed/ch02/intro/">Introduction to Kinematics</a>') < at('href="/framed/ch02/2.1/"'));
  assert.match(html, /<li class="front"><a href="\/framed\/ch02\/intro\/">Introduction to Kinematics<\/a><\/li>/, 'no number on an introduction');
  assert.match(aboutHtml(M), /1 chapter, 1 of 2 sections built/, 'the count is of sections');
});
test('every text ends on the way to the page before and the page after, across the book, and only to pages that are built', () => {
  const ch = TREE.chapters[0];
  assert.deepEqual(pageNav(TREE, TREE.intro!), { next: { url: '/framed/ch02/intro/', label: 'Introduction to Kinematics' } }, 'the preface has nothing before it');
  assert.deepEqual(pageNav(TREE, ch.intro!), { prev: { url: '/framed/intro/', label: 'Preface' }, next: { url: '/framed/ch02/2.1/', label: '2.1 Displacement' } }, 'a chapter’s introduction goes back to the book’s own page');
  assert.deepEqual(pageNav(TREE, ch.sections[0]), { prev: { url: '/framed/ch02/intro/', label: 'Introduction to Kinematics' } }, '2.2 is not built, so 2.1 has no way on');
  const html = fragment(TREE.dto, ch.dto, ch.intro!, pageNav(TREE, ch.intro!));
  const nav = /<nav class="page-nav" aria-label="[^"]+">([\s\S]*?)<\/nav>/.exec(html);
  assert.ok(nav, 'the row stands in the text');
  assert.equal(nav![1], '<a class="prev" rel="prev" href="/framed/intro/"><span class="eyebrow">Previous</span><span class="name">Preface</span></a><a class="next" rel="next" href="/framed/ch02/2.1/"><span class="eyebrow">Next</span><span class="name">2.1 Displacement</span></a>');
  assert.ok(html.indexOf('<nav class="page-nav"') < html.indexOf('<footer class="footer">'), 'above the credit');
  const section = fragment(TREE.dto, ch.dto, ch.sections[0], pageNav(TREE, ch.sections[0]));
  assert.ok(section.indexOf('class="section-end"') < section.indexOf('<nav class="page-nav"'), 'after the practise row');
  assert.doesNotMatch(section, /class="next"/);
  assert.doesNotMatch(section.slice(section.indexOf('data-doc="2.1/exercises"')), /page-nav/, 'the problem set carries no row of its own');
  assert.doesNotMatch(fragment(TREE.dto, ch.dto, ch.sections[0], {}), /page-nav/, 'a page with no neighbour prints no row');
});
test('a link to a front page opens as a tab like a link to a section', () => {
  assert.equal(sectionOfUrl(M, '/framed/ch02/intro/'), '2.intro');
  assert.equal(sectionOfUrl(M, '/framed/intro'), 'intro');
  assert.equal(sectionOfUrl(M, '/framed/ch02/summary/'), null);
});

/* ---------- the validator ---------- */

const CONTENT = await contentOf(TREE);
const said = (c: Content) => errorsOf(checkContent(c)).map((f) => `${f.where}: ${f.what}`);
/* The fixture with one page's record changed, the rest as read. */
const withIntro = (o: object): Content => { const ch = CONTENT.chapters[0]; return { ...CONTENT, chapters: [{ ...ch, intro: { ...ch.intro!, dto: SectionSchema.parse({ id: 'intro', chapter: '2', title: 'I', built: 'd', figures: ch.intro!.dto.figures, ...o }) } }] }; };

test('the fixture passes every check, empty lead and all', () => {
  assert.deepEqual(said(CONTENT), []);
});
test('checkPages: an introduction page carries none of a section’s apparatus', () => {
  assert.deepEqual(said(withIntro({ objectives: ['Know things'] })), ['2.intro/section.json: is an introduction page and carries objectives, which belongs to a section']);
  assert.deepEqual(said(withIntro({ summary_html: '<p>s</p>' })), ['2.intro/section.json: is an introduction page and carries summary_html, which belongs to a section']);
  const ex = { id: 'p1', source_id: 'fs-1', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'p', answer: { type: 'open' } };
  assert.ok(said(withIntro({ exercises: [ex] })).some((s) => /carries exercises, which belongs to a section/.test(s)));
  assert.deepEqual(said(withIntro({ lead: 'A line the book never wrote.' })), [], 'a lead is allowed, only never required');
});
test('checkPages: an introduction page must be named by the chapter or the book that keeps it, and name that chapter', () => {
  const ch = CONTENT.chapters[0];
  const unnamed: Content = { ...CONTENT, chapters: [{ ...ch, dto: { ...ch.dto, intro: undefined } }] };
  assert.deepEqual(said(unnamed), ['2.intro/section.json: is the intro of chapter 2, which names no intro of its own']);
  assert.deepEqual(said(withIntro({ chapter: '3' })), ['3.intro/section.json: belongs to chapter 2 and names chapter "3"']);
  const strayed: Content = { ...CONTENT, intro: { ...CONTENT.intro!, dto: SectionSchema.parse({ id: 'intro', chapter: '2', title: 'Preface', built: 'd' }) } };
  assert.deepEqual(said(strayed), ['2.intro/section.json: belongs to the book and names chapter "2"']);
});
test('checkPages: a section has a lead and a chapter; only a front page may go without', () => {
  const ch = CONTENT.chapters[0];
  const section = (o: object): Content => ({ ...CONTENT, chapters: [{ ...ch, sections: [{ ...ch.sections[0], dto: SectionSchema.parse({ ...JSON.parse(JSON.stringify({ id: '2.1', chapter: '2', title: 'D', lead: 'l', built: 'd', coverage: ch.sections[0].dto.coverage, exercises: ch.sections[0].dto.exercises, exercise_concepts: ch.sections[0].dto.exerciseConcepts })), ...o }) }] }] });
  assert.deepEqual(checkPages(section({ lead: '' })).map((f) => f.what), ['is a section and has no lead']);
  assert.deepEqual(checkPages(section({ chapter: undefined })).map((f) => f.what), ['is a section and names no chapter']);
  const taken: Content = { ...CONTENT, chapters: [{ ...ch, sections: [{ ...ch.sections[0], textHtml: `${ch.sections[0].textHtml}<section id="section-summary"></section>` }] }] };
  assert.deepEqual(checkPages(taken).map((f) => f.what), ['carries the id "section-summary", which the build keeps for the section summary']);
});
test('checkAnchors: a chapter table may not anchor into an introduction page', () => {
  const ch = CONTENT.chapters[0];
  const anchored: Content = { ...CONTENT, chapters: [{ ...ch, dto: { ...ch.dto, variables: [{ sym: 'x', meaning: 'm', unit: 'm', section: '2.1' as never, anchor: '2.intro-motion' as never }] } }] };
  assert.deepEqual(checkAnchors(anchored).map((f) => f.what), ['anchors "2.intro-motion", but an introduction or summary page carries no anchors']);
});
