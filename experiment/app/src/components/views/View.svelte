<script lang="ts">
  /* Dispatch a view by kind, under a scope header: the section the view
     describes. A view follows the focused document until it is pinned, and a
     pinned view can be pointed at any built section. `asTab` widens the scope
     (the concept map shows the whole chapter). */
  import { setContext } from 'svelte';
  import { scope } from '../../lib/sections/scope.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { sectionId, type ViewKind } from '../../lib/types/ids';
  import { ICON } from '../../lib/icons';
  import ConceptMap from './ConceptMap.svelte';
  import Contents from './Contents.svelte';
  import Formulas from './Formulas.svelte';
  import Definitions from './Definitions.svelte';
  import Notes from './Notes.svelte';
  let { kind, asTab }: { kind: string; asTab: boolean } = $props();
  const vk = $derived(kind as ViewKind);
  const sec = $derived(scope.sectionFor(vk));
  const pinned = $derived(scope.isPinned(vk));
  const title = $derived(registry.entry(sec)?.title ?? '');
  const built = $derived(registry.manifest.chapters.flatMap((c) => c.sections).filter((s) => s.built));
  setContext('scope', () => sec);
</script>

<div class="view" data-view={kind}>
  <div class="scope" class:pinned>
    {#if pinned}
      <select aria-label="Section this view describes" value={sec} onchange={(e) => scope.pin(vk, sectionId((e.currentTarget as HTMLSelectElement).value))}>
        {#each built as s (s.id)}<option value={s.id}>{s.id} · {s.title}</option>{/each}
      </select>
    {:else}
      <span class="sec" title={title}><b>{sec}</b> · following the page</span>
    {/if}
    <button type="button" class="pin" class:on={pinned} aria-pressed={pinned} title={pinned ? 'Unpin: follow the open page again' : `Pin this view to ${sec}`} onclick={() => (pinned ? scope.unpin(vk) : scope.pin(vk, sec))}>{@html ICON.pin}</button>
  </div>
  {#if kind === 'concepts'}<ConceptMap chapterWide={asTab} />
  {:else if kind === 'contents'}<Contents />
  {:else if kind === 'formulas'}<Formulas />
  {:else if kind === 'definitions'}<Definitions />
  {:else}<Notes />{/if}
</div>

<style>
  .scope{display:flex;align-items:center;gap:6px;margin:0 0 8px;font-size:0.74rem;color:var(--muted);min-width:0}
  .scope .sec{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .scope .sec b{color:var(--ink);font-weight:600}
  .scope select{flex:1;min-width:0;font:inherit;font-size:0.76rem;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:4px;padding:2px 4px}
  .pin{width:22px;height:22px;flex:none;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0}
  .pin:hover{background:var(--soft2);color:var(--ink)}
  .pin.on{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .pin :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .pin:focus-visible{outline:2px solid var(--accent)}
  .view :global(details){margin:6px 0 10px}
  .view :global(details > summary){cursor:pointer;color:var(--muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
  .view :global(details.other){border-top:1px solid var(--rule);padding-top:8px}
  .view :global(details.other .eyebrow){margin-top:8px}
</style>
