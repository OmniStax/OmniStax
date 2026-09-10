/* The recommended palettes. A palette is a function of the count, so what is
   worth checking is not a list of colours but what each one answers for every
   number of quantities a level might show: that many colours, all different, all
   readable as hex, and nothing at all once it is past what it can dress. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, fixed, generated } from '../src/lib/colours/palettes';
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
  book: 9,
};
/* How far up it is worth asking: past forty no level of the book has that many
   quantities to colour. */
const CEILING = 40;

test('the page offers the generated palettes first and then the published lists', () => {
  assert.deepEqual(PALETTES.map((p) => p.id), [
    'oklch', 'rainbow', 'tol-rainbow', 'okabe-ito', 'tol-bright', 'tol-vibrant', 'tol-muted', 'tableau-10',
    'category10', 'dark2', 'set1', 'kelly', 'polychrome', 'glasbey', 'book',
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
    assert.equal(p.huesFor(0), null, `${p.id} does not dress a level with nothing on it`);
    for (let n = 1; n <= Math.min(limit, CEILING); n++) {
      const hues = p.huesFor(n);
      assert.ok(hues, `${p.id} dresses ${n} quantities`);
      assert.equal(hues.length, n, `${p.id} gives ${n} quantities ${n} colours`);
      assert.ok(hues.every(isHex), `${p.id} writes the colours for ${n} in hex`);
      assert.equal(new Set(hues.map(normHex)).size, n, `${p.id} repeats no colour at ${n}`);
    }
    if (Number.isFinite(limit)) assert.equal(p.huesFor(limit + 1), null, `${p.id} refuses ${limit + 1}`);
  });
});

test('the two generated palettes never refuse a level', () => {
  ['oklch', 'rainbow'].forEach((id) => {
    const p = PALETTES.find((q) => q.id === id);
    assert.ok(p, `${id} is on offer`);
    for (let n = 1; n <= CEILING; n++) assert.ok(p.huesFor(n), `${id} answers for ${n}`);
    assert.ok(p.huesFor(200), `${id} answers even for a level no book has`);
  });
});

test("Tol's rainbow is cut afresh for each count rather than trimmed from one list", () => {
  const tol = PALETTES.find((p) => p.id === 'tol-rainbow');
  assert.ok(tol);
  assert.deepEqual(tol.huesFor(9), ['#882E72', '#1965B0', '#7BAFDE', '#4EB265', '#CAE0AB', '#F7F056', '#EE8026', '#DC050C', '#72190E']);
  assert.deepEqual(tol.huesFor(1), ['#1965B0'], 'one quantity takes the blue in the middle of the set');
  assert.deepEqual(tol.huesFor(2), ['#1965B0', '#DC050C'], 'two take a blue and a red, as far apart as the set goes');
  assert.notDeepEqual(tol.huesFor(9)?.slice(0, 2), tol.huesFor(2), 'so the cut for nine is not the cut for two with more added');
  assert.equal(tol.huesFor(24), null, 'past twenty-three Tol names no cut');
});

test('the long published lists begin where their authors begin', () => {
  const first = (id: string) => PALETTES.find((p) => p.id === id)?.huesFor(1);
  assert.deepEqual(first('kelly'), ['#F3C300'], "Kelly's yellow, the first after the white, black and grey that are left out");
  assert.deepEqual(first('glasbey'), ['#D70000'], "colorcet's red");
  assert.deepEqual(first('polychrome'), ['#F6222E'], 'Polychrome, past the grey and the near-white it opens with');
});

test('the two helpers say how a list and a generator differ', () => {
  const list = fixed('two', 'Two', 'Two colours.', ['#112233', '#445566']);
  assert.deepEqual(list.huesFor(1), ['#112233'], 'a list hands back as many as are asked for, from the front');
  assert.deepEqual(list.huesFor(2), ['#112233', '#445566']);
  assert.equal(list.huesFor(3), null, 'and cannot say what a third would be');
  const made = generated('odd', 'Odd', 'A colour for each.', (n) => Array.from({ length: n }, () => '#000000'));
  assert.equal(made.huesFor(3)?.length, 3, 'a generator lays out as many as the count');
  assert.equal(made.huesFor(0), null, 'and no palette dresses nothing');
});
