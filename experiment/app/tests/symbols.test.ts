import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { prerenderMath } from '../src/lib/math/prerender';
import { kvTypeFromClass, lookupVariable, symKey } from '../src/lib/hover/data';
import { macroExpansion, macrosOf, symbolsOf } from '../src/lib/content/load';
import { SymbolSchema } from '../src/lib/content/schema';
import type { SymbolDTO, VariableDTO } from '../src/lib/content/schema';
import { sectionId, spanId, typeId } from '../src/lib/types/ids';

/* The book writes one row per symbol and the build derives the macros from it,
   so the tests below read the table and then the derivation, rather than a pair
   of records that could drift apart. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const book = JSON.parse(fs.readFileSync(path.join(root, 'book.json'), 'utf8')) as { symbols: unknown };
const rows = z.array(SymbolSchema).parse(book.symbols);
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
  assert.deepEqual(Object.values(symbols).filter((m) => m.startsWith('\\k') && !(m in macros)), []);
});
test('every \\k macro carries its own key as data-sym inside its type class', () => {
  const keyOf = Object.fromEntries(rows.flatMap((s) => (s.macro ? [[s.macro, s.sym] as const] : [])));
  for (const m of kMacros) {
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
