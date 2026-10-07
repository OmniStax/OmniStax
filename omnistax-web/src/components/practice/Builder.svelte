<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import PageHead from './PageHead.svelte';
  import UpNext from './UpNext.svelte';
  import ReadyToLearn from './ReadyToLearn.svelte';
  import CurriculumTree from './CurriculumTree.svelte';
  import SessionPlan from './SessionPlan.svelte';

  let { item, shelf }: { item: string; shelf: readonly string[] } = $props();

  $effect(() => {
    for (const b of shelf) if ((books.status[b] ?? 'idle') === 'idle') void books.load(b);
  });
  const loading = $derived(shelf.some((b) => books.status[b] === 'loading'));
</script>

<div class="builder">
  <PageHead title="New session" back={() => practice.dashboard(item)} />
  {#if loading}<p class="loading" role="status">Loading exercises…</p>{/if}
  <div class="cols">
    <section class="choose">
      <h3 class="section-title">Choose</h3>
      <UpNext {item} mode="add" label="Quick picks" />
      <ReadyToLearn {item} selectable folded />
      <div class="tree"><CurriculumTree {item} {shelf} open={shelf[0] ?? null} /></div>
    </section>
    <aside class="side">
      <SessionPlan {item} />
    </aside>
  </div>
</div>

<style>
  .builder{container-type:inline-size;width:100%;min-width:0}
  .loading{margin:0 0 12px;color:var(--muted);font-size:0.78rem}
  .cols{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}
  .choose{display:flex;flex-direction:column;gap:12px;min-width:0}
  .choose h3{margin:0}
  .tree{max-height:55vh;overflow:auto;border-bottom:1px solid var(--rule)}
  @container (min-width:760px){
    .cols{grid-template-columns:minmax(0,1fr) minmax(320px,400px);gap:32px}
    .tree{max-height:none;overflow:visible;border-bottom:0}
    .side{position:sticky;top:12px;align-self:start;max-height:calc(100vh - 140px);overflow:auto}
  }
</style>
