import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import anymatch from 'anymatch';
import { WATCH_IGNORED } from '../src/lib/content/watch';

/* The dev server's watcher (chokidar, through Vite's server.watch.ignored) tests each path against these patterns
   with anymatch; a directory that matches is not descended into. */
const ignored = (p: string): boolean => anymatch([...WATCH_IGNORED], p);
const BOOK = '/home/u/OmniStax/omnistax-content/Data Structures, Algorithms and System Design';

test("a book's fetched sources and script caches are not watched", () => {
  assert.ok(ignored(`${BOOK}/sources/_cache`));
  assert.ok(ignored(`${BOOK}/sources/_cache/jeffe/00-intro.pdf`));
  assert.ok(ignored(`${BOOK}/ch01/1.1/__pycache__/build_spec.cpython-312.pyc`));
});
test("a book's content and its source registry are watched", () => {
  for (const f of ['ch01/1.1/text.html', 'ch01/1.1/figures.js', 'book.json', 'media/ch01/x.png', 'sources/registry.json']) assert.ok(!ignored(`${BOOK}/${f}`), f);
});
test('the dev server is configured with the list', () => {
  const config = fs.readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /watch:\s*\{\s*ignored:\s*\[\.\.\.WATCH_IGNORED\]/);
});
