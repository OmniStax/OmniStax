/* The element palette: the fixed CPK colours a figure fills an atom with, one
   light value and one dark value apiece. It is the book's own drawing
   convention rather than a signal the app adds, so it is not a type in the
   colour scheme, it does not appear in the colour menu, and it does not switch
   off when colour coding does; a figure reaches it through `F.el(symbol)` and
   never as a hex literal. Two elements cannot keep one hue across the two
   themes: hydrogen is white in the book and would vanish on a light page, so it
   takes a light gray there and the figure outlines it in ink, and carbon is
   black and would vanish on a dark page, so it takes a dark gray in light and a
   mid gray in dark. The map carries the ten elements Chemistry 2e names in its
   captions and the rest of the CPK table the later chapters draw, with an
   "other" fallback for anything unlisted. The three particles a physics
   figure draws on their own, the electron, the proton and the neutron, are
   keyed with their charge sign ("e-", "p+", "n0") so that no HTML tag can
   collide with them; a charge's sign is told by the label and the sign, and
   these hues are the particle's identity, never a stand-in for the charge
   type's hue. */
import type { Color } from './figlib';

/* An element's symbol as the periodic table writes it: "H", "Cl", "Na". */
export type ElementSymbol = string & { readonly brand: unique symbol };
export type ElementHues = { readonly light: Color; readonly dark: Color };

/* Keyed by symbol; `other` is the fallback and is not an element. */
export const ELEMENTS: Readonly<Record<string, ElementHues>> = {
  /* The ten the book names in its captions and alt texts. */
  C: { light: '#3A3F47', dark: '#9AA2AF' },   /* black, lightened either way so it reads on both grounds */
  H: { light: '#DDE1E7', dark: '#F5F7FA' },   /* white; a light gray on a light page, outlined in ink */
  O: { light: '#D93025', dark: '#F0564B' },
  N: { light: '#2B5BD7', dark: '#6E93F5' },
  Cl: { light: '#1E9E4A', dark: '#4ADE80' },
  S: { light: '#C9A227', dark: '#E8C547' },
  P: { light: '#E2711D', dark: '#F59E42' },
  Cu: { light: '#8C5A2B', dark: '#BE8A57' },
  Na: { light: '#7C3AED', dark: '#A78BFA' },
  Ti: { light: '#6B7280', dark: '#9CA3AF' },
  /* The rest of the CPK table the later chapters draw. */
  F: { light: '#3FA34D', dark: '#6EE7A0' },
  Br: { light: '#8B2F1D', dark: '#D2694F' },
  I: { light: '#6A1B9A', dark: '#C084FC' },
  B: { light: '#C97B63', dark: '#E8A28C' },
  Si: { light: '#A08C7D', dark: '#C7B3A2' },
  Li: { light: '#7C3AED', dark: '#A78BFA' },
  K: { light: '#7C3AED', dark: '#A78BFA' },
  Rb: { light: '#7C3AED', dark: '#A78BFA' },
  Cs: { light: '#7C3AED', dark: '#A78BFA' },
  Fr: { light: '#7C3AED', dark: '#A78BFA' },
  Be: { light: '#1F6B3B', dark: '#4CAF72' },
  Mg: { light: '#1F6B3B', dark: '#4CAF72' },
  Ca: { light: '#1F6B3B', dark: '#4CAF72' },
  Sr: { light: '#1F6B3B', dark: '#4CAF72' },
  Ba: { light: '#1F6B3B', dark: '#4CAF72' },
  Ra: { light: '#1F6B3B', dark: '#4CAF72' },
  He: { light: '#19A5AE', dark: '#5EEAD4' },
  Ne: { light: '#19A5AE', dark: '#5EEAD4' },
  Ar: { light: '#19A5AE', dark: '#5EEAD4' },
  Kr: { light: '#19A5AE', dark: '#5EEAD4' },
  Xe: { light: '#19A5AE', dark: '#5EEAD4' },
  Rn: { light: '#19A5AE', dark: '#5EEAD4' },
  Fe: { light: '#C85A17', dark: '#E88B4C' },
  Zn: { light: '#6E7B8B', dark: '#A3B1C2' },
  Au: { light: '#B58B18', dark: '#E3BE4A' },
  Ag: { light: '#7E8A97', dark: '#B8C2CC' },
  Zr: { light: '#6A9AA8', dark: '#9CC8D4' },
  Cr: { light: '#7A8CB8', dark: '#A9B8DD' },
  Mn: { light: '#8A5CB8', dark: '#B690E0' },
  Co: { light: '#C2506A', dark: '#EE8FA3' },
  Ni: { light: '#3E9A4F', dark: '#7FD08C' },
  V: { light: '#8E8E9C', dark: '#BDBDC9' },
  Pt: { light: '#8F95A8', dark: '#C4C9D8' },
  Hg: { light: '#8C8CA8', dark: '#BCBCD4' },
  Pb: { light: '#4E5663', dark: '#9098A6' },
  Sn: { light: '#5F7A80', dark: '#9BB4BA' },
  Al: { light: '#9A8A8A', dark: '#C9B8B8' },
  Cd: { light: '#B89A3A', dark: '#E0C76E' },
  Mo: { light: '#3F8C8C', dark: '#7CC4C4' },
  W: { light: '#3E6FA0', dark: '#7FA8D2' },
  Ga: { light: '#A06E6E', dark: '#D09C9C' },
  Ge: { light: '#6E8C8C', dark: '#A2BDBD' },
  As: { light: '#8A5CB0', dark: '#BC91DC' },
  Se: { light: '#C47A1A', dark: '#F0A850' },
  Te: { light: '#A0703A', dark: '#D4A06A' },
  U: { light: '#2F7A3A', dark: '#6CC07A' },
  Pu: { light: '#A3432F', dark: '#E07A62' },
  /* Every other element, in its family's hue, so none falls to the fallback. */
  Sc: { light: '#6E7F99', dark: '#A5B4CC' },
  Y: { light: '#6E7F99', dark: '#A5B4CC' },
  Nb: { light: '#6E7F99', dark: '#A5B4CC' },
  Tc: { light: '#6E7F99', dark: '#A5B4CC' },
  Ru: { light: '#6E7F99', dark: '#A5B4CC' },
  Rh: { light: '#6E7F99', dark: '#A5B4CC' },
  Pd: { light: '#6E7F99', dark: '#A5B4CC' },
  In: { light: '#7D7A8C', dark: '#B3B0C2' },
  Sb: { light: '#9A7B4F', dark: '#CBAA7E' },
  La: { light: '#4F8FB0', dark: '#86BEDB' },
  Ce: { light: '#4F8FB0', dark: '#86BEDB' },
  Pr: { light: '#4F8FB0', dark: '#86BEDB' },
  Nd: { light: '#4F8FB0', dark: '#86BEDB' },
  Pm: { light: '#4F8FB0', dark: '#86BEDB' },
  Sm: { light: '#4F8FB0', dark: '#86BEDB' },
  Eu: { light: '#4F8FB0', dark: '#86BEDB' },
  Gd: { light: '#4F8FB0', dark: '#86BEDB' },
  Tb: { light: '#4F8FB0', dark: '#86BEDB' },
  Dy: { light: '#4F8FB0', dark: '#86BEDB' },
  Ho: { light: '#4F8FB0', dark: '#86BEDB' },
  Er: { light: '#4F8FB0', dark: '#86BEDB' },
  Tm: { light: '#4F8FB0', dark: '#86BEDB' },
  Yb: { light: '#4F8FB0', dark: '#86BEDB' },
  Lu: { light: '#4F8FB0', dark: '#86BEDB' },
  Hf: { light: '#6E7F99', dark: '#A5B4CC' },
  Ta: { light: '#6E7F99', dark: '#A5B4CC' },
  Re: { light: '#6E7F99', dark: '#A5B4CC' },
  Os: { light: '#6E7F99', dark: '#A5B4CC' },
  Ir: { light: '#6E7F99', dark: '#A5B4CC' },
  Tl: { light: '#7D7A8C', dark: '#B3B0C2' },
  Bi: { light: '#7D7A8C', dark: '#B3B0C2' },
  Po: { light: '#9A7B4F', dark: '#CBAA7E' },
  At: { light: '#3FA34D', dark: '#6EE7A0' },
  Ac: { light: '#4E8F5A', dark: '#86C491' },
  Th: { light: '#4E8F5A', dark: '#86C491' },
  Pa: { light: '#4E8F5A', dark: '#86C491' },
  Np: { light: '#4E8F5A', dark: '#86C491' },
  Am: { light: '#4E8F5A', dark: '#86C491' },
  Cm: { light: '#4E8F5A', dark: '#86C491' },
  Bk: { light: '#4E8F5A', dark: '#86C491' },
  Cf: { light: '#4E8F5A', dark: '#86C491' },
  Es: { light: '#4E8F5A', dark: '#86C491' },
  Fm: { light: '#4E8F5A', dark: '#86C491' },
  Md: { light: '#4E8F5A', dark: '#86C491' },
  No: { light: '#4E8F5A', dark: '#86C491' },
  Lr: { light: '#4E8F5A', dark: '#86C491' },
  Rf: { light: '#6E7F99', dark: '#A5B4CC' },
  Db: { light: '#6E7F99', dark: '#A5B4CC' },
  Sg: { light: '#6E7F99', dark: '#A5B4CC' },
  Bh: { light: '#6E7F99', dark: '#A5B4CC' },
  Hs: { light: '#6E7F99', dark: '#A5B4CC' },
  Mt: { light: '#6E7F99', dark: '#A5B4CC' },
  Ds: { light: '#6E7F99', dark: '#A5B4CC' },
  Rg: { light: '#6E7F99', dark: '#A5B4CC' },
  Cn: { light: '#6E7F99', dark: '#A5B4CC' },
  Nh: { light: '#7D7A8C', dark: '#B3B0C2' },
  Fl: { light: '#7D7A8C', dark: '#B3B0C2' },
  Mc: { light: '#7D7A8C', dark: '#B3B0C2' },
  Lv: { light: '#7D7A8C', dark: '#B3B0C2' },
  Ts: { light: '#3FA34D', dark: '#6EE7A0' },
  Og: { light: '#19A5AE', dark: '#5EEAD4' },
  /* The particles physics draws on their own. */
  'e-': { light: '#2B5BD7', dark: '#6E93F5' },   /* electron: the blue convention */
  'p+': { light: '#D93025', dark: '#F0564B' },   /* proton: the red convention */
  'n0': { light: '#6B7280', dark: '#9CA3AF' },   /* neutron: gray */
  'e+': { light: '#0E8C8C', dark: '#4FD1C5' },   /* positron: apart from the electron, told by its sign */
  nu: { light: '#9A8FB0', dark: '#C4B8DC' },     /* neutrino: pale, since it barely interacts */
  gamma: { light: '#C98A00', dark: '#F2C230' },  /* photon */
  other: { light: '#B05C8E', dark: '#E08CBC' },
};

const OTHER = 'other';

/* True when the map names the symbol as written, so that a lowercase HTML tag
   is never mistaken for an element. */
export const isElementSymbol = (s: string): s is ElementSymbol => s !== OTHER && Object.hasOwn(ELEMENTS, s);

/* The one lookup: a symbol and a theme in, a colour out, with the fallback for
   anything the map does not name. */
export const elementColor = (s: string, dark: boolean): Color =>
  (ELEMENTS[s] ?? ELEMENTS[OTHER])[dark ? 'dark' : 'light'];
