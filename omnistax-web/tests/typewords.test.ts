import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptSchema } from '../src/lib/content/schema';
import { markTypeWords, wordIndex, wordsOfLabel } from '../src/lib/content/typewords';
import { prerenderMath } from '../src/lib/math/prerender';

const concept = (id: string, name: string, type?: string, terms: readonly string[] = []) =>
  ConceptSchema.parse({ id, kind: 'definition', section: '5.1', name, terms, ...(type ? { type } : {}) });
const INDEX = wordIndex([
  concept('friction', 'Friction', 'force', ['friction']),
  concept('kinetic-friction', 'Kinetic friction', 'force', ['kinetic friction']),
  concept('coefficient-kinetic', 'Coefficient of kinetic friction', undefined, ['coefficient of kinetic friction']),
  concept('time', 'Time', 'time'),
  concept('time-constant', 'Time constant', 'time-constant'),
  concept('voltage', 'Potential difference (or voltage)', 'voltage', ['potential difference']),
  concept('frequency', 'Frequency (ν)', 'frequency'),
  concept('energy', 'Energy', 'energy', ['energy']),
  concept('ph', 'pH', 'acidity'),
  concept('mass', 'Mass', 'mass', ['m']),
  concept('body', 'Body', 'mass', ['body']),
  concept('body-part', 'Body part', 'part', ['body']),
]);
const mark = (html: string): string => markTypeWords(INDEX, html);
const T = (type: string, text: string): string => `<span data-type="${type}">${text}</span>`;

test('a label gives its words without its parenthesis, and the word an "or" offers', () => {
  assert.deepEqual(wordsOfLabel('Potential difference (or voltage)'), ['Potential difference', 'voltage']);
  assert.deepEqual(wordsOfLabel('Frequency (ν)'), ['Frequency']);
  assert.deepEqual(wordsOfLabel('Time'), ['Time']);
});
test('the longest phrase that starts at a word wins, whatever its case', () => {
  assert.equal(mark('<p>Kinetic friction is less than friction. The time constant is a time.</p>'),
    `<p>${T('force', 'Kinetic friction')} is less than ${T('force', 'friction')}. The ${T('time-constant', 'time constant')} is a ${T('time', 'time')}.</p>`);
});
test('a typed word inside an untyped concept\u2019s longer word stays ink with it', () => {
  assert.equal(mark('<p>the coefficient of kinetic friction</p>'), '<p>the coefficient of kinetic friction</p>');
});
test('plurals and the possessive are the word', () => {
  assert.equal(mark('<p>three times, frequencies, energy\u2019s, voltages</p>'),
    `<p>three times, ${T('frequency', 'frequencies')}, ${T('energy', 'energy\u2019s')}, ${T('voltage', 'voltages')}</p>`);
});
test('whole words only, and short words and symbols are no words', () => {
  assert.equal(mark('<p>timeless, time-dependent, m and pH</p>'), `<p>timeless, time-dependent, m and ${T('acidity', 'pH')}</p>`);
});
test('a parenthesis\u2019s "or" word is a word of the concept, and the words across a line break still match', () => {
  assert.equal(mark('<p>the voltage, a potential\ndifference</p>'), `<p>the ${T('voltage', 'voltage')}, a ${T('voltage', 'potential\ndifference')}</p>`);
});
test('headings, eyebrows, links, code and subscripts are never marked; captions are', () => {
  const html = '<h2>Friction</h2><div class="eyebrow">Friction</div><a href="#x">friction</a><code>time</code><sub>time</sub><figure class="sim"><div class="sim-head"><span class="eyebrow">Sim</span><span>the friction</span></div></figure>';
  assert.equal(mark(html), html.replace('<span>the friction</span>', `<span>the ${T('force', 'friction')}</span>`));
});
test('rendered math is never marked', () => {
  const html = prerenderMath('<p>energy $E = \\text{energy}$</p>', {});
  const out = mark(html);
  assert.ok(out.startsWith(`<p>${T('energy', 'energy')} <span class="katex">`));
  assert.equal(out.match(/data-type/g)?.length, 1);
});
test('a span the author wrote, of a type, a referent or ink, is left as written', () => {
  const html = '<p><span data-type="force">the static friction</span>, <span data-ref="crate">the time crate</span>, at the same <span data-ink>time</span></p>';
  assert.equal(mark(html), html);
});
test('attributes are never touched', () => {
  assert.equal(mark('<figure data-original-caption="friction and time"><img alt="friction"></figure>'), '<figure data-original-caption="friction and time"><img alt="friction"></figure>');
});
test('marking twice changes nothing', () => {
  const once = mark('<p>Kinetic friction takes time, and <em>energy</em> with it.</p>');
  assert.equal(mark(once), once);
});
test('two concepts of different types sharing a word: the first in the table wins, and the index says so', () => {
  assert.equal(mark('<p>the body</p>'), `<p>the ${T('mass', 'body')}</p>`);
  assert.deepEqual(INDEX.conflicts.map((c) => [c.word, c.chosen]), [['body', 'mass']]);
});
