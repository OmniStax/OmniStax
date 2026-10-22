<script lang="ts">
  /* The grapher: a list of rows, each an expression in the book's notation,
     and the plane they are drawn on. A curve is drawn honestly (lib/grapher/plot.ts):
     broken at its poles and jumps, its holes and ends marked. A letter no row
     defines becomes a slider once the row is entered. A curve may carry its
     tangent at a point and the area under it over [a, b], each with its
     number. The plane pans by dragging, zooms by the wheel, a pinch or its
     buttons, and keeps one scale on both axes; a point traces whichever curve
     the pointer is nearest, and dragging it moves the curve's tangent.

     The rows come from the address (?expr=, repeatable), from whatever a
     function card or a link asked for, else from the sheet's own file. */
  import { onMount, untrack } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { sheets } from '../../lib/sheets/store.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { colours } from '../../lib/colours/store.svelte';
  import { pickWrapped, referentHues, unnamedOrder } from '../../lib/colours/referents';
  import { figFor } from '../../lib/fig/figlib';
  import { compile, curveFn, freeLetters, functionNames, readRow, type Env, type Row } from '../../lib/grapher/expr';
  import { breakFns, fmt, integrate, pathOf, slopeAt, tickStep, ticks, traceCurve, traceEquation, type P, type Win } from '../../lib/grapher/plot';
  import type { GrapherSheetDTO } from '../../lib/content/sheets';
  import type { BookId } from '../../lib/types/ids';

  let { book, sheet }: { book: BookId; sheet: GrapherSheetDTO } = $props();

  type Item = { id: number; text: string; hidden: boolean; hue: number; tangent: number | null; area: [number, number] | null; min: number; max: number };
  let next = 0, hueNext = 0;
  const item = (text: string): Item => ({ id: next++, text, hidden: false, hue: /^\s*[a-zA-Z]\s*=\s*-?[\d.]+\s*$/.test(text) ? -1 : hueNext++, tangent: null, area: null, min: -10, max: 10 });
  let items = $state<Item[]>([]);

  /* ---------- reading the rows ---------- */
  const fns = $derived(functionNames(items.map((r) => r.text)));
  const reads = $derived(items.map((r) => readRow(r.text, fns)));
  const env = $derived.by((): Env => {
    const e: Env = { vars: {}, fns: {} };
    reads.forEach((r) => { if (r.kind === 'constant') e.vars[r.name] = compile(r.node)(e); });
    reads.forEach((r) => { if (r.kind === 'curve' && r.name) e.fns[r.name] = curveFn(r, e); });
    return e;
  });
  const fnOf = (r: Row): ((x: number) => number) | null => (r.kind === 'curve' ? curveFn(r, env) : null);
  /* Every letter the rows read and nothing defines gets a row of its own, a = 1, once a row is entered. */
  const commit = (): void => {
    const defined = new Set([...reads.flatMap((r) => (r.kind === 'constant' ? [r.name] : [])), ...fns]);
    const wanted = [...new Set(reads.flatMap((r) => freeLetters(r, defined)))];
    if (wanted.length) items = [...items, ...wanted.map((l) => item(`${l} = 1`))];
  };
  const load = (exprs: readonly string[], replace: boolean): void => {
    const have = new Set(items.map((r) => r.text.replace(/\s+/g, '')));
    const fresh = exprs.filter((e) => !have.has(e.replace(/\s+/g, '')));
    items = replace ? exprs.map(item) : [...items.filter((r) => r.text.trim() !== ''), ...fresh.map(item)];
    commit();
  };

  /* The address is read once, by the grapher the page was served for. */
  onMount(() => {
    const url = sheets.entry(book, sheet.id)?.url;
    const asked = url && location.pathname === url ? new URLSearchParams(location.search).getAll('expr') : [];
    untrack(() => load(asked.length ? asked : sheet.expressions.length ? sheet.expressions : [''], true));
  });
  $effect(() => { if (sheets.asked) { const got = sheets.take(book, sheet.id); if (got) untrack(() => load(got, false)); } });

  /* ---------- colour ---------- */
  /* the referent palette, farthest apart first, as a figure deals the things it tells apart that no row names */
  const hues = $derived(unnamedOrder(referentHues(colours.referents, colours.vision), [], 0, [], settings.dark, colours.vision));
  const hueOf = (r: Item): string => (r.hue < 0 || !settings.shown.refs ? 'var(--ink)' : pickWrapped(hues, r.hue));

  /* ---------- the plane ---------- */
  let W = $state(0), H = $state(0);
  let cx = $state(0), cy = $state(0), unit = $state(0.025);   /* the centre, and how many units one pixel is */
  const win = $derived<Win>({ x0: cx - (W / 2) * unit, x1: cx + (W / 2) * unit, y0: cy - (H / 2) * unit, y1: cy + (H / 2) * unit });
  const sx = (x: number): number => (x - win.x0) / unit, sy = (y: number): number => (win.y1 - y) / unit;
  const wx = (px: number): number => win.x0 + px * unit, wy = (py: number): number => win.y1 - py * unit;
  let fitted = false;
  $effect(() => { if (W > 0 && !fitted) { fitted = true; unit = 20 / W; } });
  const home = (): void => { cx = 0; cy = 0; unit = 20 / Math.max(W, 1); };
  const zoom = (k: number, px = W / 2, py = H / 2): void => {
    const x = wx(px), y = wy(py); const u = Math.min(1e3, Math.max(1e-6, unit * k));
    cx = x - (px - W / 2) * u; cy = y + (py - H / 2) * u; unit = u;
  };

  const step = $derived(tickStep(Math.max(win.x1 - win.x0, 1e-9), Math.max(2, W / 50)));
  const xticks = $derived(W > 0 ? ticks(win.x0, win.x1, step) : []);
  const yticks = $derived(H > 0 ? ticks(win.y0, win.y1, step) : []);
  const label = (v: number): string => fmt(Number(v.toPrecision(12)), 6);
  /* the axes' labels stay on the plane when an axis is off it */
  const ax = $derived(Math.min(W - 4, Math.max(4, sx(0)))), ay = $derived(Math.min(H - 18, Math.max(14, sy(0))));

  type Drawn = { readonly item: Item; readonly row: Row; readonly f: ((x: number) => number) | null; readonly d: string; readonly marks: readonly { x: number; y: number; open: boolean }[] };
  const drawn = $derived.by((): readonly Drawn[] => {
    if (W === 0 || H === 0) return [];
    return items.flatMap((it, i): Drawn[] => {
      const row = reads[i]; if (it.hidden || !row) return [];
      if (row.kind === 'curve') {
        const f = curveFn(row, env); const t = traceCurve(f, breakFns(row.node, row.arg, env), win, W);
        return [{ item: it, row, f, d: pathOf(t.pieces, win, W, H), marks: t.marks }];
      }
      if (row.kind === 'equation') {
        const F = compile(row.node); const e: Env = { vars: { ...env.vars }, fns: env.fns };
        const segs = traceEquation((x, y) => { e.vars.x = x; e.vars.y = y; return F(e); }, win, Math.ceil(W / 5), Math.ceil(H / 5));
        return [{ item: it, row, f: null, d: pathOf(segs, win, W, H), marks: [] }];
      }
      return [];
    });
  });
  /* The area under a curve over [a, b], as the shape between it and the axis, broken where the curve is. */
  const areaPath = (f: (x: number) => number, a: number, b: number): string => {
    const lo = Math.max(Math.min(a, b), win.x0 - (win.x1 - win.x0)), hi = Math.min(Math.max(a, b), win.x1 + (win.x1 - win.x0));
    if (!(hi > lo)) return '';
    const n = 400; const runs: P[][] = []; let cur: P[] = [];
    const clamp = (y: number): number => Math.min(win.y1 + (win.y1 - win.y0), Math.max(win.y0 - (win.y1 - win.y0), y));
    for (let i = 0; i <= n; i++) { const x = lo + ((hi - lo) * i) / n, y = f(x); if (Number.isFinite(y)) cur.push([x, clamp(y)]); else { if (cur.length > 1) runs.push(cur); cur = []; } }
    if (cur.length > 1) runs.push(cur);
    return runs.map((r) => `${pathOf([[[r[0][0], 0], ...r, [r[r.length - 1][0], 0]]], win, W, H)}Z`).join('');
  };

  /* ---------- pointer ---------- */
  let svg = $state<SVGSVGElement | null>(null);
  let trace = $state<{ id: number; x: number } | null>(null);
  type Drag = { kind: 'pan'; px: number; py: number; cx: number; cy: number } | { kind: 'trace'; id: number } | { kind: 'end'; id: number; end: 0 | 1 };
  let drag: Drag | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: { d: number; unit: number } | null = null;
  const local = (e: PointerEvent | WheelEvent): { x: number; y: number } => { const r = svg!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const nearest = (px: number, py: number): { id: number; x: number } | null => {
    const x = wx(px); let best: { id: number; x: number; d: number } | null = null;
    for (const c of drawn) { if (!c.f) continue; const y = c.f(x); const d = Math.abs(sy(y) - py); if (Number.isFinite(d) && d < 16 && (!best || d < best.d)) best = { id: c.item.id, x, d }; }
    return best && { id: best.id, x: best.x };
  };
  const endAt = (px: number, py: number): { id: number; end: 0 | 1 } | null => {
    for (const c of drawn) { const a = c.item.area; if (!a) continue; for (const k of [0, 1] as const) if (Math.abs(sx(a[k]) - px) < 9 && Math.abs(sy(0) - py) < 14) return { id: c.item.id, end: k }; }
    return null;
  };
  const byId = (id: number): Item | undefined => items.find((r) => r.id === id);
  const onDown = (e: PointerEvent): void => {
    const p = local(e); pointers.set(e.pointerId, p); svg?.setPointerCapture(e.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), unit }; drag = null; return; }
    const end = endAt(p.x, p.y); const t = end ? null : nearest(p.x, p.y);
    drag = end ? { kind: 'end', ...end } : t ? { kind: 'trace', id: t.id } : { kind: 'pan', px: p.x, py: p.y, cx, cy };
    if (t) { trace = t; const it = byId(t.id); if (it && it.tangent !== null) it.tangent = t.x; }
  };
  const onMove = (e: PointerEvent): void => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 0) zoom((pinch.unit * pinch.d) / d / unit, (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    if (!drag) { trace = nearest(p.x, p.y); return; }
    if (drag.kind === 'pan') { cx = drag.cx - (p.x - drag.px) * unit; cy = drag.cy + (p.y - drag.py) * unit; return; }
    const it = byId(drag.id); if (!it) return;
    const x = Math.round(wx(p.x) / (unit * 2)) * unit * 2;
    if (drag.kind === 'trace') { trace = { id: it.id, x: wx(p.x) }; if (it.tangent !== null) it.tangent = wx(p.x); return; }
    if (it.area) it.area = drag.end === 0 ? [x, it.area[1]] : [it.area[0], x];
  };
  const onUp = (e: PointerEvent): void => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; drag = null; };
  const onLeave = (): void => { if (!drag) trace = null; };
  onMount(() => {
    const el = svg; if (!el) return;
    const onWheel = (e: WheelEvent): void => { e.preventDefault(); const p = local(e); zoom(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), p.x, p.y); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const onKey = (e: KeyboardEvent): void => {
    const pan = 40 * unit;
    if (e.key === 'ArrowLeft') cx -= pan; else if (e.key === 'ArrowRight') cx += pan;
    else if (e.key === 'ArrowUp') cy += pan; else if (e.key === 'ArrowDown') cy -= pan;
    else if (e.key === '+' || e.key === '=') zoom(1 / 1.25); else if (e.key === '-') zoom(1.25);
    else return;
    e.preventDefault();
  };

  const traced = $derived.by(() => {
    const t = trace; if (!t) return null;
    const c = drawn.find((d) => d.item.id === t.id); const y = c?.f ? c.f(t.x) : NaN;
    return c && Number.isFinite(y) ? { x: t.x, y, colour: hueOf(c.item) } : null;
  });

  /* ---------- the rows' own numbers ---------- */
  const nameOf = (r: Row): string => (r.kind === 'curve' && r.name ? r.name : 'f');
  const tangentOf = (c: Drawn): { x0: number; y0: number; m: number } | null => {
    if (!c.f || c.item.tangent === null) return null; const x0 = c.item.tangent, y0 = c.f(x0), m = slopeAt(c.f, x0);
    return Number.isFinite(y0) && Number.isFinite(m) ? { x0, y0, m } : null;
  };
  const tex = (node: HTMLElement, s: string) => { figFor(book).tex(node, s); return { update(n: string) { figFor(book).tex(node, n); } }; };
  const n = (v: number): string => fmt(v).replace('−', '-').replace(/e([+-]?)(\d+)/, '\\times 10^{$1$2}');
  const readoutOf = (it: Item, r: Row): string[] => {
    const f = fnOf(r); if (!f) return [];
    const name = nameOf(r); const out: string[] = [];
    if (it.tangent !== null) { const x0 = it.tangent, m = slopeAt(f, x0); out.push(`${name}'(${n(x0)}) \\approx ${Number.isFinite(m) ? n(m) : `\\text{${i18n.t('sheets.grapher.undefined')}}`}`); }
    if (it.area) { const [a, b] = it.area, v = integrate(f, a, b), tiny = Math.abs(v) < 1e-10 * Math.max(1, Math.abs(b - a)); out.push(`\\int_{${n(a)}}^{${n(b)}} ${name}(x)\\,dx ${Number.isFinite(v) ? `\\approx ${tiny ? '0' : n(v)}` : `\\text{ ${i18n.t('sheets.grapher.isUndefined')}}`}`); }
    return out;
  };

  const remove = (id: number): void => { items = items.filter((r) => r.id !== id); if (items.length === 0) items = [item('')]; };
  const add = (): void => { items = [...items, item('')]; };
  const toggleTangent = (it: Item): void => { it.tangent = it.tangent === null ? (trace?.id === it.id ? trace.x : cx) : null; };
  const toggleArea = (it: Item): void => { const a = Number((Math.round(cx / step) * step).toPrecision(6)); it.area = it.area === null ? [a, Number((a + step).toPrecision(6))] : null; };
  const num = (v: string, fallback: number): number => { const x = Number(v); return Number.isFinite(x) ? x : fallback; };
</script>

<div class="grapher">
  <header><h1>{sheet.title}</h1></header>
  <div class="body">
    <div class="list">
      <ol class="rows">
        {#each items as it, i (it.id)}
          {@const r = reads[i]}
          <li class="row" class:bad={r?.kind === 'error'} style:--hue={hueOf(it)}>
            {#if r?.kind === 'curve' || r?.kind === 'equation'}
              <button type="button" class="swatch" class:off={it.hidden} aria-pressed={!it.hidden} aria-label={it.hidden ? i18n.t('sheets.grapher.showRow', { n: i + 1 }) : i18n.t('sheets.grapher.hideRow', { n: i + 1 })} onclick={() => (it.hidden = !it.hidden)}></button>
            {:else}<span class="swatch none"></span>{/if}
            <div class="main">
              <input type="text" spellcheck="false" autocomplete="off" aria-label={i18n.t('sheets.grapher.expression', { n: i + 1 })} bind:value={it.text} onchange={commit} onkeydown={(e) => { if (e.key === 'Enter') { commit(); if (i === items.length - 1 && it.text.trim()) add(); } }} />
              {#if r?.kind === 'error'}<p class="err">{r.message}</p>
              {:else if r && r.kind !== 'empty'}<div class="preview" use:tex={`\\displaystyle ${r.tex}`}></div>{/if}
              {#if r?.kind === 'constant' && r.slider}
                {@const v = env.vars[r.name] ?? 0}
                <div class="slider">
                  <input type="number" class="bound" aria-label={i18n.t('sheets.grapher.least', { name: r.name })} step="any" value={it.min} onchange={(e) => (it.min = num(e.currentTarget.value, it.min))} />
                  <input type="range" aria-label={r.name} min={Math.min(it.min, v)} max={Math.max(it.max, v)} step={(it.max - it.min) / 200} value={v} oninput={(e) => (it.text = `${r.name} = ${Number(Number(e.currentTarget.value).toPrecision(4))}`)} />
                  <input type="number" class="bound" aria-label={i18n.t('sheets.grapher.greatest', { name: r.name })} step="any" value={it.max} onchange={(e) => (it.max = num(e.currentTarget.value, it.max))} />
                </div>
              {/if}
              {#if r?.kind === 'curve'}
                <div class="tools">
                  <button type="button" aria-pressed={it.tangent !== null} onclick={() => toggleTangent(it)}>{i18n.t('sheets.grapher.tangent')}</button>
                  <button type="button" aria-pressed={it.area !== null} onclick={() => toggleArea(it)}>{i18n.t('sheets.grapher.area')}</button>
                  {#if it.tangent !== null}<label>x₀ <input type="number" step="any" value={Number(it.tangent.toPrecision(5))} onchange={(e) => (it.tangent = num(e.currentTarget.value, it.tangent ?? 0))} /></label>{/if}
                  {#if it.area}{@const ab = it.area}
                    <label>a <input type="number" step="any" value={ab[0]} onchange={(e) => (it.area = [num(e.currentTarget.value, ab[0]), ab[1]])} /></label>
                    <label>b <input type="number" step="any" value={ab[1]} onchange={(e) => (it.area = [ab[0], num(e.currentTarget.value, ab[1])])} /></label>
                  {/if}
                </div>
                {#each readoutOf(it, r) as line (line)}<div class="out" use:tex={line}></div>{/each}
              {/if}
            </div>
            <button type="button" class="x" aria-label={i18n.t('sheets.grapher.removeRow', { n: i + 1 })} onclick={() => remove(it.id)}>×</button>
          </li>
        {/each}
      </ol>
      <button type="button" class="add" onclick={add}>{i18n.t('sheets.grapher.add')}</button>
    </div>

    <div class="stage" bind:clientWidth={W} bind:clientHeight={H}>
      <svg bind:this={svg} width={W} height={H} viewBox="0 0 {W} {H}" role="application" aria-label={i18n.t('sheets.grapher.plane')} tabindex="0"
        onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} onpointerleave={onLeave} onkeydown={onKey}>
        <g class="grid">
          {#each xticks as v (v)}<line x1={sx(v)} x2={sx(v)} y1="0" y2={H} />{/each}
          {#each yticks as v (v)}<line x1="0" x2={W} y1={sy(v)} y2={sy(v)} />{/each}
        </g>
        <g class="axes">
          {#if win.y0 < 0 && win.y1 > 0}<line x1="0" x2={W} y1={sy(0)} y2={sy(0)} />{/if}
          {#if win.x0 < 0 && win.x1 > 0}<line x1={sx(0)} x2={sx(0)} y1="0" y2={H} />{/if}
        </g>
        <g class="labels">
          {#each xticks as v (v)}{#if v !== 0}<text x={sx(v)} y={ay + 14} text-anchor="middle">{label(v)}</text>{/if}{/each}
          {#each yticks as v (v)}{#if v !== 0}<text x={ax > W - 40 ? ax - 5 : ax + 5} y={sy(v) + 4} text-anchor={ax > W - 40 ? 'end' : 'start'}>{label(v)}</text>{/if}{/each}
          {#if win.x0 < 0 && win.x1 > 0 && win.y0 < 0 && win.y1 > 0}<text x={sx(0) - 5} y={sy(0) + 14} text-anchor="end">0</text>{/if}
        </g>
        {#each drawn as c (c.item.id)}
          {#if c.f && c.item.area}<path class="area" style:fill={hueOf(c.item)} d={areaPath(c.f, c.item.area[0], c.item.area[1])} />{/if}
        {/each}
        {#each drawn as c (c.item.id)}
          {@const tg = tangentOf(c)}
          <path class="curve" style:stroke={hueOf(c.item)} d={c.d} />
          {#if tg}
            <line class="tangent" style:stroke={hueOf(c.item)} x1={sx(win.x0)} y1={sy(tg.y0 + tg.m * (win.x0 - tg.x0))} x2={sx(win.x1)} y2={sy(tg.y0 + tg.m * (win.x1 - tg.x0))} />
            <circle class="point" style:fill={hueOf(c.item)} cx={sx(tg.x0)} cy={sy(tg.y0)} r="5" />
          {/if}
          {#if c.item.area}{#each c.item.area as a, k (k)}<line class="handle" style:stroke={hueOf(c.item)} x1={sx(a)} x2={sx(a)} y1={sy(0) - 10} y2={sy(0) + 10} />{/each}{/if}
          {#each c.marks as m, k (k)}<circle class="mark" class:open={m.open} style:stroke={hueOf(c.item)} style:fill={m.open ? null : hueOf(c.item)} cx={sx(m.x)} cy={sy(m.y)} r="4" />{/each}
        {/each}
        {#if traced}
          <circle class="trace" style:fill={traced.colour} cx={sx(traced.x)} cy={sy(traced.y)} r="5" />
          <text class="coords" x={Math.min(W - 6, sx(traced.x) + 10)} y={Math.max(16, sy(traced.y) - 10)} text-anchor={sx(traced.x) + 140 > W ? 'end' : 'start'}>({fmt(traced.x)}, {fmt(traced.y)})</text>
        {/if}
      </svg>
      <div class="zoom">
        <button type="button" aria-label={i18n.t('sheets.grapher.zoomIn')} onclick={() => zoom(1 / 1.5)}>+</button>
        <button type="button" aria-label={i18n.t('sheets.grapher.zoomOut')} onclick={() => zoom(1.5)}>−</button>
        <button type="button" aria-label={i18n.t('sheets.grapher.home')} onclick={home}><svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /></svg></button>
      </div>
    </div>
  </div>
</div>

<style>
  .grapher{font-family:var(--sans);container-type:inline-size;display:flex;flex-direction:column;min-height:calc(100vh - 160px)}
  header h1{margin:0 0 12px;font-size:1.35rem}
  .body{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:14px;flex:1;min-height:420px}
  .list{display:flex;flex-direction:column;gap:8px;min-width:0}
  .rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;border:1px solid var(--rule);border-radius:6px;background:var(--panel)}
  .row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;padding:8px 8px 8px 10px;border-bottom:1px solid var(--rule)}
  .row:last-child{border-bottom:0}
  .swatch{width:16px;height:16px;margin-top:6px;border-radius:50%;border:2px solid var(--hue);background:var(--hue);cursor:pointer;padding:0}
  .swatch.off{background:transparent}
  .swatch.none{border-color:transparent;background:transparent;cursor:default}
  .swatch:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .main{display:flex;flex-direction:column;gap:4px;min-width:0}
  .main input[type="text"]{font-family:var(--mono);font-size:0.85rem;color:var(--ink);background:var(--bg);border:1px solid var(--rule);border-radius:5px;padding:5px 7px;width:100%;box-sizing:border-box}
  .main input[type="text"]:focus{outline:2px solid var(--accent);outline-offset:-1px}
  .row.bad input[type="text"]{border-color:var(--bad)}
  .err{margin:0;font-size:0.75rem;color:var(--bad)}
  .preview,.out{font-family:var(--figure);font-size:0.95rem;color:var(--ink);overflow-x:auto;overflow-y:hidden}
  .out{font-size:0.88rem;color:var(--muted)}
  .slider{display:grid;grid-template-columns:52px 1fr 52px;gap:6px;align-items:center}
  .slider input[type="range"]{width:100%;min-width:120px;accent-color:var(--accent)}
  .bound,.tools input{font:inherit;font-family:var(--figure);font-size:0.78rem;width:100%;box-sizing:border-box;padding:2px 4px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink)}
  .tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:0.76rem;color:var(--muted)}
  .tools label{display:inline-flex;align-items:center;gap:4px;font-family:var(--figure)}
  .tools input{width:64px}
  .tools button,.add{font:inherit;font-size:0.76rem;font-weight:600;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .tools button[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 14%,var(--panel));border-color:var(--accent);color:var(--accent)}
  .tools button:hover,.add:hover{background:var(--soft)}
  .add{align-self:flex-start;color:var(--accent)}
  .x{width:22px;height:22px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;line-height:1;margin-top:3px}
  .x:hover{background:var(--soft);color:var(--ink)}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

  .stage{position:relative;isolation:isolate;min-width:0;min-height:420px;border:1px solid var(--rule);border-radius:6px;background:var(--bg);overflow:hidden}
  .stage > svg{position:absolute;inset:0;display:block;touch-action:none;cursor:grab;user-select:none}
  .stage > svg:active{cursor:grabbing}
  .stage > svg:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .grid line{stroke:var(--rule);stroke-width:1}
  .axes line{stroke:var(--muted);stroke-width:1.5}
  .labels text,.coords{font-family:var(--figure);font-size:12px;fill:var(--muted)}
  .coords{font-size:13px;fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round}
  .curve{fill:none;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
  .area{opacity:0.2;stroke:none}
  .tangent{stroke-width:1.5;stroke-dasharray:6 5}
  .handle{stroke-width:3;stroke-linecap:round;cursor:ew-resize}
  .mark{stroke-width:2}
  .mark.open{fill:var(--bg)}
  .point,.trace{stroke:var(--bg);stroke-width:2}
  .zoom{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px}
  .zoom button{width:30px;height:30px;display:grid;place-items:center;font:inherit;font-size:1rem;font-weight:600;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer;padding:0}
  .zoom button:hover{background:var(--soft)}
  .zoom svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
  @container (max-width:700px){ .body{grid-template-columns:1fr} .stage{min-height:360px} }
</style>
