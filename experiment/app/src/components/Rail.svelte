<script lang="ts">
  /* The activity rail, down the left of the shell, in three sections. At the top
     the two views that keep the sidebar — the explorer and the annotations —
     which a click shows there and a second click puts away. In the middle of the
     rail, held there by the spacers either side of it, the three that are only
     ever tabs: a click on one opens a page of it in a split to the right of the
     group being read, and every click opens another, so several concept maps can
     stand open at once, each following the section it was opened beside. At the
     bottom: read-aloud when voice is on, the command palette and the settings.
     Every button drags, so any view can be dropped into a group. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { where, openSide, openTab, closeItem, split, instancesOf, SIDEBAR_VIEW_KEYS, GROUP_VIEW_KEYS } from '../lib/layout/model';
  import { draggable, dropzone } from '../lib/layout/drag.svelte';
  import { newViewItem, viewKindOf, type ViewKind } from '../lib/types/ids';
  import { ICON, VIEW_TITLE } from '../lib/icons';
  import { ui } from '../lib/commands/ui.svelte';
  import { settings } from '../lib/settings/store.svelte';
  import { reader } from '../lib/voice.svelte';
  let { narrow = false }: { narrow?: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const kindOf = (k: string): ViewKind => viewKindOf(k) as ViewKind;   /* every key the rail draws is a view's */
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
  /* A page of the view of its own, beside what is being read; the ones already open stay. */
  const openPage = (kind: ViewKind) => layoutStore.apply((x) => split(x, x.focus, 'right', newViewItem(kind)));
  const voiceTitle = $derived(reader.speaking ? 'Stop reading' : 'Read section aloud');
</script>

<nav class="rail" class:drop aria-label="Views"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => { const k = d.key; layoutStore.apply((x) => (k.startsWith('view:') ? openSide(x, k, 'left') : openTab(x, k, x.focus, { from: d.from }))); } }}>
  <div class="section">
    {#each SIDEBAR_VIEW_KEYS as k (k)}
      {@const loc = where(l, k)}
      <button type="button" class:on={!!loc} title={VIEW_TITLE[kindOf(k)]} aria-label={VIEW_TITLE[kindOf(k)]}
        use:draggable={{ key: k, from: null }} onclick={() => toggleSide(k)}>{@html ICON[kindOf(k) as keyof typeof ICON]}</button>
    {/each}
  </div>
  <div class="spacer"></div>
  <div class="section">
    {#each GROUP_VIEW_KEYS as k (k)}
      {@const open = instancesOf(l, kindOf(k)).length > 0}
      <button type="button" class:on={open} title="{VIEW_TITLE[kindOf(k)]} (opens a page of its own in a split)" aria-label={VIEW_TITLE[kindOf(k)]}
        use:draggable={{ key: k, from: null }} onclick={() => openPage(kindOf(k))}>{@html ICON[kindOf(k) as keyof typeof ICON]}</button>
    {/each}
  </div>
  <div class="spacer"></div>
  <div class="section">
    {#if settings.voice && reader.supported}
      <button type="button" id="voice" class:on={reader.speaking} class:speaking={reader.speaking} title={voiceTitle} aria-label={voiceTitle} onclick={(e) => { e.stopPropagation(); reader.toggle(); }}>{@html ICON.speaker}</button>
    {/if}
    <button type="button" id="palette-btn" class:on={ui.palette.open} title="Command palette (Ctrl+Shift+P)" aria-label="Command palette" onclick={(e) => { e.stopPropagation(); ui.togglePalette(); }}>{@html ICON.palette}</button>
    <button type="button" id="gear" class:on={ui.settings} title="Settings (Ctrl+,)" aria-label="Settings" onclick={(e) => { e.stopPropagation(); ui.toggleSettings(); }}>{@html ICON.gear}</button>
  </div>
</nav>

<style>
  .rail{grid-area:rl;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:var(--panel);border-right:1px solid var(--rule);font-family:var(--sans)}
  /* Three sections, the middle one held in the centre of the rail by the spacers either side. */
  .section{display:flex;flex-direction:column;align-items:center;gap:2px;flex:none}
  .spacer{flex:1}
  button{width:36px;height:36px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;position:relative;padding:0}
  button:hover{background:var(--soft);color:var(--ink)}
  button.on{color:var(--ink)}
  button.speaking{color:var(--accent)}
  /* the one marker a button wears: the bar down its left while the view stands open somewhere */
  button.on::before{content:"";position:absolute;left:-4px;top:8px;bottom:8px;width:2px;background:var(--ink);border-radius:1px}
  button :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  button[draggable="true"]{cursor:grab}
  .rail.drop{background:var(--soft)}
</style>
