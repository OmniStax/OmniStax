/* Per-block attribution (data-source), the AI mark on a block the AI wrote or translated, NC exercise cards
   (exercises-nc.json) with their check and the BY-SA export, and the practice button of a section with no
   exercises. A fixture book of two sections, tests/fixtures/sourced-book, carries each. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadBook, pageNav } from '../src/lib/content/load';
import { BookSchema, ChapterSchema, SectionSchema, ExercisesNcSchema, isNonCommercial } from '../src/lib/content/schema';
import { blockByline, fragment, markAiBlocks } from '../src/lib/content/fragment';
import { attributionOf, citation, footerHtml, languageName } from '../src/lib/content/attribution';
import { creditsPerBlock, provenanceOf, usedWorks } from '../src/lib/content/provenance';
import { checkContent, checkNcCards, checkProvenance, contentOf, errorsOf } from '../src/lib/content/check';
import type { Check, Content, Finding } from '../src/lib/content/check';
import { isNcFile, withoutNcRows } from '../scripts/export-by-sa';
import { bookDir, bookId } from '../src/lib/types/ids';
import rawBook from './fixtures/sourced-book/book.json' with { type: 'json' };
import rawChapter from './fixtures/sourced-book/ch01/chapter.json' with { type: 'json' };
import rawSection from './fixtures/sourced-book/ch01/1.1/section.json' with { type: 'json' };
import rawNc from './fixtures/sourced-book/ch01/1.1/exercises-nc.json' with { type: 'json' };

const ROOT = bookDir(path.resolve(import.meta.dirname, 'fixtures/sourced-book'));
const TREE = await loadBook(ROOT, bookId('sourced'));
const [S11, S12] = TREE.chapters[0].sections;
const page = (s: typeof S11): string => fragment(TREE.dto, TREE.chapters[0].dto, s, pageNav(TREE, s), 'en');
const footerOf = (html: string): string => /<footer class="footer">[\s\S]*?<\/footer>/.exec(html)![0];

/* ---------- provenance, pure ---------- */

test('provenanceOf reads where each block comes from, who wrote it and what it was translated from', () => {
  const html = '<section id="a" data-source="ods" data-locator="ods:x"><figure id="f" data-source="sdp"></figure></section><section id="b" data-ai="claude-opus-5-5 high" data-translated-from="zh"></section><section id="c"></section><pre data-lang="java" data-ai="m"></pre>';
  assert.deepEqual(provenanceOf(html), [
    { tag: 'section', id: 'a', source: 'ods', locator: 'ods:x' },
    { tag: 'figure', id: 'f', source: 'sdp' },
    { tag: 'section', id: 'b', ai: 'claude-opus-5-5 high', translatedFrom: 'zh' },
  ], 'a block that says nothing, and a code variant’s data-ai, are not provenance');
});

test('usedWorks lists each work once, the text’s first and then the exercises’ origins, with the languages translated from', () => {
  const html = '<section data-source="oiwiki" data-translated-from="zh" data-ai="m"></section><section data-source="ods"></section><section data-source="oiwiki"></section>';
  assert.deepEqual(usedWorks(html, [{ origin: 'exercism' }, { origin: 'ods' }, { origin: undefined }]), [
    { id: 'oiwiki', translatedFrom: ['zh'] }, { id: 'ods', translatedFrom: [] }, { id: 'exercism', translatedFrom: [] },
  ]);
});

test('a book credits per block where its sources rows carry ids, and the ids are on every row or none', () => {
  assert.equal(creditsPerBlock(TREE.dto), true);
  assert.equal(creditsPerBlock({ sources: [{ title: 'Calculus Volume 1', url: 'https://openstax.org/' }] }), false);
  assert.equal(creditsPerBlock({}), false);
  const base = { id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: [] };
  assert.throws(() => BookSchema.parse({ ...base, sources: [{ id: 'a', title: 'A', url: 'https://a.org/' }, { title: 'B', url: 'https://b.org/' }] }), /every row or on none/);
  assert.throws(() => BookSchema.parse({ ...base, sources: [{ id: 'a', title: 'A', url: 'https://a.org/', licence: 'x' }] }), /Unrecognized key/, 'the table is strict');
});

test('a licence is NonCommercial by its NC: CC BY-NC-SA 4.0 is, CC BY-SA 4.0 and MIT are not', () => {
  assert.deepEqual(['CC BY-NC-SA 4.0', 'CC BY-NC 3.0', 'Attribution-NonCommercial', 'CC BY-SA 4.0', 'MIT', undefined].map(isNonCommercial), [true, true, true, false, false, false]);
});

/* ---------- the footer ---------- */

test('the footer of a per-block page credits only the works its blocks and exercises name: author, title, link, licence, adapted', () => {
  const f = footerOf(page(S11));
  assert.match(f, /<li><cite><a href="https:\/\/github.com\/patmorin\/ods">Open Data Structures<\/a><\/cite> by Pat Morin, <a href="https:\/\/creativecommons.org\/licenses\/by\/2.5\/ca\/" rel="license">CC BY 2.5 Canada<\/a>, adapted.<\/li>/);
  assert.match(f, /<li><cite><a href="https:\/\/github.com\/OI-wiki\/OI-wiki">OI Wiki<\/a><\/cite> by OI Wiki Team, <a [^>]*>CC BY-SA 4.0<\/a>, translated from the Chinese and adapted. <span class="notice">With thanks to the <a href="https:\/\/github.com\/OI-wiki\/OI-wiki\/graphs\/contributors">OI Wiki Team and its contributors<\/a>.<\/span><\/li>/, 'a translated work says so, and its notice travels with it');
  assert.match(f, /Exercism problem specifications<\/a><\/cite> by Exercism contributors, Copyright \(c\) 2014 Exercism, <a [^>]*>MIT<\/a>, adapted./, 'an exercise’s origin is credited, with its copyright line');
  assert.match(f, /6\.046J Design and Analysis of Algorithms<\/a><\/cite> by MIT OpenCourseWare, <a href="https:\/\/creativecommons.org\/licenses\/by-nc-sa\/4.0\/" rel="license">CC BY-NC-SA 4.0<\/a>, adapted on exercise cards shared under the same license./, 'and so is an NC card’s, which keeps its licence');
  assert.doesNotMatch(f, /System Design Primer/, 'a work no block names is not credited');
  assert.match(f, /<p>Adapted by OmniStax as part of <cite>A Sourced Book<\/cite> and shared under <a href="https:\/\/creativecommons.org\/licenses\/by-sa\/4.0\/" rel="license">CC BY-SA 4.0<\/a>.<\/p>/);
  assert.match(f, /<p>The text was transformed by Claude Opus 5.5.<\/p>/);
  const f12 = footerOf(page(S12));
  assert.equal((f12.match(/<li>/g) ?? []).length, 1, '1.2 names only ODS');
  assert.doesNotMatch(f12, /translated|OI Wiki|Exercism/);
});

test('a long notice folds under its summary, and the plain citation reads the same credits', () => {
  const mit = 'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute.';
  const book = { ...TREE.dto, sources: TREE.dto.sources!.map((w) => (w.id === 'ods' ? { ...w, notice: `<p>${mit}</p>` } : w)) };
  const a = attributionOf(book, S12.meta, usedWorks(S12.textHtml));
  assert.match(footerHtml(a, 'en'), /adapted.<details class="notice"><summary>License notice<\/summary><p>Permission is hereby granted/);
  assert.equal(citation(a, 'en'), 'Open Data Structures (https://github.com/patmorin/ods) by Pat Morin, CC BY 2.5 Canada, adapted. Adapted by OmniStax as part of A Sourced Book and shared under CC BY-SA 4.0.');
});

test('a book without ids on its works keeps the book-wide credit, whatever its text says', () => {
  const book = { ...TREE.dto, sources: [{ title: 'Open Data Structures', url: 'https://github.com/patmorin/ods' }] };
  const html = footerHtml(attributionOf(book, S11.meta, usedWorks(S11.textHtml)), 'en');
  assert.match(html, /^<footer class="footer"><p>Text from <cite><a href="https:\/\/github.com\/patmorin\/ods">Open Data Structures<\/a><\/cite> by /);
  assert.doesNotMatch(html, /<ul class="credits">/);
});

test('the language a block was translated from is named in the book’s language', () => {
  assert.equal(languageName('zh', 'en'), 'Chinese');
  assert.equal(languageName('zh', 'zh-CN'), '中文');
});

/* ---------- the AI mark on a block ---------- */

test('a block the AI translated wears the mark at the end of its heading, whose hover says it is a translation', () => {
  const html = page(S11);
  const head = /<section id="1\.1-amortized"[^>]*><h2>Amortized analysis(<span class="ai-mark"[^>]*title="([^"]*)"[\s\S]*?<\/span>)<\/h2>/.exec(html);
  assert.ok(head, 'the mark closes the heading');
  assert.equal(head![2], 'Translated from Chinese by Claude Opus 5.5 · high effort');
  assert.doesNotMatch(/<section id="1\.1-arraystack"[\s\S]*?<\/section>/.exec(html)![0], /ai-mark/, 'the source’s own block is unmarked');
  assert.equal((html.match(/class="ai-mark"/g) ?? []).length, 2, 'the lead and the translated block, nothing else');
});

test('a block the AI wrote says generated; one with no heading wears the mark at the end of its first paragraph', () => {
  assert.equal(blockByline('claude-opus-5-5 high', undefined, 'en'), 'Generated by Claude Opus 5.5 · high effort');
  assert.equal(blockByline('claude-opus-5-5', 'zh', 'en'), 'Translated from Chinese by Claude Opus 5.5');
  const out = markAiBlocks('<section id="a" data-ai="claude-opus-5-5 low"><p>One.</p><p>Two.</p></section><section id="b"><p>Three.</p></section>', 'en');
  assert.match(out, /<p>One.<span class="ai-mark"[^>]*title="Generated by Claude Opus 5.5 · low effort"[\s\S]*?<\/span><\/p><p>Two.<\/p>/);
  assert.match(out, /<section id="b"><p>Three.<\/p><\/section>$/);
});

test('a block the AI wrote from a work in another language is a translation from it, unless the block says otherwise', () => {
  const book = { language: 'en', sources: [{ id: 'oiwiki', title: 'OI Wiki', url: 'https://oi-wiki.org/', language: 'zh-CN' }, { id: 'ods', title: 'ODS', url: 'https://ods.org/' }] };
  const html = '<section id="a" data-source="oiwiki" data-ai="claude-opus-5-5 high"><h2>A</h2></section><section id="b" data-source="ods" data-ai="claude-opus-5-5 high"><h2>B</h2></section><section id="c" data-source="oiwiki" data-ai="claude-opus-5-5 high" data-translated-from="ja"><h2>C</h2></section>';
  const titles = [...markAiBlocks(html, 'en', book).matchAll(/title="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(titles, ['Translated from Chinese (China) by Claude Opus 5.5 · high effort', 'Generated by Claude Opus 5.5 · high effort', 'Translated from Japanese by Claude Opus 5.5 · high effort']);
  assert.deepEqual(usedWorks(html, [], book), [{ id: 'oiwiki', translatedFrom: ['zh-CN', 'ja'] }, { id: 'ods', translatedFrom: [] }]);
  assert.deepEqual(usedWorks(html, [], { ...book, language: 'zh' }), [{ id: 'oiwiki', translatedFrom: ['ja'] }, { id: 'ods', translatedFrom: [] }], 'a work in the book’s own language is no translation');
});

/* ---------- NC cards ---------- */

test('a section’s NC cards are read from exercises-nc.json and set after its own, each marked and wearing its origin’s licence', () => {
  assert.deepEqual(S11.exercises.map((e) => [e.id, e.nc ?? false, e.credit?.license]), [['c1', false, 'MIT'], ['nc1', true, 'CC BY-NC-SA 4.0']]);
  assert.deepEqual(S11.exercises[1].concepts, ['amortized']);
  assert.deepEqual(S11.exercises[1].cardLicense, { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' }, 'the card’s own licence line');
  assert.equal(S11.exercises[0].cardLicense, undefined, 'a card of section.json carries none of its own');
  assert.equal(S11.nc?.exercises.length, 1); assert.equal(S12.nc, null);
  assert.throws(() => ExercisesNcSchema.parse({ exercises: [], licence: 'x' }), /Unrecognized key/, 'the file holds its two tables and its licence line, nothing else');
});

/* ---------- practice ---------- */

test('practice this section stands only on a section with exercises', () => {
  assert.match(page(S11), /<div class="section-end"><button type="button" class="practise" data-practise-section="1.1"/);
  const end = /<div class="section-end">([\s\S]*?)<\/div>/.exec(page(S12));
  assert.equal(end?.[1], '', 'the row stays, for the reader’s notes, but holds no button');
});

/* ---------- the content check ---------- */

const said = (findings: readonly Finding[]): readonly string[] => findings.map((f) => `${f.where}: ${f.what}`);
const CONTENT = await contentOf(TREE);
type Edit = { readonly book?: object; readonly text?: string; readonly section?: object; readonly nc?: object | null };
const edited = (e: Edit): Content => {
  const ch = CONTENT.chapters[0], s = ch.sections[0];
  return {
    ...CONTENT,
    book: e.book ? BookSchema.parse({ ...JSON.parse(JSON.stringify(rawBook)), ...e.book }) : CONTENT.book,
    chapters: [{ ...ch, dto: ChapterSchema.parse(rawChapter), sections: [{ ...s, textHtml: e.text ?? s.textHtml, dto: e.section ? SectionSchema.parse({ ...rawSection, ...e.section }) : s.dto, nc: e.nc === undefined ? s.nc : e.nc === null ? null : ExercisesNcSchema.parse(e.nc) }, ch.sections[1]] }],
  };
};
const run = (check: Check, e: Edit = {}): readonly string[] => said(check(edited(e)));

test('the sourced fixture book checks clean', () => {
  assert.deepEqual(said(errorsOf(checkContent(CONTENT))), []);
  assert.deepEqual(run(checkProvenance), []);
  assert.deepEqual(run(checkNcCards), []);
});

test('checkProvenance: every data-source names a row of sources, and a block says where and who', () => {
  const block = (attrs: string) => `<section id="arraystack" ${attrs}><h2>A</h2></section><section id="amortized" data-source="ods"></section>`;
  assert.deepEqual(run(checkProvenance, { text: block('data-source="cpa" data-locator="cpa:x"') }), ['1.1/text.html <section id="arraystack">: data-source="cpa" names no row of book.json sources']);
  assert.deepEqual(run(checkProvenance, { text: block('data-locator="ods:x"') }), ['1.1/text.html <section id="arraystack">: has a data-locator and no data-source', '1.1/text.html: <section id="arraystack" data-locator="ods:x"> names no data-source, so the footer credits no work for it']);
  assert.deepEqual(run(checkProvenance, { text: block('data-source="ods" data-locator="arrays#x"') }), ['1.1/text.html <section id="arraystack">: data-locator="arrays#x" is not in ods\'s scheme ("ods:…")']);
  assert.deepEqual(run(checkProvenance, { text: block('data-source="oiwiki" data-translated-from="zh"') }), ['1.1/text.html <section id="arraystack">: has data-translated-from and no data-ai: a translation names what translated it']);
  assert.deepEqual(run(checkProvenance, { text: block('data-source="oiwiki" data-ai="claude-opus-5-5 huge" data-translated-from="Chinese"') }), [
    '1.1/text.html <section id="arraystack">: data-ai="claude-opus-5-5 huge" is not "<model id>" or "<model id> <low|medium|high|max>"',
    '1.1/text.html <section id="arraystack">: data-translated-from="Chinese" is not a language tag such as zh or zh-CN',
  ]);
  assert.deepEqual(run(checkProvenance, { text: '<section id="arraystack"><h2>A</h2><section id="inner"></section></section><section id="amortized" data-source="ods"></section>' }), ['1.1/text.html: <section id="arraystack"> names no data-source, so the footer credits no work for it'], 'only a top-level block is asked for one');
  const nc = { sources: [...rawBook.sources, { id: 'ocw-notes', title: 'Notes', url: 'https://ocw.mit.edu/', license: 'CC BY-NC-SA 4.0' }] };
  assert.deepEqual(run(checkProvenance, { book: nc, text: block('data-source="ocw-notes" data-locator="ocw-notes:1"') }), ['1.1/text.html <section id="arraystack">: data-source="ocw-notes" is under CC BY-NC-SA 4.0, and NC material stands only on an NC exercise card (exercises-nc.json)']);
});

test('checkProvenance: a book whose works carry no ids may not name one', () => {
  assert.deepEqual(run(checkProvenance, { book: { sources: [{ title: 'ODS', url: 'https://github.com/patmorin/ods' }] }, text: '<section id="arraystack" data-source="ods"></section>' }), ['1.1/text.html <section id="arraystack">: data-source="ods", but book.json sources carry no ids to name', '1.2/text.html <section id="model">: data-source="ods", but book.json sources carry no ids to name']);
});

test('checkNcCards: an NC card names an NC origin, and an NC locator stands nowhere else', () => {
  const card = (o: object) => ({ ...rawNc, exercises: [{ ...rawNc.exercises[0], ...o }] });
  assert.deepEqual(run(checkNcCards, { nc: card({ origin: 'exercism' }) }), ['1.1/exercises-nc.json exercises[nc1]: origin "exercism" is under MIT, not an NC licence; the card belongs in section.json']);
  assert.deepEqual(run(checkNcCards, { nc: card({ origin: undefined }) }), ['1.1/exercises-nc.json exercises[nc1]: names no origin; an NC card names the exercise source whose licence it wears']);
  assert.deepEqual(run(checkNcCards, { nc: card({ id: 'c1', cite: 'nowhere' }) }), [
    '1.1/exercises-nc.json exercises[c1]: has the id of an exercise of section.json',
    '1.1/exercises-nc.json exercises[c1]: cites "nowhere", which is no id of the text',
    '1.1/exercises-nc.json exercise_concepts[nc1 × amortized]: exercise "nc1" names no row',
  ]);
  assert.deepEqual(run(checkNcCards, { nc: { ...rawNc, section: '1.2', license: 'CC BY-SA 4.0' } }), [
    '1.1/exercises-nc.json: section is "1.2", but the file stands in 1.1',
    '1.1/exercises-nc.json: license is CC BY-SA 4.0, and the cards of exercises-nc.json are shared under an NC licence',
  ]);
  const moved = { exercises: [...rawSection.exercises, { ...rawNc.exercises[0], id: 'p9' }] };
  assert.deepEqual(run(checkNcCards, { section: moved }), ['1.1/section.json exercises[p9]: origin "mitocw" is under an NC licence; an NC card lives in exercises-nc.json']);
  assert.deepEqual(run(checkNcCards, { text: `${CONTENT.chapters[0].sections[0].textHtml}<p data-locator="mitocw:ps6">x</p>` }), ['1.1/text.html: holds a locator of mitocw, an NC source, which only an NC card may name']);
  const hinted = { exercises: [{ ...rawSection.exercises[0], prompt: 'As in mitocw:ps6#6-1, push three.' }] };
  assert.deepEqual(run(checkNcCards, { section: hinted }), ['1.1/section.json exercises[c1]: holds a locator of mitocw, an NC source']);
});

test('checkNcCards: a book under an NC licence, or one that credits no works by id, may set NC exercises in section.json', () => {
  const moved = { exercises: [...rawSection.exercises, { ...rawNc.exercises[0], id: 'p9' }] };
  assert.deepEqual(run(checkNcCards, { section: moved, book: { license: 'CC BY-NC-SA 4.0' } }), [], 'an NC book keeps its NC exercises where they stand');
  const plain = { sources: rawBook.sources.map(({ id: _id, ...r }: { id?: string }) => r) };
  assert.deepEqual(run(checkNcCards, { section: moved, book: plain }), [], 'a book with no per-block provenance is not held to the separation');
});

/* ---------- the BY-SA export ---------- */

test('the BY-SA export drops every exercises-nc.json and the NC rows of book.json’s source tables', () => {
  assert.equal(isNcFile('ch01/1.5/exercises-nc.json'), true);
  assert.equal(isNcFile('ch01/1.5/section.json'), false);
  const { book, dropped } = withoutNcRows(rawBook as unknown as Record<string, unknown>);
  assert.deepEqual(dropped, ['mitocw']);
  assert.deepEqual((book.exercise_sources as { id: string }[]).map((r) => r.id), ['exercism']);
  assert.equal((book.sources as unknown[]).length, 3, 'no work of the text is NC');
});
