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
import { library } from './library.svelte';
import { noteDocs, type NoteDoc } from '../notes/docs.svelte';
import { files } from '../files/store.svelte';
import { fileMarks } from '../files/marks.svelte';
import type { FileDoc } from '../files/model';
import type { FileMark } from '../files/marks';
import { history, type Edit } from '../history/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { closeItem } from '../layout/model';
import { fileId, fileItem, itemKey, noteId, noteItem, type FileId, type NoteId } from '../types/ids';

/* Every store a row stands for, as they stand, and putting them back exactly
   so. A note is a row and a document; a file is a row, a record, the marks
   written on it and the bytes — and the bytes are the one thing not here,
   because they are far too heavy to hold twice. Deleting a file leaves its
   blob in place and `sweepBlobs` clears the orphans at the next boot, so an
   undo has the bytes to come back to. */
type Shot = { readonly tree: Tree; readonly docs: readonly NoteDoc[]; readonly files: readonly FileDoc[]; readonly marks: readonly FileMark[] };
const shot = (): Shot => ({ tree: explorer.tree, docs: noteDocs.list, files: files.list, marks: fileMarks.list });
const put = (s: Shot): void => { explorer.restore(s.tree); noteDocs.restore(s.docs); files.restore(s.files); fileMarks.restore(s.marks); };

/* The tabs of the things a step takes away, whatever kind they are. */
const closeTabs = (keys: readonly string[]): void => {
  if (!keys.length) return;
  layoutStore.apply((l) => keys.reduce((x, k) => closeItem(x, k), l));
};
const noteKeys = (ids: readonly NoteId[]): readonly string[] => ids.map((n) => itemKey(noteItem(n)));
const fileKeys = (ids: readonly FileId[]): readonly string[] => ids.map((f) => itemKey(fileItem(f)));

/* The tabs a step must close as it is taken back, and as it is done again: a
   note undone into nothing must not leave a tab pointing at a document that has
   gone. Where the tabs are is not itself an edit, so nothing here reopens one. */
type Sides = { readonly onUndo?: readonly string[]; readonly onRedo?: readonly string[] };

/* Record what has just happened, unless it changed nothing at all: the two
   sides of the step are the stores as they stood and as they now stand. The
   step it made is handed back, so that a caller can finish it later. */
const commit = (label: string, before: Shot, sides: Sides = {}, into: Edit | null = null): Edit | null => {
  const after = shot();
  if (after.tree === before.tree && after.docs === before.docs && after.files === before.files && after.marks === before.marks) return null;
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
  madeRow(entryId(doc.id), commit('new note', before, { onUndo: noteKeys([doc.id]) }));
  return doc;
};

/* A file imported: the record, the row and, for a PDF, the marks that will
   hang off it later, all under the one id. The bytes are already in the blob
   store by the time this runs — reading a file is asynchronous and a step of
   the timeline is not — so this is only the stores the reader can see.

   Several files dropped at once are one step: the reader dropped them as one
   gesture and takes them back as one. */
export const createFiles = (parent: EntryId | null, docs: readonly FileDoc[]): void => {
  if (!docs.length) return;
  fresh = null;
  const before = shot();
  docs.forEach((doc) => { files.add(doc); explorer.addFile(parent, entryId(doc.id), doc.name); });
  const label = docs.length === 1 ? 'import file' : `import ${docs.length} files`;
  commit(label, before, { onUndo: fileKeys(docs.map((d) => d.id)) });
};

/* ── naming, moving, deleting ────────────────────────────────────────────── */

/* A note is renamed in both places at once; a folder has only its row. The id
   may name a note with no row of its own, and then only the document changes. */
export const renameEntry = (id: EntryId, name: string): void => {
  const next = name.trim();
  if (!next) return;
  const e = explorer.entry(id);
  const doc = noteDocs.get(noteId(id));
  /* A file is named in two places as well: the row and the record the tab and
     the search read their heading from. */
  const file = e?.kind === 'file' ? files.get(fileId(e.fileId ?? id)) : undefined;
  if (!e && !doc) return;
  if ((!e || e.name === next) && (!doc || doc.name === next) && (!file || file.name === next)) return;
  const naming = fresh && fresh.id === id ? fresh : null;
  const before = shot();
  if (e) explorer.rename(id, next);
  if (doc) noteDocs.rename(noteId(id), next);
  if (file) files.rename(file.id, next);
  const kindWord = e && e.kind !== 'note' ? e.kind : 'note';
  const label = naming ? (e && e.kind === 'folder' ? 'new folder' : 'new note') : `rename ${kindWord}`;
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

/* Every file under a row, the row itself included, the way notesUnder gathers
   the notes: a folder deleted takes the files inside it too. */
export const filesUnder = (id: EntryId): FileId[] => {
  const out: FileId[] = [];
  const walk = (at: EntryId): void => {
    const e = explorer.entry(at);
    if (e?.kind === 'file') out.push(fileId(e.fileId ?? e.id));
    explorer.children(at).forEach((c) => walk(c.id));
  };
  walk(id);
  return out;
};

/* Deleting takes the rows, the documents and files they stood for, the marks
   written on those files and the tabs they were open in. Taking the step back
   brings all of it home, bodies and all; doing it again closes those tabs
   afresh. A file's bytes are left in the blob store until the next boot sweeps
   them, so the undo has something to come back to. */
export const deleteEntry = (e: Entry): void => {
  fresh = null;
  const notes = notesUnder(e.id);
  const goneFiles = filesUnder(e.id);
  const before = shot();
  explorer.remove(e.id);
  if (notes.length) noteDocs.removeMany(notes);
  if (goneFiles.length) { files.removeMany(goneFiles); fileMarks.dropFiles(goneFiles); }
  const keys = [...noteKeys(notes), ...fileKeys(goneFiles)];
  commit(`delete ${e.kind === 'folder' ? 'folder' : e.kind === 'file' ? 'file' : 'note'}`, before, { onRedo: keys });
  closeTabs(keys);
};

/* A book is not the reader's to edit, only to keep or to let go of: taking its
   row away also forgets that it was added, so the two never drift apart. It is
   not a step of the timeline, since the book itself is untouched and adding it
   back is one click in the finder. */
export const removeBook = (e: Entry): void => {
  fresh = null;
  if (e.kind !== 'book') return;
  explorer.remove(e.id);
  if (e.bookId) library.remove(e.bookId);
};
