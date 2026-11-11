<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { library } from '../../lib/explorer/library.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import Dashboard from '../practice/Dashboard.svelte';
  import Builder from '../practice/Builder.svelte';
  import SessionRun from '../practice/SessionRun.svelte';
  import SessionReview from '../practice/SessionReview.svelte';
  import Sessions from '../practice/Sessions.svelte';
  let { item }: { item: string } = $props();
  const page = $derived(practice.page(item));
  const session = $derived(practice.sessionOf(item));
  /* A round two pages stood on may be ended from the other: this one reads it as ended too. */
  const face = $derived(page.face === 'practise' && session?.status === 'done' ? 'review' : page.face);
  const shelf = $derived(library.shelf(focus.book));
  $effect(() => { if (library.status === 'idle') library.load().catch(() => {}); });
</script>

<div class="practice">
  {#if face === 'choose'}
    <Builder {item} {shelf} />
  {:else if face === 'practise' && session}
    <SessionRun {item} />
  {:else if face === 'review' && session}
    <SessionReview {item} />
  {:else if face === 'sessions'}
    <Sessions {item} />
  {:else}
    <Dashboard {item} {shelf} />
  {/if}
</div>

<style>
  .practice{container-type:inline-size;font-family:var(--sans);font-size:0.84rem;color:var(--ink);display:flex;flex-direction:column;gap:16px}
  :global(.view-pane) .practice{font-size:0.95rem}
  :global(.pane > .view-pane[data-view="exercises"]){max-width:1080px}
</style>
