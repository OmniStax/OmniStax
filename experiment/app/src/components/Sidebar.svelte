<script lang="ts">
  /* A sidebar: a stack of view boxes and a grip to resize it. Disappears when empty. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openSide, openTab, setWidth, type Side } from '../lib/layout/model';
  import { dropzone } from '../lib/layout/drag.svelte';
  import ViewBox from './ViewBox.svelte';
  import { FIG } from '../lib/fig/figlib';
  let { side, narrow }: { side: Side; narrow: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const items = $derived(l.sides[side].items);
  const hidden = $derived(!items.length || (narrow && layoutStore.overlay !== side));
  let drop = $state(false);
  let aside: HTMLElement;
  const resize = (e: PointerEvent) => {
    const grip = e.currentTarget as HTMLElement; e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => { const r = aside.getBoundingClientRect(); const w = side === 'left' ? ev.clientX - r.left : r.right - ev.clientX; aside.style.width = Math.max(200, Math.min(520, w)) + 'px'; };
    const up = (ev: PointerEvent) => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); layoutStore.apply((x) => setWidth(x, side, parseFloat(aside.style.width))); FIG.redrawAll(); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  };
</script>

<aside class="sidebar {side}" class:drop bind:this={aside} {hidden} style:width="{l.sides[side].width}px"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => layoutStore.apply((x) => (d.key.startsWith('view:') ? openSide(x, d.key, side) : openTab(x, d.key, x.focus, { from: d.from }))) }}>
  {#if side === 'right'}<div class="grip" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" onpointerdown={resize}></div>{/if}
  <div class="stack">
    {#each items as k (k)}<ViewBox itemKey={k} />{/each}
  </div>
  {#if side === 'left'}<div class="grip" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" onpointerdown={resize}></div>{/if}
</aside>

<style>
  .sidebar{display:flex;font-family:var(--sans);font-size:0.86rem;background:var(--bg);min-width:0;overflow:hidden}
  .sidebar.left{grid-area:sl;border-right:1px solid var(--rule)}
  .sidebar.right{grid-area:sr;border-left:1px solid var(--rule)}
  .sidebar[hidden]{display:none}
  .stack{flex:1;min-width:0;overflow:auto;display:flex;flex-direction:column}
  .grip{width:6px;cursor:col-resize;flex:none;margin:0 -3px;z-index:2}
  .grip:hover{background:var(--soft2)}
  .sidebar.drop .stack{box-shadow:inset 0 0 0 2px var(--muted)}
  @media (max-width:900px){
    .sidebar{position:fixed;top:0;bottom:0;width:min(340px,80vw)!important;z-index:30;box-shadow:0 8px 30px rgba(0,0,0,.25)}
    .sidebar.left{left:44px} .sidebar.right{right:44px}
    .grip{display:none}
  }
</style>
