/* The live list of the files the reader has imported: one reactive value,
   changed only through the pure model functions, saved to this browser after
   every change. The bytes are not here — they are in blobs.ts — so the list
   stays small enough for localStorage however large the files are. */
import type { FileId } from '../types/ids';
import { readerWritesAllowed } from '../backup/guard';
import { addFile, byId, FILES_KEY, parseFiles, removeFiles, renameFile, setPages, type FileDoc } from './model';

class Files {
  list = $state.raw<readonly FileDoc[]>([]);

  init(): void { try { this.list = parseFiles(JSON.parse(localStorage.getItem(FILES_KEY) ?? '[]')); } catch { this.list = []; } }

  get(id: FileId): FileDoc | undefined { return byId(this.list, id); }
  add(doc: FileDoc): void { this.list = addFile(this.list, doc); this.save(); }
  rename(id: FileId, name: string): void { this.list = renameFile(this.list, id, name, Date.now()); this.save(); }
  /* How many pages a PDF has is learnt when it first opens, not at import:
     counting them means parsing the document, which the reader is about to do
     anyway. Nothing is written when the answer has not changed. */
  setPages(id: FileId, pages: number): void {
    if (this.get(id)?.pages === pages) return;
    this.list = setPages(this.list, id, pages, Date.now()); this.save();
  }
  removeMany(ids: readonly FileId[]): void {
    const next = removeFiles(this.list, ids);
    if (next === this.list) return;
    this.list = next; this.save();
  }
  /* Put a whole list back without any bookkeeping: what undo and redo apply,
     through the compound edits of explorer/edits.ts. */
  restore(list: readonly FileDoc[]): void { this.list = list; this.save(); }

  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(FILES_KEY, JSON.stringify(this.list)); } catch { /* private mode */ } }
}
export const files = new Files();
