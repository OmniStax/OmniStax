import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookKey, embedText, findLinks, isBook, linkInner, linkKey, parseLink } from '../src/lib/notes/md/links';
import { render, setImageWidth, type Resolver } from '../src/lib/notes/md/render';

/* One chapter's worth of the book, enough for one row of each of its tables:
   16.1 is fetched and 16.4 is a chapter nobody has asked for yet. */
const r: Resolver = {
  note: (name) => (name === 'Damped motion' ? 'a1b2c3d4' : null),
  section: (id) => (id === '16.4' ? { title: 'The Simple Pendulum' } : null),
  highlight: (id) => (id === 'h7' ? { quote: 'a pendulum <keeps> time', color: 'green', text: 'why the length alone', section: '16.4' } : null),
  asset: (id) => (id === 'img1' ? 'data:image/png;base64,AAAA' : null),
  equation: (section, id) =>
    section !== '16.1' ? null
      : id === 'eq-hooke' ? { tex: '\\kF = -\\kk\\kx', condition: 'small deformations', important: true, conceptName: 'Hooke’s law', anchor: '16.1-hookes-law', section: '16.1' }
        : id === 'eq-k' ? { tex: '\\kk = -\\frac{\\kF}{\\kx}', important: false, section: '16.1' }
          : null,
  term: (section, term) =>
    (section === '16.1' && term === 'deformation' ? { term: 'deformation', definition: 'displacement from equilibrium', section: '16.1' } : null),
  symbol: (section, sym) =>
    (section === '16.1' && sym === 'F' ? { sym: 'F', tex: '\\kF', meaning: 'restoring force', unit: 'N', typeLabel: 'force', section: '16.1', anchor: '16.1-hookes-law' } : null),
  concept: (section, id) =>
    section !== '16.1' ? null
      : id === 'hookes-law' ? { name: 'Hooke’s law, $\\kF = -\\kk\\kx$', kind: 'result', why: 'the restoring force grows with the deformation', section: '16.1', eqTex: '\\kF = -\\kk\\kx', placeholder: false }
        : id === 'later-idea' ? { name: 'Something later', kind: 'idea', section: '16.1', placeholder: true }
          : null,
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

test('a link names a thing of the book by its section and its key', () => {
  assert.deepEqual(parseLink('eq:16.1:eq-hooke'), { kind: 'equation', section: '16.1', id: 'eq-hooke' });
  assert.deepEqual(parseLink('def:16.1:deformation'), { kind: 'term', section: '16.1', term: 'deformation' });
  assert.deepEqual(parseLink('sym:16.1:F'), { kind: 'symbol', section: '16.1', sym: 'F' });
  assert.deepEqual(parseLink('concept:16.1:hookes-law'), { kind: 'concept', section: '16.1', id: 'hookes-law' });
  for (const inner of ['eq:16.1:eq-hooke', 'def:16.1:deformation', 'sym:16.1:F', 'concept:16.1:hookes-law']) {
    const t = parseLink(inner);
    assert.equal(isBook(t), true);
    assert.equal(linkInner(t), inner);
    assert.equal(linkKey(t), inner);
    assert.equal(embedText(t), `![[${inner}]]`);
    assert.equal(bookKey(t as never), inner.split(':')[2]);
  }
  assert.deepEqual(parseLink('eq:later'), { kind: 'note', name: 'eq:later' });
  assert.deepEqual(findLinks('![[eq:16.1:eq-hooke]] and ![[sym:16.1:F]]').map(linkKey), ['eq:16.1:eq-hooke', 'sym:16.1:F']);
});

test('an equation of the book is held whole, as a card', () => {
  const card = render('![[eq:16.1:eq-hooke]]', r);
  assert.match(card, /<div class="book-embed kind-equation" data-embed="eq:16\.1:eq-hooke">/);
  assert.match(card, /<div class="embed-eyebrow">Equation · important · 16\.1 · small deformations<\/div>/);
  assert.match(card, /<div class="embed-tex" data-tex="\\kF = -\\kk\\kx"><\/div>/);
  assert.match(card, /<div class="embed-body">Hooke’s law<\/div>/);
  assert.doesNotMatch(card, /<p>/);
  /* an equation that is only a step of a derivation says nothing more than what it is */
  assert.match(render('![[eq:16.1:eq-k]]', r), /<div class="embed-eyebrow">Equation · 16\.1<\/div>/);
  assert.doesNotMatch(render('![[eq:16.1:eq-k]]', r), /embed-body/);
});

test('a term, a symbol and a concept each say what their card says', () => {
  const term = render('![[def:16.1:deformation]]', r);
  assert.match(term, /<div class="book-embed kind-term" data-embed="def:16\.1:deformation">/);
  assert.match(term, /<div class="embed-eyebrow">Term · 16\.1<\/div>/);
  assert.match(term, /<div class="embed-title">deformation<\/div>/);
  assert.match(term, /<div class="embed-body">Displacement from equilibrium\.<\/div>/);

  const sym = render('![[sym:16.1:F]]', r);
  assert.match(sym, /<div class="book-embed kind-symbol" data-embed="sym:16\.1:F">/);
  assert.match(sym, /<div class="embed-eyebrow">Symbol · force · N<\/div>/);
  assert.match(sym, /<div class="embed-tex" data-tex="\\kF"><\/div>/);
  assert.match(sym, /<div class="embed-body">Restoring force\.<\/div>/);

  const concept = render('![[concept:16.1:hookes-law]]', r);
  assert.match(concept, /<div class="book-embed kind-concept" data-embed="concept:16\.1:hookes-law">/);
  assert.match(concept, /<div class="embed-eyebrow">Concept · result · section 16\.1<\/div>/);
  /* the name sets its result in maths, so the view is told to render it */
  assert.match(concept, /<div class="embed-title" data-math="1">Hooke’s law, \$\\kF = -\\kk\\kx\$<\/div>/);
  assert.match(concept, /<div class="embed-body">The restoring force grows with the deformation\.<\/div>/);
  assert.match(concept, /<div class="embed-tex" data-tex="\\kF = -\\kk\\kx"><\/div>/);
});

test('a concept of a section nobody has built says so', () => {
  const card = render('![[concept:16.1:later-idea]]', r);
  assert.match(card, /<div class="embed-eyebrow">Concept · idea · section 16\.1<\/div>/);
  assert.match(card, /<div class="embed-body">Section 16\.1 is not built yet\.<\/div>/);
  assert.doesNotMatch(card, /embed-tex/);
});

test('a thing the book does not hold keeps what names it, so the chapter can be asked for', () => {
  for (const inner of ['eq:16.4:eq-pendulum', 'def:16.4:period', 'sym:16.4:L', 'concept:16.4:pendulum']) {
    const out = render(`![[${inner}]]`, r);
    assert.match(out, new RegExp(`<span class="wiki dead" data-embed="${inner.replace(/\./g, '\\.')}">${inner.replace(/\./g, '\\.')}</span>`));
    assert.doesNotMatch(out, /book-embed/);
  }
  assert.match(render('![[eq:16.4:x|the period]]', r), /data-embed="eq:16\.4:x">the period<\/span>/);
});

test('a thing of the book is a card whether it is written as an embed or as a link', () => {
  assert.match(render('[[def:16.1:deformation]]', r), /<div class="book-embed kind-term"/);
  assert.match(render('as in [[sym:16.1:F]] above', r), /<div class="book-embed kind-symbol"/);
  assert.match(render('as in [[sym:16.4:L]] above', r), /<span class="wiki dead" data-embed="sym:16\.4:L">/);
});

test('what the data says is escaped, and its TeX never becomes markup', () => {
  const quoted: Resolver = { ...r, term: () => ({ term: '<b>strain</b>', definition: 'a "ratio" & nothing more', section: '16.1' }), symbol: () => ({ sym: 'x', tex: '\\text{"}<x>', meaning: 'a place', unit: '', section: '16.1' }) };
  const term = render('![[def:16.1:strain]]', quoted);
  assert.match(term, /&lt;b&gt;strain&lt;\/b&gt;/);
  assert.match(term, /A &quot;ratio&quot; &amp; nothing more\./);
  assert.doesNotMatch(term, /<b>/);
  const sym = render('![[sym:16.1:x]]', quoted);
  assert.match(sym, /data-tex="\\text\{&quot;\}&lt;x&gt;"/);
  assert.doesNotMatch(sym, /<x>/);
  /* a symbol with no type and no unit says only what it is */
  assert.match(sym, /<div class="embed-eyebrow">Symbol<\/div>/);
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
