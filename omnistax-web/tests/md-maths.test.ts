import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, type Resolver } from '../src/lib/notes/md/render';

const none = new Proxy({}, { get: () => () => null }) as Resolver;
const md = (s: string): string => render(s, none);

test('\\( … \\) is inline maths and \\[ … \\] is display maths', () => {
  const inline = md('The force \\(F = ma\\) grows.');
  assert.match(inline, /<p>The force <span class="katex">/);
  assert.doesNotMatch(inline, /katex-display/);
  assert.match(md('So \\[E = mc^2\\] holds.'), /katex-display/);
});

test('\\[ … \\] on lines of its own is a block, not a paragraph', () => {
  const out = md('Above.\n\\[\na^2 + b^2 = c^2\n\\]\nBelow.');
  assert.match(out, /<p>Above\.<\/p>\s*<span class="katex-display">/);
  assert.match(out, /<p>Below\.<\/p>/);
});

test('dollars still work and a lone escaped bracket stays words', () => {
  assert.match(md('A $x$ here'), /katex/);
  assert.match(md('An \\[ alone'), /<p>An \[ alone<\/p>/);
});

test('a book-prefixed card link is a block of its own', () => {
  const out = md('Before.\n![[eq:college-physics-2e/16.1:eq-hooke]]\nAfter.');
  assert.doesNotMatch(out, /<p>[^<]*<span class="wiki dead"/);
  assert.match(out, /data-embed="eq:college-physics-2e\/16\.1:eq-hooke"/);
});
