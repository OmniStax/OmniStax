<script lang="ts" module>
  export type PlaneView = { x: number; y: number; zoom: number };
</script>

<script lang="ts">
  /* A pan/zoom plane: the content is drawn in its own coordinates and moved by
     one transform. Ctrl+wheel and pinch zoom about the pointer, a plain wheel
     and a drag on anything that is not a control pan. */
  import type { Snippet } from 'svelte';

  let { fit = false, minZoom = 0.2, maxZoom = 3, view = $bindable({ x: 0, y: 0, zoom: 1 }), children }:
    { fit?: boolean; minZoom?: number; maxZoom?: number; view?: PlaneView; children: Snippet } = $props();

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
      if (e.ctrlKey || e.metaKey) { const [px, py] = local(e); zoomAbout(px, py, Math.exp(-e.deltaY * 0.0025)); return; }
      view = { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY };
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

  const onpointerdown = (e: PointerEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest(CONTROL)) return;
    frame?.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 2) pinch = { d: spread().d };
  };
  const onpointermove = (e: PointerEvent): void => {
    const was = pointers.get(e.pointerId);
    if (!was) return;
    const now = local(e);
    if (pointers.size === 1) { view = { ...view, x: view.x + now[0] - was[0], y: view.y + now[1] - was[1] }; pointers.set(e.pointerId, now); return; }
    pointers.set(e.pointerId, now);
    if (!pinch || pointers.size !== 2) return;
    const s = spread();
    if (pinch.d > 0) zoomAbout(s.mx, s.my, s.d / pinch.d);
    pinch = { d: s.d };
  };
  const onpointerup = (e: PointerEvent): void => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
</script>

<div class="plane" bind:this={frame} use:wheel role="presentation"
  {onpointerdown} {onpointermove} onpointerup={onpointerup} onpointercancel={onpointerup}>
  <div class="content" bind:this={content} style:transform="translate({view.x}px, {view.y}px) scale({view.zoom})">
    {@render children()}
  </div>
  <div class="tools">
    <button type="button" class="btn ghost sm" onclick={fitView}>Fit</button>
    <button type="button" class="btn ghost sm" onclick={reset}>Reset</button>
  </div>
</div>

<style>
  .plane{position:relative;overflow:hidden;width:100%;height:100%;touch-action:none;cursor:grab;user-select:none}
  .plane:active{cursor:grabbing}
  .content{position:absolute;left:0;top:0;width:max-content;transform-origin:0 0}
  .tools{position:absolute;right:8px;bottom:8px;display:flex;gap:2px;background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:2px}
</style>
