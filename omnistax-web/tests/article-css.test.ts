/* The article's own rules in global.css that a book's text leans on: a plain <pre> scrolls inside the column, and
   footnote markers standing together are kept apart. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('a plain listing in the article scrolls rather than running past the column', () => {
  assert.match(css, /article pre\{[^}]*overflow-x:auto/);
  assert.match(css, /article pre\{[^}]*max-width:100%/);
});

test('footnote markers side by side are separated by a comma', () => {
  assert.match(css, /sup\.fn \+ sup\.fn::before\{content:","\}/);
});
