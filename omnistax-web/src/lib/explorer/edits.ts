/* The reader's own rows, changed as one thing. A note is two things under one
   id — the row in the explorer and the document it stands for — and a folder
   deleted takes both away for everything beneath it, so making, naming, moving
   and deleting all happen here rather than in the views. Every one of them ends
   in a step of the shell's timeline, so Ctrl+Z takes the whole compound change
   back: the tree and the documents together, under the ids they had, which is
   what keeps a `[[note]]` link and an open tab pointing at the same thing.

   The explorer view, the note tab and the New note command all come through
   here, so that there is one place where a row is made and one where it goes. */
import { entryId, type Entry, type EntryId, type Tree } from './model';
import { explorer } from './store.svelte';
import { noteDocs, type NoteDoc } from '../notes/docs.svelte';
import { history, type Edit } from '../history/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { closeItem } from '../layout/model';
import { itemKey, noteId, noteItem, type NoteId } from '../types/ids';

/* Both stores as they stand, and putting them back exactly so. */
type Shot = { readonly tree: Tree; readonly docs: readonly NoteDoc[] };
const shot = (): Shot => ({ tree: explorer.tree, docs: noteDocs.list });
const put = (s: Shot): void => { explorer.restore(s.tree); noteDocs.restore(s.docs); };

const closeTabs = (ids: readonly NoteId[]): void => {
  if (!ids.length) return;
  layoutStore.apply((l) => ids.reduce((x, n) => closeItem(x, itemKey(noteItem(n))), l));
};

/* The tabs a step must close as it is taken back, and as it is done again: a
   note undone into nothing must not leave a tab pointing at a document that has
   gone. Where the tabs are is not itself an edit, so nothing here reopens one. */
type Sides = { readonly onUndo?: readonly NoteId[]; readonly onRedo?: readonly NoteId[] };

/* Record what has just happened, unless it changed nothing at all: the two
   sides of the step are the stores as they stood and as they now stand. The
   step it made is handed back, so that a caller can finish it later. */
const commit = (label: string, before: Shot, sides: Sides = {}, into: Edit | null = null): Edit | null => {
  const after = shot();
  if (after.tree === before.tree && after.docs === before.docs) return null;
  const step: Edit = {
    label,
    undo: () => { put(before); closeTabs(sides.onUndo ?? []); },
    redo: () => { put(after); closeTabs(sides.onRedo ?? []); },
  };
  return into ? history.amend(step, into) : history.push(step);
};

/* A row is made with a name of the shell's choosing and named by the reader a
   moment later, in the box the explorer opens over it; the reader means the two
   as one thing, so the naming finishes the step that made the row rather than
   standing beside it. It only does so while that step is still the last thing
   to have happened, which is what the step itself is kept for. */
let fresh: { readonly id: EntryId; readonly step: Edit } | null = null;
const madeRow = (id: EntryId, step: Edit | null): void => { fresh = step ? { id, step } : null; };

/* Every note under a row, the row itself included, so that deleting it can take
   their documents and their tabs with it. */
export const notesUnder = (id: EntryId): NoteId[] => {
  const out: NoteId[] = [];
  const walk = (at: EntryId): void => {
    const e = explorer.entry(at);
    if (e?.kind === 'note') out.push(noteId(e.id));
    explorer.children(at).forEach((c) => walk(c.id));
  };
  walk(id);
  return out;
};

/* ── making a row ────────────────────────────────────────────────────────── */

export const createFolder = (parent: EntryId | null): EntryId => {
  const before = shot();
  const id = explorer.addFolder(parent);
  madeRow(id, commit('new folder', before));
  return id;
};

/* The document is written first and the row takes its id, so that the two are
   one thing. The caller opens the note in a tab; taking the step back closes
   it again, since there would be nothing left for it to show. */
export const createNote = (parent: EntryId | null, name?: string): NoteDoc => {
  const label = name ?? explorer.uniqueName(parent, 'Untitled note');
  const before = shot();
  const doc = noteDocs.create(label);
  explorer.addNote(parent, entryId(doc.id), label);
  madeRow(entryId(doc.id), commit('new note', before, { onUndo: [doc.id] }));
  return doc;
};

/* ── naming, moving, deleting ────────────────────────────────────────────── */

/* A note is renamed in both places at once; a folder has only its row. The id
   may name a note with no row of its own, and then only the document changes. */
export const renameEntry = (id: EntryId, name: string): void => {
  const next = name.trim();
  if (!next) return;
  const e = explorer.entry(id);
  const doc = noteDocs.get(noteId(id));
  if (!e && !doc) return;
  if ((!e || e.name === next) && (!doc || doc.name === next)) return;
  const naming = fresh && fresh.id === id ? fresh : null;
  const before = shot();
  if (e) explorer.rename(id, next);
  if (doc) noteDocs.rename(noteId(id), next);
  const label = naming ? (e && e.kind === 'folder' ? 'new folder' : 'new note') : `rename ${e && e.kind === 'folder' ? 'folder' : 'note'}`;
  commit(label, before, {}, naming?.step ?? null);
  /* A row is named as it is made only once; every later name is its own step. */
  fresh = null;
};

export const moveEntry = (id: EntryId, parent: EntryId | null): void => {
  fresh = null;
  if (explorer.entry(id)?.parent === parent) return;
  const before = shot();
  explorer.move(id, parent);
  commit('move', before);
};

/* Deleting takes the rows, the documents they stood for and the tabs they were
   open in. Taking the step back brings the rows and the documents home, bodies
   and all; doing it again closes those tabs afresh. */
export const deleteEntry = (e: Entry): void => {
  fresh = null;
  const gone = notesUnder(e.id);
  const before = shot();
  explorer.remove(e.id);
  if (gone.length) noteDocs.removeMany(gone);
  commit(`delete ${e.kind === 'folder' ? 'folder' : 'note'}`, before, { onRedo: gone });
  closeTabs(gone);
};
