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
  import { offlineBooks } from '../../lib/offline/store.svelte';

  $effect(() => { if (ui.findTextbook) { void library.load(); void offlineBooks.check(); } });

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
  const bytes = (n: number): string => n < 1024 * 1024 ? `${Math.ceil(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
  const offlineSize = (id: string): string => { const n = offlineBooks.catalog?.books.find((book) => book.id === id)?.totalBytes; return n ? bytes(n) : ''; };
  const countChanges = (id: string): string => {
    const change = offlineBooks.changes[id]?.changes; if (!change) return '';
    const s = change.sections, r = change.resources;
    return `${s.added.length} sections added · ${s.changed.length} changed · ${s.removed.length} removed; ${r.added.length} resources added · ${r.changed.length} changed · ${r.removed.length} removed`;
  };
  const when = (value: string | number | undefined): string => value ? new Date(value).toLocaleString() : 'never';
  const releaseWhen = (value: string | undefined): string => !value || value.startsWith('1970-01-01') ? 'date not provided' : new Date(value).toLocaleDateString();
  const lastCheck = $derived(offlineBooks.lastCheck ?? Math.max(0, ...Object.values(offlineBooks.records).map((record) => record.lastCheck ?? 0)));
</script>

{#if ui.findTextbook}
  <div class="finder" role="dialog" aria-label="Find a textbook" tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); ui.closeFindTextbook(); } }}>
    <header>
      <span class="ico">{@html ICON.search}</span>
      <span class="title">Find a textbook</span>
      <button type="button" class="x" title="Close" aria-label="Close" onclick={() => ui.closeFindTextbook()}>×</button>
    </header>
    <div class="list">
      <div class="updates"><button type="button" class="add" disabled={offlineBooks.checking} onclick={() => void offlineBooks.check()}>{offlineBooks.checking ? 'Checking…' : 'Check for updates'}</button><span>Last successful check: {when(lastCheck || undefined)}</span>{#if offlineBooks.message}<span class="bad">{offlineBooks.message}</span>{/if}</div>
      {#if library.status === 'loading'}
        <div class="none">Looking for books…</div>
      {:else if library.status === 'failed'}
        <div class="none bad">The catalogue could not be read.</div>
      {:else}
        {#each library.books as b (b.id)}
          {@const installed = offlineBooks.records[b.id]}
          {@const available = offlineBooks.catalog?.books.find((book) => book.id === b.id)}
          {@const progress = offlineBooks.progress[b.id]}
          <div class="book" data-book={b.id}>
            <span class="bico">{@html ICON.book}</span>
            <span class="what">
              <span class="name">{b.title}</span>
              {#if parts(b)}<span class="who">{parts(b)}</span>{/if}
              <span class="counts">{size(b)}{offlineSize(b.id) ? ` · ${offlineSize(b.id)} offline` : ''}</span>
              {#if installed?.publishedAt}<span class="counts">Installed release: {releaseWhen(installed.publishedAt)}{installed.availableRelease && (installed.availableRelease !== installed.installedRelease || installed.availableArtifact !== installed.installedArtifact) ? ' · update available' : ''}</span>{/if}
              {#if available && installed?.installedRelease && (available.releaseId !== installed.installedRelease || available.artifactId !== installed.installedArtifact)}<span class="counts">Available release: {releaseWhen(available.publishedAt)}</span>{/if}
              {#if progress}<progress value={progress.bytes} max={progress.totalBytes}></progress><span class="counts">{progress.files} / {progress.totalFiles} files</span>{/if}
            </span>
            <span class="offline-actions">
              {#if offlineBooks.downloading(b.id)}
                <button type="button" class="add" onclick={() => offlineBooks.cancel(b.id)}>Cancel</button>
              {:else if installed?.installedRelease && installed.status === 'ready'}
                <span class="available">Available offline</span>
                {#if installed.availableRelease && (installed.availableRelease !== installed.installedRelease || installed.availableArtifact !== installed.installedArtifact)}<button type="button" class="add" onclick={() => void offlineBooks.loadChanges(b.id)}>View changes</button><button type="button" class="add" onclick={() => void offlineBooks.install(b.id)}>Update</button>{/if}
                <button type="button" class="add" onclick={() => void offlineBooks.remove(b.id)}>Remove download</button>
              {:else}
                <button type="button" class="add" onclick={() => void offlineBooks.install(b.id)}>{installed?.installedRelease ? 'Repair download' : installed?.status === 'failed' ? 'Retry download' : 'Download for offline use'}</button>
                {#if installed?.installedRelease}<button type="button" class="add" onclick={() => void offlineBooks.remove(b.id)}>Remove download</button>{/if}
              {/if}
            </span>
            {#if offlineBooks.changes[b.id]}<span class="change-note">{offlineBooks.changes[b.id].notes ?? countChanges(b.id)}</span>{/if}
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
  .book{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:8px 10px;padding:12px 14px}
  .book:hover{background:var(--soft)}
  .bico{grid-column:1;grid-row:1;display:grid;place-items:center;color:var(--muted)}
  .bico :global(svg){width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5}
  .what{grid-column:2;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .book > .add{grid-column:3;grid-row:1}
  .name{color:var(--ink);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .who,.counts{color:var(--muted);font-size:0.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .add{flex:none;border:1px solid var(--rule);border-radius:5px;background:transparent;color:var(--ink);font:inherit;font-size:0.8rem;padding:4px 12px;cursor:pointer}
  .add:hover:not(:disabled){background:var(--soft2)}
  .add:disabled{color:var(--muted);cursor:default;opacity:.7}
  .add:focus-visible{outline:2px solid var(--accent)}
  .offline-actions{grid-column:2 / -1;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
  .available{font-size:.72rem;color:var(--good,#16803c);white-space:nowrap}
  progress{width:100%;height:5px}
  .updates{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule);font-size:.76rem;color:var(--muted);overflow-wrap:anywhere}
  .change-note{grid-column:2 / -1;color:var(--muted);font-size:.74rem;overflow-wrap:anywhere}
  .none{padding:16px 14px;color:var(--muted)}
  .bad{color:var(--bad)}
  @media (max-width:600px){.name,.counts{white-space:normal;overflow-wrap:anywhere}.offline-actions .add{max-width:100%;white-space:normal}}
</style>
