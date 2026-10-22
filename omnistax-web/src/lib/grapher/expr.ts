/* The grapher's expressions: what a reader types into a row, read as the book
   writes a function (2x, x^2, sin 2x, ln x, |x|, sqrt(x), e^x, pi), parsed to
   a tree, compiled to a function of the variables, and set back as TeX for the
   row's preview. A row is then read as what it draws: a curve y = f(x), a named
   function f(x) = …, a constant a = 1 the grapher gives a slider, or an
   equation in x and y drawn as its level set.

   A run of letters is split into the longest known names (sin, arctan, ln, pi)
   and single letters otherwise, so "pix" is π·x and "ab" is a·b; e is Euler's
   number and never a parameter. A piecewise function is written as Desmos
   writes one, {x<2: x^2, 3x+1}. */
import { t as msg } from '../i18n';

export type Cmp = '<' | '<=' | '>' | '>=' | '=';
export type Node =
  | { readonly t: 'num'; readonly v: number; readonly raw: string }
  | { readonly t: 'var'; readonly name: string }
  | { readonly t: 'const'; readonly name: 'pi' | 'e' }
  | { readonly t: 'neg'; readonly a: Node }
  | { readonly t: 'bin'; readonly op: '+' | '-' | '*' | '/' | '^'; readonly a: Node; readonly b: Node; readonly implicit?: boolean }
  | { readonly t: 'call'; readonly fn: Builtin; readonly arg: Node; readonly base?: Node; readonly bare?: boolean }
  | { readonly t: 'user'; readonly name: string; readonly primes: number; readonly arg: Node }
  | { readonly t: 'cmp'; readonly ops: readonly Cmp[]; readonly terms: readonly Node[] }
  | { readonly t: 'piece'; readonly cases: readonly { readonly cond: Node | null; readonly val: Node }[] };

const FNS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x: number) => 1 / Math.cos(x), csc: (x: number) => 1 / Math.sin(x), cot: (x: number) => Math.cos(x) / Math.sin(x),
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  ln: Math.log, log: Math.log10, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
} as const;
export type Builtin = keyof typeof FNS;
const ALIAS: Readonly<Record<string, Builtin>> = { asin: 'arcsin', acos: 'arccos', atan: 'arctan' };
/* Every name a letter run may hold, longest first so that "arcsin" is not "a·r·c·sin". */
const NAMES = [...Object.keys(FNS), ...Object.keys(ALIAS), 'pi', 'theta'].sort((a, b) => b.length - a.length);
const GREEK: Readonly<Record<string, string>> = { 'θ': '\\theta', 'α': '\\alpha', 'β': '\\beta', 'λ': '\\lambda', 'μ': '\\mu', 'ω': '\\omega', 'φ': '\\varphi' };

type Tok = { readonly k: 'num'; readonly v: string } | { readonly k: 'id'; readonly v: string } | { readonly k: 'op'; readonly v: string };

export class ParseError extends Error {}

const normalise = (s: string): string =>
  s.replace(/[−–]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, '/').replace(/≤/g, '<=').replace(/≥/g, '>=')
    .replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\\(left|right)/g, '').replace(/\\/g, '');

export const lex = (src: string): Tok[] => {
  const s = normalise(src); const out: Tok[] = [];
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) { out.push({ k: 'num', v: num[1] }); i += num[1].length; continue; }
    const run = /^[a-zA-Zα-ωΑ-Ω]+/.exec(s.slice(i));
    if (run) {
      for (let j = 0; j < run[0].length;) {
        const rest = run[0].slice(j); const name = NAMES.find((n) => rest.startsWith(n)) ?? rest[0];
        out.push({ k: 'id', v: name === 'theta' ? 'θ' : name }); j += name.length;
      }
      i += run[0].length; continue;
    }
    const two = s.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '**') { out.push({ k: 'op', v: two === '**' ? '^' : two }); i += 2; continue; }
    if ('+-*/^()[]{},|:<>=\'_'.includes(c)) { out.push({ k: 'op', v: c === '[' ? '(' : c === ']' ? ')' : c }); i++; continue; }
    throw new ParseError(msg('sheets.grapher.error.unknown', { c }));
  }
  return out;
};

const isFn = (v: string): v is Builtin => v in FNS;
const builtin = (v: string): Builtin | null => (isFn(v) ? v : ALIAS[v] ?? null);

/* The parser, one function per level of precedence. `fns` names the single
   letters other rows define as functions, so f(x+1) is a call and a(x+1) a product. */
export const parse = (src: string, fns: ReadonlySet<string> = new Set()): Node => {
  const toks = lex(src); let i = 0; let absDepth = 0;
  const peek = (): Tok | undefined => toks[i];
  const isOp = (v: string): boolean => { const t = toks[i]; return !!t && t.k === 'op' && t.v === v; };
  const expect = (v: string): void => { if (!isOp(v)) throw new ParseError(peek() ? msg('sheets.grapher.error.expected', { v }) : msg('sheets.grapher.error.missing', { v })); i++; };
  const startsFactor = (): boolean => {
    const t = peek(); if (!t) return false;
    if (t.k === 'id') return true;
    return t.k === 'op' && (t.v === '(' || (t.v === '|' && absDepth === 0));
  };
  const chain = (): Node => {
    const terms = [sum()]; const ops: Cmp[] = [];
    for (let t = peek(); t && t.k === 'op' && ['<', '<=', '>', '>=', '='].includes(t.v); t = peek()) { i++; ops.push(t.v as Cmp); terms.push(sum()); }
    return ops.length ? { t: 'cmp', ops, terms } : terms[0];
  };
  const sum = (): Node => {
    let a = term();
    while (isOp('+') || isOp('-')) { const op = (peek() as Tok).v as '+' | '-'; i++; a = { t: 'bin', op, a, b: term() }; }
    return a;
  };
  const term = (): Node => {
    let a = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const op = (peek() as Tok).v as '*' | '/'; i++; a = { t: 'bin', op, a, b: unary() }; continue; }
      if (startsFactor()) { a = { t: 'bin', op: '*', a, b: power(), implicit: true }; continue; }
      return a;
    }
  };
  const unary = (): Node => {
    if (isOp('-')) { i++; return { t: 'neg', a: unary() }; }
    if (isOp('+')) { i++; return unary(); }
    return power();
  };
  const exponent = (): Node => {
    if (isOp('-')) { i++; return { t: 'neg', a: exponent() }; }
    if (isOp('{')) { i++; const e = sum(); expect('}'); return e; }
    return power();
  };
  const power = (): Node => {
    const base = primary();
    if (!isOp('^')) return base;
    i++; return { t: 'bin', op: '^', a: base, b: exponent() };
  };
  /* A function's argument: in brackets, or bare as the book sets it (sin 2x,
     ln x), which runs over the product that follows up to the next function name. */
  const argument = (): { arg: Node; bare: boolean } => {
    if (isOp('(')) { i++; const a = sum(); expect(')'); return { arg: a, bare: false }; }
    let a = power();
    for (let t = peek(); t && startsFactor() && !(t.k === 'id' && builtin(t.v)); t = peek()) a = { t: 'bin', op: '*', a, b: power(), implicit: true };
    return { arg: a, bare: true };
  };
  const piecewise = (): Node => {
    const cases: { cond: Node | null; val: Node }[] = [];
    if (isOp('}')) throw new ParseError(msg('sheets.grapher.error.emptyBraces'));
    for (;;) {
      const first = chain();
      if (isOp(':')) { i++; cases.push({ cond: first, val: sum() }); }
      else cases.push(first.t === 'cmp' ? { cond: first, val: { t: 'num', v: 1, raw: '1' } } : { cond: null, val: first });
      if (isOp(',') || isOp(';')) { i++; continue; }
      expect('}'); return { t: 'piece', cases };
    }
  };
  const primary = (): Node => {
    const t = peek(); if (!t) throw new ParseError(msg('sheets.grapher.error.endsSoon'));
    i++;
    if (t.k === 'num') return { t: 'num', v: Number(t.v), raw: t.v };
    if (t.k === 'op') {
      if (t.v === '(') { const e = sum(); expect(')'); return e; }
      if (t.v === '{') return piecewise();
      if (t.v === '|') { absDepth++; const e = sum(); absDepth--; expect('|'); return { t: 'call', fn: 'abs', arg: e }; }
      throw new ParseError(msg('sheets.grapher.error.cannotStand', { v: t.v }));
    }
    if (t.v === 'pi') return { t: 'const', name: 'pi' };
    if (t.v === 'e') return { t: 'const', name: 'e' };
    const fn = builtin(t.v);
    if (fn) {
      let base: Node | undefined;
      if (fn === 'log' && isOp('_')) { i++; base = isOp('{') ? (i++, (() => { const b = sum(); expect('}'); return b; })()) : primary(); }
      let pow: Node | undefined;
      if (isOp('^')) { i++; pow = exponent(); }
      const { arg, bare } = argument();
      const call: Node = { t: 'call', fn, arg, ...(base ? { base } : {}), ...(bare ? { bare } : {}) };
      return pow ? { t: 'bin', op: '^', a: call, b: pow } : call;
    }
    if (fns.has(t.v)) {
      let primes = 0; while (isOp('\'')) { i++; primes++; }
      if (!isOp('(')) throw new ParseError(msg('sheets.grapher.error.function', { f: t.v }));
      i++; const arg = sum(); expect(')');
      return { t: 'user', name: t.v, primes, arg };
    }
    return { t: 'var', name: t.v };
  };
  if (toks.length === 0) throw new ParseError(msg('sheets.grapher.error.nothing'));
  const n = chain();
  if (i < toks.length) throw new ParseError(msg('sheets.grapher.error.cannotStand', { v: (peek() as Tok).v }));
  return n;
};

/* ---------- evaluation ---------- */

export type Env = { vars: Record<string, number>; fns: Record<string, (x: number) => number> };
export type Compiled = (env: Env) => number;
const CMP: Readonly<Record<Cmp, (a: number, b: number) => boolean>> = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, '=': (a, b) => a === b };
/* The step a derivative f′ is taken over, by central differences. */
const H = 1e-4;
const derive = (f: (x: number) => number, n: number): ((x: number) => number) =>
  n === 0 ? f : derive((x) => (f(x + H) - f(x - H)) / (2 * H), n - 1);

const binary = (op: '+' | '-' | '*' | '/' | '^', a: Compiled, b: Compiled): Compiled => {
  switch (op) {
    case '+': return (env) => a(env) + b(env);
    case '-': return (env) => a(env) - b(env);
    case '*': return (env) => a(env) * b(env);
    case '/': return (env) => a(env) / b(env);
    case '^': return (env) => pow(a(env), b(env));
  }
};
/* Functions that call each other round in a ring give up rather than overflow the stack. */
const MAX_DEPTH = 64;
let depth = 0;

export const compile = (n: Node): Compiled => {
  switch (n.t) {
    case 'num': { const v = n.v; return () => v; }
    case 'const': { const v = n.name === 'pi' ? Math.PI : Math.E; return () => v; }
    case 'var': { const k = n.name; return (env) => env.vars[k] ?? NaN; }
    case 'neg': { const a = compile(n.a); return (env) => -a(env); }
    case 'bin': return binary(n.op, compile(n.a), compile(n.b));
    case 'call': {
      const a = compile(n.arg); const f = FNS[n.fn];
      if (n.base) { const b = compile(n.base); return (env) => Math.log(a(env)) / Math.log(b(env)); }
      return (env) => f(a(env));
    }
    case 'user': {
      const a = compile(n.arg); const name = n.name, primes = n.primes;
      return (env) => {
        const f = env.fns[name]; if (!f || depth > MAX_DEPTH) return NaN;
        depth++; try { return derive(f, primes)(a(env)); } finally { depth--; }
      };
    }
    case 'cmp': {
      const ts = n.terms.map(compile); const ops = n.ops.map((o) => CMP[o]);
      return (env) => { const v = ts.map((t) => t(env)); return ops.every((op, k) => op(v[k], v[k + 1])) ? 1 : 0; };
    }
    case 'piece': {
      const cs = n.cases.map((c) => ({ cond: c.cond ? compile(c.cond) : null, val: compile(c.val) }));
      return (env) => { for (const c of cs) if (!c.cond || c.cond(env) === 1) return c.val(env); return NaN; };
    }
  }
};
/* A real power: a negative base to an odd root, x^(1/3), is real, as the book reads it. */
const pow = (a: number, b: number): number => {
  if (a >= 0 || Number.isInteger(b)) return Math.pow(a, b);
  for (const q of [3, 5, 7, 9]) { const p = b * q; if (Math.abs(p - Math.round(p)) < 1e-9) return (Math.round(p) % 2 === 0 ? 1 : -1) * Math.pow(-a, b); }
  return NaN;
};

/* ---------- what a tree names ---------- */

/* The letters a tree reads as variables, constants left out. */
export const varsOf = (n: Node): ReadonlySet<string> => {
  const out = new Set<string>();
  const walk = (m: Node): void => {
    switch (m.t) {
      case 'var': out.add(m.name); return;
      case 'neg': walk(m.a); return;
      case 'bin': walk(m.a); walk(m.b); return;
      case 'call': walk(m.arg); if (m.base) walk(m.base); return;
      case 'user': walk(m.arg); return;
      case 'cmp': m.terms.forEach(walk); return;
      case 'piece': m.cases.forEach((c) => { if (c.cond) walk(c.cond); walk(c.val); }); return;
      default: return;
    }
  };
  walk(n); return out;
};
/* The functions of x a tree may break at: every denominator, and for a
   comparison of a piecewise function the difference of its sides. Where one of
   these is zero the plot looks for a hole, a jump or an asymptote. */
export const breaksOf = (n: Node): readonly Node[] => {
  const out: Node[] = [];
  const zero = (fn: Builtin, a: Node): Node | null => (fn === 'tan' || fn === 'sec' ? { t: 'call', fn: 'cos', arg: a } : fn === 'cot' || fn === 'csc' ? { t: 'call', fn: 'sin', arg: a } : null);
  const walk = (m: Node): void => {
    switch (m.t) {
      case 'neg': walk(m.a); return;
      case 'bin': if (m.op === '/' || (m.op === '^' && (m.b.t === 'neg' || (m.b.t === 'num' && m.b.v < 0)))) out.push(m.op === '/' ? m.b : m.a); walk(m.a); walk(m.b); return;
      case 'call': { const z = zero(m.fn, m.arg); if (z) out.push(z); walk(m.arg); return; }
      case 'user': walk(m.arg); return;
      case 'cmp': m.terms.slice(1).forEach((t, k) => out.push({ t: 'bin', op: '-', a: m.terms[k], b: t })); m.terms.forEach(walk); return;
      case 'piece': m.cases.forEach((c) => { if (c.cond) walk(c.cond); walk(c.val); }); return;
      default: return;
    }
  };
  walk(n); return out;
};

/* ---------- TeX ---------- */

const ATOMIC = (n: Node): boolean => n.t === 'num' || n.t === 'var' || n.t === 'const' || (n.t === 'call' && !n.bare) || n.t === 'user';
const paren = (s: string): string => `\\left(${s}\\right)`;
const TEX_FN: Readonly<Record<Builtin, string>> = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', sec: '\\sec', csc: '\\csc', cot: '\\cot', arcsin: '\\arcsin', arccos: '\\arccos', arctan: '\\arctan',
  sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', ln: '\\ln', log: '\\log', exp: '\\exp', sqrt: '\\sqrt', abs: '',
};
const TEX_CMP: Readonly<Record<Cmp, string>> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge', '=': '=' };
export const toTex = (n: Node): string => {
  switch (n.t) {
    case 'num': return n.raw;
    case 'var': return GREEK[n.name] ?? n.name;
    case 'const': return n.name === 'pi' ? '\\pi' : 'e';
    case 'neg': return `-${n.a.t === 'bin' && (n.a.op === '+' || n.a.op === '-') ? paren(toTex(n.a)) : toTex(n.a)}`;
    case 'bin': return binTex(n);
    case 'call':
      if (n.fn === 'abs') return `\\left|${toTex(n.arg)}\\right|`;
      if (n.fn === 'sqrt') return `\\sqrt{${toTex(n.arg)}}`;
      if (n.fn === 'exp') return `e^{${toTex(n.arg)}}`;
      if (n.base) return `\\log_{${toTex(n.base)}}${callArg(n)}`;
      return `${TEX_FN[n.fn]}${callArg(n)}`;
    case 'user': return `${n.name}${'\''.repeat(n.primes)}${paren(toTex(n.arg))}`;
    case 'cmp': return n.terms.map(toTex).reduce((s, t, k) => `${s}${TEX_CMP[n.ops[k - 1]]}${t}`);
    case 'piece': return `\\begin{cases}${n.cases.map((c) => `${toTex(c.val)} & ${c.cond ? toTex(c.cond) : '\\text{otherwise}'}`).join('\\\\')}\\end{cases}`;
  }
};
const sumLike = (m: Node): boolean => (m.t === 'bin' && (m.op === '+' || m.op === '-')) || m.t === 'neg';
const binTex = (n: Extract<Node, { t: 'bin' }>): string => {
  const a = toTex(n.a), b = toTex(n.b);
  switch (n.op) {
    case '+': return `${a}+${b}`;
    case '-': return `${a}-${sumLike(n.b) ? paren(b) : b}`;
    case '/': return `\\frac{${a}}{${b}}`;
    case '^': return n.a.t === 'call' && n.a.fn !== 'abs' && n.a.fn !== 'sqrt' && n.a.fn !== 'exp' && !n.a.base ? `${TEX_FN[n.a.fn]}^{${b}}${callArg(n.a)}` : `{${ATOMIC(n.a) && n.a.t !== 'call' ? a : paren(a)}}^{${b}}`;
    case '*': {
      const l = sumLike(n.a) ? paren(a) : a, r = sumLike(n.b) ? paren(b) : b;
      if (!n.implicit) return `${l}\\cdot ${r}`;
      return `${l}${/^[a-zA-Z\\{]/.test(r) && /[a-zA-Z]$/.test(l) ? ' ' : ''}${r}`;
    }
  }
};
const callArg = (n: Extract<Node, { t: 'call' }>): string => (n.bare ? ` ${toTex(n.arg)}` : paren(toTex(n.arg)));

/* ---------- a row ---------- */

/* What one row of the grapher draws. */
export type Row =
  | { readonly kind: 'empty' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'curve'; readonly node: Node; readonly name?: string; readonly arg: string; readonly tex: string }    /* y = f(x), or f(x) = … */
  | { readonly kind: 'constant'; readonly name: string; readonly node: Node; readonly slider: boolean; readonly tex: string }   /* a = 1 */
  | { readonly kind: 'equation'; readonly node: Node; readonly tex: string };   /* F(x, y) = 0 */

const DEFINES = /^\s*([a-zA-Z])\s*\(\s*([a-zA-Zθ])\s*\)\s*=(?!=)/;
const defined = (text: string): RegExpExecArray | null => { const m = DEFINES.exec(text); return m && !['e', 'x', 'y'].includes(m[1]) ? m : null; };
/* The letters the rows define as functions, which every row is parsed knowing. */
export const functionNames = (texts: readonly string[]): ReadonlySet<string> =>
  new Set(texts.flatMap((t) => { const m = defined(t); return m ? [m[1]] : []; }));

const isLetter = (n: Node, name?: string): n is Extract<Node, { t: 'var' }> => n.t === 'var' && (name === undefined || n.name === name);
export const readRow = (text: string, fns: ReadonlySet<string> = new Set()): Row => {
  if (text.trim() === '') return { kind: 'empty' };
  try {
    const def = defined(text);
    if (def) {
      const node = parse(text.slice(def[0].length), new Set([...fns].filter((f) => f !== def[1])));
      return { kind: 'curve', node, name: def[1], arg: def[2], tex: `${def[1]}\\left(${GREEK[def[2]] ?? def[2]}\\right)=${toTex(node)}` };
    }
    const n = parse(text, fns);
    if (n.t !== 'cmp') return varsOf(n).has('y') ? { kind: 'error', message: msg('sheets.grapher.error.needsEquation') } : { kind: 'curve', node: n, arg: 'x', tex: `y=${toTex(n)}` };
    if (n.ops.length !== 1 || n.ops[0] !== '=') return { kind: 'error', message: msg('sheets.grapher.error.inequality') };
    const [l, r] = n.terms;
    if (isLetter(l, 'y') && !varsOf(r).has('y')) return { kind: 'curve', node: r, arg: 'x', tex: `y=${toTex(r)}` };
    if (isLetter(l) && l.name !== 'x' && l.name !== 'y' && !varsOf(r).has(l.name) && !varsOf(r).has('x') && !varsOf(r).has('y'))
      return { kind: 'constant', name: l.name, node: r, slider: r.t === 'num' || (r.t === 'neg' && r.a.t === 'num'), tex: toTex(n) };
    return { kind: 'equation', node: { t: 'bin', op: '-', a: l, b: r }, tex: toTex(n) };
  } catch (e) {
    return { kind: 'error', message: e instanceof ParseError ? e.message : String(e) };
  }
};

/* The letters a row reads that nothing defines: not x or y, not its own
   argument, not a constant another row sets. Each becomes a slider. */
export const freeLetters = (row: Row, defined: ReadonlySet<string>): readonly string[] => {
  if (row.kind === 'empty' || row.kind === 'error') return [];
  const own = row.kind === 'curve' ? row.arg : row.kind === 'constant' ? row.name : '';
  return [...varsOf(row.node)].filter((v) => v !== 'x' && v !== 'y' && v !== own && !defined.has(v));
};

/* A curve's expression as one function of its argument, under the constants and functions the rows set. */
export const curveFn = (row: Extract<Row, { kind: 'curve' }>, env: Env): ((x: number) => number) => {
  const g = compile(row.node); const k = row.arg;
  const local: Env = { vars: { ...env.vars }, fns: env.fns };
  return (x) => { local.vars[k] = x; return g(local); };
};
