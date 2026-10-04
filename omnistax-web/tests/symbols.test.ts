import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { prerenderMath } from '../src/lib/math/prerender';
import { kvTypeFromClass, lookupVariable, symKey } from '../src/lib/hover/data';
import { macroExpansion, macrosOf, symbolsOf, withInheritedTypes } from '../src/lib/content/load';
import { BookSchema, ChapterSchema } from '../src/lib/content/schema';
import type { SymbolDTO, VariableDTO } from '../src/lib/content/schema';
import { sectionId, spanId, typeId } from '../src/lib/types/ids';
import { PHYSICS, bookRoot } from './book-on-disk';

/* The table read below is College Physics 2e's own, so it is read from that book by its id. */
const ROOT = await bookRoot(PHYSICS);

/* The book writes one row per symbol and the build derives the macros from it,
   so the tests below read the table and then the derivation, rather than a pair
   of records that could drift apart. A symbol's type is mostly inherited from its
   concept, so the rows are read with their types resolved, as the build reads them. */
const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const stored = BookSchema.parse(readJson('book.json'));
const rows = withInheritedTypes(stored, stored.chapterDirs.map((dir) => ChapterSchema.parse(readJson(path.join(dir, 'chapter.json'))))).book.symbols;
const macros = macrosOf(rows);
const symbols = symbolsOf(rows);
const kMacros = Object.keys(macros).filter((m) => m.startsWith('\\k'));

test('a typed symbol expands to its type and its own key, an untyped one to its plain latex', () => {
  const table: readonly SymbolDTO[] = [
    { sym: 'x', latex: 'x', type: typeId('position'), macro: '\\kx' },
    { sym: 'ω_max', latex: '\\omega_{\\text{max}}', type: typeId('angular-rate'), macro: '\\kwmax' },
    { sym: 'θ', latex: '\\theta' },
  ];
  assert.equal(macroExpansion(table[0]), '\\htmlClass{kv-position}{\\htmlData{sym=x}{x}}');
  assert.equal(macroExpansion(table[2]), '\\theta');
  assert.deepEqual(macrosOf(table), {
    '\\kx': '\\htmlClass{kv-position}{\\htmlData{sym=x}{x}}',
    '\\kwmax': '\\htmlClass{kv-angular-rate}{\\htmlData{sym=ω_max}{\\omega_{\\text{max}}}}',
  });
  assert.deepEqual(symbolsOf(table), { x: '\\kx', 'ω_max': '\\kwmax', 'θ': '\\theta' });
});
test('every macro of the book belongs to a symbol, and no two symbols claim one macro', () => {
  const named = rows.flatMap((s) => (s.macro ? [s.macro] : []));
  assert.deepEqual(named.filter((m, i) => named.indexOf(m) !== i), []);
  assert.deepEqual(kMacros.filter((m) => !named.includes(m)), []);
  /* An untyped symbol's entry is its own LaTeX, which may begin with \k on its
     own account (\kappa), so only a row that claims a macro is held to it. */
  const claimed = new Set(named);
  assert.deepEqual(Object.values(symbols).filter((m) => claimed.has(m) && !(m in macros)), []);
});
test('every \\k macro carries its own key as data-sym inside its type class, unless no variables row gives its symbol a type', () => {
  const keyOf = Object.fromEntries(rows.flatMap((s) => (s.macro ? [[s.macro, s.sym] as const] : [])));
  const inked = new Set(rows.flatMap((s) => (s.macro && s.type === undefined ? [s.macro] : [])));
  const rowed = new Set(stored.chapterDirs.flatMap((dir) => ChapterSchema.parse(readJson(path.join(dir, 'chapter.json'))).variables.map((v) => v.sym)));
  assert.deepEqual([...inked].filter((m) => rowed.has(keyOf[m])), [], 'a symbol some section gives a meaning wears a type book-wide');
  for (const m of kMacros.filter((k) => !inked.has(k))) {
    const html = prerenderMath(`$${m}$`, macros);
    const found = /class="enclosing (kv-[\w-]+)"><span class="enclosing" data-sym="([^"]+)"/.exec(html);
    assert.ok(found, `${m} renders no data-sym: ${html}`);
    assert.equal(found[2], keyOf[m], `${m} carries the wrong key`);
  }
});
test('non-ascii keys survive rendering', () => {
  assert.match(prerenderMath('$\\kdx$', macros), /data-sym="Δx"/);
  assert.match(prerenderMath('$\\kvb$', macros), /data-sym="v̄"/);
});
test('kvTypeFromClass reads the type out of a class list', () => {
  assert.equal(kvTypeFromClass('enclosing kv-position'), 'position');
  assert.equal(kvTypeFromClass('kv-angular-rate enclosing'), 'angular-rate');
  assert.equal(kvTypeFromClass('enclosing'), null);
  assert.equal(kvTypeFromClass('mord mathnormal'), null);
  assert.equal(kvTypeFromClass(''), null);
});
const vars: readonly VariableDTO[] = [
  { sym: 'x', meaning: 'position', unit: 'm', section: sectionId('2.1'), anchor: spanId('2.1-position') },
  { sym: 'x', meaning: 'final position', unit: 'm', section: sectionId('2.5'), anchor: spanId('2.5-notation') },
  { sym: 'Δx', meaning: 'displacement', unit: 'm', section: sectionId('2.1') },
];
test('lookupVariable prefers the section it is given and falls back to the first', () => {
  assert.equal(lookupVariable(vars, symKey('x'))?.section, '2.1');
  assert.equal(lookupVariable(vars, symKey('x'), '2.5')?.meaning, 'final position');
  assert.equal(lookupVariable(vars, symKey('x'), '2.9')?.section, '2.1');
  assert.equal(lookupVariable(vars, symKey('Δx'))?.anchor, undefined);
  assert.equal(lookupVariable(vars, symKey('v')), undefined);
});
