import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prerenderMath } from '../src/lib/math/prerender';
import { kvTypeFromClass, lookupVariable, symKey } from '../src/lib/hover/data';
import type { VariableDTO } from '../src/lib/content/schema';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const book = JSON.parse(fs.readFileSync(path.join(root, 'book.json'), 'utf8')) as { macros: Record<string, string>; symbols: Record<string, string> };
const kMacros = Object.keys(book.macros).filter((m) => m.startsWith('\\k'));

test('every \\k macro has a symbol key and every macro-backed key has a macro', () => {
  const backed = Object.values(book.symbols).filter((m) => m.startsWith('\\k'));
  assert.deepEqual(kMacros.filter((m) => !backed.includes(m)), []);
  assert.deepEqual(backed.filter((m) => !(m in book.macros)), []);
});
test('every \\k macro carries its own key as data-sym inside its type class', () => {
  const keyOf = Object.fromEntries(Object.entries(book.symbols).map(([k, m]) => [m, k]));
  for (const m of kMacros) {
    const html = prerenderMath(`$${m}$`, book.macros);
    const found = /class="enclosing (kv-[\w-]+)"><span class="enclosing" data-sym="([^"]+)"/.exec(html);
    assert.ok(found, `${m} renders no data-sym: ${html}`);
    assert.equal(found[2], keyOf[m], `${m} carries the wrong key`);
  }
});
test('non-ascii keys survive rendering', () => {
  assert.match(prerenderMath('$\\kdx$', book.macros), /data-sym="Δx"/);
  assert.match(prerenderMath('$\\kvb$', book.macros), /data-sym="v̄"/);
});
test('kvTypeFromClass reads the type out of a class list', () => {
  assert.equal(kvTypeFromClass('enclosing kv-position'), 'position');
  assert.equal(kvTypeFromClass('kv-angular-rate enclosing'), 'angular-rate');
  assert.equal(kvTypeFromClass('enclosing'), null);
  assert.equal(kvTypeFromClass('mord mathnormal'), null);
  assert.equal(kvTypeFromClass(''), null);
});
const vars: readonly VariableDTO[] = [
  { sym: 'x', meaning: 'position', unit: 'm', section: '2.1', anchor: '2.1-position' },
  { sym: 'x', meaning: 'final position', unit: 'm', section: '2.5', anchor: '2.5-notation' },
  { sym: 'Δx', meaning: 'displacement', unit: 'm', section: '2.1' },
];
test('lookupVariable prefers the section it is given and falls back to the first', () => {
  assert.equal(lookupVariable(vars, symKey('x'))?.section, '2.1');
  assert.equal(lookupVariable(vars, symKey('x'), '2.5')?.meaning, 'final position');
  assert.equal(lookupVariable(vars, symKey('x'), '2.9')?.section, '2.1');
  assert.equal(lookupVariable(vars, symKey('Δx'))?.anchor, undefined);
  assert.equal(lookupVariable(vars, symKey('v')), undefined);
});
