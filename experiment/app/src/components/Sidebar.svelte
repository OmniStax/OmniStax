<script lang="ts">
  /* The sidebar, down the left beside the rail: a stack of view boxes and a
     grip to resize it. Disappears when it holds nothing. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openSide, openTab, setWidth } from '../lib/layout/model';
  import { dropzone } from '../lib/layout/drag.svelte';
  import ViewBox from './ViewBox.svelte';
  import { FIG } from '../lib/fig/figlib';
  let { narrow }: { narrow: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const items = $derived(l.sides.left.items);
  const hidden = $derived(!items.length || (narrow && layoutStore.overlay !== 'left'));
  let drop = $state(false);
  let aside: HTMLElement;
  const resize = (e: PointerEvent) => {
    const grip = e.currentTarget as HTMLElement; e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => { const r = aside.getBoundingClientRect(); aside.style.width = Math.max(200, Math.min(520, ev.clientX - r.left)) + 'px'; };
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); layoutStore.apply((x) => setWidth(x, 'left', parseFloat(aside.style.width))); FIG.redrawAll(); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  };
</script>

<aside class="sidebar" class:drop bind:this={aside} {hidden} style:width="{l.sides.left.width}px"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => layoutStore.apply((x) => (d.key.startsWith('view:') ? openSide(x, d.key, 'left') : openTab(x, d.key, x.focus, { from: d.from }))) }}>
  <div class="stack">
    {#each items as k (k)}<ViewBox itemKey={k} />{/each}
  </div>
  <div class="grip" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" onpointerdown={resize}></div>
</aside>

<style>
  .sidebar{grid-area:sl;display:flex;font-family:var(--sans);font-size:0.86rem;background:var(--bg);border-right:1px solid var(--rule);min-width:0;overflow:hidden}
  .sidebar[hidden]{display:none}
  .stack{flex:1;min-width:0;overflow:auto;display:flex;flex-direction:column}
  .grip{width:6px;cursor:col-resize;flex:none;margin:0 -3px;z-index:2}
  .grip:hover{background:var(--soft2)}
  .sidebar.drop .stack{box-shadow:inset 0 0 0 2px var(--muted)}
  @media (max-width:900px){
    .sidebar{position:fixed;top:0;bottom:0;left:44px;width:min(340px,80vw)!important;z-index:30;box-shadow:0 8px 30px rgba(0,0,0,.25)}
    .grip{display:none}
  }
</style>
