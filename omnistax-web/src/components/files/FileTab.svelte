<script lang="ts">
  /* One imported file in a tab of its own. An image is simply shown; a PDF is
     read, and the reader that draws it carries pdf.js with it, so it is fetched
     the first time a PDF is opened and never on a page that holds none.

     The bytes come out of the blob store, which takes a turn of the loop, so
     the tab says it is fetching them and then shows the file. A row whose
     record or whose bytes have gone says so plainly rather than standing
     empty: a reader who cleared their storage should be told, not puzzled. */
  import type PdfReaderType from './PdfReader.svelte';
  import { files } from '../../lib/files/store.svelte';
  import { getBlob } from '../../lib/files/blobs';
  import { sizeLabel } from '../../lib/files/model';
  import { renameEntry } from '../../lib/explorer/edits';
  import { entryId } from '../../lib/explorer/model';
  import type { FileId, GroupKey } from '../../lib/types/ids';

  let { fileId, groupKey, page }: { fileId: FileId; groupKey: GroupKey; page?: number } = $props();

  const doc = $derived(files.get(fileId));

  /* The bytes, once. A tab swapped onto another file lets the old ones go: an
     object URL is a handle on memory until it is revoked. */
  let bytes = $state.raw<ArrayBuffer | null>(null);
  let src = $state<string | null>(null);
  let failed = $state(false);
  $effect(() => {
    const id = fileId;
    const kind = files.get(id)?.type;
    let url: string | null = null;
    let live = true;
    bytes = null; src = null; failed = false;
    void getBlob(id).then(async (blob) => {
      if (!live) return;
      if (!blob) { failed = true; return; }
      if (kind === 'image') { url = URL.createObjectURL(blob); src = url; return; }
      bytes = await blob.arrayBuffer();
    }).catch(() => { if (live) failed = true; });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  });

  /* The reader is the one heavy thing here, so it is fetched only for a PDF. */
  let Reader = $state<typeof PdfReaderType | null>(null);
  $effect(() => {
    if (doc?.type !== 'pdf' || Reader !== null) return;
    void import('./PdfReader.svelte').then((m) => { Reader = m.default; });
  });

  /* The name is the row in the explorer as well as the title of the tab, so
     one place renames both, as a note's name does. */
  let renaming = $state(false);
  let draft = $state('');
  const startRename = (): void => { draft = doc?.name ?? ''; renaming = true; };
  const commit = (): void => {
    const name = draft.trim();
    if (name && doc && name !== doc.name) renameEntry(entryId(fileId), name);
    renaming = false;
  };
  const onNameKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.stopPropagation();
    if (e.key === 'Enter') commit(); else { draft = doc?.name ?? ''; renaming = false; }
  };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };

  const line = $derived(doc ? [doc.type === 'pdf' ? 'PDF' : 'Image', doc.pages ? `${doc.pages} pages` : '', sizeLabel(doc.size)].filter(Boolean).join(' · ') : '');
</script>

<article class="file-tab" data-file={fileId} data-group={groupKey}>
  {#if !doc}
    <div class="gone">This file is not here any more.</div>
  {:else}
    <header class="file-head">
      {#if renaming}
        <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commit} use:takeFocus aria-label="File name" />
      {:else}
        <button type="button" class="name" title="Rename this file" onclick={startRename}>{doc.name}</button>
      {/if}
      <span class="meta">{line}</span>
    </header>
    <div class="file-body">
      {#if failed}
        <div class="gone">The bytes of this file are gone from this browser. Import it again, or restore a backup that carries it.</div>
      {:else if doc.type === 'image'}
        {#if src}<img class="whole" {src} alt={doc.name} />{:else}<div class="loading">Fetching {doc.name}…</div>{/if}
      {:else if bytes && Reader}
        {@const R = Reader}
        <R {fileId} {bytes} startPage={page} />
      {:else}
        <div class="loading">Opening {doc.name}…</div>
      {/if}
    </div>
  {/if}
</article>

<style>
  .file-tab{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .file-head{flex:none;display:flex;align-items:baseline;gap:10px;padding:10px 40px 8px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .name{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .meta{flex:none;font-size:0.76rem;color:var(--muted)}
  .file-body{flex:1;min-height:0;display:flex;flex-direction:column}
  .whole{max-width:100%;max-height:100%;margin:auto;object-fit:contain;padding:16px;box-sizing:border-box}
  .loading,.gone{padding:28px 40px;color:var(--muted)}
  @media (max-width:900px){ .file-head{padding:10px 18px 8px} .loading,.gone{padding:20px 18px} }
</style>
