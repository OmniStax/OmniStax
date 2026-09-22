/* The picker: one list of everything the reader can point at, opened with `@`
   in a chat composer and with `[[` in the note editor. It is the same list
   either way — the two differ only in what they do with the row chosen, a chip
   in the one and a wiki link in the other — so the rows, the categories and
   the keys that walk them live here, pure, and the component draws what this
   says.

   It stands in two faces. With no category chosen it is the list of
   categories, so a reader who knows they want a figure narrows to figures
   before reading a hundred rows; inside a category it is that category's rows.
   What is typed after the `@` filters whichever face is showing, and when no
   category matches what is typed the rows of every category are searched
   instead, because a reader who types a section number means that section and
   not the word "sections". */
import type { LinkTarget } from '../notes/md/links';
import type { ChipKind } from '../chat/context';

export const CATEGORIES = ['notes', 'drawings', 'files', 'sections', 'figures', 'concepts', 'equations', 'definitions', 'exercises', 'messages'] as const;
export type PickerCategory = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Readonly<Record<PickerCategory, string>> = {
  notes: 'Notes', drawings: 'Drawings', files: 'Files', sections: 'Sections', figures: 'Figures and sims',
  concepts: 'Concepts', equations: 'Equations', definitions: 'Definitions', exercises: 'Exercises', messages: 'Chat messages',
};
/* What a row of each category becomes when it is added to a chat. */
export const CATEGORY_CHIP: Readonly<Record<PickerCategory, ChipKind>> = {
  notes: 'note', drawings: 'drawing', files: 'file', sections: 'section', figures: 'figure',
  concepts: 'concept', equations: 'equation', definitions: 'definition', exercises: 'exercise', messages: 'message',
};

/* One thing that can be pointed at. `target` is the link it writes, which the
   note editor turns into `[[…]]`; `text` is what a chat would show the model,
   and a row whose text is heavy to gather leaves it out and the source is
   asked for it when the row is chosen. */
export type PickerRow = {
  readonly category: PickerCategory;
  readonly key: string;       /* unique within its category */
  readonly label: string;
  readonly detail: string;
  readonly target: LinkTarget;
  readonly embed?: boolean;   /* the note editor writes this row as a card rather than a link */
  readonly text?: string;
};

/* Where the list stands. The words themselves are never held here: they belong
   to the field the reader is typing in, and a second copy of them here would
   have to be kept in step with the first, which is what the effect that once
   did it could not do without writing what it had just read. So the state
   holds only what the list itself decides — which category is open, and where
   the cursor is — beside `mark`, which remembers what stood in the field when
   the category was opened, since the words that named a category are not the
   words inside it and only what is typed after them narrows its rows. */
export type PickerState = { readonly category: PickerCategory | null; readonly mark: string; readonly index: number };
export const open = (): PickerState => ({ category: null, mark: '', index: 0 });

/* What the field says, less whatever named the category. */
export const queryIn = (state: PickerState, field: string): string =>
  field.startsWith(state.mark) ? field.slice(state.mark.length) : field;

/* Every word typed must be somewhere in the row, case aside: the way the
   command palette and the search read a query. */
export const matches = (haystack: string, query: string): boolean => {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w !== '');
  const hay = haystack.toLowerCase();
  return words.every((w) => hay.includes(w));
};

export const categoriesFor = (query: string): readonly PickerCategory[] =>
  CATEGORIES.filter((c) => matches(CATEGORY_LABEL[c], query));

export const rowsIn = (rows: readonly PickerRow[], category: PickerCategory | null, query: string): readonly PickerRow[] =>
  rows.filter((r) => (category === null || r.category === category) && matches(`${r.label} ${r.detail}`, query));

/* What the list shows: the categories, the rows of the one chosen, or — when
   nothing is in a category and no category is named by what is typed — every
   row that matches. */
export type Face =
  | { readonly kind: 'categories'; readonly rows: readonly PickerCategory[] }
  | { readonly kind: 'rows'; readonly rows: readonly PickerRow[] };

export const faceOf = (state: PickerState, all: readonly PickerRow[], field: string): Face => {
  const query = queryIn(state, field);
  if (state.category !== null) return { kind: 'rows', rows: rowsIn(all, state.category, query) };
  const cats = categoriesFor(query);
  if (cats.length > 0 || query.trim() === '') return { kind: 'categories', rows: cats };
  return { kind: 'rows', rows: rowsIn(all, null, query) };
};

export const countOf = (face: Face): number => face.rows.length;

/* The keys. Down and Up walk the list and wrap, Right and Enter go into a
   category, Left comes back out of one, and Escape is the component's. */
export const nextIndex = (index: number, delta: number, count: number): number =>
  count === 0 ? 0 : (index + delta + count * 2) % count;

export const move = (state: PickerState, delta: number, count: number): PickerState =>
  ({ ...state, index: nextIndex(state.index, delta, count) });

/* Going in marks what the field held, so that the rows are narrowed by what is
   typed next and not by the word that named the category; coming out forgets
   the mark, and the whole of what is typed reads the categories again. */
export const into = (category: PickerCategory, field: string): PickerState =>
  ({ category, mark: field, index: 0 });
export const out = (state: PickerState): PickerState =>
  (state.category === null ? state : { category: null, mark: '', index: 0 });

/* Where the reader is: the row or category under the cursor, and nothing when
   the list is empty. */
export const atCursor = (state: PickerState, face: Face): PickerCategory | PickerRow | null =>
  face.rows.length === 0 ? null : (face.rows[Math.min(state.index, face.rows.length - 1)] as PickerCategory | PickerRow);
