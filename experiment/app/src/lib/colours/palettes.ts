/* Ready-made colours the reader can take: whole palettes, which dress every
   quantity of a place at once, and single swatches for changing one of them.
   Every hue here is written for a light ground; the dark one is worked out from
   it, so a palette carries only the colours it is published with.

   A palette is a function of the count rather than a fixed list, because what a
   published set of eight should do for three quantities is not what a generator
   should do: the published one hands back its first three, the generator lays
   three out afresh, and a set with too few colours for the level says so by
   answering nothing at all, which is how the page knows not to show it. */
import { type Hex, d3Rainbow, oklchRing } from './model';

export type Palette = {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  /* The hues for n quantities, in order and all distinct, or null when the palette cannot dress that many. */
  readonly huesFor: (n: number) => readonly Hex[] | null;
};

/* A published list, which dresses any count up to its length by taking that many
   from the front, in the order its author set them down. */
export const fixed = (id: string, name: string, note: string, hues: readonly Hex[]): Palette =>
  ({ id, name, note, huesFor: (n) => (n >= 1 && n <= hues.length ? hues.slice(0, n) : null) });

/* A palette that works its colours out for the count it is given. No palette
   dresses nothing, so a count below one is refused here rather than in every
   generator. */
export const generated = (id: string, name: string, note: string, f: (n: number) => readonly Hex[] | null): Palette =>
  ({ id, name, note, huesFor: (n) => (n >= 1 ? f(n) : null) });

/* Paul Tol's discrete rainbow, which is not one list cut short but a different
   cut for every count: the whole set of twenty-nine below, and then the indices
   into it that Tol's own tol_colors.py names for each number of quantities, so
   that what the reader gets is the set Tol chose to stay distinct at that size. */
const TOL_RAINBOW: readonly Hex[] = [
  '#E8ECFB', '#D9CCE3', '#D1BBD7', '#CAACCB', '#BA8DB4', '#AE76A3', '#AA6F9E', '#994F88', '#882E72', '#1965B0',
  '#437DBF', '#5289C7', '#6195CF', '#7BAFDE', '#4EB265', '#90C987', '#CAE0AB', '#F7F056', '#F7CB45', '#F6C141',
  '#F4A736', '#F1932D', '#EE8026', '#E8601C', '#E65518', '#DC050C', '#A5170E', '#72190E', '#42150A',
];
const TOL_CUTS: readonly (readonly number[])[] = [
  [9],
  [9, 25],
  [9, 17, 25],
  [9, 14, 17, 25],
  [9, 13, 14, 17, 25],
  [9, 13, 14, 16, 17, 25],
  [8, 9, 13, 14, 16, 17, 25],
  [8, 9, 13, 14, 16, 17, 22, 25],
  [8, 9, 13, 14, 16, 17, 22, 25, 27],
  [8, 9, 13, 14, 16, 17, 20, 23, 25, 27],
  [8, 9, 11, 13, 14, 16, 17, 20, 23, 25, 27],
  [2, 5, 8, 9, 11, 13, 14, 16, 17, 20, 23, 25],
  [2, 5, 8, 9, 11, 13, 14, 15, 16, 17, 20, 23, 25],
  [2, 5, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25],
  [2, 5, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25, 27],
  [2, 4, 6, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25, 27],
  [2, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25, 27],
  [2, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25, 26, 27],
  [1, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17, 19, 21, 23, 25, 26, 27],
  [1, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 26, 27],
  [1, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 25, 26, 27],
  [1, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 25, 26, 27, 28],
  [0, 1, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 25, 26, 27, 28],
];
const tolRainbow = (n: number): readonly Hex[] | null => {
  const cut = TOL_CUTS[n - 1];
  return cut ? cut.map((i) => TOL_RAINBOW[i]) : null;
};

/* The order the page shows them in: the two that never refuse first, since they
   answer for any level the book can have; then Tol's rainbow, which is cut
   rather than trimmed; then the published lists, the short and careful ones
   before the long ones, and the book's own at the end. */
export const PALETTES: readonly Palette[] = [
  generated(
    'oklch',
    'Even hues',
    'Hues spaced evenly round the colour circle, as many as the level needs, all at one lightness so no one of them shouts.',
    (n) => oklchRing(n),
  ),
  generated(
    'rainbow',
    'Rainbow',
    "D3's rainbow sampled as many times as the level needs, so the run of hues reads as one band.",
    (n) => d3Rainbow(n),
  ),
  generated(
    'tol-rainbow',
    'Paul Tol discrete rainbow',
    "Paul Tol's rainbow cut for exactly this many, up to twenty-three, so each cut stays distinct for readers with the common forms of colour blindness.",
    tolRainbow,
  ),
  fixed(
    'okabe-ito',
    'Okabe–Ito',
    'Eight colours that stay apart for readers with the common forms of colour blindness.',
    ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'],
  ),
  fixed(
    'tol-bright',
    'Paul Tol bright',
    'Seven strong colours that hold their difference on a white page and in print.',
    ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'],
  ),
  fixed(
    'tol-vibrant',
    'Paul Tol vibrant',
    'Seven brighter colours for lines and markers that must be seen from across a room.',
    ['#EE7733', '#0077BB', '#33BBEE', '#EE3377', '#CC3311', '#009988', '#BBBBBB'],
  ),
  fixed(
    'tol-muted',
    'Paul Tol muted',
    'Nine quieter colours for a page that carries a great many quantities at once.',
    ['#CC6677', '#332288', '#DDCC77', '#117733', '#88CCEE', '#882255', '#44AA99', '#999933', '#AA4499'],
  ),
  fixed(
    'tableau-10',
    'Tableau 10',
    'Ten muted colours meant for charts, so no one of them shouts over the others.',
    ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'],
  ),
  fixed(
    'category10',
    'D3 category10',
    'Ten colours you will have seen in a great many plots, in their familiar order.',
    ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'],
  ),
  fixed(
    'dark2',
    'ColorBrewer Dark2',
    'Eight deep colours that read clearly as text as well as in a drawing.',
    ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666'],
  ),
  fixed(
    'set1',
    'ColorBrewer Set1',
    'Nine primary colours, the boldest of these sets and the easiest to name aloud.',
    ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33', '#A65628', '#F781BF', '#999999'],
  ),
  fixed(
    'kelly',
    "Kelly's colours of maximum contrast",
    "Kenneth Kelly's twenty-two colours in the order that keeps each new one far from those before it; white, black and grey are left out, since they are the page and the ink.",
    [
      '#F3C300', '#875692', '#F38400', '#A1CAF1', '#BE0032', '#C2B280', '#008856', '#E68FAC', '#0067A5', '#F99379',
      '#604E97', '#F6A600', '#B3446C', '#DCD300', '#882D17', '#8DB600', '#654522', '#E25822', '#2B3D26',
    ],
  ),
  fixed(
    'polychrome',
    'Polychrome 36',
    'Thirty-six colours built to stay apart on a white page; the grey and the near-white that open the set are left out.',
    [
      '#F6222E', '#FE00FA', '#16FF32', '#3283FE', '#FEAF16', '#B00068', '#1CFFCE', '#90AD1C', '#2ED9FF', '#DEA0FD',
      '#AA0DFE', '#F8A19F', '#325A9B', '#C4451C', '#1C8356', '#85660D', '#B10DA1', '#FBE426', '#1CBE4F', '#FA0087',
      '#FC1CBF', '#F7E1A0', '#C075A6', '#782AB6', '#AAF400', '#BDCDFF', '#822E1C', '#B5EFB5', '#7ED7D1', '#1C7F93',
      '#D85FF7', '#683B79', '#66B0FF', '#3B00FB',
    ],
  ),
  fixed(
    'glasbey',
    'Glasbey',
    'Colours chosen one after another to be as far as possible from every one before, from the set colorcet ships.',
    [
      '#D70000', '#8C3CFF', '#028800', '#00ACC7', '#98FF00', '#FF7FD1', '#6C004F', '#FFA530', '#583B00', '#005759',
      '#0000DD', '#00FDCF', '#A1756A', '#BCB7FF', '#95B578', '#C004B9', '#645474', '#790000', '#0774D8', '#FEF590',
      '#004B00', '#8F7A00', '#FF7266', '#EEB9B9', '#5E7E66', '#9BE4FF', '#EC0077', '#A67BB9', '#5A00A4', '#04C600',
      '#9E4B00', '#9C3B50',
    ],
  ),
  fixed(
    'book',
    "The book's own",
    'The six colours the book pins to its quantities, followed by the three a chapter draws on.',
    ['#B45309', '#1D4ED8', '#B91C1C', '#6D28D9', '#15803D', '#0E7490', '#BE185D', '#4D7C0F', '#0F766E'],
  ),
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
