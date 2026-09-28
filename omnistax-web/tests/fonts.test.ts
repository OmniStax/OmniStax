import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FONTS, DEFAULT_FIGURE_FONT, DEFAULT_BODY_FONT, isFontId, fontStack, fontFamily, parseFont, effective, loadSpecs } from '../src/lib/settings/fonts';

test('six fonts in the settled order, with both defaults among them', () => {
  assert.deepEqual(FONTS.map((f) => f.id), ['ncm', 'cmu', 'lmr', 'sourceSerif', 'sourceSans', 'libertinus']);
  assert.equal(DEFAULT_FIGURE_FONT, 'ncm'); assert.equal(DEFAULT_BODY_FONT, 'sourceSerif');
});
test('each stack leads with its own family and ends in a generic', () => {
  for (const f of FONTS) {
    assert.ok(fontStack(f.id).startsWith(`'${fontFamily(f.id)}',`));
    assert.match(fontStack(f.id), /(serif|sans-serif)$/);
  }
  assert.match(fontStack('sourceSans'), /sans-serif$/);
});
test('every family is declared by the bundled @font-face rules', () => {
  const css = readFileSync(new URL('../public/fonts/fonts.css', import.meta.url), 'utf8');
  for (const f of FONTS) assert.ok(css.includes(`font-family:'${fontFamily(f.id)}'`), f.label);
});
test('a stored value parses only to a known id', () => {
  assert.equal(isFontId('cmu'), true); assert.equal(isFontId('Comic Sans'), false); assert.equal(isFontId(null), false);
  assert.equal(parseFont('libertinus', 'ncm'), 'libertinus'); assert.equal(parseFont(null, 'ncm'), 'ncm'); assert.equal(parseFont('x', 'sourceSerif'), 'sourceSerif');
});
test('the preview wins while set, the saved value otherwise', () => {
  assert.equal(effective<string>('lmr', 'ncm'), 'lmr'); assert.equal(effective<string>(undefined, 'ncm'), 'ncm');
  assert.equal(effective<string>(undefined, 'system'), 'system'); assert.equal(effective<string>('dark', 'light'), 'dark');
});
test('load specs name the chosen family in each weight the role draws', () => {
  assert.deepEqual(loadSpecs('body', 'cmu'), ["400 16px 'CMU Serif'", "700 16px 'CMU Serif'", "italic 400 16px 'CMU Serif'"]);
  assert.ok(loadSpecs('figure', 'ncm').includes("600 16px 'New Computer Modern Book'"));
});
