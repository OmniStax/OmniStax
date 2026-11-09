/* Attribution is one wording, produced in one place from book.json and a
   section's `notes`. The content pipeline never writes it. Every adapted
   article carries it in a footer, because a section is what gets linked to
   and CC 4.0 asks for attribution wherever the work is shared. The footer
   holds all the licence asks for: creators, copyright notice, licence,
   source link, the fact of adaptation, and the adapter's licence. It also
   names the AI the section was built with, by role, from the section's `ai`.
   The words are the book's language, not the reader's: every function that
   writes any takes the book's locale (fragment.ts bookLocale), and the few
   that load.ts also calls default it to en. */
import { type Locale, tIn } from '../i18n/index';
import { aiModelName, isNonCommercial, type AiCreditDTO, type AiMakerDTO, type AiPartDTO, type BookDTO, type ChapterDTO, type FrontPageRefDTO, type SectionMetaDTO } from './schema';
import { type UsedWork, type WorkRow, creditsPerBlock, workRow } from './provenance';

/* One work a page draws on, as its footer credits it: the row's credit, and the languages a passage of it was translated from. */
export type CreditedWork = { readonly row: WorkRow; readonly translatedFrom: readonly string[] };

export type Attribution = {
  readonly title: string;
  readonly authors: readonly string[];
  readonly publisher: string;
  readonly publisherUrl?: string;   /* the book at the publisher */
  readonly sources?: readonly { readonly title: string; readonly url: string }[];   /* the works a book joins, each credited in place of the title */
  readonly copyright?: string;      /* holder of the copyright notice, retained as the licence asks */
  readonly sourceUrl?: string;      /* this section at the publisher */
  readonly license: string;
  readonly licenseUrl?: string;
  readonly notes: string;           /* what this section left out, one sentence, from section.json, swept for math and so already HTML */
  readonly ai?: AiCreditDTO;        /* who transformed the text and who built the simulations, from section.json */
  readonly works?: readonly CreditedWork[];   /* a book that credits per block: the works this page draws on, in place of the book-wide list */
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
/* A book whose works carry ids (provenance.ts) credits per block: `used` is what the page's blocks and exercises
   name, and only those works are credited; a name no row has is the content check's to report, and is left out. */
export const attributionOf = (book: BookDTO, meta: Pick<SectionMetaDTO, 'notes' | 'ai' | 'openstax'>, used: readonly UsedWork[] = []): Attribution => ({
  title: book.title, authors: book.authors, publisher: book.publisher, publisherUrl: book.sources ? undefined : book.sourceUrl, sources: book.sources, copyright: book.copyright,
  sourceUrl: meta.openstax, license: book.license, licenseUrl: book.licenseUrl,
  notes: meta.notes, ai: meta.ai,
  ...(creditsPerBlock(book) ? { works: used.flatMap((u) => { const row = workRow(book, u.id); return row ? [{ row, translatedFrom: u.translatedFrom }] : []; }) } : {}),
});

export type AiPart = AiCreditDTO['text'];
const joinMakers = (part: AiPart, one: (m: AiMakerDTO) => string, locale: Locale): string => part.map(one).join(tIn(locale, 'content.ai.with'));

/* The models of one part by name, the principal first: "Claude Opus 5, with Claude Fable 5.1". */
export const aiNames = (part: AiPart, locale: Locale): string => [...new Set(part.map((m) => aiModelName(m.model)))].join(tIn(locale, 'content.ai.with'));

const makerName = (m: AiMakerDTO, locale: Locale): string =>
  (m.effort ? tIn(locale, 'content.ai.effort', { model: aiModelName(m.model), effort: m.effort }) : aiModelName(m.model));

/* The makers of a part by name and effort, the principal first: "Claude Opus 5.5 · high effort". */
export const aiMakers = (part: AiPart, locale: Locale = 'en'): string => joinMakers(part, (m) => makerName(m, locale), locale);

/* What the AI mark says on hover: "Generated by Claude Opus 5.5 · low effort". */
export const aiByline = (part: AiPart | undefined, locale: Locale = 'en'): string | undefined =>
  part && tIn(locale, 'content.ai.byline', { makers: joinMakers(part, (m) => makerName(m, locale), locale) });

/* What a figure's mark says when the figure keeps its own list: each model and what it did, a line each.
   "Generated by Claude Opus 5 · high effort: scene and controls\nClaude Opus 5.5 · high effort: hand and outline" */
export const aiPartsByline = (parts: readonly AiPartDTO[], locale: Locale = 'en'): string =>
  tIn(locale, 'content.ai.byline', { makers: parts.map((p) => tIn(locale, 'content.ai.part', { maker: makerName(p, locale), part: p.part })).join('\n') });

/* One sentence naming the AI, folded when the same models did both jobs. It stays plain words, since a citation is copied on as text. */
export const aiSentence = (ai: AiCreditDTO | undefined, locale: Locale): string => {
  if (!ai) return '';
  const text = aiNames(ai.text, locale), figures = aiNames(ai.figures, locale);
  if (!ai.figures.length) return tIn(locale, 'content.ai.sentence.text', { text });
  return text === figures ? tIn(locale, 'content.ai.sentence.both', { text })
    : tIn(locale, 'content.ai.sentence.split', { text, figures });
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href: string | undefined, text: string, rel?: string): string =>
  href ? `<a href="${esc(href)}"${rel ? ` rel="${rel}"` : ''}>${text}</a>` : text;
const bare = (url: string): string => url.replace(/^https?:\/\//, '');

/* "A, B and C" */
export const nameList = (names: readonly string[], locale: Locale): string =>
  names.length <= 1 ? names.join('')
    : tIn(locale, 'content.list.and', { rest: names.slice(0, -1).join(tIn(locale, 'content.list.comma')), last: names[names.length - 1] });

/* A language by its name in the book's language: "zh" → "Chinese". */
export const languageName = (tag: string, locale: Locale): string => {
  try { return new Intl.DisplayNames([locale], { type: 'language' }).of(tag) ?? tag; } catch { return tag; }
};
/* What was done to a work: "adapted", or "translated from the Chinese and adapted", or for an NC work the cards it stands on. */
const howAdapted = (w: CreditedWork, locale: Locale): string =>
  isNonCommercial(w.row.license) ? tIn(locale, 'content.credit.nc')   /* an NC work stands only on cards that keep its licence */
  : (w.translatedFrom.length ? tIn(locale, 'content.credit.translated', { language: nameList(w.translatedFrom.map((l) => languageName(l, locale)), locale) }) : tIn(locale, 'content.credit.adapted'));
/* The author a row names: a work's `author`, else an exercise source's. */
const authorOf = (r: WorkRow): string | undefined => r.author;
/* A notice longer than this, in plain text, folds under its summary: an MIT licence text would bury the credits. */
const NOTICE_FOLD = 240;
const plainOf = (html: string): string => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* One work's credit, as the licence asks it: title, author, copyright line, licence and what was done to it. */
const workLine = (w: CreditedWork, locale: Locale, html: boolean): string => {
  const r = w.row, author = authorOf(r);
  const title = html ? `<cite>${link(r.url, esc(r.title))}</cite>` : `${r.title}${r.url ? ` (${r.url})` : ''}`;
  const by = author ? tIn(locale, 'content.credit.by', { authors: html ? esc(author) : author }) : '';
  const holder = r.copyright ? `, ${html ? esc(r.copyright) : r.copyright}` : '';
  const license = r.license ? (html ? link(r.license_url, esc(r.license), 'license') : r.license) : '';
  const line = tIn(locale, license ? 'content.credit.work' : 'content.credit.work.unlicensed', { title, by, holder, license, how: howAdapted(w, locale) });
  if (!html || !r.notice) return line;
  return plainOf(r.notice).length > NOTICE_FOLD
    ? `${line}<details class="notice"><summary>${esc(tIn(locale, 'content.credit.notice'))}</summary>${r.notice}</details>`
    : `${line} <span class="notice">${r.notice}</span>`;
};
/* The adapter's own line: what the page is part of, and the licence OmniStax shares it under. */
const shareLine = (a: Attribution, locale: Locale, html: boolean): string =>
  tIn(locale, 'content.credit.share', { book: html ? `<cite>${esc(a.title)}</cite>` : a.title, license: html ? link(a.licenseUrl, esc(a.license), 'license') : a.license });

/* Plain text, for metadata and for anyone copying the credit on. */
export const citation = (a: Attribution, locale: Locale): string => {
  if (a.works) return [...a.works.map((w) => workLine(w, locale, false)), shareLine(a, locale, false), ...(a.ai ? [aiSentence(a.ai, locale)] : [])].join(' ');
  const by = a.authors.length ? tIn(locale, 'content.credit.by', { authors: nameList(a.authors, locale) }) : '';
  const works = a.sources ? nameList(a.sources.map((w) => `${w.title} (${w.url})`), locale) : a.title;
  const access = a.sourceUrl ? tIn(locale, 'content.credit.access', { url: a.sourceUrl }) : '';
  const holder = a.copyright ? ` © ${a.copyright},` : '';
  const ai = a.ai ? ` ${aiSentence(a.ai, locale)}` : '';
  return tIn(locale, 'content.credit.citation', { works, by, publisher: a.publisher, holder, license: a.license, access, ai });
};

/* The footer of every adapted article: the credit, the publisher's own
   "access for free" line, the AI the section was built with, and what was
   left out. */
export const footerHtml = (a: Attribution, locale: Locale): string => {
  if (a.works) return footerPerBlock(a, a.works, locale);
  const by = a.authors.length ? tIn(locale, 'content.credit.by', { authors: esc(nameList(a.authors, locale)) }) : '';
  const holder = a.copyright ? `, © ${esc(a.copyright)}` : '';
  const works = a.sources ? nameList(a.sources.map((w) => `<cite>${link(w.url, esc(w.title))}</cite>`), locale) : `<cite>${esc(a.title)}</cite>`;
  const credit = tIn(locale, 'content.credit.footer', { works, by, publisher: link(a.publisherUrl, esc(a.publisher)), holder, license: link(a.licenseUrl, esc(a.license), 'license') });
  const access = a.sourceUrl ? tIn(locale, 'content.credit.access', { url: link(a.sourceUrl, esc(bare(a.sourceUrl))) }) : '';
  const ai = a.ai ? `<p>${esc(aiSentence(a.ai, locale))}</p>` : '';
  const notes = a.notes ? `<p>${a.notes}</p>` : '';   /* swept for math on the way in, so it is set as it stands */
  return `<footer class="footer"><p>${credit}${access}</p>${ai}${notes}</footer>`;
};

/* The footer of a book that credits per block: each work the page draws on, a line each, then the
   adapter's line, the AI and what was left out. A page that names no work credits the book alone. */
const footerPerBlock = (a: Attribution, works: readonly CreditedWork[], locale: Locale): string => {
  const list = works.length ? `<ul class="credits">${works.map((w) => `<li>${workLine(w, locale, true)}</li>`).join('')}</ul>` : '';
  const ai = a.ai ? `<p>${esc(aiSentence(a.ai, locale))}</p>` : '';
  const notes = a.notes ? `<p>${a.notes}</p>` : '';
  return `<footer class="footer">${list}<p>${shareLine(a, locale, true)}</p>${ai}${notes}</footer>`;
};
