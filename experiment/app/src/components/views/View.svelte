<script lang="ts">
  /* Dispatch a view by kind. `asTab` widens the scope (the concept map shows the whole chapter). */
  import ConceptMap from './ConceptMap.svelte';
  import Contents from './Contents.svelte';
  import Formulas from './Formulas.svelte';
  import Definitions from './Definitions.svelte';
  import Notes from './Notes.svelte';
  let { kind, asTab }: { kind: string; asTab: boolean } = $props();
</script>

<div class="view" data-view={kind}>
  {#if kind === 'concepts'}<ConceptMap chapterWide={asTab} />
  {:else if kind === 'contents'}<Contents />
  {:else if kind === 'formulas'}<Formulas />
  {:else if kind === 'definitions'}<Definitions />
  {:else}<Notes />{/if}
</div>

<style>
  .view :global(details){margin:6px 0 10px}
  .view :global(details > summary){cursor:pointer;color:var(--muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
  .view :global(details.other){border-top:1px solid var(--rule);padding-top:8px}
  .view :global(details.other .eyebrow){margin-top:8px}
</style>
