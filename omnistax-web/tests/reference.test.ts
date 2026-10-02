import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, KIND_LABEL, chapterTerms, referenceRows } from '../src/lib/sections/reference';
import type { ConceptDTO, VariableDTO } from '../src/lib/content/schema';
import { conceptId, sectionId, spanId } from '../src/lib/types/ids';

const concept = (id: string, kind: ConceptDTO['kind'], section: string, more: Partial<ConceptDTO> = {}): ConceptDTO =>
  ({ status: 'built', id: conceptId(id), kind, section: sectionId(section), name: id, terms: [], forms: [], prereqs: [], statement: `${id} stated`, ...more } as ConceptDTO);
const v = (sym: string, c: string, section: string, unit: string): VariableDTO => ({ sym, concept: conceptId(c), meaning: sym, unit, section: sectionId(section) });
const CONCEPTS = [
  concept('kinematics', 'idea', '2.1'),
  concept('displacement', 'definition', '2.1', { symbol: 'Δx' }),
  concept('position', 'definition', '2.1', { symbol: 'x', terms: ['position'] }),
  concept('waves', 'idea', '16.9', { status: 'placeholder' } as Partial<ConceptDTO>),
];
const COVERAGE = [
  { span: spanId('2.1-position'), introduces: [conceptId('position')], uses: [], reinforces: [] },
  { span: spanId('2.1-displacement'), introduces: [conceptId('displacement')], uses: [conceptId('kinematics')], reinforces: [] },
];
const VARIABLES = [v('x', 'position', '2.5', 'km'), v('x', 'position', '2.1', 'm'), v('x0', 'position', '2.1', 's'), v('Δx', 'displacement', '2.1', 'm')];

test('every built concept is a row, in the order the text introduces them, the rest after', () => {
  assert.deepEqual(referenceRows(CONCEPTS, COVERAGE, VARIABLES).map((r) => r.concept.id), ['position', 'displacement', 'kinematics']);
});
test('a row carries the unit of the concept’s own symbol, as its own section gives it', () => {
  const rows = referenceRows(CONCEPTS, COVERAGE, VARIABLES);
  assert.deepEqual(rows.map((r) => r.unit), ['m', 'm', '']);
});
test('every kind is tagged, a definition too', () => {
  assert.deepEqual(KINDS.map((k) => KIND_LABEL[k]), ['Definition', 'Axiom', 'Result', 'Idea', 'Skill']);
});
test('a chapter marks the words of the concepts it introduces or deals with', () => {
  const far = concept('force', 'definition', '4.2', { terms: ['force'] });
  const near = concept('speed', 'definition', '2.3', { terms: ['speed', 'Speed'] });
  assert.deepEqual(chapterTerms([...CONCEPTS, far, near], new Set(['2.1', '2.3']), new Set()), ['position', 'speed', 'Speed']);
  assert.deepEqual(chapterTerms([far], new Set(['2.1']), new Set(['force'])), ['force']);
});
