/* The derivation widget's model: every fact and every result is met once, so a start line that
   restates a fact is that fact, and one that restates an earlier result starts from it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { model } from '../src/lib/fig/derivation';
import type { DerivationDTO } from '../src/lib/content/schema';

const node = (assumes: object[], then: object, steps: object[]) => ({ assumes, then: { uses: [], ...then }, steps: steps.map((s) => ({ uses: [], ...s })) });
const D = (nodes: object[]) => ({ id: 'd', what: 'it', nodes }) as unknown as DerivationDTO;

test('a start line that restates a fact, keyed and with its sides swapped, is that fact', () => {
  const m = model(D([
    node([{ tex: '\\kE=h\\knu', src: '1.2' }], { tex: '\\mk{L}{h\\knu} = \\mk{E}{\\kE}', uses: [0] }, [{ tex: '\\mk{L}{h\\knu} = \\mk{E}{\\kp c}', uses: [] }]),
  ]));
  assert.equal(m.facts.length, 1, 'one card, not two');
  assert.equal(m.nodes[0]!.thenFact, 0);
  assert.deepEqual(m.holds[0], [], 'the line is not read out as its own condition');
});

test('keys nested in keys and grouping braces do not make a restated fact a second one', () => {
  const m = model(D([
    node([{ tex: '\\kE=\\sqrt{\\kp^2 c^2+\\km^2 c^4}' }], { tex: '\\mk{E}{\\kE} = \\mk{R}{\\sqrt{\\mk{p}{\\kp^2 c^2}+\\mk{m}{\\km^2 c^4}}}', uses: [0] }, [{ tex: '\\mk{E}{\\kE} = \\mk{R}{\\kp c}' }]),
  ]));
  assert.equal(m.facts.length, 1);
});

test('a start line that is one link of an earlier result\'s chain starts from that result', () => {
  const m = model(D([
    node([{ tex: 'a = b' }], { tex: '\\mk{x}{x} = \\mk{y}{y}' }, [{ tex: '\\mk{x}{x} = \\mk{m}{z} = \\mk{y}{w}', uses: [0] }]),
    node([{ step: 0 }], { tex: '\\mk{m}{z} = \\mk{y}{w}', uses: [0] }, [{ tex: '\\mk{m}{z} = \\mk{y}{2w}' }]),
  ]));
  assert.equal(m.thenFrom[1], 0);
  assert.equal(m.facts.length, 2, 'the fact and the first start line; the second start line is no card of its own');
  assert.deepEqual(m.holds[1], []);
});

test('different equations stay different facts', () => {
  const m = model(D([node([{ tex: '\\frac{a}{bc} = 1' }, { tex: '\\frac{ab}{c} = 1' }], { tex: 'y = 2' }, [{ tex: 'y = 3', uses: [0, 1] }])]));
  assert.equal(m.facts.length, 3);
});

test('a worked example\'s eyebrow keeps every part of its number, a letter after the last digit included', () => {
  const one = node([], { tex: 'y = 2' }, [{ tex: 'y = 3' }]);
  const of = (source: string): string => model({ ...D([one]), source } as DerivationDTO).label;
  assert.equal(of('Book, 7.4 Perturbation Theory, Example 7.4.1B'), 'Example 7.4.1B');
  assert.equal(of('Book, 4.3 Observables, Example 4.3.1; first worked in 3.7, Example 3.7.3'), 'Example 4.3.1');
  assert.equal(of('Book, Appendix, Example A.1.2'), 'Example A.1.2');
});
