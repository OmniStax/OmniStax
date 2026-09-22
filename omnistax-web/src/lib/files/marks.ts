/* What the reader writes on a file: a highlight over some of its words, or a
   text box placed anywhere on a page. One ADT, one list, and every operation a
   pure function from list to list, so the whole of the logic is checked
   without a browser.

   A highlight is anchored the way a highlight in the book is — the same
   `Anchor` and the same pure code of `notes/anchor.ts` — against the text of
   the page it lies on, so it survives a re-render and a pdf.js upgrade. A box
   is placed in fractions of the page's width and height, so it stays where the
   reader put it at any zoom.

   A mark's id is ten characters of base 36 where a book highlight's is eight:
   `[[hl:…]]` names both stores, and the resolver tells them apart by the shape
   of the id rather than by asking each in turn. */
import type { Anchor } from '../notes/anchor';
import type { FileId } from '../types/ids';
import type { HlColor } from '../notes/store.svelte';

export type MarkId = string & { readonly __brand: 'MarkId' };
export const markId = (s: string): MarkId => s as MarkId;
/* Ten of base 36, which is what tells a file mark from a book highlight. */
export const MARK_ID_LENGTH = 10;
export const isMarkId = (s: string): boolean => new RegExp(`^[a-z0-9]{${MARK_ID_LENGTH}}$`).test(s);
export const newMarkId = (): MarkId => {
  let s = '';
  while (s.length < MARK_ID_LENGTH) s += Math.random().toString(36).slice(2);
  return markId(s.slice(0, MARK_ID_LENGTH));
};

/* Pages are numbered as the reader numbers them: page 1 is the first. */
export type PageNumber = number;

export type FileMark =
  | { readonly kind: 'highlight'; readonly id: MarkId; readonly file: FileId; readonly page: PageNumber; readonly anchor: Anchor; readonly color: HlColor; readonly text: string; readonly created: number; readonly updated: number }
  | { readonly kind: 'box'; readonly id: MarkId; readonly file: FileId; readonly page: PageNumber; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly body: string; readonly created: number; readonly updated: number };

export type MarkKind = FileMark['kind'];

/* A box the reader has just placed, before they have typed in it. The size is
   a fraction of the page, and it is the size a first sentence fits in. */
export const BOX_W = 0.28;
export const BOX_H = 0.08;

export const newHighlight = (file: FileId, page: PageNumber, anchor: Anchor, color: HlColor, now: number): FileMark =>
  ({ kind: 'highlight', id: newMarkId(), file, page, anchor, color, text: '', created: now, updated: now });

export const newBox = (file: FileId, page: PageNumber, x: number, y: number, now: number): FileMark =>
  ({ kind: 'box', id: newMarkId(), file, page, x: clampFraction(x), y: clampFraction(y), w: BOX_W, h: BOX_H, body: '', created: now, updated: now });

export const clampFraction = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export const marksOfFile = (list: readonly FileMark[], file: FileId): readonly FileMark[] => list.filter((m) => m.file === file);
export const marksOfPage = (list: readonly FileMark[], file: FileId, page: PageNumber): readonly FileMark[] =>
  list.filter((m) => m.file === file && m.page === page);
export const markById = (list: readonly FileMark[], id: string): FileMark | undefined => list.find((m) => m.id === id);

/* In the order the reader meets them: down the pages, and within a page the
   highlights in the order they were made. */
export const inPageOrder = (list: readonly FileMark[]): readonly FileMark[] =>
  [...list].sort((a, b) => a.page - b.page || a.created - b.created);

export const addMark = (list: readonly FileMark[], m: FileMark): readonly FileMark[] => [...list, m];

export const patchMark = (list: readonly FileMark[], id: string, p: Partial<FileMark>, now: number): readonly FileMark[] =>
  list.map((m) => (m.id === id ? ({ ...m, ...p, updated: now } as FileMark) : m));

export const removeMarks = (list: readonly FileMark[], ids: readonly string[]): readonly FileMark[] => {
  const gone = new Set<string>(ids);
  return list.some((m) => gone.has(m.id)) ? list.filter((m) => !gone.has(m.id)) : list;
};
export const removeMarksOfFiles = (list: readonly FileMark[], files: readonly FileId[]): readonly FileMark[] => {
  const gone = new Set<string>(files);
  return list.some((m) => gone.has(m.file)) ? list.filter((m) => !gone.has(m.file)) : list;
};

/* ── the storage boundary ────────────────────────────────────────────────── */

const COLORS: readonly string[] = ['yellow', 'green', 'blue', 'pink'];
const anchorOf = (raw: unknown): Anchor | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  return typeof o.quote === 'string' && o.quote ? { quote: o.quote, prefix: String(o.prefix ?? ''), suffix: String(o.suffix ?? '') } : null;
};
const parseMark = (raw: unknown): FileMark | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.file !== 'string') return null;
  const page = Number(o.page);
  if (!Number.isFinite(page) || page < 1) return null;
  const now = Date.now();
  const when = { created: Number(o.created) || now, updated: Number(o.updated) || now };
  if (o.kind === 'highlight') {
    const anchor = anchorOf(o.anchor); if (!anchor) return null;
    return { kind: 'highlight', id: markId(o.id), file: o.file as FileId, page, anchor, color: (COLORS.includes(o.color as string) ? o.color : 'yellow') as HlColor, text: typeof o.text === 'string' ? o.text : '', ...when };
  }
  if (o.kind === 'box') {
    return { kind: 'box', id: markId(o.id), file: o.file as FileId, page, x: clampFraction(Number(o.x)), y: clampFraction(Number(o.y)), w: clampFraction(Number(o.w)) || BOX_W, h: clampFraction(Number(o.h)) || BOX_H, body: typeof o.body === 'string' ? o.body : '', ...when };
  }
  return null;
};
export const parseMarks = (raw: unknown): readonly FileMark[] =>
  Array.isArray(raw) ? raw.flatMap((m) => { const p = parseMark(m); return p ? [p] : []; }) : [];
