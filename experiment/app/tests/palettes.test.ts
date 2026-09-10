/* The recommended palettes, and the scheme drawn from them. What is worth
   checking is not a list of colours but what each palette answers for every
   number of quantities a level might show: that many colours, all different, all
   readable as hex, and nothing at all once it is past what it can dress. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OKLCH, PALETTES, fixed, generated, huesOf, paletteId, schemePalette } from '../src/lib/colours/palettes';
import { isHex, normHex } from '../src/lib/colours/model';

/* The largest count each palette can dress: the two generated ones and Tol's cut
   answer for as many as they are asked, up to their own ceiling, and every
   published list stops at its length. */
const LIMIT: Readonly<Record<string, number>> = {
  oklch: Infinity,
  rainbow: Infinity,
  'tol-rainbow': 23,
  'okabe-ito': 8,
  'tol-bright': 7,
  'tol-vibrant': 7,
  'tol-muted': 9,
  'tableau-10': 10,
  category10: 10,
  dark2: 8,
  set1: 9,
  kelly: 19,
  polychrome: 34,
  glasbey: 32,
};
/* How far up it is worth asking: past forty no level of the book has that many
   quantities to colour. */
const CEILING = 40;

test('the page offers the generated palettes first and then the published lists', () => {
  assert.deepEqual(PALETTES.map((p) => p.id), [
    'oklch', 'rainbow', 'tol-rainbow', 'okabe-ito', 'tol-bright', 'tol-vibrant', 'tol-muted', 'tableau-10',
    'category10', 'dark2', 'set1', 'kelly', 'polychrome', 'glasbey',
  ]);
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length, 'no id is used twice');
  PALETTES.forEach((p) => {
    assert.ok(p.name.length > 0, `${p.id} has a name`);
    assert.match(p.note, /\.$/, `${p.id} says what it is for in a full sentence`);
    assert.ok(p.id in LIMIT, `${p.id} is one of the palettes this test knows`);
  });
});

test('every palette answers with exactly the colours the level needs, or with nothing', () => {
  PALETTES.forEach((p) => {
    const limit = LIMIT[p.id];
    assert.equal(huesOf(p, 0), null, `${p.id} does not dress a level with nothing on it`);
    for (let n = 1; n <= Math.min(limit, CEILING); n++) {
      const hues = huesOf(p, n);
      assert.ok(hues, `${p.id} dresses ${n} quantities`);
      assert.equal(hues.length, n, `${p.id} gives ${n} quantities ${n} colours`);
      assert.ok(hues.every(isHex), `${p.id} writes the colours for ${n} in hex`);
      assert.equal(new Set(hues.map(normHex)).size, n, `${p.id} repeats no colour at ${n}`);
    }
    if (Number.isFinite(limit)) assert.equal(huesOf(p, limit + 1), null, `${p.id} refuses ${limit + 1}`);
  });
});

test('the two generated palettes never refuse a level', () => {
  ['oklch', 'rainbow'].forEach((id) => {
    const p = PALETTES.find((q) => q.id === id);
    assert.ok(p, `${id} is on offer`);
    for (let n = 1; n <= CEILING; n++) assert.ok(huesOf(p, n), `${id} answers for ${n}`);
    assert.ok(huesOf(p, 200), `${id} answers even for a level no book has`);
  });
});

test('the scheme is the first published list long enough, and the ring when none is', () => {
  /* Every published list is passed over until one of them can dress the whole
     book, so a book of nine quantities takes Paul Tol muted and one of ten takes
     Tableau 10, the next along. */
  assert.equal(schemePalette(4).id, paletteId('okabe-ito'));
  assert.equal(schemePalette(8).id, paletteId('okabe-ito'));
  assert.equal(schemePalette(9).id, paletteId('tol-muted'));
  assert.equal(schemePalette(10).id, paletteId('tableau-10'));
  assert.equal(schemePalette(34).id, paletteId('polychrome'), 'the longest published list of all');
  assert.equal(schemePalette(35).id, OKLCH.id, 'and past it the ring, which lays out as many as are asked for');
  assert.equal(schemePalette(0).id, OKLCH.id, 'a book with no quantities is left to the ring as well');
  for (let n = 1; n <= CEILING; n++) {
    const hues = huesOf(schemePalette(n), n);
    assert.ok(hues, `a book of ${n} quantities is dressed`);
    assert.equal(hues.length, n, `and gets ${n} colours`);
  }
});

test("Tol's rainbow is cut afresh for each count rather than trimmed from one list", () => {
  const tol = PALETTES.find((p) => p.id === 'tol-rainbow');
  assert.ok(tol);
  assert.equal(tol.kind, 'variable', 'it is a cut worked out for the count, not a list to trim');
  assert.deepEqual(huesOf(tol, 9), ['#882E72', '#1965B0', '#7BAFDE', '#4EB265', '#CAE0AB', '#F7F056', '#EE8026', '#DC050C', '#72190E']);
  assert.deepEqual(huesOf(tol, 1), ['#1965B0'], 'one quantity takes the blue in the middle of the set');
  assert.deepEqual(huesOf(tol, 2), ['#1965B0', '#DC050C'], 'two take a blue and a red, as far apart as the set goes');
  assert.notDeepEqual(huesOf(tol, 9)?.slice(0, 2), huesOf(tol, 2), 'so the cut for nine is not the cut for two with more added');
  assert.equal(huesOf(tol, 24), null, 'past twenty-three Tol names no cut');
  assert.equal(schemePalette(9).id, paletteId('tol-muted'), 'and being cut rather than published, it is never the scheme');
});

test('the long published lists begin where their authors begin', () => {
  const first = (id: string) => { const p = PALETTES.find((q) => q.id === id); return p ? huesOf(p, 1) : null; };
  assert.deepEqual(first('kelly'), ['#F3C300'], "Kelly's yellow, the first after the white, black and grey that are left out");
  assert.deepEqual(first('glasbey'), ['#D70000'], "colorcet's red");
  assert.deepEqual(first('polychrome'), ['#F6222E'], 'Polychrome, past the grey and the near-white it opens with');
});

test('the two kinds of palette say how a list and a generator differ', () => {
  const list = fixed('two', 'Two', 'Two colours.', ['#112233', '#445566']);
  assert.equal(list.kind, 'fixed');
  assert.deepEqual(huesOf(list, 1), ['#112233'], 'a list hands back as many as are asked for, from the front');
  assert.deepEqual(huesOf(list, 2), ['#112233', '#445566']);
  assert.equal(huesOf(list, 3), null, 'and cannot say what a third would be');
  const made = generated('odd', 'Odd', 'A colour for each.', (n) => Array.from({ length: n }, () => '#000000'));
  assert.equal(made.kind, 'variable');
  assert.equal(huesOf(made, 3)?.length, 3, 'a generator lays out as many as the count');
  assert.equal(huesOf(made, 0), null, 'and no palette dresses nothing');
});
