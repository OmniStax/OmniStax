/* A note editor's way back, kept for the tab the note is written in: the steps
   Ctrl+Z walks, with the text and the cursor they belong to, as the editor
   itself writes them out. A reload of the tab, or the note turned to its
   reading face and back, finds them again; a new tab starts with none. They
   are only ever handed back to the text they were made on, so a note changed
   elsewhere in the meantime opens with a clean history rather than a wrong one. */
const KEY = 'omnistax-note-undo:';
/* Past this a history is not worth a place in the tab's small store. */
const MOST = 400_000;

export type NoteUndo = { readonly doc: string } & Readonly<Record<string, unknown>>;

const box = (): Storage | null => { try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; } };

export const readNoteUndo = (note: string, body: string): NoteUndo | null => {
  try {
    const v: unknown = JSON.parse(box()?.getItem(KEY + note) ?? 'null');
    return v && typeof v === 'object' && (v as { doc?: unknown }).doc === body ? (v as NoteUndo) : null;
  } catch { return null; }
};
export const writeNoteUndo = (note: string, state: unknown): void => {
  const b = box(); if (!b) return;
  try {
    const text = JSON.stringify(state);
    if (text.length > MOST) b.removeItem(KEY + note); else b.setItem(KEY + note, text);
  } catch { try { b.removeItem(KEY + note); } catch { /* private mode */ } }
};
