/* What a table sheet's page does to its rows: search, sort, and the two things
   the book's own tables carry that a plain grid does not — a row that is a
   heading over the rows below it, and a cell that is a chemical formula.

   Everything here is a pure function of the sheet and the reader's query, so
   the component holds two pieces of state (the query and the sort) and draws
   whatever these return. Nothing touches the DOM: a formula is marked by
   rewriting the cell's HTML, the same pass the prose is marked by, so a cell
   opens the same formula card a paragraph does. */
import { cellNumber } from '../content/sheets';
import type { TableBlockDTO, TableColumnDTO } from '../content/sheets';
import { wrapFormulas, type ElementTable } from './formula';
import { IN_BLOCK } from '../hover/terms';

/* One row as the sheet writes it: one cell of HTML per column, in column order. */
export type Row = readonly string[];
export type SortDir = 'asc' | 'desc';
/* Which column the reader sorted by and which way; nothing for a table in the book's own order. */
export type Sort = { readonly column: number; readonly dir: SortDir };

/* A cell as text, which is what a search reads and never what the page draws. */
export const plain = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

/* A row the book prints as a heading inside the table — "aluminum" above the
   aluminium compounds of Appendix J — is the row whose first cell alone is filled. */
export const isGroup = (row: Row): boolean => row.length > 1 && row[0] !== '' && row.slice(1).every((c) => c === '');

/* Only a column of numbers is sorted: a column of formulas has no order the book means. */
export const sortable = (column: TableColumnDTO): boolean => column.kind === 'number';

const hit = (row: Row, needle: string): boolean => row.some((c) => plain(c).toLowerCase().includes(needle));

/* The rows the page draws. A search or a sort both break the book's grouping —
   a heading row would stand over rows that are no longer its own — so the
   heading rows are kept only while the table is whole and in its own order. */
export const viewRows = (rows: readonly Row[], query: string, sort: Sort | null): readonly Row[] => {
  const needle = query.trim().toLowerCase();
  const found = needle === '' ? rows : rows.filter((r) => hit(r, needle) && !isGroup(r));
  if (sort === null) return found;
  const value = (r: Row): number | null => cellNumber(r[sort.column] ?? '');
  const rank = (a: number | null, b: number | null): number => (a === null ? 1 : b === null ? -1 : sort.dir === 'asc' ? a - b : b - a);
  return found.filter((r) => !isGroup(r)).map((r, i) => ({ r, i })).sort((x, y) => rank(value(x.r), value(y.r)) || x.i - y.i).map((x) => x.r);
};

/* The next sort when a heading is clicked: a column sorts up, then down, then
   the table goes back to the order the book prints it in. */
export const nextSort = (sort: Sort | null, column: number): Sort | null => {
  if (sort === null || sort.column !== column) return { column, dir: 'asc' };
  return sort.dir === 'asc' ? { column, dir: 'desc' } : null;
};

/* A cell with its formulas marked, where the book declares an elements sheet
   and it has arrived; the cell's own HTML until then, never a blank. */
export const marked = (html: string, table: ElementTable): string => (table.size === 0 ? html : wrapFormulas(html, table, IN_BLOCK));

/* How many rows a table has, said in the page's own words. */
export const rowCount = (table: TableBlockDTO, shown: number): string =>
  (shown === table.rows.length ? `${table.rows.length} rows` : `${shown} of ${table.rows.length} rows`);
