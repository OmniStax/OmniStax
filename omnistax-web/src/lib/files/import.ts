/* Bringing the reader's own materials in. One function does it, whether the
   files came from the import icon on the Your Files row or from a drop on a
   folder, so that the two gestures cannot drift apart.

   What happens to a file is decided by `takeOf`: a markdown file becomes an
   ordinary note, since that is all it ever was; an image and a PDF become file
   records with their bytes in the blob store. Anything else is reported in the
   drag toast and not thrown — a reader who drops a folder of mixed things
   should get what the app can take, and be told plainly about the rest.

   The reading and the extraction are asynchronous and the step of the timeline
   is not, so the bytes are written first and the two stores the reader can see
   are changed together at the end: one drop is one undo. */
import { createFiles } from '../explorer/edits';
import { noteDocs } from '../notes/docs.svelte';
import { explorer } from '../explorer/store.svelte';
import { entryId, type EntryId } from '../explorer/model';
import { newFileId, type FileId } from '../types/ids';
import { putBlob } from './blobs';
import { baseName, dirOf, foldersOf, isHidden, refusedLine, takeOf, type FileDoc, type RelPath } from './model';
import { files } from './store.svelte';
import { indexPdf } from './text';
import { askToPersist } from '../storage/health';

/* What the reader is told while it runs and when it is done: the line the drag
   toast shows. The caller lends it, so nothing here knows about the toast. */
export type Say = (line: string | null) => void;

export type Imported = {
  readonly files: readonly FileDoc[];
  readonly notes: readonly string[];      /* the names of the markdown files that became notes */
  readonly refused: readonly string[];    /* the names of the files the app could not take */
};

/* How large a PDF has to be before the toast counts its pages: below it the
   extraction is over before the line could be read. */
const CHATTY_BYTES = 2 * 1024 * 1024;

const readNote = async (file: File, parent: EntryId | null): Promise<string> => {
  const name = baseName(file.name);
  const body = await file.text();
  const doc = noteDocs.create(explorer.uniqueName(parent, name), body);
  explorer.addNote(parent, entryId(doc.id), doc.name);
  return doc.name;
};

/* One file into the blob store and into a record. The record is handed back
   rather than added, so that everything dropped together joins the stores in
   one step. */
const readFile = async (file: File, type: 'pdf' | 'image', parent: EntryId | null, say: Say): Promise<FileDoc | null> => {
  const id: FileId = newFileId();
  const bytes = await file.arrayBuffer();
  try { await putBlob(id, new Blob([bytes], { type: file.type || 'application/octet-stream' })); }
  catch { return null; }
  /* The first blob the reader ever writes is the moment to ask the browser to
     keep this data; the answer is remembered and never asked for again. */
  void askToPersist();
  const now = Date.now();
  const pages = type === 'pdf'
    ? await indexPdf(id, bytes, file.size >= CHATTY_BYTES ? (done, total) => say(`Reading ${file.name} — page ${done} of ${total}`) : undefined)
    : 0;
  return {
    id, name: explorer.uniqueName(parent, baseName(file.name)), type,
    mime: file.type || (type === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
    size: file.size, ...(pages > 0 ? { pages } : {}), created: now, updated: now,
  };
};

/* The line the toast ends on: what came in and what did not. */
export const importSummary = (r: Imported): string => {
  const parts: string[] = [];
  const n = r.files.length + r.notes.length;
  if (n) parts.push(`${n} ${n === 1 ? 'file' : 'files'} imported`);
  if (r.refused.length) parts.push(`not taken: ${refusedLine(r.refused)}`);
  return parts.join(' · ') || 'Nothing to import';
};

export const importFiles = async (list: FileList | readonly File[], parent: EntryId | null, say: Say = () => {}): Promise<Imported> => {
  const all = Array.from(list as ArrayLike<File>);
  const made: FileDoc[] = [];
  const notes: string[] = [];
  const refused: string[] = [];
  let done = 0;
  for (const file of all) {
    done += 1;
    say(all.length > 1 ? `Importing ${file.name} (${done} of ${all.length})` : `Importing ${file.name}`);
    const take = takeOf(file.name, file.type);
    if (take.kind === 'refused') { refused.push(file.name); continue; }
    try {
      if (take.kind === 'note') { notes.push(await readNote(file, parent)); continue; }
      const doc = await readFile(file, take.type, parent, say);
      if (doc) made.push(doc); else refused.push(file.name);
    } catch { refused.push(file.name); }
  }
  createFiles(parent, made);
  return { files: made, notes, refused };
};

/* ── a folder brought in whole ───────────────────────────────────────────── */

/* A file of a picked or dropped folder, with its place inside it. */
export type Picked = { readonly path: RelPath; readonly file: File };

/* The folder chooser (`webkitdirectory`) names each file's place for us. */
export const pickedOfInput = (list: FileList): readonly Picked[] =>
  Array.from(list).map((file) => ({ path: file.webkitRelativePath || file.name, file }));

/* A drop's entries must be taken while the drop event runs; the walk below
   may then take its time. */
export const entriesOf = (dt: DataTransfer): readonly FileSystemEntry[] =>
  Array.from(dt.items).flatMap((i) => { const e = i.kind === 'file' ? i.webkitGetAsEntry() : null; return e ? [e] : []; });

/* A directory reader hands its children back in batches until an empty one. */
const childrenOf = (dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> => new Promise((ok, fail) => {
  const reader = dir.createReader();
  const out: FileSystemEntry[] = [];
  const next = (): void => reader.readEntries((batch) => { if (!batch.length) { ok(out); return; } out.push(...batch); next(); }, fail);
  next();
});
const fileOf = (e: FileSystemFileEntry): Promise<File> => new Promise((ok, fail) => e.file(ok, fail));
const walk = async (e: FileSystemEntry, at: RelPath): Promise<Picked[]> => {
  const path = at ? `${at}/${e.name}` : e.name;
  if (e.isFile) return [{ path, file: await fileOf(e as FileSystemFileEntry) }];
  if (!e.isDirectory) return [];
  return (await Promise.all((await childrenOf(e as FileSystemDirectoryEntry)).map((c) => walk(c, path)))).flat();
};
export const pickedOfEntries = async (entries: readonly FileSystemEntry[]): Promise<readonly Picked[]> =>
  (await Promise.all(entries.map((e) => walk(e, '')))).flat();

/* Files with their places: the folders that hold an accepted file are made
   under `parent`, each file goes into its own, and the refused are named by
   their place. One step per folder of the timeline, as each is one import. */
export const importTree = async (items: readonly Picked[], parent: EntryId | null, say: Say = () => {}): Promise<Imported> => {
  const shown = items.filter((i) => !isHidden(i.path));
  const taken = shown.filter((i) => takeOf(i.file.name, i.file.type).kind !== 'refused');
  const refused = shown.filter((i) => !taken.includes(i)).map((i) => i.path);
  const folders = foldersOf(taken.map((i) => i.path)).reduce((made, dir) => {
    const up = made.get(dirOf(dir)) ?? parent;
    const name = dir.slice(dir.lastIndexOf('/') + 1);
    return new Map(made).set(dir, explorer.addFolder(up, explorer.uniqueName(up, name)));
  }, new Map<RelPath, EntryId | null>([['', parent]]));
  const groups = [...new Set(taken.map((i) => dirOf(i.path)))];
  const results: Imported[] = [];
  for (const dir of groups) results.push(await importFiles(taken.filter((i) => dirOf(i.path) === dir).map((i) => i.file), folders.get(dir) ?? parent, say));
  return {
    files: results.flatMap((r) => r.files), notes: results.flatMap((r) => r.notes),
    refused: [...refused, ...results.flatMap((r) => r.refused)],
  };
};

/* Blobs whose record has gone: a file deleted leaves its bytes behind so that
   an undo can bring the whole thing back, and the next boot is where they are
   finally let go. Failing is no matter — they are swept again next time. */
export const sweepBlobs = async (): Promise<void> => {
  const { exportBlobs, deleteBlob, deleteText, allText } = await import('./blobs');
  const known = new Set<string>(files.list.map((f) => f.id));
  const [blobs, texts] = await Promise.all([exportBlobs(), allText()]);
  await Promise.all([
    ...blobs.filter((b) => !known.has(b.id)).map((b) => deleteBlob(b.id)),
    ...texts.filter((t) => !known.has(t.id)).map((t) => deleteText(t.id)),
  ]);
};
