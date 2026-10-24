/* The live timelines of the reader's edits: one stack per view, changed only
   through the pure model functions. A store pushes an edit into the stack of
   the view the edit belongs to — the Explorer for its rows, a note for its
   text, a drawing for its ink, a section for its highlights, a file for its
   marks — and Ctrl+Z walks back along the stack of the view that has focus.
   Which view that is, the shell says (`scope`), from the pane the pointer or
   the keyboard last went into.

   Nothing is recorded while an edit is being taken back or done again: undo
   runs through the very stores that record, and a step of the timeline must
   never write another one. Layout, scrolling and what is open are not edits
   and belong nowhere here; a closed tab comes back by its own command. */
import { type Edit, type Stack, amend, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, topOf, undo, undoLabel } from './model';
import { parseItemKey } from '../types/ids';
import type { ItemKey } from '../layout/model';
export type { Edit } from './model';

export type Scope = string;
export const EXPLORER_SCOPE: Scope = 'explorer';
export const noteScope = (id: string): Scope => `note:${id}`;
export const drawingScope = (id: string): Scope => `drawing:${id}`;
export const fileScope = (id: string): Scope => `file:${id}`;
export const sectionScope = (book: string, section: string): Scope => `section:${book}/${section}`;
/* The stack a pane acts on, read off what it shows; a pane with no edits of its own has none. */
export const scopeOfItem = (key: ItemKey | null, section: { readonly book: string; readonly section: string } | null = null): Scope | null => {
  const id = key ? parseItemKey(key) : null; if (!id) return null;
  if (id.kind === 'note') return noteScope(id.note);
  if (id.kind === 'drawing') return drawingScope(id.drawing);
  if (id.kind === 'file') return fileScope(id.file);
  if (id.kind === 'doc' || id.kind === 'fig' || id.kind === 'ex') return sectionScope(id.book, id.section);
  if (id.kind === 'view' && id.view === 'explorer') return EXPLORER_SCOPE;
  if (id.kind === 'view' && id.view === 'annotations') return section ? sectionScope(section.book, section.section) : null;
  return null;
};

class HistoryStore {
  private stacks = $state.raw<ReadonlyMap<Scope, Stack>>(new Map());
  /* The view the next undo acts on, as the shell last saw focus go. */
  scope = $state<Scope | null>(null);
  /* True while an undo or a redo is running, so the stores it touches stay quiet. */
  private applying = false;

  private of(scope: Scope): Stack { return this.stacks.get(scope) ?? emptyStack(); }
  private set(scope: Scope, s: Stack): void { const next = new Map(this.stacks); next.set(scope, s); this.stacks = next; }

  /* Hands back the step it made, so that a caller which may later finish that
     step — naming a row it has just made — can say which one it meant. */
  push(e: Edit, scope: Scope): Edit | null {
    if (this.applying) return null;
    this.set(scope, push(this.of(scope), e));
    return topOf(this.of(scope));
  }
  /* Fold an edit into the step above, but only while that step is still the one
     the caller made; anything since, and this is a step of its own. */
  amend(e: Edit, into: Edit, scope: Scope): Edit | null {
    if (this.applying) return null;
    const s = this.of(scope);
    this.set(scope, topOf(s) === into ? amend(s, e) : push(s, e));
    return topOf(this.of(scope));
  }
  /* A follow-up of the same gesture, named by a key of the caller's choosing —
     one note's annotation, one image's width — joins the step above it. */
  coalesce(key: string, e: Edit, scope: Scope): void { if (!this.applying) this.set(scope, coalesce(this.of(scope), key, e, Date.now())); }
  /* The gesture is over, in one view or in every view. */
  breakCoalescing(scope?: Scope): void {
    if (scope) { this.set(scope, breakCoalescing(this.of(scope))); return; }
    const next = new Map<Scope, Stack>(); this.stacks.forEach((s, k) => next.set(k, breakCoalescing(s))); this.stacks = next;
  }

  undo(): void { const scope = this.scope; if (!scope) return; const step = undo(this.of(scope)); this.run(scope, step.stack, step.edit, 'undo'); }
  redo(): void { const scope = this.scope; if (!scope) return; const step = redo(this.of(scope)); this.run(scope, step.stack, step.edit, 'redo'); }
  /* The stack moves first and the edit runs after it, so that anything the edit
     stirs up sees the timeline as it now stands. */
  private run(scope: Scope, next: Stack, edit: Edit | null, way: 'undo' | 'redo'): void {
    if (!edit) return;
    this.set(scope, next);
    this.applying = true;
    try { edit[way](); } finally { this.applying = false; }
  }

  get canUndo(): boolean { return this.scope !== null && canUndo(this.of(this.scope)); }
  get canRedo(): boolean { return this.scope !== null && canRedo(this.of(this.scope)); }
  get undoLabel(): string { return this.scope ? undoLabel(this.of(this.scope)) : ''; }
  get redoLabel(): string { return this.scope ? redoLabel(this.of(this.scope)) : ''; }
  /* Everything the reader has done in this session, forgotten. */
  clear(): void { this.stacks = new Map(); }
}
export const history = new HistoryStore();
