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
};

export const candidate = (target: LinkTarget, label: string, detail: string): Candidate => ({ label, detail, insert: linkInner(target) });
