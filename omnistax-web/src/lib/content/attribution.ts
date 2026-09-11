/* Attribution is one wording, produced in one place from book.json and a
   section's `notes`. The content pipeline never writes it. Every adapted
   article carries it in a footer, because a section is what gets linked to
   and CC 4.0 asks for attribution wherever the work is shared. The footer
   holds all the licence asks for: creators, copyright notice, licence,
   source link, the fact of adaptation, and the adapter's licence. It also
   names the AI the section was built with, by role, from the section's `ai`. */
import type { AiCreditDTO, BookDTO, ChapterDTO, FrontPageRefDTO, SectionMetaDTO } from './schema';

export type Attribution = {
  readonly title: string;
  readonly authors: readonly string[];
  readonly publisher: string;
  readonly publisherUrl?: string;   /* the book at the publisher */
  readonly copyright?: string;      /* holder of the copyright notice, retained as the licence asks */
  readonly sourceUrl?: string;      /* this section at the publisher */
  readonly license: string;
  readonly licenseUrl?: string;
  readonly notes: string;           /* what this section left out, one sentence, from section.json */
  readonly ai?: AiCreditDTO;        /* who transformed the text and who built the simulations, from section.json */
};

/* The publisher's page for a slug: the book's page prefix completed by it, and nothing where either is missing. */
const pageSourceUrl = (book: Pick<BookDTO, 'openstax'>, slug: string | undefined): string | undefined =>
  (book.openstax && slug ? book.openstax + slug : undefined);
/* The publisher's page for a section: the book's page prefix completed by the chapter's slug for it. */
export const sectionSourceUrl = (book: Pick<BookDTO, 'openstax'>, chapter: Pick<ChapterDTO, 'sections'>, sectionId: string): string | undefined =>
  pageSourceUrl(book, chapter.sections.find((s) => s.id === sectionId)?.slug);
/* The publisher's page for a chapter's or the book's own introduction or summary, from the record that names it. */
export const frontPageSourceUrl = (book: Pick<BookDTO, 'openstax'>, page: FrontPageRefDTO | undefined): string | undefined =>
  pageSourceUrl(book, page?.slug);

/* The credit for one page, whichever role it has: the page's own place at the publisher rides on its meta. */
export const attributionOf = (book: BookDTO, meta: Pick<SectionMetaDTO, 'notes' | 'ai' | 'openstax'>): Attribution => ({
  title: book.title, authors: book.authors, publisher: book.publisher, publisherUrl: book.sourceUrl, copyright: book.copyright,
  sourceUrl: meta.openstax, license: book.license, licenseUrl: book.licenseUrl,
  notes: meta.notes, ai: meta.ai,
});

/* One sentence naming the AI, folded when one model did both jobs. */
export const aiSentence = (ai: AiCreditDTO | undefined): string =>
  !ai ? ''
  : ai.text === ai.figures ? `The text was transformed and the simulations were built by ${ai.text}.`
  : `The text was transformed by ${ai.text} and the simulations were built by ${ai.figures}.`;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href: string | undefined, text: string, rel?: string): string =>
  href ? `<a href="${esc(href)}"${rel ? ` rel="${rel}"` : ''}>${text}</a>` : text;
const bare = (url: string): string => url.replace(/^https?:\/\//, '');

/* "A, B and C" */
export const nameList = (names: readonly string[]): string =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/* Plain text, for metadata and for anyone copying the credit on. */
export const citation = (a: Attribution): string => {
  const by = a.authors.length ? ` by ${nameList(a.authors)}` : '';
  const access = a.sourceUrl ? ` Access for free at ${a.sourceUrl}.` : '';
  const holder = a.copyright ? ` © ${a.copyright},` : '';
  const ai = a.ai ? ` ${aiSentence(a.ai)}` : '';
  return `${a.title}${by}, ${a.publisher},${holder} ${a.license}, adapted by OmniStax and shared under the same licence.${access}${ai}`;
};

/* The footer of every adapted article: the credit, the publisher's own
   "access for free" line, the AI the section was built with, and what was
   left out. */
export const footerHtml = (a: Attribution): string => {
  const by = a.authors.length ? ` by ${esc(nameList(a.authors))}` : '';
  const holder = a.copyright ? `, © ${esc(a.copyright)}` : '';
  const credit = `Text from <cite>${esc(a.title)}</cite>${by} (${link(a.publisherUrl, esc(a.publisher))}${holder}), ${link(a.licenseUrl, esc(a.license), 'license')}, adapted by OmniStax and shared under the same licence.`;
  const access = a.sourceUrl ? ` Access for free at ${link(a.sourceUrl, esc(bare(a.sourceUrl)))}.` : '';
  const ai = a.ai ? `<p>${esc(aiSentence(a.ai))}</p>` : '';
  const notes = a.notes ? `<p>${esc(a.notes)}</p>` : '';
  return `<footer class="footer"><p>${credit}${access}</p>${ai}${notes}</footer>`;
};
