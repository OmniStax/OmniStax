<script lang="ts">
  /* One exercise, in a tab of its own. It is the card the shell renders and
     not adopted markup, so what is answered here is this card's own, as it is
     for a document cloned into a second group; and it is a tab so that the
     reader can stand a problem beside its scratch page, or beside the section
     that set it, and work between the two.

     The exercise is the section's, so the section is asked for if nobody has
     opened it yet; until it lands the tab says so rather than saying the
     exercise is gone, which is a different thing. */
  import ExerciseCard from './ExerciseCard.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { openDoc } from '../../lib/sections/nav.svelte';
  import { label } from '../../lib/sections/grouping';
  import { sectionRef, type BookId, type GroupKey, type SectionId } from '../../lib/types/ids';

  let { book, section, ex, groupKey }: { book: BookId; section: SectionId; ex: string; groupKey: GroupKey } = $props();
  const ref = $derived(sectionRef(book, section));

  $effect(() => { if (!registry.state(ref)) void registry.load(ref); });

  const state = $derived(registry.state(ref));
  const exercise = $derived(state?.exercises.find((e) => e.id === ex));
  const title = $derived(label(section, registry.entry(ref)?.title ?? ''));
</script>

<div class="ex-tab" data-book={book} data-section={section} data-ex={ex} data-group={groupKey}>
  <header class="head">
    <span class="what">Exercise</span>
    <button type="button" class="where" title="Open the section this exercise belongs to"
      onclick={() => void openDoc(ref, 'text')}>{title}</button>
  </header>
  <div class="body">
    {#if exercise}
      <ExerciseCard {book} {section} ex={exercise} />
    {:else if state?.status === 'missing'}
      <p class="gone">{registry.missingLine(ref)}</p>
    {:else if state?.status === 'failed'}
      <p class="gone">Section {section} could not be loaded, so this exercise cannot be shown.</p>
    {:else if state}
      <p class="gone">There is no exercise “{ex}” in section {section} any more.</p>
    {:else}
      <p class="gone">Loading section {section}…</p>
    {/if}
  </div>
</div>

<style>
  .ex-tab{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .head{flex:none;display:flex;align-items:baseline;gap:10px;padding:10px 28px 8px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .what{font-size:0.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .where{font:inherit;font-size:0.86rem;color:var(--ink);background:none;border:0;padding:2px 5px;margin-left:-5px;border-radius:5px;cursor:pointer}
  .where:hover{background:var(--soft);color:var(--accent)}
  .body{flex:1;min-height:0;overflow:auto;padding:16px 28px 40vh;max-width:820px;width:100%;margin:0 auto;box-sizing:border-box}
  .gone{color:var(--muted);font-size:0.9rem}
  @media (max-width:900px){ .head{padding:10px 18px 8px} .body{padding:14px 18px 30vh} }
</style>
