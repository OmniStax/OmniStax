import { test } from 'node:test';
import assert from 'node:assert/strict';
import { differentMeaning, otherMeanings, unmarkedRedefinitions, symKey } from '../src/lib/hover/data';
import type { VariableDTO } from '../src/lib/content/schema';

const row = (section: string, sym: string, meaning: string, more: Partial<VariableDTO> = {}): VariableDTO =>
  ({ section, sym, meaning, unit: 'J', type: 'energy', ...more }) as VariableDTO;

const otto = row('15.3', 'W_prime', 'the greater net work output of the Otto cycle with the greater temperature range');
const pump = row('15.5', 'W_prime', 'the portion of the work input that reaches the heat pump after friction takes its share');
const reworded = row('15.6', 'W_prime', 'the net work output of the Otto cycle with the greater temperature range, per cycle');

test('rewordings of one quantity are the same meaning', () => {
  assert.equal(differentMeaning(otto, reworded), false);
});

test('a new quantity under the same key is a different meaning', () => {
  assert.equal(differentMeaning(otto, pump), true);
  assert.equal(differentMeaning(otto, { ...reworded, type: 'power' as VariableDTO['type'] }), true);
});

test('the card names the other meanings of the key in the chapter', () => {
  const vars = [otto, pump, reworded];
  assert.deepEqual(otherMeanings(vars, symKey('W_prime'), '15.5').map((v) => v.section), ['15.3', '15.6']);
  assert.deepEqual(otherMeanings(vars, symKey('W_prime'), '15.3').map((v) => v.section), ['15.5']);
  assert.deepEqual(otherMeanings(vars, symKey('W_prime'), '9.9'), []);
});

test('a later row that says redefines is not reported', () => {
  assert.equal(unmarkedRedefinitions([otto, pump]).length, 1);
  assert.equal(unmarkedRedefinitions([otto, { ...pump, redefines: true }]).length, 0);
});

test('a translated book compares its rows by CJK morphemes, as the source compares words', () => {
  const position = row('2.1', 'x', '位置，相对于所选参考系', { unit: 'm', type: 'position' as VariableDTO['type'] });
  const final = row('2.5', 'x', '末位置', { unit: 'm', type: 'position' as VariableDTO['type'] });
  const range = row('3.4', 'x', '射程，抛体落地点的水平距离', { unit: 'm', type: 'position' as VariableDTO['type'] });
  assert.equal(differentMeaning(position, final), false);
  assert.equal(differentMeaning(position, range), true);
});
