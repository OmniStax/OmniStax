/* The files a sheet row names. `book.json` says a sheet exists, what it is
   called and which kind of thing it is; this file says what the data behind it
   looks like, one zod object per kind, folded into one discriminated union that
   the loader parses a sheet file by and the shell parses it back off the wire.

   The kinds are an ADT because the tag carries data: an `elements` sheet is the
   periodic table, whose rows the app draws as cells and whose masses the
   formula hover sums, and a `table` sheet is one data appendix of the book:
   its tables, each of named columns and rows of HTML cells, which the app
   draws as searchable, sortable tables.

   Every field carries a description for the same reason the content tables do:
   the meaning of a field is written on the field and nowhere else. */
import { z } from 'zod';

/* ---------- the elements sheet ---------- */

/* What an element is, chemically, which is what the table is shaded and
   filtered by. One value per element, since a cell wears one fill. */
export const ELEMENT_CATEGORIES = [
  'alkali metal', 'alkaline earth metal', 'transition metal', 'post-transition metal',
  'metalloid', 'nonmetal', 'halogen', 'noble gas', 'lanthanide', 'actinide',
] as const;
export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];
/* The three shadings the book prints on the table itself (Appendix A, Figure 2.26). */
export const ELEMENT_CLASSES = ['metal', 'metalloid', 'nonmetal'] as const;
export type ElementClass = (typeof ELEMENT_CLASSES)[number];
/* The subshell the last electron goes into, which is the block of the table the element stands in. */
export const ELEMENT_BLOCKS = ['s', 'p', 'd', 'f'] as const;
export type ElementBlock = (typeof ELEMENT_BLOCKS)[number];
/* What the element is at 25 °C and one atmosphere; "unknown" for the synthetic elements nobody has weighed. */
export const ELEMENT_STATES = ['solid', 'liquid', 'gas', 'unknown'] as const;
export type ElementState = (typeof ELEMENT_STATES)[number];

/* An element's symbol as the periodic table writes it: "H", "Cl", "Na". The
   same alias the drawing layer's palette is keyed by. */
export type ElementSymbol = string & { readonly __brand: 'ElementSymbol' };
export const elementSymbol = (s: string): ElementSymbol => s as ElementSymbol;
/* An atomic number, 1 through 118. */
export type AtomicNumber = number & { readonly __brand: 'AtomicNumber' };
export const atomicNumber = (n: number): AtomicNumber => n as AtomicNumber;

export const ElementSchema = z.object({
  symbol: z.string().describe('The element’s symbol as the table writes it, which is the key everything else looks it up by.'),
  name: z.string().describe('The element’s name in English, as the book spells it.'),
  number: z.number().int().describe('The atomic number: how many protons the nucleus has, and where the element stands in the table.'),
  weight: z.number().describe('The standard atomic weight as a number, which is what a molar mass is summed from; for an element with no stable isotope it is the mass number of its longest-lived one.'),
  weight_label: z.string().describe('The weight as the table prints it, to four significant figures, with a mass number in brackets where the element has no stable isotope.'),
  group: z.number().int().nullable().describe('The column of the table, 1 through 18; nothing for a lanthanide or actinide, which the table prints below.'),
  period: z.number().int().describe('The row of the table, 1 through 7.'),
  block: z.enum(ELEMENT_BLOCKS).describe('The subshell the last electron goes into, which is the block of the table the element stands in.'),
  category: z.enum(ELEMENT_CATEGORIES).describe('What the element is chemically, which is the family the table is coloured and filtered by.'),
  classification: z.enum(ELEMENT_CLASSES).describe('The book’s own three-way shading of the table: metal, metalloid or nonmetal.'),
  state: z.enum(ELEMENT_STATES).describe('What the element is at 25 °C and one atmosphere.'),
  configuration: z.string().describe('The ground-state electron configuration in noble-gas shorthand, written as "[Ar]3d6 4s2".'),
  electronegativity: z.number().nullable().describe('The Pauling electronegativity, or nothing where none is defined.'),
  ionization: z.number().nullable().describe('The first ionization energy in kJ/mol, or nothing where none is measured.'),
  radius: z.number().nullable().describe('The covalent radius in pm, from one consistent source, or nothing where none is known.'),
  discovered: z.number().int().nullable().describe('The year the element was discovered or first made; nothing for the elements known since antiquity.'),
  sections: z.array(z.string()).default([]).describe('The sections of this book that mention the element by name, in reading order.'),
}).strict();
export type ElementDTO = z.infer<typeof ElementSchema>;

/* ---------- a plain reference table ---------- */

/* What a column holds, which is what the page does with it: "number" is sorted
   and set in tabular figures, "formula" carries the same HTML the prose does so
   the formula hover marks it, and "text" is everything else. */
export const TABLE_COLUMN_KINDS = ['text', 'number', 'formula'] as const;
export type TableColumnKind = (typeof TABLE_COLUMN_KINDS)[number];

/* One cell, as the HTML the book prints: plain text, or a formula with its
   <sub> and <sup> exactly as the prose writes it. */
export type TableCell = string & { readonly __brand: 'TableCell' };

export const TableColumnSchema = z.object({
  id: z.string().describe('The column\u2019s key, unique within its table, which the page keys a cell by when it sorts or searches.'),
  label: z.string().describe('The column\u2019s heading as the table prints it, as HTML, since a heading may carry a subscript or a superscript.'),
  unit: z.string().optional().describe('The unit every value in the column is in, where the heading names one.'),
  kind: z.enum(TABLE_COLUMN_KINDS).default('text').describe('What the column holds: a number the page may sort by, a chemical formula the hover marks, or plain text.'),
}).strict();
export type TableColumnDTO = z.infer<typeof TableColumnSchema>;

export const TableBlockSchema = z.object({
  id: z.string().describe('The table\u2019s id, unique within the sheet, which names its heading on the page.'),
  title: z.string().describe('The table\u2019s title as the appendix prints it.'),
  columns: z.array(TableColumnSchema).describe('The columns, in the order the table prints them.'),
  rows: z.array(z.array(z.string())).default([]).describe('The rows, each one cell per column in column order, as HTML.'),
  notes: z.array(z.string()).default([]).describe('The table\u2019s footnotes, in the order they are marked, which the page prints under it.'),
}).strict();
export type TableBlockDTO = z.infer<typeof TableBlockSchema>;

/* Where a table sheet came from: one module of the publisher\u2019s bundle, which is
   one appendix of the book, since a table sheet is the appendix as data. */
export const TableSourceSchema = z.object({
  module: z.string().describe('The publisher\u2019s id for the module the tables were read from.'),
  appendix: z.string().describe('The letter the book prints the appendix under.'),
}).strict();
export type TableSourceDTO = z.infer<typeof TableSourceSchema>;

/* A number as a table cell writes it: a plain decimal, or a coefficient times a
   power of ten with the exponent in a <sup>, which is how the book prints an
   equilibrium constant. Nothing for a cell that is not a number, which is what
   both the sort and the validator ask. */
export const cellNumber = (cell: string): number | null => {
  const text = cell.replace(/<[^>]*>/g, (t) => (/^<\/?sup\b/i.test(t) ? '^' : ' ')).replace(/&minus;|\u2212|\u2013/g, '-').replace(/&nbsp;|\u00a0/g, ' ').trim();
  const power = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:\u00d7|x|\*)\s*10\s*\^\s*([+-]?\d+)\s*\^?$/i.exec(text);
  if (power) return Number(power[1]) * Math.pow(10, Number(power[2]));
  const bare = /^([+-]?(?:\d+\.?\d*|\.\d+))$/.exec(text.replace(/,/g, ''));
  return bare ? Number(bare[1]) : null;
};

/* ---------- one sheet file ---------- */

const SheetBase = {
  id: z.string().describe('The sheet’s id, which must be the id the book’s sheets table names this file under.'),
  title: z.string().describe('The sheet’s title, which must be the title the book’s sheets table gives it.'),
  source: z.string().default('').describe('Where the values came from, in one sentence, since a sheet is reference data and not the book’s own words.'),
  generated_by: z.enum(['tool', 'hand']).default('hand').describe('Whether a tool of the book wrote the file or a person did, so that a later pass knows what it may overwrite.'),
};
export const SheetDataSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('elements').describe('The periodic table: every element the book names, which the app draws as the table and the formula hover sums masses from.'),
    ...SheetBase,
    elements: z.array(ElementSchema).describe('Every element, in order of atomic number.'),
  }).strict(),
  z.object({
    kind: z.literal('table').describe('A plain reference table: one appendix of the book as data, one or more tables of named columns and rows of HTML cells.'),
    ...SheetBase,
    source: TableSourceSchema.describe('The module the tables were read from and the letter the book prints it under, since a table sheet is an appendix as data.'),
    tables: z.array(TableBlockSchema).default([]).describe('The tables of the appendix, in the order it prints them.'),
  }).strict(),
]);
export type SheetDataDTO = z.infer<typeof SheetDataSchema>;
export type ElementsSheetDTO = Extract<SheetDataDTO, { kind: 'elements' }>;
export type TableSheetDTO = Extract<SheetDataDTO, { kind: 'table' }>;
