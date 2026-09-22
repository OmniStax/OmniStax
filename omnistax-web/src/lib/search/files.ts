/* The reader's own files as something the search can read. A book comes to the
   search as a corpus of what it names and what it says; an imported PDF names
   nothing, so it is a corpus of one kind of thing only — a page of text — and
   one entry per page is all it takes.

   The text itself is pulled out once, at import, by pdf.js and kept in the
   `text` store beside the blob, so nothing here parses a document: this is
   given the pages and finds words in them. Pure. */
import { excerpt, wordsOf, type Piece } from './model';
import type { FileId } from '../types/ids';

export type FileEntry = { readonly file: FileId; readonly name: string; readonly page: number; readonly text: string };

export type FileHit = {
  readonly kind: 'file';
  readonly file: FileId;
  readonly name: string;
  readonly page: number;
  readonly excerpt: readonly Piece[];
};

/* One entry per page with words on it. A page of a scanned PDF has none, and
   contributes nothing rather than an empty row. */
export const fileEntries = (files: readonly { readonly id: FileId; readonly name: string }[], pagesOf: (id: FileId) => readonly string[] | null): readonly FileEntry[] =>
  files.flatMap((f) => (pagesOf(f.id) ?? []).flatMap((text, i) => (text.trim() ? [{ file: f.id, name: f.name, page: i + 1, text }] : [])));

/* Every word of the query must be on the page, as every word must be in a
   block of the book's prose. The pages come back in reading order, which is
   the order a reader would look through them. `cap` keeps the list readable
   beside the book's own hits. */
export const FILE_CAP = 40;

export const findInFiles = (entries: readonly FileEntry[], query: string, cap = FILE_CAP): readonly FileHit[] => {
  const words = wordsOf(query);
  if (words.length === 0) return [];
  return entries
    .filter((e) => { const text = e.text.toLowerCase(); return words.every((w) => text.includes(w)); })
    .slice(0, cap)
    .map((e) => ({ kind: 'file' as const, file: e.file, name: e.name, page: e.page, excerpt: excerpt(e.text, words) }));
};
