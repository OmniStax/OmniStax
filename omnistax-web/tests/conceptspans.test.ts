import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptSchema } from '../src/lib/content/schema';
import { conceptSpanIds, conceptTypes, typeConceptSpans } from '../src/lib/content/conceptspans';
import { typesWorn } from '../src/lib/content/load';

const concept = (id: string, name: string, type?: string) =>
  ConceptSchema.parse({ id, kind: 'definition', section: '5.1', name, ...(type ? { type } : {}) });
const CONCEPTS = [concept('friction', 'Friction', 'force'), concept('model', 'Model'), concept('work', 'Work', 'energy')];
const TYPES = conceptTypes(CONCEPTS);
const typed = (html: string): string => typeConceptSpans(TYPES, html);

test('a concept span takes its typed concept\'s type, and an untyped concept\'s stays ink', () => {
  assert.equal(typed('<p>the <span data-concept="friction">friction</span> grows</p>'), '<p>the <span data-concept="friction" data-type="force">friction</span> grows</p>');
  assert.equal(typed('<p>a <span data-concept="model">model</span></p>'), '<p>a <span data-concept="model">model</span></p>');
  assert.equal(typed('<p><span data-concept="nothing">x</span></p>'), '<p><span data-concept="nothing">x</span></p>');
});
test('a concept span that carries a type keeps it, and typing twice changes nothing', () => {
  assert.equal(typed('<span data-type="energy" data-concept="friction">heat</span>'), '<span data-type="energy" data-concept="friction">heat</span>');
  const once = typed('<span class="k" data-concept="work">work</span> and <span data-concept="friction">friction</span>');
  assert.equal(typed(once), once);
  assert.equal(once, '<span class="k" data-concept="work" data-type="energy">work</span> and <span data-concept="friction" data-type="force">friction</span>');
});
test('the types a page wears count its concept spans', () => {
  assert.deepEqual(typesWorn([], [], typed('<p>the <span data-concept="work">work</span> done</p>')), ['energy']);
});
test('the ids a page\'s concept spans name, each once', () => {
  assert.deepEqual(conceptSpanIds('<span data-concept="a">x</span><span data-concept="b">y</span><span data-concept="a">z</span>'), ['a', 'b']);
});
