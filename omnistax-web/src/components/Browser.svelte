<script lang="ts">
  /* The Open browser: the book as a small file tree in the palette's frame —
     chapters, then a chapter's sections, then a section's Text and Exercises,
     and below those the figures the text draws and the exercises it sets.
     The box filters the level you stand on; Right steps in, Left and an empty
     Backspace step out, Enter opens what it stands on in the group the browser
     was opened for. Opened by the "Open…" command or a tab strip's "+", and by
     "Pin view to…", which walks the same tree to name a place in the book
     rather than to open anything; browser.ts holds the walk, this file draws it. */
  import { tick, untrack } from 'svelte';
  import { ui } from '../lib/commands/ui.svelte';
  import { keys } from '../lib/commands/keys.svelte';
  import { rank } from '../lib/commands/fuzzy';
  import { pieces } from '../lib/commands/pieces';
  import { CHAPTERS, rowsAt, enter, up, crumbs, levelAt, start, keyOfLevel, pickTarget, type Level, type Row } from '../lib/commands/browser';
  import { openItem } from '../lib/sections/nav.svelte';
  import { focus } from '../lib/sections/focus.svelte';
  import { ICON } from '../lib/icons';
  import type { BookManifest } from '../lib/content/schema';

  type Props = { manifest: BookManifest };
  let { manifest }: Props = $props();

  let level = $state.raw<Level>(CHAPTERS);
  let query = $state('');
  let sel = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);

  const mode = $derived(ui.browser.mode);
  const items = $derived(rank(query, rowsAt(manifest, level, mode), (r) => r.label));
  const trail = $derived(crumbs(manifest, level));
  const ICONS: Readonly<Record<Row['kind'], string>> = { book: ICON.folder, chapter: ICON.folder, section: ICON.folder, doc: ICON.text, fig: ICON.split, ex: ICON.exercises };
  const iconOf = (r: Row): string => (r.kind === 'doc' && r.doc === 'exercises' ? ICON.exercises : ICONS[r.kind]);

  /* Stand at a level, unfiltered, on the row `key` names (the one we came from) or on the first. */
  const goto = (next: Level | null, key: string | null): void => {
    if (!next) return;
    const i = key === null ? -1 : rowsAt(manifest, next, mode).findIndex((r) => r.key === key);
    level = next; query = ''; sel = Math.max(0, i);
  };
  const goUp = (): void => goto(up(level), keyOfLevel(level));
  const goCrumb = (depth: number): void => goto(levelAt(level, depth), keyOfLevel(levelAt(level, depth + 1)));
  /* Enter takes the row: a place to pin to, a thing to open, or one level further in. */
  const act = (r: Row): void => {
    if (mode === 'pick') {
      const t = pickTarget(level, r);
      if (t) { ui.browser.onPick?.(t); ui.closeBrowser(); return; }
      goto(enter(level, r, mode), null); return;
    }
    if (r.kind === 'doc' || r.kind === 'fig' || r.kind === 'ex') { openItem(r.key, ui.browser.group ?? undefined); ui.closeBrowser(); return; }
    goto(enter(level, r), null);
  };

  /* Opening places the tree beside what is being read; a later focus change must not move it. */
  $effect(() => {
    if (!ui.browser.open) return;
    const s = untrack(() => start(manifest, focus.section));
    goto(s.level, s.select);
    tick().then(() => input?.focus());
  });
  $effect(() => { const row = list?.children[sel] as HTMLElement | undefined; row?.scrollIntoView({ block: 'nearest' }); });

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); ui.closeBrowser(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = items.length ? (sel + 1) % items.length : 0; return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = items.length ? (sel - 1 + items.length) % items.length : 0; return; }
    if (e.key === 'Home' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = 0; return; }
    if (e.key === 'End' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = Math.max(0, items.length - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); const it = items[sel]; if (it) goto(enter(level, it.item, mode), null); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goUp(); return; }
    if (e.key === 'Backspace' && !query) { e.preventDefault(); goUp(); return; }
    if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; if (it) act(it.item); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) keys.dispatch(e);
  };
</script>

{#if ui.browser.open}
  <div class="browser" role="dialog" aria-label={mode === 'pick' ? 'Pin the view to a place in the book' : 'Open a section'} onclick={(e) => e.stopPropagation()} onkeydown={onKey}>
    <div class="crumbs">
      <button type="button" class="back" title="Back" disabled={level.kind === 'chapters'} onclick={goUp}>‹</button>
      {#each trail as c, i (i)}
        {#if i > 0}<span class="sep">›</span>{/if}
        {#if i === trail.length - 1}<span class="here">{c}</span>{:else}<button type="button" class="crumb" onclick={() => goCrumb(i)}>{c}</button>{/if}
      {/each}
    </div>
    <input bind:this={input} bind:value={query} oninput={() => (sel = 0)} type="text" spellcheck="false" autocomplete="off" aria-label="Filter" placeholder="Filter…" />
    <div class="list" bind:this={list} role="listbox">
      {#each items as { item, match }, i (item.key)}
        <div class="row" class:sel={i === sel} class:dim={item.kind === 'section' && !item.built} role="option" aria-selected={i === sel} onmousemove={() => (sel = i)} onclick={() => act(item)}>
          <span class="ico">{@html iconOf(item)}</span>
          <span class="lbl">{#each pieces(item.label, 0, match.indices) as p}{#if p.hit}<b>{p.t}</b>{:else}{p.t}{/if}{/each}</span>
          {#if item.detail}<span class="detail">{item.detail}</span>{/if}
          <span class="chev">{item.enterable ? '›' : ''}</span>
        </div>
      {:else}
        <div class="none">Nothing matches</div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .browser{position:fixed;top:10vh;left:50%;transform:translateX(-50%);width:min(640px,92vw);z-index:50;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.22);font-family:var(--sans);font-size:0.9rem;display:flex;flex-direction:column;overflow:hidden}
  .crumbs{display:flex;align-items:center;gap:6px;padding:8px 16px 0;color:var(--muted);font-size:0.78rem;overflow:hidden;white-space:nowrap}
  .back{border:0;background:transparent;color:var(--muted);font:inherit;font-size:1rem;line-height:1;cursor:pointer;padding:0 4px;border-radius:4px}
  .back:hover:not(:disabled){color:var(--ink);background:var(--soft2)}
  .back:disabled{opacity:.35;cursor:default}
  .crumb{border:0;background:transparent;color:var(--muted);font:inherit;cursor:pointer;padding:0 2px;border-radius:4px;overflow:hidden;text-overflow:ellipsis}
  .crumb:hover{color:var(--ink);text-decoration:underline}
  .here{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis}
  .sep{opacity:.6}
  input{border:0;border-bottom:1px solid var(--rule);padding:10px 16px 12px;font:inherit;font-size:1rem;background:transparent;color:var(--ink);outline:none;width:100%;box-sizing:border-box}
  input::placeholder{color:var(--muted)}
  .list{max-height:min(50vh,420px);overflow:auto;padding:6px 0}
  .row{display:flex;align-items:center;gap:8px;padding:6px 16px;cursor:pointer;line-height:1.4}
  .row.sel{background:var(--soft)}
  .row.dim{opacity:.5;cursor:default}
  .ico{display:grid;place-items:center;color:var(--muted);flex:none}
  .ico :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6}
  .lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  b{font-weight:600;color:var(--accent)}
  .detail{color:var(--muted);font-size:0.78rem;white-space:nowrap}
  .chev{color:var(--muted);width:8px;text-align:right}
  .none{padding:14px 16px;color:var(--muted)}
</style>
