/* How a reader's profile is laid out in a GitHub repo: one JSON file per
   category of settings and records, one per chat, drawing and scratch page,
   and each imported file and pasted image as its own bytes. Small files keep
   diffs small; large ones travel alone. Pure. */
import { z } from 'zod';
import { FILES_KEY, parseFiles } from '../files/model';
import { BACKUP_FORMAT, BACKUP_VERSION, categoryOf, isScalarKey, parseBackup, type ReaderBackup, type ReaderRecord } from '../backup/schema';

export type RepoPath = string;
export type SyncGroup = 'records' | 'chats' | 'drawings' | 'scratch' | 'files' | 'images';
export type RepoFile = { readonly path: RepoPath; readonly group: SyncGroup; readonly label: string; readonly bytes: Uint8Array };

export const MANIFEST: RepoPath = 'omnistax.json';
export const GROUPS: readonly SyncGroup[] = ['records', 'chats', 'drawings', 'scratch', 'files', 'images'];
export const GROUP_LABEL: Readonly<Record<SyncGroup, string>> = {
  records: 'Settings and records', chats: 'Chats', drawings: 'Drawings', scratch: 'Scratch pages', files: 'Imported files', images: 'Note images',
};

export const groupOf = (path: RepoPath): SyncGroup | null =>
  path === MANIFEST ? 'records' : GROUPS.find((g) => path.startsWith(`${g}/`)) ?? null;

const EXT: Readonly<Record<string, string>> = {
  'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
  'image/avif': '.avif', 'image/bmp': '.bmp', 'image/svg+xml': '.svg',
};
export const filePath = (id: string, mime: string): RepoPath => `files/${id}${EXT[mime] ?? ''}`;
export const imagePath = (id: string, mime: string): RepoPath => `images/${id}${EXT[mime] ?? ''}`;
const scratchPath = (key: string): RepoPath => `scratch/${encodeURIComponent(key)}.json`;

const finite = z.number().finite();
const ManifestSchema = z.object({
  format: z.literal('omnistax-sync'), version: z.literal(1), exportedAt: z.string().datetime(),
  books: z.array(z.object({ id: z.string().min(1), release: z.string().optional() }).strict()),
  files: z.array(z.object({ id: z.string().min(1), type: z.enum(['pdf', 'image']), mime: z.string().min(1), created: finite }).strict()),
  images: z.array(z.object({ id: z.string().min(1), type: z.string().min(1), created: finite }).strict()),
  labels: z.record(z.string()),
}).strict();
export type Manifest = z.infer<typeof ManifestSchema>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const jsonBytes = (value: unknown): Uint8Array => encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
const jsonOf = (bytes: Uint8Array): unknown => JSON.parse(decoder.decode(bytes));

const CHUNK = 0x8000;
export const base64OfBytes = (bytes: Uint8Array): string => {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  return btoa(parts.join(''));
};
export const bytesOfBase64 = (base64: string): Uint8Array => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const bytesOfDataUrl = (url: string): Uint8Array => {
  const m = /^data:[^,]*?(;base64)?,(.*)$/s.exec(url);
  if (!m) return new Uint8Array();
  return m[1] ? bytesOfBase64(m[2]) : encoder.encode(decodeURIComponent(m[2]));
};

/* A category's records as one object, each value as the JSON it holds so the
   file reads and diffs as JSON rather than as escaped strings. */
const recordsFile = (records: readonly ReaderRecord[]): Record<string, unknown> =>
  Object.fromEntries(records.map((r) => [r.key, isScalarKey(r.key) ? r.value : JSON.parse(r.value) as unknown]));
const recordsOf = (file: unknown): ReaderRecord[] =>
  Object.entries(z.record(z.unknown()).parse(file)).flatMap(([key, v]) => {
    const category = categoryOf(key);
    return category ? [{ key, value: isScalarKey(key) ? String(v) : JSON.stringify(v), category }] : [];
  });

const fileNames = (records: readonly ReaderRecord[]): ReadonlyMap<string, string> => {
  const listed = records.find((r) => r.key === FILES_KEY);
  return new Map(listed ? parseFiles(JSON.parse(listed.value)).map((f) => [f.id as string, f.name] as const) : []);
};

export const toRepo = (backup: ReaderBackup): readonly RepoFile[] => {
  const names = fileNames(backup.records);
  const categories = [...new Set(backup.records.map((r) => r.category))].sort();
  const records = categories.map((c): RepoFile => ({ path: `records/${c}.json`, group: 'records', label: c, bytes: jsonBytes(recordsFile(backup.records.filter((r) => r.category === c))) }));
  const chats = backup.chats.map((c): RepoFile => ({ path: `chats/${c.id}.json`, group: 'chats', label: c.name || c.id, bytes: jsonBytes(c) }));
  const drawings = backup.drawings.map((d): RepoFile => ({ path: `drawings/${d.id}.json`, group: 'drawings', label: d.name || d.id, bytes: jsonBytes(d) }));
  const scratch = backup.scratch.map((s): RepoFile => ({ path: scratchPath(s.key), group: 'scratch', label: s.key, bytes: jsonBytes(s) }));
  const files = backup.files.map((f): RepoFile => ({ path: filePath(f.id, f.mime), group: 'files', label: names.get(f.id) ?? f.id, bytes: bytesOfBase64(f.base64) }));
  const images = backup.assets.map((a): RepoFile => ({ path: imagePath(a.id, a.type), group: 'images', label: a.id, bytes: bytesOfDataUrl(a.dataUrl) }));
  const body = [...records, ...chats, ...drawings, ...scratch, ...files, ...images];
  const manifest: Manifest = {
    format: 'omnistax-sync', version: 1, exportedAt: backup.exportedAt, books: backup.books,
    files: backup.files.map(({ id, type, mime, created }) => ({ id, type, mime, created })),
    images: backup.assets.map(({ id, type, created }) => ({ id, type, created })),
    labels: Object.fromEntries(body.filter((f) => f.group !== 'records' && f.label !== f.path).map((f) => [f.path, f.label])),
  };
  return [{ path: MANIFEST, group: 'records', label: MANIFEST, bytes: jsonBytes(manifest) }, ...body];
};

export const parseManifest = (bytes: Uint8Array): Manifest => {
  const parsed = ManifestSchema.safeParse((() => { try { return jsonOf(bytes); } catch { return null; } })());
  if (!parsed.success) throw new Error('The repo’s omnistax.json isn’t one this version can read.');
  return parsed.data;
};

export const labelOf = (path: RepoPath, manifest: Manifest | null): string =>
  manifest?.labels[path] ?? (path.startsWith('records/') ? path.slice(8, -5) : path);

/* The profile a repo's files describe. An imported file or image the manifest
   lists but the files leave out is left out too. */
export const fromRepo = (files: ReadonlyMap<RepoPath, Uint8Array>): ReaderBackup => {
  const head = files.get(MANIFEST);
  if (!head) throw new Error('The repo holds no OmniStax data.');
  const manifest = parseManifest(head);
  const under = (dir: string): unknown[] => [...files.entries()].filter(([p]) => p.startsWith(`${dir}/`)).sort(([a], [b]) => a.localeCompare(b)).map(([, b]) => jsonOf(b));
  return parseBackup({
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: manifest.exportedAt, app: { readerFormat: 1 },
    records: under('records').flatMap(recordsOf),
    assets: manifest.images.flatMap(({ id, type, created }) => {
      const bytes = files.get(imagePath(id, type));
      return bytes ? [{ id, type, created, dataUrl: `data:${type};base64,${base64OfBytes(bytes)}` }] : [];
    }),
    chats: under('chats'), drawings: under('drawings'), scratch: under('scratch'),
    files: manifest.files.flatMap(({ id, type, mime, created }) => {
      const bytes = files.get(filePath(id, mime));
      return bytes ? [{ id, type, mime, created, base64: base64OfBytes(bytes) }] : [];
    }),
    books: manifest.books,
  });
};
