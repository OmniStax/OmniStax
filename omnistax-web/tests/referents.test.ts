/* The referent palette: thirty-six colours, dealt to each group of referents
   seen together in table order or smartly, farthest apart where smart finds no
   way, remembered with the reader's other colour choices; and each colour family
   answering to its own switch. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_REFERENTS, REFERENT_COUNT, TARGET_DEFAULT, dealGroup, farthestSlots, pickWrapped, referentHues, referentPalettes, targetOf, unnamedOrder,
} from '../src/lib/colours/referents';
import { referentGroups } from '../src/lib/colours/scopes';
import { prerenderMath } from '../src/lib/math/prerender';
import { NO_CHOICES, type Hue, fromFile, isEmpty, pageReferents, referentsOf, setReferents, toFile } from '../src/lib/colours/model';
import { paletteId } from '../src/lib/colours/palettes';
import { oklabHues } from '../src/lib/colours/sample';
import { distance, seenHue } from '../src/lib/colours/oklab';
import type { BookManifest } from '../src/lib/content/schema';
import { bookId } from '../src/lib/types/ids';
import { elementColor } from '../src/lib/fig/elements';
import { bands } from '../src/lib/fig/figlib';
import { COLOURS_ON, rootClasses, shownOf } from '../src/lib/colours/switches';

const grey = (v: number): Hue => { const h = `#${v.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase(); return { light: h, dark: h }; };
const PALETTE: readonly Hue[] = Array.from({ length: REFERENT_COUNT }, (_, i) => grey(i * 7));
const ids = (n: number): readonly string[] => Array.from({ length: n }, (_, i) => `r-${i}`);
const deal = (n: number, shown: readonly Hue[], mode: 'order' | 'smart', target: number) =>
  dealGroup({ ids: ids(n), shown }, { palette: PALETTE, mode, vision: 'normal', target });

test('the default referent palette is the OKLab palette’s own thirty-six', () => {
  assert.deepEqual(referentHues(DEFAULT_REFERENTS, 'deutan'), oklabHues(REFERENT_COUNT, 'deutan'));
  const offered = referentPalettes('normal').map((o) => String(o.palette.id));
  assert.equal(offered[0], 'oklab');
  assert.ok(offered.includes('oklch') && !offered.includes('okabe-ito'), 'only palettes that give thirty-six');
  assert.ok(referentPalettes('normal').every((o) => o.hues.length === REFERENT_COUNT));
  assert.deepEqual(referentHues({ palette: paletteId('okabe-ito'), mode: 'order' }, 'deutan'), oklabHues(REFERENT_COUNT, 'deutan'), 'a palette that cannot give thirty-six falls back to the default');
  assert.deepEqual(referentHues({ palette: paletteId('oklab-after'), mode: 'smart' }, 'normal'), oklabHues(REFERENT_COUNT, 'normal'), 'a palette that is gone falls back too');
});

/* ---------- scope ---------- */

const fig = (id: string, draws: readonly string[] = [], facts: readonly string[] = [], conventions: readonly string[] = []) => ({ id, draws, facts, conventions });
const TWO_FIGURES = '<section id="a"><p><span data-type="force">pull</span></p><figure class="sim" id="sim-a"></figure></section>'
  + '<section id="b"><figure class="sim" id="sim-b"></figure><p>the <span data-ref="cart">cart</span></p></section>';
const page = (text: string, lead = '') => ({
  referents: [{ id: 'horse', figures: ['sim-a'] }, { id: 'cart', figures: ['sim-b'] }],
  figures: [fig('sim-a', ['force'], ['#FF0000', 'spectrum']), fig('sim-b', ['mass'], [], ['O'])],
  text, asides: { '@lead': lead, '@summary': '', '@exercises': '' },
});

test('referents in two figures of two blocks are two groups, each showing its own scope', () => {
  const groups = referentGroups(page(TWO_FIGURES));
  assert.deepEqual(groups.map((g) => g.referents), [['horse'], ['cart']]);
  assert.deepEqual(groups[0], { referents: ['horse'], figures: ['sim-a'], shows: ['#FF0000', 'force'] });
  assert.deepEqual(groups[1], { referents: ['cart'], figures: ['sim-b'], shows: ['el:O', 'mass'] });
});

test('a mention in the other figure’s block leaks the scope and merges the groups, in table order', () => {
  const leak = TWO_FIGURES.replace('<p><span data-type="force">pull</span></p>', '<p><span data-type="force">pull</span> on <span data-ref="cart">the cart</span></p>');
  const [one, ...rest] = referentGroups(page(leak));
  assert.equal(rest.length, 0);
  assert.deepEqual(one.referents, ['horse', 'cart']);
  assert.deepEqual(one.figures, ['sim-a', 'sim-b']);
  assert.deepEqual(one.shows, ['#FF0000', 'el:O', 'force', 'mass']);
  const both = referentGroups(page(TWO_FIGURES, 'How <span data-ref="horse cart">the two</span> move.'));
  assert.deepEqual(both.map((g) => g.referents), [['horse', 'cart']], 'the lead is a block of its own, and a phrase naming both joins them');
});

test('a nested section is a block of its own, and the text after it belongs to the section around it', () => {
  const nested = '<section id="outer"><figure id="sim-a"></figure><section id="inner"><span data-ref="cart">c</span></section><span data-ref="cart">c</span></section><figure id="sim-b"></figure>';
  assert.deepEqual(referentGroups(page(nested)).map((g) => g.referents), [['horse', 'cart']]);
});

test('a block shows the types of the macros its maths writes, raw or rendered, as the page sets them', () => {
  const text = '<section id="a"><figure class="sim" id="sim-a"></figure></section><section id="b"><figure class="sim" id="sim-b"></figure><p>$\\kv = \\kc/n$</p></section>';
  const macros = { '\\kv': 'velocity', '\\kc': 'velocity' };
  const [, cart] = referentGroups({ ...page(text), figures: [fig('sim-a'), fig('sim-b')], macros });
  assert.deepEqual(cart, { referents: ['cart'], figures: ['sim-b'], shows: ['velocity'] });
  const rendered = text.replace('$\\kv = \\kc/n$', prerenderMath('$\\kv = \\kc/n$', { '\\kv': '\\htmlClass{kv-velocity}{v}', '\\kc': '\\htmlClass{kv-velocity}{c}' }));
  assert.deepEqual(referentGroups({ ...page(rendered), figures: [fig('sim-a'), fig('sim-b')], macros })[1].shows, ['velocity']);
  assert.deepEqual(referentGroups({ ...page(text), figures: [fig('sim-a'), fig('sim-b')], macros: { '\\kv': 'speed' } })[1].shows, ['speed'], 'a macro in ink there shows nothing');
  assert.deepEqual(referentGroups({ ...page(text), figures: [fig('sim-a'), fig('sim-b')] })[1].shows, [], 'no macro types, no macro keys');
});

/* ---------- dealing ---------- */

test('in order, a group’s i-th referent wears colour i, wrapping past thirty-six', () => {
  const dealt = deal(38, [], 'order', TARGET_DEFAULT);
  assert.equal(dealt.mode, 'order');
  assert.deepEqual([dealt.hues[0], dealt.hues[5], dealt.hues[37]], [PALETTE[0], PALETTE[5], PALETTE[1]]);
});

test('the smart walk skips a colour too near what the scope shows and one too near a referent dealt before it', () => {
  const near = deal(2, [PALETTE[0], PALETTE[35]], 'smart', 0.001);
  assert.equal(near.mode, 'smart');
  assert.deepEqual(near.hues, [PALETTE[1], PALETTE[2]], 'colour 0 is shown; colour 1 is taken');
  const far = deal(2, [], 'smart', distance(PALETTE[0], PALETTE[2], 'normal'));
  assert.deepEqual(far.hues, [PALETTE[0], PALETTE[2]], 'colour 1 stands too near referent 0, so referent 1 walks on');
  const wrap = deal(35, [PALETTE[34]], 'smart', 0.001);
  assert.equal(wrap.hues[34], PALETTE[35]);
  assert.equal(new Set(wrap.hues).size, 35);
});

test('a group in which a referent finds no colour is dealt farthest apart, every one of it', () => {
  const shown = [PALETTE[0]];
  const dealt = deal(3, shown, 'smart', 10);
  assert.equal(dealt.mode, 'farthest');
  assert.equal(dealt.hues[0], PALETTE[35], 'the first takes the colour farthest from what is shown');
  const all = [...shown, ...dealt.hues];
  const worst = (hs: readonly Hue[]) => Math.min(...hs.flatMap((a, i) => hs.slice(i + 1).map((b) => distance(a, b, 'normal'))));
  assert.ok(worst(all) >= worst([...shown, PALETTE[1], PALETTE[2], PALETTE[3]]), 'farther apart than in order would be');
  assert.equal(farthestSlots(38, PALETTE.map((h) => seenHue(h, 'normal')), []).length, 38, 'past thirty-six the palette comes round again');
  assert.equal(new Set(farthestSlots(36, PALETTE.map((h) => seenHue(h, 'normal')), [])).size, 36);
});

/* A book of three types whose section 1.1 has two groups that never meet, two referents each. */
const MANIFEST = {
  id: bookId('b'), title: 'B', publisher: '', authors: [], license: '', macros: {}, symbols: {}, exerciseKinds: {}, exercises: '', concepts: '', formulas: '',
  types: { time: { label: 'time' }, mass: { label: 'mass' }, force: { label: 'force' } },
  chapters: [{ id: '1', dir: 'ch01', title: '', concepts: '', formulas: '', sections: [{
    id: '1.1', title: '', built: true, url: '', fragment: '', figuresJs: '', figures: [], types: ['time', 'mass'], exercises: [],
    referents: [{ id: 'cart', figures: ['sim-a'] }, { id: 'horse', figures: ['sim-a'] }, { id: 'tug-1', figures: ['sim-b'] }, { id: 'tug-2', figures: ['sim-b'] }],
    refGroups: [{ referents: ['cart', 'horse'], figures: ['sim-a'], shows: ['time'] }, { referents: ['tug-1', 'tug-2'], figures: ['sim-b'], shows: ['mass', 'el:O'] }],
    counts: { time: 3, mass: 1, 'el:O': 1 },
  }] }],
} as unknown as BookManifest;

test('groups that never meet recycle the same colours, each numbered from its own first referent', () => {
  const inOrder = pageReferents(MANIFEST, setReferents(NO_CHOICES, { ...DEFAULT_REFERENTS, mode: 'order' }), '1.1')!;
  assert.deepEqual(inOrder.groups.map((g) => g.hues), [inOrder.palette.slice(0, 2), inOrder.palette.slice(0, 2)]);
  assert.equal(inOrder.hues.get('cart'), inOrder.hues.get('tug-1'));
  const smart = pageReferents(MANIFEST, NO_CHOICES, '1.1')!;
  assert.deepEqual(smart.palette, oklabHues(REFERENT_COUNT, 'normal'));
  assert.notEqual(smart.hues.get('cart'), smart.hues.get('horse'));
  for (const g of smart.groups) assert.ok(g.mode !== 'order');
  assert.equal(pageReferents(MANIFEST, NO_CHOICES, '9.9'), null);
});

test('the target distance is a reader setting: kept with the referents, default stored as nothing, and it recolours', () => {
  const book = bookId('b');
  assert.equal(targetOf(referentsOf(NO_CHOICES)), TARGET_DEFAULT);
  assert.equal(setReferents(NO_CHOICES, { ...DEFAULT_REFERENTS, target: TARGET_DEFAULT }), NO_CHOICES);
  const wide = setReferents(NO_CHOICES, { ...DEFAULT_REFERENTS, target: 0.2 });
  const back = fromFile(JSON.parse(JSON.stringify(toFile(book, wide))), book);
  assert.ok(back.ok);
  assert.equal(back.ok && targetOf(referentsOf(back.choices)), 0.2);
  assert.ok(isEmpty(setReferents(wide, DEFAULT_REFERENTS)));
  const odd = fromFile({ ...toFile(book, NO_CHOICES), referents: { palette: 'oklab', mode: 'smart', target: 9 } }, book);
  assert.equal(odd.ok && targetOf(referentsOf(odd.choices)), 0.25, 'a target out of range is brought into it');
  const tight = pageReferents(MANIFEST, setReferents(NO_CHOICES, { ...DEFAULT_REFERENTS, target: 0.02 }), '1.1')!;
  const loose = pageReferents(MANIFEST, wide, '1.1')!;
  assert.notDeepEqual(tight.groups.map((g) => g.hues), loose.groups.map((g) => g.hues), 'a new target deals new colours');
});

test('an unnamed instance skips its group’s referent colours and orders the rest farthest first', () => {
  const palette = oklabHues(REFERENT_COUNT, 'normal');
  const order = unnamedOrder(palette, [], 0, [], false, 'normal');
  assert.equal(order[0], palette[0].light, 'nothing drawn: the palette’s first');
  assert.equal(order.length, REFERENT_COUNT);
  const worn = unnamedOrder(palette, [palette[2], palette[3]], 2, [], false, 'normal');
  assert.equal(worn.length, REFERENT_COUNT - 2);
  assert.ok(!worn.includes(palette[2].light) && !worn.includes(palette[3].light));
  const drawn = unnamedOrder(palette, [], 0, [palette[0].dark], true, 'normal');
  assert.equal(drawn[drawn.length - 1], palette[0].dark, 'the colour a figure has drawn goes last');
  assert.equal(unnamedOrder(palette.slice(0, 2), palette.slice(0, 2), 2, [], false, 'normal').length, 2, 'a palette all worn comes back whole');
  assert.equal(pickWrapped(order, -1), order[order.length - 1]);
  assert.equal(pickWrapped(order, order.length), order[0]);
});

test('a phrase naming several referents is split top to bottom, in equal bands with hard stops', () => {
  assert.equal(bands(['#111111', '#222222']), 'linear-gradient(180deg, #111111 0% 50%, #222222 50% 100%)');
});

test('the referent setting is remembered with the reader’s colours, and the default is stored as nothing', () => {
  const book = bookId('b');
  assert.deepEqual(referentsOf(NO_CHOICES), DEFAULT_REFERENTS);
  assert.equal(setReferents(NO_CHOICES, DEFAULT_REFERENTS), NO_CHOICES);
  const chosen = setReferents(NO_CHOICES, { palette: paletteId('oklch'), mode: 'order' });
  assert.ok(!isEmpty(chosen));
  const back = fromFile(JSON.parse(JSON.stringify(toFile(book, chosen))), book);
  assert.ok(back.ok);
  assert.deepEqual(back.ok && referentsOf(back.choices), { palette: 'oklch', mode: 'order' });
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
