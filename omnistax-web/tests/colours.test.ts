import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_CHOICES, type Choices, type Hue, applyHues, clearHue, cssFor, d3Rainbow, darkOf,
  effectiveHue, fitCount, fromFile, hueFrom, isEmpty, isHex, lightOf, moveType, normHex, oklchRing, orderOf, ownHue,
  schemeOf, setCategories, setHue, symbolsOf, toFile,
} from '../src/lib/colours/model';
import { SWATCHES, huesOf, paletteById, paletteId } from '../src/lib/colours/palettes';
import { familyHues } from '../src/lib/colours/sample';
import type { BookManifest } from '../src/lib/content/schema';
import { bookId } from '../src/lib/types/ids';
import { bookRulesCss } from '../src/lib/colours/rules';

/* A book of two chapters and four quantities. The book stores no default: what
   its quantities wear is the hue-families palette laid along the order. */
const section = (id: string, types: readonly string[], built: boolean) =>
  ({ id, title: id, built, url: '', fragment: '', figuresJs: '', figures: [], types, exercises: [] });
const manifestOf = (types: Readonly<Record<string, { label: string; dimension?: string }>>, chapters: readonly unknown[] = [], macros: Readonly<Record<string, string>> = {}) =>
  ({
    id: bookId('college-physics-2e'), title: 'College Physics', publisher: 'OpenStax', authors: [], license: 'CC BY',
    types, macros, symbols: {}, exerciseKinds: {}, chapters, exercises: '', concepts: '', formulas: '',
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

const hue = (light: string, dark: string): Hue => ({ light, dark });
const chose = (order: readonly string[]): Choices => ({ ...NO_CHOICES, order });
/* The first four hue-families colours for normal vision, which is what a book of four
   quantities wears before the reader touches anything. */
const SCHEME: readonly Hue[] = familyHues(4, 'normal');

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

test('the scheme is the hue-families palette for any number of quantities', () => {
  [4, 29, 60].forEach((n) => {
    const scheme = schemeOf(bookOf(n), NO_CHOICES);
    assert.equal(scheme.palette.id, paletteId('families'));
    assert.equal(new Set(Object.values(scheme.hues).map((h) => h.light)).size, n, `${n} quantities wear ${n} colours`);
  });
  assert.equal(paletteById(paletteId('tol-muted'))?.name, 'Paul Tol muted');
  assert.equal(paletteById(paletteId('nothing')), null);
});

test('the scheme lays its hues along the reader\'s order, so a quantity moved changes colour', () => {
  const plain = schemeOf(MANIFEST, NO_CHOICES);
  assert.deepEqual(['time', 'position', 'frequency', 'stiffness'].map((k) => plain.hues[k]), SCHEME);
  const moved = schemeOf(MANIFEST, moveType(MANIFEST, NO_CHOICES, 'stiffness', 'time'));
  assert.deepEqual(moved.hues.stiffness, SCHEME[0], 'the quantity now first takes the first hue');
  assert.deepEqual(moved.hues.time, SCHEME[1]);
});

test('the reader\u2019s colour wins over the scheme, and clearing it hands the type back', () => {
  const at = (c: Choices) => effectiveHue(MANIFEST, c, 'time');
  assert.deepEqual(at(NO_CHOICES), { hue: SCHEME[0], from: { kind: 'scheme', palette: paletteId('families') } });
  const own = setHue(NO_CHOICES, 'time', hue('#111111', '#222222'));
  assert.deepEqual(at(own), { hue: hue('#111111', '#222222'), from: { kind: 'own' } });
  assert.deepEqual(effectiveHue(MANIFEST, own, 'position').from, { kind: 'scheme', palette: paletteId('families') }, 'another type still wears the scheme');
  assert.deepEqual(at(clearHue(own, 'time')).from, { kind: 'scheme', palette: paletteId('families') });
  assert.deepEqual(effectiveHue(MANIFEST, NO_CHOICES, 'energy'), { hue: null, from: { kind: 'none' } },
    'a key the book does not declare is not a quantity of it');
});

test('what is set is read back for that type and no other', () => {
  const c = setHue(NO_CHOICES, 'time', hue('#333333', '#444444'));
  assert.deepEqual(ownHue(c, 'time'), hue('#333333', '#444444'));
  assert.equal(ownHue(c, 'position'), null);
  assert.equal(isEmpty(c), false);
  assert.equal(isEmpty(clearHue(c, 'time')), true, 'and a cleared colour leaves nothing behind it');
  assert.equal(isEmpty(chose(['frequency'])), false, 'an order the reader has chosen is a choice like any other');
  assert.equal(clearHue(c, 'position'), c, 'clearing what was never set changes nothing');
});

test('hues dress the types in order and refuse to leave any of them out', () => {
  const types = ['time', 'position', 'frequency'];
  const hues = ['#E69F00', '#56B4E9', '#009E73', '#F0E442'].map((h) => hue(h, darkOf(h)));
  const c = applyHues(NO_CHOICES, types, hues);
  assert.ok(c);
  const lights = types.map((t) => ownHue(c, t)?.light);
  assert.deepEqual(lights, ['#E69F00', '#56B4E9', '#009E73'], 'each type takes the next hue');
  assert.equal(new Set(lights).size, types.length, 'so no two of them come out the same');
  assert.equal(applyHues(NO_CHOICES, types, hues.slice(0, 2)), null, 'two colours cannot dress three quantities');
  assert.notEqual(applyHues(NO_CHOICES, types, hues.slice(0, 3)), null, 'three exactly can');
});

test('the palette the reader applied is remembered as in use, and cleared with everything else', () => {
  const c = setCategories(NO_CHOICES, { palette: paletteId('oklab'), mode: 'smart' });
  assert.deepEqual(c.categories, { palette: 'oklab', mode: 'smart' });
  assert.equal(setCategories(c, { palette: paletteId('oklab'), mode: 'smart' }), c, 'the same again is no change');
  assert.equal(isEmpty(c), false);
  assert.equal(isEmpty(setCategories(c, undefined)), true);
  const book = bookId('college-physics-2e');
  const back = fromFile(JSON.parse(JSON.stringify(toFile(book, c))), book);
  assert.deepEqual(back.ok && back.choices.categories, { palette: 'oklab', mode: 'smart' });
  const odd = fromFile({ ...toFile(book, NO_CHOICES), categories: { palette: 'oklab', mode: 'odd' } }, book);
  assert.deepEqual(odd, { ok: true, choices: NO_CHOICES }, 'a mode that is not one is left out');
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
    orderOf(MANIFEST, NO_CHOICES).map((k, i) => `--c-${k}:${SCHEME[i][mode]}`).join(';');
  const book = '[data-book="college-physics-2e"]';
  assert.equal(cssFor(MANIFEST, NO_CHOICES),
    `${book}{${scheme('light')}}`
    + `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) ${book}{${scheme('dark')}}}`
    + `:root[data-theme="dark"] ${book}{${scheme('dark')}}`);
});

test('the stylesheet writes the scheme and then the reader\u2019s colours, on the book alone', () => {
  const c = setHue(setHue(NO_CHOICES, 'time', hue('#111111', '#222222')), 'frequency', hue('#333333', '#444444'));
  const css = cssFor(MANIFEST, c);
  const b = '[data-book="college-physics-2e"]';
  assert.ok(css.startsWith(`${b}{--c-time:${SCHEME[0].light};`) && css.includes(`}${b}{--c-time:#111111;--c-frequency:#333333}`),
    'the scheme first and the reader after it, so theirs wins without either being marked important');
  assert.ok(css.includes(`:root[data-theme="dark"] ${b}{--c-time:#222222;--c-frequency:#444444}`));
  assert.doesNotMatch(css, /data-chapter|data-sec/, 'no chapter or section has colours of its own');
});

test('the stylesheet lists the types in the reader\'s order', () => {
  const c = setHue(setHue(NO_CHOICES, 'position', hue('#555555', '#666666')), 'time', hue('#111111', '#222222'));
  assert.match(cssFor(MANIFEST, c), /\]\{--c-time:#111111;--c-position:#555555\}/, 'time is declared first, however it was set');
  const moved = moveType(MANIFEST, c, 'position', 'time');
  assert.match(cssFor(MANIFEST, moved), /\]\{--c-position:#555555;--c-time:#111111\}/, 'and the order the reader chose is the order they are written in');
});

/* Every selector of a book's sheet names the book, so two books' sheets on one page never reach each other's elements. */
test('two books\' stylesheets never cross, and nothing is coloured on the root', () => {
  const other = { ...MANIFEST, id: bookId('chemistry-2e') } as BookManifest;
  const c = setHue(setHue(NO_CHOICES, 'frequency', hue('#333333', '#444444')), 'position', hue('#555555', '#666666'));
  const selectors = (css: string): string[] =>
    css.replace(/@media[^{]*\{/g, '').replace(/:is\([^)]*\)/g, ':is()').split('}').map((r) => r.split('{')[0].trim()).filter(Boolean).flatMap((s) => s.split(','));
  for (const [m, mine, theirs] of [[MANIFEST, 'college-physics-2e', 'chemistry-2e'], [other, 'chemistry-2e', 'college-physics-2e']] as const) {
    const css = `${cssFor(m, c)}\n${bookRulesCss(m)}`;
    for (const sel of selectors(css)) assert.ok(sel.includes(`[data-book="${mine}"]`), `${mine}: ${sel}`);
    assert.ok(!css.includes(theirs));
    assert.doesNotMatch(cssFor(m, c), /:root\{|:root\[data-theme="dark"\]\{|html\{/);
  }
});

test('a book\'s rules colour its quantities on every page, inside the book only', () => {
  const css = bookRulesCss(MANIFEST);
  const b = '[data-book="college-physics-2e"]';
  assert.ok(css.includes(`${b} .kv-time{color:var(--c-time)}`)); assert.ok(css.includes(`html:not(.cc-concepts) ${b} .kv-time{color:inherit}`));
  assert.ok(css.includes(`html.cc-concepts ${b} .s-time::-webkit-slider-thumb{background:var(--c-time)}`));
  assert.doesNotMatch(css, /data-sec/, 'no page holds a type back');
});
test('words the text marks with a type wear it as its symbols do, under the Words and phrases switch', () => {
  const css = bookRulesCss(MANIFEST);
  const b = '[data-book="college-physics-2e"]';
  assert.ok(css.includes(`${b} [data-type="time"]{color:var(--c-time)}`));
  assert.ok(css.includes(`html:not(.cc-words) ${b} [data-type="time"]{color:inherit}`));
});

test('the file and the storage hold one document, which reads back as it was written', () => {
  const book = bookId('college-physics-2e');
  const c = moveType(MANIFEST, setHue(setHue(NO_CHOICES, 'time', hue('#111111', '#222222')), 'position', hue('#555555', '#666666')), 'frequency', 'time');
  const file = toFile(book, c);
  assert.deepEqual(file.overrides, { book: c.overrides }, 'the colours sit under book, where the app has always written them');
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
  assert.deepEqual(good.choices.overrides, { time: { light: '#AABBCC', dark: '#123456' } }, 'a colour with a slot missing is left out, hex is normalised, and the chapter and section tables of an older file are not read');
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
  assert.deepEqual(huesOf(okabe, 4), ['#E69F00', '#56B4E9', '#009E73', '#F0E442']);
  assert.equal(huesOf(okabe, 9), null, 'eight colours cannot dress nine quantities');
  assert.equal(huesOf(okabe, 0), null, 'and no palette dresses nothing');
  const scheme = paletteById(paletteId('families'));
  assert.ok(scheme);
  assert.deepEqual(huesOf(scheme, 4), SCHEME.map((h) => h.light));
  assert.equal(huesOf(scheme, 200)?.length, 200, 'and the book\'s own never runs out');
});

/* Four symbols twenty wide with six between them: 20, 46, 72, 98 as they are added. */
test('a row takes as many symbols as fit, and keeps one however narrow it is', () => {
  const w = [20, 20, 20, 20];
  assert.equal(fitCount(w, 200, 12, 6), 4, 'they all fit, so none is left out');
  assert.equal(fitCount(w, 98, 12, 6), 4, 'room for the lot exactly, and no ellipsis is wanted');
  assert.equal(fitCount(w, 97, 12, 6), 3, 'one short of the lot, and the ellipsis takes room of its own');
  assert.equal(fitCount(w, 85, 12, 6), 2);
  assert.equal(fitCount(w, 5, 12, 6), 1, 'a row too narrow for even one still shows one');
  assert.equal(fitCount([], 100, 12, 6), 0, 'a quantity with no symbols draws nothing');
});
