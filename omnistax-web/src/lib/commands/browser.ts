/* The Open browser's two trees, written as the @ picker's nodes so that the
   walk and the search are the picker's own (lib/picker/model). To open: the
   picker's OmniBooks and Files, walked down to a section, a note, a drawing or
   an imported file, each of which opens; nothing below a section is listed,
   since a section opens its text. To pick: one book's chapters and sections,
   standing for a place in the book a view can be pinned to. Pure, so the trees
   are testable without a DOM. */
import { type BookId, type SectionId, bookId, sectionId, sectionRef, chapterId, docItem, drawingId, drawingItem, fileId, fileItem, itemKey, noteId, noteItem } from '../types/ids';
import type { PickerCategory, PickerNode, PickerRow } from '../picker/model';
import type { Target } from '../sections/scope';   /* type only: scope.ts reads BookTree from here */

/* What the tree needs of the book; the manifest (content/schema) is assignable to it.
   A section's figures and exercises are optional, since a tree may be described without them. */
export type FigureNode = { readonly id: string; readonly label: string };
export type ExerciseNode = { readonly id: string; readonly kind: string };
export type SectionNode = { readonly id: string; readonly title: string; readonly built: boolean; readonly figures?: readonly FigureNode[]; readonly exercises?: readonly ExerciseNode[] };
/* A chapter's introduction and summary, where it keeps them, are pages beside its sections and are named here so a scope can find the chapter of one; the tree lists only the sections. */
export type ChapterNode = { readonly id: string; readonly title: string; readonly intro?: SectionNode; readonly sections: readonly SectionNode[]; readonly summary?: SectionNode };
export type BookTree = { readonly id: BookId; readonly title: string; readonly chapters: readonly ChapterNode[]; readonly exerciseKinds?: Readonly<Record<string, string>> };

/* Opening a file, or picking the place a view stands at. */
export type Mode = 'open' | 'pick';
/* Where the list stands when it opens, and the row it stands on there. */
export type Start = { readonly path: readonly string[]; readonly select: string | null };

/* ── opening ───────────────────────────────────────────────────────────── */

const OPENS: ReadonlySet<PickerCategory> = new Set(['sections', 'notes', 'drawings', 'files']);
const WALKS: ReadonlySet<PickerCategory> = new Set(['books', 'chapters', 'folders']);
/* The picker's tree cut down to what opens: a book, a chapter and a folder are
   only walked into, a section, a note, a drawing and a file are only opened,
   and everything else the picker can point at is left out. */
export const openTree = (nodes: readonly PickerNode[]): readonly PickerNode[] =>
  nodes.flatMap((n): readonly PickerNode[] => {
    const c = n.row?.category;
    if (c && OPENS.has(c)) return [{ key: n.key, label: n.label, detail: n.detail, row: n.row }];
    const below = n.children;
    if ((c && !WALKS.has(c)) || !below) return [];
    return [{ key: n.key, label: n.label, detail: n.detail, children: () => openTree(below()), load: n.load }];
  });
/* The tab a row of the open tree opens. */
export const tabOfRow = (row: PickerRow): string | null => {
  const t = row.target;
  if (row.category === 'sections' && t?.kind === 'section' && t.book) return itemKey(docItem(sectionRef(bookId(t.book), sectionId(t.section)), 'text'));
  if (row.category === 'notes') return itemKey(noteItem(noteId(row.key)));
  if (row.category === 'drawings') return itemKey(drawingItem(drawingId(row.key)));
  if (row.category === 'files') return itemKey(fileItem(fileId(row.key)));
  return null;
};

/* ── picking ───────────────────────────────────────────────────────────── */

export const chapterKey = (id: string): string => `ch:${id}`;
export const sectionKey = (id: string): string => `sec:${id}`;
export const BOOK_KEY = 'book';
const named = (id: string, title: string): string => `${id} ${title}`;
const pickRow = (category: PickerCategory, key: string, label: string): PickerRow => ({ category, key, label, detail: '' });
/* A chapter's detail counts every section it lists; when some are not yet built it says how many of them stand. */
const chapterDetail = (c: ChapterNode): string => {
  const total = c.sections.length; const built = c.sections.filter((s) => s.built).length;
  return built === total ? `${total} section${total === 1 ? '' : 's'}` : `${built} of ${total} sections`;
};
/* A section is a place to stand only once it is built; until then it is listed, dim, and names nothing. */
const pickSection = (s: SectionNode): PickerNode => {
  const label = named(s.id, s.title);
  return s.built ? { key: sectionKey(s.id), label, detail: '', row: pickRow('sections', s.id, label) } : { key: sectionKey(s.id), label, detail: 'not yet built' };
};
/* The whole book above its chapters, and each chapter above its sections. */
export const pickTree = (tree: BookTree): readonly PickerNode[] => [
  { key: BOOK_KEY, label: 'Whole book', detail: '', row: pickRow('books', tree.id, 'Whole book') },
  ...tree.chapters.map((c): PickerNode => {
    const label = named(c.id, c.title);
    return { key: chapterKey(c.id), label, detail: chapterDetail(c), row: pickRow('chapters', c.id, label), children: () => c.sections.map(pickSection) };
  }),
];
/* The place in the book a picked row stands for. */
export const pickTarget = (tree: BookTree, row: PickerRow): Target | null =>
  row.category === 'books' ? { level: 'book', book: tree.id }
    : row.category === 'chapters' ? { level: 'chapter', book: tree.id, chapter: chapterId(row.key) }
      : row.category === 'sections' ? { level: 'section', book: tree.id, section: sectionId(row.key) }
        : null;

/* ── where it opens ────────────────────────────────────────────────────── */

const pagesOf = (c: ChapterNode): readonly SectionNode[] => [...(c.intro ? [c.intro] : []), ...c.sections, ...(c.summary ? [c.summary] : [])];
/* Beside the section being read, else at the top: to open, among its chapter's
   sections under OmniBooks and the book; to pick, among its chapter's sections. */
export const start = (tree: BookTree, focused: SectionId | null, mode: Mode): Start => {
  const c = focused === null ? undefined : tree.chapters.find((x) => pagesOf(x).some((s) => s.id === focused));
  if (!c || focused === null) return { path: [], select: null };
  return mode === 'pick' ? { path: [chapterKey(c.id)], select: sectionKey(focused) } : { path: ['books', tree.id, c.id], select: focused };
};
