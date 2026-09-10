import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { linkFigureRefs, figureIds, figureList, figureNumber, qualifyIds } from '../src/lib/content/fragment';
import { prerenderMath } from '../src/lib/math/prerender';
import { spanId } from '../src/lib/types/ids';

const figs = new Map([[figureNumber('16.4'), spanId('16.1-demo-spring-scale')], [figureNumber('16.9'), spanId('16.3-demo-shm-oscillator')]]);
const link = (n: string, id: string, text = `Figure ${n}`): string => `<a class="figref" href="#${id}" data-figref="${n}">${text}</a>`;

test('a single reference is wrapped whole', () => {
  assert.equal(linkFigureRefs('<p>See Figure 16.4. Then read on.</p>', figs), `<p>See ${link('16.4', '16.1-demo-spring-scale')}. Then read on.</p>`);
});
test('a plural reference links each number', () => {
  assert.equal(linkFigureRefs('Figures 16.4 and 16.9 show it.', figs), `Figures ${link('16.4', '16.1-demo-spring-scale', '16.4')} and ${link('16.9', '16.3-demo-shm-oscillator', '16.9')} show it.`);
  assert.equal(linkFigureRefs('Figures 16.4, 16.9, and 16.20.', figs), `Figures ${link('16.4', '16.1-demo-spring-scale', '16.4')}, ${link('16.9', '16.3-demo-shm-oscillator', '16.9')}, and 16.20.`);
});
test('a number the chapter has no figure for stays plain', () => {
  const html = '<p>Figure 16.5 is a photograph. Example 16.4 is not a figure.</p>';
  assert.equal(linkFigureRefs(html, figs), html);
  assert.equal(linkFigureRefs(html, new Map()), html);
});
test('text already inside a link and a caption naming itself are left alone', () => {
  const inA = '<a href="#x">Figure 16.4</a> and Figure 16.4';
  assert.equal(linkFigureRefs(inA, figs), `<a href="#x">Figure 16.4</a> and ${link('16.4', '16.1-demo-spring-scale')}`);
  const head = '<div class="demo-head"><span class="eyebrow">Figure 16.4</span><span>As in Figure 16.9.</span></div>';
  assert.equal(linkFigureRefs(head, figs), `<div class="demo-head"><span class="eyebrow">Figure 16.4</span><span>As in ${link('16.9', '16.3-demo-shm-oscillator')}.</span></div>`);
  const cap = '<figcaption><span class="eyebrow">Figure 16.4</span><span>The strings.</span></figcaption>';
  assert.equal(linkFigureRefs(cap, figs), cap);
});
test('figureIds reads a section and qualifies; qualifyIds leaves those hrefs alone', () => {
  const html = '<figure class="demo" id="demo-a" data-figure="16.4" data-original="/m.jpg"></figure><figure class="demo" id="demo-b"></figure><figure class="photo" id="fig-c" data-figure="16.8"></figure>';
  const m = figureIds(html, '16.1');
  assert.deepEqual([...m], [['16.4', '16.1-demo-a'], ['16.8', '16.1-fig-c']]);
  assert.equal(qualifyIds('<a href="#16.3-demo-x">x</a><a href="#local">y</a>', '16.1'), '<a href="#16.3-demo-x">x</a><a href="#16.1-local">y</a>');
});

const demo = (id: string, head: string): string => `<figure class="demo" id="${id}"><div class="demo-head">${head}</div></figure>`;
const eyebrow = (text: string): string => `<span class="eyebrow">${text}</span>`;

test('figureList labels a figure with its eyebrow and the first sentence of its head', () => {
  const html = [
    demo('demo-shm-oscillator', `${eyebrow('Figure 16.9')}<span>An object on a spring slides on a frictionless surface, as in <a class="figref" href="#16.3-demo-shm-oscillator" data-figref="16.9">Figure 16.9</a>. It is released from rest and oscillates.</span>`),
    demo('demo-shm-period', `${eyebrow('Demo')}<span>Two identical objects are released at the same moment. They stay in step.</span>`),
    '<figure class="demo" id="demo-shm-period-graph"></figure>',
    '<figure class="photo" id="fig-guitar"><figcaption><span class="eyebrow">Figure 16.8</span><span>The strings.</span></figcaption></figure>',
  ].join('\n');
  assert.deepEqual(figureList(html, '16.3'), [
    { id: 'demo-shm-oscillator', label: 'Figure 16.9 · An object on a spring slides on a frictionless surface, as in Figure 16.9.' },
    { id: 'demo-shm-period', label: 'Demo · Two identical objects are released at the same moment.' },
    { id: 'demo-shm-period-graph', label: 'shm period graph' },
  ]);
});
test('figureList takes the head of a figure with no eyebrow, and gives a qualified id back', () => {
  assert.deepEqual(figureList(demo('demo-a', '<span>One sentence only</span>'), '16.3'), [{ id: 'demo-a', label: 'One sentence only' }]);
  assert.deepEqual(figureList(demo('16.3-demo-a', `${eyebrow('Demo')}<span>Qualified.</span>`), '16.3'), [{ id: 'demo-a', label: 'Demo · Qualified.' }]);
});
test('figureList caps a long sentence with an ellipsis', () => {
  const long = `${'word '.repeat(40)}ends here. A second sentence.`;
  const [fig] = figureList(demo('demo-a', `${eyebrow('Demo')}<span>${long}</span>`), '16.3');
  assert.equal(fig.label.startsWith('Demo · word word'), true);
  assert.equal(fig.label.endsWith('…'), true);
  assert.ok(fig.label.slice('Demo · '.length).length <= 141, fig.label);   /* 140 characters and the ellipsis, less if the cut fell on a space */
});
test('figureList keeps math as $…$, whether the text is written or prerendered', () => {
  const head = `${eyebrow('Figure 16.9')}<span>It is released from rest at $\\x = \\X$ and oscillates. Then on.</span>`;
  const label = 'Figure 16.9 · It is released from rest at $\\x = \\X$ and oscillates.';
  assert.deepEqual(figureList(demo('demo-a', head), '16.3'), [{ id: 'demo-a', label }]);
  assert.deepEqual(figureList(prerenderMath(demo('demo-a', head), {}), '16.3'), [{ id: 'demo-a', label }]);
});

/* Every original a section names is served, and every figure with a number has an original or is a photograph. */
const content = path.resolve(import.meta.dirname, '../../');
const sections = fs.readdirSync(content).filter((d) => /^ch\d+$/.test(d)).flatMap((ch) => fs.readdirSync(path.join(content, ch)).filter((s) => fs.existsSync(path.join(content, ch, s, 'text.html'))).map((s) => path.join(content, ch, s, 'text.html')));
test('data-original paths exist under public/media', () => {
  assert.ok(sections.length > 0);
  sections.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    [...html.matchAll(/data-original="([^"]+)"/g)].flatMap(([, v]) => v.split(',')).forEach((p) => {
      assert.ok(fs.existsSync(path.resolve(import.meta.dirname, '../public', p.replace(/^\//, ''))), `${file}: ${p} is not served`);
    });
    [...html.matchAll(/<figure\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => tag.includes('data-figure=')).forEach((tag) => {
      assert.ok(/\bid="/.test(tag), `${file}: a numbered figure needs an id: ${tag}`);
      assert.ok(tag.includes('class="photo"') || tag.includes('data-original='), `${file}: a numbered demo needs its original: ${tag}`);
    });
  });
});

/* The section's figures table and its text say the same thing: one row for every
   <figure> the text draws, and no row for a figure it does not. */
const sectionDirs = fs.readdirSync(content).filter((d) => /^ch\d+$/.test(d))
  .flatMap((ch) => fs.readdirSync(path.join(content, ch)).map((s) => path.join(content, ch, s)).filter((d) => fs.existsSync(path.join(d, 'section.json'))));
const figureRows = (dir: string): { id: string; number?: string }[] =>
  (JSON.parse(fs.readFileSync(path.join(dir, 'section.json'), 'utf8')) as { figures?: { id: string; number?: string }[] }).figures ?? [];

test('every figure of a section is a row of its figures table, and every row is a figure', () => {
  assert.ok(sectionDirs.length > 0);
  sectionDirs.forEach((dir) => {
    const html = fs.readFileSync(path.join(dir, 'text.html'), 'utf8');
    const drawn = [...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"/g)].map(([, id]) => id).sort();
    assert.deepEqual(figureRows(dir).map((f) => f.id).sort(), drawn, `${dir}: the figures table and the text disagree`);
  });
});
test('a figure the text numbers is numbered the same way in the table', () => {
  sectionDirs.forEach((dir) => {
    const html = fs.readFileSync(path.join(dir, 'text.html'), 'utf8');
    const numbered: Record<string, string> = Object.fromEntries([...html.matchAll(/<figure\b[^>]*\bid="([^"]+)"[^>]*\bdata-figure="([^"]+)"/g)].map(([, id, n]) => [id, n]));
    figureRows(dir).forEach((f) => assert.equal(f.number, numbered[f.id], `${dir}: figure ${f.id} is numbered ${String(f.number)} in the table and ${String(numbered[f.id])} in the text`));
  });
});
