/* How far apart two colours look, and whether one reads on the page. Colours
   are measured in Björn Ottosson's OKLab, where the straight distance between
   two points tracks how different they look; a colour that names a category is
   a pair, one value for each theme, and two pairs are as far apart as their
   nearer theme. A reader with a colour-vision deficiency sees the screen through
   one of Machado, Oliveira and Fernandes's (2009) matrices at full severity, and
   two colours are as far apart for them as the nearer of what they see and
   what everyone else sees. Pure throughout. */
import type { Hex, Hue } from './model';

export type Vision = 'normal' | 'protan' | 'deutan' | 'tritan';
export const VISIONS: readonly Vision[] = ['normal', 'protan', 'deutan', 'tritan'];
export const isVision = (s: unknown): s is Vision => typeof s === 'string' && (VISIONS as readonly string[]).includes(s);

export type Linear = readonly [number, number, number];   /* linear-light sRGB, 0 to 1 when in gamut */
export type Lab = readonly [number, number, number];      /* OKLab L, a, b */
export type Lch = readonly [number, number, number];      /* OKLCH L, C, h in degrees */
export type DeltaE = number;                              /* OKLab Euclidean distance */
export type Contrast = number;                            /* WCAG 2 ratio, 1 to 21 */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const decode = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const encode = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const byte = (x: number): string => Math.round(255 * clamp01(encode(clamp01(x)))).toString(16).padStart(2, '0').toUpperCase();

export const linearOf = (hex: Hex): Linear => {
  const h = hex.replace('#', '').trim();
  const d = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => decode(parseInt(d.slice(i, i + 2), 16) / 255)) as unknown as Linear;
};
export const hexOfLinear = ([r, g, b]: Linear): Hex => `#${byte(r)}${byte(g)}${byte(b)}`;

export const labOfLinear = ([r, g, b]: Linear): Lab => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};
export const linearOfLab = ([L, a, b]: Lab): Linear => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
};
export const labOf = (hex: Hex): Lab => labOfLinear(linearOf(hex));
export const hexOfLab = (lab: Lab): Hex => hexOfLinear(linearOfLab(lab));

export const labOfLch = ([L, C, h]: Lch): Lab => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
export const lchOfLab = ([L, a, b]: Lab): Lch => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];

const EPS = 1e-6;
export const inGamut = (rgb: Linear): boolean => rgb.every((v) => v >= -EPS && v <= 1 + EPS);

export const deltaE = (p: Lab, q: Lab): DeltaE => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
export const deltaEHex = (x: Hex, y: Hex): DeltaE => deltaE(labOf(x), labOf(y));

/* ---------- colour-vision deficiency ---------- */

type Matrix = readonly [Linear, Linear, Linear];
const MACHADO: Readonly<Record<Exclude<Vision, 'normal'>, Matrix>> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
export const simulate = (rgb: Linear, vision: Vision): Linear => {
  if (vision === 'normal') return rgb;
  return MACHADO[vision].map((row) => clamp01(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) as unknown as Linear;
};

/* A colour as one theme shows it: what everyone sees, and what the reader's vision sees. */
export type Seen = { readonly lab: Lab; readonly sim: Lab };
export const seenOf = (hex: Hex, vision: Vision): Seen => {
  const rgb = linearOf(hex);
  const lab = labOfLinear(rgb);
  return { lab, sim: vision === 'normal' ? lab : labOfLinear(simulate(rgb, vision)) };
};
export const seenDistance = (p: Seen, q: Seen): DeltaE => Math.min(deltaE(p.lab, q.lab), deltaE(p.sim, q.sim));

/* A pair as both themes show it. */
export type SeenHue = { readonly light: Seen; readonly dark: Seen };
export const seenHue = (h: Hue, vision: Vision): SeenHue => ({ light: seenOf(h.light, vision), dark: seenOf(h.dark, vision) });
export const seenHueDistance = (p: SeenHue, q: SeenHue): DeltaE =>
  Math.min(seenDistance(p.light, q.light), seenDistance(p.dark, q.dark));

/* How far apart two category colours are for a reader: the nearer theme, and
   the nearer of normal sight and theirs. */
export const distance = (a: Hue, b: Hue, vision: Vision): DeltaE => seenHueDistance(seenHue(a, vision), seenHue(b, vision));

/* ---------- reading on the page ---------- */

/* The grounds a coloured word or mark sits on in each theme (global.css): the
   page's --bg and the panels' --panel. */
export const GROUNDS: Readonly<Record<'light' | 'dark', readonly Hex[]>> = {
  light: ['#F5F6F8', '#FFFFFF'],
  dark: ['#121418', '#1A1D23'],
};

export const luminanceOf = ([r, g, b]: Linear): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const contrastOf = (x: Linear, y: Linear): Contrast => {
  const [hi, lo] = [luminanceOf(x), luminanceOf(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
export const contrast = (x: Hex, y: Hex): Contrast => contrastOf(linearOf(x), linearOf(y));

/* The worst contrast a pair meets against the grounds of its own theme. */
export const groundContrast = (h: Hue): Contrast =>
  Math.min(...GROUNDS.light.map((g) => contrast(h.light, g)), ...GROUNDS.dark.map((g) => contrast(h.dark, g)));
