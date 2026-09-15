/* Ready-made colours the reader can take: whole palettes, which dress every
   quantity of a place at once, and single swatches for changing one of them.
   Every hue here is written for a light ground; the dark one is worked out from
   it, so a palette carries only the colours it is published with.

   A palette is one of two things, and which it is matters beyond the colours it
   holds. A fixed palette is a list somebody published, and it dresses any count
   up to its length by taking that many from the front; a variable one works its
   colours out for the count it is given, so it answers for a level of any size.
   The book's scheme is drawn from the fixed ones, since a published set is what
   a reader recognises, and the ring is what answers when none of them fits. */
import { type Hex, d3Rainbow, oklchRing } from './model';

export type PaletteId = string & { readonly __brand: 'PaletteId' };
export const paletteId = (s: string): PaletteId => s as PaletteId;

export type Palette =
  | { readonly kind: 'fixed'; readonly id: PaletteId; readonly name: string; readonly note: string; readonly hues: readonly Hex[] }
  | { readonly kind: 'variable'; readonly id: PaletteId; readonly name: string; readonly note: string; readonly huesFor: (n: number) => readonly Hex[] | null };

/* A published list, which dresses any count up to its length. */
export const fixed = (id: string, name: string, note: string, hues: readonly Hex[]): Palette =>
  ({ kind: 'fixed', id: paletteId(id), name, note, hues });

/* A palette that works its colours out for the count it is given. */
export const generated = (id: string, name: string, note: string, huesFor: (n: number) => readonly Hex[] | null): Palette =>
  ({ kind: 'variable', id: paletteId(id), name, note, huesFor });

/* The hues for n quantities, in order and all distinct, or nothing at all when
   the palette cannot dress that many, which is how the page knows not to offer
   it. No palette dresses nothing, so a count below one is refused here rather
   than in every generator. */
export const huesOf = (p: Palette, n: number): readonly Hex[] | null => {
  if (n < 1) return null;
  if (p.kind === 'fixed') return n <= p.hues.length ? p.hues.slice(0, n) : null;
  return p.huesFor(n);
};

/* The book's own scheme: one hue for every place in the order the book declares
   its quantities in, and the list the scheme is drawn from before any published
   set. The published lists were made for a chart of eight or ten series and fail
   a textbook of thirty: Polychrome, the only one long enough for a physics
   book's quantities, hands pressure a pale yellow that no reader can read as an
   axis title on a white page, and puts five near-identical magentas on the same
   shelf. These are built instead, and built to two rules.

   Legibility first. Every hue is OKLCH lightness 0.52 — the light value of the
   categorical palette — at the deepest chroma that lightness holds in gamut,
   capped at 0.16 so that the reds and violets, where the gamut is widest, do not
   shout over the greens and teals, where it is narrow. Each one reads as text on
   the page's white and its dark counterpart, which the colour arithmetic carries
   to HSL lightness 0.7, reads on the dark ground. Nothing here is a pale yellow,
   because nothing here is pale.

   Distinctness second, and by place rather than by chance. The first
   twenty-nine places — every quantity Chapters 1 to 19 wear — hold the angles an
   annealing search dealt them: the twelfths of the circle, laid along the book's
   order so that no two neighbouring places lie within 84° of each other and no
   two places of quantities drawn on one page together lie within 60°. The first
   nine places keep the hue family they wore before, none of them turned by more
   than 21°, since Chapters 1 to 9 were tuned to them: what was a garish red,
   magenta, green, blue and amber is the same red, magenta, green, blue and
   amber, only deep enough to read.

   Every place after the twenty-ninth is dealt one at a time and for keeps, by
   the same measure but append-only: a new quantity takes the angle, off the
   half-step grid of 6°, that stands furthest from the place before it in the
   order and from every place it is drawn beside, and the places already dealt
   are never dealt again. So a chapter that declares a quantity never moves the
   colour of one already published. Dealt this way the scheme holds both floors
   all the way out: from twenty-nine places to forty-eight the neighbouring
   places stay 84° apart and the pairs drawn together 60° apart, which is the
   whole of what the thirty-place anneal achieved, so neither floor has had to be
   relaxed. Place thirty, current, is the one exception to append-only and was
   re-dealt: the anneal had put it at 204°, 36° from voltage, which is the very
   clash a circuit page cannot afford, and it was declared the same day as this,
   before any chapter drew it. */

/* Linear light to the sRGB a screen is asked for, and back to a hex byte. */
const encodeSrgb = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const byte = (x: number): string => Math.round(255 * clamp01(x)).toString(16).padStart(2, '0').toUpperCase();

/* One OKLCH colour as linear sRGB, by Björn Ottosson's OKLab. */
const linearOf = (l: number, c: number, deg: number): readonly [number, number, number] => {
  const h = (deg * Math.PI) / 180, a = c * Math.cos(h), b = c * Math.sin(h);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc,
  ];
};

const SCHEME_L = 0.52;
const SCHEME_C_CAP = 0.16;

/* The hue at an angle: lightness 0.52 at the deepest chroma the screen can show
   there, found by halving the interval, and never deeper than the cap. */
const deepHue = (deg: number): Hex => {
  const shows = (c: number): boolean => linearOf(SCHEME_L, c, deg).every((v) => v >= -1e-9 && v <= 1 + 1e-9);
  let lo = 0, hi = SCHEME_C_CAP;
  if (shows(hi)) lo = hi;
  else for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (shows(mid)) lo = mid; else hi = mid; }
  return '#' + linearOf(SCHEME_L, lo, deg).map((v) => byte(encodeSrgb(clamp01(v)))).join('');
};

/* The angles the anneal dealt the first twenty-nine places, and the hues it
   published for them. The hues are written out rather than worked out from the
   angles: eight of them fall a single channel step from what the arithmetic here
   gives, and a chapter already drawn is not worth even that much of a move. */
const TUNED_DEG: readonly number[] = [
  36, 312, 132, 252, 96, 12, 192, 108, 216, 348,
  156, 276, 144, 264, 48, 300, 60, 180, 84, 336,
  240, 0, 120, 288, 72, 228, 24, 168, 324,
];
const TUNED_HUES: readonly Hex[] = [
  '#B23B19', '#8747AA', '#487901', '#0069BF', '#7C6800', '#B13550', '#067976', '#706D00', '#02768B', '#A73879',
  '#007D49', '#535BC3', '#137F1F', '#3862C4', '#A74900', '#794DB6', '#9A5500', '#027A6B', '#866302', '#9E3C8B',
  '#0070A6', '#AD3665', '#607200', '#6754BE', '#905C00', '#007397', '#B33738', '#007C5D', '#94419C',
];

/* The places whose quantities are drawn on one page together, as places in the
   book's order rather than names, since a palette knows places and not
   quantities: force with pressure, position with velocity and acceleration,
   energy with temperature and entropy, voltage with electric field and with
   current, current with resistance and with the magnetic field, the magnetic
   field with force, velocity and the electric field, and the thirty-odd other
   pairs the test beside this file names. */
const TOGETHER_PLACES: readonly (readonly [number, number])[] = [
  [0, 1], [0, 2], [1, 2], [1, 3], [1, 5], [1, 17], [1, 18], [1, 24], [1, 27], [2, 3],
  [2, 20], [2, 25], [2, 31], [4, 5], [4, 9], [4, 13], [4, 17], [4, 31], [5, 11], [5, 22],
  [5, 23], [5, 24], [5, 27], [6, 26], [8, 14], [9, 10], [12, 16], [17, 18], [17, 19], [17, 20],
  [17, 21], [18, 20], [22, 23], [24, 25], [24, 27], [25, 27], [25, 31], [27, 28], [27, 29], [29, 30],
  [29, 31],
];

/* The shorter way round the hue circle, in degrees. */
const gapDeg = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/* How many places the scheme can deal: the half-step grid of 6° holds sixty
   angles, and the scheme is built out to forty-eight, which is a dozen more
   quantities than the longest book the app carries declares. */
export const SCHEME_PLACES = 48;

/* The angles for n places: the tuned prefix, then one place at a time, each
   taking the angle left in the grid that stands furthest from the place before
   it and from every place it is drawn beside. Append-only, so the angles for n
   are always the angles for n − 1 with one more on the end. */
const dealDegrees = (n: number): readonly number[] => {
  const deg: number[] = TUNED_DEG.slice(0, n);
  const pool = Array.from({ length: 60 }, (_, i) => 6 * i).filter((a) => !deg.includes(a));
  while (deg.length < n) {
    const k = deg.length;
    const bound = [...TOGETHER_PLACES.flatMap(([a, b]) => (b === k && a < k ? [a] : a === k && b < k ? [b] : [])), k - 1];
    const score = (c: number): readonly [number, number] =>
      [Math.min(...bound.map((j) => gapDeg(c, deg[j]))), Math.min(...deg.map((a) => gapDeg(c, a)))];
    const best = pool.reduce((won, c) => {
      const [p, q] = score(c), [wp, wq] = score(won);
      return p > wp || (p === wp && q > wq) ? c : won;
    }, pool[0]);
    deg.push(best);
    pool.splice(pool.indexOf(best), 1);
  }
  return deg;
};

/* The scheme's hues, in place order: the tuned ones as they were published, and
   every later place worked out from the angle it was dealt. */
export const SCHEME_DEGREES: readonly number[] = dealDegrees(SCHEME_PLACES);
const SCHEME_HUES: readonly Hex[] = SCHEME_DEGREES.map((d, i) => TUNED_HUES[i] ?? deepHue(d));

export const SCHEME: Palette = fixed(
  'omnistax',
  'OmniStax',
  'Forty-eight deep hues that read as text on either ground, spaced so that neighbouring quantities and the quantities drawn together on one page are far apart.',
  SCHEME_HUES,
);

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

/* The ring, which lays out as many hues as it is asked for and so can dress a
   level of any size. It is the scheme a book falls back on when no published
   list is long enough for its quantities. */
export const OKLCH: Palette = generated(
  'oklch',
  'Even hues',
  'Hues spaced evenly round the colour circle, as many as the level needs, all at one lightness so no one of them shouts.',
  (n) => oklchRing(n),
);

/* The order the page shows them in, and the order the scheme is chosen from:
   the book's own list first, since it is the one built for a textbook's count
   and the one the scheme takes; then the two that never refuse, since they
   answer for any level the book can have; then Tol's rainbow, which is cut
   rather than trimmed; then the published lists, the short and careful ones
   before the long ones. */
export const PALETTES: readonly Palette[] = [
  SCHEME,
  OKLCH,
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
];

export const paletteById = (id: PaletteId): Palette | null => PALETTES.find((p) => p.id === id) ?? null;

/* The scheme a book of n quantities wears before the reader chooses anything:
   the first list that can dress every one of them, and the ring when none of
   them can. The book's own list stands at the head, so it is what every book up
   to forty-eight quantities wears; the published sets follow it, for a reader who
   asks for one by name; the ring is there so that no book is left without
   colours. */
export const schemePalette = (n: number): Palette =>
  PALETTES.find((p) => p.kind === 'fixed' && huesOf(p, n) !== null) ?? OKLCH;

export type Swatch = { readonly name: string; readonly hex: Hex };

/* Single colours to change one quantity with, deep enough to read as text on a
   white page and each with a name a reader would use aloud. */
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
  { name: 'rose', hex: '#BE123C' },
  { name: 'emerald', hex: '#047857' },
];
