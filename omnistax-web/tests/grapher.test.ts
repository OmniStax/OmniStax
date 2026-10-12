import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, functionNames, parse, readRow, toTex, freeLetters, curveFn, type Env } from '../src/lib/grapher/expr';
import { traceCurve, integrate, breakFns, zerosOf } from '../src/lib/grapher/plot';

const at = (src: string, x: number, vars: Record<string, number> = {}): number => compile(parse(src))({ vars: { x, ...vars }, fns: {} });
const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

test('the book’s notation: implicit products, powers, bare function arguments', () => {
  close(at('2x^2', 3), 18);
  close(at('-x^2', 3), -9);
  close(at('3x^2+2x-1', 2), 15);
  close(at('(x-4)^2+5', 1), 14);
  close(at('sin 2x', 0.3), Math.sin(0.6));
  close(at('sin^2 x + cos^2 x', 1.234), 1);
  close(at('sin x cos x', 0.5), Math.sin(0.5) * Math.cos(0.5));
  close(at('2pix', 1), 2 * Math.PI);
  close(at('e^x', 1), Math.E);
  close(at('e^{2x}', 1), Math.E ** 2);
  close(at('ln x', Math.E), 1);
  close(at('log 100', 0), 2);
  close(at('log_2 8', 0), 3);
  close(at('sqrt(3x+2)-1', 2), Math.sqrt(8) - 1);
  close(at('√x', 4), 2);
  close(at('|x-1|', -2), 3);
  close(at('2|x|-|x-1|', -1), 0);
  close(at('3/(x-2)', 5), 1);
  close(at('x^(1/3)', -8), -2);
  close(at('2^-x', 1), 0.5);
  close(at('a x^2 + b', 2, { a: 3, b: 1 }), 13);
  close(at('arctan(1)', 0), Math.PI / 4);
});

test('a piecewise function takes the first case that holds', () => {
  close(at('{x>=2: 3x+1, x^2}', 5), 16);
  close(at('{x>=2: 3x+1, x^2}', -1), 1);
  assert.ok(Number.isNaN(at('{0<=x<1: x}', 2)));
});

test('rows: curves, named functions, constants, equations', () => {
  assert.equal(readRow('x^2').kind, 'curve');
  assert.equal(readRow('y = sin x').kind, 'curve');
  assert.equal(readRow('a = 2').kind, 'constant');
  assert.equal(readRow('x^2 + y^2 = 1').kind, 'equation');
  assert.equal(readRow('x = 3').kind, 'equation');
  assert.equal(readRow('x^2 +').kind, 'error');
  assert.equal(readRow('y < x').kind, 'error');
  const rows = ['f(x) = x^2', "y = f'(x) + f(2)"];
  const fns = functionNames(rows);
  const f = readRow(rows[0], fns), g = readRow(rows[1], fns);
  assert.ok(f.kind === 'curve' && f.name === 'f' && g.kind === 'curve');
  const env: Env = { vars: {}, fns: {} };
  if (f.kind === 'curve') env.fns.f = curveFn(f, env);
  if (g.kind === 'curve') close(curveFn(g, env)(3), 10, 1e-5);
  assert.deepEqual(freeLetters(readRow('y = a x^2 + b x + c'), new Set(['b'])), ['a', 'c']);
});

test('TeX for the preview', () => {
  assert.equal(toTex(parse('3/(x-2)')), '\\frac{3}{x-2}');
  assert.equal(toTex(parse('sin^2 x')), '\\sin^{2} x');
  assert.equal(toTex(parse('2x^2')), '2{x}^{2}');
  assert.equal(toTex(parse('|x|')), '\\left|x\\right|');
});

const win = { x0: -5, x1: 5, y0: -5, y1: 5 };
const curve = (src: string) => { const r = readRow(src); assert.ok(r.kind === 'curve'); const env: Env = { vars: {}, fns: {} }; return traceCurve(curveFn(r, env), breakFns(r.node, r.arg, env), win, 400); };

test('a pole is never bridged', () => {
  const t = curve('1/x');
  assert.equal(t.pieces.length, 2);
  assert.ok(t.pieces[0].every(([x]) => x < 0) && t.pieces[1].every(([x]) => x > 0));
  assert.equal(t.marks.length, 0);
});
test('a hole is an open circle where the limit is', () => {
  const t = curve('(x^2-1)/(x-1)');
  assert.equal(t.marks.length, 1); close(t.marks[0].x, 1, 1e-9); close(t.marks[0].y, 2, 1e-4); assert.ok(t.marks[0].open);
  const s = curve('sin(x)/x');
  assert.equal(s.marks.length, 1); close(s.marks[0].y, 1, 1e-4);
});
test('a jump has one end filled and one open', () => {
  const t = curve('{x>=2: 3x+1, x^2}');
  const ends = t.marks.filter((m) => Math.abs(m.x - 2) < 1e-9);
  assert.equal(ends.length, 2);
  assert.deepEqual(ends.map((m) => [Number(m.y.toFixed(3)), m.open]).sort(), [[4, true], [7, false]]);
});
test('tan breaks at every odd multiple of π/2 in view', () => {
  const t = curve('tan x');
  assert.equal(t.pieces.length, 5);
  assert.equal(zerosOf(Math.cos, -5, 5, 400).length, 4);
});
test('Simpson’s rule', () => {
  close(integrate((x) => x * x, 0, 3), 9, 1e-9);
  assert.ok(Number.isNaN(integrate((x) => 1 / x, -1, 1, 2000)));
});
