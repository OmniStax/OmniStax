import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originalEyebrow } from '../src/lib/sections/original';
import { eyebrowOf } from '../src/lib/content/check';

/* Root RULES item 14: a figure with an original transforms a book figure, so it is a Figure: "Figure N" where it
   carries the book's number, "Figure" alone where the book's figure has none. Showing the original swaps the caption,
   never the label, so the book caption's eyebrow is the live figure's own. */
test('the original of a numbered figure reads its number, of an unnumbered one "Figure"', () => {
  assert.equal(originalEyebrow('3.3 + 3.4'), 'Figure 3.3 + 3.4');
  assert.equal(originalEyebrow(undefined), 'Figure');
  assert.equal(originalEyebrow(''), 'Figure');
});
test("the original's eyebrow is the one the checker asks of the live figure", () => {
  const row = (number?: string) => ({ id: 'sim-x', kind: 'sim', folds: [], originals: ['media/x.png'], ...(number === undefined ? {} : { number }) }) as unknown as Parameters<typeof eyebrowOf>[0];
  assert.equal(originalEyebrow(undefined), eyebrowOf(row()));
  assert.equal(originalEyebrow('2.4'), eyebrowOf(row('2.4')));
});
