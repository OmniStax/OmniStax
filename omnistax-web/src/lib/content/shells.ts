/* What a page shell of a book is rendered from, apart from the book: the head
   a page of the book carries and the item the shell opens on it. A built book
   writes its records beside its pages, the store keeps them, and every build
   renders every shell from them with its own bundle (docs/release-plan.md,
   decision 25), so a shell never names an older build's files. */
import { config } from '../../../omnistax.config';
import type { BookTree, ChapterTree, SectionSource, SheetSource } from './load';
import { pageNav } from './load';
import { bookLocale, plainText } from './fragment';
import { attributionOf, citation } from './attribution';
import { bookPagesOf, pageDir, pageLabel, pagesOf } from './roles';
import type { BookManifest } from './schema';
import { bookBase } from './urls';
import { tIn } from '../i18n/index';
import { type ItemId, bookId, docItem, sectionId, sectionRef, sheetId, sheetItem } from '../types/ids';

export type ShellRoute = 'section' | 'intro' | 'summary' | 'sheet';
type ShellBase = {
  readonly route: ShellRoute; readonly params: Readonly<Record<string, string>>;
  readonly url: string; readonly own: ItemId; readonly lang: string; readonly title: string; readonly description: string; readonly license?: string;
};
/* A section, or an introduction or summary: its text is the page's doc.html, beside it. */
export type PageShell = ShellBase & {
  readonly route: 'section' | 'intro' | 'summary';
  readonly pageId: string; readonly chapterDir?: string;
  readonly canonical: string; readonly prev?: string; readonly next?: string; readonly ld: Readonly<Record<string, unknown>>;
};
/* A sheet carries no article, only the heading a reader without JavaScript is owed. */
export type SheetShell = ShellBase & { readonly route: 'sheet'; readonly pool: string };
export type Shell = PageShell | SheetShell;

/* The [...book] route segment: the book's base without its slashes. */
export const segment = (id: string): string => bookBase(id).slice(1, -1);

export const pageShell = (tree: BookTree, chapter: ChapterTree | null, section: SectionSource): PageShell => {
  const book = tree.dto;
  const sec = section.meta;
  /* What the build writes beside the book's words is in the book's language, not the reader's. */
  const locale = bookLocale(book);
  const canonical = new URL(section.url, config.site.baseUrl).href;
  const label = pageLabel(sec, locale);
  /* The lead is swept for math on the way in, so the head's description takes it back to plain text. */
  const description = sec.objectives.join(' ') || plainText(sec.lead) || sec.title;
  const nav = pageNav(tree, section);
  const credit = attributionOf(book, sec);
  const ld = {
    '@context': 'https://schema.org', '@type': 'LearningResource', name: label, description, url: canonical,
    isPartOf: { '@type': 'Book', name: book.title, url: book.sourceUrl, author: book.authors.map((name) => ({ '@type': 'Person', name })), publisher: { '@type': 'Organization', name: book.publisher } },
    isBasedOn: credit.sourceUrl, license: book.licenseUrl ?? book.license, creditText: citation(credit, locale),
    educationalLevel: 'Undergraduate', learningResourceType: tIn(locale, 'content.ld.resourceType'),
    teaches: chapter ? chapter.concepts.concepts.filter((c) => c.section === sec.id && c.status === 'built').map((c) => c.name) : [],
  };
  const route = chapter ? 'section' : section.role === 'summary' ? 'summary' : 'intro';
  return {
    route,
    params: chapter ? { book: segment(book.id), chapter: chapter.dto.dir, section: pageDir(sec.id) } : { book: segment(book.id) },
    url: section.url, own: docItem(sectionRef(bookId(book.id), sectionId(sec.id)), 'text'), lang: tree.manifest.language,
    title: tIn(locale, 'content.pageTitle', { page: label, book: book.title }), description,
    ...(book.licenseUrl ? { license: book.licenseUrl } : {}),
    pageId: sec.id, ...(chapter ? { chapterDir: chapter.dto.dir } : {}),
    canonical, ...(nav.prev ? { prev: nav.prev.url } : {}), ...(nav.next ? { next: nav.next.url } : {}), ld,
  };
};

export const sheetShell = (tree: BookTree, sheet: SheetSource): SheetShell => {
  const m = tree.manifest;
  /* in the book's language, as every page of the book is */
  const locale = bookLocale(m);
  return {
    route: 'sheet', params: { book: segment(m.id), sheet: sheet.row.id },
    url: `${bookBase(m.id)}sheets/${sheet.row.id}/`, own: sheetItem(m.id, sheetId(sheet.row.id)), lang: m.language,
    title: tIn(locale, 'content.pageTitle', { page: sheet.row.title, book: m.title }),
    description: tIn(locale, 'content.sheet.description', { sheet: sheet.row.title, book: m.title }),
    ...(m.licenseUrl ? { license: m.licenseUrl } : {}),
    pool: `<article class="page" data-page="sheet" data-sheet="${sheet.row.id}" hidden><h1>${sheet.row.title}</h1></article>`,
  };
};

/* Every page of a book in reading order with the chapter it is in, then its sheets. */
export const bookPages = (tree: BookTree): readonly { readonly chapter: ChapterTree | null; readonly section: SectionSource }[] => [
  ...(tree.intro ? [{ chapter: null, section: tree.intro }] : []),
  ...tree.chapters.flatMap((chapter) => pagesOf(chapter).map((section) => ({ chapter, section }))),
  ...(tree.summary ? [{ chapter: null, section: tree.summary }] : []),
];
export const bookShells = (tree: BookTree): readonly Shell[] =>
  [...bookPages(tree).map(({ chapter, section }) => pageShell(tree, chapter, section)), ...tree.sheets.map((s) => sheetShell(tree, s))];

/* The same page in every edition of the book that built it, for hreflang: the source and its translations stand at the same place under their own bases. */
export type Edition = { readonly lang: string; readonly href: string };
export const editionsOf = (all: readonly BookManifest[], manifest: BookManifest, shell: PageShell): readonly Edition[] => {
  const family = manifest.translationOf ?? manifest.id;
  return all.filter((m) => (m.translationOf ?? m.id) === family && bookPagesOf(m).some((p) => p.id === shell.pageId && p.built))
    .map((m) => ({ lang: m.language, href: new URL(shell.url.replace(bookBase(manifest.id), bookBase(m.id)), config.site.baseUrl).href }));
};
