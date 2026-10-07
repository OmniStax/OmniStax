<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import PageHead from './PageHead.svelte';
  import SessionRows from './SessionRows.svelte';
  let { item }: { item: string } = $props();

  let asking = $state(false);
  const done = $derived(practice.past().length);
  const n = $derived(practice.attempts.length);
</script>

<div class="sessions">
  <PageHead title="Sessions" back={() => practice.dashboard(item)}>
    {#snippet actions()}
      {#if asking}
        <span class="ask">
          Delete {done === 1 ? 'the finished session' : `all ${done} finished sessions`}, {n === 1 ? '1 completed exercise' : `${n} completed exercises`} and every mastery record?
          <button type="button" class="btn sm danger" onclick={() => { practice.clearHistory(); asking = false; }}>Yes</button>
          <button type="button" class="btn ghost sm" onclick={() => (asking = false)}>No</button>
        </span>
      {:else}
        <button type="button" class="btn sm danger" disabled={!done && !n} onclick={() => (asking = true)}>Clear practice history</button>
      {/if}
    {/snippet}
  </PageHead>
  <SessionRows {item} />
</div>

<style>
  .sessions{display:flex;flex-direction:column;gap:12px;width:100%;max-width:760px;margin-inline:auto;min-width:0}
  .ask{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:0.8rem;color:var(--bad)}
</style>
