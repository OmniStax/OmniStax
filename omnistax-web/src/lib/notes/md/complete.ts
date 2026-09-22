/* What the editor offers when the reader opens a wiki link: one row per thing
   that can be pointed at, saying its name and where it lives, and carrying the
   text that writes the link. The editor knows nothing of notes, sections or
   highlights — the tab that mounts it gathers the candidates and hands them
   over, so the same editor serves whatever the book and the reader hold. */
import { linkInner, type LinkTarget } from './links';

export type Candidate = {
  readonly label: string;    /* what the row reads: "16.4 · The Simple Pendulum" */
  readonly detail: string;   /* the line under it: a folder path, a chapter, the start of a quote */
  readonly insert: string;   /* the inner text of the link this row writes: "16.4" */
  readonly embed?: boolean;  /* the row writes a card rather than a link, so the editor closes it as `![[…]]` */
};

/* A thing of the book is picked to be read in the note, not to be pointed at,
   so the rows that name one ask for the embed form; a note, a section and a
   highlight are pointed at, and write a link. */
export const candidate = (target: LinkTarget, label: string, detail: string, embed = false): Candidate =>
  ({ label, detail, insert: linkInner(target), ...(embed ? { embed } : {}) });

/* The rows of the picker, as candidates. The picker is now the one list of
   everything that can be pointed at — a chat composer opens it with `@` and the
   note editor with `[[` — and this is the door between the two: whatever still
   asks for candidates is given the picker's rows in the shape it knows. */
export const candidatesOf = (rows: readonly { readonly label: string; readonly detail: string; readonly target: LinkTarget; readonly embed?: boolean }[]): readonly Candidate[] =>
  rows.map((r) => candidate(r.target, r.label, r.detail, r.embed === true));
