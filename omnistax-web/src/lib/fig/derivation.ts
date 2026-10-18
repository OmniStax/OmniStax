/* A derivation as a graph worked in place (root rule 29, docs/prompts/derivations.md). Every fact
   and every result is drawn once; a result stands one layer past what it rests on and a fact one
   layer before its first use, placed afresh each frame from the boxes' present sizes, so a box that
   opens to work pushes its neighbours aside and lets them back when it closes. Played, each result
   box does its own work: the line it starts from is carried in, and every move morphs the line,
   either written out beneath the last with its reason kept beside it, or replaced in place with the
   reason shown and let fade. The camera frames each step and its sources as it starts, and the
   reader may pan and zoom. Everything on screen is a function of the transport's time and the
   reader's hand on the view. The styles are in global.css under `.dv`. */
import type { DerivationDTO, DerivationFactDTO } from '../content/schema';
import type { Fig } from './figlib';

type BeatKind = 'over' | 'glow' | 'load' | 'holds' | 'lead' | 'move' | 'land' | 'result' | 'bank' | 'back';
type Beat = { readonly kind: BeatKind; readonly node: number; readonly step: number; readonly t0: number; readonly dur: number };
type Cam = { readonly s: number; readonly x: number; readonly y: number };
type Frame = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
type Row = { readonly row: HTMLElement; readonly eq: HTMLElement; readonly st: HTMLElement; readonly stage: HTMLElement; readonly why: HTMLElement };
type Box = { readonly el: HTMLElement; readonly body: HTMLElement; readonly rows: HTMLElement; readonly R: readonly Row[]; readonly cap: HTMLElement; readonly note: HTMLElement | null; sz: { w: number; h: number } | null; max: { w: number; h: number; bw: number } };
type Item = { readonly id: string; readonly el: HTMLElement; readonly preds: readonly string[]; pre: Item[]; succ: Item[]; layer: number; w: number; h: number; x: number; y: number };
/* a box's state for one frame: how far each row is open, which row holds the morph, what else shows */
type State = { vis: number[]; whyA: number[]; active: number; note: boolean; capA: number; wide: boolean; rowsA?: number; open?: boolean };
type Fact = DerivationFactDTO & { readonly then?: boolean; readonly users: number[] };
type Result = { readonly i: number; readonly facts: number[]; readonly steps: number[]; readonly factOf: Map<number, number>; thenFact: number };

const strip = (s: string): string => s.replace(/\\mk\{[^{}]*\}/g, '');
const paren = (s: string | undefined): string => (s ? (/^\(.*\)$/.test(s) ? s : `(${s})`) : '');
const clamp = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);
const ease = (x: number): number => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/* the terms a move changes, read off its two lines: a key that crosses a top-level relation, changes its content,
   disappears or appears; a relation is crossed under whichever alignment of the two lines' relations moves fewest */
type KeyInfo = { readonly c: string; readonly side: number; readonly neg: boolean };
function keysOf(tx: string): { keys: Map<string, KeyInfo>; n: number } {
  const keys = new Map<string, KeyInfo>(); let side = 0, depth = 0;
  const end = (i: number): number => { let d = 0; for (let j = i; j < tx.length; j += 1) { if (tx[j] === '{') d += 1; else if (tx[j] === '}') { d -= 1; if (!d) return j; } } return tx.length; };
  for (let i = 0; i < tx.length; i += 1) {
    if (tx.startsWith('\\mk{', i)) {
      const e1 = end(i + 3), e2 = end(e1 + 1), before = tx.slice(0, i).trimEnd();
      keys.set(tx.slice(i + 4, e1), { c: tx.slice(e1 + 2, e2).replace(/\s+/g, ''), side, neg: before.endsWith('-') });
      i = e2; continue;
    }
    const ch = tx[i];
    if (ch === '{') depth += 1; else if (ch === '}') depth -= 1;
    else if (depth === 0 && (ch === '=' || tx.startsWith('\\approx', i) || tx.startsWith('\\neq', i))) side += 1;
  }
  return { keys, n: side };
}
export function moved(a: string, b: string): string[] {
  const A = keysOf(a), B = keysOf(b), both = [...A.keys.keys()].filter((k) => B.keys.has(k));
  const ways: ((x: number) => number)[] = [(x) => x, (x) => B.n - (A.n - x)];
  if (A.n === 1 && B.n === 1) ways.push((x) => 1 - x);
  const score = (ks: readonly string[]): number => ks.length * 10 - ks.filter((k) => A.keys.get(k)!.neg !== B.keys.get(k)!.neg).length;
  const crossed = ways.map((f) => both.filter((k) => f(A.keys.get(k)!.side) !== B.keys.get(k)!.side)).sort((x, y) => score(x) - score(y))[0]!;
  const changed = both.filter((k) => A.keys.get(k)!.c !== B.keys.get(k)!.c);
  return [...new Set([...crossed, ...changed, ...[...A.keys.keys()].filter((k) => !B.keys.has(k)), ...[...B.keys.keys()].filter((k) => !A.keys.has(k))])];
}

const BEAT: Record<BeatKind, number> = { over: 0.05, glow: 0.8, load: 1.2, holds: 1.5, lead: 0.6, move: 1.25, land: 0.55, result: 0.5, bank: 1.0, back: 0.9 };
const GLOW = 'var(--hl-yellow)';
const USE = ['--hl-blue', '--hl-green', '--hl-pink'];
const DIM = 0.3;
const GAP = 30, LGAP = 64, PAD = 36;
const glow = (e: HTMLElement, g: number, col = GLOW): void => {
  e.style.boxShadow = g > 0 ? `0 0 0 ${(3 * g).toFixed(2)}px ${col}` : '';
  e.style.background = g > 0 ? `color-mix(in srgb, ${col} ${Math.round(55 * g)}%, var(--bg))` : '';
};
const ICON = {
  reveal: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s4 6 10 6 10-6 10-6"/><path d="M4 9.5C6 7.5 9 6 12 6s6 1.5 8 3.5" stroke-dasharray="2 2.6"/><circle cx="12" cy="13.2" r="2.4" fill="currentColor" stroke="none"/></svg>',
  all: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.8" fill="currentColor" stroke="none"/></svg>',
  lock: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/></svg>',
  work: '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
} as const;
type IconName = keyof typeof ICON;

/* the facts once, numbered in first use; each node's facts and the results it rests on; the order the steps play in */
function model(D: DerivationDTO) {
  const N = D.nodes, lines = N.map((n) => [n.then.tex, ...n.steps.map((s) => s.tex)]);
  const result = (i: number): string => lines[i]![lines[i]!.length - 1]!;
  const resKey = new Map(N.map((_, i) => [strip(result(i)), i] as const));
  const thenFrom = N.map((n, i) => { const j = resKey.get(strip(n.then.tex)); return j !== undefined && j < i ? j : -1; });
  const facts: Fact[] = [], factId = new Map<string, number>();
  const addFact = (a: DerivationFactDTO & { then?: boolean }): number => { const k = a.text || strip(a.tex ?? ''); if (!factId.has(k)) { factId.set(k, facts.length); facts.push({ ...a, users: [] }); } return factId.get(k)!; };
  const nodes: Result[] = N.map((n, i) => {
    const nd: Result = { i, facts: [], steps: [], factOf: new Map(), thenFact: -1 };
    if (thenFrom[i]! >= 0) nd.steps.push(thenFrom[i]!);
    n.assumes.forEach((a, ai) => { if (a.step !== undefined) { if (a.step !== thenFrom[i]) nd.steps.push(a.step); } else { const fi = addFact(a); nd.facts.push(fi); nd.factOf.set(ai, fi); } });
    if (thenFrom[i]! < 0) nd.thenFact = addFact({ tex: n.then.tex, src: n.then.src, then: true });
    [...nd.facts, ...(nd.thenFact >= 0 ? [nd.thenFact] : [])].forEach((fi) => facts[fi]!.users.push(i));
    return nd;
  });
  const last = N.length - 1, order: number[] = [], done = new Set<number>();
  const visit = (i: number): void => { if (done.has(i)) return; done.add(i); nodes[i]!.steps.forEach(visit); order.push(i); };
  visit(last); N.forEach((_, i) => visit(i));
  /* the eyebrow word: the book's example where the record works one, else plural where more than one result is an end */
  const ends = N.filter((_, i) => !nodes.some((m) => m.steps.includes(i))).length;
  const ex = /\bExample (\d+\.\d+)/.exec(D.source ?? '');
  const label = ex ? `Example ${ex[1]}` : ends > 1 ? 'Derivations' : 'Derivation';
  return { N, lines, facts, nodes, thenFrom, last, order, label };
}

/* Draw the derivation `D` into the `<figure class="dv" id="drv-<id>">` of `root`; nothing where the root has no such host. */
export function derivation(root: HTMLElement, F: Fig, D: DerivationDTO): void {
  const { el, tex, morphAt, sim, cycle, register, choice } = F;
  if (!F.byId(root, 'drv-' + D.id)) return;
  const T = (host: HTMLElement, s: string): void => tex(host, '\\displaystyle ' + s, false, { values: false });
  const words = (host: HTMLElement, s: string): void => s.split(/(\$[^$]+\$)/).forEach((p) => { if (!p) return; if (p.startsWith('$')) tex(host.appendChild(el('span')), p.slice(1, -1), false, { values: false }); else host.appendChild(document.createTextNode(p)); });
  const toggle = (host: HTMLElement, cls: string, title: (v: boolean) => readonly [IconName, string], on: boolean, set: (v: boolean) => void): HTMLButtonElement => {
    const b = host.appendChild(el('button', 'tbtn ' + cls)); b.type = 'button';
    const show = (v: boolean): void => { b.setAttribute('aria-pressed', String(v)); const [ic, tt] = title(v); b.innerHTML = ICON[ic]; b.title = tt; b.setAttribute('aria-label', tt); };
    let v = on; show(v); b.addEventListener('click', () => { v = !v; show(v); set(v); }); return b;
  };
  const tips = (host: HTMLElement, m: Readonly<Record<string, string>>): void => host.querySelectorAll<HTMLElement>('.segbtn').forEach((b) => { const t = m[b.dataset.value ?? '']; if (t) b.title = t; });

  const d = sim(root, 'drv-' + D.id); d.fig.classList.add('dv', 'writing');
  const { N, lines: L, facts, nodes, thenFrom, last, order, label } = model(D);
  const depth = ((): number => { const m = new Map<number, number>(); const go = (i: number): number => m.has(i) ? m.get(i)! : (m.set(i, 1 + Math.max(0, ...nodes[i]!.steps.map(go))), m.get(i)!); return go(last); })();
  const breadth = Math.max(...nodes.map((nd) => nd.facts.length + nd.steps.length + (nd.thenFact >= 0 ? 1 : 0)));
  const opt = { dir: depth > breadth ? 'v' : 'h', reveal: true, write: true };
  const own = new Set(N.map((n) => n.num || n.src).filter((s): s is string => !!s));

  /* ---------- the timeline ---------- */
  const beats: Beat[] = []; let T0 = 0;
  const beat = (kind: BeatKind, node: number, step = -1): void => { beats.push({ kind, node, step, t0: T0, dur: BEAT[kind] }); T0 += BEAT[kind]; };
  beat('over', -1);
  order.forEach((i) => {
    beat('glow', i); beat('load', i); if (N[i]!.then.uses.length) beat('holds', i);
    N[i]!.steps.forEach((_, j) => { beat('lead', i, j); beat('move', i, j); beat('land', i, j); });
    beat('result', i); beat('bank', i);
  });
  beat('back', -1);
  const period = T0, cy = cycle(() => period, 1.6);
  const at = (t: number): Beat => { for (let i = beats.length - 1; i >= 0; i -= 1) if (t >= beats[i]!.t0) return beats[i]!; return beats[0]!; };
  const glowStart = new Map(beats.filter((b) => b.kind === 'glow').map((b) => [b.node, b.t0] as const));
  const bankEnd = new Map(beats.filter((b) => b.kind === 'bank').map((b) => [b.node, b.t0 + b.dur] as const));
  const factStart = facts.map((f) => Math.min(...f.users.map((i) => glowStart.get(i)!)));
  const prevOf = (i: number): number => { const o = order.indexOf(i); return o > 0 ? order[o - 1]! : -1; };
  const stopAt = [{ t: 0, label: 'The derivation', node: -1 }, ...order.map((i) => { const b = beats.find((x) => x.kind === 'load' && x.node === i)!; return { t: b.t0 + b.dur, label: `Step ${i + 1}`, node: i }; })];
  const bar = (): HTMLElement | null => d.fig.querySelector('.transport');
  const playing = (): boolean => !!bar()?.classList.contains('playing');
  const poke = (): void => { d.fig.dispatchEvent(new Event('input')); };
  const jump = (t: number): void => { if (playing()) bar()!.querySelector<HTMLElement>('.tbtn')!.click(); cy.tau = t; cy.wait = 0; poke(); };

  /* ---------- the reason beside a line: what it is or what it uses, then why ---------- */
  const factsUsed = (i: number, uses: readonly number[]): number[] => [...new Set(uses.filter((u) => N[i]!.assumes[u]!.step === undefined).map((u) => nodes[i]!.facts.indexOf(nodes[i]!.factOf.get(u)!)).filter((x) => x >= 0))].sort((x, y) => x - y);
  const stepsUsed = (i: number, uses: readonly number[]): number[] => uses.filter((u) => N[i]!.assumes[u]!.step !== undefined).map((u) => N[i]!.assumes[u]!.step!);
  const named = (i: number, uses: readonly number[]): string[] => [...factsUsed(i, uses).map((n) => `fact ${nodes[i]!.facts[n]! + 1}`), ...stepsUsed(i, uses).map((j) => `result ${j + 1}`)];
  const list = (xs: readonly string[]): string => xs.map((x, n) => (n ? (n === xs.length - 1 ? ' and ' : ', ') : '') + x).join('');
  const reason = (host: HTMLElement, i: number, uses: readonly number[], lead: string, text: string | undefined): void => {
    const all = named(i, uses);
    if (all.length) host.appendChild(document.createTextNode(`${lead}${list(all)}.${text ? ' ' : ''}`));
    if (text) words(host, text);
  };
  const reasonOf = (i: number, r: number): HTMLElement | null => {
    const f = el('span');
    if (r === 0) { f.appendChild(document.createTextNode(thenFrom[i]! >= 0 ? `Result ${thenFrom[i]! + 1}. ` : `Fact ${nodes[i]!.thenFact + 1}. `)); reason(f, i, N[i]!.then.uses, 'Holds by ', N[i]!.then.why); }
    else { const s = N[i]!.steps[r - 1]!; reason(f, i, s.uses, 'Using ', s.cap); }
    return f.childNodes.length ? f : null;
  };
  const captioned = (host: HTMLElement, i: number, r: number): void => { const rs = reasonOf(i, r); host.replaceChildren(...(rs ? [rs] : [])); };

  /* ---------- the nodes: a box per result, a leaf per fact, built once ---------- */
  const sticker = (host: HTMLElement, cls: string, s: string): void => { if (s) host.appendChild(el('span', cls)).textContent = s; };
  const B: Box[] = nodes.map((nd, i) => {
    const b = el('div', 'dv-node dv-box'), body = b.appendChild(el('div', 'dv-body'));
    const rowsEl = body.appendChild(el('div', 'dv-rows'));
    const rows: Row[] = L[i]!.map((tx, r) => {
      const row = rowsEl.appendChild(el('div', 'dv-row')), inn = row.appendChild(el('div', 'dv-rowin')), eq = inn.appendChild(el('div', 'dv-eq'));
      const st = eq.appendChild(el('span', 'dv-static')); T(st, strip(tx));
      const stage = eq.appendChild(el('div', 'dv-stage')); stage.style.display = 'none';
      const why = inn.appendChild(el('div', 'dv-why')); const rs = reasonOf(i, r); if (rs) why.appendChild(rs);
      return { row, eq, st, stage, why };
    });
    const cap = body.appendChild(el('div', 'dv-cap'));
    let note: HTMLElement | null = null; if (N[i]!.note) { note = body.appendChild(el('div', 'dv-note')); words(note, N[i]!.note!); }
    sticker(b, 'dv-no', String(i + 1));
    return { el: b, body, rows: rowsEl, R: rows, cap, note, sz: null, max: { w: 0, h: 0, bw: 0 } };
  });
  const FE: HTMLElement[] = facts.map((f, fi) => {
    const c = el('div', 'dv-node dv-fact' + (f.tex ? ' eq' : '') + (f.then ? ' then' : ''));
    const m = c.appendChild(el('span', 'dv-m')); if (f.tex) T(m, strip(f.tex)); else words(m, f.text ?? '');
    sticker(c, 'dv-fno', String(fi + 1)); if (f.src && !own.has(f.src)) sticker(c, 'dv-prov', paren(f.src));
    return c;
  });
  const stageOf = (R: Row): HTMLElement => R.stage.querySelector<HTMLElement>('.tm > .katex') || R.stage;
  const resEl = (j: number): HTMLElement => B[j]!.R[B[j]!.R.length - 1]!.eq;
  const thenEl = (i: number): HTMLElement => (thenFrom[i]! >= 0 ? resEl(thenFrom[i]!) : FE[nodes[i]!.thenFact]!);

  /* ---------- the title bar, the view and the world ---------- */
  const ctl = el('div', 'dv-bar'); d.fig.prepend(ctl);
  const title = ctl.appendChild(el('div', 'dv-title')); title.appendChild(el('b')).textContent = label;
  if (D.what) { const w = title.appendChild(el('span')); w.appendChild(document.createTextNode(' · ')); words(w, D.what); }
  choice(ctl, { options: [{ value: 'h', label: '→' }, { value: 'v', label: '↓' }], value: opt.dir, aria: 'Direction', onInput: (v) => { opt.dir = v; poke(); } });
  tips(ctl, { h: 'Layers run left to right', v: 'Layers run top to bottom' });
  toggle(ctl, 'eye', (v) => (v ? ['reveal', 'Revealing each fact and result as the derivation reaches it; click to show all'] : ['all', 'Showing every fact and result; click to reveal them step by step']), true, (v) => { opt.reveal = v; poke(); });
  let locked = false, held: Cam | null = null;
  toggle(ctl, 'lock', (v) => (v ? ['lock', 'View held still; click to let it follow each step'] : ['unlock', 'View follows each step; click to hold it still']), false, (v) => { locked = v; held = v ? { ...wantNow } : null; poke(); });
  const view = el('div', 'dv-view'), world = view.appendChild(el('div', 'dv-world')); d.stage.appendChild(view);
  const svg = world.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
  FE.forEach((c) => world.appendChild(c)); B.forEach((X) => world.appendChild(X.el));

  /* ---------- the layout, afresh each frame: layers by what rests on what, neighbours near each other ---------- */
  const items: Item[] = [
    ...nodes.map((nd) => ({ id: 'n' + nd.i, el: B[nd.i]!.el, preds: [...nd.steps.map((j) => 'n' + j), ...nd.facts.map((f) => 'f' + f), ...(nd.thenFact >= 0 ? ['f' + nd.thenFact] : [])] })),
    ...facts.map((_, fi) => ({ id: 'f' + fi, el: FE[fi]!, preds: [] as string[] })),
  ].map((it) => ({ ...it, pre: [], succ: [], layer: 0, w: 0, h: 0, x: 0, y: 0 }));
  const byId = new Map(items.map((it) => [it.id, it] as const));
  items.forEach((it) => { it.pre = it.preds.map((q) => byId.get(q)!); });
  items.forEach((it) => it.pre.forEach((q) => q.succ.push(it)));
  const dep = new Map<string, number>(); const go = (it: Item): number => { if (dep.has(it.id)) return dep.get(it.id)!; const v = it.id[0] === 'f' ? 0 : 1 + Math.max(0, ...it.pre.filter((q) => q.id[0] === 'n').map(go)); dep.set(it.id, v); return v; };
  items.forEach(go);
  items.forEach((it) => { it.layer = it.id[0] === 'f' ? Math.min(...it.succ.map((q) => dep.get(q.id)!)) - 1 : dep.get(it.id)!; });
  const layers: Item[][] = Array.from({ length: Math.max(...items.map((it) => it.layer)) + 1 }, () => []);
  items.forEach((it) => layers[it.layer]!.push(it));
  const itemOf = (e: HTMLElement): Item | undefined => items.find((it) => it.el === e);
  function place(): void {
    const H = opt.dir === 'h';
    items.forEach((it) => { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; });
    const along = (it: Item): number => (H ? it.h : it.w), across = (it: Item): number => (H ? it.w : it.h);
    const c = new Map<string, number>(); let pos = 0;
    layers.forEach((Lr) => Lr.forEach((it) => { c.set(it.id, pos + along(it) / 2); pos += along(it) + GAP; }));
    const pack = (Lr: Item[], want: (it: Item) => number): void => {
      Lr.sort((a, b) => want(a) - want(b) || a.id.localeCompare(b.id));
      let edge = -Infinity; const got: number[] = [];
      Lr.forEach((it) => { const v = Math.max(want(it), edge + along(it) / 2); got.push(v); edge = v + along(it) / 2 + GAP; });
      const shift = mean(got.map((v, x) => v - want(Lr[x]!)));
      Lr.forEach((it, x) => c.set(it.id, got[x]! - shift));
    };
    const fwd = (it: Item): number => (it.pre.length ? mean(it.pre.map((q) => c.get(q.id)!)) : c.get(it.id)!);
    const bwd = (it: Item): number => (it.succ.length ? mean(it.succ.map((q) => c.get(q.id)!)) : c.get(it.id)!);
    for (let r = 0; r < 3; r += 1) { layers.forEach((Lr) => pack(Lr, fwd)); for (let k = layers.length - 1; k >= 0; k -= 1) pack(layers[k]!, bwd); }
    layers.forEach((Lr) => pack(Lr, fwd));
    const lo = Math.min(...items.map((it) => c.get(it.id)! - along(it) / 2));
    const hi = Math.max(...items.map((it) => c.get(it.id)! + along(it) / 2)) - lo;
    let off = 0;
    layers.forEach((Lr) => { const w = Math.max(0, ...Lr.map(across)); Lr.forEach((it) => { const a = c.get(it.id)! - along(it) / 2 - lo; it.x = H ? off : a; it.y = H ? a : off; }); off += w + LGAP; });
    const total = off - LGAP;
    items.forEach((it) => { it.el.style.left = `${it.x.toFixed(1)}px`; it.el.style.top = `${it.y.toFixed(1)}px`; });
    svg.setAttribute('width', String(H ? total : hi)); svg.setAttribute('height', String(H ? hi : total));
  }
  function edges(cur: number): void {
    const H = opt.dir === 'h', paths: string[] = [];
    items.forEach((it) => it.pre.forEach((q) => {
      const x1 = H ? q.x + q.w : q.x + q.w / 2, y1 = H ? q.y + q.h / 2 : q.y + q.h, x2 = H ? it.x : it.x + it.w / 2, y2 = H ? it.y + it.h / 2 : it.y;
      const dd = H ? `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
      const hot = it.id === 'n' + cur, op = Math.min(+(q.el.style.opacity || 1), +(it.el.style.opacity || 1));
      paths.push(`<path d="${dd}" fill="none" stroke="${hot ? 'var(--ink)' : 'var(--muted)'}" stroke-width="${hot ? 2 : 1.2}" opacity="${(op * (hot ? 1 : 0.55)).toFixed(2)}"/>`);
    }));
    svg.innerHTML = paths.join('');
  }

  /* ---------- the camera: frames a step and its sources, or the whole; the reader's pan and zoom ride on top ---------- */
  let cam: Cam = { s: 1, x: 0, y: 0 };
  const user = { x: 0, y: 0, z: 1 }; let fading: { x: number; y: number; z: number } | null = null, lastCur: number | null = null, wantNow: Cam = { s: 1, x: 0, y: 0 };
  /* the box at work counts at its full worked-out size, so the frame, and the scale, are settled before its first line arrives */
  const frameOf = (els: readonly HTMLElement[], big = -1): Frame => {
    const its = els.map(itemOf).filter((it): it is Item => !!it), M = big >= 0 ? B[big]!.max : null;
    const w = (it: Item): number => (M && it.el === B[big]!.el ? Math.max(it.w, M.w) : it.w), h = (it: Item): number => (M && it.el === B[big]!.el ? Math.max(it.h, M.h) : it.h);
    return { x0: Math.min(...its.map((it) => it.x)), y0: Math.min(...its.map((it) => it.y)), x1: Math.max(...its.map((it) => it.x + w(it))), y1: Math.max(...its.map((it) => it.y + h(it))) };
  };
  const camAt = (f: Frame, s: number): Cam => { const VW = view.clientWidth, VH = view.clientHeight; return { s, x: VW / 2 - s * (f.x0 + f.x1) / 2, y: VH / 2 - s * (f.y0 + f.y1) / 2 }; };
  const camFor = (f: Frame): Cam => { const VW = view.clientWidth, VH = view.clientHeight; return camAt(f, Math.min(1, (VW - 2 * PAD) / Math.max(f.x1 - f.x0, 1), (VH - 2 * PAD) / Math.max(f.y1 - f.y0, 1))); };
  const around = (i: number): HTMLElement[] => (i < 0 ? items.map((it) => it.el) : [B[i]!.el, ...nodes[i]!.steps.map((j) => B[j]!.el), ...nodes[i]!.facts.map((f) => FE[f]!), ...(nodes[i]!.thenFact >= 0 ? [FE[nodes[i]!.thenFact]!] : [])]);
  const scene = (i: number): Cam => camFor(frameOf(around(i), i));
  const mix = (a: Cam, b: Cam, k: number): Cam => ({ s: lerp(a.s, b.s, k), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
  let hold: { cur: number | null; s: number } = { cur: null, s: 1 };   /* a step's scale, fixed once its opening beat ends, so lines arriving never shrink the type */
  function aim(b: Beat, p: number, cur: number): void {
    const k = ease(p), rest = cur < 0;
    if (b.kind === 'glow') { wantNow = mix(scene(prevOf(cur)), scene(cur), k); hold = { cur: null, s: 1 }; }
    else if (b.kind === 'back') { wantNow = mix(scene(order[order.length - 1]!), scene(-1), k); hold = { cur: null, s: 1 }; }
    else if (rest) { wantNow = scene(-1); hold = { cur: null, s: 1 }; }
    else { const f = frameOf(around(cur), cur); if (hold.cur !== cur) hold = { cur, s: camFor(f).s }; wantNow = camAt(f, hold.s); }
    const want = locked && held ? held : wantNow;
    if (cur !== lastCur) { if (lastCur !== null && !locked) { fading = { ...user }; user.x = 0; user.y = 0; user.z = 1; } lastCur = cur; }
    const fade = fading && b.kind === 'glow' ? 1 - k : 0; if (!fade) fading = null;
    const u = fading ? { x: lerp(user.x, fading.x, fade), y: lerp(user.y, fading.y, fade), z: lerp(user.z, fading.z, fade) } : user;
    const VW = view.clientWidth, VH = view.clientHeight;
    cam = { s: want.s * u.z, x: (want.x - VW / 2) * u.z + VW / 2 + u.x, y: (want.y - VH / 2) * u.z + VH / 2 + u.y };
    world.style.transform = `translate(${cam.x.toFixed(2)}px,${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
  }
  let drag: { x: number; y: number } | null = null;
  view.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY }; view.setPointerCapture(e.pointerId); view.classList.add('panning'); });
  view.addEventListener('pointermove', (e) => { if (!drag) return; user.x += e.clientX - drag.x; user.y += e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; poke(); });
  const drop = (): void => { drag = null; view.classList.remove('panning'); };
  view.addEventListener('pointerup', drop); view.addEventListener('pointercancel', drop);
  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015);
    const z = Math.min(4, Math.max(0.25, user.z * f)), g = z / user.z, qx = px - r.width / 2, qy = py - r.height / 2;
    user.x = (user.x - qx) * g + qx; user.y = (user.y - qy) * g + qy; user.z = z;   /* about the pointer: the world point under it stays put */
    poke();
  }, { passive: false });
  view.addEventListener('dblclick', () => { user.x = 0; user.y = 0; user.z = 1; poke(); });

  /* `dst`, filling the cell `at`, drawn as if it stood where `from` stands, k of the way home; screen lengths read back into world lengths */
  const flyFrom = (dst: HTMLElement, cell: HTMLElement, from: DOMRect, k: number): void => {
    dst.style.transform = ''; if (k >= 1) return;
    const r = cell.getBoundingClientRect();
    const q = 1 - ease(k), dx = (from.left - r.left) / cam.s, dy = (from.top + from.height / 2 - r.top - r.height / 2) / cam.s;
    dst.style.transform = `translate(${(dx * q).toFixed(2)}px,${(dy * q).toFixed(2)}px)`;
  };

  /* ---------- the dots on the scrubber and the work toggle beside the player ---------- */
  let dots: (readonly [{ readonly node: number }, HTMLElement])[] = [];
  function track(): void {
    const s = d.fig.querySelector<HTMLElement>('.transport .scrub'); if (!s || s.parentElement!.classList.contains('dv-track')) return;
    const w = el('span', 'dv-track'); s.replaceWith(w); w.appendChild(s);
    dots = stopAt.map((st) => {
      const b = w.appendChild(el('button', 'dv-dot')); b.title = st.label; b.setAttribute('aria-label', st.label);
      b.style.left = `calc(8px + (100% - 16px) * ${st.t / period})`;
      b.addEventListener('click', () => jump(st.t)); return [st, b] as const;
    });
    const tb = bar()!;
    toggle(tb, 'work', (v) => ['work', v ? 'Showing all work: each move on its own line with its reason; click to replace the line instead' : 'Replacing the line move by move; click to show all work'], true, (v) => { opt.write = v; d.fig.classList.toggle('writing', v); d.fig.classList.toggle('inplace', !v); poke(); });
    /* a right click on the speed button lists every speed */
    const sp = tb.querySelector<HTMLElement>('.speed'); if (!sp) return;
    sp.addEventListener('contextmenu', (e) => {
      e.preventDefault(); tb.querySelector('.dv-menu')?.remove();
      const m = tb.appendChild(el('div', 'dv-menu')); m.style.left = `${sp.offsetLeft}px`;
      ['½×', '1×', '2×', '4×'].forEach((lab) => { const x = m.appendChild(el('button')); x.type = 'button'; x.textContent = lab; x.addEventListener('click', () => { for (let n = 0; n < 4 && sp.textContent !== lab; n += 1) sp.click(); m.remove(); }); });
      setTimeout(() => document.addEventListener('pointerdown', (ev) => { if (!m.contains(ev.target as Node)) m.remove(); }, { once: true }), 0);
    });
  }

  /* what a move rests on: each fact in its own hue (blue first), each result in yellow */
  const lightUses = (i: number, uses: readonly number[], alpha: number): void => {
    factsUsed(i, uses).forEach((x, g) => glow(FE[nodes[i]!.facts[x]!]!, alpha, `var(${USE[g % USE.length]})`));
    stepsUsed(i, uses).forEach((j) => glow(B[j]!.el, alpha));
  };

  /* a box's size eases toward what its content asks; a box at work takes its full width at once and then only grows downward */
  let settling = false, lastNow = 0, frameDt = 0;
  const settle = (X: Box, wide: boolean): void => {
    const body = X.body; body.style.width = ''; body.style.height = '';
    const w = wide ? Math.max(body.offsetWidth, X.max.bw) : body.offsetWidth, h = body.offsetHeight;
    if (!X.sz) { X.sz = { w, h }; return; }
    const a = 1 - Math.exp(-frameDt / 0.12);
    X.sz.w += (w - X.sz.w) * a; X.sz.h += (h - X.sz.h) * a;
    if (Math.abs(X.sz.w - w) < 0.5 && Math.abs(X.sz.h - h) < 0.5) { X.sz.w = w; X.sz.h = h; }
    else settling = true;
    body.style.width = wide || X.sz.w !== w ? `${X.sz.w.toFixed(1)}px` : ''; body.style.height = X.sz.h !== h ? `${X.sz.h.toFixed(1)}px` : '';
  };
  /* a box drawn from its state for the frame */
  const apply = (X: Box, S: State): void => {
    X.R.forEach((R, r) => {
      const v = S.vis[r] ?? 0, act = S.active === r;
      R.row.style.display = v <= 0 ? 'none' : '';
      if (v >= 1 || v <= 0) { R.row.style.height = ''; R.row.style.overflow = ''; }
      else { R.row.style.height = `${v * Math.max(R.eq.offsetHeight, R.why.offsetHeight)}px`; R.row.style.overflow = act ? 'visible' : 'hidden'; }
      const wa = S.whyA[r] ?? 0; R.why.style.opacity = String(wa); R.why.style.display = wa <= 0 ? 'none' : '';
      R.st.style.display = act ? 'none' : '';
      R.stage.style.display = act ? '' : 'none'; R.stage.style.transform = ''; if (!act) glow(stageOf(R), 0);
    });
    X.rows.style.opacity = String(S.rowsA ?? 1);
    if (X.note) X.note.style.display = S.note ? '' : 'none';
    X.cap.style.opacity = String(S.capA); if (!S.capA) X.cap.replaceChildren();
    X.body.style.overflow = S.open ? 'visible' : '';
    settle(X, S.wide);
  };
  /* a box's full size, every line and reason shown, read on the first frames while fonts settle */
  let measured = 0;
  const measure = (): void => {
    if (measured > 30) return; measured += 1;
    B.forEach((X) => {
      X.body.style.width = ''; X.body.style.height = '';
      X.R.forEach((R) => { R.row.style.display = ''; R.row.style.height = ''; R.why.style.display = R.why.childNodes.length ? '' : 'none'; R.why.style.opacity = '1'; });
      X.max = { w: X.el.offsetWidth, h: X.el.offsetHeight, bw: X.body.offsetWidth + 12 };
    });
  };

  function draw(): void {
    track(); measure();
    const now = performance.now(); frameDt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now; settling = false;
    const t = cy.now(), b = at(t), p = clamp((t - b.t0) / b.dur), k = ease(p), cur = b.node, rest = cur < 0;
    dots.forEach(([st, e]) => e.classList.toggle('at', st.node === cur));
    const later: (() => void)[] = [];   /* what reads screen positions waits for this frame's placement and camera */
    /* the whole stands at rest; play fades it to the step at work and its sources, and the end fades it back */
    const ref = rest ? (b.kind === 'back' ? order[order.length - 1]! : -1) : cur;
    const restK = b.kind === 'over' ? 1 : b.kind === 'back' ? k : b.t0 === glowStart.get(order[0]!) ? 1 - ease(p * 1.5) : 0;
    facts.forEach((f, fi) => {
      const c = FE[fi]!, seen = opt.reveal ? ease((t - factStart[fi]!) / BEAT.glow) : 1;
      c.style.opacity = String(Math.max(restK, f.users.includes(ref) ? 1 : DIM * seen)); c.style.background = ''; glow(c, 0);
    });
    nodes.forEach((nd, j) => {
      const X = B[j]!, proven = t >= bankEnd.get(j)!, work = j === cur, lastR = X.R.length - 1;
      X.el.classList.toggle('wait', work && b.kind === 'glow');
      X.el.style.opacity = String(Math.max(restK, work || proven || (ref >= 0 && nodes[ref]!.steps.includes(j)) ? 1 : opt.reveal ? 0 : DIM));
      glow(X.el, 0);
      const S: State = { vis: X.R.map((_, r) => (r === lastR ? 1 : 0)), whyA: X.R.map(() => 0), active: -1, note: false, capA: 0, wide: work };
      if (!work) {
        if (opt.write && proven && !rest) { S.vis.fill(1); S.whyA.fill(1); S.note = true; }
        if (opt.write && b.kind === 'back') { S.vis = S.vis.map((_, r) => (r === lastR ? 1 : 1 - k)); S.whyA.fill(1 - k); S.note = !!X.note && k < 0.5; }
        apply(X, S); return;
      }
      /* the box at work */
      const act = (r: number): number => (opt.write ? r : lastR);
      const upto = (r: number): void => { for (let x = 0; x <= r; x += 1) { S.vis[x] = 1; S.whyA[x] = 1; } };
      /* only the line the step starts from is lit, while it is carried in; the edges say the rest */
      const start = (g: number): void => { if (thenFrom[j]! >= 0) glow(B[thenFrom[j]!]!.el, g); else glow(FE[nd.thenFact]!, g, `var(${USE[0]})`); };
      if (b.kind === 'glow') { S.rowsA = 1 - k; apply(X, S); start(k); return; }
      if (b.kind === 'load') {
        S.vis.fill(0); S.vis[act(0)] = 1; S.active = act(0); S.open = true;
        if (opt.write) S.whyA[0] = ease((p - 0.5) / 0.5); else S.capA = ease((p - 0.5) / 0.5);
        apply(X, S); start(1 - ease((p - 0.6) / 0.4));
        const R = X.R[act(0)]!; morphAt(R.stage, L[j]![0]!, L[j]![0]!, 0, true);
        if (!opt.write && S.capA) captioned(X.cap, j, 0);
        later.push(() => flyFrom(R.stage, R.eq, thenEl(j).getBoundingClientRect(), k));
        return;
      }
      if (b.kind === 'holds') {
        S.vis.fill(0); upto(opt.write ? 0 : -1); S.vis[act(0)] = 1; S.active = act(0);
        if (opt.write) S.whyA[0] = 1; else S.capA = 1;
        apply(X, S);
        const R = X.R[act(0)]!; morphAt(R.stage, L[j]![0]!, L[j]![0]!, 0, true);
        const tt = p * b.dur; lightUses(j, N[j]!.then.uses, tt < 0.35 ? ease(tt / 0.35) : p > 0.8 ? 1 - ease((p - 0.8) / 0.2) : 1);
        if (!opt.write) captioned(X.cap, j, 0);
        return;
      }
      if (b.kind === 'result' || b.kind === 'bank') {
        S.vis.fill(0); upto(opt.write ? lastR : -1); S.vis[lastR] = 1; S.active = lastR; S.note = true;
        apply(X, S);
        morphAt(X.R[lastR]!.stage, L[j]![lastR]!, L[j]![lastR]!, 1, true);
        return;
      }
      /* a move: line r from line r - 1. Written out, a copy of line r - 1 drops into its new row with the terms about to
         change boxed (lead), then morphs there (move) and the boxes fade (land); replaced, the one line morphs in place */
      const r = b.step + 1, a = L[j]![r - 1]!, c = L[j]![r]!, s = N[j]!.steps[b.step]!, hi = moved(a, c);
      const km = b.kind === 'lead' ? 0 : b.kind === 'move' ? k : 1;
      const alpha = b.kind === 'lead' ? ease(p * 1.6) : b.kind === 'land' ? 1 - k : 1;
      S.vis.fill(0); S.active = act(r);
      if (opt.write) { upto(r - 1); S.vis[r] = b.kind === 'lead' ? k : 1; S.whyA[r] = b.kind === 'lead' ? ease((p - 0.4) / 0.6) : 1; }
      else { S.vis[lastR] = 1; S.capA = alpha; }
      apply(X, S);
      const R = X.R[act(r)]!;
      morphAt(R.stage, a, c, km, true, { hi, hiAlpha: alpha, ...(s.map ? { keyMap: s.map } : {}) });
      if (opt.write && b.kind === 'lead') later.push(() => { const dy = (X.R[r]!.row.getBoundingClientRect().top - X.R[r - 1]!.row.getBoundingClientRect().top) / cam.s; R.stage.style.transform = `translateY(${(-dy * (1 - k)).toFixed(2)}px)`; });
      if (!opt.write) captioned(X.cap, j, r);
      lightUses(j, s.uses, alpha);
    });
    place(); aim(b, p, cur); later.forEach((f) => f()); edges(cur);
    if (settling) requestAnimationFrame(poke);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 0.8), draw });
  new ResizeObserver(poke).observe(view);
  requestAnimationFrame(() => { if (playing()) bar()!.querySelector<HTMLElement>('.tbtn')!.click(); cy.tau = 0; poke(); });
  d.fig.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.transport')) requestAnimationFrame(poke); });
}
