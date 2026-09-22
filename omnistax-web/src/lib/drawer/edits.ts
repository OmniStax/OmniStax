/* A drawing is two things under one id — the row in the explorer and the ink
   the drawing store keeps — so making one, naming it and deleting it all
   happen here, as a note's do in `explorer/edits.ts`, and each ends in one step
   of the shell's timeline. Ctrl+Z takes the row and the ink back together,
   under the id they had, which is what keeps a `[[drawing]]` link and an open
   tab pointing at the same thing.

   The ink itself is not held twice. A deleted drawing's record stays in the
   database until the row is gone for good, so taking the step back only has to
   put the row and the value this session was holding back in place. */
import { entryId, type Entry, type EntryId, type Tree } from '../explorer/model';
import { explorer } from '../explorer/store.svelte';
import { history, type Edit } from '../history/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { closeItem } from '../layout/model';
import { drawingId, drawingItem, itemKey, type DrawingId } from '../types/ids';
import { drawings, scratchKey, type ScratchKey, type ScratchNote } from './store.svelte';
import type { Drawing, DrawingRow } from './model';

/* The three places a drawing stands, as they stand: the tree, the rows the
   explorer draws from, and whichever drawings this session has open, which is
   where the ink of a drawing being deleted is found. */
type Shot = {
  readonly tree: Tree;
  readonly rows: readonly DrawingRow[];
  readonly ink: readonly Drawing[];
  readonly scratch: Readonly<Record<string, ScratchNote>>;
};
const shot = (): Shot => ({ tree: explorer.tree, rows: drawings.rows, ink: [], scratch: drawings.scratchIndex });

const put = (s: Shot): void => {
  explorer.restore(s.tree);
  drawings.restoreRows(s.rows);
  drawings.restoreDrawings(s.ink);
  drawings.restoreScratchIndex(s.scratch);
};

const closeTabs = (ids: readonly DrawingId[]): void => {
  if (!ids.length) return;
  layoutStore.apply((l) => ids.reduce((x, d) => closeItem(x, itemKey(drawingItem(d))), l));
};

type Sides = { readonly onUndo?: readonly DrawingId[]; readonly onRedo?: readonly DrawingId[] };

const commit = (label: string, before: Shot, sides: Sides = {}): Edit | null => {
  const after = shot();
  if (after.tree === before.tree && after.rows === before.rows && after.scratch === before.scratch) return null;
  return history.push({
    label,
    undo: () => { put(before); closeTabs(sides.onUndo ?? []); },
    redo: () => { put(after); closeTabs(sides.onRedo ?? []); },
  });
};

/* Every drawing under a row, the row itself included, so that deleting a
   folder takes the ink of everything inside it. */
export const drawingsUnder = (id: EntryId): DrawingId[] => {
  const out: DrawingId[] = [];
  const walk = (at: EntryId): void => {
    const e = explorer.entry(at);
    if (e?.kind === 'drawing') out.push(drawingId(e.drawingId ?? e.id));
    explorer.children(at).forEach((c) => walk(c.id));
  };
  walk(id);
  return out;
};

/* ── making one ──────────────────────────────────────────────────────────── */

/* The drawing is written first and the row takes its id, so that the two are
   one thing, as a note's are. The caller opens the tab; taking the step back
   closes it, since there would be nothing left for it to show. */
export const createDrawing = (parent: EntryId | null, name?: string, ink?: Drawing): Drawing => {
  const label = name ?? explorer.uniqueName(parent, 'Untitled drawing');
  const before = shot();
  const drawing = drawings.create(label);
  if (ink) drawings.put({ ...drawing, items: ink.items, view: ink.view });
  explorer.addDrawing(parent, entryId(drawing.id), label);
  commit('new drawing', before, { onUndo: [drawing.id] });
  return drawing;
};

/* ── naming and deleting ─────────────────────────────────────────────────── */

/* A drawing is renamed in both places at once, as a note is. */
export const renameDrawing = (id: EntryId, name: string): void => {
  const next = name.trim();
  if (!next) return;
  const e = explorer.entry(id);
  if (!e || e.kind !== 'drawing' || e.name === next) return;
  const before = shot();
  explorer.rename(id, next);
  drawings.rename(drawingId(e.drawingId ?? e.id), next);
  commit('rename drawing', before);
};

/* Deleting takes the row, the ink it stood for and the tab it was open in. The
   ink this session holds goes into the step, so that taking it back is the
   drawing that was there and not an empty page under its old name. */
export const deleteDrawing = (e: Entry): void => {
  const gone = drawingsUnder(e.id);
  const ink = gone.flatMap((d) => { const v = drawings.get(d); return v ? [v] : []; });
  const before = { ...shot(), ink };
  explorer.remove(e.id);
  drawings.removeMany(gone);
  commit('delete drawing', before, { onRedo: gone });
  closeTabs(gone);
};

/* ── the scratch work of an exercise ─────────────────────────────────────── */

/* Scratch work made a drawing of its own: the ink is copied under a new id and
   given a row under Your Files, and the exercise remembers which drawing it
   became. The private record is left where it is, so that detaching hands the
   very same work back rather than a copy of a copy. */
export const saveScratchAsDrawing = (book: string, section: string, ex: string, name: string): Drawing | null => {
  const key = scratchKey(book, section, ex);
  const work = drawings.getScratch(key);
  if (!work) return null;
  const before = shot();
  const made = drawings.create(explorer.uniqueName(null, name));
  drawings.put({ ...made, items: work.items, view: work.view, updated: Date.now() });
  explorer.addDrawing(null, entryId(made.id), made.name);
  drawings.linkScratch(key, made.id);
  commit('save scratch as drawing', before, { onUndo: [made.id] });
  return drawings.get(made.id) ?? made;
};

/* The other way: the row goes and the work becomes private again. The ink is
   copied back into the scratch record before the drawing is removed, so that
   nothing of what the reader wrote is lost in the turn. */
export const detachScratch = (book: string, section: string, ex: string): void => {
  const key: ScratchKey = scratchKey(book, section, ex);
  const linked = drawings.scratchNote(key)?.linked;
  if (!linked) return;
  const ink = drawings.get(linked);
  const row = explorer.entry(entryId(linked));
  const before = { ...shot(), ink: ink ? [ink] : [] };
  if (ink) drawings.putScratch(key, { ...ink, id: (drawings.getScratch(key) ?? ink).id });
  if (row) explorer.remove(row.id);
  drawings.removeMany([linked]);
  drawings.unlinkScratch(key);
  commit('detach scratch drawing', before, { onRedo: [linked] });
  closeTabs([linked]);
};
