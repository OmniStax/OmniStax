import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionSourceUrl, attributionOf, footerHtml, citation, nameList, attributionUrl } from '../src/lib/content/attribution';
import type { BookDTO, ChapterDTO } from '../src/lib/content/schema';

const book: BookDTO = {
  id: 'college-physics-2e', title: 'College Physics 2e', publisher: 'OpenStax', authors: ['Paul Peter Urone', 'Roger Hinrichs'],
  sourceUrl: 'https://openstax.org/details/books/college-physics-2e', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  openstax: 'https://openstax.org/books/college-physics-2e/pages/', chapterDirs: ['ch02'], colors: {}, macros: {}, symbols: {}, exerciseKinds: {},
};
const chapter: ChapterDTO = { id: '2', dir: 'ch02', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', slug: '2-1-displacement' }, { id: '2.2', title: 'Vectors' }] };

test('nameList joins like prose', () => {
  assert.equal(nameList([]), ''); assert.equal(nameList(['A']), 'A'); assert.equal(nameList(['A', 'B']), 'A and B'); assert.equal(nameList(['A', 'B', 'C']), 'A, B and C');
});
test('section source url needs both the prefix and a slug', () => {
  assert.equal(sectionSourceUrl(book, chapter, '2.1'), 'https://openstax.org/books/college-physics-2e/pages/2-1-displacement');
  assert.equal(sectionSourceUrl(book, chapter, '2.2'), undefined);
  assert.equal(sectionSourceUrl({ openstax: undefined }, chapter, '2.1'), undefined);
});
test('footer carries author, publisher, licence, access line, long-form link and notes', () => {
  const a = attributionOf(book, chapter, { id: '2.1', notes: 'Problems 2 and 4 are left out.' });
  const html = footerHtml(a);
  assert.match(html, /^<footer class="footer">/);
  assert.match(html, /<cite>College Physics 2e<\/cite> by Paul Peter Urone and Roger Hinrichs/);
  assert.match(html, /<a href="https:\/\/openstax.org\/details\/books\/college-physics-2e">OpenStax<\/a>/);
  assert.match(html, /<a href="https:\/\/creativecommons.org\/licenses\/by-nc-sa\/4.0\/" rel="license">CC BY-NC-SA 4.0<\/a>/);
  assert.match(html, /shared under the same licence/);
  assert.match(html, /Access for free at <a href="https:\/\/openstax.org\/books\/college-physics-2e\/pages\/2-1-displacement">openstax.org\/books\/college-physics-2e\/pages\/2-1-displacement<\/a>\./);
  assert.match(html, new RegExp(`<a href="${attributionUrl('college-physics-2e')}">What Omnia changed</a>`));
  assert.match(html, /<p>Problems 2 and 4 are left out.<\/p><\/footer>$/);
});
test('footer without optional fields still reads', () => {
  const html = footerHtml(attributionOf({ ...book, authors: [], sourceUrl: undefined, licenseUrl: undefined, openstax: undefined }, chapter, { id: '2.1', notes: '' }));
  assert.match(html, /<cite>College Physics 2e<\/cite> \(OpenStax\), CC BY-NC-SA 4.0,/);
  assert.doesNotMatch(html, /Access for free/);
  assert.doesNotMatch(html, /<p><\/p>/);
});
test('footer escapes content fields', () => {
  const html = footerHtml(attributionOf({ ...book, title: 'A <b>' }, chapter, { id: '2.1', notes: 'x < y & "z"' }));
  assert.match(html, /<cite>A &lt;b&gt;<\/cite>/); assert.match(html, /x &lt; y &amp; &quot;z&quot;/);
});
test('citation is plain text with the access line', () => {
  assert.equal(citation(attributionOf(book, chapter, { id: '2.1', notes: '' })),
    'College Physics 2e by Paul Peter Urone and Roger Hinrichs, OpenStax, CC BY-NC-SA 4.0, adapted by Omnia and shared under the same licence. Access for free at https://openstax.org/books/college-physics-2e/pages/2-1-displacement.');
});
