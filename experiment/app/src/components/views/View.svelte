<script lang="ts">
  /* Dispatch a view by kind, under the bar that says where it stands. A view
     stands at a level of the book — the whole book, one chapter, or one section
     — and the bar is the trail to that place as well as the control that walks
     it: clicking a crumb sends the view to that level. The view follows the open
     page until it is pinned, and a pinned view names its own place in a picker.
     Above the section, the chapters in scope are asked for on the spot, since
     their concepts and formulas are wanted before any of their sections is open. */
  import { setContext } from 'svelte';
  import { scope } from '../../lib/sections/scope.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { atLevel, crumbsOf, resolve } from '../../lib/sections/scope';
  import { chapterId, sectionId, type ViewKind } from '../../lib/types/ids';
  import { ICON } from '../../lib/icons';
  import ConceptMap from './ConceptMap.svelte';
  import Contents from './Contents.svelte';
  import Formulas from './Formulas.svelte';
  import Definitions from './Definitions.svelte';
  import Notes from './Notes.svelte';
  let { kind }: { kind: string } = $props();
  const vk = $derived(kind as ViewKind);
  const target = $derived(scope.targetFor(vk));
  const pinned = $derived(scope.isPinned(vk));
  /* The trail is read from the narrowest place this view could stand at, so every crumb
     names where clicking it lands: a view following the book still says which chapter and
     which section it would come down to. */
  const deepest = $derived(resolve(atLevel(scope.of(vk), 'section', focus.section, registry.manifest), focus.section, registry.manifest));
  const crumbs = $derived(crumbsOf(deepest, registry.manifest));
  const at = $derived(crumbs.findIndex((c) => c.level === target.level));
  const built = $derived(registry.manifest.chapters.flatMap((c) => c.sections).filter((s) => s.built));
  const here = $derived(target.level === 'chapter' ? target.chapter : target.level === 'section' ? target.section : '');
  setContext('scope', () => target);
  /* The chapters a view above the section reads from: the one it stands in, or every
     chapter the book has built something of. */
  const dirs = $derived(
    target.level === 'section' ? []
      : target.level === 'chapter' ? registry.manifest.chapters.filter((c) => c.id === target.chapter).map((c) => c.dir)
      : registry.manifest.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir),
  );
  $effect(() => { if (dirs.length) registry.loadChapters(dirs).catch(() => {}); });
  const loading = $derived(dirs.some((d) => registry.chapterStatus[d] === 'loading'));
  const failed = $derived(dirs.some((d) => registry.chapterStatus[d] === 'failed'));
</script>

<div class="view" data-view={kind} onpointerdown={() => (focus.view = vk)} onfocusincapture={() => (focus.view = vk)}>
  <div class="scope" class:pinned>
    <nav class="crumbs" aria-label="Where this view stands">
      {#each crumbs as c, i (c.level)}
        {#if i > 0}<span class="sep" aria-hidden="true">›</span>{/if}
        {#if pinned && i === at && c.level === 'chapter'}
          <select aria-label="Chapter this view describes" value={here} onchange={(e) => scope.pin(vk, { level: 'chapter', chapter: chapterId((e.currentTarget as HTMLSelectElement).value) })}>
            {#each registry.manifest.chapters as ch (ch.id)}<option value={ch.id}>{ch.id} · {ch.title}</option>{/each}
          </select>
        {:else if pinned && i === at}
          <select aria-label="Section this view describes" value={here} onchange={(e) => scope.pin(vk, { level: 'section', section: sectionId((e.currentTarget as HTMLSelectElement).value) })}>
            {#each built as s (s.id)}<option value={s.id}>{s.id} · {s.title}</option>{/each}
          </select>
        {:else}
          <button type="button" class="crumb" class:on={i === at} class:ahead={i > at} aria-current={i === at ? 'true' : undefined} title={c.long} onclick={() => scope.atLevel(vk, c.level)}>
            <span class="short">{c.short}</span><span class="long">{c.long}</span>
          </button>
        {/if}
      {/each}
    </nav>
    {#if target.level !== 'book'}
      <button type="button" class="pin" class:on={pinned} aria-pressed={pinned} title={pinned ? 'Unpin: follow the open page again' : `Pin this view to ${crumbs[at]?.short ?? here}`} onclick={() => scope.togglePin(vk)}>{@html ICON.pin}</button>
    {/if}
  </div>
  {#if loading}<div class="chapters">Loading chapter data…</div>{:else if failed}<div class="chapters bad">Could not load chapter data.</div>{/if}
  {#if kind === 'concepts'}<ConceptMap />
  {:else if kind === 'contents'}<Contents />
  {:else if kind === 'formulas'}<Formulas />
  {:else if kind === 'definitions'}<Definitions />
  {:else}<Notes />{/if}
</div>

<style>
  .scope{display:flex;align-items:center;gap:6px;margin:0 0 8px;font-size:0.74rem;color:var(--muted);min-width:0}
  .crumbs{display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow:hidden}
  .crumb{font:inherit;font-size:inherit;color:var(--muted);background:none;border:0;border-radius:4px;padding:1px 3px;cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .crumb:hover{color:var(--ink);background:var(--soft2)}
  .crumb.on{color:var(--ink);font-weight:600}
  .crumb.ahead{opacity:.65}
  .crumb:focus-visible{outline:2px solid var(--accent)}
  .sep{flex:none;color:var(--muted);opacity:.45}
  .long{display:none}
  .scope select{flex:1;min-width:0;font:inherit;font-size:0.76rem;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:4px;padding:2px 4px}
  .pin{width:22px;height:22px;flex:none;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0}
  .pin:hover{background:var(--soft2);color:var(--ink)}
  .pin.on{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .pin :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .pin:focus-visible{outline:2px solid var(--accent)}
  .chapters{color:var(--muted);font-size:0.78rem;padding:0 0 8px}
  .chapters.bad{color:var(--bad)}
  /* a tab has room for the full names, a sidebar only for the short ones */
  :global(.view-pane) .short{display:none}
  :global(.view-pane) .long{display:inline}
  :global(.view-pane) .scope{font-size:0.85rem}
  .view :global(details){margin:6px 0 10px}
  .view :global(details > summary){cursor:pointer;color:var(--muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
  .view :global(details.chapter > summary){text-transform:none;letter-spacing:0.01em;color:var(--ink)}
  .view :global(details.other){border-top:1px solid var(--rule);padding-top:8px}
  .view :global(details.other .eyebrow){margin-top:8px}
</style>
