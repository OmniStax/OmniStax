/* The scheme the book wears, read as the reader meets it: not a list of hexes
   but a promise about every quantity the book declares. Colour is a function of
   type, and a type's colour has to do two jobs — be read as text, an axis title
   or a needle against the ground of either theme, and be told apart at a glance
   from the quantities drawn beside it on the same page. Both are checked here
   against College Physics 2e's own list of types, in the order that book
   declares them, since it is the longest list the app carries. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hueAngle } from '../src/lib/fig/cat';
import { darkOf, normHex } from '../src/lib/colours/model';
import { SCHEME, SCHEME_PLACES, huesOf, schemePalette } from '../src/lib/colours/palettes';
import { PHYSICS, bookRoot } from './book-on-disk';

const ROOT = await bookRoot(PHYSICS);
const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'book.json'), 'utf8')) as { types: readonly { id: string }[] };
const TYPES: readonly string[] = book.types.map((t) => t.id);

/* The two grounds a hue must read on: the page, which is white, and the dark
   theme's panel, which is the darkest thing a figure is drawn on. */
const LIGHT_GROUND = '#FFFFFF';
const DARK_GROUND = '#1A1D23';

const decode = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string): number => {
  const d = normHex(hex).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => decode(parseInt(d.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/* WCAG's ratio, which is what "reads as text" means here. */
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/* The shorter way round the OKLCH hue circle, in degrees. */
const gap = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/* The hues the book is actually dressed in, type by type, as the scheme lays
   them along the order the book declares. */
const palette = schemePalette(TYPES.length);
const hues = huesOf(palette, TYPES.length);
const angleOf = (type: string): number => {
  const a = hueAngle(scheme(type).light);
  assert.ok(a !== null, `${type} is a hue and not a grey`);
  return a;
};
function scheme(type: string): { light: string; dark: string } {
  const i = TYPES.indexOf(type);
  assert.ok(i >= 0 && hues, `the book declares ${type}`);
  const light = normHex(hues[i]);
  return { light, dark: darkOf(light) };
}

/* Anything below this cannot be read as small text or a thin needle. It is the
   floor the categorical palette already meets on both grounds. */
const FLOOR = 4.5;

test('however many quantities the book declares, the scheme built for it dresses them', () => {
  assert.ok(TYPES.length >= 34, `the book declares ${TYPES.length} types`);
  assert.ok(TYPES.length <= SCHEME_PLACES, `the scheme deals ${SCHEME_PLACES} places and the book wants ${TYPES.length}`);
  assert.equal(palette.id, 'omnistax');
  assert.ok(hues && hues.length === TYPES.length);
});

test('every type reads as text on the white page and on the dark ground', () => {
  TYPES.forEach((t) => {
    const { light, dark } = scheme(t);
    const onPage = contrast(light, LIGHT_GROUND);
    const onDark = contrast(dark, DARK_GROUND);
    assert.ok(onPage >= FLOOR, `${t} (${light}) reads on the page: ${onPage.toFixed(2)}`);
    assert.ok(onDark >= FLOOR, `${t} (${dark}) reads on the dark ground: ${onDark.toFixed(2)}`);
  });
});

/* A pale yellow is what the published lists hand a quantity late in the order,
   and what no reader can read on a white page. Nothing here is pale at all. */
test('no type is dressed in a pale colour', () => {
  TYPES.forEach((t) => {
    const l = luminance(scheme(t).light);
    assert.ok(l < 0.3, `${t} is not a pale colour on the page (relative luminance ${l.toFixed(2)})`);
  });
});

/* Neighbours in the book's order are never near each other on the circle, so
   that a book which declares one more quantity does not shuffle two of them
   together. */
const NEIGHBOUR_DEG = 60;
test('quantities that stand next to each other in the order are far apart in hue', () => {
  TYPES.slice(0, -1).forEach((t, i) => {
    const n = TYPES[i + 1];
    const d = gap(angleOf(t), angleOf(n));
    assert.ok(d >= NEIGHBOUR_DEG, `${t} and ${n} are ${d.toFixed(0)}° apart`);
  });
});

/* The quantities a page draws together, which the reader must tell apart by the
   colour alone and not by reading the label beside it. */
const TOGETHER: readonly (readonly [string, string])[] = [
  ['force', 'pressure'],
  ['position', 'velocity'],
  ['position', 'acceleration'],
  ['velocity', 'acceleration'],
  ['energy', 'temperature'],
  ['energy', 'entropy'],
  ['temperature', 'entropy'],
  ['voltage', 'electric-field'],
  ['charge', 'electric-field'],
  ['voltage', 'charge'],
  ['pressure', 'density'],
  ['pressure', 'flow-rate'],
  ['pressure', 'viscosity'],
  ['pressure', 'surface-tension'],
  ['density', 'flow-rate'],
  ['stress', 'elastic-modulus'],
  ['torque', 'angular-momentum'],
  ['angular-rate', 'angular-acceleration'],
  ['force', 'momentum'],
  ['force', 'energy'],
  ['energy', 'power'],
  ['capacitance', 'voltage'],
  ['intensity', 'frequency'],
  ['position', 'pressure'],
  ['position', 'energy'],
  ['position', 'time'],
  ['position', 'density'],
  ['position', 'voltage'],
  ['position', 'charge'],
  ['time', 'velocity'],
  ['force', 'stress'],
  ['velocity', 'flow-rate'],
  ['velocity', 'electric-field'],
  ['energy', 'voltage'],
  ['energy', 'charge'],
  ['electric-field', 'position'],
  ['current', 'voltage'],
  ['current', 'resistance'],
  ['current', 'magnetic-field'],
  ['magnetic-field', 'force'],
  ['magnetic-field', 'velocity'],
  ['electric-field', 'magnetic-field'],
  ['emf', 'current'],
  /* The electromagnetic chapters. Chapter 22 draws the force on a current-
     carrying loop, and Chapter 23 the flux against the emf, which this book
     dresses as voltage, and the inductance against the capacitance. */
  ['force', 'current'],
  ['magnetic-flux', 'magnetic-field'],
  ['magnetic-flux', 'voltage'],
  ['magnetic-flux', 'current'],
  ['magnetic-flux', 'time'],
  ['inductance', 'capacitance'],
  ['inductance', 'resistance'],
  ['inductance', 'frequency'],
  ['inductance', 'voltage'],
  ['inductance', 'current'],
  ['inductance', 'time'],
];
/* Five twelfths of the circle is the floor the hues were laid out to; a hex is
   eight bits a channel, so a hue read back off one can fall a degree short. */
const TOGETHER_DEG = 59;
/* A pair the book has not declared both halves of yet — emf is not a type of its
   own, since the book dresses an emf in voltage — is not a pair the scheme can
   be held to. */
const declared = ([a, b]: readonly [string, string]): boolean => TYPES.includes(a) && TYPES.includes(b);

/* The three pairs the scheme cannot lift to that floor, with the standing each
   one does keep, so that a change which makes one of them worse is caught. Six
   quantities are drawn beside the inductance and no angle left in the grid
   stands 60° from all six, so it takes the best there is; force and current are
   drawn on one loop in Chapter 22, but current went to press with Chapter 20 and
   is not moved for a pair written down after it. */
const SHORT: readonly (readonly [string, string, number])[] = [
  ['inductance', 'voltage', 53],
  ['inductance', 'current', 47],
  ['force', 'current', 29],
];
const isShort = ([a, b]: readonly [string, string]): boolean =>
  SHORT.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

test('the quantities drawn on one page together are told apart by their colour', () => {
  TOGETHER.filter(declared).filter((p) => !isShort(p)).forEach(([a, b]) => {
    const d = gap(angleOf(a), angleOf(b));
    assert.ok(d >= TOGETHER_DEG, `${a} and ${b} are only ${d.toFixed(0)}° apart on the hue circle`);
  });
});

test('the pairs the circle has no room for keep the standing they were dealt', () => {
  SHORT.forEach(([a, b, least]) => {
    assert.ok(TOGETHER.some(([x, y]) => (x === a && y === b) || (x === b && y === a)), `${a} and ${b} are a declared pair`);
    const d = gap(angleOf(a), angleOf(b));
    assert.ok(d >= least, `${a} and ${b} are only ${d.toFixed(0)}° apart, below the ${least}° they were dealt`);
  });
});

/* Chapters 1 to 9 were built against the hues the first nine places wore, so
   those places keep the colour family they had: the hue each one carried under
   the old scheme, and none of them turned by more than 22°. */
test('the first places of the order keep the hue family they were tuned to', () => {
  const was: Readonly<Record<string, number>> = {
    time: 26, position: 329, velocity: 143, acceleration: 259, force: 75, energy: 355,
    frequency: 172, stiffness: 121, 'angular-rate': 218,
  };
  Object.entries(was).forEach(([t, a]) => {
    const d = gap(angleOf(t), a);
    assert.ok(d <= 21, `${t} stayed within 21° of the hue it wore (${d.toFixed(0)}°)`);
  });
});

/* The colours Chapters 1 to 22 went to press in, written out here rather than
   worked out, so that dealing a later place again — as the magnetic flux and the
   inductance were dealt again once the electromagnetic pairs were written down —
   cannot move one of them unnoticed. Every one of these thirty-two is fixed. */
const PUBLISHED: readonly string[] = [
  '#B23B19', '#8747AA', '#487901', '#0069BF', '#7C6800', '#B13550', '#067976', '#706D00', '#02768B', '#A73879',
  '#007D49', '#535BC3', '#137F1F', '#3862C4', '#A74900', '#794DB6', '#9A5500', '#027A6B', '#866302', '#9E3C8B',
  '#0070A6', '#AD3665', '#607200', '#6754BE', '#905C00', '#007397', '#B33738', '#007C5D', '#94419C', '#955900',
  '#006DB0', '#993F94',
];
test('the places the built chapters wear have not moved', () => {
  const all = huesOf(SCHEME, SCHEME_PLACES);
  assert.ok(all);
  PUBLISHED.forEach((hex, i) => assert.equal(normHex(all[i]), normHex(hex), `place ${i + 1}, ${TYPES[i]}, is the colour it was published in`));
});

/* The two places dealt again for Chapter 23, which no chapter had drawn. */
test('the flux and the inductance wear the colours they were dealt again', () => {
  assert.equal(normHex(scheme('magnetic-flux').light), '#00729E');
  assert.equal(normHex(scheme('inductance').light), '#697000');
});

/* The scheme has to go on dealing after this book: Chapters 23 to 34 will name
   the magnetic flux, the inductance, the activity and a half-dozen more, and a
   later book may name more again. It is dealt out to forty-eight places, and
   what matters as much as the floors is that dealing further never moves a place
   already dealt — a quantity declared today keeps the colour it was published
   with when the next chapter declares another. */
test('the scheme deals every place out to forty-eight, and the book keeps its own', () => {
  const all = huesOf(SCHEME, SCHEME_PLACES);
  assert.ok(all && all.length === SCHEME_PLACES && SCHEME_PLACES >= 48);
  assert.equal(new Set(all.map(normHex)).size, SCHEME_PLACES, 'no two places wear the same colour');
  all.forEach((hex, i) => {
    const light = normHex(hex);
    assert.ok(contrast(light, LIGHT_GROUND) >= FLOOR, `place ${i} (${light}) reads on the page`);
    assert.ok(contrast(darkOf(light), DARK_GROUND) >= FLOOR, `place ${i} reads on the dark ground`);
    assert.ok(luminance(light) < 0.3, `place ${i} is not pale`);
  });
  const angles = all.map((hex) => { const a = hueAngle(normHex(hex)); assert.ok(a !== null); return a; });
  angles.slice(0, -1).forEach((a, i) => {
    assert.ok(gap(a, angles[i + 1]) >= NEIGHBOUR_DEG, `places ${i} and ${i + 1} are ${gap(a, angles[i + 1]).toFixed(0)}° apart`);
  });
  /* Append-only: the hues the book wears are the head of the list, unchanged. */
  hues?.forEach((hex, i) => assert.equal(normHex(hex), normHex(all[i]), `place ${i} did not move`));
});
