import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { wrapTerms, wrapExampleRefs, exampleIds } from '../src/lib/hover/terms';
import { definitionCard, variableCard, equationCard, referenceCard, conceptCard, normTex, matchEquation, firstSentence, type Nav } from '../src/lib/hover/resolve';
import { conceptOfTerm, formById, statedOf } from '../src/lib/sections/reference';
import type { ConceptDTO, FormDTO, VariableDTO } from '../src/lib/content/schema';
import type { SectionId, SpanId } from '../src/lib/types/ids';
import { conceptId, equationId, sectionId, spanId, typeId } from '../src/lib/types/ids';
import { symKey, symbolTarget } from '../src/lib/hover/data';
import { PHYSICS, bookRoot } from './book-on-disk';

/* The fixtures below are pages of College Physics 2e, so they are read from that book by its id rather than from whichever book the environment puts first. */
const ROOT = await bookRoot(PHYSICS);

const sec = (s: string) => s as SectionId;
const span = (s: string) => s as SpanId;
const calls: string[] = [];
const nav: Nav = { goSpan: (id) => calls.push(`span:${id}`), openSection: (s) => calls.push(`sec:${s}`), showView: (v) => calls.push(`view:${v}`), openExternal: (s) => calls.push(`ext:${s}`), showElement: (sym) => calls.push(`el:${sym}`) };
const run = (label: string, card: { actions: readonly { label: string; run: () => void }[] }) => { calls.length = 0; card.actions.find((a) => a.label === label)?.run(); return calls.join(','); };

/* ---------- terms ---------- */
const TERMS = ['restoring force', 'force constant', 'period'];
const T = (term: string, text = term) => `<span class="term" data-term="${term}" tabindex="0">${text}</span>`;
test('every mention is marked, plain or emphasised, whole words, case-insensitive', () => {
  const out = wrapTerms('<p>The Period is long. The period is short. Periodic is not it. A <em>period</em> again.</p>', TERMS);
  assert.equal(out, `<p>The ${T('period', 'Period')} is long. The ${T('period')} is short. Periodic is not it. A <em>${T('period')}</em> again.</p>`);
});
test('marking twice changes nothing', () => {
  const once = wrapTerms('<p>a restoring force and a period, then the period</p>', TERMS);
  assert.equal(wrapTerms(once, TERMS), once);
});
test('nothing is marked in headings, links, math, captions or exercise hosts', () => {
  const html = ['<h2>The period</h2>', '<p><a href="#x">period</a></p>', '<p><span class="katex"><span class="katex-html">period</span></span></p>',
    '<figure><div class="sim-head"><span>period</span></div></figure>', '<div class="exercises"><p>period</p></div>', '<div>period outside a paragraph</div>', '<li>the period at last</li>'].join('');
  assert.equal(wrapTerms(html, TERMS), html.replace('<li>the period at last</li>', '<li>the <span class="term" data-term="period" tabindex="0">period</span> at last</li>'));
});
test('a multi-word term matches across a line break', () => {
  assert.match(wrapTerms('<p>the force\nconstant k</p>', TERMS), /<span class="term" data-term="force constant" tabindex="0">force\nconstant<\/span>/);
});
test('a shorter term never matches inside the span of a longer one, whichever the glossary lists first', () => {
  const want = `<p>an ${T('alkaline earth metal')} and a ${T('metal')}, another ${T('alkaline earth metal')}</p>`;
  assert.equal(wrapTerms('<p>an alkaline earth metal and a metal, another alkaline earth metal</p>', ['alkaline earth metal', 'metal']), want);
  assert.equal(wrapTerms('<p>an alkaline earth metal and a metal, another alkaline earth metal</p>', ['metal', 'alkaline earth metal']), want);
});
test('a term inside or beside an authored type or referent span is marked and the markup stays whole', () => {
  assert.equal(wrapTerms('<p>the <span data-type="force">restoring force</span> on <span data-ref="block-1">the block</span></p>', TERMS),
    `<p>the <span data-type="force">${T('restoring force')}</span> on <span data-ref="block-1">the block</span></p>`);
  assert.equal(wrapTerms('<p>a restoring <span data-type="force">force</span></p>', TERMS), '<p>a restoring <span data-type="force">force</span></p>');
});
test('example references become links only when the example is in the article', () => {
  const html = '<div class="example" id="16.1-ex-car"><h3>Example 16.1 · Cars</h3><p>See Example 16.2.</p></div><p>As in Example 16.1 and Example 16.2.</p>';
  const ids = exampleIds(html);
  assert.deepEqual([...ids], [['16.1', '16.1-ex-car']]);
  assert.equal(wrapExampleRefs(html, ids), '<div class="example" id="16.1-ex-car"><h3>Example 16.1 · Cars</h3><p>See Example 16.2.</p></div><p>As in <a class="xref" href="#16.1-ex-car" data-xref="16.1">Example 16.1</a> and Example 16.2.</p>');
});
test('the real sections never mark a term inside a heading or inside another term', () => {
  const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'book.json'), 'utf8')) as { concepts: { section: string; terms?: string[] }[] };
  for (const ch of ['ch02', 'ch16']) {
    const terms = book.concepts.filter((c) => c.section.split('.')[0] === ch.slice(2).replace(/^0/, '')).flatMap((c) => c.terms ?? []);
    /* a section folder that holds only a source.md is one being built, and has no article to check yet */
    for (const dir of fs.readdirSync(path.join(ROOT, ch)).filter((d) => /^\d+\.\d+$/.test(d) && fs.existsSync(path.join(ROOT, ch, d, 'text.html')))) {
      const out = wrapTerms(fs.readFileSync(path.join(ROOT, ch, dir, 'text.html'), 'utf8'), terms);
      assert.ok(!/<span class="term"[^>]*>[^<]*<span class="term"/.test(out), `${ch}/${dir}: a term inside a term`);
      assert.ok(!/<h[23][^>]*>[^<]*<span class="term"/.test(out), `${ch}/${dir}: a term in a heading`);
    }
  }
});

/* ---------- variable ---------- */
const vars: readonly VariableDTO[] = [{ sym: 'k', type: typeId('stiffness'), meaning: 'force constant, the stiffness of the system', unit: 'N/m', section: sectionId('16.1'), anchor: spanId('16.1-hookes-law') }];
test('a symbol whose row names no concept carries its type and unit, its meaning here and the span that introduces it, and no definition', () => {
  const c = variableCard({ sym: 'k', tex: '\\kk', typeLabel: 'Stiffness', variable: vars[0], section: sec('16.1'), formulasLoaded: true }, nav);
  assert.equal(c.kind, 'variable'); assert.equal(c.tex, '\\kk'); assert.equal(c.eyebrow, 'Symbol · Stiffness · N/m');
  assert.equal(c.body, 'Force constant, the stiffness of the system.');
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to where it is introduced']);
  assert.equal(run('Go to where it is introduced', c), 'span:16.1-hookes-law');
  const unanchored = variableCard({ sym: 'N', tex: 'N', variable: { sym: 'N', meaning: 'number of molecules', unit: '', section: sectionId('13.3') }, section: sec('13.3'), formulasLoaded: true }, nav);
  assert.equal(unanchored.eyebrow, 'Symbol'); assert.equal(unanchored.body, 'Number of molecules.');
  assert.deepEqual(unanchored.actions.map((a) => a.label), ['Go to section']); assert.equal(run('Go to section', unanchored), 'sec:13.3');
});
test('a hovered symbol opens the concept its row names, and a row that names none opens as itself', () => {
  const rows: readonly VariableDTO[] = [
    { sym: 'k', concept: conceptId('hookes-law'), meaning: 'force constant', unit: 'N/m', section: sectionId('16.1') },
    { sym: 'N', meaning: 'number of coils', unit: '', section: sectionId('16.1') },
    { sym: 'm', concept: conceptId('mass'), meaning: 'mass', unit: 'kg', section: sectionId('16.1') },
  ];
  const conceptOf = (id: string): ConceptDTO | undefined => (id === 'hookes-law' ? hookeLaw : undefined);
  const linked = symbolTarget(rows, symKey('k'), '16.1', conceptOf);
  assert.equal(linked.kind, 'concept'); assert.equal(linked.kind === 'concept' && linked.concept.id, 'hookes-law');
  assert.deepEqual(symbolTarget(rows, symKey('N'), '16.1', conceptOf), { kind: 'row', variable: rows[1] });
  assert.deepEqual(symbolTarget(rows, symKey('m'), '16.1', conceptOf), { kind: 'row', variable: rows[2] }, 'a concept the book has not loaded leaves the row');
  assert.deepEqual(symbolTarget(rows, symKey('q'), '16.1', conceptOf), { kind: 'row', variable: undefined });
});
test('a variable in a section whose sheet is not loaded says where it is defined', () => {
  const c = variableCard({ sym: 'k', tex: '\\kk', section: sec('16.1'), formulasLoaded: false }, nav);
  assert.equal(c.body, 'Defined in 16.1.'); assert.equal(run('Go to section', c), 'sec:16.1');
});
test('an unknown symbol gets a card with no body and no actions', () => {
  const c = variableCard({ sym: 'q', tex: 'q', section: sec('16.1'), formulasLoaded: true }, nav);
  assert.equal(c.body, undefined); assert.deepEqual(c.actions, []);
});

/* ---------- equation ---------- */
const hookeForm: FormDTO = { id: equationId('eq-hooke'), section: sectionId('16.1'), tex: '\\kF = -\\kk\\kx', latex: 'F = -kx', anchor: spanId('16.1-hookes-law') };
const vForm: FormDTO = { id: equationId('eq-v'), section: sectionId('2.5'), tex: '\\kv = \\kvo + \\ka\\kt', latex: 'v = v_0 + at', anchor: spanId('2.5-final-velocity') };
const hookeLaw: ConceptDTO = { status: 'built', id: conceptId('hookes-law'), kind: 'result', section: sectionId('16.1'), name: 'Hooke’s law', terms: [], forms: [hookeForm], prereqs: [], statement: 'The simplest oscillations occur when the restoring force is proportional to the displacement.' };
const vFromAt: ConceptDTO = { status: 'built', id: conceptId('v-from-at'), kind: 'result', section: sectionId('2.5'), name: 'Final velocity', terms: [], forms: [vForm], prereqs: [], statement: 'the final velocity depends on the acceleration and the time' };
const stated = statedOf([hookeLaw, vFromAt]);
test('tex normalisation ignores spacing, closing punctuation and the constant-a qualifier', () => {
  assert.equal(normTex('\\kF = -\\kk\\kx.'), normTex('\\kF=-\\kk\\kx'));
  assert.equal(normTex('\\kv = \\kvo + \\ka\\kt\\;(\\text{constant }\\ka).'), normTex('\\kv = \\kvo + \\ka\\kt'));
  assert.equal(matchEquation('\\kF = -\\kk\\kx.', stated)?.form.id, 'eq-hooke');
  assert.equal(matchEquation('\\kv = \\kvo + \\ka\\kt\\;(\\text{constant }\\ka).', stated)?.concept.id, 'v-from-at');
  assert.equal(matchEquation('\\kv = \\kvo + \\ka\\kt = 70.0', stated), undefined);
  assert.equal(matchEquation('   ', stated), undefined);
});
test('an equation card names the concept and goes to where it is introduced', () => {
  const c = equationCard({ form: hookeForm, concept: hookeLaw, introducedIn: 'Hooke’s Law' }, nav);
  assert.equal(c.eyebrow, 'Formula · Result'); assert.equal(c.title, hookeLaw.name); assert.equal(c.body, hookeLaw.statement);
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to where it is introduced', 'Show in Reference']);
  assert.equal(run('Go to where it is introduced', c), 'span:16.1-hookes-law'); assert.equal(run('Show in Reference', c), 'view:reference');
  const bare = equationCard({ form: { ...vForm, anchor: undefined }, concept: { ...vFromAt, statement: undefined }, introducedIn: 'Solving for Final Velocity' }, nav);
  assert.equal(bare.body, 'Introduced in “Solving for Final Velocity”.'); assert.equal(run('Go to section', bare), 'sec:2.5');
});
test('an equation with a condition says what it holds under', () => {
  const c = equationCard({ form: { ...vForm, condition: 'constant acceleration' }, concept: vFromAt }, nav);
  assert.equal(c.body, 'The final velocity depends on the acceleration and the time.');
  assert.deepEqual(c.notes, [{ label: 'Holds under', text: 'Constant acceleration.' }]);
});
test('a form is found by its id with the concept it states, and a glossary word by the concept it names, near ones first', () => {
  assert.equal(formById([hookeLaw, vFromAt], 'eq-v')?.concept.id, 'v-from-at');
  assert.equal(formById([hookeLaw], 'eq-v'), undefined);
  const power = (id: string, section: string): ConceptDTO => ({ status: 'built', id: conceptId(id), kind: 'definition', section: sectionId(section), name: id, terms: ['power'], forms: [], prereqs: [] });
  const both = [power('power', '7.7'), power('power-of-a-lens', '25.6')];
  assert.equal(conceptOfTerm(both, 'Power')?.id, 'power');
  assert.equal(conceptOfTerm(both, 'power', (c) => c.section.startsWith('25.'))?.id, 'power-of-a-lens');
  assert.equal(conceptOfTerm(both, 'period'), undefined);
});

/* ---------- definition ---------- */
const dxForm: FormDTO = { id: equationId('eq-dx'), section: sectionId('2.1'), tex: '\\kdx = \\kxf - \\kxo', latex: '\\Delta x = x_f - x_0', anchor: spanId('2.1-displacement') };
const displacement: ConceptDTO = { status: 'built', id: conceptId('displacement'), kind: 'definition', section: sectionId('2.1'), name: 'Displacement', symbol: 'Δx', terms: ['displacement'], forms: [dxForm], prereqs: [], statement: 'displacement is the change in position' };
test('a definition card names the concept and its symbol, states it and lists its forms', () => {
  const c = definitionCard({ concept: displacement, tex: '\\kdx', unit: 'm', intro: span('2.1-displacement') }, nav);
  assert.equal(c.kind, 'definition'); assert.equal(c.eyebrow, 'Definition'); assert.equal(c.unit, 'm'); assert.equal(c.title, 'Displacement · $\\kdx$');
  assert.equal(c.body, 'Displacement is the change in position.'); assert.equal(c.notes, undefined);
  assert.deepEqual(c.refs?.map((g) => [g.label, g.links.map((l) => l.label)]), [['Formula', ['$\\kdx = \\kxf - \\kxo$']]]);
  calls.length = 0; c.refs?.[0]?.links[0]?.run(); assert.equal(calls.join(','), 'span:2.1-displacement');
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to where it is first introduced', 'Show in Reference']);
  assert.equal(run('Go to where it is first introduced', c), 'span:2.1-displacement');
});
test('a definition card gives the meaning here and elsewhere where the chapter redefines the symbol, and falls back to the section', () => {
  const other: VariableDTO = { sym: 'R', meaning: 'range of the projectile', unit: 'm', section: sectionId('3.4') };
  const c = definitionCard({ concept: { ...displacement, forms: [], statement: undefined }, tex: 'R', meaning: 'resultant of two vectors', elsewhere: other }, nav);
  assert.equal(c.title, 'Displacement · $R$'); assert.equal(c.body, undefined);
  assert.deepEqual(c.notes, [{ label: 'In this section', text: 'Resultant of two vectors.' }, { label: 'Elsewhere in this chapter (3.4)', text: 'Range of the projectile.' }]);
  assert.deepEqual(c.refs, []); assert.equal(run('Go to where it is first introduced', c), 'sec:2.1');
  assert.equal(definitionCard({ concept: { ...displacement, kind: 'axiom' } }, nav).eyebrow, 'Axiom');
});
test('a reference card and the first sentence', () => {
  assert.equal(firstSentence('The spring of a toy gun is pushed in. Then it is released.'), 'The spring of a toy gun is pushed in.');
  assert.equal(firstSentence('Values of 3.5 m/s are typical. More follows.'), 'Values of 3.5 m/s are typical.');
  const c = referenceCard({ id: span('16.1-ex-car'), title: 'How Stiff Are Car Springs?', body: 'What is the force constant?' }, nav);
  assert.equal(run('Go', c), 'span:16.1-ex-car');
});

/* ---------- concept ---------- */
const hooke: ConceptDTO = { status: 'built', id: conceptId('hookes-law'), kind: 'result', section: sectionId('16.1'), name: 'Hooke’s law', terms: [], forms: [], prereqs: [], statement: 'the restoring force is proportional to the displacement' };
const place = (id: string, title: string) => ({ id: span(id), title });
const refOf = (card: { refs?: readonly { label: string; links: readonly { label: string }[]; more?: { label: string } }[] }, label: string) => card.refs?.find((g) => g.label === label);
const runRef = (card: { refs?: readonly { label: string; links: readonly { label: string; run: () => void }[]; more?: { label: string; run: () => void } }[] }, group: string, link: string) => {
  calls.length = 0; const g = card.refs?.find((x) => x.label === group); (link === 'more' ? g?.more : g?.links.find((l) => l.label === link))?.run(); return calls.join(',');
};

test('a concept card gives its statement, then where the text introduces and uses it', () => {
  const c = conceptCard({
    concept: { ...hooke, forms: [hookeForm] },
    intro: [place('16.1-hookes-law', 'Hooke’s Law')],
    uses: [place('16.1-energy', 'Energy in a Spring'), place('16.2-period', 'Period and Frequency')],
    built: true, onMap: false,
  }, nav);
  assert.equal(c.kind, 'concept'); assert.equal(c.eyebrow, 'Result · section 16.1'); assert.equal(c.title, hooke.name);
  assert.equal(c.body, 'The restoring force is proportional to the displacement.');
  assert.deepEqual(c.refs?.map((g) => g.label), ['Introduced in', 'Used in']);
  assert.deepEqual(refOf(c, 'Introduced in')?.links.map((l) => l.label), ['Hooke’s Law']);
  assert.deepEqual(refOf(c, 'Used in')?.links.map((l) => l.label), ['Energy in a Spring', 'Period and Frequency']);
  assert.equal(refOf(c, 'Used in')?.more, undefined);
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to definition', 'Show in Reference', 'Show in Concept map']);
  assert.equal(run('Go to definition', c), 'span:16.1-hookes-law'); assert.equal(run('Show in Reference', c), 'view:reference'); assert.equal(run('Show in Concept map', c), 'view:concepts');
});
test('a card opened on the map itself does not offer the map', () => {
  const c = conceptCard({ concept: hooke, intro: [place('16.1-hookes-law', 'Hooke’s Law')], uses: [], built: true, onMap: true }, nav);
  assert.deepEqual(c.actions.map((a) => a.label), ['Go to definition', 'Show in Reference']);
  const off = conceptCard({ concept: hooke, intro: [place('16.1-hookes-law', 'Hooke’s Law')], uses: [], built: true, onMap: false }, nav);
  assert.deepEqual(off.actions.map((a) => a.label), ['Go to definition', 'Show in Reference', 'Show in Concept map']);
});
test('long use lists are cut short and the rest stand behind one trailing action', () => {
  const wide = conceptCard({
    concept: hooke, intro: [],
    uses: Array.from({ length: 6 }, (_, i) => place(`16.1-part-${i + 1}`, `Part ${i + 1}`)),
    built: true, onMap: false,
  }, nav);
  const u = refOf(wide, 'Used in');
  assert.deepEqual(u?.links.map((l) => l.label), ['Part 1', 'Part 2', 'Part 3', 'Part 4']);
  assert.equal(u?.more?.label, 'and 2 more'); assert.equal(runRef(wide, 'Used in', 'more'), 'sec:16.1');
});
test('a concept the text neither introduces nor uses has no places, and no statement leaves no body', () => {
  const c = conceptCard({ concept: { ...hooke, statement: undefined }, intro: [], uses: [], built: true, onMap: false }, nav);
  assert.equal(c.body, undefined); assert.deepEqual(c.refs, []);
  assert.equal(run('Go to definition', c), 'sec:16.1');
});
test('a placeholder concept says its section is not built and offers the page it can reach', () => {
  const ph: ConceptDTO = { status: 'placeholder', id: conceptId('newtons-laws'), kind: 'idea', section: sectionId('4.3'), name: 'Newton’s second law', terms: [], forms: [], prereqs: [] };
  const facts = { concept: ph, intro: [], uses: [], onMap: false };
  const out = conceptCard({ ...facts, built: false }, nav);
  assert.equal(out.body, 'Section 4.3 is not built yet.'); assert.equal(out.refs, undefined); assert.deepEqual(out.actions.map((a) => a.label), ['Open in OpenStax']);
  assert.equal(run('Open in OpenStax', out), 'ext:4.3');
  const here = conceptCard({ ...facts, built: true }, nav);
  assert.deepEqual(here.actions.map((a) => a.label), ['Go to section']); assert.equal(run('Go to section', here), 'sec:4.3');
});
