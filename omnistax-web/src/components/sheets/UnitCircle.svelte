<script lang="ts">
  /* The unit circle: the reader turns the angle θ by its point on the circle or
     along either graph, and the circle shows cos θ as the run along the x-axis and
     sin θ as the rise to the point, each in the colour its graph wears beside it.
     At a special angle (the sheet's own list) the point snaps and the values are
     the exact ones the book prints; elsewhere they are decimals. */
  import { settings } from '../../lib/settings/store.svelte';
  import { colours } from '../../lib/colours/store.svelte';
  import { pickWrapped, referentHues, unnamedOrder } from '../../lib/colours/referents';
  import { figFor } from '../../lib/fig/figlib';
  import { fmt } from '../../lib/grapher/plot';
  import type { UnitCircleSheetDTO } from '../../lib/content/sheets';
  import type { BookId } from '../../lib/types/ids';

  let { book, sheet }: { book: BookId; sheet: UnitCircleSheetDTO } = $props();

  const TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const SNAP = 3 * DEG;
  let theta = $state(Math.PI / 6);
  const UNITS = [{ id: 'degrees', label: 'Degrees' }, { id: 'radians', label: 'Radians' }] as const;
  let unit = $state<'degrees' | 'radians'>('degrees');

  const deg = $derived(theta / DEG);
  const special = $derived(sheet.angles.find((a) => Math.abs(a.degrees - deg) < 1e-6) ?? null);
  const set = (t: number): void => {
    const r = ((t % TAU) + TAU) % TAU;
    const near = sheet.angles.map((a) => a.degrees * DEG).concat(TAU).find((s) => Math.abs(s - r) < SNAP);
    theta = near === undefined ? r : near % TAU;
  };

  const hues = $derived(unnamedOrder(referentHues(colours.referents, colours.vision), [], 0, [], settings.dark, colours.vision));
  const hue = (i: number): string => (settings.shown.refs ? pickWrapped(hues, i) : 'var(--ink)');
  const SIN = 0, COS = 1, TAN = 2;

  /* ---------- the circle: 1 unit is R pixels about the centre of a square ---------- */
  const S = 320, R = 118, O = S / 2;
  const X = (x: number): number => O + x * R, Y = (y: number): number => O - y * R;
  const c = $derived(Math.cos(theta)), s = $derived(Math.sin(theta));
  const tanOk = $derived(Math.abs(c) > 1e-9);
  const t = $derived(tanOk ? s / c : NaN);
  const TMAX = 1.3;
  const arc = $derived.by(() => { const r = 22; const big = theta > Math.PI ? 1 : 0; return theta < 1e-9 ? '' : `M${O + r} ${O}A${r} ${r} 0 ${big} 0 ${O + r * c} ${O - r * s}`; });

  /* ---------- the graphs: θ from 0 to 2π across, −1.25 to 1.25 up ---------- */
  const GW = 480, GH = 320, GL = 34, GR = 14, GT = 20, GB = 36;
  const gx = (a: number): number => GL + (a / TAU) * (GW - GL - GR), gy = (v: number): number => GT + ((1.25 - v) / 2.5) * (GH - GT - GB);
  const wave = (f: (a: number) => number): string => Array.from({ length: 241 }, (_, i) => { const a = (TAU * i) / 240; return `${i ? 'L' : 'M'}${gx(a).toFixed(1)} ${gy(f(a)).toFixed(1)}`; }).join('');
  const SIN_PATH = wave(Math.sin), COS_PATH = wave(Math.cos);
  const TICKS = [
    { a: Math.PI / 2, rad: '\\frac{\\pi}{2}', deg: '90°' }, { a: Math.PI, rad: '\\pi', deg: '180°' },
    { a: 1.5 * Math.PI, rad: '\\frac{3\\pi}{2}', deg: '270°' }, { a: TAU, rad: '2\\pi', deg: '360°' },
  ];

  /* ---------- dragging ---------- */
  const onCircle = (e: PointerEvent): void => {
    if (e.type === 'pointerdown') (e.currentTarget as Element).setPointerCapture(e.pointerId); else if (!(e.buttons & 1)) return;
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const k = S / r.width;
    set(Math.atan2(O - (e.clientY - r.top) * k, (e.clientX - r.left) * k - O));
  };
  const onGraph = (e: PointerEvent): void => {
    if (e.type === 'pointerdown') (e.currentTarget as Element).setPointerCapture(e.pointerId); else if (!(e.buttons & 1)) return;
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const x = (e.clientX - r.left) * (GW / r.width);
    set(Math.min(TAU - 1e-9, Math.max(0, ((x - GL) / (GW - GL - GR)) * TAU)));
  };
  const onKey = (e: KeyboardEvent): void => {
    const step = (e.shiftKey ? 15 : 1) * DEG;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') theta = (((theta + step) % TAU) + TAU) % TAU;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') theta = (((theta - step) % TAU) + TAU) % TAU;
    else return;
    e.preventDefault();
  };

  /* ---------- readout ---------- */
  const v = (x: number): string => fmt(x).replace('−', '-');
  const angleTex = $derived(unit === 'degrees' ? `${special ? special.degrees : v(deg)}^\\circ` : special ? special.radians : v(theta));
  const lines = $derived([
    `\\theta = ${angleTex}`,
    `\\sin\\theta = ${special ? special.sin : v(s)}`,
    `\\cos\\theta = ${special ? special.cos : v(c)}`,
    `\\tan\\theta = ${special ? special.tan ?? '\\text{undefined}' : tanOk ? v(t) : '\\text{undefined}'}`,
  ]);
  const tex = (node: HTMLElement, x: string) => { figFor(book).tex(node, x); return { update(n: string) { figFor(book).tex(node, n); } }; };
  const markTex = (node: SVGForeignObjectElement, x: string) => tex(node.firstElementChild as HTMLElement, x);
</script>

<div class="unit-circle">
  <header>
    <h1>{sheet.title}</h1>
    <div class="seg" role="radiogroup" aria-label="Angle in">
      {#each UNITS as u (u.id)}<button type="button" role="radio" aria-checked={unit === u.id} class:on={unit === u.id} onclick={() => (unit = u.id)}>{u.label}</button>{/each}
    </div>
  </header>
  <div class="body">
    <div class="left">
      <svg class="circle" viewBox="0 0 {S} {S}" role="slider" tabindex="0" aria-label="θ" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(deg)} aria-valuetext="{fmt(deg)}°"
        onpointerdown={onCircle} onpointermove={onCircle} onkeydown={onKey}>
        <line class="axis" x1="8" x2={S - 8} y1={O} y2={O} />
        <line class="axis" x1={O} x2={O} y1="8" y2={S - 8} />
        <circle class="ring" cx={O} cy={O} r={R} />
        {#each sheet.angles as a (a.degrees)}<circle class="tick" class:at={special === a} cx={X(Math.cos(a.degrees * DEG))} cy={Y(Math.sin(a.degrees * DEG))} r="3" />{/each}
        {#if tanOk && Math.abs(t) <= TMAX}
          <line class="ray" x1={O} y1={O} x2={X(1)} y2={Y(t)} />
          <line class="seg-tan" style:stroke={hue(TAN)} x1={X(1)} y1={O} x2={X(1)} y2={Y(t)} />
        {/if}
        <path class="arc" d={arc} />
        <line class="radius" x1={O} y1={O} x2={X(c)} y2={Y(s)} />
        <line class="seg-cos" style:stroke={hue(COS)} x1={O} y1={O} x2={X(c)} y2={O} />
        <line class="seg-sin" style:stroke={hue(SIN)} x1={X(c)} y1={O} x2={X(c)} y2={Y(s)} />
        <circle class="point" cx={X(c)} cy={Y(s)} r="7" />
        <text class="lab" x={O + 26 * Math.cos(theta / 2) + 4} y={O - 26 * Math.sin(theta / 2) - 4}>θ</text>
        <text class="lab" x={X(1) + 6} y={O + 16}>1</text>
      </svg>
      <div class="values">
        {#each lines as l, i (i)}<div class="line" style:color={i === 1 ? hue(SIN) : i === 2 ? hue(COS) : i === 3 ? hue(TAN) : null} use:tex={l}></div>{/each}
      </div>
    </div>
    <svg class="graphs" viewBox="0 0 {GW} {GH}" role="slider" tabindex="0" aria-label="θ along the graphs" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(deg)}
      onpointerdown={onGraph} onpointermove={onGraph} onkeydown={onKey}>
      {#each [-1, 1] as yv (yv)}<line class="grid" x1={GL} x2={GW - GR} y1={gy(yv)} y2={gy(yv)} /><text class="tl" x={GL - 6} y={gy(yv) + 4} text-anchor="end">{yv === 1 ? '1' : '−1'}</text>{/each}
      {#each TICKS as k (k.a)}<line class="grid" x1={gx(k.a)} x2={gx(k.a)} y1={GT} y2={GH - GB} />{/each}
      <line class="axis" x1={GL} x2={GW - GR} y1={gy(0)} y2={gy(0)} />
      <line class="axis" x1={GL} x2={GL} y1={GT} y2={GH - GB} />
      {#each TICKS as k (k.a)}
        {#if unit === 'degrees'}<text class="tl" x={gx(k.a)} y={GH - GB + 18} text-anchor="middle">{k.deg}</text>
        {:else}<foreignObject x={gx(k.a) - 24} y={GH - GB + 4} width="48" height="30" use:markTex={k.rad}><div class="fo"></div></foreignObject>{/if}
      {/each}
      <path class="wave" style:stroke={hue(SIN)} d={SIN_PATH} />
      <path class="wave" style:stroke={hue(COS)} d={COS_PATH} />
      <text class="name" style:fill={hue(SIN)} x={gx(Math.PI / 2) + 6} y={gy(1) - 6}>sin θ</text>
      <text class="name" style:fill={hue(COS)} x={gx(0) + 8} y={gy(1) - 6}>cos θ</text>
      <line class="now" x1={gx(theta)} x2={gx(theta)} y1={GT} y2={GH - GB} />
      <line class="seg-sin" style:stroke={hue(SIN)} x1={gx(theta)} x2={gx(theta)} y1={gy(0)} y2={gy(s)} />
      <circle class="dot" style:fill={hue(SIN)} cx={gx(theta)} cy={gy(s)} r="5" />
      <circle class="dot" style:fill={hue(COS)} cx={gx(theta)} cy={gy(c)} r="5" />
    </svg>
  </div>
</div>

<style>
  .unit-circle{font-family:var(--sans);container-type:inline-size}
  header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin-bottom:12px}
  header h1{margin:0;font-size:1.35rem}
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .seg button{font:inherit;font-size:0.78rem;font-weight:600;padding:4px 12px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button + button{border-left:1px solid var(--rule)}
  .seg button.on{background:color-mix(in srgb,var(--accent) 14%,var(--panel));color:var(--accent)}
  .seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .body{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:16px;align-items:start}
  @container (max-width:640px){ .body{grid-template-columns:1fr} }
  svg{display:block;width:100%;height:auto;border:1px solid var(--rule);border-radius:6px;background:var(--bg);touch-action:none;user-select:none;cursor:pointer}
  svg:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .axis{stroke:var(--muted);stroke-width:1.5}
  .grid{stroke:var(--rule);stroke-width:1}
  .ring{fill:none;stroke:var(--ink);stroke-width:2}
  .tick{fill:var(--bg);stroke:var(--muted);stroke-width:1.5}
  .tick.at{fill:var(--ink);stroke:var(--ink)}
  .ray{stroke:var(--muted);stroke-width:1;stroke-dasharray:4 4}
  .radius{stroke:var(--ink);stroke-width:2}
  .arc{fill:none;stroke:var(--ink);stroke-width:1.5}
  .seg-cos,.seg-sin{stroke-width:4;stroke-linecap:round}
  .seg-tan{stroke-width:3;stroke-linecap:round}
  .point{fill:var(--ink);stroke:var(--bg);stroke-width:2;cursor:grab}
  .lab,.tl,.name{font-family:var(--figure);font-size:14px;fill:var(--ink)}
  .tl{font-size:13px;fill:var(--muted)}
  .name{font-size:14px}
  .fo{font-family:var(--figure);font-size:13px;color:var(--muted);text-align:center}
  .wave{fill:none;stroke-width:2.5}
  .now{stroke:var(--muted);stroke-width:1;stroke-dasharray:4 4}
  .dot{stroke:var(--bg);stroke-width:2}
  .values{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin-top:10px;font-family:var(--figure);font-size:1.05rem}
  .line{min-height:2.2em;display:flex;align-items:center}
</style>
