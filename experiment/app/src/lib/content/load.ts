/* Reads the content tree (book → chapters → sections) from disk into DTOs.
   Runs at build time only. Every path convention lives here. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';
import { zBook, zChapter, zSectionMeta, zExerciseFile, zConceptsFile, zFormulasFile } from './schema';
import type { BookDTO, ChapterDTO, SectionMetaDTO, ExerciseDTO, ConceptsDTO, FormulasDTO, BookManifest, ChapterEntry, SectionEntry } from './schema';
import { prerenderMath } from '../math/prerender';
import { sectionSourceUrl } from './attribution';

export type SectionSource = {
  readonly meta: SectionMetaDTO;
  readonly textHtml: string;        /* article body, local ids, math prerendered */
  readonly figuresJs: string;
  readonly exercises: readonly ExerciseDTO[];
};
export type ChapterTree = { readonly dto: ChapterDTO; readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO; readonly sections: readonly SectionSource[] };
export type BookTree = { readonly dto: BookDTO; readonly chapters: readonly ChapterTree[]; readonly manifest: BookManifest };

const readJson = async <T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> => schema.parse(JSON.parse(await fs.readFile(file, 'utf8')));
const readText = (file: string): Promise<string> => fs.readFile(file, 'utf8');
const exists = (file: string): Promise<boolean> => fs.access(file).then(() => true, () => false);

/* URL conventions: /<book>/<chapterDir>/<section>/ with a fragment, a figure module and chapter data beside it. */
export const sectionUrl = (bookId: string, chapterDir: string, sectionId: string): string => `/${bookId}/${chapterDir}/${sectionId}/`;
const chapterUrl = (bookId: string, chapterDir: string): string => `/${bookId}/${chapterDir}/`;

const loadSection = async (dir: string, macros: BookDTO['macros']): Promise<SectionSource | null> => {
  if (!(await exists(path.join(dir, 'section.json')))) return null;
  const [meta, text, figuresJs, exercises] = await Promise.all([
    readJson(path.join(dir, 'section.json'), zSectionMeta),
    readText(path.join(dir, 'text.html')),
    exists(path.join(dir, 'figures.js')).then((ok) => (ok ? readText(path.join(dir, 'figures.js')) : '')),
    exists(path.join(dir, 'exercises.json')).then((ok) => (ok ? readJson(path.join(dir, 'exercises.json'), zExerciseFile) : { exercises: [] })),
  ]);
  return { meta, textHtml: prerenderMath(text, macros), figuresJs, exercises: exercises.exercises };
};

const loadChapter = async (root: string, dir: string, macros: BookDTO['macros']): Promise<ChapterTree> => {
  const base = path.join(root, dir);
  const [dto, concepts, formulas] = await Promise.all([
    readJson(path.join(base, 'chapter.json'), zChapter),
    readJson(path.join(base, 'concepts.json'), zConceptsFile),
    readJson(path.join(base, 'formulas.json'), zFormulasFile),
  ]);
  const loaded = await Promise.all(dto.sections.map((s) => loadSection(path.join(base, s.id), macros)));
  return { dto, concepts, formulas, sections: loaded.filter((s): s is SectionSource => s !== null) };
};

const manifestOf = (book: BookDTO, chapters: readonly ChapterTree[]): BookManifest => ({
  id: book.id, title: book.title, publisher: book.publisher, authors: book.authors, sourceUrl: book.sourceUrl, copyright: book.copyright, license: book.license, licenseUrl: book.licenseUrl, openstax: book.openstax,
  colors: book.colors, macros: book.macros, symbols: book.symbols, exerciseKinds: book.exerciseKinds,
  chapters: chapters.map((ch): ChapterEntry => ({
    id: ch.dto.id, dir: ch.dto.dir, title: ch.dto.title,
    concepts: `${chapterUrl(book.id, ch.dto.dir)}concepts.json`, formulas: `${chapterUrl(book.id, ch.dto.dir)}formulas.json`,
    sections: ch.dto.sections.map((s): SectionEntry => {
      const built = ch.sections.some((b) => b.meta.id === s.id);
      const url = sectionUrl(book.id, ch.dto.dir, s.id);
      return { id: s.id, title: s.title, built, url, fragment: `${url}doc.html`, figures: `${url}figures.js`, openstax: sectionSourceUrl(book, ch.dto, s.id) };
    }),
  })),
});

export const loadBook = async (root: string, bookId: string): Promise<BookTree> => {
  const dto = await readJson(path.join(root, 'book.json'), zBook);
  if (dto.id !== bookId) throw new Error(`book.json is "${dto.id}", expected "${bookId}"`);
  const chapters = await Promise.all(dto.chapterDirs.map((dir) => loadChapter(root, dir, dto.macros)));
  return { dto, chapters, manifest: manifestOf(dto, chapters) };
};

/* The tree is read once per build. In dev every request reads the files again, so a content edit shows on reload. */
let cached: Promise<BookTree> | null = null;
export const bookTree = (root: string, bookId: string): Promise<BookTree> => (import.meta.env.PROD ? (cached ??= loadBook(root, bookId)) : loadBook(root, bookId));
