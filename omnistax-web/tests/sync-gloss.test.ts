/* A synced file's lines glossed with the names of the reader's things they hold by key. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glossOf, type OwnKind } from '../src/lib/sync/gloss';

const names: Record<string, string> = { 'note:5f2y0vbb': 'chemistry-2e 1.2 · Exercise 1', 'chat:abcd1234': 'Why mass?' };
const nameOf = (kind: OwnKind, id: string): string | undefined => names[`${kind}:${id}`];

test('a key in a line reads as the name of what it names', () => {
  assert.equal(glossOf('        "note:5f2y0vbb",', nameOf), 'chemistry-2e 1.2 · Exercise 1');
  assert.equal(glossOf('["note:5f2y0vbb", "chat:abcd1234"]', nameOf), 'chemistry-2e 1.2 · Exercise 1, Why mass?');
});

test('a line with no key, or a key nothing answers to, is left alone', () => {
  assert.equal(glossOf('  "folder": "k3j2h1g0",', nameOf), null);
  assert.equal(glossOf('"note:zzzzzzzz"', nameOf), null);
  assert.equal(glossOf('"denote:5f2y0vbb"', nameOf), null);
});

test('the name is asked for each time, so a rename shows at once', () => {
  const live = { name: 'Before' };
  const ask = (): string => live.name;
  assert.equal(glossOf('"note:5f2y0vbb"', ask), 'Before');
  live.name = 'After';
  assert.equal(glossOf('"note:5f2y0vbb"', ask), 'After');
});
