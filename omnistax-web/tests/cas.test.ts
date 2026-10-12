/* The calculator's page side: a step's sentence split into text and formulas, the grapher's address, and the expression an address carries. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exprOf, graphHref, pieces } from '../src/lib/cas/client';

test('a step reads as text and formulas in turn', () => {
  assert.deepEqual(pieces('Substitute $u = x^{2}$, so $du = 2 x\\,dx$'), [
    { tex: false, s: 'Substitute ' }, { tex: true, s: 'u = x^{2}' }, { tex: false, s: ', so ' }, { tex: true, s: 'du = 2 x\\,dx' },
  ]);
  assert.deepEqual(pieces('Simplify'), [{ tex: false, s: 'Simplify' }]);
  assert.deepEqual(pieces('$x$'), [{ tex: true, s: 'x' }]);
});

test('the grapher gets one expr per expression, and an address gives back the first', () => {
  const href = graphHref('/calculus/sheets/grapher/', ['x*e^(x)', '(x - 1)*e^(x)']);
  assert.equal(href, '/calculus/sheets/grapher/?expr=x*e%5E%28x%29&expr=%28x+-+1%29*e%5E%28x%29');
  const q = new URL(href, 'https://omnistax.test').searchParams;
  assert.deepEqual(q.getAll('expr'), ['x*e^(x)', '(x - 1)*e^(x)']);
  assert.equal(exprOf('?expr=1%2B1%2Fx&expr=x'), '1+1/x');
  assert.equal(exprOf('?expr=x+sin+x'), 'x sin x');
  assert.equal(exprOf(''), null);
});
