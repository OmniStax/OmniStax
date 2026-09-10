import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY, type Hue, type Place, applyPalette, clearHue, clearPlace, cssFor, darkOf, defaultHue, effectiveHue, hueFrom,
  isEmpty, isHex, lightOf, normHex, ownHue, parseOverrides, placeKey, placeOf, setHue, symbolsOf, typesAt,
} from '../src/lib/colours/model';
import { PALETTES, SWATCHES } from '../src/lib/colours/palettes';
import type { BookManifest } from '../src/lib/content/schema';
import { chapterId, sectionId } from '../src/lib/types/ids';

/* A book of two chapters. Two types carry the book's own hues, two are left to a
   chapter to bind, and chapter 16 binds one of them and leaves the other alone.
   Section 16.1 is listed but never built, so what it would colour counts for
   nothing; 16.4 binds nothing, which means it colours everything. */
const section = (id: string, binds: readonly string[], built: boolean) =>
  ({ id, title: id, built, url: '', fragment: '', figuresJs: '', figures: [], binds, exercises: [] });
const MANIFEST = {
  id: 'college-physics-2e', title: 'College Physics', publisher: 'OpenStax', authors: [], license: 'CC BY',
  types: {
    time: { label: 'time', dimension: 's', light: '#B45309', dark: '#F5A524' },
    position: { label: 'position, displacement', dimension: 'm', light: '#1D4ED8', dark: '#60A5FA' },
    frequency: { label: 'frequency', dimension: 'Hz' },
    stiffness: { label: 'force constant', dimension: 'N/m' },
  },
  pool: [{ id: 'magenta', light: '#BE185D', dark: '#F472B6' }, { id: 'olive', light: '#4D7C0F', dark: '#A3E635' }],
  macros: {
    '\\kt': '\\htmlClass{kv-time}{\\htmlData{sym=t}{t}}',
    '\\kdt': '\\htmlClass{kv-time}{\\htmlData{sym=Δt}{\\Delta t}}',
    '\\kf': '\\htmlClass{kv-frequency}{\\htmlData{sym=f}{f}}',
    '\\kw': '\\htmlClass{kv-angular-rate}{\\htmlData{sym=ω}{\\omega}}',
  },
  symbols: {}, exerciseKinds: {},
  chapters: [
    { id: '2', dir: 'ch02', title: 'Kinematics', colors: {}, concepts: '', formulas: '', sections: [section('2.1', ['time', 'position'], true)] },
    { id: '16', dir: 'ch16', title: 'Oscillatory Motion and Waves', colors: { frequency: 'magenta' }, concepts: '', formulas: '', sections: [
      section('16.1', ['stiffness'], false), section('16.3', ['position', 'time', 'frequency'], true), section('16.4', [], true),
    ] },
  ],
} as unknown as BookManifest;

const BOOK: Place = { level: 'book' };
const CH16: Place = { level: 'chapter', chapter: chapterId('16') };
const CH2: Place = { level: 'chapter', chapter: chapterId('2') };
const S163: Place = { level: 'section', chapter: chapterId('16'), section: sectionId('16.3') };
const hue = (light: string, dark: string): Hue => ({ light, dark });

test('a target names a place, and a section names its chapter as well', () => {
  assert.deepEqual(placeOf({ level: 'book' }), BOOK);
  assert.deepEqual(placeOf({ level: 'chapter', chapter: chapterId('16') }), CH16);
  assert.deepEqual(placeOf({ level: 'section', section: sectionId('16.3') }), S163);
  assert.equal(placeKey(BOOK), 'book');
  assert.equal(placeKey(CH16), 'chapter:16');
  assert.equal(placeKey(S163), 'section:16.3');
});

test('the book itself colours the global tier everywhere and the chapter tier only in a chapter', () => {
  assert.deepEqual(defaultHue(MANIFEST, 'time', BOOK), hue('#B45309', '#F5A524'));
  assert.deepEqual(defaultHue(MANIFEST, 'time', S163), hue('#B45309', '#F5A524'));
  assert.equal(defaultHue(MANIFEST, 'frequency', BOOK), null, 'above the chapter there is nothing to read');
  assert.deepEqual(defaultHue(MANIFEST, 'frequency', CH16), hue('#BE185D', '#F472B6'));
  assert.deepEqual(defaultHue(MANIFEST, 'frequency', S163), hue('#BE185D', '#F472B6'));
  assert.equal(defaultHue(MANIFEST, 'frequency', CH2), null, 'chapter 2 binds nothing');
  assert.equal(defaultHue(MANIFEST, 'stiffness', CH16), null, 'chapter 16 leaves the force constant unbound');
  assert.equal(defaultHue(MANIFEST, 'nothing', BOOK), null);
});

test('a section wins over its chapter, a chapter over the book, and the book over what the book itself says', () => {
  const at = (o: Parameters<typeof effectiveHue>[0]) => effectiveHue(o, MANIFEST, 'time', S163);
  assert.deepEqual(at(EMPTY), { hue: hue('#B45309', '#F5A524'), from: 'default' });
  const book = setHue(EMPTY, BOOK, 'time', hue('#111111', '#222222'));
  assert.deepEqual(at(book), { hue: hue('#111111', '#222222'), from: 'book' });
  const chapter = setHue(book, CH16, 'time', hue('#333333', '#444444'));
  assert.deepEqual(at(chapter), { hue: hue('#333333', '#444444'), from: 'chapter' });
  const sec = setHue(chapter, S163, 'time', hue('#555555', '#666666'));
  assert.deepEqual(at(sec), { hue: hue('#555555', '#666666'), from: 'section' });
  /* Nothing is copied downwards, so another chapter still reads the book's own. */
  assert.deepEqual(effectiveHue(sec, MANIFEST, 'time', CH2), { hue: hue('#111111', '#222222'), from: 'book' });
  /* Clearing hands the type back to the tier above, one step at a time. */
  assert.deepEqual(at(clearHue(sec, S163, 'time')), { hue: hue('#333333', '#444444'), from: 'chapter' });
  assert.deepEqual(at(clearHue(clearHue(sec, S163, 'time'), CH16, 'time')), { hue: hue('#111111', '#222222'), from: 'book' });
  assert.deepEqual(at(clearPlace(clearPlace(sec, S163), CH16)), { hue: hue('#111111', '#222222'), from: 'book' });
});

test('a type no tier colours has no colour at all', () => {
  assert.deepEqual(effectiveHue(EMPTY, MANIFEST, 'stiffness', S163), { hue: null, from: 'none' });
  assert.deepEqual(effectiveHue(EMPTY, MANIFEST, 'frequency', BOOK), { hue: null, from: 'none' });
});

test('what is set at a place is read back at that place and nowhere else', () => {
  const o = setHue(EMPTY, CH16, 'time', hue('#333333', '#444444'));
  assert.deepEqual(ownHue(o, 'time', CH16), hue('#333333', '#444444'));
  assert.equal(ownHue(o, 'time', S163), null);
  assert.equal(ownHue(o, 'time', BOOK), null);
  assert.equal(ownHue(o, 'position', CH16), null);
  assert.equal(isEmpty(o), false);
  assert.equal(isEmpty(clearHue(o, CH16, 'time')), true, 'and an emptied chapter leaves nothing behind it');
  assert.equal(clearHue(o, CH16, 'position'), o, 'clearing what was never set changes nothing');
  assert.equal(clearPlace(EMPTY, CH16), EMPTY);
});

test('every level shows the types it has to show', () => {
  assert.deepEqual(typesAt(MANIFEST, BOOK), ['time', 'position', 'frequency', 'stiffness']);
  assert.deepEqual(typesAt(MANIFEST, CH16), ['time', 'position', 'frequency'],
    'the global tier, what the chapter binds, and what its built sections colour');
  assert.deepEqual(typesAt(MANIFEST, CH2), ['time', 'position']);
  assert.deepEqual(typesAt(MANIFEST, S163), ['time', 'position', 'frequency'], 'in the order the book declares them');
  assert.deepEqual(typesAt(MANIFEST, { level: 'section', chapter: chapterId('16'), section: sectionId('16.4') }),
    ['time', 'position', 'frequency', 'stiffness'], 'a page that binds nothing colours everything');
});

test('a palette dresses the types in order and refuses to leave any of them out', () => {
  const types = typesAt(MANIFEST, CH16);
  const o = applyPalette(EMPTY, CH16, types, ['#E69F00', '#56B4E9', '#009E73', '#F0E442']);
  assert.ok(o);
  const lights = types.map((t) => ownHue(o, t, CH16)?.light);
  assert.deepEqual(lights, ['#E69F00', '#56B4E9', '#009E73'], 'each type takes the next hue');
  assert.equal(new Set(lights).size, types.length, 'so no two of them come out the same');
  assert.deepEqual(ownHue(o, 'time', CH16)?.dark, darkOf('#E69F00'), 'and the dark slot is worked out from it');
  assert.equal(applyPalette(EMPTY, CH16, types, ['#E69F00', '#56B4E9']), null, 'two colours cannot dress three quantities');
  assert.notEqual(applyPalette(EMPTY, CH16, types, ['#E69F00', '#56B4E9', '#009E73']), null, 'three exactly can');
});

test('every palette on offer is a list of colours with a sentence saying what it is for', () => {
  assert.ok(PALETTES.length >= 8);
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length);
  PALETTES.forEach((p) => {
    assert.ok(p.hues.every(isHex), `${p.id} is written in hex`);
    assert.equal(new Set(p.hues.map(normHex)).size, p.hues.length, `${p.id} repeats no colour`);
    assert.match(p.note, /\.$/, `${p.id} says what it is for in a full sentence`);
  });
  assert.ok(SWATCHES.length >= 16);
  assert.ok(SWATCHES.every((s) => isHex(s.hex)));
  assert.equal(new Set(SWATCHES.map((s) => normHex(s.hex))).size, SWATCHES.length);
});

test('the stylesheet writes the three blocks the book writes, and the section rule outranks its chapter', () => {
  assert.equal(cssFor(EMPTY, MANIFEST), '', 'nothing set, nothing written');
  const o = setHue(setHue(setHue(EMPTY, BOOK, 'time', hue('#111111', '#222222')), CH16, 'frequency', hue('#333333', '#444444')), S163, 'position', hue('#555555', '#666666'));
  const light = ':root{--c-time:#111111}'
    + '[data-chapter="ch16"], [data-chapter="ch16"]{--c-frequency:#333333}'
    + '[data-chapter="ch16"][data-sec="16.3"], [data-chapter="ch16"][data-sec="16.3"]{--c-position:#555555}';
  const dark = (p: string) => `${p}{--c-time:#222222}`
    + `${p}[data-chapter="ch16"],${p} [data-chapter="ch16"]{--c-frequency:#444444}`
    + `${p}[data-chapter="ch16"][data-sec="16.3"],${p} [data-chapter="ch16"][data-sec="16.3"]{--c-position:#666666}`;
  const guarded = ':root:not([data-theme="light"])';
  assert.equal(cssFor(o, MANIFEST),
    light + `@media (prefers-color-scheme: dark){${dark(guarded)}}` + dark(':root[data-theme="dark"]'));
});

test('the stylesheet names a chapter by its directory and lists the types in the book\'s order', () => {
  const o = setHue(setHue(EMPTY, BOOK, 'position', hue('#555555', '#666666')), BOOK, 'time', hue('#111111', '#222222'));
  assert.match(cssFor(o, MANIFEST), /^:root\{--c-time:#111111;--c-position:#555555\}/, 'time is declared first, however it was set');
  const stray = setHue(EMPTY, { level: 'chapter', chapter: chapterId('99') }, 'time', hue('#111111', '#222222'));
  assert.equal(cssFor(stray, MANIFEST), '', 'a chapter the book does not have has no selector to write');
});

test('what comes back from storage is only what reads as a colour', () => {
  assert.deepEqual(parseOverrides(null), EMPTY);
  assert.deepEqual(parseOverrides('nonsense'), EMPTY);
  assert.deepEqual(parseOverrides({ book: 7, chapters: [], sections: null }), EMPTY);
  const o = parseOverrides({
    book: { time: { light: '#abc', dark: '#123456' }, position: { light: '#1D4ED8' }, energy: 'blue' },
    chapters: { '16': { frequency: { light: 'not a colour', dark: '#000000' } }, '2': { time: { light: '#111', dark: '#222' } } },
    sections: { '16.3': { position: { light: '#555555', dark: '#666666' } } },
  });
  assert.deepEqual(o.book, { time: { light: '#AABBCC', dark: '#123456' } }, 'a colour with a slot missing is left out, and hex is normalised');
  assert.deepEqual(Object.keys(o.chapters), ['2'], 'a chapter left holding nothing is dropped');
  assert.deepEqual(o.sections['16.3'], { position: { light: '#555555', dark: '#666666' } });
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
  assert.deepEqual(symbolsOf(MANIFEST, 'time'), ['\\kt', '\\kdt']);
  assert.deepEqual(symbolsOf(MANIFEST, 'frequency'), ['\\kf']);
  assert.deepEqual(symbolsOf(MANIFEST, 'position'), []);
  assert.deepEqual(symbolsOf(MANIFEST, 'angular'), [], 'and a name that is only the start of another type is not that type');
  assert.deepEqual(symbolsOf(MANIFEST, 'angular-rate'), ['\\kw']);
});
