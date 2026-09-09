/* Which face a note is showing, tab by tab. The same note may stand in two
   groups at once, one being written and the other being read, so the mode
   belongs to the pair — the group and the note — rather than to either alone.
   A note opened for the first time answers by its body: there is nothing to
   read in an empty one, so it opens under the cursor, and a note with words in
   it opens as the reader wrote it. That answer is settled the moment the tab
   mounts, so that typing the first letter does not turn the page. */
import { noteDocs } from './docs.svelte';
import type { GroupKey, NoteId } from '../types/ids';

export type NoteMode = 'edit' | 'view';

const keyOf = (group: GroupKey, note: NoteId): string => `${group}|${note}`;
const other = (m: NoteMode): NoteMode => (m === 'edit' ? 'view' : 'edit');
/* An empty note is opened to be written in; one with words is opened to be read. */
const opening = (note: NoteId): NoteMode => (noteDocs.get(note)?.body.trim() ? 'view' : 'edit');

class NoteModes {
  private modes = $state.raw<Readonly<Record<string, NoteMode>>>({});

  modeOf(group: GroupKey, note: NoteId): NoteMode { return this.modes[keyOf(group, note)] ?? opening(note); }
  setMode(group: GroupKey, note: NoteId, mode: NoteMode): void { this.modes = { ...this.modes, [keyOf(group, note)]: mode }; }
  toggleMode(group: GroupKey, note: NoteId): void { this.setMode(group, note, other(this.modeOf(group, note))); }
  /* Write down the mode a tab opened in, so that later edits cannot change it. */
  settle(group: GroupKey, note: NoteId): void { if (!(keyOf(group, note) in this.modes)) this.setMode(group, note, opening(note)); }
}
export const noteModes = new NoteModes();
