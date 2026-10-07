<script lang="ts">
  /* The Open browser, in the palette's frame: OmniBooks and the reader's own
     files, walked as the @ picker walks them, down to a section, a note, a
     drawing or a file, which opens. The box searches everything below the
     level standing open; Right steps in, Left or Backspace on an empty box steps out,
     and Enter or a click opens the row, the way a click on a file anywhere
     does (Ctrl for a new tab, Ctrl+Alt for a group beside). Opened by the
     "Open…" command or a tab strip's "+", whose group it adds a tab to, and by
     "Pin view to…", which walks one book's chapters and sections to name a
     place in it rather than to open anything; browser.ts holds the trees,
     this file draws them. */
  import { tick, untrack } from 'svelte';
  import { ui } from '../lib/commands/ui.svelte';
  import { keys } from '../lib/commands/keys.svelte';
  import { openTree, pickTree, pickTarget, start, tabOfRow } from '../lib/commands/browser';
  import { faceOf, levelOf, trailOf, type Listed, type PickerNode, type PickerCategory } from '../lib/picker/model';
  import { pickerRoot } from '../lib/picker/sources';
  import { openItem, openingOf, type Opening } from '../lib/sections/nav.svelte';
  import { focus } from '../lib/sections/focus.svelte';
  import { registry } from '../lib/sections/registry.svelte';
  import { ICON } from '../lib/icons';
  import type { BookManifest } from '../lib/content/schema';

  type Props = { manifest: BookManifest };
  let { manifest }: Props = $props();

  let path = $state.raw<readonly string[]>([]);
  let query = $state('');
  let sel = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);

  const mode = $derived(ui.browser.mode);
  const root = $derived<readonly PickerNode[]>(mode === 'pick' ? pickTree(manifest) : openTree(pickerRoot()));
  const items = $derived<readonly Listed[]>(faceOf({ path: path.map((key) => ({ key, mark: '' })), index: 0 }, root, query));
  const trail = $derived(trailOf(root, path));
  const searching = $derived(query.trim() !== '');
  const ICONS: Readonly<Partial<Record<PickerCategory, string>>> = { sections: ICON.text, notes: ICON.note, drawings: ICON.drawing, files: ICON.file };
  const iconOf = (n: PickerNode): string => (n.row ? ICONS[n.row.category] : undefined) ?? ICON.folder;

  /* Stand at a level, unfiltered, on the row `key` names (the one we came from) or on the first. */
  const goto = (next: readonly string[], key: string | null): void => {
    const i = key === null ? -1 : levelOf(root, next).findIndex((n) => n.key === key);
    path = next; query = ''; sel = Math.max(0, i);
    /* A click on a crumb or a row took the focus with it, and the row may be gone now; the keys belong to the box. */
    tick().then(() => input?.focus());
  };
  const goUp = (depth = path.length - 1): void => { if (path.length) goto(path.slice(0, Math.max(0, depth)), path[Math.max(0, depth)] ?? null); };
  const descend = (l: Listed): void => { if (l.node.children) goto([...path, ...l.path], null); };
  /* A tab strip's "+" asks for a tab of that group; anywhere else a file opens as a click on one does. */
  const openingFor = (e: MouseEvent | KeyboardEvent): Opening => { const how = openingOf(e); return ui.browser.group !== null && how === 'replace' ? 'tab' : how; };
  /* Enter or a click takes the row: a place to pin to, a file to open, or one level further in. */
  const act = (l: Listed, e: MouseEvent | KeyboardEvent): void => {
    const row = l.node.row;
    if (!row) { descend(l); return; }
    if (mode === 'pick') {
      const t = pickTarget(manifest, row);
      if (t) { ui.browser.onPick?.(t); ui.closeBrowser(); }
      return;
    }
    const key = tabOfRow(row); if (!key) return;
    void openItem(key, ui.browser.group ?? undefined, openingFor(e));
    ui.closeBrowser();
  };

  /* Opening places the list beside what is being read; a later focus change must not move it. */
  $effect(() => {
    if (!ui.browser.open) return;
    untrack(() => {
      const at = focus.section;
      const tree = at && registry.hasBook(at.book) ? registry.manifest(at.book) : manifest;
      const s = start(tree, at && (mode === 'open' || at.book === manifest.id) ? at.section : null, mode);
      const whole = trailOf(root, s.path).length === s.path.length;
      goto(whole ? s.path : [], whole ? s.select : null);
    });
    tick().then(() => input?.focus());
  });
  /* What the level standing open needs is fetched as soon as it opens or is searched. */
  $effect(() => {
    if (!ui.browser.open) return;
    const at = trail.at(-1);
    if (at) untrack(() => void at.load?.());
    else if (searching) untrack(() => root.forEach((n) => void n.load?.()));
  });
  $effect(() => { const row = list?.children[sel] as HTMLElement | undefined; row?.scrollIntoView({ block: 'nearest' }); });

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); ui.closeBrowser(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = items.length ? (sel + 1) % items.length : 0; return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = items.length ? (sel - 1 + items.length) % items.length : 0; return; }
    if (e.key === 'Home' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = 0; return; }
    if (e.key === 'End' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = Math.max(0, items.length - 1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); const it = items[sel]; if (it) descend(it); return; }
    if (e.key === 'ArrowLeft' && !query) { e.preventDefault(); goUp(); return; }
    if (e.key === 'Backspace' && !query) { e.preventDefault(); goUp(); return; }
    if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; if (it) act(it, e); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) keys.dispatch(e);
  };
</script>

{#if ui.browser.open}
  <div class="browser" role="dialog" aria-label={mode === 'pick' ? 'Pin the view to a place in the book' : 'Open a file'} onclick={(e) => e.stopPropagation()} onkeydown={onKey}>
    <div class="crumbs">
      <button type="button" class="back" aria-label="Back" disabled={!path.length} onclick={() => goUp()}>‹</button>
      {#if trail.length}<button type="button" class="crumb" onclick={() => goUp(0)}>{mode === 'pick' ? manifest.title : 'Open'}</button>{:else}<span class="here">{mode === 'pick' ? manifest.title : 'Open'}</span>{/if}
      {#each trail as n, i (n.key)}
        <span class="sep">›</span>
        {#if i === trail.length - 1}<span class="here">{n.label}</span>{:else}<button type="button" class="crumb" onclick={() => goUp(i + 1)}>{n.label}</button>{/if}
      {/each}
    </div>
    <input bind:this={input} bind:value={query} oninput={() => (sel = 0)} type="text" spellcheck="false" autocomplete="off" aria-label="Filter" placeholder="Filter…" />
    <div class="list" bind:this={list} role="listbox">
      {#each items as l, i (l.path.join('/'))}
        <div class="row" class:sel={i === sel} class:dim={!l.node.row && !l.node.children} role="option" aria-selected={i === sel} tabindex="-1"
          onmousemove={() => (sel = i)} onclick={(e) => act(l, e)} onauxclick={(e) => { if (e.button === 1) act(l, e); }}>
          <span class="ico">{@html iconOf(l.node)}</span>
          <span class="lbl">{l.node.label}</span>
          {#if l.where}<span class="detail">{l.where}</span>{/if}
          <span class="chev">{l.node.children ? '›' : ''}</span>
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
  .detail{color:var(--muted);font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
  .chev{color:var(--muted);width:8px;text-align:right}
  .none{padding:14px 16px;color:var(--muted)}
</style>
