<script lang="ts">
  /* One scroll pane for one tab. A document tab adopts its DOM instance; a
     figure tab adopts a root holding that one figure; a view tab renders the
     view, and an exercise tab the one card, with the room a tab gives it. The
     focused group's active pane feeds the scroll spy. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { registry } from '../lib/sections/registry.svelte';
  import { spy } from '../lib/sections/spy.svelte';
  import { parseItemKey, sectionOfItem, type GroupKey } from '../lib/types/ids';
  import { adopt } from './actions/adopt';
  import View from './views/View.svelte';
  import ExerciseTab from './exercises/ExerciseTab.svelte';
  let { groupKey, groupIndex, itemKey, active }: { groupKey: GroupKey; groupIndex: number; itemKey: string; active: boolean } = $props();
  const id = $derived(parseItemKey(itemKey));
  const holds = (g: GroupKey, k: string) => layoutStore.layout.groups.some((x) => x.key === g && x.tabs.includes(k));
  let el = $state<HTMLElement | null>(null);
  const sec = $derived(id ? sectionOfItem(id) : null);
  $effect(() => { el = !id ? null : id.kind === 'doc' ? registry.instanceFor(groupKey, id, holds) : id.kind === 'fig' ? registry.figureFor(groupKey, id) : null; });
  const status = $derived(sec ? registry.state(sec)?.status ?? 'loading' : 'loaded');
  const error = $derived(sec ? registry.state(sec)?.error : undefined);
  const entry = $derived(sec ? registry.entry(sec) : undefined);
  $effect(() => { if (sec && status === 'loading' && !registry.state(sec)?.docs.text) registry.load(sec).catch(() => {}); });
  const onscroll = (e: Event) => { if (active && layoutStore.layout.focus === groupIndex) spy.read(e.currentTarget as HTMLElement); };
</script>

<div class="pane" data-tab={itemKey} data-key={groupKey} data-group={groupIndex} hidden={!active} {onscroll}>
  {#if id && id.kind === 'view'}
    <div class="view-pane" data-view={id.view}><View kind={id.view} /></div>
  {:else if el}
    <div class="doc-host" use:adopt={el}></div>
  {:else if status === 'failed'}
    <article class="placeholder"><div class="loading bad">Could not load {sec ?? ''} ({error}). Loading other sections needs the site served over http; <a href={entry?.url}>open it as its own page</a>.</div></article>
  {:else if id && id.kind === 'ex'}
    <ExerciseTab {groupKey} section={id.section} ex={id.ex} />
  {:else}
    <article class="placeholder"><div class="loading">Loading {id ? registry.title(id) : itemKey}…</div></article>
  {/if}
</div>

<style>
  .pane{position:absolute;inset:0;overflow:auto;scroll-behavior:smooth;scroll-padding-top:16px}
  @media (prefers-reduced-motion: reduce){ .pane{scroll-behavior:auto} }
  .pane[hidden]{display:none}
  .view-pane{max-width:760px;margin:0 auto;padding:28px 40px 120px;font-family:var(--sans);font-size:0.95rem}
  .placeholder{max-width:820px;margin:0 auto}
  @media (max-width:900px){ .view-pane{padding:20px 18px 80px} }
</style>
