/* The live tree of the explorer: one reactive value, changed only through the
   pure model functions, saved to this browser after every change. Alongside it
   the two pieces of state the view needs to draw itself — the row the reader
   last clicked, and the entry whose name is being typed. */
import type { Entry, EntryId, Tree } from './model';
import {
  addBook, addFolder, addNote, childrenOf, descendants, emptyTree, entryById, isExpanded,
  move, newEntryId, parseTree, pathOf, remove, rename, toggleExpanded, uniqueName,
} from './model';

const KEY = 'omnistax-explorer-v1';
const load = (): Tree => {
  try { return parseTree(JSON.parse(localStorage.getItem(KEY) ?? 'null')) ?? emptyTree(); } catch { return emptyTree(); }
};

class Explorer {
  tree = $state.raw<Tree>(emptyTree());
  /* The key of the row last clicked: an entry's id, or one of the virtual
     book, chapter and section keys of the model. */
  selected = $state<string | null>(null);
  renaming = $state<EntryId | null>(null);

  init(): void { this.tree = load(); }
  apply(f: (t: Tree) => Tree): void { this.tree = f(this.tree); this.save(); }

  /* The convenience methods below mirror the model, and the two that make a
     row hand back its id so the caller can select it or start renaming it. */
  addFolder(parent: EntryId | null, name?: string): EntryId {
    const id = newEntryId();
    this.apply((t) => addFolder(t, parent, name ?? uniqueName(t, parent, 'Untitled'), id));
    return id;
  }
  /* The note document is written by noteDocs under this very id. */
  addNote(parent: EntryId | null, id: EntryId, name: string): void { this.apply((t) => addNote(t, parent, id, name)); }
  addBook(bookId: string, name: string): void { this.apply((t) => addBook(t, bookId, name)); }
  rename(id: EntryId, name: string): void { this.apply((t) => rename(t, id, name)); }
  /* Hands back every id that went with the row, so the caller can delete the
     note documents they stood for. */
  remove(id: EntryId): EntryId[] {
    const gone = descendants(this.tree, id);
    this.apply((t) => remove(t, id));
    if (this.renaming !== null && gone.includes(this.renaming)) this.renaming = null;
    if (this.selected !== null && gone.includes(this.selected as EntryId)) this.selected = null;
    return gone;
  }
  move(id: EntryId, parent: EntryId | null): void { this.apply((t) => move(t, id, parent)); }
  toggle(key: string): void { this.apply((t) => toggleExpanded(t, key)); }
  expanded(key: string): boolean { return isExpanded(this.tree, key); }

  entry(id: EntryId): Entry | undefined { return entryById(this.tree, id); }
  children(parent: EntryId | null): Entry[] { return childrenOf(this.tree, parent); }
  path(id: EntryId | null): string { return pathOf(this.tree, id); }
  uniqueName(parent: EntryId | null, base = 'Untitled'): string { return uniqueName(this.tree, parent, base); }
  /* The entries of one kind, in reading order, for the pickers that list them. */
  ofKind(kind: Entry['kind']): Entry[] { return this.tree.entries.filter((e) => e.kind === kind); }

  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.tree)); } catch { /* private mode */ } }
}
export const explorer = new Explorer();
