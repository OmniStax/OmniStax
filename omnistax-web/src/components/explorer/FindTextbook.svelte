<script lang="ts">
  /* The floater the explorer opens to find a textbook: every book this build
     carries, with who made it and how much of it there is, and a button that
     puts the one you choose under User. The catalogue is fetched the first
     time the floater is opened and kept for the rest of the visit. A book's
     translations are listed beneath their source, each with its own controls;
     a translation whose source this build does not carry stands on its own. */
  import { ui } from '../../lib/commands/ui.svelte';
  import { library, type LibraryBookDTO } from '../../lib/explorer/library.svelte';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { bookKey } from '../../lib/explorer/model';
  import { ICON } from '../../lib/icons';
  import { offlineBooks } from '../../lib/offline/store.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { editionGroups, languageName } from '../../lib/explorer/editions';

  $effect(() => { if (ui.findTextbook) { void library.load(); void offlineBooks.check(); } });

  /* Adding a book puts its row under User; the row opens as well, so that the
     chapters are there to be read straight away. */
  const add = (b: LibraryBookDTO): void => {
    library.add(b.id, b.title);
    if (!explorer.expanded(bookKey(b.id))) explorer.toggle(bookKey(b.id));
  };
  const parts = (b: LibraryBookDTO): string =>
    [b.publisher, b.authors.join(', ')].filter((s) => s.length > 0).join(' · ');
  const size = (b: LibraryBookDTO): string => i18n.t('explorer.findTextbook.size', { chapters: b.chapters, sections: b.sections });
  const bytes = (n: number): string => n < 1024 * 1024 ? `${Math.ceil(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
  const offlineSize = (id: string): string => { const n = offlineBooks.catalog?.books.find((book) => book.id === id)?.totalBytes; return n ? bytes(n) : ''; };
  const countChanges = (id: string): string => {
    const change = offlineBooks.changes[id]?.changes; if (!change) return '';
    const s = change.sections, r = change.resources;
    return i18n.t('offline.changes.count', { sa: s.added.length, sc: s.changed.length, sr: s.removed.length, ra: r.added.length, rc: r.changed.length, rr: r.removed.length });
  };
  const when = (value: string | number | undefined): string => value ? new Date(value).toLocaleString(i18n.locale) : i18n.t('offline.never');
  const releaseWhen = (value: string | undefined): string => !value || value.startsWith('1970-01-01') ? i18n.t('offline.noDate') : new Date(value).toLocaleDateString(i18n.locale);
  const groups = $derived(editionGroups(library.books));
  const editionLabel = (b: LibraryBookDTO): string => i18n.t('language.edition', { language: languageName(b.language, i18n.locale) });
  const lastCheck = $derived(offlineBooks.lastCheck ?? Math.max(0, ...Object.values(offlineBooks.records).map((record) => record.lastCheck ?? 0)));
</script>

{#snippet row(b: LibraryBookDTO, edition: boolean)}
  {@const installed = offlineBooks.records[b.id]}
  {@const available = offlineBooks.catalog?.books.find((book) => book.id === b.id)}
  {@const progress = offlineBooks.progress[b.id]}
  <div class="book" class:edition data-book={b.id}>
    <span class="bico">{@html ICON.book}</span>
    <span class="what">
      {#if edition}<span class="lang">{editionLabel(b)}</span>{/if}
      <span class="name" lang={b.language}>{b.title}</span>
      {#if parts(b)}<span class="who">{parts(b)}</span>{/if}
      <span class="counts">{size(b)}{offlineSize(b.id) ? ` · ${i18n.t('offline.size', { size: offlineSize(b.id) })}` : ''}</span>
      {#if installed?.publishedAt}<span class="counts">{i18n.t('offline.installedRelease', { when: releaseWhen(installed.publishedAt) })}{installed.availableRelease && (installed.availableRelease !== installed.installedRelease || installed.availableArtifact !== installed.installedArtifact) ? ` · ${i18n.t('offline.updateAvailable')}` : ''}</span>{/if}
      {#if available && installed?.installedRelease && (available.releaseId !== installed.installedRelease || available.artifactId !== installed.installedArtifact)}<span class="counts">{i18n.t('offline.availableRelease', { when: releaseWhen(available.publishedAt) })}</span>{/if}
      {#if progress}<progress value={progress.bytes} max={progress.totalBytes}></progress><span class="counts">{i18n.t('offline.progress', { done: progress.files, total: progress.totalFiles })}</span>{/if}
    </span>
    <span class="offline-actions">
      {#if offlineBooks.downloading(b.id)}
        <button type="button" class="add" onclick={() => offlineBooks.cancel(b.id)}>{i18n.t('offline.cancel')}</button>
      {:else if installed?.installedRelease && installed.status === 'ready'}
        <span class="available">{i18n.t('offline.available')}</span>
        {#if installed.availableRelease && (installed.availableRelease !== installed.installedRelease || installed.availableArtifact !== installed.installedArtifact)}<button type="button" class="add" onclick={() => void offlineBooks.loadChanges(b.id)}>{i18n.t('offline.viewChanges')}</button><button type="button" class="add" onclick={() => void offlineBooks.install(b.id)}>{i18n.t('offline.update')}</button>{/if}
        <button type="button" class="add" onclick={() => void offlineBooks.remove(b.id)}>{i18n.t('offline.remove')}</button>
      {:else}
        <button type="button" class="add" onclick={() => void offlineBooks.install(b.id)}>{installed?.installedRelease ? i18n.t('offline.repair') : installed?.status === 'failed' ? i18n.t('offline.retry') : i18n.t('offline.download')}</button>
        {#if installed?.installedRelease}<button type="button" class="add" onclick={() => void offlineBooks.remove(b.id)}>{i18n.t('offline.remove')}</button>{/if}
      {/if}
      {#if installed?.installedRelease}<label class="auto"><input type="checkbox" checked={offlineBooks.autoUpdate(b.id)} onchange={(e) => offlineBooks.setAutoUpdate(b.id, e.currentTarget.checked)}>{i18n.t('offline.autoUpdate')}</label>{/if}
    </span>
    {#if offlineBooks.changes[b.id]}<span class="change-note">{offlineBooks.changes[b.id].notes ?? countChanges(b.id)}</span>{/if}
    {#if library.has(b.id)}
      <button type="button" class="add" disabled>{i18n.t('explorer.findTextbook.added')}</button>
    {:else}
      <button type="button" class="add" onclick={() => add(b)}>{i18n.t('explorer.findTextbook.add')}</button>
    {/if}
  </div>
{/snippet}

{#if ui.findTextbook}
  <div class="finder" role="dialog" aria-label={i18n.t('explorer.findTextbook.title')} tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); ui.closeFindTextbook(); } }}>
    <header>
      <span class="ico">{@html ICON.search}</span>
      <span class="title">{i18n.t('explorer.findTextbook.title')}</span>
      <button type="button" class="x" aria-label={i18n.t('explorer.close')} onclick={() => ui.closeFindTextbook()}>×</button>
    </header>
    <div class="list">
      <div class="updates"><button type="button" class="add" disabled={offlineBooks.checking} onclick={() => void offlineBooks.check()}>{offlineBooks.checking ? i18n.t('offline.checking') : i18n.t('offline.checkUpdates')}</button><span>{i18n.t('offline.lastCheck', { when: when(lastCheck || undefined) })}</span>{#if offlineBooks.message}<span class="bad">{offlineBooks.message}</span>{/if}</div>
      {#if library.status === 'loading'}
        <div class="none">{i18n.t('explorer.findTextbook.loading')}</div>
      {:else if library.status === 'failed'}
        <div class="none bad">{i18n.t('explorer.findTextbook.failed')}</div>
      {:else}
        {#each groups as g (g.root.id)}
          {@render row(g.root, false)}
          {#each g.others as e (e.id)}{@render row(e, true)}{/each}
        {:else}
          <div class="none">{i18n.t('explorer.findTextbook.empty')}</div>
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
  .book.edition{padding-left:38px}
  .lang{color:var(--muted);font-size:0.72rem}
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
  .auto{display:inline-flex;align-items:center;gap:4px;font-size:.76rem;color:var(--muted);cursor:pointer}
  progress{width:100%;height:5px}
  .updates{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule);font-size:.76rem;color:var(--muted);overflow-wrap:anywhere}
  .change-note{grid-column:2 / -1;color:var(--muted);font-size:.74rem;overflow-wrap:anywhere}
  .none{padding:16px 14px;color:var(--muted)}
  .bad{color:var(--bad)}
  @media (max-width:600px){.name,.counts{white-space:normal;overflow-wrap:anywhere}.offline-actions .add{max-width:100%;white-space:normal}}
</style>
