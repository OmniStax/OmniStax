<script lang="ts">
  /* An activity rail: one icon per view that lives on this side. Lit when the
     view is open anywhere, dotted when it is open as a tab. The left rail also
     carries the palette, settings and (when voice is on) read-aloud buttons. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { where, homeSide, openSide, openTab, closeItem, VIEW_KEYS, type Side } from '../lib/layout/model';
  import { draggable, dropzone } from '../lib/layout/drag.svelte';
  import { ICON, VIEW_TITLE } from '../lib/icons';
  import { ui } from '../lib/commands/ui.svelte';
  import { settings } from '../lib/settings/store.svelte';
  import { reader } from '../lib/voice.svelte';
  let { side, narrow = false }: { side: Side; narrow?: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const views = $derived(VIEW_KEYS.filter((k) => homeSide(l, k) === side));
  const kindOf = (k: string) => k.slice(5);
  let drop = $state(false);
  const click = (k: string) => {
    const loc = where(l, k);
    if (!loc) { layoutStore.apply((x) => openSide(x, k, side)); layoutStore.overlay = side; return; }
    if (loc.type === 'side') {
      if (narrow && layoutStore.overlay !== side) { layoutStore.overlay = side; return; }
      layoutStore.apply((x) => closeItem(x, k)); return;
    }
    layoutStore.apply((x) => openTab(x, k, loc.index));
  };
  const voiceTitle = $derived(reader.speaking ? 'Stop reading' : 'Read section aloud');
</script>

<nav class="rail {side}" class:drop aria-label="Views"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => { const k = d.key; layoutStore.apply((x) => (k.startsWith('view:') ? openSide(x, k, side) : openTab(x, k, x.focus, { from: d.from }))); } }}>
  {#each views as k (k)}
    {@const loc = where(l, k)}
    <button type="button" class:on={!!loc} class:tab={loc?.type === 'group'} title={VIEW_TITLE[kindOf(k)]} aria-label={VIEW_TITLE[kindOf(k)]}
      use:draggable={{ key: k, from: null }} onclick={() => click(k)}>{@html ICON[kindOf(k) as keyof typeof ICON]}</button>
  {/each}
  <div class="spacer"></div>
  {#if side === 'left'}
    {#if settings.voice && reader.supported}
      <button type="button" id="voice" class:on={reader.speaking} class:speaking={reader.speaking} title={voiceTitle} aria-label={voiceTitle} onclick={(e) => { e.stopPropagation(); reader.toggle(); }}>{@html ICON.speaker}</button>
    {/if}
    <button type="button" id="palette-btn" class:on={ui.palette.open} title="Command palette (Ctrl+K)" aria-label="Command palette" onclick={(e) => { e.stopPropagation(); ui.togglePalette(); }}>{@html ICON.search}</button>
    <button type="button" id="gear" class:on={ui.settings} title="Settings (Ctrl+,)" aria-label="Settings" onclick={(e) => { e.stopPropagation(); ui.toggleSettings(); }}>{@html ICON.gear}</button>
  {/if}
</nav>

<style>
  .rail{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:var(--panel);font-family:var(--sans)}
  .rail.left{grid-area:rl;border-right:1px solid var(--rule)}
  .rail.right{grid-area:rr;border-left:1px solid var(--rule)}
  .spacer{flex:1}
  button{width:36px;height:36px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;position:relative;padding:0}
  button:hover{background:var(--soft);color:var(--ink)}
  button.on{color:var(--ink)}
  button.speaking{color:var(--accent)}
  .left button.on::before{content:"";position:absolute;left:-4px;top:8px;bottom:8px;width:2px;background:var(--ink);border-radius:1px}
  .right button.on::before{content:"";position:absolute;right:-4px;top:8px;bottom:8px;width:2px;background:var(--ink);border-radius:1px}
  button.tab::after{content:"";position:absolute;right:5px;top:5px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
  button :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  button[draggable="true"]{cursor:grab}
  .rail.drop{background:var(--soft)}
</style>
