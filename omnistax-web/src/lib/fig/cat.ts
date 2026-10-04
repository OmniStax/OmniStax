/* The referent palette: the colours a figure gives to the particular things it
   must tell apart and that carry no element — two tugboats, three skaters, Firm A
   and Firm B, the samples of a table. It is the third tier of colour, beside the
   type hues of the scheme, the element colours and the colours that are a
   physical fact, and like the other two that are not the app's signal it does
   not switch off when colour coding does.

   Hue alone cannot keep a referent apart from the categories: a figure that
   draws six of them has spoken for most of the circle, and a jade wagon 23°
   from a teal mass reads as the mass. So the referents are a family of their
   own by lightness as well. The scheme's category hues sit at OKLCH L 0.52 with
   chroma up to 0.16 on the light ground, and on the dark one wherever HSL
   lightness 0.7 carries them, L 0.68 to 0.96. The referents sit below both, at
   L 0.40 with chroma up to 0.17 on the light ground and L 0.65 with chroma up to
   0.18 on the dark, deeper and more saturated than any category hue: every
   light value clears 8:1 against white and every dark one 4.5:1 against the
   dark ground, and no referent comes within ΔE 0.08 of any of the scheme's
   forty-eight places in its theme. Twelve hues, 30 degrees apart round the OKLCH
   circle from 25, and the two values of one hue are recognisably the same
   colour. A figure reaches them through `F.ref(id)` or `F.cat(i)` and never as a
   hex literal. */
import type { Color } from './figlib';

export type CatHue = { readonly angle: number; readonly light: Color; readonly dark: Color };

export const CAT: readonly CatHue[] = [
  { angle: 25, light: '#8A0012', dark: '#E85854' },    /* red */
  { angle: 55, light: '#6F3600', dark: '#D76F00' },    /* orange */
  { angle: 85, light: '#5C4300', dark: '#B48700' },    /* ochre */
  { angle: 115, light: '#474D00', dark: '#8D9900' },   /* olive */
  { angle: 145, light: '#005813', dark: '#31AA40' },   /* green */
  { angle: 175, light: '#005545', dark: '#00A78B' },   /* jade */
  { angle: 205, light: '#005259', dark: '#00A2AF' },   /* teal */
  { angle: 235, light: '#004E6F', dark: '#009BD6' },   /* azure */
  { angle: 265, light: '#193BA1', dark: '#5888FC' },   /* blue */
  { angle: 295, light: '#522797', dark: '#9973EF' },   /* violet */
  { angle: 325, light: '#711378', dark: '#C462CA' },   /* purple */
  { angle: 355, light: '#84004C', dark: '#DF5795' },   /* rose */
];

/* Two colours closer than this in OKLab read as one once they are small marks
   on a page, so a referent this close to a colour its figure draws would say
   "this is that quantity" when it means nothing of the kind. The old jade wagon
   and the teal mass of physics 4.3 stood 0.038 apart and were one teal; force
   and velocity, an ochre and a green 36° apart, stand 0.086 apart and are two
   colours. No referent is this close to a scheme place, so under the book's own
   scheme nothing is skipped; it is a colour a reader picks, or a palette of
   their choosing, that lands on a referent and moves it on. */
export const NEAR_DE = 0.08;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/* The sRGB a screen was asked for, back to linear light. */
const decodeSrgb = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

type Rgb = readonly [number, number, number];                      /* linear light, 0 to 1 */
type Lab = readonly [number, number, number];                      /* OKLab L, a, b */
const chan = (d: string, i: number): number => decodeSrgb(clamp01(parseInt(d.slice(i, i + 2), 16) / 255));
const rgbOf = (hex: Color): Rgb => {
  const h = hex.replace('#', '');
  const d = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [chan(d, 0), chan(d, 2), chan(d, 4)];
};

/* A colour in Björn Ottosson's OKLab, the same conversion the colour scheme's
   ring is built with, run backwards. */
const labOf = (hex: Color): Lab => {
  const [r, g, b] = rgbOf(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};

/* How far apart two colours look: the straight distance between them in OKLab. */
export const deltaE = (x: Color, y: Color): number => {
  const [p, q] = [labOf(x), labOf(y)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/* A colour's hue angle in degrees, 0 to 360. A grey has no hue, and comes back
   null. */
export const hueAngle = (hex: Color): number | null => {
  const [, a, b] = labOf(hex);
  if (Math.hypot(a, b) < 0.02) return null;
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};

/* The values of a hue the drawn colours are measured against: the theme's own
   when the theme is known, and both when it is not, which is how the build
   asks, handing over the drawn colours of one theme at a time. */
const valuesOf = (h: CatHue, dark?: boolean): readonly Color[] => (dark === undefined ? [h.light, h.dark] : [dark ? h.dark : h.light]);

/* How near a hue comes to the nearest drawn colour; a figure that draws nothing
   leaves every hue the whole room there is. */
const room = (h: CatHue, drawn: readonly Color[], dark?: boolean): number =>
  Math.min(Infinity, ...valuesOf(h, dark).flatMap((v) => drawn.map((d) => deltaE(v, d))));

const clashes = (h: CatHue, drawn: readonly Color[], dark?: boolean): boolean => room(h, drawn, dark) < NEAR_DE;

/* The hues left once the ones too close to the drawn colours are dropped. A
   figure that has drawn so much that nothing survives gets the whole palette
   back, since a hue that is merely close reads better than the same hue drawn
   twice. */
export const catHues = (drawn: readonly Color[], dark?: boolean): readonly CatHue[] => {
  const left = CAT.filter((h) => !clashes(h, drawn, dark));
  return left.length ? left : CAT;
};

/* Every hue in the order a figure hands them out: the ones clear of its drawn
   colours first, then the ones it dropped, the farthest from any drawn colour
   first. A figure that needs more colours than survive gets a hue merely close
   to a drawn one before it gets the same hue twice. */
export const catOrder = (drawn: readonly Color[], dark?: boolean): readonly CatHue[] => [
  ...CAT.filter((h) => !clashes(h, drawn, dark)),
  ...CAT.filter((h) => clashes(h, drawn, dark)).sort((x, y) => room(y, drawn, dark) - room(x, drawn, dark)),
];

/* How many hues a figure that draws these colours has before it runs out. */
export const clearCount = (drawn: readonly Color[], dark?: boolean): number => CAT.filter((h) => !clashes(h, drawn, dark)).length;

/* The i-th colour for the theme showing, in the order above, for the things a figure tells apart that no
   referents row names; the hues the figure's referents wear are not among them. `i` wraps, and a negative
   index wraps the same way, so a figure may index by whatever counter it has. */
export const cat = (i: number, dark: boolean, drawn: readonly Color[] = [], worn: readonly CatHue[] = []): Color => {
  const all = catOrder(drawn, dark);
  const free = all.filter((h) => !worn.includes(h));
  const hues = free.length ? free : all;
  const n = hues.length;
  const h = hues[((Math.trunc(i) % n) + n) % n];
  return dark ? h.dark : h.light;
};

/* A referents row as its colour reads it: its id and every figure that draws it. */
export type RefRow = { readonly id: string; readonly figures: readonly string[] };
/* Each referent of a section with its hue, and the referents that found every hue taken by a referent they
   share a figure with, so wear a neighbour's. */
export type RefHues = { readonly hue: ReadonlyMap<string, CatHue>; readonly short: readonly string[] };

const sharesFigure = (a: RefRow, b: RefRow): boolean => a.figures.some((f) => b.figures.includes(f));

/* The referents of one section coloured in table order: each takes the first hue, in the order its figures'
   drawn colours give, that no earlier referent sharing a figure with it wears, so it wears one colour in every
   figure and two referents of one figure never match. Where every hue is taken it wears the one its
   neighbours wear least. `drawnOf` gives a figure's drawn category colours in the theme asked for. */
export const refHues = (rows: readonly RefRow[], drawnOf: (figure: string) => readonly Color[], dark?: boolean): RefHues =>
  rows.reduce<RefHues>((acc, r, i) => {
    if (acc.hue.has(r.id)) return acc;
    const taken = rows.slice(0, i).filter((o) => sharesFigure(o, r)).flatMap((o) => acc.hue.get(o.id) ?? []);
    const order = catOrder(r.figures.flatMap(drawnOf), dark);
    const uses = (h: CatHue): number => taken.filter((t) => t === h).length;
    const free = order.find((h) => uses(h) === 0);
    const hue = free ?? order.reduce((best, h) => (uses(h) < uses(best) ? h : best));
    return { hue: new Map([...acc.hue, [r.id, hue]]), short: free ? acc.short : [...acc.short, r.id] };
  }, { hue: new Map(), short: [] });
