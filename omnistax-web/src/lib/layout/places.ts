/* Where each pane was left scrolled, kept in this browser so that a reload
   opens every tab at the place it was being read. A place is the pane's scroll
   offset and, in a page of a book, the element that stood at the top of the
   pane with how far it stood from it: a page is still drawing when it comes
   back, and its figures take their height as they mount, so an offset alone
   would land short of the paragraph the reader was on.

   A place belongs to a tab in a group, as the pane does, and goes when the
   tab does. It is not one of the reader's records: no backup carries it. */
import { readerWritesAllowed } from '../backup/guard';

export type Place = { readonly top: number; readonly at?: string; readonly off?: number };
export type Places = Readonly<Record<string, Place>>;

const KEY = 'omnistax-scroll';
/* How long after the last scroll a place is written down. */
const SAVE_MS = 250;
/* How long a pane coming back is held on its place while the page under it settles. */
const HOLD_MS = 4000, STILL_FRAMES = 45;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const parsePlaces = (raw: unknown): Places => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Place> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = v as { top?: unknown; at?: unknown; off?: unknown } | null;
    if (!p || !finite(p.top) || p.top <= 0) continue;
    out[k] = typeof p.at === 'string' && p.at && finite(p.off) ? { top: p.top, at: p.at, off: p.off } : { top: p.top };
  }
  return out;
};
/* The places of the panes that still stand. */
export const prunePlaces = (all: Places, standing: ReadonlySet<string>): Places =>
  Object.fromEntries(Object.entries(all).filter(([k]) => standing.has(k)));
export const placeKey = (group: string, item: string): string => `${group}|${item}`;

let all: Places | null = null;
const load = (): Places => {
  if (all) return all;
  try { all = parsePlaces(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { all = {}; }
  return all;
};
const save = (): void => {
  if (!readerWritesAllowed()) return;
  try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* private mode */ }
};

const cssId = (id: string): string => (typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(id) : id);
const drawn = (r: DOMRect): boolean => r.width > 0 || r.height > 0;
/* The last element of the page, in the order it is written, that begins at or
   above the top of the pane: the paragraph being read, or the block it is in. */
const anchorOf = (pane: HTMLElement): { at: string; off: number } | null => {
  const doc = pane.querySelector<HTMLElement>('[data-doc]'); if (!doc) return null;
  const top = pane.getBoundingClientRect().top;
  let best: { at: string; off: number } | null = null;
  for (const e of doc.querySelectorAll('[id]')) {
    if (!(e instanceof HTMLElement)) continue;
    const r = e.getBoundingClientRect();
    if (!drawn(r)) continue;
    if (r.top > top + 1) { if (best) break; continue; }
    best = { at: e.id, off: r.top - top };
  }
  return best;
};
const read = (pane: HTMLElement): Place | null => {
  const top = Math.round(pane.scrollTop);
  if (top <= 0) return null;
  const a = anchorOf(pane);
  return a ? { top, at: a.at, off: Math.round(a.off) } : { top };
};

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const holding = new WeakSet<HTMLElement>();

/* A pane has scrolled: its place is written once it has stopped. A pane being
   put back on its place is not read, since where it stands on the way is not
   where the reader left it. */
export const notePlace = (key: string, pane: HTMLElement): void => {
  if (holding.has(pane) || timers.has(pane)) return;
  timers.set(pane, setTimeout(() => {
    timers.delete(pane);
    if (holding.has(pane) || !pane.isConnected || pane.hidden) return;
    const p = read(pane), { [key]: _, ...rest } = load();
    all = p ? { ...rest, [key]: p } : rest;
    save();
  }, SAVE_MS));
};

/* Put a pane back where it was left, and keep it there while the page under
   it grows: every frame the place has moved is followed, until it has stood
   still for a while or the reader moves the pane themselves. */
export const restorePlace = (key: string, pane: HTMLElement): void => {
  const place = load()[key];
  if (!place) return;
  const aim = (): number => {
    const e = place.at ? pane.querySelector<HTMLElement>(`[data-doc] #${cssId(place.at)}`) : null;
    const r = e?.getBoundingClientRect();
    const want = r && drawn(r) ? pane.scrollTop + r.top - pane.getBoundingClientRect().top - (place.off ?? 0) : place.top;
    return Math.max(0, Math.min(want, pane.scrollHeight - pane.clientHeight));
  };
  const until = performance.now() + HOLD_MS, inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  let still = 0, done = false;
  const quit = (): void => { done = true; holding.delete(pane); inputs.forEach((e) => pane.removeEventListener(e, quit)); };
  holding.add(pane);
  inputs.forEach((e) => pane.addEventListener(e, quit, { passive: true }));
  const frame = (): void => {
    if (done) return;
    if (!pane.isConnected || pane.hidden || performance.now() > until) { quit(); return; }
    const to = aim();
    if (Math.abs(pane.scrollTop - to) > 1) { still = 0; pane.scrollTo({ top: to, behavior: 'instant' }); }
    else if ((still += 1) >= STILL_FRAMES) { quit(); return; }
    requestAnimationFrame(frame);
  };
  frame();
};

/* Let go of the places of tabs that have been closed. */
export const keepPlaces = (standing: ReadonlySet<string>): void => {
  const before = load(), next = prunePlaces(before, standing);
  if (Object.keys(next).length === Object.keys(before).length) return;
  all = next; save();
};
