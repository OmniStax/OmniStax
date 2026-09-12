import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SheetSchema } from '../src/lib/content/schema';
import { SheetDataSchema } from '../src/lib/content/sheets';
import { checkSheets, type Content } from '../src/lib/content/check';
import { wrapFormulas, findFormulas, molarMass, parseComposition, compositionAttr, elementSymbol, type ElementTable } from '../src/lib/sheets/formula';
import { cellsOf, passes, rangeOf, rampAt, NO_FILTERS, tableOf } from '../src/lib/sheets/elements';
import { IN_BLOCK } from '../src/lib/hover/terms';
import { CHEMISTRY, bookRoot } from './book-on-disk';

/* The recogniser resolves a symbol against the book's own table, so the tests
   read the sheet the book ships rather than a table written here. */
const ROOT = await bookRoot(CHEMISTRY);
const SHEET = SheetDataSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'sheets', 'elements.json'), 'utf8')));
if (SHEET.kind !== 'elements') throw new Error('the elements sheet is not an elements sheet');
const TABLE: ElementTable = tableOf(SHEET);

/* ---------- the sheet itself ---------- */

test('the book declares one elements sheet and the file it names is that sheet', () => {
  const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'book.json'), 'utf8'));
  const rows = (book.sheets as unknown[]).map((r) => SheetSchema.parse(r));
  assert.deepEqual(rows, [{ id: 'elements', title: 'The Elements', kind: 'elements', file: 'sheets/elements.json' }]);
  assert.equal(SHEET.id, 'elements');
  assert.equal(SHEET.generated_by, 'tool');
  assert.equal(SHEET.elements.length, 118);
});

test('a sheet row whose file will not read is an error, and one that disagrees with its file is caught', () => {
  const row = { id: 'elements', title: 'The Elements', kind: 'elements' as const, file: 'sheets/elements.json' };
  const content = (sheets: Content['sheets']): Content => ({ book: { sheets: [] } as never, sheets, chapters: [] });
  const missing = checkSheets(content([{ row, file: 'x', data: null, error: 'ENOENT' }]));
  assert.equal(missing.length, 1);
  assert.equal(missing[0].level, 'error');
  assert.match(missing[0].what, /does not read/);
  const quiet = { ...SHEET, elements: SHEET.elements.map((e) => ({ ...e, sections: [] })) };
  const wrongTitle = checkSheets(content([{ row, file: 'x', data: { ...quiet, title: 'Elements' } }]));
  assert.deepEqual(wrongTitle.map((f) => f.level), ['warning']);
  const twice = checkSheets(content([{ row, file: 'x', data: quiet }, { row, file: 'x', data: quiet }]));
  assert.deepEqual(twice.map((f) => f.level), ['error']);
});

/* ---------- the table the page draws ---------- */

test('every element has a cell, the strips stand below the table, and no two cells collide', () => {
  const cells = cellsOf(SHEET.elements);
  assert.equal(cells.length, 118);
  assert.equal(cells.filter((c) => c.row > 7).length, 30);
  const h = cells.find((c) => c.element.symbol === 'H')!;
  assert.deepEqual([h.column, h.row], [1, 1]);
  const he = cells.find((c) => c.element.symbol === 'He')!;
  assert.deepEqual([he.column, he.row], [18, 1]);
  const ce = cells.find((c) => c.element.symbol === 'Ce')!;
  assert.deepEqual([ce.column, ce.row], [5, 8]);
  assert.equal(new Set(cells.map((c) => `${c.column}/${c.row}`)).size, 118);
});

test('a trend runs from the least value to the greatest, and an element without one is left unfilled', () => {
  const r = rangeOf(SHEET.elements, 'electronegativity')!;
  assert.equal(r.hi, 3.98);
  assert.equal(rampAt(r.hi, r), 1);
  assert.equal(rampAt(null, r), null);
});

test('the search finds an element by name, by symbol and by number', () => {
  const iron = SHEET.elements.find((e) => e.symbol === 'Fe')!;
  assert.ok(passes(iron, { ...NO_FILTERS, query: 'iron' }));
  assert.ok(passes(iron, { ...NO_FILTERS, query: 'Fe' }));
  assert.ok(passes(iron, { ...NO_FILTERS, query: '26' }));
  assert.ok(!passes(iron, { ...NO_FILTERS, query: 'neon' }));
  assert.ok(!passes(iron, { ...NO_FILTERS, groups: new Set([1]) }));
  assert.ok(passes(iron, { ...NO_FILTERS, blocks: new Set(['d']), states: new Set(['solid']) }));
});

/* ---------- the recogniser ---------- */

const found = (html: string): string[] => {
  const out = wrapFormulas(html, TABLE, IN_BLOCK);
  return [...out.matchAll(/data-formula="([^"]*)"/g)].map((m) => m[1]);
};

test('a formula is found however the text sets its counts, charges, groups and hydrates', () => {
  assert.deepEqual(found('<p>water, H<sub>2</sub>O, is everywhere</p>'), ['H2O']);
  assert.deepEqual(found('<p>lime, Ca(OH)<sub>2</sub></p>'), ['Ca(OH)2']);
  assert.deepEqual(found('<p>the sulfate ion SO<sub>4</sub><sup>2−</sup> in water</p>'), ['SO42−']);
  assert.deepEqual(found('<p>blue vitriol, CuSO<sub>4</sub>·5H<sub>2</sub>O</p>'), ['CuSO4·5H2O']);
  assert.deepEqual(found('<p>a table salt of NaCl and a gas of CO</p>'), ['NaCl', 'CO']);
  assert.deepEqual(found('<p>mercury(II) oxide, HgO, and Fe<sub>2</sub>O<sub>3</sub></p>'), ['HgO', 'Fe2O3']);
  assert.deepEqual(found('<p>carbon dioxide, CO2, dissolves</p>'), ['CO2']);
  assert.deepEqual(found('<p>it burns to CO<sub>2</sub>(g) at once</p>'), ['CO2(g)']);
});

test('a bare symbol, a word in capitals and anything under a link, a heading or math is not a formula', () => {
  assert.deepEqual(found('<p>the volume V and the temperature T rise</p>'), []);
  assert.deepEqual(found('<p>In the beginning. No, not at all. As before.</p>'), []);
  assert.deepEqual(found('<p>watch it OF ON PV IT, a FCV, and mercury(II) oxide</p>'), []);
  assert.deepEqual(found('<p>Nothing, Sodium, Water, Carbon, Chapter 3</p>'), []);
  assert.deepEqual(found('<p><a href="#x">H<sub>2</sub>O</a></p>'), []);
  assert.deepEqual(found('<p><span class="katex"><span class="katex-html">H2O</span></span></p>'), []);
  assert.deepEqual(found('<h2>H<sub>2</sub>O</h2>'), []);
});

test('the wrapper keeps the markup it wraps, and a second pass changes nothing', () => {
  const once = wrapFormulas('<p>water, H<sub>2</sub>O, is everywhere</p>', TABLE, IN_BLOCK);
  assert.match(once, /<span class="formula" data-formula="H2O" data-composition="H:2,O:1" tabindex="0">H<sub>2<\/sub>O<\/span>/);
  assert.equal(wrapFormulas(once, TABLE, IN_BLOCK), once);
});

test('a formula in a table cell of the book is marked like one in the prose', () => {
  assert.deepEqual(found('<li>NH<sub>4</sub><sup>+</sup> and NO<sub>3</sub><sup>−</sup></li>'), ['NH4+', 'NO3−']);
});

test('what a formula is made of, and what it weighs', () => {
  const [f] = findFormulas('H{2}O', TABLE);
  assert.deepEqual([...f.atoms], [{ symbol: elementSymbol('H'), count: 2 }, { symbol: elementSymbol('O'), count: 1 }]);
  const mass = molarMass(f.atoms, TABLE)!;
  assert.equal(Math.round(mass.total * 100) / 100, 18.02);
  assert.match(mass.working, /2 × 1.008 \+ 16 = 18.02 g\/mol/);
  assert.deepEqual(parseComposition(compositionAttr(f.atoms)), [...f.atoms]);
  const hydrate = findFormulas('CuSO{4}·5H{2}O', TABLE)[0];
  assert.equal(Math.round((molarMass(hydrate.atoms, TABLE)?.total ?? 0) * 10) / 10, 249.7);
});
