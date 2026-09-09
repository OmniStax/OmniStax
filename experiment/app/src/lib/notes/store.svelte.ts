/* The reader's notes for one book: highlights, each with a colour and an
   optional annotation, anchored to the text they mark. Kept in this browser
   under the book's id. */
import type { Anchor } from './anchor';
import type { SectionId, DocKind } from '../types/ids';
import { history } from '../history/store.svelte';

export const HL_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HlColor = (typeof HL_COLORS)[number];
export type Note = {
  readonly id: string; readonly section: SectionId; readonly doc: DocKind; readonly anchor: Anchor;
  readonly color: HlColor; readonly text: string; readonly created: number; readonly updated: number;
};
const isColor = (c: unknown): c is HlColor => (HL_COLORS as readonly unknown[]).includes(c);
const parse = (raw: unknown): Note[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((n) => {
    if (typeof n !== 'object' || n === null) return [];
    const o = n as Record<string, unknown>; const a = o.anchor as Record<string, unknown> | undefined;
    if (typeof o.id !== 'string' || typeof o.section !== 'string' || !a || typeof a.quote !== 'string') return [];
    return [{ id: o.id, section: o.section as SectionId, doc: o.doc === 'exercises' ? 'exercises' : 'text', anchor: { quote: a.quote, prefix: String(a.prefix ?? ''), suffix: String(a.suffix ?? '') },
      color: isColor(o.color) ? o.color : 'yellow', text: typeof o.text === 'string' ? o.text : '', created: Number(o.created) || Date.now(), updated: Number(o.updated) || Date.now() }];
  });
};
const newId = (): string => Math.random().toString(36).slice(2, 10);

class Notes {
  list = $state.raw<readonly Note[]>([]);
  /* bumps when marks must be repainted (a note added, removed or recoloured); annotation edits do not repaint */
  paintVersion = $state(0);
  editing = $state<string | null>(null);   /* the note whose annotation should take focus in the view */
  private key = 'omnistax-notes';

  init(bookId: string): void {
    this.key = `omnistax-notes-${bookId}`;
    try { this.list = parse(JSON.parse(localStorage.getItem(this.key) ?? '[]')); } catch { this.list = []; }
  }
  add(section: SectionId, doc: DocKind, anchor: Anchor, color: HlColor): Note {
    const now = Date.now(); const n: Note = { id: newId(), section, doc, anchor, color, text: '', created: now, updated: now };
    this.record(`highlight in ${color}`, () => { this.list = [...this.list, n]; this.save(); this.paintVersion++; });
    return n;
  }
  get(id: string): Note | undefined { return this.list.find((n) => n.id === id); }
  setColor(id: string, color: HlColor): void { this.record('recolour highlight', () => { this.patch(id, { color }); this.paintVersion++; }); }
  /* Typing an annotation is one edit however many keystrokes it took, so long
     as they follow one another and stay with the same highlight. */
  setText(id: string, text: string): void { this.record('annotation', () => this.patch(id, { text }), `annotation:${id}`); }
  remove(id: string): void {
    if (!this.get(id)) return;
    this.record('remove highlight', () => { this.list = this.list.filter((n) => n.id !== id); this.save(); this.paintVersion++; if (this.editing === id) this.editing = null; });
  }
  forSection(section: SectionId): readonly Note[] { return this.list.filter((n) => n.section === section); }

  /* A change the reader can take back. The list is an immutable value, so the
     two sides of an edit are simply the list before and the list after: undoing
     an added highlight drops it, and undoing a removed one puts the very same
     note back, under the id its links are written with. */
  private record(label: string, change: () => void, coalesceKey?: string): void {
    const before = this.list;
    change();
    const after = this.list;
    if (after === before) return;
    const edit = { label, undo: () => this.restore(before), redo: () => this.restore(after) };
    if (coalesceKey) history.coalesce(coalesceKey, edit); else history.push(edit);
  }
  /* Put a whole list back without recording it: what undo and redo apply. */
  private restore(list: readonly Note[]): void {
    this.list = list; this.save(); this.paintVersion++;
    if (this.editing !== null && !this.get(this.editing)) this.editing = null;
  }
  private patch(id: string, p: Partial<Note>): void { this.list = this.list.map((n) => (n.id === id ? { ...n, ...p, updated: Date.now() } : n)); this.save(); }
  private save(): void { try { localStorage.setItem(this.key, JSON.stringify(this.list)); } catch { /* private mode */ } }
}
export const notes = new Notes();
