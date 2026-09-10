/* One timeline of the reader's own edits — a highlight made, a note renamed, a
   row deleted — as a plain immutable value, so the whole of the logic can be
   checked without a browser. An edit knows how to take itself back and how to
   do itself again; the stack holds what has been done and what has been undone,
   and nothing here knows what any of it means.

   A burst of edits that the reader thinks of as one gesture — typing an
   annotation, dragging an image wider — arrives as many small edits under one
   coalescing key. While that key is warm, a follow-up replaces the top entry's
   redo and keeps the first entry's undo, so the whole burst undoes in one step.
   The key cools after a second, and `breakCoalescing` cools it at once. */

export type Edit = { readonly label: string; readonly undo: () => void; readonly redo: () => void };

/* How many steps back the reader may walk, and how long a burst stays one. */
export const CAP = 200;
export const COALESCE_MS = 1000;

/* The key of the burst being gathered, and when it was last added to. */
type Warm = { readonly key: string; readonly at: number };
export type Stack = { readonly done: readonly Edit[]; readonly undone: readonly Edit[]; readonly warm: Warm | null };

export const emptyStack = (): Stack => ({ done: [], undone: [], warm: null });

export const canUndo = (s: Stack): boolean => s.done.length > 0;
export const canRedo = (s: Stack): boolean => s.undone.length > 0;
export const undoLabel = (s: Stack): string => s.done[s.done.length - 1]?.label ?? '';
export const redoLabel = (s: Stack): string => s.undone[s.undone.length - 1]?.label ?? '';

const capped = (done: readonly Edit[], cap: number): readonly Edit[] => (done.length > cap ? done.slice(done.length - cap) : done);

/* A new edit stands on top of the timeline, and whatever was undone before it
   is no longer reachable: the reader has taken another road. */
export const push = (s: Stack, e: Edit, cap = CAP): Stack =>
  ({ done: capped([...s.done, e], cap), undone: [], warm: null });

/* A follow-up the reader thinks of as part of the step below it: the top entry
   keeps the undo it was made with and takes the newest redo, so the two are one
   step. With nothing above it, the follow-up is simply a new edit. */
export const amend = (s: Stack, e: Edit, cap = CAP): Stack => {
  const top = s.done[s.done.length - 1];
  if (!top) return push(s, e, cap);
  return { done: [...s.done.slice(0, -1), { label: e.label, undo: top.undo, redo: e.redo }], undone: [], warm: null };
};
/* The same gesture carrying on, while its key is still warm. Anything else —
   another key, a cold key, an empty stack — is simply a new edit. */
export const coalesce = (s: Stack, key: string, e: Edit, now: number, cap = CAP, window = COALESCE_MS): Stack => {
  const warm = s.done.length > 0 && s.warm !== null && s.warm.key === key && now - s.warm.at <= window;
  return { ...(warm ? amend(s, e, cap) : push(s, e, cap)), warm: { key, at: now } };
};
/* The step a follow-up would join, for a caller that must know it is still the
   one it made. */
export const topOf = (s: Stack): Edit | null => s.done[s.done.length - 1] ?? null;

/* End the burst: whatever comes next begins a step of its own. */
export const breakCoalescing = (s: Stack): Stack => (s.warm === null ? s : { ...s, warm: null });

/* Walking the timeline hands back the edit to run as well as the stack it
   leaves behind, so that the caller runs it and nothing here has side effects. */
export const undo = (s: Stack): { readonly stack: Stack; readonly edit: Edit | null } => {
  const top = s.done[s.done.length - 1];
  if (!top) return { stack: s, edit: null };
  return { stack: { done: s.done.slice(0, -1), undone: [...s.undone, top], warm: null }, edit: top };
};
export const redo = (s: Stack): { readonly stack: Stack; readonly edit: Edit | null } => {
  const top = s.undone[s.undone.length - 1];
  if (!top) return { stack: s, edit: null };
  return { stack: { done: [...s.done, top], undone: s.undone.slice(0, -1), warm: null }, edit: top };
};
