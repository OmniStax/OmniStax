<script lang="ts">
  /* Tabs of one group, a "+" that opens the section picker for this group, and
     the two buttons that split the group beside it or below it. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openTab, activate, closeItem, splitRight, splitDown, type Group } from '../lib/layout/model';
  import { tabTitle } from '../lib/layout/titles';
  import { draggable, dropzone } from '../lib/layout/drag.svelte';
  import { ICON } from '../lib/icons';
  let { index, group, onPick }: { index: number; group: Group; onPick: (index: number, anchor: HTMLElement) => void } = $props();
  const title = tabTitle;
  let drop = $state(false);
</script>

<div class="tabstrip" class:drop role="tablist" use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d, e) => { const before = (e.target as HTMLElement).closest<HTMLElement>('.tab')?.dataset.tab ?? null; layoutStore.apply((x) => openTab(x, d.key, index, { before, from: d.from })); } }}>
  {#each group.tabs as k (k)}
    <div class="tab" class:active={k === group.active} role="tab" aria-selected={k === group.active} data-tab={k} tabindex="0"
      use:draggable={{ key: k, from: group.key }} onclick={() => layoutStore.apply((x) => activate(x, index, k))} onkeydown={(e) => { if (e.key === 'Enter') layoutStore.apply((x) => activate(x, index, k)); }}>
      <span class="ttl">{title(k)}</span>
      <button type="button" class="x" title="Close" aria-label="Close {title(k)}" onclick={(e) => { e.stopPropagation(); layoutStore.apply((x) => closeItem(x, k, index)); }}>×</button>
    </div>
  {/each}
  <button type="button" class="act plus" title="Open a section here" aria-label="Open a section in this group" onclick={(e) => { e.stopPropagation(); onPick(index, e.currentTarget as HTMLElement); }}>{@html ICON.plus}</button>
  <span class="spacer"></span>
  <button type="button" class="act" title="Split right" aria-label="Split right" onclick={() => layoutStore.apply((x) => splitRight(x, index))}>{@html ICON.split}</button>
  <button type="button" class="act" title="Split down" aria-label="Split down" onclick={() => layoutStore.apply((x) => splitDown(x, index))}>{@html ICON.splitDown}</button>
</div>

<style>
  .tabstrip{display:flex;align-items:stretch;background:var(--panel);border-bottom:1px solid var(--rule);font-family:var(--sans);font-size:0.82rem;overflow-x:auto;overflow-y:hidden;flex:none;height:36px}
  .tab{display:flex;align-items:center;gap:6px;padding:0 6px 0 14px;border-right:1px solid var(--rule);color:var(--muted);cursor:pointer;white-space:nowrap;position:relative;user-select:none}
  .tab.active{color:var(--ink);background:var(--bg)}
  :global(.group.focus) .tab.active::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:var(--ink)}
  .x{width:18px;height:18px;border-radius:4px;border:0;background:transparent;color:inherit;opacity:0;cursor:pointer;font-size:15px;line-height:1;display:grid;place-items:center;padding:0}
  .tab:hover .x,.tab.active .x{opacity:.65}
  .x:hover{opacity:1;background:var(--soft2)}
  .spacer{flex:1}
  .act{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:0 10px;display:grid;place-items:center}
  .act:hover{color:var(--ink)}
  .plus{padding:0 8px;border-right:1px solid var(--rule)}
  .act :global(svg){width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6}
  .tabstrip.drop{box-shadow:inset 0 -2px 0 var(--muted)}
</style>
