import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitionRows, formulaLabel, type ConceptTables } from '../src/lib/sections/conceptlists';
import type { ConceptDTO, FormDTO, VariableDTO } from '../src/lib/content/schema';
import { conceptId, equationId, sectionId, spanId, type SectionId } from '../src/lib/types/ids';

const form = (id: string, section: string): FormDTO => ({ id: equationId(id), section: sectionId(section), tex: id, latex: id });
const concept = (id: string, kind: ConceptDTO['kind'], section: string, name: string, more: Partial<ConceptDTO> = {}): ConceptDTO =>
  ({ status: 'built', id: conceptId(id), kind, section: sectionId(section), name, terms: [], forms: [], prereqs: [], statement: `${name} stated`, ...more } as ConceptDTO);
const v = (sym: string, c: string, section: string, meaning: string): VariableDTO => ({ sym, concept: conceptId(c), meaning, unit: 'm', section: sectionId(section) });

const tables: ConceptTables = {
  concepts: [
    concept('position', 'definition', '2.1', 'Position', { symbol: 'x' }),
    concept('displacement', 'definition', '2.1', 'Displacement', { symbol: 'Δx', terms: ['displacement'], forms: [form('eq-dx', '2.1'), form('eq-dx-step', '2.1')] }),
    concept('kinematics', 'definition', '2.1', 'Kinematics', { terms: ['kinematics'] }),
    concept('newton-second', 'axiom', '4.3', 'Newton’s second law', { forms: [form('eq-f', '4.3')] }),
  ],
  coverage: [
    { span: spanId('2.1-intro'), introduces: [conceptId('kinematics')], uses: [], reinforces: [] },
    { span: spanId('2.1-position'), introduces: [conceptId('position')], uses: [], reinforces: [] },
    { span: spanId('2.1-displacement'), introduces: [conceptId('displacement')], uses: [], reinforces: [] },
  ],
  variables: [v('x', 'position', '2.1', 'position'), v('x0', 'position', '2.1', 'initial position'), v('Δx', 'displacement', '2.1', 'displacement')],
};
const all = (_: SectionId) => true;

test('one row per concept with a symbol or a word, in the order the book introduces them', () => {
  const rows = definitionRows(tables, all);
  assert.deepEqual(rows.map((r) => r.key), ['kinematics', 'position', 'displacement']);
  assert.deepEqual(rows.find((r) => r.key === 'position')!.symbols.map((s) => s.sym), ['x']);
  assert.deepEqual(rows.find((r) => r.key === 'displacement')!.formulas.map((e) => e.id), ['eq-dx']);
});
test('a formula reads as the concept it states, a definition as the symbol it defines', () => {
  assert.deepEqual(formulaLabel(tables.concepts[1], () => '\\kdx'), { kind: 'defines', tex: '\\kdx', word: 'Displacement' });
  assert.deepEqual(formulaLabel(tables.concepts[3], () => undefined), { kind: 'states', tag: 'Axiom', word: 'Newton’s second law' });
});
