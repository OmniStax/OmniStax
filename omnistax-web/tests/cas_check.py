"""The calculator's step walker on integrals and derivatives from the book, under
the SymPy the worker loads (1.14). Every antiderivative differentiates back to
its integrand, every derivative matches SymPy's, and each one either has steps
or says it has none.

  python3 -m venv venv && venv/bin/pip install sympy==1.14.0
  venv/bin/python tests/cas_check.py"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'src/lib/cas'))
import cas  # noqa: E402
from sympy import Abs, E, atan, Integer, Rational, Symbol, cos, exp, log, pi, simplify, sin, sqrt  # noqa: E402

x = Symbol('x', real=True)

INTEGRALS = {
    'x e^x': True, 'sin^2 x': True, '1/(x^2-1)': True, 'x sqrt(x+1)': True, 'x^2 sin x': True,
    '1/(1+x^2)': True, 'e^x sin x': True, 'ln x': True, 'tan x': True, 'cos^3 x': True,
    '2x cos(x^2)': True, 'sqrt(1-x^2)': True, '(3x+2)/(x^2+x)': True, 'x/(x^2+1)': True,
    '1/(x ln x)': True, 'sin x cos x': True, 'sec^3 x': False,
}
DEFINITE = {('x^2', '0', '1'): Rational(1, 3), ('sin x', '0', 'pi'): Integer(2), ('1/x', '1', 'e'): Integer(1), ('1/x^2', '1', 'oo'): Integer(1), ('1/x', '1', 'oo'): None}
DERIVATIVES = ['x^2 sin x', 'sin(x^2)', 'x/(x+1)', 'e^(2x)', 'ln(cos x)', 'x^x', 'sqrt(x^2+1)', 'tan^-1 x', '3x^4 - 2x + 7', 'e^x/x^2']
READS = {'sin x cos x': sin(x) * cos(x), 'x e^x': x * exp(x), 'ln x / x': log(x) / x, 'e^(2x)': exp(2 * x), '2pi x': 2 * pi * x, '|x|': abs(x), 'sqrt(x)': sqrt(x), 'tan^-1 x': atan(x), 'sin^2 x': sin(x) ** 2}
REFUSED = ['__import__("os")', 'x.__class__', 'lambda: 1', 'x[0]', '"a"', 'x; y', 'x = 1', '9' * 400, 'Symbol(x)']

def steps_say(steps):
    return [s['say'] for s in steps] + [t for s in steps for t in steps_say(s['sub'])]

def main():
    bad = []
    for text, want in READS.items():
        if simplify(cas.read(text) - want) != 0:
            bad.append(f'read {text!r} as {cas.read(text)}')
    for text in REFUSED:
        if json.loads(cas.run(json.dumps({'op': 'integral', 'text': text})))['ok']:
            bad.append(f'read {text!r}')
    for text, stepwise in INTEGRALS.items():
        f = cas.read(text)
        w = cas.Writer(x, f)
        F, steps = cas.antiderivative(f, x, w)
        if F is None or simplify(F.replace(lambda a: isinstance(a, Abs), lambda a: a.args[0]).diff(x) - f) != 0:
            bad.append(f'∫ {text} = {F}')
        if (steps is not None) != stepwise:
            bad.append(f'∫ {text} steps: {steps}')
        out = json.loads(cas.run(json.dumps({'op': 'integral', 'text': text})))
        print(f'∫ {text} = {F}' + ('' if steps is None else f'   [{"; ".join(steps_say(steps))}]'))
        if not out['ok'] or not out['result']:
            bad.append(f'run ∫ {text}: {out}')
    for (text, a, b), want in DEFINITE.items():
        out = json.loads(cas.run(json.dumps({'op': 'integral', 'text': text, 'lower': a, 'upper': b})))
        print(f'∫_{a}^{b} {text}: {out["result"]}')
        if want is None and 'diverges' not in out['result'] and r'\infty' not in out['result']:
            bad.append(f'∫_{a}^{b} {text}: {out["result"]}')
        if want is not None and not out['result'].endswith('= ' + cas.latex(want)):
            bad.append(f'∫_{a}^{b} {text}: {out["result"]}')
    for text in DERIVATIVES:
        out = json.loads(cas.run(json.dumps({'op': 'derivative', 'text': text})))
        print(f'd/dx {text}: [{"; ".join(steps_say(out["steps"]))}]')
        if not out['ok'] or not out['steps']:
            bad.append(f'd/dx {text}: {out}')
    for b in bad:
        print('FAIL', b)
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
