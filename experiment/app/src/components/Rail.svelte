<script lang="ts">
  /* The activity rail, down the left of the shell. At the top the two views
     that keep the sidebar — the explorer and the annotations — which a click
     shows there and a second click puts away; below a rule the three that are
     only ever tabs, which a click opens in a split to the right of the group
     being read, or shows where they already stand. Every button drags, so any
     view can be dropped into a group. Under them all: read-aloud when voice is
     on, the command palette and the settings. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { where, openSide, openTab, openInSplit, closeItem, SIDEBAR_VIEW_KEYS, GROUP_VIEW_KEYS } from '../lib/layout/model';
  import { draggable, dropzone } from '../lib/layout/drag.svelte';
  import { ICON, VIEW_TITLE } from '../lib/icons';
  import { ui } from '../lib/commands/ui.svelte';
  import { settings } from '../lib/settings/store.svelte';
  import { reader } from '../lib/voice.svelte';
  let { narrow = false }: { narrow?: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const kindOf = (k: string) => k.slice(5);
  let drop = $state(false);
  /* A sidebar view: into the sidebar when it is nowhere, out of it when it is
     there, and to its tab when the reader has dragged it into a group. */
  const toggleSide = (k: string) => {
    const loc = where(l, k);
    if (!loc) { layoutStore.apply((x) => openSide(x, k, 'left')); layoutStore.overlay = 'left'; return; }
    if (loc.type === 'side') {
      if (narrow && layoutStore.overlay !== 'left') { layoutStore.overlay = 'left'; return; }
      layoutStore.apply((x) => closeItem(x, k)); return;
    }
    layoutStore.apply((x) => openTab(x, k, loc.index));
  };
  const openSplit = (k: string) => layoutStore.apply((x) => openInSplit(x, k));
  const voiceTitle = $derived(reader.speaking ? 'Stop reading' : 'Read section aloud');
</script>

<nav class="rail" class:drop aria-label="Views"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => { const k = d.key; layoutStore.apply((x) => (k.startsWith('view:') ? openSide(x, k, 'left') : openTab(x, k, x.focus, { from: d.from }))); } }}>
  {#each SIDEBAR_VIEW_KEYS as k (k)}
    {@const loc = where(l, k)}
    <button type="button" class:on={!!loc} class:tab={loc?.type === 'group'} title={VIEW_TITLE[kindOf(k)]} aria-label={VIEW_TITLE[kindOf(k)]}
      use:draggable={{ key: k, from: null }} onclick={() => toggleSide(k)}>{@html ICON[kindOf(k) as keyof typeof ICON]}</button>
  {/each}
  <div class="rule" role="separator"></div>
  {#each GROUP_VIEW_KEYS as k (k)}
    {@const loc = where(l, k)}
    <button type="button" class:on={!!loc} class:tab={loc?.type === 'group'} title="{VIEW_TITLE[kindOf(k)]} (opens in a split)" aria-label={VIEW_TITLE[kindOf(k)]}
      use:draggable={{ key: k, from: null }} onclick={() => openSplit(k)}>{@html ICON[kindOf(k) as keyof typeof ICON]}</button>
  {/each}
  <div class="spacer"></div>
  {#if settings.voice && reader.supported}
    <button type="button" id="voice" class:on={reader.speaking} class:speaking={reader.speaking} title={voiceTitle} aria-label={voiceTitle} onclick={(e) => { e.stopPropagation(); reader.toggle(); }}>{@html ICON.speaker}</button>
  {/if}
  <button type="button" id="palette-btn" class:on={ui.palette.open} title="Command palette (Ctrl+K)" aria-label="Command palette" onclick={(e) => { e.stopPropagation(); ui.togglePalette(); }}>{@html ICON.search}</button>
  <button type="button" id="gear" class:on={ui.settings} title="Settings (Ctrl+,)" aria-label="Settings" onclick={(e) => { e.stopPropagation(); ui.toggleSettings(); }}>{@html ICON.gear}</button>
</nav>

<style>
  .rail{grid-area:rl;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:var(--panel);border-right:1px solid var(--rule);font-family:var(--sans)}
  .rule{width:22px;height:1px;background:var(--rule);margin:5px 0;flex:none}
  .spacer{flex:1}
  button{width:36px;height:36px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;position:relative;padding:0}
  button:hover{background:var(--soft);color:var(--ink)}
  button.on{color:var(--ink)}
  button.speaking{color:var(--accent)}
  button.on::before{content:"";position:absolute;left:-4px;top:8px;bottom:8px;width:2px;background:var(--ink);border-radius:1px}
  button.tab::after{content:"";position:absolute;right:5px;top:5px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
  button :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  button[draggable="true"]{cursor:grab}
  .rail.drop{background:var(--soft)}
</style>
