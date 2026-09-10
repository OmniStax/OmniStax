import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_CHOICES, type Choices, type Hue, type Place, applyPalette, clearHue, clearPlace, cssFor, d3Rainbow, darkOf,
  effectiveHue, fromFile, hueFrom, isEmpty, isHex, lightOf, moveType, normHex, oklchRing, orderOf, ownHue, placeKey,
  placeOf, schemeOf, setHue, symbolsOf, toFile, typesAt,
} from '../src/lib/colours/model';
import { SWATCHES, huesOf, paletteById, paletteId, schemePalette } from '../src/lib/colours/palettes';
import type { BookManifest } from '../src/lib/content/schema';
import { bookId, chapterId, sectionId } from '../src/lib/types/ids';

/* A book of two chapters and four quantities. Section 16.1 is listed but never
   built, so what it would colour counts for nothing; 16.4 binds nothing, which
   means it colours everything. The book pins no hues at all: what its
   quantities wear is the scheme, which for four of them is Okabe–Ito. */
const section = (id: string, binds: readonly string[], built: boolean) =>
  ({ id, title: id, built, url: '', fragment: '', figuresJs: '', figures: [], binds, exercises: [] });
const manifestOf = (types: Readonly<Record<string, { label: string; dimension?: string }>>, chapters: readonly unknown[] = [], macros: Readonly<Record<string, string>> = {}) =>
  ({
    id: bookId('college-physics-2e'), title: 'College Physics', publisher: 'OpenStax', authors: [], license: 'CC BY',
    types, macros, symbols: {}, exerciseKinds: {}, chapters,
  } as unknown as BookManifest);

const MANIFEST = manifestOf(
  {
    time: { label: 'time', dimension: 's' },
    position: { label: 'position, displacement', dimension: 'm' },
    frequency: { label: 'frequency', dimension: 'Hz' },
    stiffness: { label: 'force constant', dimension: 'N/m' },
  },
  [
    { id: '2', dir: 'ch02', title: 'Kinematics', concepts: '', formulas: '', sections: [section('2.1', ['time', 'position'], true)] },
    { id: '16', dir: 'ch16', title: 'Oscillatory Motion and Waves', concepts: '', formulas: '', sections: [
      section('16.1', ['stiffness'], false), section('16.3', ['position', 'time', 'frequency'], true), section('16.4', [], true),
    ] },
  ],
);
/* The book's macros, which are the only place a type's symbols are written down. */
const MACROS = manifestOf(MANIFEST.types, [], {
  '\\kt': '\\htmlClass{kv-time}{\\htmlData{sym=t}{t}}',
  '\\kdt': '\\htmlClass{kv-time}{\\htmlData{sym=Δt}{\\Delta t}}',
  '\\kf': '\\htmlClass{kv-frequency}{\\htmlData{sym=f}{f}}',
  '\\kw': '\\htmlClass{kv-angular-rate}{\\htmlData{sym=ω}{\\omega}}',
});

/* A book of n quantities, named q1, q2 and so on, for asking which palette the
   scheme falls to at that size. */
const bookOf = (n: number): BookManifest =>
  manifestOf(Object.fromEntries(Array.from({ length: n }, (_, i) => [`q${i + 1}`, { label: `q${i + 1}` }])));

const BOOK: Place = { level: 'book' };
const CH16: Place = { level: 'chapter', chapter: chapterId('16') };
const CH2: Place = { level: 'chapter', chapter: chapterId('2') };
const S163: Place = { level: 'section', chapter: chapterId('16'), section: sectionId('16.3') };
const hue = (light: string, dark: string): Hue => ({ light, dark });
const chose = (order: readonly string[]): Choices => ({ ...NO_CHOICES, order });
const OKABE = ['#E69F00', '#56B4E9', '#009E73', '#F0E442'];

test('a target names a place, and a section names its chapter as well', () => {
  assert.deepEqual(placeOf({ level: 'book' }), BOOK);
  assert.deepEqual(placeOf({ level: 'chapter', chapter: chapterId('16') }), CH16);
  assert.deepEqual(placeOf({ level: 'section', section: sectionId('16.3') }), S163);
  assert.equal(placeKey(BOOK), 'book');
  assert.equal(placeKey(CH16), 'chapter:16');
  assert.equal(placeKey(S163), 'section:16.3');
});

test('the order is what the reader has placed, and then the book for the rest', () => {
  assert.deepEqual(orderOf(MANIFEST, NO_CHOICES), ['time', 'position', 'frequency', 'stiffness'],
    'having placed nothing, the reader sees the book\'s own order');
  assert.deepEqual(orderOf(MANIFEST, chose(['frequency'])), ['frequency', 'time', 'position', 'stiffness'],
    'what they placed stands first, and the rest follow in the book\'s order');
  assert.deepEqual(orderOf(MANIFEST, chose(['energy', 'stiffness', 'nothing'])), ['stiffness', 'time', 'position', 'frequency'],
    'a quantity the book does not declare is dropped rather than shown');
  assert.deepEqual(orderOf(MANIFEST, chose(['stiffness', 'frequency', 'position', 'time'])), ['stiffness', 'frequency', 'position', 'time']);
});

test('a quantity moved lands where it was dropped, and the whole order is kept', () => {
  const moved = moveType(MANIFEST, NO_CHOICES, 'stiffness', 'position');
  assert.deepEqual(moved.order, ['time', 'stiffness', 'position', 'frequency'],
    'the order that comes back is the whole of it, so a later move starts from what the reader sees');
  assert.deepEqual(orderOf(MANIFEST, moved), moved.order);
  assert.deepEqual(moveType(MANIFEST, NO_CHOICES, 'time', null).order, ['position', 'frequency', 'stiffness', 'time'],
    'nothing to land before means the end of the list');
  assert.equal(moveType(MANIFEST, NO_CHOICES, 'time', 'time'), NO_CHOICES, 'a quantity moved before itself has not moved');
  assert.equal(moveType(MANIFEST, NO_CHOICES, 'time', 'position'), NO_CHOICES, 'nor has one dropped where it already stands');
  assert.equal(moveType(MANIFEST, NO_CHOICES, 'nothing', 'time'), NO_CHOICES, 'nor a quantity the book does not declare');
  assert.equal(moveType(MANIFEST, NO_CHOICES, 'time', 'nothing'), NO_CHOICES, 'and there is nowhere to land before one');
  /* Two moves in a row, to show the second reads the first. */
  const twice = moveType(MANIFEST, moved, 'frequency', 'time');
  assert.deepEqual(twice.order, ['frequency', 'time', 'stiffness', 'position']);
});

test('the scheme is the first published palette that dresses every quantity, else the ring', () => {
  assert.equal(schemeOf(MANIFEST, NO_CHOICES).palette.id, paletteId('okabe-ito'), 'four quantities take the eight of Okabe–Ito');
  assert.equal(schemeOf(bookOf(9), NO_CHOICES).palette.id, paletteId('tol-muted'), 'nine take Paul Tol muted, the first list long enough');
  assert.equal(schemeOf(bookOf(40), NO_CHOICES).palette.id, paletteId('oklch'), 'forty are past every published list, so the ring lays them out');
  assert.equal(schemePalette(9).name, 'Paul Tol muted');
  assert.equal(paletteById(paletteId('tol-muted'))?.name, 'Paul Tol muted');
  assert.equal(paletteById(paletteId('nothing')), null);
});

test('the scheme lays its hues along the reader\'s order, so a quantity moved changes colour', () => {
  const plain = schemeOf(MANIFEST, NO_CHOICES);
  assert.deepEqual(['time', 'position', 'frequency', 'stiffness'].map((k) => plain.hues[k].light), OKABE);
  assert.deepEqual(plain.hues.time, hue(OKABE[0], darkOf(OKABE[0])), 'and the dark ground is worked out from the light one');
  const moved = schemeOf(MANIFEST, moveType(MANIFEST, NO_CHOICES, 'stiffness', 'time'));
  assert.equal(moved.hues.stiffness.light, OKABE[0], 'the quantity now first takes the first hue');
  assert.equal(moved.hues.time.light, OKABE[1]);
});

test('a section wins over its chapter, a chapter over the book, and the book over the scheme', () => {
  const at = (c: Choices) => effectiveHue(MANIFEST, c, 'time', S163);
  assert.deepEqual(at(NO_CHOICES), { hue: hue(OKABE[0], darkOf(OKABE[0])), from: { kind: 'scheme', palette: paletteId('okabe-ito') } });
  const book = setHue(NO_CHOICES, BOOK, 'time', hue('#111111', '#222222'));
  assert.deepEqual(at(book), { hue: hue('#111111', '#222222'), from: { kind: 'book' } });
  const chapter = setHue(book, CH16, 'time', hue('#333333', '#444444'));
  assert.deepEqual(at(chapter), { hue: hue('#333333', '#444444'), from: { kind: 'chapter', chapter: chapterId('16') } });
  const sec = setHue(chapter, S163, 'time', hue('#555555', '#666666'));
  assert.deepEqual(at(sec), { hue: hue('#555555', '#666666'), from: { kind: 'section', section: sectionId('16.3') } });
  /* Nothing is copied downwards, so another chapter still reads the book's own. */
  assert.deepEqual(effectiveHue(MANIFEST, sec, 'time', CH2), { hue: hue('#111111', '#222222'), from: { kind: 'book' } });
  /* Clearing hands the type back to the tier above, one step at a time. */
  assert.deepEqual(at(clearHue(sec, S163, 'time')), { hue: hue('#333333', '#444444'), from: { kind: 'chapter', chapter: chapterId('16') } });
  assert.deepEqual(at(clearHue(clearHue(sec, S163, 'time'), CH16, 'time')), { hue: hue('#111111', '#222222'), from: { kind: 'book' } });
  assert.deepEqual(at(clearPlace(clearPlace(clearPlace(sec, S163), CH16), BOOK)).from, { kind: 'scheme', palette: paletteId('okabe-ito') });
});

test('every quantity of the book has a colour, and only a stranger has none', () => {
  assert.deepEqual(effectiveHue(MANIFEST, NO_CHOICES, 'stiffness', S163).from, { kind: 'scheme', palette: paletteId('okabe-ito') },
    'a page that does not bind a quantity still knows what colour it would be');
  assert.deepEqual(effectiveHue(MANIFEST, NO_CHOICES, 'energy', BOOK), { hue: null, from: { kind: 'none' } },
    'a key the book does not declare is not a quantity of it');
});

test('what is set at a place is read back at that place and nowhere else', () => {
  const c = setHue(NO_CHOICES, CH16, 'time', hue('#333333', '#444444'));
  assert.deepEqual(ownHue(c.overrides, 'time', CH16), hue('#333333', '#444444'));
  assert.equal(ownHue(c.overrides, 'time', S163), null);
  assert.equal(ownHue(c.overrides, 'time', BOOK), null);
  assert.equal(ownHue(c.overrides, 'position', CH16), null);
  assert.equal(isEmpty(c), false);
  assert.equal(isEmpty(clearHue(c, CH16, 'time')), true, 'and an emptied chapter leaves nothing behind it');
  assert.equal(isEmpty(chose(['frequency'])), false, 'an order the reader has chosen is a choice like any other');
  assert.equal(clearHue(c, CH16, 'position'), c, 'clearing what was never set changes nothing');
  assert.equal(clearPlace(NO_CHOICES, CH16), NO_CHOICES);
});

test('every level shows the types it has to show, in the order the reader has put them in', () => {
  assert.deepEqual(typesAt(MANIFEST, NO_CHOICES, BOOK), ['time', 'position', 'frequency', 'stiffness']);
  assert.deepEqual(typesAt(MANIFEST, NO_CHOICES, CH16), ['time', 'position', 'frequency', 'stiffness'],
    'section 16.4 binds nothing, which colours everything, so the chapter shows everything');
  assert.deepEqual(typesAt(MANIFEST, NO_CHOICES, CH2), ['time', 'position'], 'what its one built section colours');
  assert.deepEqual(typesAt(MANIFEST, NO_CHOICES, S163), ['time', 'position', 'frequency'], 'in the order the book declares them');
  assert.deepEqual(typesAt(MANIFEST, NO_CHOICES, { level: 'section', chapter: chapterId('16'), section: sectionId('16.4') }),
    ['time', 'position', 'frequency', 'stiffness'], 'a page that binds nothing colours everything');
  const moved = moveType(MANIFEST, NO_CHOICES, 'frequency', 'time');
  assert.deepEqual(typesAt(MANIFEST, moved, S163), ['frequency', 'time', 'position'], 'and every level follows the reader\'s order');
  assert.deepEqual(typesAt(MANIFEST, moved, CH2), ['time', 'position'], 'without showing a quantity the level does not colour');
});

test('a palette dresses the types in order and refuses to leave any of them out', () => {
  const types = typesAt(MANIFEST, NO_CHOICES, S163);
  const c = applyPalette(NO_CHOICES, S163, types, ['#E69F00', '#56B4E9', '#009E73', '#F0E442']);
  assert.ok(c);
  const lights = types.map((t) => ownHue(c.overrides, t, S163)?.light);
  assert.deepEqual(lights, ['#E69F00', '#56B4E9', '#009E73'], 'each type takes the next hue');
  assert.equal(new Set(lights).size, types.length, 'so no two of them come out the same');
  assert.deepEqual(ownHue(c.overrides, 'time', S163)?.dark, darkOf('#E69F00'), 'and the dark slot is worked out from it');
  assert.equal(applyPalette(NO_CHOICES, S163, types, ['#E69F00', '#56B4E9']), null, 'two colours cannot dress three quantities');
  assert.notEqual(applyPalette(NO_CHOICES, S163, types, ['#E69F00', '#56B4E9', '#009E73']), null, 'three exactly can');
});

test('every swatch on offer is a colour of its own with a plain name', () => {
  assert.ok(SWATCHES.length >= 16);
  assert.ok(SWATCHES.every((s) => isHex(s.hex)));
  assert.equal(new Set(SWATCHES.map((s) => normHex(s.hex))).size, SWATCHES.length);
});

test('the even ring lays n distinct hues round the colour circle', () => {
  assert.deepEqual(oklchRing(0), [], 'fewer than one is no hues at all');
  assert.deepEqual(oklchRing(1), ['#B54A46'], 'one hue, taken at the 25° the ring starts from');
  /* Worked through by hand from the OKLab matrices at L 0.55, C 0.14, h 25°:
     the linear channels come out 0.4618, 0.0688 and 0.0613, which encode to
     181, 74 and 70. */
  for (let n = 1; n <= 40; n++) {
    const hues = oklchRing(n);
    assert.equal(hues.length, n, `${n} quantities get ${n} hues`);
    assert.ok(hues.every(isHex), `the hues for ${n} are written in hex`);
    assert.equal(new Set(hues).size, n, `the hues for ${n} are all different`);
  }
});

test("the rainbow samples d3's curve n times, so its ends never meet", () => {
  assert.deepEqual(d3Rainbow(0), [], 'fewer than one is no hues at all');
  assert.deepEqual(d3Rainbow(1), ['#6E40AA'], "d3's interpolateRainbow at t = 0");
  assert.deepEqual(d3Rainbow(4), ['#6E40AA', '#FF5E63', '#AFF05B', '#1AC7C2'], 'quarter turns round the same curve');
  for (let n = 1; n <= 40; n++) {
    const hues = d3Rainbow(n);
    assert.equal(hues.length, n, `${n} quantities get ${n} hues`);
    assert.ok(hues.every(isHex), `the hues for ${n} are written in hex`);
    assert.equal(new Set(hues).size, n, `the hues for ${n} are all different`);
  }
});

test('the stylesheet carries the scheme even when the reader has chosen nothing', () => {
  const scheme = (mode: 'light' | 'dark') =>
    orderOf(MANIFEST, NO_CHOICES).map((k, i) => `--c-${k}:${mode === 'light' ? OKABE[i] : darkOf(OKABE[i])}`).join(';');
  const guarded = ':root:not([data-theme="light"])';
  assert.equal(cssFor(MANIFEST, NO_CHOICES),
    `:root{${scheme('light')}}`
    + `@media (prefers-color-scheme: dark){${guarded}{${scheme('dark')}}}`
    + `:root[data-theme="dark"]{${scheme('dark')}}`);
});

test('the stylesheet writes the three blocks the book writes, and the section rule outranks its chapter', () => {
  const c = setHue(setHue(setHue(NO_CHOICES, BOOK, 'time', hue('#111111', '#222222')), CH16, 'frequency', hue('#333333', '#444444')), S163, 'position', hue('#555555', '#666666'));
  const css = cssFor(MANIFEST, c);
  assert.match(css, /^:root\{--c-time:#E69F00;[^}]*\}:root\{--c-time:#111111\}/,
    'the scheme first and the reader after it, so theirs wins without either being marked important');
  assert.ok(css.includes('[data-chapter="ch16"], [data-chapter="ch16"]{--c-frequency:#333333}'));
  assert.ok(css.includes('[data-chapter="ch16"][data-sec="16.3"], [data-chapter="ch16"][data-sec="16.3"]{--c-position:#555555}'));
  const dark = ':root[data-theme="dark"]';
  assert.ok(css.includes(`${dark}[data-chapter="ch16"],${dark} [data-chapter="ch16"]{--c-frequency:#444444}`));
});

test('the stylesheet lists the types in the reader\'s order and names a chapter by its directory', () => {
  const c = setHue(setHue(NO_CHOICES, BOOK, 'position', hue('#555555', '#666666')), BOOK, 'time', hue('#111111', '#222222'));
  assert.match(cssFor(MANIFEST, c), /:root\{--c-time:#111111;--c-position:#555555\}/, 'time is declared first, however it was set');
  const moved = moveType(MANIFEST, c, 'position', 'time');
  assert.match(cssFor(MANIFEST, moved), /:root\{--c-position:#555555;--c-time:#111111\}/, 'and the order the reader chose is the order they are written in');
  const stray = setHue(NO_CHOICES, { level: 'chapter', chapter: chapterId('99') }, 'time', hue('#111111', '#222222'));
  assert.doesNotMatch(cssFor(MANIFEST, stray), /data-chapter="ch99"/, 'a chapter the book does not have has no selector to write');
});

test('the file and the storage hold one document, which reads back as it was written', () => {
  const book = bookId('college-physics-2e');
  const c = moveType(MANIFEST, setHue(setHue(NO_CHOICES, BOOK, 'time', hue('#111111', '#222222')), S163, 'position', hue('#555555', '#666666')), 'frequency', 'time');
  const file = toFile(book, c);
  assert.equal(file.format, 'omnistax-colours');
  assert.equal(file.version, 1);
  assert.equal(file.book, book);
  const back = fromFile(JSON.parse(JSON.stringify(file)), book);
  assert.ok(back.ok);
  assert.deepEqual(back.choices, c);
  assert.deepEqual(fromFile(JSON.parse(JSON.stringify(toFile(book, NO_CHOICES))), book), { ok: true, choices: NO_CHOICES });
});

test('a file that is not this book\'s colours says which of the two it is', () => {
  const book = bookId('college-physics-2e');
  assert.deepEqual(fromFile(toFile(bookId('another-book'), NO_CHOICES), book), { ok: false, reason: 'other-book' });
  assert.deepEqual(fromFile(null, book), { ok: false, reason: 'not-colours' });
  assert.deepEqual(fromFile({ format: 'something-else', version: 1, book, order: [], overrides: {} }, book), { ok: false, reason: 'not-colours' });
  assert.deepEqual(fromFile('nonsense', book), { ok: false, reason: 'not-colours' });
  /* What this browser held before the document had an envelope round it: bare
     overrides, which read as no colour file at all, so the reader starts afresh. */
  assert.deepEqual(fromFile({ book: { time: { light: '#111111', dark: '#222222' } }, chapters: {}, sections: {} }, book),
    { ok: false, reason: 'not-colours' });
});

test('what comes back from a file is only what reads as a colour', () => {
  const book = bookId('college-physics-2e');
  const got = fromFile({
    format: 'omnistax-colours', version: 1, book, order: ['frequency', 7, 'time'],
    overrides: {
      book: { time: { light: '#abc', dark: '#123456' }, position: { light: '#1D4ED8' }, energy: 'blue' },
      chapters: { '16': { frequency: { light: 'not a colour', dark: '#000000' } }, '2': { time: { light: '#111', dark: '#222' } } },
      sections: { '16.3': { position: { light: '#555555', dark: '#666666' } } },
    },
  }, book);
  assert.equal(got.ok, false, 'an order that is not a list of names is not a colour file');
  const good = fromFile({
    format: 'omnistax-colours', version: 1, book, order: ['frequency', 'time'],
    overrides: {
      book: { time: { light: '#abc', dark: '#123456' }, position: { light: '#1D4ED8' }, energy: 'blue' },
      chapters: { '16': { frequency: { light: 'not a colour', dark: '#000000' } }, '2': { time: { light: '#111', dark: '#222' } } },
      sections: { '16.3': { position: { light: '#555555', dark: '#666666' } } },
    },
  }, book);
  assert.ok(good.ok);
  assert.deepEqual(good.choices.order, ['frequency', 'time']);
  assert.deepEqual(good.choices.overrides.book, { time: { light: '#AABBCC', dark: '#123456' } }, 'a colour with a slot missing is left out, and hex is normalised');
  assert.deepEqual(Object.keys(good.choices.overrides.chapters), ['2'], 'a chapter left holding nothing is dropped');
  assert.deepEqual(good.choices.overrides.sections['16.3'], { position: { light: '#555555', dark: '#666666' } });
  assert.deepEqual(fromFile({ format: 'omnistax-colours', version: 1, book, overrides: 'nonsense' }, book),
    { ok: true, choices: NO_CHOICES }, 'and an envelope holding nothing readable is simply no choices');
});

test('a hex is read either way it is written', () => {
  assert.equal(isHex('#1d4ed8'), true);
  assert.equal(isHex('#ABC'), true);
  assert.equal(isHex('1d4ed8'), true);
  assert.equal(isHex('#1d4ed'), false);
  assert.equal(isHex('rebeccapurple'), false);
  assert.equal(normHex('#abc'), '#AABBCC');
  assert.equal(normHex(' #1d4ed8 '), '#1D4ED8');
  assert.equal(normHex('nonsense'), '#000000');
});

test('a colour carried to the other ground keeps its hue and changes its lightness', () => {
  assert.equal(darkOf('#B45309'), '#F8A96D');
  assert.equal(lightOf('#F5A524'), '#CD8209');
  assert.equal(darkOf('#000000'), '#B3B3B3', 'a grey stays grey');
  assert.equal(lightOf('#FFFFFF'), '#6B6B6B');
  assert.equal(darkOf(darkOf('#1D4ED8')), darkOf('#1D4ED8'), 'and carrying it twice changes nothing');
});

test('a colour picked fills the slot of the theme being shown', () => {
  assert.deepEqual(hueFrom('#1d4ed8', false, null), { light: '#1D4ED8', dark: darkOf('#1D4ED8') });
  assert.deepEqual(hueFrom('#abc', true, null), { light: lightOf('#AABBCC'), dark: '#AABBCC' });
  assert.deepEqual(hueFrom('#111111', true, hue('#FF0000', '#00FF00')), { light: '#FF0000', dark: '#111111' },
    'the other slot is the reader\'s own where they have already chosen it');
  assert.deepEqual(hueFrom('#111111', false, hue('#FF0000', '#00FF00')), { light: '#111111', dark: '#00FF00' });
});

test('a type carries the symbols the book marks with its class', () => {
  assert.deepEqual(symbolsOf(MACROS, 'time'), ['\\kt', '\\kdt']);
  assert.deepEqual(symbolsOf(MACROS, 'frequency'), ['\\kf']);
  assert.deepEqual(symbolsOf(MACROS, 'position'), []);
  assert.deepEqual(symbolsOf(MACROS, 'angular'), [], 'and a name that is only the start of another type is not that type');
  assert.deepEqual(symbolsOf(MACROS, 'angular-rate'), ['\\kw']);
});

test('a palette answers with as many colours as the level needs, or with nothing', () => {
  const okabe = paletteById(paletteId('okabe-ito'));
  assert.ok(okabe);
  assert.deepEqual(huesOf(okabe, 4), OKABE);
  assert.equal(huesOf(okabe, 9), null, 'eight colours cannot dress nine quantities');
  assert.equal(huesOf(okabe, 0), null, 'and no palette dresses nothing');
});
