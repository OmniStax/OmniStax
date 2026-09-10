/* Ready-made colours the reader can take: whole palettes, which dress every
   quantity of a place at once, and single swatches for changing one of them.
   Every hue here is written for a light ground; the dark one is worked out from
   it, so a palette carries only the colours it is published with. */
import type { Hex } from './model';

export type Palette = { readonly id: string; readonly name: string; readonly note: string; readonly hues: readonly Hex[] };

export const PALETTES: readonly Palette[] = [
  {
    id: 'okabe-ito',
    name: 'Okabe–Ito',
    note: 'Eight colours that stay apart for readers with the common forms of colour blindness.',
    hues: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'],
  },
  {
    id: 'tableau-10',
    name: 'Tableau 10',
    note: 'Ten muted colours meant for charts, so no one of them shouts over the others.',
    hues: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'],
  },
  {
    id: 'tol-bright',
    name: 'Paul Tol bright',
    note: 'Seven strong colours that hold their difference on a white page and in print.',
    hues: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'],
  },
  {
    id: 'tol-vibrant',
    name: 'Paul Tol vibrant',
    note: 'Seven brighter colours for lines and markers that must be seen from across a room.',
    hues: ['#EE7733', '#0077BB', '#33BBEE', '#EE3377', '#CC3311', '#009988', '#BBBBBB'],
  },
  {
    id: 'tol-muted',
    name: 'Paul Tol muted',
    note: 'Nine quieter colours for a page that carries a great many quantities at once.',
    hues: ['#CC6677', '#332288', '#DDCC77', '#117733', '#88CCEE', '#882255', '#44AA99', '#999933', '#AA4499'],
  },
  {
    id: 'dark2',
    name: 'ColorBrewer Dark2',
    note: 'Eight deep colours that read clearly as text as well as in a drawing.',
    hues: ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666'],
  },
  {
    id: 'set1',
    name: 'ColorBrewer Set1',
    note: 'Nine primary colours, the boldest of these sets and the easiest to name aloud.',
    hues: ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33', '#A65628', '#F781BF', '#999999'],
  },
  {
    id: 'category10',
    name: 'D3 category10',
    note: 'Ten colours you will have seen in a great many plots, in their familiar order.',
    hues: ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'],
  },
  {
    id: 'book',
    name: "The book's own",
    note: 'The six colours the book pins to its quantities, followed by the three a chapter draws on.',
    hues: ['#B45309', '#1D4ED8', '#B91C1C', '#6D28D9', '#15803D', '#0E7490', '#BE185D', '#4D7C0F', '#0F766E'],
  },
];

export type Swatch = { readonly name: string; readonly hex: Hex };

/* Single colours to change one quantity with, deep enough to read as text on a
   white page. The last two are the book's own, which no plain name here matches. */
export const SWATCHES: readonly Swatch[] = [
  { name: 'red', hex: '#DC2626' },
  { name: 'orange', hex: '#EA580C' },
  { name: 'amber', hex: '#D97706' },
  { name: 'olive', hex: '#4D7C0F' },
  { name: 'green', hex: '#15803D' },
  { name: 'teal', hex: '#0F766E' },
  { name: 'cyan', hex: '#0E7490' },
  { name: 'sky', hex: '#0284C7' },
  { name: 'blue', hex: '#1D4ED8' },
  { name: 'indigo', hex: '#4338CA' },
  { name: 'violet', hex: '#6D28D9' },
  { name: 'purple', hex: '#7E22CE' },
  { name: 'magenta', hex: '#BE185D' },
  { name: 'pink', hex: '#DB2777' },
  { name: 'brown', hex: '#78350F' },
  { name: 'slate', hex: '#475569' },
  { name: "the book's orange", hex: '#B45309' },
  { name: "the book's red", hex: '#B91C1C' },
];
