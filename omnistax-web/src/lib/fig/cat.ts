/* The referent palette: the colours a figure gives to the particular things it
   must tell apart and that carry no element — two tugboats, three skaters, Firm A
   and Firm B, the samples of a table. It is the third tier of colour, beside the
   type hues of the scheme, the element colours and the colours that are a
   physical fact, and like the other two that are not the app's signal it does
   not switch off when colour coding does.

   Twelve hues, evenly spaced 30 degrees apart round the OKLCH hue circle from
   25, each published with a light value and a dark one: the light at L 0.52 and
   the dark at L 0.78, chroma as high as sRGB holds up to 0.15 and 0.13, so every
   light value clears 5:1 against white and every dark one 8:1 against the dark
   ground, and the two values of one hue are recognisably the same colour. A
   figure reaches them through `F.ref(id)` or `F.cat(i)` and never as a hex
   literal. */
import type { Color } from './figlib';

export type CatHue = { readonly angle: number; readonly light: Color; readonly dark: Color };

export const CAT: readonly CatHue[] = [
  { angle: 25, light: '#AF3C3A', dark: '#FF958E' },    /* red */
  { angle: 55, light: '#9F5102', dark: '#F7A062' },    /* orange */
  { angle: 85, light: '#856302', dark: '#DDB049' },    /* ochre */
  { angle: 115, light: '#677005', dark: '#B5C159' },   /* olive */
  { angle: 145, light: '#1B7E2A', dark: '#80CD82' },   /* green */
  { angle: 175, light: '#007B66', dark: '#41D2B3' },   /* jade */
  { angle: 205, light: '#047781', dark: '#1ACFDF' },   /* teal */
  { angle: 235, light: '#01729F', dark: '#55C4FE' },   /* azure */
  { angle: 265, light: '#3D63BE', dark: '#95B6FE' },   /* blue */
  { angle: 295, light: '#7152B5', dark: '#BDA7FE' },   /* violet */
  { angle: 325, light: '#924598', dark: '#E19AE5' },   /* purple */
  { angle: 355, light: '#A73B6D', dark: '#F893BC' },   /* rose */
];

/* Two hues within this many degrees of each other on the OKLCH circle read as
   the same colour once they are small marks on a page, so a referent hue this
   close to a category hue its figure draws would say "this is that quantity"
   when it means nothing of the kind. Twenty degrees is two thirds of the
   30-degree step: a drawn hue clears the referent hue it lands on, or the two it
   falls between, and never more. */
export const NEAR_DEG = 20;

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
const anglesOf = (hexes: readonly Color[]): readonly number[] => hexes.map(hueAngle).filter((a): a is number => a !== null);

/* The hues left once the ones too close to the drawn category hues are
   dropped. A figure that has drawn so much of the circle that nothing survives
   gets the whole palette back, since a hue that is merely close reads better
   than the same hue drawn twice. */
export const catHues = (drawn: readonly Color[]): readonly CatHue[] => {
  const angles = anglesOf(drawn);
  const left = CAT.filter((h) => !clashes(h, angles));
  return left.length ? left : CAT;
};

/* Every hue in the order a figure hands them out: the ones clear of its drawn
   hues first, then the ones it dropped, the farthest from any drawn hue first. A
   figure that needs more colours than survive gets a hue merely close to a drawn
   one before it gets the same hue twice. */
export const catOrder = (drawn: readonly Color[]): readonly CatHue[] => {
  const angles = anglesOf(drawn);
  const clear = CAT.filter((h) => !clashes(h, angles));
  const room = (h: CatHue): number => Math.min(...angles.map((a) => gap(h.angle, a)));
  return [...clear, ...CAT.filter((h) => clashes(h, angles)).sort((x, y) => room(y) - room(x))];
};

/* How many hues a figure that draws these category hues has before it runs out. */
export const clearCount = (drawn: readonly Color[]): number => CAT.filter((h) => !clashes(h, anglesOf(drawn))).length;

/* The i-th referent colour for the theme showing, in the order above. `i`
   wraps, and a negative index wraps the same way, so a figure may index by
   whatever counter it has. */
export const cat = (i: number, dark: boolean, drawn: readonly Color[] = []): Color => {
  const hues = catOrder(drawn);
  const n = hues.length;
  const h = hues[((Math.trunc(i) % n) + n) % n];
  return dark ? h.dark : h.light;
};

/* A referent's place among the referents of its own figure, in table order,
   which is the index it is coloured by: two figures of one page may share a
   colour. -1 where the id names no row. */
export const refIndex = (rows: readonly { readonly id: string; readonly figure: string }[], id: string): number => {
  const figure = rows.find((r) => r.id === id)?.figure;
  return rows.filter((r) => r.figure === figure).findIndex((r) => r.id === id);
};
