/* The live timeline of the reader's edits: one reactive stack, changed only
   through the pure model functions. The shell pushes an edit wherever the
   reader changes something of their own — a highlight, a note, a row of the
   explorer — and Ctrl+Z walks back along it.

   Nothing is recorded while an edit is being taken back or done again: undo
   runs through the very stores that record, and a step of the timeline must
   never write another one. Layout, scrolling and what is open are not edits
   and belong nowhere here; a closed tab comes back by its own command. */
import { type Edit, type Stack, amend, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, topOf, undo, undoLabel } from './model';
export type { Edit } from './model';

class HistoryStore {
  private stack = $state.raw<Stack>(emptyStack());
  /* True while an undo or a redo is running, so the stores it touches stay quiet. */
  private applying = false;

  /* Hands back the step it made, so that a caller which may later finish that
     step — naming a row it has just made — can say which one it meant. */
  push(e: Edit): Edit | null {
    if (this.applying) return null;
    this.stack = push(this.stack, e);
    return topOf(this.stack);
  }
  /* Fold an edit into the step above, but only while that step is still the one
     the caller made; anything since, and this is a step of its own. */
  amend(e: Edit, into: Edit): Edit | null {
    if (this.applying) return null;
    this.stack = topOf(this.stack) === into ? amend(this.stack, e) : push(this.stack, e);
    return topOf(this.stack);
  }
  /* A follow-up of the same gesture, named by a key of the caller's choosing —
     one note's annotation, one image's width — joins the step above it. */
  coalesce(key: string, e: Edit): void { if (!this.applying) this.stack = coalesce(this.stack, key, e, Date.now()); }
  breakCoalescing(): void { this.stack = breakCoalescing(this.stack); }

  undo(): void { const step = undo(this.stack); this.run(step.stack, step.edit, 'undo'); }
  redo(): void { const step = redo(this.stack); this.run(step.stack, step.edit, 'redo'); }
  /* The stack moves first and the edit runs after it, so that anything the edit
     stirs up sees the timeline as it now stands. */
  private run(next: Stack, edit: Edit | null, way: 'undo' | 'redo'): void {
    if (!edit) return;
    this.stack = next;
    this.applying = true;
    try { edit[way](); } finally { this.applying = false; }
  }

  get canUndo(): boolean { return canUndo(this.stack); }
  get canRedo(): boolean { return canRedo(this.stack); }
  get undoLabel(): string { return undoLabel(this.stack); }
  get redoLabel(): string { return redoLabel(this.stack); }
  /* Everything the reader has done in this session, forgotten. */
  clear(): void { this.stack = emptyStack(); }
}
export const history = new HistoryStore();
