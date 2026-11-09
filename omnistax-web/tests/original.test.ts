import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalEyebrow } from '../src/lib/sections/original';
import { eyebrowOf } from '../src/lib/content/check';

/* Root RULES item 14: the reader sees two labels, "Figure N" and "Sim", and the label follows the number. Showing a
   figure's original swaps its caption, never its label, so the book caption's eyebrow is the live figure's own. */
test('the original of a numbered figure reads its number, of an unnumbered Sim "Sim", never a bare "Figure"', () => {
  assert.equal(originalEyebrow('3.3 + 3.4'), 'Figure 3.3 + 3.4');
  assert.equal(originalEyebrow(undefined), 'Sim');
  assert.equal(originalEyebrow(''), 'Sim');
});
test("the original's eyebrow is the one the checker asks of the live figure", () => {
  const row = (number?: string) => ({ id: 'sim-x', kind: 'sim', folds: [], ...(number === undefined ? {} : { number }) }) as unknown as Parameters<typeof eyebrowOf>[0];
  assert.equal(originalEyebrow(undefined), eyebrowOf(row()));
  assert.equal(originalEyebrow('2.4'), eyebrowOf(row('2.4')));
});
