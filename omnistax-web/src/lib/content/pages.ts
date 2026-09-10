/* The two standing pages of the site as HTML fragments: the front of OmniStax
   and the front of one book. They are built here, from the manifest, so that
   the same markup can be served on its own (about.html, book.html) and placed
   in the static pool of the page whose URL it is. Everything is a string; no
   DOM is touched and no dependency is added, because this runs at build time.
   Each page is one <article class="page" data-page="…"> that the shell adopts
   as it adopts a section's article. */
import type { BookManifest } from './schema';
import { nameList } from './attribution';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const REPO = 'https://github.com/BlastWind/OmniStax';

/* The count of sections that carry a built document, and of all of them. */
const sectionCounts = (m: BookManifest): { readonly built: number; readonly all: number } => {
  const sections = m.chapters.flatMap((c) => c.sections);
  return { built: sections.filter((s) => s.built).length, all: sections.length };
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/* One textbook, as a card on the front page: what it is, who wrote it, and how
   much of it has been transformed so far. The counts come from the manifest so
   they stay true as chapters are built. */
const bookCard = (m: BookManifest): string => {
  const { built, all } = sectionCounts(m);
  const counts = `${plural(m.chapters.length, 'chapter', 'chapters')}, ${built} of ${plural(all, 'section', 'sections')} built`;
  return `<a class="card" href="/${esc(m.id)}/" data-book="${esc(m.id)}">
      <div class="eyebrow">${esc(m.publisher)}</div>
      <h3>${esc(m.title)}</h3>
      <p class="authors">${esc(m.authors.join(', '))}</p>
      <p class="scope">${esc(counts)}</p>
    </a>`;
};

const GITHUB_MARK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

/* The front of OmniStax: the introduction in the author's own words, the
   repository, a paragraph on the environment itself, then a card per book. */
export const aboutHtml = (manifest: BookManifest): string => `<article class="page" data-page="about">
  <header>
    <h1>OmniStax/万象</h1>
    <p class="intro">OmniStax/万象 (beta) is a next-gen, self-hostable STEM learning platform. It mimics the user experience of programming IDEs, providing a tight, cognitive frictionless experience. As such, I'm calling it the first Integrated Learning Environment (ILE).</p>
    <p class="intro">AI enhances open-source textbooks with interactive simulations. A book is fed into an agent from which the AI processes it section by section. AI also organizes the text by performing natural language tasks like exercise extraction and variable/definition coloring.</p>
    <p class="intro">The following transformed textbooks stand as experiments.</p>
  </header>

  <a class="repo" href="${esc(REPO)}">
    ${GITHUB_MARK}
    <span class="name">BlastWind/OmniStax</span>
  </a>

  <section class="use">
    <h2>How to use it</h2>
    <p>The Explorer on the left holds your textbooks and your notes. A section opens as a tab, and tabs split into groups the way an editor's do, so the concept map, the formulas and the definitions can stand open beside what you are reading. Select a passage to highlight it and, if you like, write an annotation against it. Notes are markdown, they take images and math, and they link to one another, to a section, or to a highlight with <code>[[…]]</code>.</p>
  </section>

  <section class="books">
    <h2>Textbooks</h2>
    ${bookCard(manifest)}
  </section>

  <footer class="footer">
    <p><a href="${esc(REPO)}">Source on GitHub</a>. Each edition is shared under the licence of the book it was adapted from.</p>
  </footer>
</article>`;

/* One section of a book's contents: a link when the section is built, and a
   plain line saying so when it is not. */
const sectionRow = (s: BookManifest['chapters'][number]['sections'][number]): string =>
  s.built
    ? `<li><a href="${esc(s.url)}"><span class="num">${esc(s.id)}</span> ${esc(s.title)}</a></li>`
    : `<li class="off"><span class="num">${esc(s.id)}</span> ${esc(s.title)} <span class="soon">not built yet</span></li>`;

const chapterSection = (c: BookManifest['chapters'][number]): string => `<section class="chapter" data-chapter="${esc(c.dir)}">
      <h2><span class="num">Chapter ${esc(c.id)}</span> ${esc(c.title)}</h2>
      <ol>
        ${c.sections.map(sectionRow).join('\n        ')}
      </ol>
    </section>`;

/* The front of one book: its title, then every chapter and section, each a
   link, closing on the attribution the licence asks for. */
export const bookHtml = (manifest: BookManifest): string => {
  const m = manifest;
  const licence = m.licenseUrl ? `<a href="${esc(m.licenseUrl)}" rel="license">${esc(m.license)}</a>` : esc(m.license);
  const holder = m.copyright ? `, ${esc(m.copyright)}` : '';
  const source = m.sourceUrl ? `\n    <p><a href="${esc(m.sourceUrl)}">The original text at ${esc(m.publisher)}</a></p>` : '';
  return `<article class="page" data-page="book" data-book="${esc(m.id)}">
  <header>
    <div class="eyebrow">${esc(m.publisher)}</div>
    <h1>${esc(m.title)}</h1>
    <p class="lead">${esc(m.authors.join(', '))}</p>
  </header>
  <nav aria-label="Contents">
    ${m.chapters.map(chapterSection).join('\n    ')}
  </nav>
  <footer class="footer">
    <p>Adapted from <cite>${esc(m.title)}</cite> by ${esc(nameList(m.authors))}, published by ${esc(m.publisher)}${holder}. Licensed under ${licence}.</p>${source}
  </footer>
</article>`;
};
