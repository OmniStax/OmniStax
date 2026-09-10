import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionOfUrl } from '../src/lib/content/urls';
import type { BookManifest, SectionEntry } from '../src/lib/content/schema';

/* A book of two chapters, one section of which was never built. */
const section = (id: string, dir: string, built: boolean): SectionEntry => ({
  id, title: id, built, url: `/college-physics-2e/${dir}/${id}/`,
  fragment: `/college-physics-2e/${dir}/${id}/doc.html`, figuresJs: `/college-physics-2e/${dir}/${id}/figures.js`,
  figures: [], binds: [], exercises: [],
});
const chapter = (id: string, dir: string, sections: readonly SectionEntry[]) =>
  ({ id, dir, title: id, colors: {}, concepts: '', formulas: '', sections });
const MANIFEST = {
  id: 'college-physics-2e', title: 'College Physics', publisher: 'OpenStax', authors: [], license: 'CC BY',
  types: {}, pool: [], macros: {}, symbols: {}, exerciseKinds: {},
  chapters: [
    chapter('2', 'ch02', [section('2.1', 'ch02', true), section('2.2', 'ch02', false)]),
    chapter('16', 'ch16', [section('16.4', 'ch16', true)]),
  ],
} as unknown as BookManifest;

test('a built section is found by the path of its page, with or without the last slash', () => {
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.1/'), '2.1');
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.1'), '2.1');
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch16/16.4/'), '16.4');
});

test('everything else is nobody: an unbuilt section, a chapter, a front page, another book', () => {
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.2/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/other-book/ch02/2.1/'), null);
});
