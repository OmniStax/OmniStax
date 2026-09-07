<script lang="ts">
  /* One exercise: kind, level and concept chips, the prompt, an answer widget
     chosen by the answer's type, and the book's solution or an AI-marked approach. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { pin } from '../../lib/sections/concepts.svelte';
  import { cite } from '../../lib/sections/nav.svelte';
  import { conceptId, exerciseDomId, type SectionId } from '../../lib/types/ids';
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { math } from '../actions/math';
  import NumberAnswer from './NumberAnswer.svelte';
  import MultiAnswer from './MultiAnswer.svelte';
  import ChoiceAnswer from './ChoiceAnswer.svelte';
  let { section, ex, hidden = false }: { section: SectionId; ex: ExerciseDTO; hidden?: boolean } = $props();
  const kinds = $derived(registry.manifest.exerciseKinds);
  const hot = $derived(pin.pinned !== null && ex.concepts.includes(pin.pinned));
  const concept = (id: string) => registry.concept(id);
  const a = $derived(ex.answer);
</script>

<div class="exercise" class:hot id={exerciseDomId(section, ex.id)} {hidden}>
  <div class="meta">
    <span class="chip">{kinds[ex.kind] ?? ex.kind}</span>
    {#if ex.tag}<span class="chip">{ex.tag}</span>{/if}
    <span class="chip bloom">{ex.bloom}</span>
    {#each ex.concepts as c (c)}
      {@const k = concept(c)}
      <button type="button" class="chip concept k-{k?.kind ?? 'idea'}" class:hot={pin.pinned === c} data-concept={c} title={k ? `${k.kind}: click to pin` : c} onclick={() => pin.toggle(conceptId(c))}><span use:math={k?.name}>{@html k?.name ?? c}</span></button>
    {/each}
  </div>
  <div class="prompt" use:math={ex.prompt}><p>{@html ex.prompt}</p></div>
  {#if ex.figure}<figure class="photo"><img src={ex.figure.src} alt={ex.figure.alt}>{#if ex.figure.caption}<figcaption><span>{ex.figure.caption}</span></figcaption>{/if}</figure>{/if}
  {#if a.type === 'number'}<NumberAnswer answer={a} />
  {:else if a.type === 'multi'}<MultiAnswer answer={a} />
  {:else if a.type === 'choice'}<ChoiceAnswer answer={a} name="c-{section}-{ex.id}" />{/if}
  {#if ex.cite || a.solution}
    <div class="foot">
      {#if ex.cite}<button type="button" class="cite" onclick={() => cite(`${section}-${ex.cite}`)}>Show me the passage</button>{/if}
    </div>
  {/if}
  {#if a.solution}
    <details class="solution"><summary>{a.type === 'open' ? 'Suggested approach' : 'Solution'} ({a.generated_by === 'ai' ? 'AI' : 'book'})</summary><div use:math={a.solution}>{@html a.solution}</div></details>
  {/if}
</div>

<style>
  .exercise{border:1px solid var(--rule);border-left:3px solid var(--warm);border-radius:6px;background:var(--panel);padding:12px 16px;margin:0 0 12px;font-size:0.97rem}
  .exercise.hot{border-color:var(--accent)}
  .exercise[hidden]{display:none}
  .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-family:var(--sans);font-size:0.72rem;margin-bottom:8px}
  .chip.bloom{background:color-mix(in srgb,var(--warm) 14%,transparent);color:var(--warm)}
  .chip.concept{font:inherit;border:1px solid transparent;cursor:pointer}
  .chip.concept.k-idea{background:var(--soft2)}
  .chip.concept.k-skill{font-style:italic;background:transparent;border-color:var(--rule)}
  .chip.concept.hot{border-color:var(--accent);color:var(--ink)}
  .chip.concept:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .prompt{margin-bottom:8px}
  .prompt :global(p){margin:0}
  .prompt :global(table.data){border-collapse:collapse;font-family:var(--sans);font-size:0.85rem;margin:8px 0;font-variant-numeric:tabular-nums}
  .prompt :global(table.data th),.prompt :global(table.data td){border:1px solid var(--rule);padding:2px 10px;text-align:right}
  .foot{display:flex;gap:8px;align-items:center;margin-top:6px;font-family:var(--sans);font-size:0.88rem}
  .cite{font-family:var(--sans);font-size:0.8rem;color:var(--muted);text-decoration:underline dotted;cursor:pointer;background:none;border:0;padding:0}
  details.solution{font-family:var(--sans);font-size:0.9rem;margin-top:8px}
  details.solution summary{cursor:pointer;color:var(--muted);font-weight:600;font-size:0.8rem}
  details.solution > div{padding:6px 0 2px;font-family:var(--serif);font-size:0.95rem}
</style>
