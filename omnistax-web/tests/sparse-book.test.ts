/* A book need not write symbols or declare categories: one without symbols, and
   one without categories, load and colour as any other, every count and every
   rule simply empty. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadBook } from '../src/lib/content/load';
import { bookDir, bookId } from '../src/lib/types/ids';
import { assignInOrder, assignSmart, pageNearest } from '../src/lib/colours/assign';
import { fixedOf, pagesOfBook } from '../src/lib/colours/counts';
import { NO_CHOICES, bookReferents, cssFor, referentOrder, schemeOf } from '../src/lib/colours/model';
import { DEFAULT_REFERENTS, TARGET_DEFAULT } from '../src/lib/colours/referents';
import { DEFAULT_VISION, palettesFor } from '../src/lib/colours/palettes';
import { oklabHues } from '../src/lib/colours/sample';
import { bookRulesCss } from '../src/lib/colours/rules';

type Files = Readonly<Record<string, unknown>>;
const json = (v: unknown): string => JSON.stringify(v, null, 1);

const sectionFiles = (text: string): Files => ({
  'ch01/chapter.json': json({ id: '1', dir: 'ch01', title: 'Motion', sections: [{ id: '1.1', module: 'm11', title: 'Carts', slug: '1-1-carts' }] }),
  'ch01/1.1/section.json': json({
    id: '1.1', module: 'm11', chapter: '1', title: 'Carts', lead: 'Two carts.', built: '2026-10-04',
    figures: [{ id: 'sim-carts', kind: 'sim', draws: [] }],
    referents: [{ id: 'cart-1', label: 'the first cart', figures: ['sim-carts'] }, { id: 'cart-2', label: 'the second cart', figures: ['sim-carts'] }],
  }),
  'ch01/1.1/text.html': text,
});

const bookFiles = (id: string, book: Record<string, unknown>, text: string): Files => ({
  'book.json': json({ id, title: id, publisher: 'P', authors: ['A'], license: 'CC BY 4.0', chapters: ['ch01'], ...book }),
  ...sectionFiles(text),
});

const written = async (files: Files): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'omnistax-sparse-'));
  await Promise.all(Object.entries(files).map(async ([f, body]) => {
    await fs.mkdir(path.dirname(path.join(dir, f)), { recursive: true });
    await fs.writeFile(path.join(dir, f), String(body));
  }));
  return dir;
};

const TEXT = (extra: string): string =>
  `<section id="carts"><p><span data-ref="cart-1">The first cart</span> meets <span data-ref="cart-2">the second</span>. ${extra}</p>`
  + '<figure class="sim" id="sim-carts"></figure></section>';

const NO_SYMBOLS = bookFiles('no-symbols', {
  types: [{ id: 'velocity', label: 'velocity' }],
  symbols: [],
  concepts: [{ id: 'velocity', kind: 'idea', section: '1.1', name: 'Velocity', statement: 'w', type: 'velocity' }],
}, TEXT('Its <span data-concept="velocity">velocity</span> is $v = 2$.'));

const NO_TYPES = bookFiles('no-types', {
  types: [],
  symbols: [{ sym: 't', latex: 't', macro: '\\kt' }],
  concepts: [{ id: 'time', kind: 'idea', section: '1.1', name: 'Time', statement: 'w' }],
}, TEXT('It takes <span data-concept="time">time</span>, $\\kt = 2$.'));

const colourEverything = async (files: Files, id: string) => {
  const dir = await written(files);
  const tree = await loadBook(bookDir(dir), bookId(id)).finally(() => fs.rm(dir, { recursive: true, force: true }));
  const m = tree.manifest;
  const categories = tree.dto.types.map((t) => String(t.id));
  const pages = pagesOfBook(m);
  const fixed = fixedOf(pages);
  const colours = oklabHues(categories.length, DEFAULT_VISION);
  const smart = assignSmart({ categories, colours, pages, fixed, vision: DEFAULT_VISION });
  const stored = { ...m, colours: { palette: 'oklab', vision: DEFAULT_VISION, assign: Object.fromEntries(smart) } };
  return {
    tree, categories, pages, smart,
    inOrder: assignInOrder(categories, colours),
    nearest: pageNearest(smart, pages, fixed, DEFAULT_VISION),
    order: referentOrder(stored, NO_CHOICES, DEFAULT_REFERENTS.palette, TARGET_DEFAULT),
    referents: bookReferents(stored, NO_CHOICES),
    scheme: schemeOf(stored, NO_CHOICES),
    css: cssFor(stored, NO_CHOICES),
    rules: bookRulesCss(stored),
  };
};

test('a book that writes no symbols loads, counts its words and deals its referents', async () => {
  const r = await colourEverything(NO_SYMBOLS, 'no-symbols');
  assert.deepEqual(r.tree.manifest.symbols ?? {}, {});
  assert.deepEqual(r.categories, ['velocity']);
  assert.equal(r.pages.length, 1);
  assert.equal(r.pages[0].get('velocity'), 1, 'the word is counted though no symbol is');
  assert.deepEqual([...r.smart.keys()], ['velocity']);
  assert.deepEqual(r.referents.flatMap((p) => p.groups.map((g) => g.ids)), [['cart-1', 'cart-2']]);
  assert.deepEqual(Object.keys(r.scheme.hues), ['velocity']);
  assert.match(r.rules, /\.kv-velocity\{color:var\(--c-velocity\)\}/);
  assert.match(r.css, /--c-velocity:/);
});

test('a book that declares no categories loads, assigns nothing and still deals its referents', async () => {
  const r = await colourEverything(NO_TYPES, 'no-types');
  assert.deepEqual(r.categories, []);
  assert.deepEqual(oklabHues(0, DEFAULT_VISION), []);
  assert.equal(r.smart.size, 0); assert.equal(r.inOrder.size, 0);
  assert.deepEqual(r.nearest, []);
  assert.ok(palettesFor(0).every((o) => o.hues.length === 0));
  assert.deepEqual(r.scheme.hues, {});
  assert.equal(r.rules, '');
  assert.ok(!r.css.includes('--c-'), 'no category, no colour token');
  assert.deepEqual(r.referents.flatMap((p) => p.groups.map((g) => g.ids)), [['cart-1', 'cart-2']]);
  assert.equal(r.referents[0].groups[0].hues.length, 2);
  assert.ok(r.order.length > 0);
  assert.equal(r.pages.length, 0, 'a page that shows no category counts none');
  assert.doesNotMatch(r.tree.chapters[0].sections[0].textHtml, /kv-|data-type/, 'an untyped symbol and an untyped concept stay ink');
});
