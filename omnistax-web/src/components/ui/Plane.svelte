<script lang="ts" module>
  export type PlaneView = { x: number; y: number; zoom: number };
  export type PlaneRect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
</script>

<script lang="ts">
  /* A pan/zoom plane: the content is drawn in its own coordinates and moved by
     one transform. The wheel and pinch zoom about the pointer, and a drag on
     anything that is not a control pans. Where the plane takes a lasso, a
     Shift-drag draws one and hands over the rectangle in content coordinates
     (Ctrl as well to add to what is held); a press that does not move is a
     click on nothing. */
  import type { Snippet } from 'svelte';

  let { fit = false, minZoom = 0.2, maxZoom = 3, view = $bindable({ x: 0, y: 0, zoom: 1 }), onlasso, onblank, children }:
    { fit?: boolean; minZoom?: number; maxZoom?: number; view?: PlaneView;
      onlasso?: (r: PlaneRect, add: boolean) => void; onblank?: () => void; children: Snippet } = $props();

  const PAD = 24;
  const HOME: PlaneView = { x: PAD, y: PAD, zoom: 1 };
  const CONTROL = 'button, a, input, textarea, select, [contenteditable="true"], [data-nopan]';

  let frame = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  const clampZoom = (z: number): number => Math.min(maxZoom, Math.max(minZoom, z));

  /* Zoom by a factor about a point of the frame, so the point stays under the pointer. */
  const zoomAbout = (px: number, py: number, factor: number): void => {
    const zoom = clampZoom(view.zoom * factor);
    const k = zoom / view.zoom;
    view = { x: px - (px - view.x) * k, y: py - (py - view.y) * k, zoom };
  };

  export const fitView = (): void => {
    if (!frame || !content) return;
    const w = content.offsetWidth, h = content.offsetHeight;
    if (w === 0 || h === 0) return;
    const fw = frame.clientWidth, fh = frame.clientHeight;
    const zoom = clampZoom(Math.min(1, (fw - 2 * PAD) / w, (fh - 2 * PAD) / h));
    view = { x: (fw - w * zoom) / 2, y: Math.max(PAD, (fh - h * zoom) / 2), zoom };
  };
  export const reset = (): void => { view = { ...HOME }; };

  /* Fit once, when the content first has a size. */
  let fitted = false;
  $effect(() => {
    const el = content;
    if (!el || !fit) return;
    const ro = new ResizeObserver(() => { if (fitted || el.offsetWidth === 0) return; fitted = true; fitView(); });
    ro.observe(el);
    return () => ro.disconnect();
  });

  const local = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = frame?.getBoundingClientRect();
    return r ? [e.clientX - r.left, e.clientY - r.top] : [0, 0];
  };

  const wheel = (node: HTMLDivElement) => {
    const onwheel = (e: WheelEvent): void => {
      e.preventDefault();
      const [px, py] = local(e);
      zoomAbout(px, py, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.0025));
    };
    node.addEventListener('wheel', onwheel, { passive: false });
    return { destroy: () => node.removeEventListener('wheel', onwheel) };
  };

  const pointers = new Map<number, [number, number]>();
  let pinch: { d: number } | null = null;
  const spread = (): { d: number; mx: number; my: number } => {
    const [[ax, ay], [bx, by]] = [...pointers.values()];
    return { d: Math.hypot(ax - bx, ay - by), mx: (ax + bx) / 2, my: (ay + by) / 2 };
  };

  /* Where the press began and whether it has moved, which tells a click on
     nothing from a pan; and the lasso being drawn, in frame coordinates. */
  let press: { at: [number, number]; moved: boolean } | null = null;
  let lasso = $state<{ from: [number, number]; to: [number, number]; add: boolean } | null>(null);
  const rectOf = (a: [number, number], b: [number, number]): PlaneRect =>
    ({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) });
  const inContent = (r: PlaneRect): PlaneRect =>
    ({ x: (r.x - view.x) / view.zoom, y: (r.y - view.y) / view.zoom, w: r.w / view.zoom, h: r.h / view.zoom });
  const shown = $derived(lasso ? rectOf(lasso.from, lasso.to) : null);

  const onpointerdown = (e: PointerEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest(CONTROL)) return;
    frame?.setPointerCapture(e.pointerId);
    const at = local(e);
    if (onlasso && e.shiftKey && pointers.size === 0) { lasso = { from: at, to: at, add: e.ctrlKey || e.metaKey }; return; }
    pointers.set(e.pointerId, at);
    press = pointers.size === 1 ? { at, moved: false } : null;
    if (pointers.size === 2) pinch = { d: spread().d };
  };
  const onpointermove = (e: PointerEvent): void => {
    if (lasso) { lasso = { ...lasso, to: local(e) }; return; }
    const was = pointers.get(e.pointerId);
    if (!was) return;
    const now = local(e);
    if (press && Math.hypot(now[0] - press.at[0], now[1] - press.at[1]) > 3) press.moved = true;
    if (pointers.size === 1) { view = { ...view, x: view.x + now[0] - was[0], y: view.y + now[1] - was[1] }; pointers.set(e.pointerId, now); return; }
    pointers.set(e.pointerId, now);
    if (!pinch || pointers.size !== 2) return;
    const s = spread();
    if (pinch.d > 0) zoomAbout(s.mx, s.my, s.d / pinch.d);
    pinch = { d: s.d };
  };
  const onpointerup = (e: PointerEvent): void => {
    if (lasso) { const r = rectOf(lasso.from, lasso.to), add = lasso.add; lasso = null; onlasso?.(inContent(r), add); return; }
    if (press && !press.moved && e.type === 'pointerup' && pointers.size === 1) onblank?.();
    press = null;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  };
</script>

<div class="plane" bind:this={frame} use:wheel role="presentation"
  {onpointerdown} {onpointermove} onpointerup={onpointerup} onpointercancel={onpointerup}>
  <div class="content" bind:this={content} style:transform="translate({view.x}px, {view.y}px) scale({view.zoom})">
    {@render children()}
  </div>
  {#if shown}<div class="lasso" style:left="{shown.x}px" style:top="{shown.y}px" style:width="{shown.w}px" style:height="{shown.h}px"></div>{/if}
  <div class="tools">
    <button type="button" class="btn ghost sm" onclick={fitView}>Fit</button>
    <button type="button" class="btn ghost sm" onclick={reset}>Reset</button>
  </div>
</div>

<style>
  .plane{position:relative;overflow:hidden;width:100%;height:100%;touch-action:none;cursor:grab;user-select:none}
  .plane:active{cursor:grabbing}
  .content{position:absolute;left:0;top:0;width:max-content;transform-origin:0 0}
  .lasso{position:absolute;pointer-events:none;border:1px solid var(--accent);background:color-mix(in srgb, var(--accent) 10%, transparent);border-radius:2px}
  .tools{position:absolute;right:8px;bottom:8px;display:flex;gap:2px;background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:2px}
</style>
