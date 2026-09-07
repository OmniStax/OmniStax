<script lang="ts">
  /* A document group: a tab strip and one pane per tab, so scroll positions
     survive tab switches. Dropping on its right half splits it. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openTab, splitRight, setFocus, MAX_GROUPS, type Group } from '../lib/layout/model';
  import { dropzone } from '../lib/layout/drag.svelte';
  import TabStrip from './TabStrip.svelte';
  import Pane from './Pane.svelte';
  let { index, group, onPick }: { index: number; group: Group; onPick: (index: number, anchor: HTMLElement) => void } = $props();
  const l = $derived(layoutStore.layout);
  const focused = $derived(l.focus === index && l.groups.length > 1);
  let drop = $state<'' | 'drop' | 'drop-right'>('');
  const rightHalf = (e: DragEvent, body: HTMLElement) => l.groups.length < MAX_GROUPS && e.clientX > body.getBoundingClientRect().left + body.getBoundingClientRect().width * 0.5;
  const focus = () => { if (l.focus !== index) layoutStore.apply((x) => setFocus(x, index)); };
</script>

<div class="group {drop}" class:focus={focused} data-index={index} role="group" onpointerdown={focus}>
  <TabStrip {index} {group} {onPick} />
  <div class="body" use:dropzone={{
    over: (e, _d) => { drop = rightHalf(e, e.currentTarget as HTMLElement) ? 'drop-right' : 'drop'; },
    leave: () => (drop = ''),
    drop: (d, e) => { const split = rightHalf(e, e.currentTarget as HTMLElement); layoutStore.apply((x) => (split ? splitRight(x, index, d.key, d.from) : openTab(x, d.key, index, { from: d.from }))); },
  }}>
    {#each group.tabs as tab (group.key + '|' + tab)}
      <Pane groupKey={group.key} groupIndex={index} itemKey={tab} active={tab === group.active} />
    {/each}
    {#if !group.tabs.length}<div class="empty">Nothing open. Press + to open a section.</div>{/if}
  </div>
</div>

<style>
  .group{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--rule);position:relative}
  .group:last-child{border-right:0}
  .body{flex:1;min-height:0;position:relative}
  .group.drop .body::after,.group.drop-right .body::after{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--accent) 10%,transparent);pointer-events:none;z-index:3}
  .group.drop-right .body::after{left:50%}
  .empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-family:var(--sans);font-size:0.9rem;text-align:center;padding:40px}
  @media (max-width:900px){ .group{border-right:0;border-bottom:1px solid var(--rule)} }
</style>
