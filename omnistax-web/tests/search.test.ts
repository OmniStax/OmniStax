import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, wordsOf } from '../src/lib/sections/search';

/* One thing a view lists: the name it prints and the line beside it. */
type Item = { readonly key: string; readonly text: string };
const ITEMS: readonly Item[] = [
  { key: 'period', text: 'The time one full oscillation takes.' },
  { key: 'simple pendulum', text: 'A mass on a string whose period depends on its length alone.' },
  { key: '\\omega', text: 'angular frequency' },
  { key: 'frequency', text: 'How many oscillations happen in a second.' },
];
const names = (query: string): readonly string[] => search(query, ITEMS, (i) => i).map((f) => f.item.key);

test('a blank query has no words and finds nothing', () => {
  assert.deepEqual(wordsOf('   '), []);
  assert.deepEqual(names(''), []);
  assert.deepEqual(names('  \t '), []);
});
test('a word is found in the key or in the text, case aside, and the key hits come first', () => {
  assert.deepEqual(names('Period'), ['period', 'simple pendulum']);
  assert.deepEqual(names('OSCILLATION'), ['period', 'frequency']);
  assert.deepEqual(search('period', ITEMS, (i) => i).map((f) => f.where), ['key', 'text']);
});
test('every word has to land, across the key and the text together', () => {
  assert.deepEqual(names('pendulum length'), ['simple pendulum']);
  assert.deepEqual(names('pendulum mass string'), ['simple pendulum']);
  assert.deepEqual(names('pendulum second'), []);
});
test('a TeX key is found by its control word with or without the backslash', () => {
  assert.deepEqual(names('\\omega'), ['\\omega']);
  assert.deepEqual(names('omega'), ['\\omega']);
});
test('what is found keeps the order the view lists it in', () => {
  assert.deepEqual(names('e'), ['period', 'simple pendulum', '\\omega', 'frequency']);
});
