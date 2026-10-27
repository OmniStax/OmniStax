/* How a reader's profile is laid out in a GitHub repo: one JSON file per
   record (records/<key>.json), one per chat, drawing, scratch page and
   generated exercise, and each imported file and pasted image as its own
   bytes. Small files keep diffs small; large ones travel alone. A file is what
   two devices can each change without the other: the practice log changed on
   the laptop and the theme changed on the phone are two files, and neither
   waits on the other.

   Version 1 of the layout kept every record of a category in one file
   (records/<category>.json), so any two records of a category edited on two
   devices were one conflict. Such a repo is still read: its category files are
   taken apart into the records they hold (explode, which the survey uses), and
   the next push writes them as files of their own and drops the old ones. A
   record's category is not in its path, so a key a later version files under
   another category keeps its file. Pure. */
import { z } from 'zod';
import { FILES_KEY, parseFiles } from '../files/model';
import { BACKUP_FORMAT, BACKUP_VERSION, ChatSchema, DrawingSchema, GeneratedSchema, ScratchSchema, categoryOf, isScalarKey, issueOf, parseBackup, recordProblem, type ParsedBackup, type ReaderBackup, type ReaderRecord } from '../backup/schema';
import { type Locale, type MessageKey, currentLocale, t, tIn } from '../i18n';

export type RepoPath = string;
export type SyncGroup = 'records' | 'chats' | 'drawings' | 'scratch' | 'generated' | 'files' | 'images';
export type RepoFile = { readonly path: RepoPath; readonly group: SyncGroup; readonly label: string; readonly bytes: Uint8Array };

export const MANIFEST: RepoPath = 'omnistax.json';
export const GROUPS: readonly SyncGroup[] = ['records', 'chats', 'drawings', 'scratch', 'generated', 'files', 'images'];
const GROUP_KEY: Readonly<Record<SyncGroup, MessageKey>> = {
  records: 'files.sync.group.records', chats: 'files.sync.group.chats', drawings: 'files.sync.group.drawings', scratch: 'files.sync.group.scratch', generated: 'files.sync.group.generated', files: 'files.sync.group.files', images: 'files.sync.group.images',
};
/* A group's name in the given language, the current one by default; a
   component passes i18n.locale so that the name follows a change of it. */
export const groupLabel = (g: SyncGroup, locale: Locale = currentLocale()): string => tIn(locale, GROUP_KEY[g]);

export const groupOf = (path: RepoPath): SyncGroup | null =>
  path === MANIFEST ? 'records' : GROUPS.find((g) => path.startsWith(`${g}/`)) ?? null;

const EXT: Readonly<Record<string, string>> = {
  'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
  'image/avif': '.avif', 'image/bmp': '.bmp', 'image/svg+xml': '.svg',
};
export const filePath = (id: string, mime: string): RepoPath => `files/${id}${EXT[mime] ?? ''}`;
export const imagePath = (id: string, mime: string): RepoPath => `images/${id}${EXT[mime] ?? ''}`;
const scratchPath = (key: string): RepoPath => `scratch/${encodeURIComponent(key)}.json`;

/* Every key the app writes begins so, and no category's name does, which is
   what tells a record's own file from a category file of the first layout. */
const KEY_PREFIX = 'omnistax-';
export const recordPath = (key: string): RepoPath => `records/${encodeURIComponent(key)}.json`;
const stemOf = (path: RepoPath): string | null => {
  const m = /^records\/([^/]+)\.json$/.exec(path);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
};
/* The key a record's file holds, or null for any other path. */
export const recordKeyOf = (path: RepoPath): string | null => { const s = stemOf(path); return s?.startsWith(KEY_PREFIX) ? s : null; };
/* A category file of the first layout. */
export const isLegacyRecords = (path: RepoPath): boolean => { const s = stemOf(path); return s !== null && !s.startsWith(KEY_PREFIX); };
/* A record this version would not know what to do with: a newer version's,
   which a sync leaves where it is rather than pulling it, or deleting it for
   not having it. */
export const foreignRecord = (path: RepoPath): boolean => { const k = recordKeyOf(path); return k !== null && categoryOf(k) === null; };

const finite = z.number().finite();
/* 2 since a record is a file of its own; a manifest of 1 is still read, and
   whichever is read, the next push writes 2. A version that knows only 1
   refuses a manifest of 2 rather than misreading the repo. */
export const SYNC_VERSION = 2 as const;
const ManifestSchema = z.object({
  format: z.literal('omnistax-sync'), version: z.union([z.literal(1), z.literal(SYNC_VERSION)]), exportedAt: z.string().datetime(),
  books: z.array(z.object({ id: z.string().min(1), release: z.string().optional() }).strict()),
  files: z.array(z.object({ id: z.string().min(1), type: z.enum(['pdf', 'image']), mime: z.string().min(1), created: finite }).strict()),
  images: z.array(z.object({ id: z.string().min(1), type: z.string().min(1), created: finite }).strict()),
  labels: z.record(z.string()),
}).strict();
export type Manifest = z.infer<typeof ManifestSchema>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const jsonBytes = (value: unknown): Uint8Array => encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
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

/* A record's value as its file holds it: the JSON it is, so the file reads and
   diffs as JSON rather than as an escaped string, and a setting's plain string
   as a JSON string. A value that should be JSON and is not travels as the
   string it is, so a push never fails on it and the other side names it
   rather than taking it. */
const valueOf = (r: { readonly key: string; readonly value: string }): unknown => {
  if (isScalarKey(r.key)) return r.value;
  try { return JSON.parse(r.value) as unknown; } catch { return r.value; }
};
/* And back. A setting holds a string; anything else a file holds for it is
   written out as JSON, so that it fails the setting's check by name rather
   than turning into something it never was (String(null) is "null"). */
const textOf = (key: string, v: unknown): string => (isScalarKey(key) && typeof v === 'string' ? v : JSON.stringify(v));
export const recordBytes = (r: { readonly key: string; readonly value: string }): Uint8Array => jsonBytes(valueOf(r));
const recordOf = (key: string, v: unknown): { key: string; value: string; category: string } => ({ key, value: textOf(key, v), category: categoryOf(key) ?? '' });
/* A category file of the first layout: one object of key to value. */
const legacyRecords = (file: unknown): { key: string; value: string; category: string }[] =>
  Object.entries(z.record(z.unknown()).parse(file)).map(([key, v]) => recordOf(key, v));

/* A category file of the first layout as the records' own files it stands
   for, each laid out as toRepo would lay it out. */
export const explode = (bytes: Uint8Array): ReadonlyMap<RepoPath, Uint8Array> =>
  new Map(legacyRecords(jsonOf(bytes)).map((r) => [recordPath(r.key), recordBytes(r)] as const));

const fileNames = (records: readonly ReaderRecord[]): ReadonlyMap<string, string> => {
  const listed = records.find((r) => r.key === FILES_KEY);
  return new Map(listed ? parseFiles(JSON.parse(listed.value)).map((f) => [f.id as string, f.name] as const) : []);
};

export const toRepo = (backup: ReaderBackup): readonly RepoFile[] => {
  const names = fileNames(backup.records);
  const records = [...backup.records].sort((a, b) => a.key.localeCompare(b.key)).map((r): RepoFile => ({ path: recordPath(r.key), group: 'records', label: r.key, bytes: recordBytes(r) }));
  const chats = backup.chats.map((c): RepoFile => ({ path: `chats/${c.id}.json`, group: 'chats', label: c.name || c.id, bytes: jsonBytes(c) }));
  const drawings = backup.drawings.map((d): RepoFile => ({ path: `drawings/${d.id}.json`, group: 'drawings', label: d.name || d.id, bytes: jsonBytes(d) }));
  const scratch = backup.scratch.map((s): RepoFile => ({ path: scratchPath(s.key), group: 'scratch', label: s.key, bytes: jsonBytes(s) }));
  const generated = backup.generated.map((g): RepoFile => ({ path: `generated/${g.id}.json`, group: 'generated', label: `${g.book} ${g.section}`, bytes: jsonBytes(g) }));
  const files = backup.files.map((f): RepoFile => ({ path: filePath(f.id, f.mime), group: 'files', label: names.get(f.id) ?? f.id, bytes: bytesOfBase64(f.base64) }));
  const images = backup.assets.map((a): RepoFile => ({ path: imagePath(a.id, a.type), group: 'images', label: a.id, bytes: bytesOfDataUrl(a.dataUrl) }));
  const body = [...records, ...chats, ...drawings, ...scratch, ...generated, ...files, ...images];
  const manifest: Manifest = {
    format: 'omnistax-sync', version: SYNC_VERSION, exportedAt: backup.exportedAt, books: backup.books,
    files: backup.files.map(({ id, type, mime, created }) => ({ id, type, mime, created })),
    images: backup.assets.map(({ id, type, created }) => ({ id, type, created })),
    labels: Object.fromEntries(body.filter((f) => f.group !== 'records' && f.label !== f.path).map((f) => [f.path, f.label])),
  };
  return [{ path: MANIFEST, group: 'records', label: MANIFEST, bytes: jsonBytes(manifest) }, ...body];
};

export const parseManifest = (bytes: Uint8Array): Manifest => {
  const parsed = ManifestSchema.safeParse((() => { try { return jsonOf(bytes); } catch { return null; } })());
  if (!parsed.success) throw new Error(t('files.sync.error.manifest'));
  return parsed.data;
};

export const labelOf = (path: RepoPath, manifest: Manifest | null): string =>
  manifest?.labels[path] ?? (path.startsWith('records/') ? stemOf(path) ?? path : path);

/* The profile a repo's files describe. An imported file or image the manifest
   lists but the files leave out is left out too. A record may stand in a file
   of its own and in a category file of the first layout both, while a repo is
   between the two; its own file is the later and wins. */
export const fromRepo = (files: ReadonlyMap<RepoPath, Uint8Array>): ParsedBackup => {
  const head = files.get(MANIFEST);
  if (!head) throw new Error(t('files.sync.error.noData'));
  const manifest = parseManifest(head);
  const sorted = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));
  const under = (dir: string): unknown[] => sorted.filter(([p]) => p.startsWith(`${dir}/`)).map(([, b]) => jsonOf(b));
  const own = new Map(sorted.flatMap(([p, b]) => { const key = recordKeyOf(p); return key ? [[key, recordOf(key, jsonOf(b))] as const] : []; }));
  const legacy = sorted.filter(([p]) => isLegacyRecords(p)).flatMap(([, b]) => legacyRecords(jsonOf(b))).filter((r) => !own.has(r.key));
  return parseBackup({
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: manifest.exportedAt, app: { readerFormat: 1 },
    records: [...legacy, ...own.values()],
    assets: manifest.images.flatMap(({ id, type, created }) => {
      const bytes = files.get(imagePath(id, type));
      return bytes ? [{ id, type, created, dataUrl: `data:${type};base64,${base64OfBytes(bytes)}` }] : [];
    }),
    chats: under('chats'), drawings: under('drawings'), scratch: under('scratch'), generated: under('generated'),
    files: manifest.files.flatMap(({ id, type, mime, created }) => {
      const bytes = files.get(filePath(id, mime));
      return bytes ? [{ id, type, mime, created, base64: base64OfBytes(bytes) }] : [];
    }),
    books: manifest.books,
  });
};

/* Why this version could not take a file of the repo in, or null when it can:
   the check a file is held to before it comes down, and that a merge the
   reader settled is held to before it is sent anywhere. */
export const fileProblem = (path: RepoPath, bytes: Uint8Array): string | null => {
  const group = groupOf(path);
  if (group === 'files' || group === 'images' || group === null) return null;
  let v: unknown;
  try { v = jsonOf(bytes); } catch (e) { return t('files.sync.error.notJson', { why: e instanceof Error ? e.message : '' }); }
  if (path === MANIFEST) return ManifestSchema.safeParse(v).success ? null : t('files.sync.error.manifest');
  const key = recordKeyOf(path);
  if (key !== null) return recordProblem(recordOf(key, v));
  if (isLegacyRecords(path)) {
    let records: ReturnType<typeof legacyRecords>;
    try { records = legacyRecords(v); } catch (e) { return e instanceof z.ZodError ? issueOf(e) : t('shell.backup.invalidData'); }
    for (const r of records) { const why = recordProblem(r); if (why) return t('shell.backup.skippedLine', { key: r.key, why }); }
    return null;
  }
  const schema = { chats: ChatSchema, drawings: DrawingSchema, scratch: ScratchSchema, generated: GeneratedSchema, records: null }[group];
  if (!schema) return null;
  const parsed = schema.safeParse(v);
  return parsed.success ? null : issueOf(parsed.error);
};
