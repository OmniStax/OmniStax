/* The categorical palette: the fourth family of colour, for instances that must
   be told apart and carry neither a type nor an element. What is worth checking
   is that its hues are all different and readable in both themes, that the index
   wraps, that a hue too close to a type the page has bound is skipped, and that
   switching colour coding off leaves it and the element colours alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAT, NEAR_DEG, cat, catHues, catOrder, hueAngle, untypedIndex } from '../src/lib/fig/cat';
import { elementColor } from '../src/lib/fig/elements';
import { isHex } from '../src/lib/colours/model';

const gap = (x: number, y: number): number => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

test('eight hues, every one a colour in both themes', () => {
  assert.equal(CAT.length, 8);
  for (const h of CAT) { assert.ok(isHex(h.light)); assert.ok(isHex(h.dark)); }
  assert.equal(new Set(CAT.flatMap((h) => [h.light, h.dark])).size, 16);
});

test('no two hues read as the same colour', () => {
  for (const h of CAT) for (const g of CAT) if (h !== g) assert.ok(gap(h.angle, g.angle) >= NEAR_DEG, `${h.light} and ${g.light}`);
});

test('the published angle is the colour\'s own hue, in both themes', () => {
  for (const h of CAT) {
    assert.ok(gap(hueAngle(h.light)!, h.angle) < 12, `light ${h.light}`);
    assert.ok(gap(hueAngle(h.dark)!, h.angle) < 12, `dark ${h.dark}`);
  }
});

test('the index wraps, forwards and backwards', () => {
  assert.equal(cat(0, false), cat(8, false));
  assert.equal(cat(1, false), cat(17, false));
  assert.equal(cat(-1, false), cat(7, false));
  assert.notEqual(cat(0, false), cat(0, true));
});

test('a bound type hue and its nearest neighbour are skipped', () => {
  const blue = CAT[5];                                   /* the page binds velocity to something blue */
  const left = catHues([blue.light]);
  assert.ok(!left.some((h) => h.angle === blue.angle));
  assert.ok(left.every((h) => gap(h.angle, blue.angle) >= NEAR_DEG));
  for (let i = 0; i < left.length; i++) assert.notEqual(cat(i, false, [blue.light]), blue.light);
});

test('a page whose bound hues leave few clear still tells eight things apart, nearest-to-bound last', () => {
  const bound = [CAT[0].light, CAT[2].light, CAT[4].light, CAT[6].light, CAT[1].light];
  const order = catOrder(bound);
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => cat(i, false, bound))).size, 8);
  assert.deepEqual(order.slice(0, catHues(bound).length), catHues(bound), 'the clear hues come first, as before');
  assert.equal(cat(1, false, bound) === cat(0, false, bound), false);
});

test('a grey binds nothing, and a page that binds everything gets the whole palette', () => {
  assert.equal(hueAngle('#808080'), null);
  assert.equal(catHues(['#808080']).length, CAT.length);
  assert.equal(catHues(CAT.map((h) => h.light)).length, CAT.length);
});

/* Colour coding off drops the type hues and keeps the book's own conventions.
   Neither the element palette nor the categorical one is reached through the
   scheme: `elementColor` and `cat` take a theme and nothing else, and figlib
   passes them nothing else, so there is no path by which `setCC(false)` could
   reach them. `C` is the one door that answers with ink; an untyped referent
   reads colour coding only to drop the bound hues it keeps clear of, as `cat`
   finds none bound with it off. */
const figlib = fs.readFileSync(new URL('../src/lib/fig/figlib.ts', import.meta.url), 'utf8');

test('the element and categorical colours do not switch off with colour coding', () => {
  assert.equal(elementColor('O', false), elementColor('O', false));
  assert.match(figlib, /const cat = \(i: number\): Color => catOf\(i, darkTheme, \[\.\.\.bound\]\);/);
  const uses = figlib.split('\n').filter((l) => /\bCC\b/.test(l) && !l.trimStart().startsWith('/*') && !l.trimStart().startsWith('*'));
  assert.deepEqual(uses.map((l) => l.trim()).sort(), [
    'const setCC = (on: boolean): void => { CC = on; };',
    'get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, cat, ref, paintRefs, alpha, redrawAll, el: elOf, fmt, LW, makeCanvas, begin, ctl, byId, sim,',
    'if (!CC && !NEUTRAL.has(k)) return PAL.ink;',
    'return catOf(k, darkTheme, CC ? keys.map((t) => pal[t]).filter(Boolean) : []);',
    'let CC = true;',
  ].sort());
});

test('a referent of no type is indexed by its place among the untyped rows of its own figure', () => {
  const rows = [{ id: 'firm-a', figure: 'duopoly' }, { id: 'crank', figure: 'engine', type: 'force' }, { id: 'piston', figure: 'engine' }, { id: 'firm-b', figure: 'duopoly' }];
  assert.equal(untypedIndex(rows, 'firm-a'), 0);
  assert.equal(untypedIndex(rows, 'firm-b'), 1);
  assert.equal(untypedIndex(rows, 'piston'), 0, 'each figure counts from the start');
  assert.equal(untypedIndex(rows, 'crank'), -1);
  assert.equal(untypedIndex(rows, 'firm-c'), -1);
});
