/* The reader's own markdown notes. Each note is a document with a name and a
   body; the explorer holds the row that points at it, under the very same id.
   Every change is kept in this browser, the body after a short pause so that
   typing does not write on every keystroke. */
import { newNoteId, noteId, type NoteId } from '../types/ids';
import { history } from '../history/store.svelte';

export type NoteDoc = { readonly id: NoteId; readonly name: string; readonly body: string; readonly created: number; readonly updated: number };

const KEY = 'omnistax-notedocs-v1';
const SAVE_DELAY = 150;

const parse = (raw: unknown): NoteDoc[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((d) => {
    if (typeof d !== 'object' || d === null) return [];
    const o = d as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id || typeof o.name !== 'string') return [];
    const now = Date.now();
    return [{ id: noteId(o.id), name: o.name, body: typeof o.body === 'string' ? o.body : '', created: Number(o.created) || now, updated: Number(o.updated) || now }];
  });
};

class NoteDocs {
  list = $state.raw<readonly NoteDoc[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  init(): void { try { this.list = parse(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { this.list = []; } }

  get(id: NoteId): NoteDoc | undefined { return this.list.find((d) => d.id === id); }
  /* Wiki links name a note rather than pointing at its id, and readers do not
     think in capitals, so the match ignores case. */
  byName(name: string): NoteDoc | undefined { const n = name.trim().toLowerCase(); return this.list.find((d) => d.name.trim().toLowerCase() === n); }

  create(name: string, body = ''): NoteDoc {
    const now = Date.now();
    const doc: NoteDoc = { id: newNoteId(), name, body, created: now, updated: now };
    this.list = [...this.list, doc]; this.save();
    return doc;
  }
  /* The list is right at once; only the writing to storage waits. Typing in the
     editor comes through here and is not recorded: CodeMirror keeps a history
     of its own, and Ctrl+Z inside the editor belongs to it. */
  setBody(id: NoteId, body: string): void { this.patch(id, { body }, true); }
  /* A change to the body made from outside the editor — an image dragged wider
     — which the shell's own undo must be able to take back. A key gathers a
     drag into one step; without one every change stands alone. */
  setBodyRecorded(id: NoteId, body: string, label: string, coalesceKey?: string): void {
    const before = this.list;
    this.setBody(id, body);
    if (this.list === before) return;
    const after = this.list;
    const edit = { label, undo: () => this.restore(before), redo: () => this.restore(after) };
    if (coalesceKey) history.coalesce(coalesceKey, edit); else history.push(edit);
  }
  /* Put a whole list back without recording it: what undo and redo apply, here
     and from the explorer's compound edits. */
  restore(list: readonly NoteDoc[]): void { this.list = list; this.save(); }
  rename(id: NoteId, name: string): void { this.patch(id, { name }); }
  remove(id: NoteId): void { this.removeMany([id]); }
  removeMany(ids: readonly NoteId[]): void {
    const gone = new Set<string>(ids);
    if (!this.list.some((d) => gone.has(d.id))) return;
    this.list = this.list.filter((d) => !gone.has(d.id)); this.save();
  }

  private patch(id: NoteId, p: Partial<NoteDoc>, defer = false): void {
    if (!this.get(id)) return;
    this.list = this.list.map((d) => (d.id === id ? { ...d, ...p, updated: Date.now() } : d));
    if (defer) this.later(); else this.save();
  }
  private later(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.save(); }, SAVE_DELAY);
  }
  private save(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    try { localStorage.setItem(KEY, JSON.stringify(this.list)); } catch { /* private mode */ }
  }
}
export const noteDocs = new NoteDocs();
