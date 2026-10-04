/* The referent palette: thirty-six colours, dealt to a section's referents in
   table order or smartly, kept per section, remembered with the reader's other
   colour choices; and each colour family answering to its own switch. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AFTER_CATEGORIES, D_MIN, DEFAULT_REFERENTS, REFERENT_COUNT, afterCategories, dealInOrder, dealReferents, pickWrapped,
  referentHues, referentPalettes, unnamedOrder,
} from '../src/lib/colours/referents';
import { NO_CHOICES, type Hue, fromFile, isEmpty, pageReferents, referentsOf, setReferents, toFile } from '../src/lib/colours/model';
import { paletteId, pairsOf } from '../src/lib/colours/palettes';
import { oklabHues } from '../src/lib/colours/sample';
import { distance } from '../src/lib/colours/oklab';
import type { BookManifest } from '../src/lib/content/schema';
import { bookId } from '../src/lib/types/ids';
import { elementColor } from '../src/lib/fig/elements';
import { COLOURS_ON, rootClasses, shownOf } from '../src/lib/colours/switches';

const grey = (v: number): Hue => { const h = `#${v.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase(); return { light: h, dark: h }; };
const PALETTE: readonly Hue[] = Array.from({ length: REFERENT_COUNT }, (_, i) => grey(i * 7));
const ids = (n: number): readonly string[] => Array.from({ length: n }, (_, i) => `r-${i}`);

test('the default referent palette is the OKLab sampling carried on past the categories', () => {
  const five = oklabHues(5, 'deutan');
  const after = pairsOf(afterCategories(five), REFERENT_COUNT, 'deutan');
  assert.deepEqual(after, oklabHues(5 + REFERENT_COUNT, 'deutan').slice(5), 'the palette\u2019s own next thirty-six');
  assert.deepEqual(referentHues(DEFAULT_REFERENTS, [...five].reverse(), 'deutan'), after, 'whatever order the categories stand in');
  const offered = referentPalettes(five, 'normal').map((o) => String(o.palette.id));
  assert.equal(offered[0], String(AFTER_CATEGORIES));
  assert.ok(offered.includes('oklch') && !offered.includes('okabe-ito'), 'only palettes that give thirty-six');
  assert.ok(referentPalettes(five, 'normal').every((o) => o.hues.length === REFERENT_COUNT));
  assert.deepEqual(referentHues({ palette: paletteId('okabe-ito'), mode: 'order' }, five, 'deutan'), after, 'a palette that cannot give thirty-six falls back to the default');
});

test('in order, the i-th referent wears the i-th colour, wrapping past thirty-six', () => {
  const dealt = dealReferents({ ids: ids(38), palette: PALETTE, page: [], mode: 'order', vision: 'normal' });
  assert.equal(dealt.mode, 'order');
  assert.equal(dealt.hues.get('r-0'), PALETTE[0]);
  assert.equal(dealt.hues.get('r-5'), PALETTE[5]);
  assert.equal(dealt.hues.get('r-37'), PALETTE[1]);
});

test('smart skips a colour too near the page and one an earlier referent wears, wrapping round the palette', () => {
  const page = [PALETTE[0], PALETTE[35]];
  const dealt = dealReferents({ ids: ids(2), palette: PALETTE, page, mode: 'smart', vision: 'normal', dMin: 0.001 });
  assert.equal(dealt.mode, 'smart');
  assert.equal(dealt.hues.get('r-0'), PALETTE[1], 'colour 0 is on the page');
  assert.equal(dealt.hues.get('r-1'), PALETTE[2], 'colour 1 is taken by r-0');
  const last = dealReferents({ ids: ids(36).slice(0, 36), palette: PALETTE, page: [PALETTE[35]], mode: 'smart', vision: 'normal', dMin: 0.001 });
  assert.equal(last.mode, 'order', 'thirty-six referents and one colour on the page leave one referent without a colour');
  const wrap = dealReferents({ ids: ids(35), palette: PALETTE, page: [PALETTE[34]], mode: 'smart', vision: 'normal', dMin: 0.001 });
  assert.equal(wrap.mode, 'smart');
  assert.equal(wrap.hues.get('r-34'), PALETTE[35]);
  assert.equal(new Set(wrap.hues.values()).size, 35);
});

test('smart deals the whole section in order when any referent finds no colour', () => {
  const dealt = dealReferents({ ids: ids(3), palette: PALETTE, page: [grey(120)], mode: 'smart', vision: 'normal', dMin: 10 });
  assert.equal(dealt.mode, 'order');
  assert.deepEqual([...dealt.hues], [...dealInOrder(ids(3), PALETTE)]);
});

test('smart on the default palette keeps every referent D_MIN from the page in both themes', () => {
  const page = oklabHues(8, 'deutan');
  const palette = oklabHues(8 + REFERENT_COUNT, 'deutan').slice(8);
  const dealt = dealReferents({ ids: ids(6), palette, page, mode: 'smart', vision: 'deutan' });
  assert.equal(dealt.mode, 'smart');
  for (const h of dealt.hues.values()) for (const p of page) assert.ok(distance(h, p, 'deutan') >= D_MIN.deutan);
});

/* A book of three types whose section 1.1 shows two of them and has two referents. */
const MANIFEST = {
  id: bookId('b'), title: 'B', publisher: '', authors: [], license: '', macros: {}, symbols: {}, exerciseKinds: {}, exercises: '', concepts: '', formulas: '',
  types: { time: { label: 'time' }, mass: { label: 'mass' }, force: { label: 'force' } },
  chapters: [{ id: '1', dir: 'ch01', title: '', concepts: '', formulas: '', sections: [{
    id: '1.1', title: '', built: true, url: '', fragment: '', figuresJs: '', figures: [], types: ['time', 'mass'], exercises: [],
    referents: [{ id: 'cart', figures: ['sim-a'] }, { id: 'horse', figures: ['sim-a'] }], counts: { time: 3, mass: 1, 'el:O': 1 },
  }] }],
} as unknown as BookManifest;

test('a page deals its referents from the reader’s palette, measured against its own colours', () => {
  const got = pageReferents(MANIFEST, NO_CHOICES, '1.1')!;
  assert.equal(got.count, 2);
  assert.equal(got.palette.length, REFERENT_COUNT);
  assert.deepEqual(got.palette, oklabHues(3 + REFERENT_COUNT, 'deutan').slice(3));
  assert.notEqual(got.hues.get('cart'), got.hues.get('horse'));
  const inOrder = pageReferents(MANIFEST, setReferents(NO_CHOICES, AFTER_CATEGORIES, 'order'), '1.1')!;
  assert.deepEqual([inOrder.hues.get('cart'), inOrder.hues.get('horse')], inOrder.palette.slice(0, 2));
  assert.equal(pageReferents(MANIFEST, NO_CHOICES, '9.9'), null);
});

test('an unnamed instance skips the section’s referent colours and puts those clear of the drawn ones first', () => {
  const palette = oklabHues(REFERENT_COUNT, 'normal');
  const order = unnamedOrder(palette, [palette[2], palette[3]], 2, [], false, 'normal');
  assert.equal(order.length, REFERENT_COUNT - 2);
  assert.equal(order[0], palette[4].light, 'after the referents’ own slots');
  assert.ok(!order.includes(palette[2].light) && !order.includes(palette[3].light));
  const near = unnamedOrder(palette, [], 0, [palette[0].dark], true, 'normal');
  assert.equal(near[near.length - 1], palette[0].dark, 'the colour a figure has drawn goes last');
  assert.equal(unnamedOrder(palette.slice(0, 2), palette.slice(0, 2), 2, [], false, 'normal').length, 2, 'a palette all worn comes back whole');
  assert.equal(pickWrapped(order, -1), order[order.length - 1]);
  assert.equal(pickWrapped(order, order.length), order[0]);
});

test('the referent setting is remembered with the reader’s colours, and the default is stored as nothing', () => {
  const book = bookId('b');
  assert.deepEqual(referentsOf(NO_CHOICES), DEFAULT_REFERENTS);
  assert.equal(setReferents(NO_CHOICES, DEFAULT_REFERENTS.palette, DEFAULT_REFERENTS.mode), NO_CHOICES);
  const chosen = setReferents(NO_CHOICES, paletteId('oklch'), 'order');
  assert.ok(!isEmpty(chosen));
  const back = fromFile(JSON.parse(JSON.stringify(toFile(book, chosen))), book);
  assert.ok(back.ok);
  assert.deepEqual(back.ok && referentsOf(back.choices), { palette: 'oklch', mode: 'order' });
  assert.ok(isEmpty(setReferents(chosen, AFTER_CATEGORIES, 'smart')));
  const odd = fromFile({ ...toFile(book, NO_CHOICES), referents: { palette: 'oklch', mode: 'sideways' } }, book);
  assert.deepEqual(odd.ok && referentsOf(odd.choices), DEFAULT_REFERENTS, 'a setting that does not parse is the default');
});

/* Each colour family answers to its own switch and no other (RULES item 7). The element palette is reached
   only through `F.el` and a fact only through `F.fact`, both gated on facts; the referent hues through `F.ref`,
   `F.cat` and `paintRefs`, gated on referents; a type only through `C`, gated on concepts. */
const figlib = fs.readFileSync(new URL('../src/lib/fig/figlib.ts', import.meta.url), 'utf8');
const reading = (family: string): readonly string[] =>
  figlib.split('\n').filter((l) => new RegExp(`\\bSHOWN\\.${family}\\b`).test(l) && !l.trimStart().startsWith('/*') && !l.trimStart().startsWith('*')).map((l) => l.trim()).sort();

test('each colour door reads its own switch and nothing else does', () => {
  assert.equal(elementColor('O', false), elementColor('O', false));
  assert.deepEqual(reading('facts'), [
    "const fact = (c: Color): Color => (SHOWN.facts ? c : PAL.ink);",
    "if (isElementSymbol(s) || /^[A-Z]/.test(s)) return SHOWN.facts ? elColor(s) : PAL.ink;",
  ].sort());
  assert.deepEqual(reading('refs'), [
    'const cat = (i: number): Color => (SHOWN.refs ? unnamedAt(i) : PAL.ink);',
    'if (!SHOWN.refs || !h) return pal.ink;',
    'if (!SHOWN.refs) return;',
  ].sort());
  assert.deepEqual(reading('concepts'), [
    'get PAL() { return PAL; }, get CC() { return SHOWN.concepts; }, get shown() { return SHOWN; }, setShown, readPal, C, cat, ref, paintRefs, alpha, redrawAll, el: elOf, fact, fmt, LW, makeCanvas, begin, ctl, byId, sim,',
    'if (!SHOWN.concepts && !NEUTRAL.has(k)) return PAL.ink;',
  ].sort());
});

test('All off sets every family in ink and on gives each back its own switch', () => {
  const some = { all: true, facts: false, refs: true, concepts: false };
  assert.deepEqual(shownOf(some), { facts: false, refs: true, concepts: false });
  assert.deepEqual(shownOf({ ...some, all: false }), { facts: false, refs: false, concepts: false });
  assert.deepEqual(shownOf(COLOURS_ON), { facts: true, refs: true, concepts: true });
  assert.deepEqual(rootClasses({ ...COLOURS_ON, refs: false }), { 'cc-all': true, 'cc-facts': true, 'cc-refs': false, 'cc-concepts': true });
  assert.deepEqual(rootClasses({ ...COLOURS_ON, all: false }), { 'cc-all': false, 'cc-facts': false, 'cc-refs': false, 'cc-concepts': false });
});
