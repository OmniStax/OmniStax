/* The files the reader imports, as a plain immutable value. A file is two
   things under one id — the row in the explorer and the record here — the way
   a note is, and a third: the bytes, which are far too heavy for localStorage
   and live in an IndexedDB of their own (blobs.ts). What this module holds is
   only what the shell must know without reading a blob: what the file is
   called, what kind of thing it is, how large it is and, for a PDF, how many
   pages it has. Every operation is a pure function from a list to a list; the
   store applies them and persists.

   What the reader may drop on the tree is decided here too, so that the
   explorer, the import and the tests all agree on one answer. */
import type { FileId } from '../types/ids';

/* Where the list is kept. It lives with the pure model rather than with the
   store so that the backup can name the key without pulling a reactive module
   into a plain Node test. */
export const FILES_KEY = 'omnistax-files-v1';

/* The two kinds that become a file. A markdown file becomes an ordinary note
   instead, so it is not one of these; `takeOf` names it as a third answer. */
export type FileKind = 'pdf' | 'image';
export const FILE_KINDS: readonly FileKind[] = ['pdf', 'image'];

export type FileDoc = {
  readonly id: FileId; readonly name: string; readonly type: FileKind;
  readonly mime: string; readonly size: number; readonly pages?: number;
  readonly created: number; readonly updated: number;
};

/* What the app does with a dropped file: keep it as a file, turn it into a
   note, or say it cannot take it. An ADT rather than a boolean, because the
   drag toast tells the reader which of the three happened. */
export type Take =
  | { readonly kind: 'file'; readonly type: FileKind }
  | { readonly kind: 'note' }
  | { readonly kind: 'refused' };

const MARKDOWN = /\.(?:md|markdown|mdown|txt)$/i;
const IMAGE = /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const PDF = /\.pdf$/i;

/* The type the browser gives is trusted first and the name after it: a drop
   from a file manager often carries no type at all, and a PDF served as
   `application/octet-stream` is still a PDF to the reader. */
export const takeOf = (name: string, mime: string): Take => {
  const m = mime.toLowerCase();
  if (m === 'application/pdf' || PDF.test(name)) return { kind: 'file', type: 'pdf' };
  if (m.startsWith('image/') || IMAGE.test(name)) return { kind: 'file', type: 'image' };
  if (m === 'text/markdown' || m === 'text/plain' || MARKDOWN.test(name)) return { kind: 'note' };
  return { kind: 'refused' };
};

/* The name a row wears: the file's own, without the extension the reader never
   typed. A name that is nothing but an extension keeps it, since the row must
   say something. */
export const baseName = (name: string): string => {
  const cut = name.replace(/^.*[\\/]/, '');
  const dot = cut.lastIndexOf('.');
  return dot > 0 ? cut.slice(0, dot) : cut;
};

/* "2.4 MB", the size as the storage block and the row menu print it. */
export const sizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let at = 0;
  while (value >= 1024 && at < units.length - 1) { value /= 1024; at += 1; }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[at]}`;
};

/* ── the list ────────────────────────────────────────────────────────────── */

export const byId = (list: readonly FileDoc[], id: FileId): FileDoc | undefined => list.find((f) => f.id === id);

export const addFile = (list: readonly FileDoc[], doc: FileDoc): readonly FileDoc[] => [...list, doc];

export const renameFile = (list: readonly FileDoc[], id: FileId, name: string, now: number): readonly FileDoc[] =>
  list.map((f) => (f.id === id ? { ...f, name, updated: now } : f));

/* How many pages a PDF turned out to have, learnt once the document opens. */
export const setPages = (list: readonly FileDoc[], id: FileId, pages: number, now: number): readonly FileDoc[] =>
  list.map((f) => (f.id === id ? { ...f, pages, updated: now } : f));

export const removeFiles = (list: readonly FileDoc[], ids: readonly FileId[]): readonly FileDoc[] => {
  const gone = new Set<string>(ids);
  return list.some((f) => gone.has(f.id)) ? list.filter((f) => !gone.has(f.id)) : list;
};

/* ── the storage boundary ────────────────────────────────────────────────── */

/* A record that is not sound is dropped rather than the whole list refused: a
   file whose row is still in the tree shows as missing, which is the truth. */
const parseDoc = (raw: unknown): FileDoc | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.name !== 'string') return null;
  if (!(FILE_KINDS as readonly unknown[]).includes(o.type)) return null;
  const now = Date.now();
  const pages = Number(o.pages);
  return {
    id: o.id as FileId, name: o.name, type: o.type as FileKind,
    mime: typeof o.mime === 'string' ? o.mime : 'application/octet-stream',
    size: Number(o.size) || 0,
    ...(Number.isFinite(pages) && pages > 0 ? { pages } : {}),
    created: Number(o.created) || now, updated: Number(o.updated) || now,
  };
};
export const parseFiles = (raw: unknown): readonly FileDoc[] =>
  Array.isArray(raw) ? raw.flatMap((d) => { const f = parseDoc(d); return f ? [f] : []; }) : [];
