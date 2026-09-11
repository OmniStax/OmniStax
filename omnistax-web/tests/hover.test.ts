import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { wrapTerms, wrapEmTerms, wrapPlainTerms, wrapExampleRefs, exampleIds, IN_BLOCK } from '../src/lib/hover/terms';
import { variableCard, figureCard, termCard, equationCard, referenceCard, conceptCard, introducingSpan, normTex, matchEquation, firstSentence, type Nav } from '../src/lib/hover/resolve';
import type { EquationDTO, VariableDTO } from '../src/lib/content/schema';
import type { ConceptId, SectionId, SpanId } from '../src/lib/types/ids';
import { conceptId, equationId, sectionId, spanId, typeId } from '../src/lib/types/ids';
import { ROOT } from './book-on-disk';

const sec = (s: string) => s as SectionId;
const span = (s: string) => s as SpanId;
const cid = (s: string) => s as ConceptId;
const calls: string[] = [];
const nav: Nav = { goSpan: (id) => calls.push(`span:${id}`), openSection: (s) => calls.push(`sec:${s}`), showView: (v) => calls.push(`view:${v}`), showOriginal: (f) => calls.push(`orig:${f}`), openExternal: (s) => calls.push(`ext:${s}`), showExercises: (s, c) => calls.push(`exs:${s}/${c}`) };
const run = (label: string, card: { actions: readonly { label: string; run: () => void }[] }) => { calls.length = 0; card.actions.find((a) => a.label === label)?.run(); return calls.join(','); };

/* ---------- terms ---------- */
const TERMS = ['restoring force', 'force constant', 'period'];
test('the emphasised mention of a term wins over an earlier plain one', () => {
  const html = '<p>A restoring force pulls back. We call this the <em>restoring force</em>.</p>';
  const out = wrapTerms(html, TERMS);
  assert.equal(out, '<p>A restoring force pulls back. We call this the <span class="term" data-term="restoring force" tabindex="0"><em>restoring force</em></span>.</p>');
});
test('only the first plain mention is marked, whole words, case-insensitive', () => {
  const out = wrapTerms('<p>The Period is long. The period is short. Periodic is not it.</p>', TERMS);
  assert.equal(out, '<p>The <span class="term" data-term="period" tabindex="0">Period</span> is long. The period is short. Periodic is not it.</p>');
});
test('nothing is marked in headings, links, math, captions or exercise hosts', () => {
  const html = ['<h2>The period</h2>', '<p><a href="#x">period</a></p>', '<p><span class="katex"><span class="katex-html">period</span></span></p>',
    '<figure><div class="demo-head"><span>period</span></div></figure>', '<div class="exercises"><p>period</p></div>', '<div>period outside a paragraph</div>', '<li>the period at last</li>'].join('');
  assert.equal(wrapTerms(html, TERMS), html.replace('<li>the period at last</li>', '<li>the <span class="term" data-term="period" tabindex="0">period</span> at last</li>'));
});
test('a multi-word term matches across a line break', () => {
  assert.match(wrapTerms('<p>the force\nconstant k</p>', TERMS), /<span class="term" data-term="force constant" tabindex="0">force\nconstant<\/span>/);
});
test('the passes thread the done set across blocks', () => {
  const em = wrapEmTerms('a <em>period</em> here', TERMS, new Set(), IN_BLOCK);
  assert.deepEqual([...em.done], ['period']);
  const plain = wrapPlainTerms('the period again', TERMS, em.done, IN_BLOCK);
  assert.equal(plain.html, 'the period again');
});
test('example references become links only when the example is in the article', () => {
  const html = '<div class="example" id="16.1-ex-car"><h3>Example 16.1 · Cars</h3><p>See Example 16.2.</p></div><p>As in Example 16.1 and Example 16.2.</p>';
  const ids = exampleIds(html);
  assert.deepEqual([...ids], [['16.1', '16.1-ex-car']]);
  assert.equal(wrapExampleRefs(html, ids), '<div class="example" id="16.1-ex-car"><h3>Example 16.1 · Cars</h3><p>See Example 16.2.</p></div><p>As in <a class="xref" href="#16.1-ex-car" data-xref="16.1">Example 16.1</a> and Example 16.2.</p>');
});
test('the real sections wrap each glossary term at most once and never inside a heading', () => {
  for (const ch of ['ch02', 'ch16']) {
    const f = JSON.parse(fs.readFileSync(path.join(ROOT, ch, 'chapter.json'), 'utf8')) as { glossary: { term: string }[] };
    const terms = f.glossary.map((g) => g.term);
    /* a section folder that holds only a source.md is one being built, and has no article to check yet */
    for (const dir of fs.readdirSync(path.join(ROOT, ch)).filter((d) => /^\d+\.\d+$/.test(d) && fs.existsSync(path.join(ROOT, ch, d, 'text.html')))) {
      const out = wrapTerms(fs.readFileSync(path.join(ROOT, ch, dir, 'text.html'), 'utf8'), terms);
      for (const t of terms) assert.ok((out.match(new RegExp(`data-term="${t}"`, 'g')) ?? []).length <= 1, `${ch}/${dir}: ${t} marked twice`);
      assert.ok(!/<h[23][^>]*>[^<]*<span class="term"/.test(out), `${ch}/${dir}: a term in a heading`);
    }
  }
});

/* ---------- variable ---------- */
const vars: readonly VariableDTO[] = [{ sym: 'k', type: typeId('stiffness'), meaning: 'force constant, the stiffness of the system', unit: 'N/m', section: sectionId('16.1'), anchor: spanId('16.1-hookes-law') }];
test('a variable card carries the symbol, its type and unit, its meaning and two actions', () => {
  const c = variableCard({ sym: 'k', tex: '\\kk', typeLabel: 'Stiffness', variable: vars[0], section: sec('16.1'), formulasLoaded: true }, nav);
  assert.equal(c.kind, 'variable'); assert.equal(c.tex, '\\kk'); assert.equal(c.eyebrow, 'Symbol · Stiffness · N/m');
  assert.equal(c.body, 'Force constant, the stiffness of the system.');
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to definition', 'Show in Definitions']);
  assert.equal(run('Go to definition', c), 'span:16.1-hookes-law'); assert.equal(run('Show in Definitions', c), 'view:definitions');
});
test('a variable in a section whose sheet is not loaded says where it is defined', () => {
  const c = variableCard({ sym: 'k', tex: '\\kk', section: sec('16.1'), formulasLoaded: false }, nav);
  assert.equal(c.body, 'Defined in 16.1.'); assert.equal(run('Go to section', c), 'sec:16.1');
});
test('an unknown symbol gets a card with no body and no actions', () => {
  const c = variableCard({ sym: 'q', tex: 'q', section: sec('16.1'), formulasLoaded: true }, nav);
  assert.equal(c.body, undefined); assert.deepEqual(c.actions, []);
});

/* ---------- figure ---------- */
test('a figure card from the reference attributes', () => {
  const c = figureCard({ number: '16.4', id: span('16.1-demo-spring-scale'), section: sec('16.1'), caption: 'Weights are hung on a spring.', hasOriginal: true }, nav);
  assert.equal(c.title, 'Figure 16.4'); assert.equal(c.body, 'Weights are hung on a spring.');
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to figure', 'Show original']);
  assert.equal(run('Go to figure', c), 'span:16.1-demo-spring-scale'); assert.equal(run('Show original', c), 'orig:16.1-demo-spring-scale');
  const far = figureCard({ number: '16.9', id: span('16.3-demo-shm-oscillator'), section: sec('16.3'), hasOriginal: false }, nav);
  assert.equal(far.body, 'Figure 16.9 is in section 16.3.'); assert.deepEqual(far.actions.map((a) => a.label), ['Go to figure']);
});

/* ---------- term ---------- */
test('a term card prefers the span that introduces the concept of the same name', () => {
  const concepts = [{ status: 'built' as const, id: conceptId('force-constant'), kind: 'idea' as const, section: sectionId('16.1'), name: 'Force constant $\\kk$', prereqs: [] }];
  const coverage = [{ span: '16.1-hookes-law', introduces: ['force-constant'], uses: [], reinforces: [] }];
  assert.equal(introducingSpan('force constant', concepts, coverage), '16.1-hookes-law');
  assert.equal(introducingSpan('period', concepts, coverage), undefined);
  const c = termCard({ term: 'force constant', definition: 'a constant related to the rigidity of a system', section: sec('16.1'), anchor: span('16.1-hookes-law') }, nav);
  assert.equal(c.body, 'A constant related to the rigidity of a system.'); assert.equal(run('Go to section', c), 'span:16.1-hookes-law');
  assert.equal(run('Go to section', termCard({ term: 'period', section: sec('16.2') }, nav)), 'sec:16.2');
});

/* ---------- equation ---------- */
const eqs: readonly EquationDTO[] = [
  { id: equationId('eq-hooke'), section: sectionId('16.1'), tex: '\\kF = -\\kk\\kx', anchor: spanId('16.1-hookes-law'), important: true },
  { id: equationId('eq-v'), section: sectionId('2.5'), tex: '\\kv = \\kvo + \\ka\\kt', anchor: spanId('2.5-final-velocity'), important: true },
];
test('tex normalisation ignores spacing, closing punctuation and the constant-a qualifier', () => {
  assert.equal(normTex('\\kF = -\\kk\\kx.'), normTex('\\kF=-\\kk\\kx'));
  assert.equal(normTex('\\kv = \\kvo + \\ka\\kt\\;(\\text{constant }\\ka).'), normTex('\\kv = \\kvo + \\ka\\kt'));
  assert.equal(matchEquation('\\kF = -\\kk\\kx.', eqs)?.id, 'eq-hooke');
  assert.equal(matchEquation('\\kv = \\kvo + \\ka\\kt\\;(\\text{constant }\\ka).', eqs)?.id, 'eq-v');
  assert.equal(matchEquation('\\kv = \\kvo + \\ka\\kt = 70.0', eqs), undefined);
  assert.equal(matchEquation('   ', eqs), undefined);
});
test('an equation card names the concept and goes to where it is introduced', () => {
  const concept = { status: 'built' as const, id: conceptId('hookes-law'), kind: 'result' as const, section: sectionId('16.1'), name: 'Hooke’s law, $\\kF = -\\kk\\kx$', prereqs: [], eq: equationId('eq-hooke'), why: 'The simplest oscillations occur when the restoring force is proportional to the displacement.' };
  const c = equationCard({ equation: eqs[0], concept, introducedIn: 'Hooke’s Law' }, nav);
  assert.equal(c.eyebrow, 'Equation · important'); assert.equal(c.title, concept.name); assert.equal(c.body, concept.why);
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to where it is introduced', 'Show in Formulas']);
  assert.equal(run('Go to where it is introduced', c), 'span:16.1-hookes-law'); assert.equal(run('Show in Formulas', c), 'view:formulas');
  const plain = equationCard({ equation: { ...eqs[1], important: false }, introducedIn: 'Solving for Final Velocity' }, nav);
  assert.equal(plain.eyebrow, 'Equation'); assert.equal(plain.title, 'In “Solving for Final Velocity”'); assert.deepEqual(plain.actions.map((a) => a.label), ['Go to where it is introduced']);
});
test('a reference card and the first sentence', () => {
  assert.equal(firstSentence('The spring of a toy gun is pushed in. Then it is released.'), 'The spring of a toy gun is pushed in.');
  assert.equal(firstSentence('Values of 3.5 m/s are typical. More follows.'), 'Values of 3.5 m/s are typical.');
  const c = referenceCard({ id: span('16.1-ex-car'), title: 'How Stiff Are Car Springs?', body: 'What is the force constant?' }, nav);
  assert.equal(run('Go', c), 'span:16.1-ex-car');
});

/* ---------- concept ---------- */
const hooke = { status: 'built' as const, id: conceptId('hookes-law'), kind: 'result' as const, section: sectionId('16.1'), name: 'Hooke’s law, $\\kF = -\\kk\\kx$', prereqs: [], why: 'the restoring force is proportional to the displacement' };
const place = (id: string, title: string) => ({ id: span(id), title });
const tester = (id: string, label: string) => ({ id: span(id), label });
const refOf = (card: { refs?: readonly { label: string; links: readonly { label: string }[]; more?: { label: string } }[] }, label: string) => card.refs?.find((g) => g.label === label);
const runRef = (card: { refs?: readonly { label: string; links: readonly { label: string; run: () => void }[]; more?: { label: string; run: () => void } }[] }, group: string, link: string) => {
  calls.length = 0; const g = card.refs?.find((x) => x.label === group); (link === 'more' ? g?.more : g?.links.find((l) => l.label === link))?.run(); return calls.join(',');
};

test('a concept card says why it matters, then where the text introduces, uses and tests it', () => {
  const c = conceptCard({
    concept: { ...hooke, eq: equationId('eq-hooke') },
    intro: [place('16.1-hookes-law', 'Hooke’s Law')],
    uses: [place('16.1-energy', 'Energy in a Spring'), place('16.2-period', 'Period and Frequency')],
    tested: [tester('16.1-ex-p3', 'Problem p3'), tester('16.2-ex-cq1', '16.2 · Conceptual question cq1')],
    built: true, onMap: false,
  }, nav);
  assert.equal(c.kind, 'concept'); assert.equal(c.eyebrow, 'Concept · result · section 16.1'); assert.equal(c.title, hooke.name);
  assert.equal(c.body, 'The restoring force is proportional to the displacement.');
  assert.deepEqual(c.refs?.map((g) => g.label), ['Introduced in', 'Used in', 'Tested by']);
  assert.deepEqual(refOf(c, 'Introduced in')?.links.map((l) => l.label), ['Hooke’s Law']);
  assert.deepEqual(refOf(c, 'Used in')?.links.map((l) => l.label), ['Energy in a Spring', 'Period and Frequency']);
  assert.deepEqual(refOf(c, 'Tested by')?.links.map((l) => l.label), ['Problem p3', '16.2 · Conceptual question cq1']);
  assert.equal(refOf(c, 'Used in')?.more, undefined); assert.equal(refOf(c, 'Tested by')?.more, undefined);
  assert.equal(runRef(c, 'Tested by', 'Problem p3'), 'span:16.1-ex-p3');
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to definition', 'Show in Formulas', 'Show in Concept map']);
  assert.equal(run('Go to definition', c), 'span:16.1-hookes-law'); assert.equal(run('Show in Formulas', c), 'view:formulas'); assert.equal(run('Show in Concept map', c), 'view:concepts');
});
test('a card opened on the map itself does not offer the map, and one with no equation does not offer the sheet', () => {
  const c = conceptCard({ concept: hooke, intro: [place('16.1-hookes-law', 'Hooke’s Law')], uses: [], tested: [], built: true, onMap: true }, nav);
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to definition']);
  const off = conceptCard({ concept: hooke, intro: [place('16.1-hookes-law', 'Hooke’s Law')], uses: [], tested: [], built: true, onMap: false }, nav);
  assert.deepEqual(off.actions.map((a) => a.label), ['Go to definition', 'Show in Concept map']);
});
test('long lists are cut short and the rest stand behind one trailing action', () => {
  const many = conceptCard({
    concept: hooke, intro: [], uses: [],
    tested: Array.from({ length: 8 }, (_, i) => tester(`16.1-ex-p${i + 1}`, `Problem p${i + 1}`)),
    built: true, onMap: false,
  }, nav);
  const t = refOf(many, 'Tested by');
  assert.deepEqual(t?.links.map((l) => l.label), ['Problem p1', 'Problem p2', 'Problem p3', 'Problem p4', 'Problem p5', 'Problem p6']);
  assert.equal(t?.more?.label, 'and 2 more'); assert.equal(runRef(many, 'Tested by', 'more'), `exs:${sec('16.1')}/${cid(hooke.id)}`);
  const wide = conceptCard({
    concept: hooke, intro: [], tested: [],
    uses: Array.from({ length: 6 }, (_, i) => place(`16.1-part-${i + 1}`, `Part ${i + 1}`)),
    built: true, onMap: false,
  }, nav);
  const u = refOf(wide, 'Used in');
  assert.deepEqual(u?.links.map((l) => l.label), ['Part 1', 'Part 2', 'Part 3', 'Part 4']);
  assert.equal(u?.more?.label, 'and 2 more'); assert.equal(runRef(wide, 'Used in', 'more'), 'sec:16.1');
});
test('a concept the text neither introduces, uses nor tests has no places, and no why leaves no body', () => {
  const c = conceptCard({ concept: { ...hooke, why: undefined }, intro: [], uses: [], tested: [], built: true, onMap: false }, nav);
  assert.equal(c.body, undefined); assert.deepEqual(c.refs, []);
  assert.equal(run('Go to definition', c), 'sec:16.1');
});
test('a placeholder concept says its section is not built and offers the page it can reach', () => {
  const ph = { status: 'placeholder' as const, id: conceptId('newtons-laws'), kind: 'idea' as const, section: sectionId('4.3'), name: 'Newton’s second law', prereqs: [] };
  const facts = { concept: ph, intro: [], uses: [], tested: [], onMap: false };
  const out = conceptCard({ ...facts, built: false }, nav);
  assert.equal(out.body, 'Section 4.3 is not built yet.'); assert.equal(out.refs, undefined); assert.deepEqual(out.actions.map((a) => a.label), ['Open in OpenStax']);
  assert.equal(run('Open in OpenStax', out), 'ext:4.3');
  const here = conceptCard({ ...facts, built: true }, nav);
  assert.deepEqual(here.actions.map((a) => a.label), ['Go to section']); assert.equal(run('Go to section', here), 'sec:4.3');
});
