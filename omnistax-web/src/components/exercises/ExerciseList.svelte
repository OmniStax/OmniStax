<script lang="ts">
  /* The cards for one host inside a document: an inline "Try it" spot, or the
     end-of-section list with its all-at-once / one-at-a-time switch. The way on
     to a practice session stands below the cards rather than in the bar above
     them, centred and wearing the same pencil the section's text ends on, since
     it is what the reader reaches for once the problems are behind them. The
     shell catches that button's click, the way it catches the rail's split
     buttons: the list says which section it is, and the shell knows which group
     it sits in. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { FIG } from '../../lib/fig/figlib';
  import type { SectionId } from '../../lib/types/ids';
  import { placeKey } from '../../lib/content/schema';
  import { ICON } from '../../lib/icons';
  import ExerciseCard from './ExerciseCard.svelte';
  let { section, place }: { section: SectionId; place: string } = $props();
  const all = $derived(registry.state(section)?.exercises ?? []);
  const items = $derived(all.filter((e) => placeKey(e.place) === place));
  const isEnd = $derived(place === 'end');
  const one = $derived(isEnd && settings.exerciseMode === 'one');
  let at = $state(0);
  const clamp = (i: number) => Math.max(0, Math.min(i, items.length - 1));
  let root = $state<HTMLElement | null>(null);
  const step = (d: number) => { at = clamp(at + d); root?.scrollIntoView({ block: 'start', behavior: FIG.REDUCED ? 'auto' : 'smooth' }); };
  /* nav.jump calls this when a link targets a hidden card */
  $effect(() => { if (root) (root as HTMLElement & { exShow?: (id: string) => void }).exShow = (id) => { const i = items.findIndex((e) => `${section}-ex-${e.id}` === id); if (i >= 0) at = i; }; });
</script>

{#if items.length}
  <div class="list" class:one bind:this={root}>
    {#if isEnd}
      <div class="bar">
        <div class="eyebrow">Problems for this section</div>
        <div class="seg">
          <button type="button" class:on={!one} onclick={() => settings.setExerciseMode('all')}>All at once</button>
          <button type="button" class:on={one} onclick={() => settings.setExerciseMode('one')}>One at a time</button>
        </div>
        {#if one}
          <div class="nav">
            <button type="button" class="tbtn" title="Previous problem" disabled={at === 0} onclick={() => step(-1)}>‹</button>
            <span class="count">{clamp(at) + 1} of {items.length}</span>
            <button type="button" class="tbtn" title="Next problem" disabled={at >= items.length - 1} onclick={() => step(1)}>›</button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="eyebrow">Try it</div>
    {/if}
    {#each items as ex, i (ex.id)}
      <ExerciseCard {section} {ex} hidden={one && i !== clamp(at)} />
    {/each}
    {#if isEnd}
      <div class="practice-row">
        <button type="button" class="practise" data-practise-section={section} title="Open a practice session on this section">Practice this section{@html ICON.exercises}</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .list{margin:1.6rem 0}
  .list > .eyebrow{margin-bottom:8px}
  .bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;font-family:var(--sans)}
  .bar .eyebrow{margin:0}
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .seg button{font:inherit;font-size:0.78rem;padding:4px 10px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button+button{border-left:1px solid var(--rule)}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:600}
  /* the same button the section's text ends on, mirrored here */
  .practice-row{display:flex;justify-content:center;margin-top:16px;font-family:var(--sans)}
  .practise{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:0.8rem;font-weight:600;padding:5px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink);cursor:pointer}
  .practise :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .practise:hover{background:var(--soft)}
  .practise:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .nav{display:flex;align-items:center;gap:8px;margin-left:auto;font-size:0.8rem;color:var(--muted)}
  .count{font-variant-numeric:tabular-nums;min-width:4.5em;text-align:center}
</style>
