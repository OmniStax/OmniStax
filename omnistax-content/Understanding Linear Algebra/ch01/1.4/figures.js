/* Figures for section 1.4 Pivots and their influence on solution spaces. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.4'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, line, text, headline, register, hover, tex } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅'];
const xs = (j) => `x${SUB[j]}`;                      /* x₂ in page text */
const list = (a) => (a.length <= 1 ? a.join('') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/* Sim: the shape of a reduced row echelon augmented matrix, and what it says about the solution space.
   m equations (rows) and n variables (coefficient columns), both 1 to 5, and a set P of at most m columns
   that carry a pivot, among x₁ … xₙ and the rightmost column. The pivots sit in rows 1, 2, … in column
   order, as a reduced row echelon matrix has them; every other entry is what the shape forces: 0 left of a
   pivot and in a pivot's column, ∗ right of a pivot in a column without one, 0 throughout a row with no pivot.
   Each row is written as an equation beside the matrix, so a pivot in the rightmost column shows as 0 = 1
   and a free variable as a ∗ term. The reader picks P from a select or by clicking a column; a click drives
   the select so a note stores the state. Defaults m = 4, n = 3, P = {1, 3, rightmost}: the matrix the text
   prints after Activity 1.4.2. Still: a shape has no clock; a change crossfades the entries that differ. */
(function () {
  const d = sim('sim-pivots', 600);
  const CW = 76, RH = 66, X0 = 230, YC = 372, EQX = 820;
  const B = 'b';                                        /* the rightmost column's key */
  const parse = (v) => (v === 'none' ? [] : v.split(','));
  const key = (P) => (P.length ? P.join(',') : 'none');
  const label = (P) => (P.length ? P.map((c) => (c === B ? 'rightmost' : xs(+c))).join(', ') : 'none');
  /* every set of at most m columns among 1 … n and b, by size then in column order */
  function optionsFor(m, n) {
    const cols = [...Array.from({ length: n }, (_, j) => String(j + 1)), B], out = [];
    const rec = (i, P) => { if (i === cols.length) { if (P.length <= m) out.push(P.slice()); return; } rec(i + 1, P); P.push(cols[i]); rec(i + 1, P); P.pop(); };
    rec(0, []);
    out.sort((a, b2) => a.length - b2.length || cols.indexOf(a[0]) - cols.indexOf(b2[0]) || a.join().localeCompare(b2.join()));
    return out.map((P) => ({ value: key(P), label: label(P) }));
  }
  /* the set trimmed to a new shape: columns past n dropped, then the rightmost ones beyond m */
  const trim = (P, m, n) => { const q = P.filter((c) => c === B || +c <= n); while (q.length > m) q.splice(q.length - (q[q.length - 1] === B ? 2 : 1), 1); return q; };
  let pick = null;
  const m = ctl(d.controls, { label: '\\text{equations}', cls: '', key: 'm', min: 1, max: 5, step: 1, value: 4, unit: '', dec: 0, aria: 'the number of equations, the rows of the augmented matrix', onInput: reshape });
  const n = ctl(d.controls, { label: '\\text{variables}', cls: '', key: 'n', min: 1, max: 5, step: 1, value: 3, unit: '', dec: 0, aria: 'the number of variables, the columns of the coefficient matrix', onInput: reshape });
  pick = select(d.controls, { label: '\\text{pivot columns}', key: 'pivots', options: optionsFor(4, 3), value: '1,3,b', aria: 'the columns that carry a pivot position', onInput: changed });
  function reshape() { const P = trim(parse(pick.value), m.v, n.v); pick.options(optionsFor(m.v, n.v), key(P)); changed(); }
  /* the crossfade from the last shape to this one */
  const tw = F.tween(d, 1);
  let prev = null, shown = null;
  function changed() { if (shown) { prev = shown; tw.set(0); tw.to(1, 500); } }
  const fx = document.createElement('div'), note = document.createElement('small');
  d.readout.append(fx, note);
  let hits = [];
  hover(d.stage, () => hits);

  /* the shape: for each row its pivot column (a number, 'b', or null), and each cell's symbol */
  function shape(m0, n0, P) {
    const cols = [...Array.from({ length: n0 }, (_, j) => String(j + 1)), B];
    const piv = cols.filter((c) => P.includes(c));            /* in column order */
    const rowOf = Array.from({ length: m0 }, (_, i) => piv[i] ?? null);
    const col = (c) => cols.indexOf(c);
    const cell = (i, j) => {                                   /* j = 0 … n0, n0 the rightmost column */
      const p = rowOf[i]; if (p === null) return '0';
      const pj = col(p); if (j === pj) return '1';
      if (j < pj) return '0';
      return P.includes(cols[j]) ? '0' : '∗';
    };
    return { cols, piv, rowOf, cell, col };
  }
  function geometry(m0, n0) {
    const W = (n0 + 1) * CW, top = YC - (m0 * RH) / 2;
    return { W, top, cx: (j) => X0 + (j + 0.5) * CW, cy: (i) => top + (i + 0.5) * RH, bar: X0 + n0 * CW };
  }
  function equation(S, i, n0) {
    const p = S.rowOf[i]; if (p === null) return '0 = 0';
    if (p === B) return '0 = 1';
    const pj = +p, free = [];
    for (let j = pj + 1; j <= n0; j++) if (!S.piv.includes(String(j))) free.push(`∗x_${j}`);
    return `x_${pj}${free.map((f) => ` + ${f}`).join('')} = ${S.piv.includes(B) ? '0' : '∗'}`;
  }

  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const m0 = Math.round(m.v), n0 = Math.round(n.v), P = parse(pick.value);
    const S = shape(m0, n0, P), G = geometry(m0, n0), k = F.ease.smooth(tw.v);
    const cur = { m: m0, n: n0, P }; shown = cur;
    const old = prev && k < 1 ? { S: shape(prev.m, prev.n, prev.P), m: prev.m, n: prev.n } : null;
    hits = [];
    /* the brackets and the augmentation bar */
    const L = X0 - 16, R = X0 + G.W + 16, T = G.top - 10, Bt = G.top + m0 * RH + 10;
    ctx.save(); ctx.strokeStyle = mc; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L + 14, T); ctx.lineTo(L, T); ctx.lineTo(L, Bt); ctx.lineTo(L + 14, Bt); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R - 14, T); ctx.lineTo(R, T); ctx.lineTo(R, Bt); ctx.lineTo(R - 14, Bt); ctx.stroke();
    ctx.restore();
    line(ctx, G.bar, T + 4, G.bar, Bt - 4, alpha(mc, 0.7), 2);
    /* column names above, basic or free below */
    for (let j = 0; j <= n0; j++) {
      const name = j < n0 ? `x_${j + 1}` : 'rightmost';
      text(ctx, name, G.cx(j), G.top - 30, j < n0 ? ink : mu, { size: j < n0 ? 24 : 18, weight: 600, align: 'center' });
      if (j < n0) {
        const has = P.includes(String(j + 1));
        text(ctx, has ? 'basic' : 'free', G.cx(j), Bt + 26, has ? mc : mu, { size: 17, align: 'center' });
        const room = has || P.length < m0;
        hits.push({ x: G.cx(j), y: G.top - 30, r: 24, name: has ? `${xs(j + 1)}: a pivot in this column, so ${xs(j + 1)} is a basic variable; click to take the pivot away` : room ? `${xs(j + 1)}: no pivot in this column, so ${xs(j + 1)} is a free variable; click to place one` : `${xs(j + 1)}: no pivot, so ${xs(j + 1)} is free; no row is left to hold another pivot` });
      } else {
        const has = P.includes(B), room = has || P.length < m0;
        hits.push({ x: G.cx(j), y: G.top - 30, r: 34, name: has ? 'the rightmost column of the augmented matrix: its pivot makes a row say 0 = 1; click to take it away' : room ? 'the rightmost column of the augmented matrix: no pivot here, so no row says 0 = 1; click to place one' : 'the rightmost column: no pivot, and no row is left to hold one' });
      }
    }
    /* the entries: a cell both shapes share is drawn once; the rest crossfade */
    const glyph = (s, x, y, a) => {
      if (!(a > 0.01)) return;
      ctx.save(); ctx.globalAlpha *= a;
      if (s === '1') {
        ctx.fillStyle = alpha(mc, 0.16); ctx.fillRect(x - CW / 2 + 6, y - RH / 2 + 6, CW - 12, RH - 12);
        text(ctx, '1', x, y, mc, { size: 30, weight: 700, align: 'center' });
      } else text(ctx, s, x, y, s === '0' ? mu : ink, { size: s === '0' ? 26 : 30, weight: s === '0' ? 400 : 600, align: 'center' });
      ctx.restore();
    };
    const rows = Math.max(m0, old ? old.m : 0), colsN = Math.max(n0, old ? old.n : 0);
    for (let i = 0; i < rows; i++) for (let j = 0; j <= colsN; j++) {
      const now = i < m0 && j <= n0 ? S.cell(i, j) : null;
      const was = old && i < old.m && j <= old.n ? old.S.cell(i, j) : null;
      const x = G.cx(j), y = G.cy(i);
      if (now !== null && now === was) glyph(now, x, y, 1);
      else { if (was !== null) glyph(was, x, y, 1 - k); if (now !== null) glyph(now, x, y, old ? k : 1); }
    }
    /* hover names on the cells */
    for (let i = 0; i < m0; i++) for (let j = 0; j <= n0; j++) {
      const s = S.cell(i, j), p = S.rowOf[i], here = j < n0 ? `column ${j + 1}` : 'the rightmost column';
      let name;
      if (s === '1') name = j < n0 ? `pivot position: row ${i + 1}, column ${j + 1}, the leading entry of row ${i + 1}; ${xs(j + 1)} is basic` : `pivot position: row ${i + 1}, the rightmost column, so row ${i + 1} says 0 = 1`;
      else if (s === '∗') name = j < n0 ? `∗: any number; ${here} carries no pivot, so ${xs(j + 1)} is free` : `∗: any number, the right-hand side of equation ${i + 1}`;
      else if (p === null) name = `0: row ${i + 1} has no pivot, so every entry in it is 0`;
      else if (j < S.col(p)) name = `0: row ${i + 1}'s leading entry is further right`;
      else name = `0: ${here} holds a pivot, which clears the rest of its column`;
      hits.push({ x: G.cx(j), y: G.cy(i), r: 26, name });
    }
    /* each row as an equation */
    text(ctx, 'each row as an equation', EQX, G.top - 30, mu, { size: 18, weight: 600 });
    for (let i = 0; i < rows; i++) {
      const now = i < m0 ? equation(S, i, n0) : null, was = old && i < old.m ? equation(old.S, i, old.n) : null;
      const y = G.cy(i), col = (e) => (e === '0 = 1' ? mc : ink);
      const put = (e, a) => { if (!(a > 0.01) || e === null) return; ctx.save(); ctx.globalAlpha *= a; text(ctx, e, EQX, y, col(e), { size: 24, weight: 600 }); ctx.restore(); };
      if (now !== null && now === was) put(now, 1); else { put(was, 1 - k); put(now, old ? k : 1); }
      if (now !== null) hits.push({ x: EQX + 90, y, r: 30, name: now === '0 = 1' ? `equation ${i + 1}: 0 = 1 cannot hold for any values of the variables` : now === '0 = 0' ? `equation ${i + 1}: 0 = 0 always holds and has no effect on the solution space` : `equation ${i + 1}, read from row ${i + 1}: its basic variable in terms of the free ones` });
    }
    /* the verdict */
    const freeCols = Array.from({ length: n0 }, (_, j) => j + 1).filter((j) => !P.includes(String(j)));
    const bad = P.includes(B), badRow = bad ? S.rowOf.indexOf(B) + 1 : 0;
    const who = (js) => list(js.map((j) => `$x_${j}$`)), whoT = (js) => list(js.map((j) => `$x_${j}$`));
    const count = `${m0} equation${m0 > 1 ? 's' : ''} in ${n0} variable${n0 > 1 ? 's' : ''}`;
    let head, verdict;
    if (bad) { head = `${count}: a pivot in the rightmost column, so row ${badRow} says $0 = 1$ and the system is inconsistent.`; verdict = 'A pivot in the rightmost column: the system is inconsistent.'; }
    else if (!freeCols.length) { head = `${count}: no pivot in the rightmost column and one in every column of the coefficient matrix, so the system is consistent with a unique solution.`; verdict = 'No pivot in the rightmost column, and one in every column of the coefficient matrix: consistent, with a unique solution.'; }
    else { head = `${count}: no pivot in the rightmost column, and ${who(freeCols)} ${freeCols.length > 1 ? 'have' : 'has'} none either, so the system is consistent with infinitely many solutions.`; verdict = `No pivot in the rightmost column, so the system is consistent; ${freeCols.length > 1 ? 'columns' : 'column'} ${list(freeCols.map(String))} of the coefficient matrix ${freeCols.length > 1 ? 'have' : 'has'} none, so there are infinitely many solutions.`; }
    headline(ctx, head);
    /* the readout: the matrix as the shape writes it, the pivots in the matrix hue */
    const body = Array.from({ length: m0 }, (_, i) => Array.from({ length: n0 + 1 }, (_, j) => { const s = S.cell(i, j); return s === '1' ? '\\htmlClass{kv-matrix}{\\mathbf{1}}' : s === '∗' ? '*' : '0'; }).join(' & ')).join(' \\\\ ');
    tex(fx, `\\left[ \\begin{array}{${'c'.repeat(n0)}|c} ${body} \\end{array} \\right]`, true, { values: false });
    const basic = Array.from({ length: n0 }, (_, j) => j + 1).filter((j) => P.includes(String(j)));
    const vars = bad ? '' : ` ${basic.length ? `${whoT(basic)} ${basic.length > 1 ? 'are' : 'is'} basic` : 'No variable is basic'}${freeCols.length ? `${basic.length ? ' and ' : '; '}${whoT(freeCols)} ${freeCols.length > 1 ? 'are' : 'is'} free.` : '.'}`;
    const said = verdict + vars;
    if (note.dataset.said !== said) { note.dataset.said = said; note.innerHTML = said; if (F.renderMath) F.renderMath(note); }
  }
  /* a click on a column places or removes its pivot, through the select */
  d.c.addEventListener('pointerdown', (e) => {
    const r = d.c.getBoundingClientRect(); if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * 1400, y = ((e.clientY - r.top) / r.height) * 600;
    const m0 = Math.round(m.v), n0 = Math.round(n.v), G = geometry(m0, n0);
    if (x < X0 || x > X0 + G.W || y < G.top - 50 || y > G.top + m0 * RH + 40) return;
    const j = Math.floor((x - X0) / CW), c = j < n0 ? String(j + 1) : B;
    const P = parse(pick.value), has = P.includes(c);
    if (!has && P.length >= m0) return;
    const next = P.filter((q) => q !== B && q !== c);
    if (!has && c !== B) next.push(c);
    next.sort((a, b2) => +a - +b2);
    if (c === B ? !has : P.includes(B)) next.push(B);
    e.preventDefault(); pick.drive(key(next));
  });
  still(d, draw);
})();
};
