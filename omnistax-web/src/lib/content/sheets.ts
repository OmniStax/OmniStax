/* The files a sheet row names. `book.json` says a sheet exists, what it is
   called and which kind of thing it is; this file says what the data behind it
   looks like, one zod object per kind, folded into one discriminated union that
   the loader parses a sheet file by and the shell parses it back off the wire.

   The kinds are an ADT because the tag carries data: an `elements` sheet is the
   periodic table, whose rows the app draws as cells and whose masses the
   formula hover sums, and a `table` sheet is a plain reference table of named
   columns and rows of strings, which the app lists until a later pass draws it.

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

export const TableColumnSchema = z.object({
  id: z.string().describe('The column’s key, which each row’s cells are given under.'),
  label: z.string().describe('The column’s heading as the table prints it.'),
  unit: z.string().optional().describe('The unit every value in the column is in, where they share one.'),
}).strict();
export type TableColumnDTO = z.infer<typeof TableColumnSchema>;

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
    kind: z.literal('table').describe('A plain reference table: named columns and rows of strings, which the app lists until a later pass draws it.'),
    ...SheetBase,
    columns: z.array(TableColumnSchema).describe('The columns of the table, in the order it prints them.'),
    rows: z.array(z.record(z.string())).default([]).describe('The rows, each a record keyed by column id.'),
  }).strict(),
]);
export type SheetDataDTO = z.infer<typeof SheetDataSchema>;
export type ElementsSheetDTO = Extract<SheetDataDTO, { kind: 'elements' }>;
export type TableSheetDTO = Extract<SheetDataDTO, { kind: 'table' }>;
