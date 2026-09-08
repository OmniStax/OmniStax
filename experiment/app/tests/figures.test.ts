import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { linkFigureRefs, figureIds, figureNumber, qualifyIds } from '../src/lib/content/fragment';
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
