<script lang="ts">
  /* One exercise in a tab of its own. The card is the same component the
     exercises document lists, given the room a tab has and told it is standing
     alone, so it does not offer a split of itself again. The line above it names
     the section and leads back to the card where it belongs, opening the
     exercises document and jumping to it — revealing it first if the reader is
     working one problem at a time. Answer state belongs to the card instance, as
     it does for a document cloned into a second group: what is typed here is
     this card's, and the copy in the exercises document keeps its own. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { openDoc, jump } from '../../lib/sections/nav.svelte';
  import { exItem, exerciseDomId, type GroupKey, type SectionId } from '../../lib/types/ids';
  import ExerciseCard from './ExerciseCard.svelte';
  let { groupKey, section, ex }: { groupKey: GroupKey; section: SectionId; ex: string } = $props();
  const state = $derived(registry.state(section));
  const dto = $derived(state?.exercises.find((e) => e.id === ex));
  const loading = $derived((state?.status ?? 'loading') === 'loading');
  const domId = $derived(exerciseDomId(section, ex));
  let root = $state<HTMLElement | null>(null);
  $effect(() => { registry.load(section).catch(() => {}); });
  /* The tab's root carries the same decoration a prepared document root gets, so
     the goto cards and the notes layer read it as they read any other root. */
  $effect(() => { if (root && dto) registry.decorateRoot(root); });
  /* The card in the exercises document, never this tab's own copy of it; that document
     may still be mounting when the open resolves, so the look is retried for a few frames. */
  const inDocument = (): HTMLElement | null => Array.from(document.querySelectorAll<HTMLElement>(`[id="${domId}"]`)).find((e) => !!e.closest('article[data-doc]')) ?? null;
  const land = (tries = 12): void => { const el = inDocument(); if (el) jump(el); else if (tries > 0) requestAnimationFrame(() => land(tries - 1)); };
  const back = () => { openDoc(section, 'exercises').then(() => land()).catch(() => {}); };
</script>

<div class="ex-root" data-sec={section} data-chapter={registry.chapterOf(section)?.dir ?? ''} data-one="1" bind:this={root}>
  {#if dto}
    <button type="button" class="eyebrow up" title="Show this problem in the section's exercises" onclick={back}>{section} · Problems &amp; Exercises</button>
    <ExerciseCard {section} ex={dto} standalone />
  {:else if loading}
    <article class="placeholder"><div class="loading">Loading {registry.title(exItem(section, ex))}…</div></article>
  {:else}
    <article class="placeholder"><div class="loading bad">This exercise is not in {section}.</div></article>
  {/if}
</div>

<style>
  .ex-root{max-width:760px;margin:0 auto;padding:28px 40px 120px;font-family:var(--sans);font-size:0.95rem}
  .eyebrow.up{display:block;margin:0 0 8px;padding:0;border:0;background:none;font:inherit;cursor:pointer}
  .eyebrow.up:hover{color:var(--ink)}
  .eyebrow.up:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:3px}
  @media (max-width:900px){ .ex-root{padding:20px 18px 80px} }
</style>
