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
import { cellNumber } from '../src/lib/content/sheets';
import { isGroup, marked, nextSort, viewRows } from '../src/lib/sheets/table';
import { CHEMISTRY, bookRoot } from './book-on-disk';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

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
  assert.deepEqual(rows.filter((r) => r.kind === 'elements'), [{ id: 'elements', title: 'The Elements', kind: 'elements', file: 'sheets/elements.json' }]);
  assert.equal(rows[0].id, 'elements');
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

/* ---------- the appendices as table sheets ---------- */

/* The converter is a tool of the book, so the test runs it the way a person
   does — over a CNXML fixture cut from Appendix D, with the bundle pointed at
   the fixture — and reads what it wrote. What is asserted is what the markdown
   would have lost: the spanning title row as the table's title, the footnote as
   a note with a marker in its heading, the subscripts and superscripts of a
   formula, and a column of numbers recognised as one. */
const APPENDICES = path.join(ROOT, 'tools', 'appendices.py');

test('the appendix converter reads a CNXML appendix into a table sheet', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'appendix-'));
  const run = spawnSync('python3', [APPENDICES, 'D', '--out', out], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, OMNISTAX_BUNDLE: path.join(import.meta.dirname, 'fixtures', 'appendix', 'modules') },
  });
  assert.equal(run.status, 0, run.stderr);
  const data = SheetDataSchema.parse(JSON.parse(fs.readFileSync(path.join(out, 'constants.json'), 'utf8')));
  if (data.kind !== 'table') throw new Error('the constants sheet is not a table sheet');
  assert.equal(data.generated_by, 'tool');
  assert.deepEqual(data.source, { module: 'm68862', appendix: 'D' });
  assert.equal(data.tables.length, 2);

  const [constants, masses] = data.tables;
  assert.equal(constants.title, 'Fundamental Physical Constants');
  assert.deepEqual(constants.columns.map((c) => c.id), ['name-and-symbol', 'value']);
  assert.equal(constants.columns[1].label, 'Value<sup class="fn">1</sup>');
  assert.deepEqual(constants.notes, ['Every value is the one the book prints.']);
  assert.equal(constants.rows.length, 2);
  assert.equal(constants.rows[0][1], '1.6605402 × 10<sup>−27</sup> kg');
  assert.equal(constants.rows[1][0], 'Boltzmann’s constant (<em>k</em>)');

  assert.equal(masses.title, 'Rest Masses (kg)');
  assert.equal(masses.columns[1].kind, 'number');
  assert.equal(masses.rows[0][0], 'm<sub>e</sub>');
  assert.equal(masses.rows[1][0], '<sub>6</sub><sup>14</sup>C');
  fs.rmSync(out, { recursive: true, force: true });
});

test('every table sheet the book declares reads, and its rows are as wide as its columns', () => {
  const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'book.json'), 'utf8'));
  const rows = (book.sheets as unknown[]).map((r) => SheetSchema.parse(r));
  assert.deepEqual(rows.map((r) => r.id), [
    'elements', 'units', 'constants', 'water', 'acids-bases-commercial', 'thermo', 'ka', 'kb', 'ksp', 'kf', 'potentials', 'half-lives',
  ]);
  const tables = rows.filter((r) => r.kind === 'table');
  assert.equal(tables.length, 11);
  tables.forEach((row) => {
    const data = SheetDataSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, row.file), 'utf8')));
    if (data.kind !== 'table') throw new Error(`${row.id} is not a table sheet`);
    assert.equal(data.id, row.id);
    assert.equal(data.title, row.title);
    assert.ok(data.tables.length > 0, `${row.id} has no table`);
    data.tables.forEach((t) => {
      assert.ok(t.rows.length > 0, `${row.id}/${t.id} has no rows`);
      t.rows.forEach((r) => assert.equal(r.length, t.columns.length, `${row.id}/${t.id} has a ragged row`));
    });
  });
});

test('a ragged row, a repeated id and a cell that is not a number are caught', () => {
  const sheet = {
    kind: 'table' as const, id: 'ksp', title: 'Solubility Products', generated_by: 'tool' as const,
    source: { module: 'm68868', appendix: 'J' },
    tables: [{
      id: 'ksp', title: 'Solubility Products', notes: [],
      columns: [{ id: 'substance', label: 'Substance', kind: 'formula' as const }, { id: 'ksp', label: 'K', kind: 'number' as const }],
      rows: [['AgCl', '1.6 × 10<sup>−10</sup>'], ['AgBr'], ['CaF<sub>2</sub>', 'about 4']],
    }],
  };
  const row = { id: 'ksp', title: 'Solubility Products', kind: 'table' as const, file: 'sheets/ksp.json' };
  const content = { book: { sheets: [] } as never, sheets: [{ row, file: 'x', data: sheet }], chapters: [] } as Content;
  const found = checkSheets(content);
  assert.deepEqual(found.filter((f) => f.level === 'error').map((f) => f.what), ['row 2 has 1 cells and the table has 2 columns']);
  assert.deepEqual(found.filter((f) => f.level === 'warning').map((f) => f.what), ['the K of "CaF2" is "about 4", which is not a number']);
});

/* ---------- what the table page shows ---------- */

test('a search keeps the rows that carry the word, and a numeric column sorts both ways', () => {
  const rows: readonly (readonly string[])[] = [
    ['aluminum', ''],
    ['Al(OH)<sub>3</sub>', '2 × 10<sup>−32</sup>'],
    ['AlPO<sub>4</sub>', '9.84 × 10<sup>−21</sup>'],
    ['barium', ''],
    ['BaCO<sub>3</sub>', '1.6 × 10<sup>−9</sup>'],
  ];
  assert.equal(viewRows(rows, '', null).length, 5);
  assert.deepEqual(viewRows(rows, 'alpo', null), [rows[2]]);
  /* a heading row stands over its own rows, so a search drops it */
  assert.deepEqual(viewRows(rows, 'barium', null), []);
  const up = viewRows(rows, '', { column: 1, dir: 'asc' });
  assert.deepEqual(up.map((r) => r[0]), ['Al(OH)<sub>3</sub>', 'AlPO<sub>4</sub>', 'BaCO<sub>3</sub>']);
  const down = viewRows(rows, '', { column: 1, dir: 'desc' });
  assert.deepEqual(down.map((r) => r[0]), ['BaCO<sub>3</sub>', 'AlPO<sub>4</sub>', 'Al(OH)<sub>3</sub>']);
  assert.equal(isGroup(rows[0]), true);
  assert.equal(isGroup(rows[1]), false);
  assert.deepEqual(nextSort(null, 1), { column: 1, dir: 'asc' });
  assert.deepEqual(nextSort({ column: 1, dir: 'asc' }, 1), { column: 1, dir: 'desc' });
  assert.equal(nextSort({ column: 1, dir: 'desc' }, 1), null);
});

test('a cell reads as a number the way the book prints one, and a formula cell is marked', () => {
  assert.equal(cellNumber('9.84 × 10<sup>−21</sup>'), 9.84 * Math.pow(10, -21));
  assert.equal(cellNumber('+0.7996'), 0.7996);
  assert.equal(cellNumber('162.'), 162);
  assert.equal(cellNumber('—'), null);
  assert.equal(cellNumber('ca 1 × 10<sup>−5</sup>'), null);
  const html = marked('Al(OH)<sub>3</sub>', TABLE);
  assert.match(html, /class="formula"/);
  assert.match(html, /data-formula="Al\(OH\)3"/);
});
