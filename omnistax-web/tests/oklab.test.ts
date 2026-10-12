/* The colour arithmetic the default colours rest on: OKLab and its distance,
   colour-vision deficiency, the two generated palettes and the assignment of
   their colours to categories by what the pages show together. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type Lab, HUE_FAMILIES, INKS, deltaE, hueGap, deltaEHex, distance, groundContrast, hexOfLab, labOf, labOfLch, lchOfLab, lightGap, linearOf, sameFamily, seenHue, simulate, labOfLinear } from '../src/lib/colours/oklab';
import { CONTRAST_FLOOR, FAMILY_HUES, familyHues, minDistance, oklabHues } from '../src/lib/colours/sample';
import { assignInOrder, assignSmart, assignmentCost } from '../src/lib/colours/assign';
import { type PageCounts, fixedHueOf, pageCounts } from '../src/lib/colours/counts';
import type { Hue } from '../src/lib/colours/model';

const near = (x: number, y: number, eps = 1e-3): boolean => Math.abs(x - y) <= eps;
const nearLab = (p: Lab, q: Lab): boolean => p.every((v, i) => near(v, q[i]));

test('OKLab: white, black and red sit where Ottosson puts them, and a colour comes back as it went in', () => {
  assert.ok(nearLab(labOf('#FFFFFF'), [1, 0, 0]));
  assert.ok(nearLab(labOf('#000000'), [0, 0, 0]));
  assert.ok(nearLab(labOf('#FF0000'), [0.62796, 0.22486, 0.12585]));
  assert.ok(near(deltaEHex('#FFFFFF', '#000000'), 1));
  ['#B23B19', '#0069BF', '#1B1F27', '#F5F6F8', '#7C6800'].forEach((h) => assert.equal(hexOfLab(labOf(h)), h, `${h} round trip`));
  assert.ok(near(deltaE(labOf('#FF0000'), labOf('#00FF00')), 0.5197, 2e-3));
});

test('a red and a green far apart for most readers collapse for a deuteranope, and greys stay grey', () => {
  const red: Hue = { light: '#D62728', dark: '#D62728' }, green: Hue = { light: '#2CA02C', dark: '#2CA02C' };
  const normal = distance(red, green, 'normal'), deutan = distance(red, green, 'deutan');
  assert.ok(normal > 0.25, `normal ${normal}`);
  assert.ok(deutan < 0.4 * normal, `deutan ${deutan} against ${normal}`);
  assert.ok(distance(red, green, 'tritan') > 0.6 * normal, 'a tritanope still tells red from green');
  const grey = linearOf('#808080');
  (['protan', 'deutan', 'tritan'] as const).forEach((v) => assert.ok(nearLab(labOfLinear(simulate(grey, v)), labOfLinear(grey)), `${v} leaves grey alone`));
});

test('the OKLab palette is prefix-stable, readable on every ground, and spreads its colours', () => {
  (['normal', 'deutan'] as const).forEach((v) => {
    const fifty = oklabHues(50, v);
    assert.equal(fifty.length, 50);
    assert.deepEqual(oklabHues(12, v), fifty.slice(0, 12), 'the first twelve are the same whatever the count');
    assert.deepEqual(oklabHues(1, v), fifty.slice(0, 1));
    fifty.forEach((h) => assert.ok(groundContrast(h) >= CONTRAST_FLOOR - 0.05, `${h.light}/${h.dark} reads on every ground (${groundContrast(h).toFixed(2)})`));
    assert.equal(new Set(fifty.map((h) => h.light)).size, 50);
    assert.ok(minDistance(fifty.slice(0, 8), v) > 0.07, `eight are far apart for ${v}`);
  });
  assert.notDeepEqual(oklabHues(8, 'normal'), oklabHues(8, 'deutan'), 'the vision steers the sampling');
});

test('the counter counts typed words, variables rows and figure tags, and leaves the spectrum out', () => {
  const counts = pageCounts({
    prose: ['<p><span data-concept="f" data-type="force">force</span> and <span data-type="force">10 N</span> on a <span data-type="mass">mass</span></p>', '<span data-ref="cart-1">cart 1</span>'],
    figures: [{ draws: ['force', 'velocity'], conventions: ['O', 'e-'], facts: ['#f0a828', 'spectrum'] }],
    rowTypes: ['force', 'mass'],
    macros: {},
  });
  assert.deepEqual(Object.fromEntries(counts), { force: 4, mass: 2, velocity: 1, 'el:O': 1, 'el:e-': 1, '#F0A828': 1 });
  assert.deepEqual(fixedHueOf('#F0A828'), { light: '#F0A828', dark: '#F0A828' });
  assert.equal(fixedHueOf('force'), null);
  assert.ok(fixedHueOf('el:O'));
});

test('the counter counts a macro as its type at every use, and a macro in ink not at all', () => {
  const counts = pageCounts({ prose: ['<p>$\\kv = \\kc/n$ and $\\kvx$, $\\kn$</p>', '$$\\kv$$'], figures: [], rowTypes: [], macros: { '\\kv': 'velocity', '\\kc': 'velocity', '\\kvx': 'speed' } });
  assert.deepEqual(Object.fromEntries(counts), { velocity: 3, speed: 1 });
});

/* Two colours almost one and two far apart; force and mass always on a page together, time and heat never. */
const COLOURS: readonly Hue[] = [
  { light: '#B23B19', dark: '#F17260' }, { light: '#B43D1B', dark: '#F37462' },
  { light: '#0069BF', dark: '#4490FE' }, { light: '#317D01', dark: '#62AE45' },
];
const PAGES: readonly PageCounts[] = [
  new Map([['force', 5], ['mass', 4]]), new Map([['force', 2], ['mass', 3]]), new Map([['time', 3]]), new Map([['heat', 2]]),
];
const CATS = ['force', 'mass', 'time', 'heat'];

test('the smart assignment parts what pages show together, where the book\'s order would not', () => {
  const inOrder = assignInOrder(CATS, COLOURS);
  assert.deepEqual(inOrder.get('mass'), COLOURS[1], 'in order, mass takes the colour beside force\'s');
  const smart = assignSmart({ categories: CATS, colours: COLOURS, pages: PAGES, fixed: new Map(), vision: 'normal' });
  assert.ok(distance(smart.get('force') as Hue, smart.get('mass') as Hue, 'normal') > 0.1, 'smart puts force and mass apart');
  assert.ok(assignmentCost(smart, PAGES, new Map(), 'normal') < assignmentCost(inOrder, PAGES, new Map(), 'normal'));
  assert.deepEqual(new Set([...smart.values()]), new Set(COLOURS), 'every colour is worn once');
});

test('a fixed colour on the page keeps a category off it', () => {
  const pages: readonly PageCounts[] = [new Map([['charge', 3], ['#B23B19', 3]])];
  const smart = assignSmart({ categories: ['charge', 'spare'], colours: [COLOURS[1], COLOURS[2]], pages, fixed: new Map([['#B23B19', { light: '#B23B19', dark: '#B23B19' }]]), vision: 'normal' });
  assert.deepEqual(smart.get('charge'), COLOURS[2], 'the charge takes the blue, not the red the fact already draws');
});

test('the ink is on every page, so a category on a page keeps off a colour near it', () => {
  const nearInk: Hue = { light: '#422C58', dark: '#DEC4FB' };
  const smart = assignSmart({ categories: ['point', 'spare'], colours: [nearInk, COLOURS[2]], pages: [new Map([['point', 4]])], fixed: new Map(), vision: 'normal' });
  assert.deepEqual(smart.get('point'), COLOURS[2], 'the point takes the blue, not the purple beside the ink');
});

const lch = (L: number, C: number, h: number): Hue => ({ light: hexOfLab(labOfLch([L, C, h])), dark: hexOfLab(labOfLch([1.2 - L, C, h])) });

test('the hue rule keeps two of one family off a page that a distance alone would allow', () => {
  const purple = lch(0.5, 0.22, 318), dull = lch(0.4, 0.12, 322), green = lch(0.5, 0.12, 150);
  const pages: readonly PageCounts[] = [new Map([['function', 4], ['derivative', 3]]), new Map([['spare', 2], [purple.light, 1], [dull.light, 1]])];
  const fixed = new Map([purple, dull].map((h) => [h.light, h] as const));
  const cats = ['function', 'derivative', 'spare'];
  assert.ok(distance(purple, dull, 'normal') > 0.12 && hueGap(labOf(purple.light), labOf(dull.light), 0.05) < 30, 'they pass on distance alone');
  const off = assignSmart({ categories: cats, colours: [purple, dull, green], pages, fixed, vision: 'normal', hues: null });
  assert.deepEqual(off.get('spare'), green, 'without the rule the two purples share the first page');
  const on = assignSmart({ categories: cats, colours: [purple, dull, green], pages, fixed, vision: 'normal' });
  assert.ok([on.get('function'), on.get('derivative')].includes(green), 'with the rule one of the pair takes the green');
  assert.equal(hueGap(labOf('#808080'), labOf('#A804CC'), 0.05), 180, 'a grey has no hue to clash');
});

test('two of one family a clear step of lightness apart cost more than two families and far less than one colour', () => {
  const deep = lch(0.38, 0.14, 25), light = lch(0.54, 0.2, 25), near = lch(0.44, 0.17, 25), orange = lch(0.54, 0.13, 57);
  const page: readonly PageCounts[] = [new Map([['a', 1], ['b', 1]])];
  const cost = (x: Hue, y: Hue): number => assignmentCost(new Map([['a', x], ['b', y]]), page, new Map(), 'normal');
  assert.ok(distance(deep, light, 'normal') > 0.12 && distance(deep, orange, 'normal') > 0.12);
  assert.ok(cost(deep, near) > 0.9, 'a step short of clear wears one colour');
  assert.ok(cost(deep, light) > 5 * cost(deep, orange), `one family ${cost(deep, light).toFixed(3)} against two ${cost(deep, orange).toFixed(3)}`);
  assert.ok(cost(deep, light) < 0.2);
  assert.ok(Math.abs(assignmentCost(new Map([['a', deep], ['b', near]]), page, new Map(), 'normal', null) - cost(deep, near)) > 0.5, 'off, only the distance counts');
});

test('the hue-families palette fills ten families before any takes a second, keeps a family’s colours a clear step apart, and keeps off the ink', () => {
  (['normal', 'deutan'] as const).forEach((v) => {
    const fifty = familyHues(50, v);
    assert.equal(fifty.length, 50);
    assert.deepEqual(familyHues(12, v), fifty.slice(0, 12), 'the first twelve are the same whatever the count');
    fifty.forEach((h) => assert.ok(groundContrast(h) >= CONTRAST_FLOOR, `${h.light}/${h.dark} reads on every ground (${groundContrast(h).toFixed(2)})`));
    fifty.forEach((h) => assert.ok(Math.min(...INKS.map((k) => distance(h, k, 'normal'))) >= 0.12, `${h.light}/${h.dark} keeps off the ink`));
    assert.equal(new Set(fifty.map((h) => h.light)).size, 50);
    const seen = fifty.map((h) => seenHue(h, 'normal'));
    const pairs = (n: number) => seen.slice(0, n).flatMap((p, i) => seen.slice(i + 1, n).map((q) => [p, q] as const));
    assert.ok(pairs(FAMILY_HUES.length).every(([p, q]) => !sameFamily(p, q, HUE_FAMILIES)), `the first ten are of ten families for ${v}`);
    assert.ok(pairs(19).every(([p, q]) => !sameFamily(p, q, HUE_FAMILIES) || lightGap(p, q) >= HUE_FAMILIES.lightness), `the first nineteen are of two families or a clear step apart for ${v}`);
    assert.ok(minDistance(fifty.slice(0, 8), v) > (v === 'normal' ? 0.1 : 0.05), `eight are far apart for ${v}, as far as ten hue families let a deuteranope see`);
  });
  [familyHues(50, 'normal'), oklabHues(50, 'normal')].flat().forEach((h) => {
    const [, C, hue] = lchOfLab(labOf(h.light));
    assert.ok(C <= 0.15 || Math.abs(((hue - 25 + 540) % 360) - 180) > 20, `${h.light} is no bright red`);
  });
  assert.ok(FAMILY_HUES.every((h, i) => hueGap(labOfLch([0.5, 0.1, h]), labOfLch([0.5, 0.1, FAMILY_HUES[(i + 1) % FAMILY_HUES.length]]), 0) >= 32), 'the families stand 32° apart, room for a hex to round off its hue');
});

test('categories no page shows take what is left in their declared order, whatever the seed', () => {
  const cats = ['force', 'mass', 'u1', 'u2', 'u3', 'u4'];
  const colours = oklabHues(6, 'normal');
  const pages: readonly PageCounts[] = [new Map([['force', 3], ['mass', 2]])];
  const [one, two] = [1, 2].map((seed) => assignSmart({ categories: cats, colours, pages, fixed: new Map(), vision: 'normal', seed }));
  assert.deepEqual([...one], [...two]);
  const settled = ['u1', 'u2', 'u3', 'u4'].map((c) => one.get(c) as Hue);
  const room = settled.map((h) => Math.min(...INKS.map((k) => distance(h, k, 'normal'))));
  assert.ok(room.every((x, i) => i === 0 || room[i - 1] >= x), 'farthest from the ink first');
});

test('the smart assignment is deterministic, and fast enough for fifty categories in the browser', () => {
  const cats = Array.from({ length: 50 }, (_, i) => `t${i}`);
  const colours = oklabHues(50, 'deutan');
  const pages: readonly PageCounts[] = Array.from({ length: 200 }, (_, p) =>
    new Map(Array.from({ length: 8 }, (_, k) => [cats[(p * 7 + k * 11) % 50], 1 + ((p + k) % 4)] as const)));
  const started = performance.now();
  const one = assignSmart({ categories: cats, colours, pages, fixed: new Map(), vision: 'deutan', seed: 7 });
  const took = performance.now() - started;
  const two = assignSmart({ categories: cats, colours, pages, fixed: new Map(), vision: 'deutan', seed: 7 });
  assert.deepEqual([...one], [...two]);
  assert.ok(took < 1000, `took ${took.toFixed(0)} ms`);
  assert.ok(assignmentCost(one, pages, new Map(), 'deutan') < assignmentCost(assignInOrder(cats, colours), pages, new Map(), 'deutan'));
});
