import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textBlocks } from '../src/lib/content/textindex';

/* A page as the build sees it: a lead outside every span, two sections, an example inside
   the second, a sim with a head and a caption, a nested list, and maths already rendered. */
const KATEX = '<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>T</mi></mrow><annotation encoding="application/x-tex">T</annotation></semantics></math></span><span class="katex-html"><span class="mord">T</span></span></span>';
const PAGE = [
  '<p>The lead of the page.</p>',
  '<section id="shm">',
  '<h2>Simple harmonic motion</h2>',
  `<p>The period ${KATEX} of an oscillator.</p>`,
  '<figure class="sim" id="sim-osc"><div class="sim-head"><span class="eyebrow">Sim <span class="tag">live</span></span> A mass on a spring.</div><div class="controls"><button>Play</button></div><figcaption>An object slides.</figcaption></figure>',
  '<ul><li>first item<ul><li>nested item</li></ul></li><li>second &amp; last</li></ul>',
  '</section>',
  '<section id="waves">',
  '<h2>Waves</h2>',
  '<p>Before the example.</p>',
  '<div class="example" id="ex-car"><h3>Example 16.4 · A car</h3><h4>Strategy</h4><p>Work it out.</p></div>',
  '<p>After the example.</p>',
  '</section>',
].join('\n');

test('every paragraph, heading, item and caption is a block, in page order, tags dropped and maths folded back', () => {
  assert.deepEqual(textBlocks(PAGE, '16.3').map((b) => b.text), [
    'The lead of the page.', 'Simple harmonic motion', 'The period $T$ of an oscillator.', 'Sim live A mass on a spring.', 'An object slides.',
    'first item', 'nested item', 'second & last',
    'Waves', 'Before the example.', 'Example 16.4 · A car', 'Strategy', 'Work it out.', 'After the example.',
  ]);
});
test('a block names the innermost span round it, qualified by the page, or the page itself outside every span', () => {
  const by = Object.fromEntries(textBlocks(PAGE, '16.3').map((b) => [b.text, b.span]));
  assert.equal(by['The lead of the page.'], '16.3');
  assert.equal(by['The period $T$ of an oscillator.'], '16.3-shm');
  assert.equal(by['nested item'], '16.3-shm');
  assert.equal(by['Before the example.'], '16.3-waves');
  assert.equal(by['Work it out.'], '16.3-ex-car');
  assert.equal(by['After the example.'], '16.3-waves', 'the example closed, so the section is the span again');
});
test('a block stands under the last heading of its span, and a heading under itself', () => {
  const by = Object.fromEntries(textBlocks(PAGE, '16.3').map((b) => [b.text, b.head]));
  assert.equal(by['The lead of the page.'], '');
  assert.equal(by['Simple harmonic motion'], 'Simple harmonic motion');
  assert.equal(by['An object slides.'], 'Simple harmonic motion');
  assert.equal(by['Work it out.'], 'Strategy');
  assert.equal(by['After the example.'], 'Waves', 'the example’s headings were its own');
});
test('a figure gives only its head and its caption; empty blocks are dropped', () => {
  const blocks = textBlocks('<section id="a"><figure id="f"><p>hidden prose</p><figcaption></figcaption></figure><p> </p><p>kept</p></section>', '2.1');
  assert.deepEqual(blocks.map((b) => b.text), ['kept']);
});
