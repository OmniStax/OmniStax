import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitionRows, formulaLabel, wordOf, type ConceptTables } from '../src/lib/sections/conceptlists';
import type { ConceptDTO, EquationDTO, GlossaryDTO, VariableDTO } from '../src/lib/content/schema';
import { conceptId, equationId, sectionId, spanId, type SectionId } from '../src/lib/types/ids';

const concept = (id: string, kind: ConceptDTO['kind'], section: string, name: string): ConceptDTO =>
  ({ status: 'built', id: conceptId(id), kind, section: sectionId(section), name, prereqs: [], statement: `${name} stated` });
const v = (sym: string, c: string | undefined, section: string, meaning: string, anchor?: string): VariableDTO =>
  ({ sym, concept: c ? conceptId(c) : undefined, meaning, unit: 'm', section: sectionId(section), anchor: anchor ? spanId(anchor) : undefined });
const g = (term: string, c: string | undefined, section: string): GlossaryDTO => ({ term, concept: c ? conceptId(c) : undefined, definition: `${term} defined`, section: sectionId(section) });
const eq = (id: string, c: string, section: string, important = true): EquationDTO => ({ id: equationId(id), concept: conceptId(c), section: sectionId(section), tex: id, latex: id, important });

const tables: ConceptTables = {
  concepts: [
    concept('position', 'definition', '2.1', 'Position'),
    concept('displacement', 'definition', '2.1', 'Displacement, $\\kdx = \\kxf - \\kxo$'),
    concept('elapsed-time', 'definition', '2.3', 'Elapsed time'),
    concept('kinematics', 'definition', '2.1', 'Kinematics'),
    concept('newton-second', 'axiom', '4.3', 'Newton’s second law, $\\kF = \\km\\ka$'),
    concept('frame', 'definition', '2.1', 'Reference frame'),
  ],
  coverage: [
    { span: spanId('2.1-intro'), introduces: [conceptId('kinematics')], uses: [], reinforces: [] },
    { span: spanId('2.1-position'), introduces: [conceptId('position'), conceptId('frame')], uses: [], reinforces: [] },
    { span: spanId('2.1-displacement'), introduces: [conceptId('displacement')], uses: [], reinforces: [] },
    { span: spanId('2.3-time'), introduces: [conceptId('elapsed-time')], uses: [], reinforces: [] },
    { span: spanId('2.5-notation'), introduces: [], uses: [], reinforces: [] },
  ],
  variables: [
    v('x', 'position', '2.1', 'position', '2.1-position'),
    v('x0', 'position', '2.1', 'initial position', '2.1-displacement'),
    v('Δx', 'displacement', '2.1', 'displacement', '2.1-displacement'),
    v('t', 'elapsed-time', '2.3', 'elapsed time', '2.3-time'),
    v('t', 'elapsed-time', '2.5', 'elapsed time from zero', '2.5-notation'),
    v('q', undefined, '2.1', 'a stray symbol', '2.1-intro'),
  ],
  equations: [eq('eq-dx', 'displacement', '2.1'), eq('eq-dx-step', 'displacement', '2.1', false), eq('eq-f', 'newton-second', '4.3')],
  glossary: [g('kinematics', 'kinematics', '2.1'), g('displacement', 'displacement', '2.1'), g('Newton’s second law', 'newton-second', '4.3'), g('stray word', undefined, '2.1')],
};
const all = (_: SectionId) => true;

test('one row per concept, in the order the book introduces them, with lone words and symbols as rows of their own', () => {
  const rows = definitionRows(tables, all);
  assert.deepEqual(rows.map((r) => r.key), ['kinematics', 'sym:q@2.1', 'position', 'frame', 'displacement', 'elapsed-time', 'newton-second', 'term:stray word@2.1']);
  const pos = rows.find((r) => r.key === 'position')!;
  assert.deepEqual(pos.symbols.map((s) => s.sym), ['x', 'x0']); assert.equal(pos.unit, 'm');
  const dx = rows.find((r) => r.key === 'displacement')!;
  assert.deepEqual(dx.formulas.map((e) => e.id), ['eq-dx']); assert.deepEqual(dx.words.map((w) => w.term), ['displacement']);
  assert.deepEqual(rows.find((r) => r.key === 'newton-second')!.formulas, []);
});
test('a definition stands in the section read when its own section is outside, with the symbol meaning it has there', () => {
  const rows = definitionRows(tables, (s) => s === '2.5', sectionId('2.5'));
  const t = rows.find((r) => r.key === 'elapsed-time')!;
  assert.equal(t.section, '2.5'); assert.equal(t.symbols[0].meaning, 'elapsed time from zero');
  assert.equal(rows.find((r) => r.key === 'position')!.section, '2.1');
});
test('a formula reads as the concept it states, a definition as the symbol it defines', () => {
  const byId = new Map(tables.concepts.map((c) => [c.id as string, c]));
  assert.deepEqual(formulaLabel(tables.equations[0], byId, () => '\\kdx'), { kind: 'defines', tex: '\\kdx', word: 'Displacement' });
  assert.deepEqual(formulaLabel(tables.equations[2], byId, () => undefined), { kind: 'states', tag: 'Axiom', word: 'Newton’s second law' });
  assert.deepEqual(formulaLabel({ ...tables.equations[0], concept: undefined }, byId, () => undefined), { kind: 'none' });
  assert.equal(wordOf('$\\kv = \\kvo + \\ka\\kt$'), '');
});
