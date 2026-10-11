<script lang="ts">
  /* What changed in a book since the reader last looked, opened from its
     Updated mark: the sections added, changed and removed, each changed one
     read as a diff of its text when opened, and the book's other data files by
     name. Opening it is what clears the mark. */
  import { offlineBooks } from '../../lib/offline/store.svelte';
  import { sectionLines, type BookUpdate } from '../../lib/offline/service';
  import { hunksOf, lineDiff } from '../../lib/sync/diff';
  import { openItem, openingOf } from '../../lib/sections/nav.svelte';
  import { bookId, docItem, itemKey, sectionId, sectionRef } from '../../lib/types/ids';
  import LineDiff from '../ui/LineDiff.svelte';

  let { book, label, onclose }: { book: string; label: (section: string) => string; onclose: () => void } = $props();
  let dialog = $state<HTMLDialogElement | null>(null);
  $effect(() => { dialog?.showModal(); });
  const update = offlineBooks.openUpdate(book);

  let diffs = $state.raw<Readonly<Record<string, Promise<ReturnType<typeof hunksOf>>>>>({});
  const diffOf = async (u: BookUpdate, section: string, added: boolean) => {
    const [before, after] = await Promise.all([added ? [] : sectionLines(u.before, section), sectionLines(u.to, section)]);
    return hunksOf(lineDiff(before, after));
  };
  const expand = (u: BookUpdate, section: string, added: boolean, open: boolean): void => {
    if (open && !diffs[section]) diffs = { ...diffs, [section]: diffOf(u, section, added) };
  };
  const open = (section: string, ev: MouseEvent): void => {
    void openItem(itemKey(docItem(sectionRef(bookId(book), sectionId(section)), 'text')), undefined, openingOf(ev));
    dialog?.close();
  };
  const fileNames = (u: BookUpdate): string =>
    u.files ? [...new Set([...u.files.added, ...u.files.changed, ...u.files.removed])].map((url) => url.replace(`/${book}/`, '')).join(', ') : '';
</script>

{#snippet sections(u: BookUpdate, heading: string, ids: readonly string[], added: boolean)}
  {#if ids.length}
    <h4>{heading}</h4>
    <ul>
      {#each ids as id (id)}
        <li>
          {#if added || u.before}
            <details ontoggle={(e) => expand(u, id, added, e.currentTarget.open)}>
              <summary><span class="name">{label(id)}</span><button type="button" class="link" onclick={(e) => { e.preventDefault(); open(id, e); }}>Open</button></summary>
              {#if diffs[id]}
                {#await diffs[id]}
                  <p class="quiet">Reading…</p>
                {:then d}
                  {#if d.hunks.length}<LineDiff hunks={d.hunks} tail={d.tail} />{:else}<p class="quiet">The text reads the same.</p>{/if}
                {:catch e}
                  <p class="quiet bad">{e instanceof Error ? e.message : 'The text could not be read.'}</p>
                {/await}
              {/if}
            </details>
          {:else}
            <div class="row"><span class="name">{label(id)}</span><button type="button" class="link" onclick={(e) => open(id, e)}>Open</button></div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<dialog class="changes" bind:this={dialog} {onclose} aria-labelledby="book-updates-title">
  <header>
    <h3 id="book-updates-title">What changed</h3>
    <button type="button" class="x" aria-label="Close" onclick={() => dialog?.close()}>×</button>
  </header>
  {#await update}
    <p class="quiet">Reading the release…</p>
  {:then u}
    <p class="quiet">{u.to.book.title} · released {new Date(u.to.publishedAt).toLocaleDateString()}</p>
    {#if !u.before}<p class="quiet">The earlier text is no longer available.</p>{/if}
    {#if !u.sections.added.length && !u.sections.changed.length && !u.sections.removed.length}<p class="quiet">No section changed.</p>{/if}
    {@render sections(u, 'Added', u.sections.added, true)}
    {@render sections(u, 'Changed', u.sections.changed, false)}
    {#if u.sections.removed.length}
      <h4>Removed</h4>
      <ul>{#each u.sections.removed as id (id)}<li><div class="row"><span class="name">{id}</span></div></li>{/each}</ul>
    {/if}
    {#if fileNames(u)}<p class="quiet files">Data files changed: {fileNames(u)}</p>{/if}
  {:catch e}
    <p class="quiet bad">{e instanceof Error ? e.message : 'The changes could not be read.'}</p>
  {/await}
</dialog>

<style>
  dialog{width:min(760px,calc(100vw - 32px));max-height:min(80vh,900px);box-sizing:border-box;padding:16px 20px 20px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:.88rem;line-height:1.45;box-shadow:0 12px 40px rgba(0,0,0,.22)}
  dialog::backdrop{background:rgba(0,0,0,.25)}
  header{display:flex;align-items:center;gap:8px}
  h3{flex:1;margin:0;font-size:1rem}
  h4{margin:14px 0 4px;font-size:.82rem;color:var(--muted);font-weight:600}
  ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
  summary,.row{display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:4px}
  dialog.changes details > summary{cursor:pointer;list-style:none;text-transform:none;letter-spacing:normal;font-size:inherit;font-weight:400;color:var(--ink)}
  details > summary::before{content:'▸';width:10px;color:var(--muted);font-size:.7rem}
  details[open] > summary::before{content:'▾'}
  summary:hover,.row:hover{background:var(--soft)}
  .row{padding-left:22px}
  .name{flex:1;min-width:0;overflow-wrap:anywhere}
  details > :global(.code),details > p{margin:6px 0 10px}
  .link{border:0;background:transparent;color:var(--muted);font:inherit;font-size:.8rem;cursor:pointer;padding:0 4px;border-radius:4px}
  .link:hover{color:var(--ink);background:var(--soft2)}
  .link:focus-visible,.x:focus-visible{outline:2px solid var(--accent)}
  .x{width:24px;height:24px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;font-size:16px;line-height:1}
  .x:hover{background:var(--soft2);color:var(--ink)}
  .quiet{margin:4px 0 0;color:var(--muted)}
  .files{margin-top:14px;overflow-wrap:anywhere}
  .bad{color:var(--bad)}
</style>
