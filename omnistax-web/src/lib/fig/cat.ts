/* The categorical palette: the colours a figure gives to instances that must be
   told apart and carry neither a type nor an element — three gases on one graph,
   four archers, three isotopes, the samples of a table. It is the fourth family
   of colour, beside the type hues of the scheme, the element colours and the
   colours that are a physical fact, and like the other two that are not the
   app's signal it does not switch off when colour coding does.

   Eight hues, evenly spaced 45 degrees apart round the OKLCH hue circle, each
   published with a light value and a dark one: the light at L 0.52 and the dark
   at L 0.78, so a hue reads against the ground of either theme and the two
   values of one hue are recognisably the same colour. They differ in hue alone,
   so none of them shouts over the rest. A figure reaches them through `F.cat(i)`
   and never as a hex literal. */
import type { Color } from './figlib';

export type CatHue = { readonly angle: number; readonly light: Color; readonly dark: Color };

export const CAT: readonly CatHue[] = [
  { angle: 25, light: '#AF3C3A', dark: '#FF958D' },    /* red */
  { angle: 70, light: '#9D5400', dark: '#ECA851' },    /* amber */
  { angle: 115, light: '#687100', dark: '#B5C159' },   /* olive */
  { angle: 160, light: '#008149', dark: '#61D19A' },   /* green */
  { angle: 205, light: '#007F91', dark: '#1ACFDF' },   /* teal */
  { angle: 250, light: '#006BBB', dark: '#73BDFF' },   /* blue */
  { angle: 295, light: '#7152B5', dark: '#BDA6FF' },   /* violet */
  { angle: 340, light: '#9E3F84', dark: '#EE95D1' },   /* magenta */
];

/* Two hues within this many degrees of each other on the OKLCH circle read as
   the same colour once they are small marks on a page, so a categorical hue this
   close to a type hue the page has bound would say "this is that quantity" when
   it means nothing of the kind. Thirty degrees is two thirds of the 45-degree
   step between neighbouring categorical hues: it clears a bound hue and the one
   nearest it, and never more than two of the eight per bound colour. */
export const NEAR_DEG = 30;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* The sRGB a screen was asked for, back to linear light. */
const decodeSrgb = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

type Rgb = readonly [number, number, number];                      /* linear light, 0 to 1 */
const chan = (d: string, i: number): number => decodeSrgb(clamp01(parseInt(d.slice(i, i + 2), 16) / 255));
const rgbOf = (hex: Color): Rgb => {
  const h = hex.replace('#', '');
  const d = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [chan(d, 0), chan(d, 2), chan(d, 4)];
};

/* A colour's hue angle in degrees, 0 to 360, by Björn Ottosson's OKLab — the
   same conversion the colour scheme's ring is built with, run backwards. A grey
   has no hue, and comes back null so that nothing is ever called close to it. */
export const hueAngle = (hex: Color): number | null => {
  const [r, g, b] = rgbOf(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  if (Math.hypot(a, bb) < 0.02) return null;                         /* a grey: no hue to be close to */
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
};

/* The shorter way round the circle between two angles. */
const gap = (x: number, y: number): number => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

const clashes = (h: CatHue, angles: readonly number[]): boolean => angles.some((a) => gap(h.angle, a) < NEAR_DEG);

/* The hues left once the ones too close to the page's bound type hues are
   dropped. A page that has bound so much of the circle that nothing survives
   gets the whole palette back, since a hue that is merely close reads better
   than the same hue drawn twice. */
export const catHues = (bound: readonly Color[]): readonly CatHue[] => {
  const angles = bound.map(hueAngle).filter((a): a is number => a !== null);
  const left = CAT.filter((h) => !clashes(h, angles));
  return left.length ? left : CAT;
};

/* The i-th categorical colour for the theme showing, skipping the hues the page
   has bound to a type. `i` wraps, and a negative index wraps the same way, so a
   figure may index by whatever counter it has. */
export const cat = (i: number, dark: boolean, bound: readonly Color[] = []): Color => {
  const hues = catHues(bound);
  const n = hues.length;
  const h = hues[((Math.trunc(i) % n) + n) % n];
  return dark ? h.dark : h.light;
};
