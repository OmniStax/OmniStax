/* The categorical palette: the fourth family of colour, for instances that must
   be told apart and carry neither a type nor an element. What is worth checking
   is that its hues are all different and readable in both themes, that the index
   wraps, that a hue too close to a type the page has bound is skipped, and that
   switching colour coding off leaves it and the element colours alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAT, NEAR_DEG, cat, catHues, hueAngle } from '../src/lib/fig/cat';
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
  for (let i = 0; i < 20; i++) assert.notEqual(cat(i, false, [blue.light]), blue.light);
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
   reach them. `C` is the one door that answers with ink. */
const figlib = fs.readFileSync(new URL('../src/lib/fig/figlib.ts', import.meta.url), 'utf8');

test('the element and categorical colours do not switch off with colour coding', () => {
  assert.equal(elementColor('O', false), elementColor('O', false));
  assert.match(figlib, /const cat = \(i: number\): Color => catOf\(i, darkTheme, \[\.\.\.bound\]\);/);
  const uses = figlib.split('\n').filter((l) => /\bCC\b/.test(l) && !l.trimStart().startsWith('/*') && !l.trimStart().startsWith('*'));
  assert.deepEqual(uses.map((l) => l.trim()).sort(), [
    'const setCC = (on: boolean): void => { CC = on; };',
    'get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, cat, alpha, redrawAll, el: elOf, fmt, LW, makeCanvas, begin, ctl, byId, sim,',
    'if (!CC && !NEUTRAL.has(k)) return PAL.ink;',
    'let CC = true;',
  ].sort());
});
