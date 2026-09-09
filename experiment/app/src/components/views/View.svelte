<script lang="ts">
  /* Dispatch a view by kind, under the bar that says where it stands. A view
     stands at a level of the book — the whole book, one chapter, or one section
     — and the bar is the trail to that place as well as the control that walks
     it. Every crumb reads the same way: its label sends the view to that level,
     and the chevron beside the chapter and the section opens the menu of the
     other chapters, or of the other sections of that chapter, to send it
     somewhere else. Choosing the place the open page lies in is the view
     following again; choosing any other place pins it there, which the pin
     button says and undoes. Above the section, the chapters in scope are asked
     for on the spot, since their concepts and formulas are wanted before any of
     their sections is open. */
  import { setContext } from 'svelte';
  import { scope } from '../../lib/sections/scope.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { atLevel, crumbsOf, resolve, sameTarget, siblingsOf, type Level, type Target } from '../../lib/sections/scope';
  import type { ViewKind } from '../../lib/types/ids';
  import { ICON } from '../../lib/icons';
  import CrumbMenu from './CrumbMenu.svelte';
  import ConceptMap from './ConceptMap.svelte';
  import Explorer from './Explorer.svelte';
  import Formulas from './Formulas.svelte';
  import Definitions from './Definitions.svelte';
  import Annotations from './Annotations.svelte';
  let { kind }: { kind: string } = $props();
  const vk = $derived(kind as ViewKind);
  /* The explorer is the whole tree — the reader's notes and every book they
     have added — so it stands nowhere in particular and wears no bar. */
  const hasBar = $derived(vk !== 'explorer');
  const target = $derived(scope.targetFor(vk));
  const pinned = $derived(scope.isPinned(vk));
  /* The trail is read from the narrowest place this view could stand at, so every crumb
     names where clicking it lands: a view following the book still says which chapter and
     which section it would come down to. */
  const deepest = $derived(resolve(atLevel(scope.of(vk), 'section', focus.section, registry.manifest), focus.section, registry.manifest));
  const crumbs = $derived(crumbsOf(deepest, registry.manifest));
  const at = $derived(crumbs.findIndex((c) => c.level === target.level));
  setContext('scope', () => target);
  /* Which crumb's menu is open, and where under the bar it hangs — the chevron that
     opened it, which the menu hands the focus back to when it closes. */
  let menu = $state<Level | null>(null);
  let menuLeft = $state(0);
  let chevrons = $state<Partial<Record<Level, HTMLButtonElement | null>>>({});
  const openMenu = (level: Level, chevron: HTMLButtonElement): void => { if (menu === level) { menu = null; return; } menuLeft = chevron.offsetLeft; menu = level; };
  const closeMenu = (): void => { const chevron = menu ? chevrons[menu] : null; menu = null; chevron?.focus(); };
  const choose = (place: Target): void => { scope.choose(vk, place); closeMenu(); };
  /* The places the open menu offers: the crumb's own place is the one the view stands on,
     and the place the open page lies in is named, since choosing it is following again. */
  const entries = $derived.by(() => {
    const level = menu;
    if (!level || level === 'book') return [];
    const mark = crumbs.find((c) => c.level === level)?.target ?? null;
    const page = resolve({ follow: true, level }, focus.section, registry.manifest);
    return siblingsOf(level, deepest, registry.manifest).map((s) => ({ target: s.target, label: `${s.id} · ${s.title}`, enabled: s.built, here: mark !== null && sameTarget(s.target, mark), page: sameTarget(s.target, page) }));
  });
  /* The chapters a view above the section reads from: the one it stands in, or every
     chapter the book has built something of. */
  const dirs = $derived(
    !hasBar || target.level === 'section' ? []
      : target.level === 'chapter' ? registry.manifest.chapters.filter((c) => c.id === target.chapter).map((c) => c.dir)
      : registry.manifest.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir),
  );
  $effect(() => { if (dirs.length) registry.loadChapters(dirs).catch(() => {}); });
  const loading = $derived(dirs.some((d) => registry.chapterStatus[d] === 'loading'));
  const failed = $derived(dirs.some((d) => registry.chapterStatus[d] === 'failed'));
</script>

<div class="view" data-view={kind} onpointerdown={() => (focus.view = vk)} onfocusincapture={() => (focus.view = vk)}>
  {#if hasBar}
  <div class="scope" class:pinned>
    <nav class="crumbs" aria-label="Where this view stands">
      {#each crumbs as c, i (c.level)}
        {#if i > 0}<span class="sep" aria-hidden="true">›</span>{/if}
        <button type="button" class="crumb" class:on={i === at} class:ahead={i > at} class:pinned={pinned && i === at} aria-current={i === at ? 'true' : undefined} title={c.long} onclick={() => scope.atLevel(vk, c.level)}>
          <span class="short">{c.short}</span><span class="long">{c.long}</span>
        </button>
        {#if c.level !== 'book'}
          <button type="button" class="chev" bind:this={chevrons[c.level]} aria-haspopup="listbox" aria-expanded={menu === c.level}
            aria-label={c.level === 'chapter' ? 'Choose the chapter this view describes' : 'Choose the section this view describes'}
            title={c.level === 'chapter' ? 'Choose another chapter' : 'Choose another section'}
            onclick={(e) => openMenu(c.level, e.currentTarget)}>▾</button>
        {/if}
      {/each}
    </nav>
    {#if target.level !== 'book'}
      <button type="button" class="pin" class:on={pinned} aria-pressed={pinned} title={pinned ? 'Unpin: follow the open page again' : `Pin this view to ${crumbs[at]?.short ?? 'here'}`} onclick={() => scope.togglePin(vk)}>{@html ICON.pin}</button>
    {/if}
    {#if menu}
      <div class="menuhold" style="margin-left:min({menuLeft}px, max(0px, 100% - 220px))">
        <CrumbMenu {entries} onchoose={choose} onclose={closeMenu} />
      </div>
    {/if}
  </div>
  {#if loading}<div class="chapters">Loading chapter data…</div>{:else if failed}<div class="chapters bad">Could not load chapter data.</div>{/if}
  {/if}
  {#if kind === 'explorer'}<Explorer />
  {:else if kind === 'concepts'}<ConceptMap />
  {:else if kind === 'formulas'}<Formulas />
  {:else if kind === 'definitions'}<Definitions />
  {:else}<Annotations />{/if}
</div>

<style>
  .scope{position:relative;display:flex;align-items:center;gap:6px;margin:0 0 8px;font-size:0.74rem;color:var(--muted);min-width:0}
  .crumbs{display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow:hidden}
  .crumb{font:inherit;font-size:inherit;color:var(--muted);background:none;border:0;border-radius:4px;padding:1px 3px;cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .crumb:hover{color:var(--ink);background:var(--soft2)}
  .crumb.on{color:var(--ink);font-weight:600}
  .crumb.ahead{opacity:.65}
  .crumb.pinned{background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .crumb:focus-visible{outline:2px solid var(--accent)}
  .chev{flex:none;margin-left:-3px;font:inherit;font-size:0.7rem;line-height:1;color:var(--muted);background:none;border:0;border-radius:4px;padding:2px 3px;cursor:pointer}
  .chev:hover{color:var(--ink);background:var(--soft2)}
  .chev[aria-expanded="true"]{color:var(--ink);background:var(--soft2)}
  .chev:focus-visible{outline:2px solid var(--accent)}
  .sep{flex:none;color:var(--muted);opacity:.45}
  .long{display:none}
  /* the menu hangs under the crumb that opened it, and never past the edge of the bar */
  .menuhold{position:absolute;top:100%;left:0;right:0;z-index:20;display:flex}
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
