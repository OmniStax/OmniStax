<script lang="ts">
  import type PdfReaderType from './PdfReader.svelte';
  import { files } from '../../lib/files/store.svelte';
  import { getBlob } from '../../lib/files/blobs';
  import type { FileId, GroupKey } from '../../lib/types/ids';

  let { fileId, groupKey, page }: { fileId: FileId; groupKey: GroupKey; page?: number } = $props();

  const doc = $derived(files.get(fileId));

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

  let Reader = $state<typeof PdfReaderType | null>(null);
  $effect(() => {
    if (doc?.type !== 'pdf' || Reader !== null) return;
    void import('./PdfReader.svelte').then((m) => { Reader = m.default; });
  });

</script>

<article class="file-tab" data-file={fileId} data-group={groupKey}>
  {#if !doc}
    <div class="gone">This file is not here any more.</div>
  {:else}
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
  .file-tab{position:absolute;inset:0;max-width:none;margin:0;padding:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .file-body{flex:1;min-height:0;display:flex;flex-direction:column}
  .whole{max-width:100%;max-height:100%;margin:auto;object-fit:contain;padding:16px;box-sizing:border-box}
  .loading,.gone{padding:28px 40px;color:var(--muted)}
  @media (max-width:900px){ .loading,.gone{padding:20px 18px} }
</style>
