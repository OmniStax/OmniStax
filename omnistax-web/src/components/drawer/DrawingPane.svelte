<script lang="ts">
  /* A drawing of the reader's own, in a tab. The pane is the small part: it
     asks the store for the ink, gives the tab a name it can rename, and hands
     every change back to the store, which writes it a short pause later. The
     drawing itself is DrawingTab's.

     A drawing is opened by its id, and the row that names it is the explorer's,
     so renaming here renames there, as a note's name does — one step of the
     shell's timeline for both. */
  import DrawingTab from './DrawingTab.svelte';
  import { drawings } from '../../lib/drawer/store.svelte';
  import { renameDrawing } from '../../lib/drawer/edits';
  import { entryId } from '../../lib/explorer/model';
  import type { Drawing } from '../../lib/drawer/model';
  import type { DrawingId, GroupKey } from '../../lib/types/ids';

  let { id, groupKey }: { id: DrawingId; groupKey: GroupKey } = $props();

  $effect(() => { void drawings.load(id); });
  const drawing = $derived(drawings.get(id));
  const row = $derived(drawings.row(id));

  /* ── the name ──────────────────────────────────────────────────────────── */

  let renaming = $state(false);
  let draft = $state('');
  const startRename = (): void => { draft = drawing?.name ?? row?.name ?? ''; renaming = true; };
  const commit = (): void => {
    const name = draft.trim();
    if (name && name !== (drawing?.name ?? row?.name)) renameDrawing(entryId(id), name);
    renaming = false;
  };
  const onNameKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.stopPropagation();
    if (e.key === 'Enter') commit(); else { draft = drawing?.name ?? ''; renaming = false; }
  };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };

  const onchange = (next: Drawing): void => drawings.put(next);
</script>

<div class="drawing-pane">
  <header class="head">
    {#if renaming}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commit} use:takeFocus aria-label="Drawing name" />
    {:else}
      <button type="button" class="name" title="Rename this drawing" onclick={startRename}>{drawing?.name ?? row?.name ?? 'Drawing'}</button>
    {/if}
  </header>
  {#if drawing}
    <div class="body"><DrawingTab {drawing} {onchange} {groupKey} /></div>
  {:else}
    <div class="waiting">Opening the drawing…</div>
  {/if}
</div>

<style>
  .drawing-pane{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .head{flex:none;display:flex;align-items:center;gap:8px;padding:8px 16px 6px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .body{flex:1;min-height:0;position:relative}
  .name{flex:1;min-width:0;font:inherit;font-size:1.02rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.02rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .waiting{flex:1;display:grid;place-items:center;color:var(--muted);font-size:0.9rem}
</style>
