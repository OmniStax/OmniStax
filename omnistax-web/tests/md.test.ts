import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLinks, linkInner, linkKey, parseLink } from '../src/lib/notes/md/links';
import { render, setImageWidth, type Resolver } from '../src/lib/notes/md/render';

const r: Resolver = {
  note: (name) => (name === 'Damped motion' ? 'a1b2c3d4' : null),
  section: (id) => (id === '16.4' ? { title: 'The Simple Pendulum' } : null),
  highlight: (id) => (id === 'h7' ? { quote: 'a pendulum <keeps> time', color: 'green', text: 'why the length alone', section: '16.4' } : null),
  asset: (id) => (id === 'img1' ? 'data:image/png;base64,AAAA' : null),
};

test('a link names a note, a section or a highlight', () => {
  assert.deepEqual(parseLink('Damped motion'), { kind: 'note', name: 'Damped motion' });
  assert.deepEqual(parseLink('  16.4 '), { kind: 'section', section: '16.4' });
  assert.deepEqual(parseLink('hl:h7'), { kind: 'highlight', id: 'h7' });
  assert.deepEqual(parseLink('16.4|the pendulum'), { kind: 'section', section: '16.4', alias: 'the pendulum' });
  assert.deepEqual(parseLink('Damped motion | damping'), { kind: 'note', name: 'Damped motion', alias: 'damping' });
  assert.deepEqual(parseLink('16.4.2'), { kind: 'note', name: '16.4.2' });
});

test('a link has a key and an inner form that write it back', () => {
  assert.equal(linkKey(parseLink('16.4|x')), 'section:16.4');
  assert.equal(linkKey(parseLink('hl:h7')), 'hl:h7');
  assert.equal(linkKey(parseLink('Damped motion')), 'note:Damped motion');
  assert.equal(linkInner({ kind: 'highlight', id: 'h7' }), 'hl:h7');
  assert.equal(linkInner({ kind: 'section', section: '16.4' }), '16.4');
});

test('every link of a note is found, embeds included', () => {
  const found = findLinks('See [[16.4]] and ![[hl:h7]], also [[Damped motion|damping]].');
  assert.deepEqual(found.map(linkKey), ['section:16.4', 'hl:h7', 'note:Damped motion']);
});

test('a note link resolves to its note, or shows dead', () => {
  const live = render('See [[Damped motion]].', r);
  assert.match(live, /<a class="wiki" data-link="note:a1b2c3d4" href="#">Damped motion<\/a>/);
  const alias = render('See [[Damped motion|damping]].', r);
  assert.match(alias, /data-link="note:a1b2c3d4" href="#">damping</);
  const gone = render('See [[Free fall]].', r);
  assert.match(gone, /<span class="wiki dead">Free fall<\/span>/);
  assert.doesNotMatch(gone, /data-link/);
});

test('a section link carries its number and title', () => {
  assert.match(render('Read [[16.4]] first.', r), /<a class="wiki" data-link="section:16\.4" href="#">16\.4 · The Simple Pendulum<\/a>/);
  assert.match(render('Read [[19.9]] first.', r), /<span class="wiki dead">19\.9<\/span>/);
});

test('a highlight becomes a quote card, as a link or as an embed', () => {
  const embed = render('![[hl:h7]]', r);
  assert.match(embed, /<div class="hl-embed hl-green" data-hl="h7">/);
  assert.match(embed, /<blockquote>a pendulum &lt;keeps&gt; time<\/blockquote>/);
  assert.match(embed, /<div class="hl-meta">16\.4<\/div>/);
  assert.match(embed, /<div class="hl-text">why the length alone<\/div>/);
  assert.doesNotMatch(embed, /<p>/);
  assert.match(render('[[hl:h7]]', r), /<div class="hl-embed hl-green"/);
  assert.match(render('as in [[hl:h9]] above', r), /<span class="wiki dead">hl:h9<\/span>/);
});

test('an image may carry a width, and an asset its id', () => {
  const sized = render('![a plot|320](https://example.com/p.png)', r);
  assert.match(sized, /alt="a plot"/);
  assert.match(sized, /src="https:\/\/example\.com\/p\.png"/);
  assert.match(sized, /width="320" data-width="320"/);
  const asset = render('![paste](asset:img1)', r);
  assert.match(asset, /src="data:image\/png;base64,AAAA"/);
  assert.match(asset, /data-asset="img1"/);
  const pending = render('![paste](asset:img9)', r);
  assert.match(pending, /data-asset="img9"/);
  assert.doesNotMatch(pending, / src="/);
  assert.doesNotMatch(render('![x](javascript:alert(1))', r), / src="/);
});

test('math is rendered where it stands', () => {
  const inline = render('The period is $T = 2\\pi\\sqrt{L/g}$ here.', r);
  assert.match(inline, /class="katex"/);
  assert.doesNotMatch(inline, /\$/);
  const block = render('Before\n\n$$T = 2\\pi\\sqrt{L/g}$$\n\nafter', r);
  assert.match(block, /class="katex-display"/);
  assert.match(render('a `$5` price', r), /<code>\$5<\/code>/);
  assert.match(render('costs $5 and $9 total', r), /\$5 and \$9/);
});

test('HTML written in a note is shown, never run', () => {
  const out = render('<script>alert(1)</script>\n\nplain <b>bold</b> text', r);
  assert.doesNotMatch(out, /<script>/);
  assert.doesNotMatch(out, /<b>/);
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /&lt;b&gt;bold&lt;\/b&gt;/);
});

test('setting an image width rewrites the one image that has that address', () => {
  assert.equal(setImageWidth('![a](asset:img1)', 'asset:img1', 320), '![a|320](asset:img1)');
  assert.equal(setImageWidth('![a|100](asset:img1)', 'asset:img1', 240), '![a|240](asset:img1)');
  assert.equal(setImageWidth('![a](asset:img1) and ![b](asset:img2)', 'asset:img2', 80), '![a](asset:img1) and ![b|80](asset:img2)');
  assert.equal(setImageWidth('![a](asset:img1)', 'asset:nope', 80), '![a](asset:img1)');
  assert.equal(setImageWidth('![a](p.png "cap")', 'p.png', 60), '![a|60](p.png "cap")');
});
