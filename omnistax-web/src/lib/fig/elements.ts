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
   "other" fallback for anything unlisted. */
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
