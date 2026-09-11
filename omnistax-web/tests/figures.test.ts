import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { linkFigureRefs, figureIds, figureList, figureNumber, printedNumbers, qualifyIds, sizeImages, splitNumbers } from '../src/lib/content/fragment';
import { prerenderMath } from '../src/lib/math/prerender';
import { spanId } from '../src/lib/types/ids';
import { ROOT } from './book-on-disk';

const figs = new Map([[figureNumber('16.4'), spanId('16.1-sim-spring-scale')], [figureNumber('16.9'), spanId('16.3-sim-shm-oscillator')]]);
const link = (n: string, id: string, text = `Figure ${n}`): string => `<a class="figref" href="#${id}" data-figref="${n}">${text}</a>`;

test('a single reference is wrapped whole', () => {
  assert.equal(linkFigureRefs('<p>See Figure 16.4. Then read on.</p>', figs), `<p>See ${link('16.4', '16.1-sim-spring-scale')}. Then read on.</p>`);
});
test('a plural reference links each number', () => {
  assert.equal(linkFigureRefs('Figures 16.4 and 16.9 show it.', figs), `Figures ${link('16.4', '16.1-sim-spring-scale', '16.4')} and ${link('16.9', '16.3-sim-shm-oscillator', '16.9')} show it.`);
  assert.equal(linkFigureRefs('Figures 16.4, 16.9, and 16.20.', figs), `Figures ${link('16.4', '16.1-sim-spring-scale', '16.4')}, ${link('16.9', '16.3-sim-shm-oscillator', '16.9')}, and 16.20.`);
});
test('a number the chapter has no figure for stays plain', () => {
  const html = '<p>Figure 16.5 is a photograph. Example 16.4 is not a figure.</p>';
  assert.equal(linkFigureRefs(html, figs), html);
  assert.equal(linkFigureRefs(html, new Map()), html);
});
test('text already inside a link and a caption naming itself are left alone', () => {
  const inA = '<a href="#x">Figure 16.4</a> and Figure 16.4';
  assert.equal(linkFigureRefs(inA, figs), `<a href="#x">Figure 16.4</a> and ${link('16.4', '16.1-sim-spring-scale')}`);
  const head = '<div class="sim-head"><span class="eyebrow">Figure 16.4</span><span>As in Figure 16.9.</span></div>';
  assert.equal(linkFigureRefs(head, figs), `<div class="sim-head"><span class="eyebrow">Figure 16.4</span><span>As in ${link('16.9', '16.3-sim-shm-oscillator')}.</span></div>`);
  const cap = '<figcaption><span class="eyebrow">Figure 16.4</span><span>The strings.</span></figcaption>';
  assert.equal(linkFigureRefs(cap, figs), cap);
});
test('a folded figure prints every number it replaces, in the book\'s order', () => {
  assert.equal(printedNumbers({ number: '3.3', folds: ['3.5', '3.4'] }), '3.3 + 3.4 + 3.5');
  assert.equal(printedNumbers({ number: '2.10', folds: ['2.9'] }), '2.9 + 2.10', 'numeric on both parts, not by the string');
  assert.equal(printedNumbers({ number: '16.11', folds: ['16.10', '2.1'] }), '2.1 + 16.10 + 16.11');
  assert.equal(printedNumbers({ number: '16.4', folds: [] }), '16.4');
  assert.equal(printedNumbers({ folds: [] }), undefined, 'a figure with no number prints none');
  assert.deepEqual(splitNumbers('2.9 + 2.10'), ['2.9', '2.10']);
  assert.deepEqual(splitNumbers('16.4'), ['16.4']);
});
test('a folded data-figure links each of its numbers to the one sim', () => {
  const html = '<figure class="sim" id="sim-walk" data-figure="3.3 + 3.4 + 3.5" data-original="/a.jpg,/b.jpg,/c.jpg"></figure>';
  const m = figureIds(html, '3.1');
  assert.deepEqual([...m], [['3.3', '3.1-sim-walk'], ['3.4', '3.1-sim-walk'], ['3.5', '3.1-sim-walk']]);
  assert.equal(linkFigureRefs('<p>As pictured in Figure 3.5, and again in Figures 3.3 and 3.4.</p>', m),
    `<p>As pictured in ${link('3.5', '3.1-sim-walk')}, and again in Figures ${link('3.3', '3.1-sim-walk', '3.3')} and ${link('3.4', '3.1-sim-walk', '3.4')}.</p>`);
  const head = '<div class="sim-head"><span class="eyebrow">Figure 3.3 + 3.4 + 3.5</span><span>The walk.</span></div>';
  assert.equal(linkFigureRefs(head, m), head, 'the eyebrow names the figure itself and is not linked');
});
test('figureIds reads a section and qualifies; qualifyIds leaves those hrefs alone', () => {
  const html = '<figure class="sim" id="sim-a" data-figure="16.4" data-original="/m.jpg"></figure><figure class="sim" id="sim-b"></figure><figure class="photo" id="fig-c" data-figure="16.8"></figure>';
  const m = figureIds(html, '16.1');
  assert.deepEqual([...m], [['16.4', '16.1-sim-a'], ['16.8', '16.1-fig-c']]);
  assert.equal(qualifyIds('<a href="#16.3-sim-x">x</a><a href="#local">y</a>', '16.1'), '<a href="#16.3-sim-x">x</a><a href="#16.1-local">y</a>');
});

test('sizeImages writes the book’s width onto a photograph’s image as --book-w, and leaves an image with no width alone', () => {
  const photo = '<figure class="photo" id="fig-jet" data-figure="2.4"><img src="/media/ch02/Figure_02_02_00.jpg" alt="A jet." data-width="300"><figcaption></figcaption></figure>';
  const sized = '<figure class="photo" id="fig-jet" data-figure="2.4"><img src="/media/ch02/Figure_02_02_00.jpg" alt="A jet." data-width="300" style="--book-w:300"><figcaption></figcaption></figure>';
  assert.equal(sizeImages(photo), sized);
  assert.equal(sizeImages(sized), sized, 'sizing twice writes nothing twice');
  const bare = '<figure class="photo" id="fig-mri"><img src="/m.jpg" alt="A scan."></figure>';
  assert.equal(sizeImages(bare), bare);
  assert.equal(sizeImages(`${bare}${photo}`), `${bare}${sized}`, 'each image is sized on its own');
});

const sim = (id: string, head: string): string => `<figure class="sim" id="${id}"><div class="sim-head">${head}</div></figure>`;
const eyebrow = (text: string): string => `<span class="eyebrow">${text}</span>`;

test('figureList labels a figure with its eyebrow and the first sentence of its head', () => {
  const html = [
    sim('sim-shm-oscillator', `${eyebrow('Figure 16.9')}<span>An object on a spring slides on a frictionless surface, as in <a class="figref" href="#16.3-sim-shm-oscillator" data-figref="16.9">Figure 16.9</a>. It is released from rest and oscillates.</span>`),
    sim('sim-shm-period', `${eyebrow('Sim')}<span>Two identical objects are released at the same moment. They stay in step.</span>`),
    '<figure class="sim" id="sim-shm-period-graph"></figure>',
    '<figure class="photo" id="fig-guitar"><figcaption><span class="eyebrow">Figure 16.8</span><span>The strings.</span></figcaption></figure>',
  ].join('\n');
  assert.deepEqual(figureList(html, '16.3'), [
    { id: 'sim-shm-oscillator', label: 'Figure 16.9 · An object on a spring slides on a frictionless surface, as in Figure 16.9.' },
    { id: 'sim-shm-period', label: 'Sim · Two identical objects are released at the same moment.' },
    { id: 'sim-shm-period-graph', label: 'shm period graph' },
  ]);
});
test('figureList takes the head of a figure with no eyebrow, and gives a qualified id back', () => {
  assert.deepEqual(figureList(sim('sim-a', '<span>One sentence only</span>'), '16.3'), [{ id: 'sim-a', label: 'One sentence only' }]);
  assert.deepEqual(figureList(sim('16.3-sim-a', `${eyebrow('Sim')}<span>Qualified.</span>`), '16.3'), [{ id: 'sim-a', label: 'Sim · Qualified.' }]);
});
test('figureList caps a long sentence with an ellipsis', () => {
  const long = `${'word '.repeat(40)}ends here. A second sentence.`;
  const [fig] = figureList(sim('sim-a', `${eyebrow('Sim')}<span>${long}</span>`), '16.3');
  assert.equal(fig.label.startsWith('Sim · word word'), true);
  assert.equal(fig.label.endsWith('…'), true);
  assert.ok(fig.label.slice('Sim · '.length).length <= 141, fig.label);   /* 140 characters and the ellipsis, less if the cut fell on a space */
});
test('figureList keeps math as $…$, whether the text is written or prerendered', () => {
  const head = `${eyebrow('Figure 16.9')}<span>It is released from rest at $\\x = \\X$ and oscillates. Then on.</span>`;
  const label = 'Figure 16.9 · It is released from rest at $\\x = \\X$ and oscillates.';
  assert.deepEqual(figureList(sim('sim-a', head), '16.3'), [{ id: 'sim-a', label }]);
  assert.deepEqual(figureList(prerenderMath(sim('sim-a', head), {}), '16.3'), [{ id: 'sim-a', label }]);
});

/* Every original a section names is served, and every figure with a number has an original or is a photograph. */
const sections = fs.readdirSync(ROOT).filter((d) => /^ch\d+$/.test(d)).flatMap((ch) => fs.readdirSync(path.join(ROOT, ch)).filter((s) => fs.existsSync(path.join(ROOT, ch, s, 'text.html'))).map((s) => path.join(ROOT, ch, s, 'text.html')));
test('data-original paths exist under the book\'s media', () => {
  assert.ok(sections.length > 0);
  sections.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    [...html.matchAll(/data-original="([^"]+)"/g)].flatMap(([, v]) => v.split(',')).forEach((p) => {
      assert.ok(fs.existsSync(path.resolve(ROOT, p.replace(/^\//, ''))), `${file}: ${p} is not served`);
    });
    [...html.matchAll(/<figure\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => tag.includes('data-figure=')).forEach((tag) => {
      assert.ok(/\bid="/.test(tag), `${file}: a numbered figure needs an id: ${tag}`);
      assert.ok(tag.includes('class="photo"') || tag.includes('data-original='), `${file}: a numbered sim needs its original: ${tag}`);
    });
  });
});

/* The section's figures table and its text say the same thing: one row for every
   <figure> the text draws, and no row for a figure it does not. */
const sectionDirs = fs.readdirSync(ROOT).filter((d) => /^ch\d+$/.test(d))
  .flatMap((ch) => fs.readdirSync(path.join(ROOT, ch)).map((s) => path.join(ROOT, ch, s)).filter((d) => fs.existsSync(path.join(d, 'section.json'))));
type Row = { id: string; number?: string; folds?: string[] };
const figureRows = (dir: string): Row[] =>
  (JSON.parse(fs.readFileSync(path.join(dir, 'section.json'), 'utf8')) as { figures?: Row[] }).figures ?? [];

test('every figure of a section is a row of its figures table, and every row is a figure', () => {
  assert.ok(sectionDirs.length > 0);
  sectionDirs.forEach((dir) => {
    const html = fs.readFileSync(path.join(dir, 'text.html'), 'utf8');
    const drawn = [...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"/g)].map(([, id]) => id).sort();
    assert.deepEqual(figureRows(dir).map((f) => f.id).sort(), drawn, `${dir}: the figures table and the text disagree`);
  });
});
test('a figure the text numbers is numbered the same way in the table, folds and all', () => {
  sectionDirs.forEach((dir) => {
    const html = fs.readFileSync(path.join(dir, 'text.html'), 'utf8');
    const numbered: Record<string, string> = Object.fromEntries([...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"[^>]*\bdata-figure="([^"]+)"/g)].map(([, id, n]) => [id, n]));
    figureRows(dir).forEach((f) => {
      const printed = printedNumbers({ number: f.number, folds: f.folds ?? [] });
      assert.equal(printed, numbered[f.id], `${dir}: figure ${f.id} is numbered ${String(printed)} in the table and ${String(numbered[f.id])} in the text`);
    });
  });
});
test('a folded figure\'s eyebrow reads every number, and every folded image is among its originals', () => {
  sectionDirs.forEach((dir) => {
    const html = fs.readFileSync(path.join(dir, 'text.html'), 'utf8');
    figureRows(dir).filter((f) => (f.folds ?? []).length > 0).forEach((f) => {
      const printed = printedNumbers({ number: f.number, folds: f.folds ?? [] });
      const fig = new RegExp(`<figure\\b[^>]*\\bid="${f.id}"[^>]*\\bdata-original="([^"]+)"[^>]*>\\s*<div class="sim-head"><span class="eyebrow">Figure ${printed?.replace(/\+/g, '\\+')}<`).exec(html);
      assert.ok(fig, `${dir}: ${f.id} should read "Figure ${String(printed)}" under its eyebrow`);
      assert.ok(fig![1].split(',').length > (f.folds ?? []).length, `${dir}: ${f.id} folds ${String(f.folds)} but carries too few originals`);
    });
  });
});
