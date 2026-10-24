/* Scratch work beside an exercise. A reader working a problem wants paper, not
   a document: somewhere to push the algebra about that belongs to the problem
   and is there again when they come back to it. So the scratch page of an
   exercise is private — it is no row of the explorer, it has no name and it
   makes no link — and it is keyed by the book, the section and the exercise,
   which is the thing it belongs to.

   Opening it opens a drawing pane as a tab of the group the reader asked
   from, or with Ctrl in a group of its own to the right of it.

   Work worth keeping stops being scratch: "Save as drawing" gives it a row
   under Your Files and the exercise remembers the drawing it became, and
   "Detach" hands it back. Both are one step of the shell's timeline, so either
   direction can be taken back whole. */
import { bookId, drawingItem, itemKey, scratchOf, type SectionId } from '../types/ids';
import { saveScratchAsDrawing } from '../drawer/edits';
import { split, openTab } from '../layout/model';
import { layoutStore } from '../layout/store.svelte';
import { drawings, scratchKey, type ScratchKey } from '../drawer/store.svelte';
import type { Opening } from '../sections/nav.svelte';

export type ScratchAt = { readonly book: string; readonly section: SectionId; readonly ex: string };

export const keyOf = (at: ScratchAt): ScratchKey => scratchKey(at.book, at.section, at.ex);

/* Whether there is work to come back to, which is what puts the small mark on
   the card. The index alone answers it, so a section full of exercises draws
   without a single read of the database. */
export const hasScratch = (at: ScratchAt): boolean => drawings.hasScratch(keyOf(at));
/* The drawing this exercise's work was saved as, if it has been. */
export const linkedDrawing = (at: ScratchAt) => drawings.scratchNote(keyOf(at))?.linked;

/* The page of scratch work for one exercise, as a tab of the group the reader
   asked from or in a split to the right of it. The work is a drawing of the
   reader's own from the first opening, filed under _practice/scratch and named
   by the exercise, so there is nothing to save later and nothing to lose. */
export const openScratch = async (at: ScratchAt, group: number, how: Opening = 'tab'): Promise<void> => {
  const key = keyOf(at);
  let linked = drawings.scratchNote(key)?.linked;
  if (!linked) {
    await drawings.loadScratch(key, scratchName(at));
    linked = saveScratchAsDrawing(at.book, at.section, at.ex)?.id;
  }
  const id = linked ? itemKey(drawingItem(linked)) : scratchOf(bookId(at.book), at.section, at.ex);
  layoutStore.apply((l) => (how === 'new' ? split(l, group, 'right', id) : openTab(l, id, group)));
};

/* What a saved page is called: the exercise it belongs to and the word for
   what it is, which is the name the spec asks for and the one a reader would
   have written themselves. */
export const scratchName = (at: ScratchAt): string => `${at.section} ${at.ex} scratch`;
