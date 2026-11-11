/* A drawing's way back, kept for the tab it is drawn in: the steps Ctrl+Z
   walks, as the drawings they lead to. A reload of the tab finds them again;
   a new tab starts with none, and what a tab left behind is swept away a
   couple of days on.

   The steps live in a database of their own, apart from the drawings: they
   are not the reader's records, no backup or sync carries them, and losing
   them loses no ink. A timeline is written as one value, so the strokes its
   steps share are stored once and come back shared, as they were in memory. */
import { parseDrawing, type Drawing, type Timeline } from './model';

const DB = 'omnistax-drawing-undo';
const STORE = 'timelines';
const SESSION_KEY = 'omnistax-tab-session';
const SAVE_MS = 400;
const KEEP_MS = 2 * 24 * 3_600_000;

type Row = { readonly id: string; readonly session: string; readonly at: number; readonly past: readonly unknown[]; readonly now: unknown; readonly future: readonly unknown[] };

/* This tab, across its reloads. */
let session: string | null = null;
const sessionOf = (): string | null => {
  if (session) return session;
  try {
    session = sessionStorage.getItem(SESSION_KEY);
    if (!session) { session = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; sessionStorage.setItem(SESSION_KEY, session); }
  } catch { session = null; }
  return session;
};

let swept = false;
const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});
const run = async <T = unknown>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> => {
  const db = await open();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = f(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req ? (req.result as T) : undefined); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB refused the request')); };
  });
};
/* Once a page, what other tabs left behind long enough ago goes. */
const sweep = (): void => {
  if (swept) return; swept = true;
  const before = Date.now() - KEEP_MS;
  void run('readwrite', (s) => {
    s.openCursor().onsuccess = (e) => {
      const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result; if (!c) return;
      if (!((c.value as Partial<Row>).at! >= before)) c.delete();
      c.continue();
    };
  }).catch(() => {});
};

/* Whether two drawings hold the same ink, whatever part of it they are looking at. */
export const sameInk = (a: Drawing, b: Drawing): boolean =>
  a.id === b.id && a.items.length === b.items.length && (a.items === b.items || JSON.stringify(a.items) === JSON.stringify(b.items));

/* The drawings as they were written, where every one of them still reads as a drawing. */
const drawingsOf = (raw: readonly unknown[]): readonly Drawing[] | null =>
  Array.isArray(raw) && raw.every((d) => parseDrawing(d) !== null) ? (raw as readonly Drawing[]) : null;

/* The steps kept for a drawing by this tab, to stand around the drawing as it is now. */
export const readTimeline = async (now: Drawing): Promise<Pick<Timeline, 'past' | 'future'> | null> => {
  const mine = sessionOf(); if (!mine) return null;
  sweep();
  try {
    const row = await run<Row>('readonly', (s) => s.get(now.id));
    if (!row || row.session !== mine) return null;
    const past = drawingsOf(row.past), future = drawingsOf(row.future), at = parseDrawing(row.now);
    return past && future && at && sameInk(at, now) ? { past, future } : null;
  } catch { return null; }
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const latest = new Map<string, Timeline>();
/* Write a timeline down a short pause after it last changed; one with no steps is no record. */
export const keepTimeline = (t: Timeline): void => {
  const mine = sessionOf(); if (!mine) return;
  const id = t.now.id;
  latest.set(id, t);
  if (timers.has(id)) return;
  timers.set(id, setTimeout(() => {
    timers.delete(id);
    const h = latest.get(id); latest.delete(id); if (!h) return;
    const row: Row = { id, session: mine, at: Date.now(), past: h.past, now: h.now, future: h.future };
    void run('readwrite', (s) => (h.past.length || h.future.length ? s.put(row) : s.delete(id))).catch(() => {});
  }, SAVE_MS));
};
export const dropTimeline = (id: string): void => { latest.delete(id); void run('readwrite', (s) => s.delete(id)).catch(() => {}); };
