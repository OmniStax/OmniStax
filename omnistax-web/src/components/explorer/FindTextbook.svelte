<script lang="ts">
  /* The floater the explorer opens to find a textbook: every book this build
     carries, with who made it and how much of it there is, and a button that
     puts the one you choose under User. The catalogue is fetched the first
     time the floater is opened and kept for the rest of the visit. */
  import { ui } from '../../lib/commands/ui.svelte';
  import { library, type LibraryBookDTO } from '../../lib/explorer/library.svelte';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { bookKey } from '../../lib/explorer/model';
  import { ICON } from '../../lib/icons';

  $effect(() => { if (ui.findTextbook) void library.load(); });

  /* Adding a book puts its row under User; the row opens as well, so that the
     chapters are there to be read straight away. */
  const add = (b: LibraryBookDTO): void => {
    library.add(b.id, b.title);
    if (!explorer.expanded(bookKey(b.id))) explorer.toggle(bookKey(b.id));
  };
  const parts = (b: LibraryBookDTO): string =>
    [b.publisher, b.authors.join(', ')].filter((s) => s.length > 0).join(' · ');
  const size = (b: LibraryBookDTO): string =>
    `${b.chapters} ${b.chapters === 1 ? 'chapter' : 'chapters'} · ${b.sections} ${b.sections === 1 ? 'section' : 'sections'}`;
</script>

{#if ui.findTextbook}
  <div class="finder" role="dialog" aria-label="Find a textbook"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); ui.closeFindTextbook(); } }}>
    <header>
      <span class="ico">{@html ICON.search}</span>
      <span class="title">Find a textbook</span>
      <button type="button" class="x" title="Close" aria-label="Close" onclick={() => ui.closeFindTextbook()}>×</button>
    </header>
    <div class="list">
      {#if library.status === 'loading'}
        <div class="none">Looking for books…</div>
      {:else if library.status === 'failed'}
        <div class="none bad">The catalogue could not be read.</div>
      {:else}
        {#each library.books as b (b.id)}
          <div class="book" data-book={b.id}>
            <span class="bico">{@html ICON.book}</span>
            <span class="what">
              <span class="name">{b.title}</span>
              {#if parts(b)}<span class="who">{parts(b)}</span>{/if}
              <span class="counts">{size(b)}</span>
            </span>
            {#if library.has(b.id)}
              <button type="button" class="add" disabled title="Already under User">Added</button>
            {:else}
              <button type="button" class="add" title="Add {b.title} to your tree" onclick={() => add(b)}>Add</button>
            {/if}
          </div>
        {:else}
          <div class="none">This build carries no books yet.</div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .finder{position:fixed;top:12vh;left:50%;transform:translateX(-50%);width:min(560px,92vw);z-index:50;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.22);font-family:var(--sans);font-size:0.9rem;display:flex;flex-direction:column;overflow:hidden}
  header{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule)}
  header .title{flex:1;font-weight:600;color:var(--ink)}
  header .ico{display:grid;place-items:center;color:var(--muted)}
  header .ico :global(svg){width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6}
  .x{width:24px;height:24px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;font-size:16px;line-height:1}
  .x:hover{background:var(--soft2);color:var(--ink)}
  .list{max-height:min(52vh,440px);overflow:auto;padding:6px 0}
  .book{display:flex;align-items:center;gap:10px;padding:9px 14px}
  .book:hover{background:var(--soft)}
  .bico{display:grid;place-items:center;color:var(--muted);flex:none}
  .bico :global(svg){width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5}
  .what{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .name{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .who,.counts{color:var(--muted);font-size:0.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .add{flex:none;border:1px solid var(--rule);border-radius:5px;background:transparent;color:var(--ink);font:inherit;font-size:0.8rem;padding:4px 12px;cursor:pointer}
  .add:hover:not(:disabled){background:var(--soft2)}
  .add:disabled{color:var(--muted);cursor:default;opacity:.7}
  .add:focus-visible{outline:2px solid var(--accent)}
  .none{padding:16px 14px;color:var(--muted)}
  .none.bad{color:var(--bad)}
</style>
