/* Switching to another edition of the book being read: the same page, in the
   other language. The page is the one the focused group shows, where it is a
   page of the book switched from; the other edition keeps every id of its
   source, so that page is opened by the same section id. Where the other
   edition has not built it (a translation in progress), its first built page
   opens instead. The reader's records stay with each book: mastery, highlights
   and notes are per book. */
import { layoutStore } from '../layout/store.svelte';
import { focusedGroup } from '../layout/model';
import { registry } from '../sections/registry.svelte';
import { openDoc } from '../sections/nav.svelte';
import { type BookId, type SectionRef, parseItemKey, sectionId, sectionOfItem, sectionRef } from '../types/ids';
import { library } from './library.svelte';
import { editionPage, otherEditions } from './editions';
import type { LibraryBookDTO } from './library.svelte';

/* The page the focused group shows, where it is a page of a book (a document, a figure or an exercise of it). */
const focusedRef = (): SectionRef | null => {
  const key = focusedGroup(layoutStore.layout).active;
  const id = key === null ? null : parseItemKey(key);
  return id ? sectionOfItem(id) : null;
};
const focusedPageOf = (from: BookId): string | null => { const ref = focusedRef(); return ref && ref.book === from ? String(ref.section) : null; };

/* The editions the book could switch to, from the catalogue; empty until library.load() has fetched it. */
export const editionsToSwitch = (from: BookId): readonly LibraryBookDTO[] => otherEditions(library.books, from);

/* What the palette's "switch language" offers: the book of the focused page and its other editions, or
   nothing where the focused tab is no page of a book or the book has no other edition. Reads only: the
   caller fetches the catalogue (library.load()) outside any derivation. */
export const switchableFrom = (): { readonly from: BookId; readonly to: readonly LibraryBookDTO[] } | null => {
  const ref = focusedRef(); if (!ref) return null;
  const to = editionsToSwitch(ref.book);
  return to.length ? { from: ref.book, to } : null;
};

/* Open `to` where the reader stands in `from`, and take it into their tree.
   Resolves false where `to` is no book of this build or builds no page. */
export const switchEdition = async (from: BookId, to: BookId): Promise<boolean> => {
  const page = focusedPageOf(from);
  const manifest = await registry.ensureBook(to);
  if (!manifest) return false;
  const land = editionPage(manifest, page);
  if (land === null) return false;
  library.add(to, manifest.title);
  await openDoc(sectionRef(to, sectionId(land)), 'text');
  return true;
};
