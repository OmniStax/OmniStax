/* Which referents each figure of a section draws, read off the section's figures.js without running it.

   A figure is built by a statement at the top of the script: an IIFE that opens with `sim('sim-id', …)`, or a call
   to a factory that passes the id, `accelSim({ id: 'sim-racehorse', … })`. A statement belongs to every figure whose
   id it carries as a string, and draws the referents its `F.ref` calls name, together with those of the top-level
   functions and constants it uses, followed transitively. An argument is read three ways:
   - a string, or an expression holding strings (`F.ref(i ? 'changed' : 'baseline')`): the strings that are referents;
   - strings joined to something (`F.ref('path-' + k)`, `F.ref(q.block + '-block')`): every referent whose id
     the join can make;
   - anything else (`F.ref(id)`, `F.ref(o.ref)`): the referents the figure's own statement and the constants it uses
     carry as strings, which is where a table such as `CARS` or a factory's options name them.
   A factory that names several referents by string (the racehorse and the train of one `accelSim`) gives a figure
   only those its statement names as well outside an F.ref call (`sprite: 'horse'`), where it names any. An id
   made by a function of something else (`F.ref(k.toLowerCase())`) is not read. The reading errs toward a
   referent too many. */

type FigureId = string;
type RefId = string;
export type FigureRefs = ReadonlyMap<FigureId, ReadonlySet<RefId>>;

type Tok = { readonly t: 'str' | 'id' | 'p'; readonly v: string; readonly depth: number };

const ID_START = /[A-Za-z_$]/;
const ID_PART = /[A-Za-z0-9_$]/;
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
const VALUE_END = new Set([')', ']', 'num', 'regex', 'template']);
const regexMayStart = (prev: Tok | undefined): boolean =>
  prev === undefined || (prev.t === 'p' && !VALUE_END.has(prev.v)) || (prev.t === 'id' && REGEX_AFTER_WORD.has(prev.v));

/* The script as strings, names and punctuation, each with the bracket depth it opens at. Comments go, a regular
   expression goes, and a template's `${…}` is read as code inside a brace. */
const tokens = (js: string): readonly Tok[] => {
  const out: Tok[] = [];
  const opens: ('(' | '[' | '{' | '${')[] = [];
  const push = (t: Tok['t'], v: string): void => { out.push({ t, v, depth: opens.length }); };
  /* A template from just after its backtick or its `}`: its text, and whether it stopped at `${`. */
  const template = (i: number): [number, string, boolean] => {
    let s = '';
    for (let j = i; j < js.length; j++) {
      if (js[j] === '\\') { s += js[j + 1] ?? ''; j++; continue; }
      if (js[j] === '`') return [j + 1, s, false];
      if (js[j] === '$' && js[j + 1] === '{') return [j + 2, s, true];
      s += js[j];
    }
    return [js.length, s, false];
  };
  let i = 0;
  while (i < js.length) {
    const c = js[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && js[i + 1] === '/') { const e = js.indexOf('\n', i); i = e < 0 ? js.length : e; continue; }
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); i = e < 0 ? js.length : e + 2; continue; }
    if (c === '/' && regexMayStart(out.at(-1))) {
      let j = i + 1; let cls = false;
      for (; j < js.length && (js[j] !== '/' || cls); j++) {
        if (js[j] === '\\') j++;
        else if (js[j] === '[') cls = true;
        else if (js[j] === ']') cls = false;
        else if (js[j] === '\n') break;
      }
      i = j + 1; while (i < js.length && ID_PART.test(js[i])) i++;
      push('p', 'regex'); continue;
    }
    if (c === '"' || c === "'") {
      let s = ''; let j = i + 1;
      for (; j < js.length && js[j] !== c && js[j] !== '\n'; j++) { if (js[j] === '\\') { s += js[j + 1] ?? ''; j++; } else s += js[j]; }
      push('str', s); i = j + 1; continue;
    }
    if (c === '`' || (c === '}' && opens.at(-1) === '${')) {
      if (c === '}') opens.pop();
      const [next, s, more] = template(i + 1);
      if (c === '`' && !more) push('str', s); else push('p', 'template');
      if (more) opens.push('${');
      i = next; continue;
    }
    if (ID_START.test(c)) { let j = i + 1; while (j < js.length && ID_PART.test(js[j])) j++; push('id', js.slice(i, j)); i = j; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(js[i + 1] ?? ''))) { let j = i + 1; while (j < js.length && /[0-9A-Za-z_.]/.test(js[j])) j++; push('p', 'num'); i = j; continue; }
    if (js.startsWith('=>', i)) { push('p', '=>'); i += 2; continue; }
    if (js.startsWith('...', i)) { push('p', '...'); i += 3; continue; }
    if (c === '(' || c === '[' || c === '{') { push('p', c); opens.push(c); i++; continue; }
    if (c === ')' || c === ']' || c === '}') { opens.pop(); push('p', c); i++; continue; }
    push('p', c); i++;
  }
  return out;
};

/* ---------- the script's top-level statements ---------- */

type Call = { readonly kind: 'lit'; readonly ids: readonly string[] } | { readonly kind: 'pattern'; readonly pattern: RegExp } | { readonly kind: 'dyn' };
type Unit = {
  readonly names: readonly string[];        /* what the statement declares at the top */
  readonly fn: boolean;                     /* it declares a function, so its strings are its callers' to choose among */
  readonly used: ReadonlySet<string>;       /* the names it reads */
  readonly strs: ReadonlySet<string>;
  readonly plain: ReadonlySet<string>;      /* its strings outside F.ref calls, where a figure names what a factory should draw */
  readonly calls: readonly Call[];          /* its F.ref calls */
};

const DECL = new Set(['const', 'let', 'var', 'function', 'class', 'async']);
const NO_SPLIT_AFTER = new Set(['=', '(', ',', ':', '?', '!', '&', '|', '+', 'export', 'async', 'return']);
const CONTINUES = new Set([')', ']', ',', '.', '(', ';', '?', ':', '=', '+', '-', '*', '/', '&', '|', '<', '>', '`', 'template']);

/* The script's body: a script that wraps itself in one function, as every section's does
   (`window.OMNISTAX_FIGURES['2.4'] = function (root, F) { … }`), is read inside it. */
const body = (ts: readonly Tok[]): readonly Tok[] => {
  const base = ts[0]?.depth ?? 0;
  const groups = ts.flatMap((x, open) => {
    if (!(x.t === 'p' && x.v === '{' && x.depth === base)) return [];
    const close = ts.findIndex((y, j) => j > open && y.t === 'p' && y.v === '}' && y.depth === base);
    return close < 0 ? [] : [[open, close] as const];
  });
  const [open, close] = groups.reduce((a, g) => (g[1] - g[0] > a[1] - a[0] ? g : a), [0, 0] as readonly [number, number]);
  return close - open > ts.length / 2 ? body(ts.slice(open + 1, close).map((x) => ({ ...x, depth: x.depth - base - 1 }))) : ts;
};

const splitUnits = (ts: readonly Tok[]): readonly (readonly Tok[])[] => {
  const units: Tok[][] = [[]];
  ts.forEach((tok, k) => {
    const cur = units[units.length - 1];
    const prev = ts[k - 1];
    if (tok.depth === 0 && tok.t === 'id' && DECL.has(tok.v) && cur.length && !(prev && NO_SPLIT_AFTER.has(prev.v))) units.push([]);
    units[units.length - 1].push(tok);
    const next = ts[k + 1];
    const declared = ['function', 'class'].includes(cur[0]?.v === 'async' ? cur[1]?.v : cur[0]?.v);
    const ends = tok.depth === 0 && tok.t === 'p' && (tok.v === ';' || (tok.v === '}' && (declared || !(next && next.t === 'p' && CONTINUES.has(next.v)))));
    if (ends) units.push([]);
  });
  return units.filter((u) => u.length);
};

/* A string joined to other things, `'path-' + k` or `q.block + '-block'`, as the ids it can make. */
const joined = (arg: readonly Tok[]): RegExp | null => {
  const top = arg[0]?.depth;
  const cuts = arg.flatMap((x, k) => (x.t === 'p' && x.v === '+' && x.depth === top ? [k] : []));
  if (!cuts.length) return null;
  const pieces = [-1, ...cuts].map((c, k) => arg.slice(c + 1, cuts[k] ?? arg.length));
  if (!pieces.some((p) => p.length === 1 && p[0].t === 'str')) return null;
  const escape = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${pieces.map((p) => (p.length === 1 && p[0].t === 'str' ? escape(p[0].v) : '.*')).join('')}$`);
};

/* The F.ref calls of a run of tokens, each read by the shape of its argument, and where its argument lies. */
const refCalls = (ts: readonly Tok[]): readonly (Call & { readonly at: readonly [number, number] })[] => ts.flatMap((tok, k) => {
  if (!(tok.t === 'id' && tok.v === 'F' && ts[k + 1]?.v === '.' && ts[k + 2]?.v === 'ref' && ts[k + 3]?.v === '(')) return [];
  const open = ts[k + 3].depth;
  const close = ts.findIndex((x, j) => j > k + 3 && x.t === 'p' && x.v === ')' && x.depth === open);
  const at = [k + 4, close < 0 ? ts.length : close] as const;
  const arg = ts.slice(...at);
  const strs = arg.filter((x) => x.t === 'str').map((x) => x.v);
  const pattern = joined(arg);
  const call: Call = pattern ? { kind: 'pattern', pattern } : strs.length ? { kind: 'lit', ids: strs } : { kind: 'dyn' };
  return [{ ...call, at }];
});

const declares = (u: readonly Tok[]): { readonly names: readonly string[]; readonly fn: boolean } => {
  const at = u[0]?.v === 'async' ? 1 : 0;
  const head = u[at];
  if (head?.v === 'function' || head?.v === 'class') return { names: u[at + 1]?.t === 'id' ? [u[at + 1].v] : [], fn: head.v === 'function' };
  if (!(head && ['const', 'let', 'var'].includes(head.v))) return { names: [], fn: false };
  const names = u.filter((x, k) => x.depth === 0 && x.t === 'id' && (k === at + 1 || u[k - 1]?.v === ',') && u[k + 1]?.v === '=').map((x) => x.v);
  const rhs = u.slice(at + 3);
  const fn = rhs[0]?.v === 'function' || rhs[0]?.v === 'async' || (rhs[0]?.t === 'id' && rhs[1]?.v === '=>')
    || (rhs[0]?.v === '(' && rhs[rhs.findIndex((x) => x.v === ')' && x.depth === rhs[0].depth) + 1]?.v === '=>');
  return { names, fn };
};

const unitOf = (u: readonly Tok[]): Unit => {
  const calls = refCalls(u);
  const inCall = (k: number): boolean => calls.some(({ at }) => k >= at[0] && k < at[1]);
  return {
    ...declares(u),
    used: new Set(u.filter((x, k) => x.t === 'id' && u[k - 1]?.v !== '.').map((x) => x.v)),
    strs: new Set(u.filter((x) => x.t === 'str').map((x) => x.v)),
    plain: new Set(u.flatMap((x, k) => (x.t === 'str' && !inCall(k) ? [x.v] : []))),
    calls,
  };
};

/* The statement and every top-level declaration it reaches through the names it reads. */
const closure = (units: readonly Unit[], from: Unit): readonly Unit[] => {
  const byName = new Map(units.flatMap((u) => u.names.map((n) => [n, u] as const)));
  const step = (seen: readonly Unit[], todo: readonly Unit[]): readonly Unit[] => {
    if (!todo.length) return seen;
    const found = [...new Set(todo.flatMap((u) => [...u.used].flatMap((n) => byName.get(n) ?? [])))].filter((u) => !seen.includes(u));
    return step([...seen, ...found], found);
  };
  return step([from], [from]);
};

/* The referents one figure statement draws, by the reading above. */
const drawnBy = (units: readonly Unit[], from: Unit, referents: ReadonlySet<RefId>, guess: boolean): ReadonlySet<RefId> => {
  const reach = closure(units, from);
  const data = reach.filter((u) => u === from || !u.fn);
  const strs = new Set(data.flatMap((u) => [...u.strs]));
  const plain = new Set(data.flatMap((u) => [...u.plain]));
  return new Set(reach.flatMap((u) => {
    const lits = [...new Set(u.calls.flatMap((c) => (c.kind === 'lit' ? c.ids.filter((id) => referents.has(id)) : [])))];
    const chosen = u !== from && u.fn && lits.length > 1 && lits.some((id) => plain.has(id)) ? lits.filter((id) => plain.has(id)) : lits;
    return [
      ...chosen,
      ...u.calls.flatMap((c) => (c.kind === 'pattern' ? [...referents].filter((id) => c.pattern.test(id)) : [])),
      ...(guess && u.calls.some((c) => c.kind === 'dyn') ? [...referents].filter((id) => strs.has(id) || u.strs.has(id)) : []),
    ];
  }));
};

/* Every figure of the section with the referents it draws; a figure that draws none is left out. */
export const figureRefs = (js: string, figures: readonly FigureId[], referents: readonly RefId[], guess = true): FigureRefs => {
  const units = splitUnits(body(tokens(js))).map(unitOf);
  const refs = new Set(referents);
  return new Map(figures.flatMap((f) => {
    const drawn = new Set(units.filter((u) => u.strs.has(f)).flatMap((u) => [...drawnBy(units, u, refs, guess)]));
    return drawn.size ? [[f, drawn] as const] : [];
  }));
};
