/* The referent palette: the colours of the particular things a figure must tell
   apart. What is worth checking is that its hues are all different and readable
   in both themes, that they stand apart from every category colour of the scheme,
   that the index wraps, that a hue too close to a colour the figure draws is skipped, and that switching colour coding off leaves it and the
   element colours alone. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAT, NEAR_DE, cat, catHues, catOrder, clearCount, deltaE, hueAngle, refIndex } from '../src/lib/fig/cat';
import { SCHEME, huesOf } from '../src/lib/colours/palettes';
import { darkOf } from '../src/lib/colours/model';
import { elementColor } from '../src/lib/fig/elements';
import { isHex } from '../src/lib/colours/model';
import { COLOURS_ON, rootClasses, shownOf } from '../src/lib/colours/switches';

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
  for (const h of CAT) for (const g of CAT) if (h !== g) assert.ok(gap(h.angle, g.angle) >= 30, `${h.light} and ${g.light}`);
});

test('a referent never reads as a category: every hue stands clear of all forty-eight scheme places in its theme', () => {
  const places = huesOf(SCHEME, 48)!;
  for (const h of CAT) for (const p of places) {
    assert.ok(deltaE(h.light, p) >= NEAR_DE, `light ${h.light} and ${p}`);
    assert.ok(deltaE(h.dark, darkOf(p)) >= NEAR_DE, `dark ${h.dark} and ${darkOf(p)}`);
  }
  assert.equal(clearCount(places), CAT.length);
  assert.equal(clearCount(places.map(darkOf)), CAT.length);
});

test('the threshold calls the old jade wagon and teal mass one colour, and force and velocity two', () => {
  assert.ok(deltaE('#007B66', '#00787B') < NEAR_DE);
  assert.ok(deltaE('#7C6800', '#487901') >= NEAR_DE);
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

test('a drawn colour near a referent hue clears it, in the theme it is drawn in', () => {
  const blue = CAT[8];                                   /* a reader's palette draws velocity in the referent blue itself */
  for (const dark of [false, true]) {
    const drawn = [dark ? blue.dark : blue.light];
    const left = catHues(drawn, dark);
    assert.ok(!left.includes(blue));
    assert.ok(left.every((h) => deltaE(dark ? h.dark : h.light, drawn[0]) >= NEAR_DE));
    for (let i = 0; i < left.length; i++) assert.notEqual(cat(i, dark, drawn), drawn[0]);
    assert.equal(clearCount(drawn, dark), left.length);
  }
  assert.ok(!catHues([blue.dark]).includes(blue), 'the build, not saying the theme, measures both');
});

test('the six types of the wagon of physics 4.3 leave two referents far from all six and from each other', () => {
  const wagon = ['#7C6800', '#0069BF', '#487901', '#B23B19', '#8747AA', '#00787B'];   /* force, acceleration, velocity, time, position, mass */
  for (const dark of [false, true]) {
    const drawn = dark ? wagon.map(darkOf) : wagon;
    const [a, b] = [cat(0, dark, drawn), cat(1, dark, drawn)];
    for (const d of drawn) for (const r of [a, b]) assert.ok(deltaE(r, d) >= 0.1, `${dark ? 'dark' : 'light'} ${r} and ${d}`);
    assert.ok(deltaE(a, b) >= NEAR_DE, `${a} and ${b}`);
  }
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

/* Each colour family answers to its own switch and no other (RULES item 7). The element palette is reached
   only through `F.el` and a fact only through `F.fact`, both gated on facts; the referent hues through `F.ref`,
   `F.cat` and `paintRefs`, gated on referents; a type only through `C`, gated on concepts, which a referent
   reads besides only to drop the drawn hues it keeps clear of, as none are drawn with Concepts off. */
const figlib = fs.readFileSync(new URL('../src/lib/fig/figlib.ts', import.meta.url), 'utf8');
const reading = (family: string): readonly string[] =>
  figlib.split('\n').filter((l) => new RegExp(`\\bSHOWN\\.${family}\\b`).test(l) && !l.trimStart().startsWith('/*') && !l.trimStart().startsWith('*')).map((l) => l.trim()).sort();

test('each colour door reads its own switch and nothing else does', () => {
  assert.equal(elementColor('O', false), elementColor('O', false));
  assert.deepEqual(reading('facts'), [
    "const fact = (c: Color): Color => (SHOWN.facts ? c : PAL.ink);",
    "if (isElementSymbol(s) || /^[A-Z]/.test(s)) return SHOWN.facts ? elColor(s) : PAL.ink;",
  ].sort());
  assert.deepEqual(reading('refs'), [
    'const cat = (i: number): Color => (SHOWN.refs ? catOf(i, darkTheme, [...bound]) : PAL.ink);',
    'if (!SHOWN.refs || !page || !r || k < 0) return pal.ink;',
    'if (!SHOWN.refs) return;',
  ].sort());
  assert.deepEqual(reading('concepts'), [
    'get PAL() { return PAL; }, get CC() { return SHOWN.concepts; }, get shown() { return SHOWN; }, setShown, readPal, C, cat, ref, paintRefs, alpha, redrawAll, el: elOf, fact, fmt, LW, makeCanvas, begin, ctl, byId, sim,',
    'if (!SHOWN.concepts && !NEUTRAL.has(k)) return PAL.ink;',
    'return catOf(k, darkTheme, SHOWN.concepts ? keys.map((t) => pal[t]).filter(Boolean) : []);',
  ].sort());
});

test('All off sets every family in ink and on gives each back its own switch', () => {
  const some = { all: true, facts: false, refs: true, concepts: false };
  assert.deepEqual(shownOf(some), { facts: false, refs: true, concepts: false });
  assert.deepEqual(shownOf({ ...some, all: false }), { facts: false, refs: false, concepts: false });
  assert.deepEqual(shownOf(COLOURS_ON), { facts: true, refs: true, concepts: true });
  assert.deepEqual(rootClasses({ ...COLOURS_ON, refs: false }), { 'cc-all': true, 'cc-facts': true, 'cc-refs': false, 'cc-concepts': true });
  assert.deepEqual(rootClasses({ ...COLOURS_ON, all: false }), { 'cc-all': false, 'cc-facts': false, 'cc-refs': false, 'cc-concepts': false });
});

test('a referent is indexed by its place among the rows of its own figure', () => {
  const rows = [{ id: 'firm-a', figure: 'duopoly' }, { id: 'crank', figure: 'engine' }, { id: 'piston', figure: 'engine' }, { id: 'firm-b', figure: 'duopoly' }];
  assert.equal(refIndex(rows, 'firm-a'), 0);
  assert.equal(refIndex(rows, 'firm-b'), 1);
  assert.equal(refIndex(rows, 'crank'), 0, 'each figure counts from the start');
  assert.equal(refIndex(rows, 'piston'), 1);
  assert.equal(refIndex(rows, 'firm-c'), -1);
});
