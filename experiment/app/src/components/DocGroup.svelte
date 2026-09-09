<script lang="ts">
  /* A document group: a tab strip and one pane per tab, so scroll positions
     survive tab switches. Dropping in the middle opens the item here; dropping
     on any of the four edges splits the group that way. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openTab, split, setFocus, type Group, type SplitSide } from '../lib/layout/model';
  import { dropzone } from '../lib/layout/drag.svelte';
  import TabStrip from './TabStrip.svelte';
  import Pane from './Pane.svelte';
  let { index, group, onPick }: { index: number; group: Group; onPick: (index: number, anchor: HTMLElement) => void } = $props();
  const l = $derived(layoutStore.layout);
  const focused = $derived(l.focus === index && l.groups.length > 1);
  type Zone = '' | 'drop' | 'drop-left' | 'drop-right' | 'drop-up' | 'drop-down';
  const EDGE = 0.25;                       /* how much of each side is an edge strip rather than the middle */
  const SIDE_OF: Readonly<Record<string, SplitSide>> = { 'drop-left': 'left', 'drop-right': 'right', 'drop-up': 'up', 'drop-down': 'down' };
  let drop = $state<Zone>('');
  /* The strip the pointer is over, or the middle. In a corner, where two strips
     meet, the nearer edge in proportion to the body's own width and height wins. */
  const zoneAt = (e: DragEvent, body: HTMLElement): Zone => {
    const r = body.getBoundingClientRect(); if (!r.width || !r.height) return 'drop';
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const edges: readonly { zone: Zone; depth: number }[] = [
      { zone: 'drop-left', depth: x }, { zone: 'drop-right', depth: 1 - x }, { zone: 'drop-up', depth: y }, { zone: 'drop-down', depth: 1 - y },
    ];
    const near = edges.filter((z) => z.depth < EDGE).sort((a, b) => a.depth - b.depth);
    return near.length ? near[0].zone : 'drop';
  };
  const focus = () => { if (l.focus !== index) layoutStore.apply((x) => setFocus(x, index)); };
</script>

<div class="group {drop}" class:focus={focused} data-index={index} role="group" onpointerdown={focus}>
  <TabStrip {index} {group} {onPick} />
  <div class="body" use:dropzone={{
    over: (e, _d) => { drop = zoneAt(e, e.currentTarget as HTMLElement); },
    leave: () => (drop = ''),
    drop: (d, e) => { const side = SIDE_OF[zoneAt(e, e.currentTarget as HTMLElement)]; layoutStore.apply((x) => (side ? split(x, index, side, d.key, d.from) : openTab(x, d.key, index, { from: d.from }))); },
  }}>
    {#each group.tabs as tab (group.key + '|' + tab)}
      <Pane groupKey={group.key} groupIndex={index} itemKey={tab} active={tab === group.active} />
    {/each}
    {#if !group.tabs.length}<div class="empty">Nothing open. Press + to open a section.</div>{/if}
  </div>
</div>

<style>
  .group{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
  .body{flex:1;min-height:0;position:relative}
  .group.drop .body::after,.group.drop-left .body::after,.group.drop-right .body::after,.group.drop-up .body::after,.group.drop-down .body::after{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--accent) 10%,transparent);pointer-events:none;z-index:3}
  .group.drop-left .body::after{right:75%}
  .group.drop-right .body::after{left:75%}
  .group.drop-up .body::after{bottom:75%}
  .group.drop-down .body::after{top:75%}
  .empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-family:var(--sans);font-size:0.9rem;text-align:center;padding:40px}
</style>
