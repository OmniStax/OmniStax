/* The live list of what the reader has written on their files: highlights and
   text boxes, kept in this browser under one key. Every change the reader can
   take back is a step of the shell's timeline, as a book highlight is, so
   Ctrl+Z walks back through marks on a PDF and marks on the book alike. */
import { history } from '../history/store.svelte';
import { readerWritesAllowed } from '../backup/guard';
import type { Anchor } from '../notes/anchor';
import type { HlColor } from '../notes/store.svelte';
import type { FileId } from '../types/ids';
import {
  addMark, inPageOrder, markById, marksOfFile, marksOfPage, newBox, newHighlight,
  parseMarks, patchMark, removeMarks, removeMarksOfFiles, type FileMark, type PageNumber,
} from './marks';

export const MARKS_KEY = 'omnistax-filemarks-v1';

class FileMarks {
  list = $state.raw<readonly FileMark[]>([]);
  /* Bumps when the painted marks must be laid down again — one added, removed
     or recoloured. Typing in a box or on an annotation does not repaint. */
  paintVersion = $state(0);
  /* The mark whose comment should take focus, the way a book highlight asks. */
  editing = $state<string | null>(null);

  init(): void { try { this.list = parseMarks(JSON.parse(localStorage.getItem(MARKS_KEY) ?? '[]')); } catch { this.list = []; } }

  get(id: string): FileMark | undefined { return markById(this.list, id); }
  forFile(file: FileId): readonly FileMark[] { return inPageOrder(marksOfFile(this.list, file)); }
  forPage(file: FileId, page: PageNumber): readonly FileMark[] { return marksOfPage(this.list, file, page); }

  addHighlight(file: FileId, page: PageNumber, anchor: Anchor, color: HlColor): FileMark {
    const mark = newHighlight(file, page, anchor, color, Date.now());
    this.record(`highlight in ${color}`, () => { this.list = addMark(this.list, mark); this.save(); this.paintVersion++; });
    return mark;
  }
  addBox(file: FileId, page: PageNumber, x: number, y: number): FileMark {
    const mark = newBox(file, page, x, y, Date.now());
    this.record('text box', () => { this.list = addMark(this.list, mark); this.save(); this.paintVersion++; });
    return mark;
  }
  setColor(id: string, color: HlColor): void { this.record('recolour highlight', () => { this.patch(id, { color }); this.paintVersion++; }); }
  /* Typing is one step however many keystrokes it took, so long as they follow
     one another and stay with the same mark. */
  setText(id: string, text: string): void { this.record('annotation', () => this.patch(id, { text }), `filemark:${id}`); }
  setBody(id: string, body: string): void { this.record('text box', () => this.patch(id, { body }), `filemark:${id}`); }
  /* A box moved or resized: one gesture, one step. */
  place(id: string, box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }): void {
    this.record('move text box', () => this.patch(id, box), `filebox:${id}`);
  }
  remove(id: string): void {
    if (!this.get(id)) return;
    this.record('remove mark', () => { this.list = removeMarks(this.list, [id]); this.save(); this.paintVersion++; if (this.editing === id) this.editing = null; });
  }
  /* Everything written on files that have gone, taken away with them. Not a
     step of its own: the deletion of the file records it as one compound edit. */
  dropFiles(ids: readonly FileId[]): void {
    const next = removeMarksOfFiles(this.list, ids);
    if (next === this.list) return;
    this.list = next; this.save(); this.paintVersion++;
  }
  /* Put a whole list back without recording it: what undo and redo apply. */
  restore(list: readonly FileMark[]): void {
    this.list = list; this.save(); this.paintVersion++;
    if (this.editing !== null && !this.get(this.editing)) this.editing = null;
  }

  private record(label: string, change: () => void, coalesceKey?: string): void {
    const before = this.list;
    change();
    if (this.list === before) return;
    const after = this.list;
    const edit = { label, undo: () => this.restore(before), redo: () => this.restore(after) };
    if (coalesceKey) history.coalesce(coalesceKey, edit); else history.push(edit);
  }
  private patch(id: string, p: Partial<FileMark>): void { this.list = patchMark(this.list, id, p, Date.now()); this.save(); }
  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(MARKS_KEY, JSON.stringify(this.list)); } catch { /* private mode */ } }
}
export const fileMarks = new FileMarks();
