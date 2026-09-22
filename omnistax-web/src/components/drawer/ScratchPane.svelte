<script lang="ts">
  /* The scratch page of one exercise, in a tab. It is the drawing tab with two
     differences: it has no name to rename, because it is not a thing in the
     tree but the paper beside a problem; and its toolbar carries the one
     button that turns it into a thing in the tree — "Save as drawing", which
     gives it a row under Your Files, names it after the exercise, and leaves
     the exercise wearing a chip that opens it. */
  import DrawingTab from './DrawingTab.svelte';
  import { drawings } from '../../lib/drawer/store.svelte';
  import { saveScratchAsDrawing } from '../../lib/drawer/edits';
  import { keyOf, scratchName } from '../../lib/practice/scratch.svelte';
  import { openItem } from '../../lib/sections/nav.svelte';
  import { drawingItem, itemKey, type BookId, type GroupKey, type SectionId } from '../../lib/types/ids';
  import type { Drawing } from '../../lib/drawer/model';

  let { book, section, ex, groupKey }: { book: BookId; section: SectionId; ex: string; groupKey: GroupKey } = $props();

  const at = $derived({ book, section, ex });
  const key = $derived(keyOf(at));
  $effect(() => { void drawings.loadScratch(key, scratchName(at)); });
  const drawing = $derived(drawings.getScratch(key));
  const linked = $derived(drawings.scratchNote(key)?.linked);

  const onchange = (next: Drawing): void => drawings.putScratch(key, next);

  let saving = $state(false);
  const save = (): void => {
    if (saving || linked) return;
    saving = true;
    const made = saveScratchAsDrawing(book, section, ex, scratchName(at));
    saving = false;
    if (made) void openItem(itemKey(drawingItem(made.id)));
  };
</script>

<div class="scratch-pane">
  <header class="head">
    <span class="what">Scratch · {section} {ex}</span>
    {#if linked}
      <span class="saved">Saved as a drawing under Your Files</span>
    {/if}
  </header>
  {#if drawing}
    <div class="body">
      <DrawingTab {drawing} {onchange} {groupKey} scratch={!linked} busy={saving} onsave={save} />
    </div>
  {:else}
    <div class="waiting">Opening your scratch work…</div>
  {/if}
</div>

<style>
  .scratch-pane{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .head{flex:none;display:flex;align-items:center;gap:10px;padding:8px 16px 6px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .what{font-size:0.86rem;font-weight:600;color:var(--ink)}
  .saved{font-size:0.74rem;color:var(--muted)}
  .body{flex:1;min-height:0;position:relative}
  .waiting{flex:1;display:grid;place-items:center;color:var(--muted);font-size:0.9rem}
</style>
