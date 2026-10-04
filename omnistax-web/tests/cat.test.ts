/* The referent palette: the colours of the particular things a figure must tell
   apart. What is worth checking is that its hues are all different and readable
   in both themes, that the index wraps, that a hue too close to a type the figure
   draws is skipped, and that switching colour coding off leaves it and the
   element colours alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAT, NEAR_DEG, cat, catHues, catOrder, clearCount, hueAngle, refIndex } from '../src/lib/fig/cat';
import { elementColor } from '../src/lib/fig/elements';
import { isHex } from '../src/lib/colours/model';

const gap = (x: number, y: number): number => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

test('twelve hues, 30 degrees apart, every one a colour in both themes', () => {
  assert.equal(CAT.length, 12);
  CAT.forEach((h, i) => assert.equal(h.angle, 25 + 30 * i));
  for (const h of CAT) { assert.ok(isHex(h.light)); assert.ok(isHex(h.dark)); }
  assert.equal(new Set(CAT.flatMap((h) => [h.light, h.dark])).size, 24);
});

/* WCAG contrast against the two grounds a page is read on. */
const luminance = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string): number => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every hue reads as text on the ground of its theme', () => {
  for (const h of CAT) {
    assert.ok(contrast(h.light, '#FFFFFF') >= 4.5, `light ${h.light}`);
    assert.ok(contrast(h.dark, '#1A1D23') >= 4.5, `dark ${h.dark}`);
  }
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
  assert.equal(cat(0, false), cat(12, false));
  assert.equal(cat(1, false), cat(25, false));
  assert.equal(cat(-1, false), cat(11, false));
  assert.notEqual(cat(0, false), cat(0, true));
});

test('a drawn type hue clears the hue it lands on, or the two it falls between, and no more', () => {
  const blue = CAT[8];                                   /* the figure draws velocity in something blue */
  const left = catHues([blue.light]);
  assert.ok(!left.some((h) => h.angle === blue.angle));
  assert.ok(left.every((h) => gap(h.angle, blue.angle) >= NEAR_DEG));
  for (let i = 0; i < left.length; i++) assert.notEqual(cat(i, false, [blue.light]), blue.light);
  for (let a = 0; a < 360; a += 5) {
    const near = CAT.filter((h) => { const d = Math.abs(h.angle - a) % 360; return Math.min(d, 360 - d) < NEAR_DEG; });
    assert.ok(near.length >= 1 && near.length <= 2, `a hue at ${a} degrees clears ${near.length}`);
  }
  assert.equal(clearCount([blue.light]), left.length);
});

test('a figure whose drawn hues leave few clear still tells twelve things apart, nearest-to-drawn last', () => {
  const bound = [CAT[0].light, CAT[2].light, CAT[4].light, CAT[6].light, CAT[1].light, CAT[9].light];
  const order = catOrder(bound);
  assert.equal(new Set(Array.from({ length: 12 }, (_, i) => cat(i, false, bound))).size, 12);
  assert.deepEqual(order.slice(0, catHues(bound).length), catHues(bound), 'the clear hues come first, as before');
  assert.equal(cat(1, false, bound) === cat(0, false, bound), false);
});

test('a grey clears nothing, and a figure that draws every hue gets the whole palette', () => {
  assert.equal(hueAngle('#808080'), null);
  assert.equal(catHues(['#808080']).length, CAT.length);
  assert.equal(catHues(CAT.map((h) => h.light)).length, CAT.length);
});

/* Colour coding off drops the type hues and keeps the book's own conventions.
   Neither the element palette nor the categorical one is reached through the
   scheme: `elementColor` and `cat` take a theme and nothing else, and figlib
   passes them nothing else, so there is no path by which `setCC(false)` could
   reach them. `C` is the one door that answers with ink; a referent reads colour
   coding only to drop the drawn hues it keeps clear of, as `cat` finds none drawn
   with it off. */
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

test('a referent is indexed by its place among the rows of its own figure', () => {
  const rows = [{ id: 'firm-a', figure: 'duopoly' }, { id: 'crank', figure: 'engine' }, { id: 'piston', figure: 'engine' }, { id: 'firm-b', figure: 'duopoly' }];
  assert.equal(refIndex(rows, 'firm-a'), 0);
  assert.equal(refIndex(rows, 'firm-b'), 1);
  assert.equal(refIndex(rows, 'crank'), 0, 'each figure counts from the start');
  assert.equal(refIndex(rows, 'piston'), 1);
  assert.equal(refIndex(rows, 'firm-c'), -1);
});
