<script lang="ts">
  /* One note in a tab of its own. A bar across the top carries the note's name,
     which is renamed by clicking it, and the one button that turns the note
     over: a note is either being written or being read, and never both. Which
     face it shows belongs to the tab rather than to the note, so the same note
     open twice can be drafted on one side and read on the other; Ctrl+E turns
     whichever tab the reader is in.

     The editor is handed the whole of what a note can point at — the reader's
     other notes, the sections the book has built, and every highlight they have
     annotated — so that a link is chosen from a list rather than remembered. */
  import { tick } from 'svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import NoteView from './NoteView.svelte';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import { noteModes } from '../../lib/notes/modes.svelte';
  import { putAsset } from '../../lib/notes/assets';
  import { notes } from '../../lib/notes/store.svelte';
  import { candidate, type Candidate } from '../../lib/notes/md/complete';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { entryId } from '../../lib/explorer/model';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label } from '../../lib/sections/grouping';
  import type { GroupKey, NoteId } from '../../lib/types/ids';

  let { noteId, groupKey }: { noteId: NoteId; groupKey: GroupKey } = $props();

  const doc = $derived(noteDocs.get(noteId));
  const mode = $derived(noteModes.modeOf(groupKey, noteId));
  /* The tab settles on the face it opened with, so that writing the first word
     of a new note does not turn it over. */
  $effect(() => { noteModes.settle(groupKey, noteId); });

  /* ── the name ──────────────────────────────────────────────────────────── */

  /* The note's name is the row in the explorer as well as the title of the tab,
     so both are renamed together. */
  let renaming = $state(false);
  let draft = $state('');
  const startRename = (): void => { draft = doc?.name ?? ''; renaming = true; };
  const commit = (): void => {
    const name = draft.trim();
    if (name && doc && name !== doc.name) {
      noteDocs.rename(noteId, name);
      if (explorer.entry(entryId(noteId))) explorer.rename(entryId(noteId), name);
    }
    renaming = false;
  };
  const onNameKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.stopPropagation();
    /* Escape puts the old name back before the field goes, so that the blur it
       leaves behind has nothing to commit. */
    if (e.key === 'Enter') commit(); else { draft = doc?.name ?? ''; renaming = false; }
  };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };

  /* ── the two faces ─────────────────────────────────────────────────────── */

  let editor = $state<{ focus(): void } | null>(null);
  const toggle = (): void => noteModes.toggleMode(groupKey, noteId);
  /* Opening the writing side puts the cursor in it, but only where the reader
     can see it: a tab in a group that is not showing has no claim on focus. */
  let host = $state<HTMLElement | null>(null);
  $effect(() => {
    if (mode !== 'edit' || !editor || host?.closest<HTMLElement>('.pane')?.hidden !== false) return;
    const ed = editor;
    void tick().then(() => ed.focus());
  });

  /* ── what a link may point at ──────────────────────────────────────────── */

  /* The folder the note sits in, which is what tells two notes of the same name
     apart; a note with no row of its own is simply under the reader's own tree. */
  const folderOf = (id: NoteId): string => {
    const e = explorer.entry(entryId(id));
    const path = e ? explorer.path(e.parent) : '';
    return path ? `${path}/` : 'notes/';
  };
  const QUOTE = 40;
  const candidates = (): readonly Candidate[] => [
    ...noteDocs.list.filter((d) => d.id !== noteId).map((d) => candidate({ kind: 'note', name: d.name }, d.name, folderOf(d.id))),
    ...registry.manifest.chapters.flatMap((c) => c.sections.filter((s) => s.built).map((s) => candidate({ kind: 'section', section: s.id }, label(s.id, s.title), c.title))),
    ...notes.list.filter((n) => n.text.trim()).map((n) => candidate({ kind: 'highlight', id: n.id }, n.anchor.quote.slice(0, QUOTE), `highlight · ${n.section}`)),
  ];

  const onbody = (v: string): void => noteDocs.setBody(noteId, v);
  const onimage = (file: File): Promise<string> => putAsset(file);
</script>

<article class="note-tab" data-note={noteId} data-group={groupKey} data-mode={mode} bind:this={host}>
  {#if doc}
    <header class="note-head">
      {#if renaming}
        <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commit} use:takeFocus aria-label="Note name" />
      {:else}
        <button type="button" class="name" title="Rename this note" onclick={startRename}>{doc.name}</button>
      {/if}
      <button type="button" class="mode-toggle" title="Edit or read this note (Ctrl+E)" onclick={toggle}>{mode === 'view' ? 'Edit' : 'View'}</button>
    </header>
    <div class="note-body" class:writing={mode === 'edit'}>
      {#if mode === 'edit'}
        <MarkdownEditor bind:this={editor} value={doc.body} onchange={onbody} complete={candidates} {onimage} />
      {:else}
        <NoteView {noteId} body={doc.body} />
      {/if}
    </div>
  {:else}
    <div class="gone">This note is not here any more.</div>
  {/if}
</article>

<style>
  .note-tab{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .note-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 40px 8px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .note-body{flex:1;min-height:0;overflow:auto}
  .note-body.writing{overflow:hidden}
  .name{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .mode-toggle{flex:none;font:inherit;font-size:0.78rem;color:var(--muted);background:var(--soft);border:1px solid var(--rule);border-radius:5px;padding:3px 10px;cursor:pointer}
  .mode-toggle:hover{color:var(--ink);border-color:var(--accent)}
  .gone{padding:28px 40px;color:var(--muted)}
  @media (max-width:900px){ .note-head{padding:10px 18px 8px} .gone{padding:20px 18px} }
</style>
