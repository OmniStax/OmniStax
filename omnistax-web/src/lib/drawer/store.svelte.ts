/* Where the reader's drawings live, as the app sees them. The database itself
   is `db.ts`, kept apart so that the backup can read and write it without
   pulling a rune into a plain module; this is the reactive face over it.

   The ink is heavy and is written a short pause after the last change, and
   again when the tab loses the reader; the names, though, are read by the
   explorer on every keystroke of a rename and by the link resolver on every
   rendering of a note, so they are mirrored in localStorage and nothing has to
   open a database to draw a row.

   The same database holds the scratch work of an exercise, which is a drawing
   with no row in the tree: it is keyed by the book, the section and the
   exercise rather than by an id, because that is the thing it belongs to, and
   its index says whether it has since been saved as a drawing of its own. */
import { drawingId, type DrawingId } from '../types/ids';
import { readerWritesAllowed } from '../backup/guard';
import { emptyDrawing, rowByName, rowOf, parseRows, type Drawing, type DrawingRow } from './model';
import { deleteDrawingRecord, deleteScratchRecord, getDrawing, getScratchRecord, putDrawing, putScratchRecord } from './db';

export { exportDrawings, exportScratch, replaceDrawings, replaceScratch, type ScratchRecord } from './db';

export const ROWS_KEY = 'omnistax-drawings-v1';
export const SCRATCH_KEY = 'omnistax-scratch-v1';
const SAVE_DELAY = 300;

/* Which exercise a piece of scratch work belongs to. It is a string because it
   is a key in a store and in a record, and it is made in one place so that the
   three parts are always joined the same way. */
export type ScratchKey = string & { readonly __brand: 'ScratchKey' };
export const scratchKey = (book: string, section: string, ex: string): ScratchKey => `${book}/${section}/${ex}` as ScratchKey;
/* What the index says about one piece of scratch work: nothing at all, or the
   drawing it has been saved as, which is what puts the chip on the card. */
export type ScratchNote = { readonly linked?: DrawingId };

/* ── the live store ──────────────────────────────────────────────────────── */

class Drawings {
  /* The names, which every row and every link reads; the ink is asked for by
     the tab that shows it and kept here while that tab is open. */
  rows = $state.raw<readonly DrawingRow[]>([]);
  scratchIndex = $state.raw<Readonly<Record<string, ScratchNote>>>({});
  /* The drawings this session has opened, by id, and the scratch work it has
     opened, by key. A tab reads the value from here and writes it back, so two
     tabs on one drawing are looking at the same value. */
  open = $state.raw<Readonly<Record<string, Drawing>>>({});
  scratch = $state.raw<Readonly<Record<string, Drawing>>>({});
  /* The keys a read is already in flight for, so that a tab rendering twice
     does not ask the database twice. */
  private asked = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  init(): void {
    try { this.rows = parseRows(JSON.parse(localStorage.getItem(ROWS_KEY) ?? '[]')); } catch { this.rows = []; }
    try { this.scratchIndex = this.parseIndex(JSON.parse(localStorage.getItem(SCRATCH_KEY) ?? '{}')); } catch { this.scratchIndex = {}; }
  }

  private parseIndex(raw: unknown): Readonly<Record<string, ScratchNote>> {
    if (typeof raw !== 'object' || raw === null) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([k, v]) => {
      if (typeof v !== 'object' || v === null) return [];
      const linked = (v as Record<string, unknown>).linked;
      return [[k, typeof linked === 'string' && linked ? { linked: drawingId(linked) } : {}] as const];
    }));
  }

  /* ── the rows ──────────────────────────────────────────────────────────── */

  row(id: DrawingId): DrawingRow | undefined { return this.rows.find((r) => r.id === id); }
  byName(name: string): DrawingRow | undefined { return rowByName(this.rows, name); }
  /* Put a whole row list back without touching the ink: what the explorer's
     compound edits apply when a step is taken back. */
  restoreRows(rows: readonly DrawingRow[]): void { this.rows = rows; this.saveRows(); }

  private saveRows(): void {
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(ROWS_KEY, JSON.stringify(this.rows)); } catch { /* private mode */ }
  }
  private saveIndex(): void {
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(SCRATCH_KEY, JSON.stringify(this.scratchIndex)); } catch { /* private mode */ }
  }

  /* ── one drawing ───────────────────────────────────────────────────────── */

  /* A drawing that has been opened this session, and nothing while it is still
     coming out of the database: the tab shows its page blank until it lands,
     which is one turn of the loop. */
  get(id: DrawingId): Drawing | undefined { return this.open[id]; }

  /* Ask for a drawing, once. A record that is not there is not an error: a row
     whose ink has been lost opens as an empty page under the row's own name,
     so the reader can draw on it rather than being shown a dead tab. */
  async load(id: DrawingId): Promise<void> {
    if (this.open[id] || this.asked.has(id)) return;
    this.asked.add(id);
    const name = this.row(id)?.name ?? 'Untitled drawing';
    const drawing = (await getDrawing(id)) ?? emptyDrawing(name, id);
    this.open = { ...this.open, [id]: drawing };
  }

  create(name: string, id?: DrawingId): Drawing {
    const drawing = emptyDrawing(name, id);
    this.open = { ...this.open, [drawing.id]: drawing };
    this.rows = [...this.rows, rowOf(drawing)];
    this.saveRows();
    this.asked.add(drawing.id);
    void this.write(drawing);
    return drawing;
  }

  /* The value is right at once and only the writing waits, as a note's body
     does: a stroke laid down is in the reader's hands before the database has
     heard of it. */
  put(drawing: Drawing): void {
    this.open = { ...this.open, [drawing.id]: drawing };
    this.rows = this.rows.map((r) => (r.id === drawing.id ? rowOf(drawing) : r));
    this.saveRows();
    this.later(drawing.id, () => this.write(drawing));
  }

  rename(id: DrawingId, name: string): void {
    const d = this.open[id];
    if (d) { this.put({ ...d, name, updated: Date.now() }); return; }
    /* A drawing nobody has opened is renamed in its row and in its record
       without the ink ever being read. */
    this.rows = this.rows.map((r) => (r.id === id ? { ...r, name, updated: Date.now() } : r));
    this.saveRows();
    void this.patchName(id, name);
  }

  private async patchName(id: DrawingId, name: string): Promise<void> {
    const d = await getDrawing(id);
    if (d) await this.write({ ...d, name, updated: Date.now() });
  }

  remove(id: DrawingId): void { this.removeMany([id]); }
  removeMany(ids: readonly DrawingId[]): void {
    const gone = new Set<string>(ids);
    if (!this.rows.some((r) => gone.has(r.id))) return;
    this.rows = this.rows.filter((r) => !gone.has(r.id));
    this.saveRows();
    this.open = Object.fromEntries(Object.entries(this.open).filter(([k]) => !gone.has(k)));
    ids.forEach((id) => { this.asked.delete(id); void this.erase(id); });
  }

  /* Put the ink back under an id that was deleted: what undo does after the
     rows have come home, so that a drawing taken back is the drawing it was
     and not an empty page under an old name. */
  restoreDrawings(list: readonly Drawing[]): void {
    if (!list.length) return;
    this.open = { ...this.open, ...Object.fromEntries(list.map((d) => [d.id, d] as const)) };
    list.forEach((d) => { this.asked.add(d.id); void this.write(d); });
  }

  /* ── the scratch work of an exercise ───────────────────────────────────── */

  scratchNote(key: ScratchKey): ScratchNote | undefined { return this.scratchIndex[key]; }
  /* Whether there is anything to come back to: the card wears its small mark
     while this is true, and the index alone answers it, so a section full of
     exercises opens without touching the database. */
  hasScratch(key: ScratchKey): boolean { return this.scratchIndex[key] !== undefined; }
  getScratch(key: ScratchKey): Drawing | undefined { return this.scratch[key]; }

  async loadScratch(key: ScratchKey, name: string): Promise<void> {
    if (this.scratch[key] || this.asked.has(key)) return;
    this.asked.add(key);
    this.scratch = { ...this.scratch, [key]: (await getScratchRecord(key)) ?? emptyDrawing(name) };
  }

  putScratch(key: ScratchKey, drawing: Drawing): void {
    this.scratch = { ...this.scratch, [key]: drawing };
    if (!this.scratchIndex[key]) { this.scratchIndex = { ...this.scratchIndex, [key]: {} }; this.saveIndex(); }
    this.later(key, () => this.writeScratch(key, drawing));
  }

  /* The scratch work of an exercise, made a drawing of its own: the ink is
     copied under a new id and the exercise remembers which drawing it became.
     The private record is kept, so that detaching hands the same work back. */
  linkScratch(key: ScratchKey, id: DrawingId): void {
    this.scratchIndex = { ...this.scratchIndex, [key]: { linked: id } };
    this.saveIndex();
  }
  unlinkScratch(key: ScratchKey): void {
    if (!this.scratchIndex[key]) return;
    this.scratchIndex = { ...this.scratchIndex, [key]: {} };
    this.saveIndex();
  }
  /* Put a whole index back: what the two compound edits apply when they are
     taken back, since saving and detaching are both undoable. */
  restoreScratchIndex(index: Readonly<Record<string, ScratchNote>>): void { this.scratchIndex = index; this.saveIndex(); }

  dropScratch(key: ScratchKey): void {
    if (!this.scratchIndex[key]) return;
    this.scratchIndex = Object.fromEntries(Object.entries(this.scratchIndex).filter(([k]) => k !== key));
    this.saveIndex();
    this.scratch = Object.fromEntries(Object.entries(this.scratch).filter(([k]) => k !== key));
    this.asked.delete(key);
    void deleteScratchRecord(key);
  }

  /* ── writing ───────────────────────────────────────────────────────────── */

  /* Every pending write, made good at once: the tab losing the reader and the
     page being left both come through here, so that nothing is owed when the
     window goes. */
  flush(): void {
    const due = [...this.timers.entries()];
    this.timers.clear();
    due.forEach(([, t]) => clearTimeout(t));
    Object.values(this.open).forEach((d) => void this.write(d));
    Object.entries(this.scratch).forEach(([k, d]) => void this.writeScratch(k as ScratchKey, d));
  }

  private later(key: string, f: () => void): void {
    const running = this.timers.get(key);
    if (running !== undefined) clearTimeout(running);
    this.timers.set(key, setTimeout(() => { this.timers.delete(key); f(); }, SAVE_DELAY));
  }

  private write(drawing: Drawing): Promise<void> { return putDrawing(drawing); }
  private writeScratch(key: ScratchKey, drawing: Drawing): Promise<void> { return putScratchRecord(key, drawing); }
  private erase(id: DrawingId): Promise<void> { return deleteDrawingRecord(id); }
}

export const drawings = new Drawings();
