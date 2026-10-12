"""The calculator's engine: read what the reader typed, integrate or differentiate
it, and write the working down as steps. It runs in Pyodide inside the sheet's
worker and under plain CPython for the check in tests/cas_check.py.

A step is {"say": str, "math": str, "sub": [step]}: "say" is one short sentence
with its formulas between $ signs, "math" one displayed equation, and "sub" the
steps that work out a part of it. Every answer is one dict, serialised by
`run`, so the worker passes a string and nothing else across."""
import dataclasses
import json
import keyword
import re
import tokenize
from io import StringIO

from sympy import (
    Abs, Add, Derivative, Dummy, E, Expr, Function, Integer, Integral, Float, Mul, Piecewise, Pow, Rational,
    Symbol, acos, acot, acsc, apart, asec, asin, asinh, acosh, atanh, atan, cos, cosh, cot, coth, csc, csch,
    exp, expand, latex, log, nan, oo, pi, sec, sech, simplify, sin, sinh, sqrt, tan, tanh, zoo, count_ops,
)
from sympy.integrals.manualintegrate import (
    AlternativeRule, AddRule, ConstantRule, ConstantTimesRule, CyclicPartsRule, DontKnowRule, PartsRule,
    PowerRule, NestedPowRule, RewriteRule, Rule, TrigSubstitutionRule, URule, integral_steps,
)
from sympy.parsing.sympy_parser import (
    convert_xor, implicit_multiplication_application, parse_expr, rationalize, standard_transformations,
)

# ---------- reading the input ----------

FUNCTIONS = {
    'sin': sin, 'cos': cos, 'tan': tan, 'sec': sec, 'csc': csc, 'cot': cot,
    'arcsin': asin, 'arccos': acos, 'arctan': atan, 'arcsec': asec, 'arccsc': acsc, 'arccot': acot,
    'asin': asin, 'acos': acos, 'atan': atan,
    'sinh': sinh, 'cosh': cosh, 'tanh': tanh, 'sech': sech, 'csch': csch, 'coth': coth,
    'arcsinh': asinh, 'arccosh': acosh, 'arctanh': atanh,
    'ln': log, 'log': lambda a: log(a, 10), 'exp': exp, 'sqrt': sqrt, 'abs': Abs,
}
CONSTANTS = {'e': E, 'pi': pi, 'oo': oo, 'inf': oo, 'infinity': oo}
TRANSFORMS = standard_transformations + (convert_xor, rationalize, implicit_multiplication_application)
OPS = {'+', '-', '*', '/', '^', '**', '(', ')', ','}
MAX_LEN = 300
# All parse_expr's generated code calls; the reader may not name them.
SCOPE = {'Symbol': Symbol, 'Integer': Integer, 'Float': Float, 'Rational': Rational, 'Function': Function}

class Unread(ValueError):
    pass

FN = '|'.join(sorted(FUNCTIONS, key=len, reverse=True))
# "sin x cos x" is two factors, as the book writes it: a function name followed
# by a space takes one bare argument, a coefficient and a letter and its power.
BARE = re.compile(r'\b(' + FN + r')(\^\s*-?\d+)?\s+(\d*\.?\d*(?:pi|[a-zA-Z])(?![a-zA-Z(])(?:\^(?:\d+|[a-zA-Z]|\([^()]*\)))?)')

def tidy(text):
    t = text.replace('−', '-').replace('·', '*').replace('×', '*').replace('π', 'pi').replace('√', 'sqrt')
    t = re.sub(r'\|([^|]*)\|', r'abs(\1)', t)
    t = re.sub(r'\b(sin|cos|tan|sec|csc|cot)(h?)\s*\^\s*(?:\(\s*-\s*1\s*\)|-\s*1)', r'arc\1\2', t)
    return BARE.sub(lambda m: f'{m.group(1)}{m.group(2) or ""}({m.group(3)})', t)

def check_tokens(text):
    """Only numbers, letters and arithmetic reach parse_expr, which evaluates the
    code it builds: no attribute, no subscript, no string, no keyword, and no
    builtins in the namespace it runs under."""
    try:
        tokens = list(tokenize.generate_tokens(StringIO(text).readline))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        raise Unread('Unbalanced brackets.')
    for tok in tokens:
        if tok.type in (tokenize.NEWLINE, tokenize.NL, tokenize.ENDMARKER):
            continue
        if tok.type == tokenize.NUMBER and not re.search(r'[jJ]', tok.string):
            continue
        if tok.type == tokenize.NAME and re.fullmatch(r'[A-Za-z]+', tok.string) and not keyword.iskeyword(tok.string) and tok.string not in SCOPE:
            continue
        if tok.type == tokenize.OP and tok.string in OPS:
            continue
        raise Unread(f'Cannot read “{tok.string}”.')

def read(text):
    if not text.strip():
        raise Unread('Nothing to read.')
    if len(text) > MAX_LEN:
        raise Unread('Too long.')
    t = tidy(text)
    check_tokens(t)
    names = {**FUNCTIONS, **CONSTANTS}
    try:
        e = parse_expr(t, local_dict=names, global_dict={'__builtins__': {}, **SCOPE}, transformations=TRANSFORMS)
    except Exception:
        raise Unread('Cannot read this expression.')
    if not isinstance(e, Expr):
        raise Unread('Cannot read this expression.')
    e = e.subs({s: E for s in e.free_symbols if s.name == 'e'})
    return e.subs({s: Symbol(s.name, real=True) for s in e.free_symbols})

def variable_of(*es):
    names = sorted({s.name for e in es for s in e.free_symbols})
    for v in ('x', 't', 'u', 'theta', 'y'):
        if v in names:
            return Symbol(v, real=True)
    return Symbol(names[0], real=True) if names else Symbol('x', real=True)

# ---------- writing it down ----------

# sin x, ln x and sin^2 x without brackets where the argument is one letter, as the book prints them.
BARE_TEX = re.compile(r'(\\(?:operatorname\{[a-z]+\}|[a-z]+)(?:\^\{[^{}]*\})?)\{\\left\(([a-zA-Z]|\d+|\\theta) \\right\)\}')

# ln|u| rather than ln(|u|), innermost first.
LN_ABS = re.compile(r'\\ln\{\\left\(\\left\|\{((?:(?!\\ln\{\\left\(\\left\|).)*?)\}\\right\| \\right\)\}')

class Writer:
    """Names the dummies the integrator makes (u, then v, w, ...) and sets every
    expression in the book's notation: ln, sin^{-1}, and ln|u| where the
    argument may be negative."""
    POOL = ('u', 'v', 'w', 's', 'z')

    def __init__(self, x, *es):
        self.x = x
        self.taken = {s.name for e in es for s in e.free_symbols}
        self.names = {}

    def name(self, d):
        if d not in self.names:
            want = 'theta' if 'theta' in d.name else next(n for n in self.POOL if n not in self.taken)
            self.taken.add(want)
            self.names[d] = Symbol(want, real=True)
        return self.names[d]

    def plain(self, e):
        return e.xreplace({d: self.name(d) for d in e.atoms(Dummy)})

    def tex(self, e):
        t = BARE_TEX.sub(r'\1 \2', latex(self.plain(e), ln_notation=True, inv_trig_style='power'))
        while True:
            t, n = LN_ABS.subn(r'\\ln\\left|\1\\right|', t)
            if not n:
                return t

    def d(self, v):
        return r'\,d' + self.tex(v)

    def dform(self, c, v):
        """c dv, written dv when c is 1."""
        return ('d' if c == 1 else self.paren_sum(c) + r'\,d') + self.tex(v)

    def integral(self, f, v):
        return r'\int ' + self.paren_sum(f) + self.d(v)

    def paren_sum(self, f):
        return r'\left(' + self.tex(f) + r'\right)' if isinstance(f, Add) else self.tex(f)

def step(say, math='', sub=()):
    return {'say': say, 'math': math, 'sub': [s for s in sub if s]}

def flat(steps):
    """A step whose working is one step reads as two in a row, not one inside the other."""
    out = []
    for s in steps:
        if len(s['sub']) == 1:
            out += [{**s, 'sub': []}] + flat(s['sub'])
        else:
            out.append({**s, 'sub': flat(s['sub'])})
    return out

def absolute(e):
    """ln u becomes ln|u| unless u cannot be negative."""
    return e.replace(lambda a: isinstance(a, log) and a.args[0].is_nonnegative is not True, lambda a: log(Abs(a.args[0])))

def one_piece(e):
    return e.replace(lambda a: isinstance(a, Piecewise), lambda a: a.args[0][0])

# ---------- integrals ----------

def rule_size(r):
    if isinstance(r, Rule):
        return 1 + sum(rule_size(getattr(r, f.name)) for f in dataclasses.fields(r))
    if isinstance(r, list):
        return sum(rule_size(x) for x in r)
    return 0

def prune(r):
    """Each AlternativeRule becomes the shortest of its alternatives that works."""
    if isinstance(r, list):
        return [prune(x) for x in r]
    if not isinstance(r, Rule):
        return r
    if isinstance(r, AlternativeRule):
        known = [a for a in r.alternatives if not a.contains_dont_know()] or r.alternatives
        return prune(min(known, key=rule_size))
    return dataclasses.replace(r, **{f.name: prune(getattr(r, f.name)) for f in dataclasses.fields(r) if isinstance(getattr(r, f.name), (Rule, list))})

def value(r):
    return absolute(one_piece(r.eval()))

def rewrite_say(r, w):
    f, g, v = r.integrand, r.rewritten, r.variable
    if f.is_rational_function(v) and not f.is_polynomial(v) and expand(g - apart(f, v)) == 0:
        return 'Decompose into partial fractions'
    if f.has(sin, cos, tan, sec, csc, cot) and not expand(f - g) == 0:
        return 'Use a trigonometric identity'
    if expand(f) == g:
        return 'Expand the integrand'
    return 'Rewrite the integrand'

def walk(r, w):
    f, v = r.integrand, r.variable
    whole = lambda: w.integral(f, v) + ' = ' + w.tex(value(r))
    if isinstance(r, ConstantRule):
        return step('Integrate the constant', whole())
    if isinstance(r, ConstantTimesRule):
        if r.constant == -1:
            return step('Take the minus sign out', w.integral(f, v) + r' = -' + w.integral(r.other, v), [walk(r.substep, w)])
        return step(f'Take the constant ${w.tex(r.constant)}$ out', w.integral(f, v) + ' = ' + w.paren_sum(r.constant) + w.integral(r.other, v), [walk(r.substep, w)])
    if isinstance(r, (PowerRule, NestedPowRule)):
        return step('Apply the power rule', whole())
    if isinstance(r, AddRule):
        return step('Integrate term by term', w.integral(f, v) + ' = ' + ' + '.join(w.integral(s.integrand, v) for s in r.substeps).replace('+ \\int -', '- \\int '), [walk(s, w) for s in r.substeps])
    if isinstance(r, URule):
        u = w.name(r.u_var) if isinstance(r.u_var, Dummy) else r.u_var
        du = r.u_func.diff(v)
        return step(
            f'Substitute ${w.tex(u)} = {w.tex(r.u_func)}$, so $d{w.tex(u)} = {w.dform(du, v)}$',
            w.integral(f, v) + ' = ' + w.integral(r.substep.integrand, r.u_var),
            [walk(r.substep, w), step(f'Substitute back ${w.tex(u)} = {w.tex(r.u_func)}$', w.integral(f, v) + ' = ' + w.tex(value(r)))])
    if isinstance(r, PartsRule):
        vv = r.v_step.eval()
        rest = (vv * r.u.diff(v))
        return step(
            f'Integrate by parts with $u = {w.tex(r.u)}$ and $dv = {w.dform(r.dv, v)}$, so $du = {w.dform(r.u.diff(v), v)}$ and $v = {w.tex(vv)}$',
            w.integral(f, v) + ' = ' + w.tex(r.u * vv) + ' - ' + w.integral(rest, v),
            [walk(r.second_step, w)] if r.second_step else [])
    if isinstance(r, CyclicPartsRule):
        subs, sign, terms = [], 1, []
        for p in r.parts_rules:
            vv = p.v_step.eval()
            terms.append(sign * p.u * vv)
            subs.append(step(f'Integrate by parts with $u = {w.tex(p.u)}$ and $dv = {w.dform(p.dv, v)}$',
                             w.integral(p.u * p.dv, v) + ' = ' + w.tex(p.u * vv) + ' - ' + w.integral(vv * p.u.diff(v), v)))
            sign = -sign
        c = abs(r.coefficient)
        loop = w.integral(f, v) + ' = ' + w.tex(Add(*terms)) + (' + ' if r.coefficient > 0 else ' - ') + ('' if c == 1 else w.paren_sum(c)) + w.integral(f, v)
        subs.append(step(f'The integral returns; solve for ${w.integral(f, v)}$', loop + r' \quad\Rightarrow\quad ' + whole()))
        return step('Integrate by parts twice', '', subs)
    if isinstance(r, RewriteRule):
        return step(rewrite_say(r, w), w.tex(f) + ' = ' + w.tex(r.rewritten), [walk(r.substep, w)])
    if isinstance(r, TrigSubstitutionRule):
        th = w.name(r.theta) if isinstance(r.theta, Dummy) else r.theta
        return step(
            f'Substitute ${w.tex(v)} = {w.tex(r.func)}$',
            w.integral(f, v) + ' = ' + w.integral(r.rewritten, r.theta),
            [walk(r.substep, w), step(f'Substitute back ${w.tex(th)}$ in terms of ${w.tex(v)}$', w.integral(f, v) + ' = ' + w.tex(value(r)))])
    sub = getattr(r, 'substep', None)
    if isinstance(sub, Rule):
        return step('Rewrite the integrand', w.tex(f) + ' = ' + w.tex(sub.integrand), [walk(sub, w)])
    return step('Use the table of integrals', whole())

def partial_fractions(f, x):
    """A rational integrand is split into partial fractions first, as the book
    does, rather than by whatever route the integrator would take."""
    if not f.is_rational_function(x) or f.is_polynomial(x):
        return None
    g = apart(f, x)
    return g if len(Add.make_args(g)) > 1 else None

def antiderivative(f, x, w):
    """The antiderivative and the steps to it, or the antiderivative alone where
    the step-by-step integrator gives up; nothing where neither finds one."""
    g = partial_fractions(f, x)
    try:
        r = prune(integral_steps(g if g is not None else f, x))
    except Exception:
        r = None
    if r is not None and not r.contains_dont_know():
        F = value(r)
        steps = [walk(r, w)]
        if g is not None:
            steps = [step('Decompose into partial fractions', w.tex(f) + ' = ' + w.tex(g), steps)]
        tidy_ = simplify(F)
        if count_ops(tidy_) < count_ops(F) and tidy_ != F:
            steps.append(step('Simplify', w.tex(F) + ' = ' + w.tex(tidy_)))
            F = tidy_
        return F, flat(steps)
    from sympy import integrate
    F = integrate(f, x)
    if F.has(Integral):
        return None, []
    return absolute(one_piece(F)), None

def integral(text, lower='', upper=''):
    f = read(text)
    a, b = (read(lower), read(upper)) if lower.strip() and upper.strip() else (None, None)
    x = variable_of(f)
    w = Writer(x, f, *(e for e in (a, b) if e is not None))
    F, steps = antiderivative(f, x, w)
    head = (r'\int_{' + w.tex(a) + '}^{' + w.tex(b) + '} ' if a is not None else r'\int ') + w.paren_sum(f) + w.d(x)
    out = {'ok': True, 'op': 'integral', 'input': head, 'variable': x.name, 'graph': [plain(f)]}
    if F is None and a is None:
        return {**out, 'result': None, 'steps': None}
    if F is not None:
        out['graph'].append(plain(F))
    if a is None:
        return {**out, 'result': head + ' = ' + w.tex(F) + ' + C', 'steps': steps}
    from sympy import integrate
    val = integrate(f, (x, a, b))
    if val.has(Integral):
        return {**out, 'result': None, 'steps': steps}
    diverges = val in (oo, -oo, zoo, nan) or val.has(oo, -oo, zoo, nan)
    result = head + (r'\ \text{diverges}' if diverges else ' = ' + w.tex(simplify(val)))
    if steps is not None and F is not None and not diverges:
        steps = steps + [step('Evaluate between the limits', r'\Big[' + w.tex(F) + r'\Big]_{' + w.tex(a) + '}^{' + w.tex(b) + '} = ' + w.tex(simplify(val)))]
    return {**out, 'result': result, 'steps': steps}

# ---------- derivatives ----------

def dx(x):
    return r'\frac{d}{d' + latex(x) + '}'

class Diff:
    """The derivative walked by the rules the book teaches: constants, sums,
    constant multiples, products, quotients, powers and the chain rule through
    the known functions."""

    def __init__(self, x, w):
        self.x, self.w = x, w

    def tex(self, e):
        return self.w.tex(e)

    def p(self, e):
        s = self.tex(e)
        return r'\left(' + s + r'\right)' if isinstance(e, Add) or e.could_extract_minus_sign() else s

    def of(self, e):
        return dx(self.x) + r'\left[' + self.tex(e) + r'\right]'

    def eq(self, e, rhs):
        return self.of(e) + ' = ' + rhs

    def walk(self, e):
        x = self.x
        d = e.diff(x)
        if not e.has(x):
            return step('The derivative of a constant is zero', self.eq(e, '0'))
        if e == x:
            return None
        if isinstance(e, Add):
            terms = [t for t in Add.make_args(e) if t.has(x)]
            return step('Differentiate term by term', self.eq(e, ' + '.join(self.of(t) for t in terms)), [self.walk(t) for t in terms])
        if isinstance(e, Mul):
            c, rest = e.as_independent(x, as_Add=False)
            if c != 1:
                return step(f'Take the constant ${self.tex(c)}$ out', self.eq(e, self.p(c) + self.of(rest)), [self.walk(rest)])
            num, den = [], []
            for fac in Mul.make_args(e):
                b, n = fac.as_base_exp()
                (den if n.is_number and n.is_negative and b.has(x) and b.func is not exp and b != E else num).append(fac)
            if den:
                top, bot = Mul(*num), 1 / Mul(*den)
                rhs = r'\frac{' + self.p(top.diff(x)) + r'\cdot ' + self.p(bot) + ' - ' + self.p(top) + r'\cdot ' + self.p(bot.diff(x)) + '}{' + self.p(bot) + '^{2}}'
                return step('Apply the quotient rule', self.eq(e, rhs), [self.walk(top), self.walk(bot)])
            f, g = Mul.make_args(e)[0], Mul(*Mul.make_args(e)[1:])
            rhs = self.p(f.diff(x)) + r'\cdot ' + self.p(g) + ' + ' + self.p(f) + r'\cdot ' + self.p(g.diff(x))
            return step('Apply the product rule', self.eq(e, rhs), [self.walk(f), self.walk(g)])
        if isinstance(e, Pow) or e.func is exp:
            b, n = (E, e.args[0]) if e.func is exp else e.args
            if not n.has(x):
                if b == x:
                    return step('Apply the power rule', self.eq(e, self.tex(d)))
                return step(f'Apply the chain rule with $u = {self.tex(b)}$', self.eq(e, self.p(n * b ** (n - 1)) + r'\cdot ' + self.of(b)), [self.walk(b)])
            if not b.has(x):
                outer = b ** n * (1 if b == E else log(b))
                if n == x:
                    return step('Use the derivative of an exponential', self.eq(e, self.tex(d)))
                return step(f'Apply the chain rule with $u = {self.tex(n)}$', self.eq(e, self.p(outer) + r'\cdot ' + self.of(n)), [self.walk(n)])
            inner = n * log(b)
            return step('Differentiate through the logarithm', self.eq(e, self.p(e) + r'\cdot ' + self.of(inner)), [self.walk(inner)])
        if isinstance(e, Function) and len(e.args) == 1:
            g = e.args[0]
            u = Dummy('u')
            outer = e.func(u).diff(u)
            if g == x:
                return step('Use the known derivative', self.eq(e, self.tex(d)))
            return step(f'Apply the chain rule with $u = {self.tex(g)}$', self.eq(e, self.p(outer.subs(u, g)) + r'\cdot ' + self.of(g)), [self.walk(g)])
        return step('Differentiate', self.eq(e, self.tex(d)))

def derivative(text):
    e = read(text)
    x = variable_of(e)
    w = Writer(x, e)
    D = e.diff(x)
    steps = [Diff(x, w).walk(e)]
    tidy_ = simplify(D)
    if count_ops(tidy_) < count_ops(D) and tidy_ != D:
        steps.append(step('Simplify', w.tex(D) + ' = ' + w.tex(tidy_)))
        D = tidy_
    head = dx(x) + r'\left[' + w.tex(e) + r'\right]'
    return {'ok': True, 'op': 'derivative', 'input': head, 'variable': x.name, 'result': head + ' = ' + w.tex(D), 'steps': flat([s for s in steps if s]), 'graph': [plain(e), plain(D)]}

# ---------- the worker's entry ----------

def plain(e):
    """An expression in the notation the input takes, for the grapher's address."""
    s = str(e.xreplace({d: Symbol(d.name) for d in e.atoms(Dummy)}))
    s = s.replace('**', '^').replace('exp(', 'e^(').replace('log(', 'ln(').replace('Abs(', 'abs(')
    return re.sub(r'\ba(sin|cos|tan|sec|csc|cot)h?\(', lambda m: 'arc' + m.group(0)[1:], s)

def preview(text, op='integral', lower='', upper=''):
    f = read(text)
    x = variable_of(f)
    w = Writer(x, f)
    if op == 'derivative':
        return {'ok': True, 'input': dx(x) + r'\left[' + w.tex(f) + r'\right]'}
    a, b = (read(lower), read(upper)) if lower.strip() and upper.strip() else (None, None)
    return {'ok': True, 'input': (r'\int_{' + w.tex(a) + '}^{' + w.tex(b) + '} ' if a is not None else r'\int ') + w.paren_sum(f) + w.d(x)}

def run(request):
    q = json.loads(request)
    try:
        op = q.get('op')
        if q.get('preview'):
            out = preview(q['text'], op, q.get('lower', ''), q.get('upper', ''))
        elif op == 'derivative':
            out = derivative(q['text'])
        else:
            out = integral(q['text'], q.get('lower', ''), q.get('upper', ''))
    except Unread as ex:
        out = {'ok': False, 'error': str(ex)}
    except Exception:
        out = {'ok': False, 'error': 'Could not work this out.'}
    return json.dumps(out)
