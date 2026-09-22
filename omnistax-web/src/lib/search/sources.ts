/* What the search reads, as one list. The search began as a search of books,
   and a book is still what most of it is about — the concepts, the
   definitions, the formulas and the prose, all of it ranked together by
   `index.ts`. But the reader now owns things that are none of those: the files
   they import, and the chats they hold. Each of those is a corpus of one kind
   of row, found by the words in it and shown in a group of its own, so rather
   than bending the book index around them the view reads a list of sources.

   A source is a kind and its rows. Adding one — the chats, when they land —
   is one more case here and one more group in the view; nothing of the book's
   own search moves to make room. Pure: the stores fetch, this only reads. */
import type { Corpus, Filter, Hit } from './model';
import { find, type Found, type Index } from './index';
import { findInFiles, type FileEntry, type FileHit } from './files';
import { findInChats, type ChatEntry, type ChatHit } from './chats';

export type Source =
  | { readonly kind: 'books'; readonly rows: readonly Corpus[] }
  | { readonly kind: 'files'; readonly rows: readonly FileEntry[] }
  /* One row per message of every chat; a hit opens the chat at its branch. */
  | { readonly kind: 'chats'; readonly rows: readonly ChatEntry[] };

/* What a query found, source by source. The books' own hits keep the shape
   `index.ts` gives them, since the view already knows how to draw one. */
export type Results = { readonly books: Found; readonly files: readonly FileHit[]; readonly chats: readonly ChatHit[] };
export const NOTHING_FOUND: Results = { books: { hits: [], cut: 0 }, files: [], chats: [] };

export const sourceOfKind = <K extends Source['kind']>(sources: readonly Source[], kind: K): Extract<Source, { kind: K }> | undefined =>
  sources.find((s): s is Extract<Source, { kind: K }> => s.kind === kind);

/* The books are asked through their index, which is built once and handed in;
   every other source is a straight read of its rows. A filter that names one
   kind of the book's own things is not about the files, so they stand aside
   for it: the reader asking for formulas is not asking for a page of a PDF. */
export const findAll = (query: string, sources: readonly Source[], index: Index, filter: Filter): Results => {
  const files = sourceOfKind(sources, 'files');
  const chats = sourceOfKind(sources, 'chats');
  /* What the reader was told in a chat is prose as much as a page of a PDF is,
     so the two stand aside for the same filters. */
  const prose = filter === 'all' || filter === 'text';
  return {
    books: find(query, index, filter),
    files: files && prose ? findInFiles(files.rows, query) : [],
    chats: chats && prose ? findInChats(chats.rows, query) : [],
  };
};

/* How many things a query found altogether, which is what the view counts to
   know whether to say that nothing matches. */
export const countFound = (r: Results): number => r.books.hits.length + r.files.length + r.chats.length;

export type { Hit, FileHit, ChatHit };
