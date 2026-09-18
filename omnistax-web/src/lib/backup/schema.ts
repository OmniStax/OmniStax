import { z } from 'zod';
import { chord } from '../commands/chord';

export const BACKUP_FORMAT = 'omnistax-reader-backup' as const;
export const BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

const scalarKeys = new Map<string, (value: string) => boolean>([
  ['omnistax-cc', (v) => v === '0' || v === '1'],
  ['omnistax-theme', (v) => v === 'light' || v === 'dark'],
  ['omnistax-anim', (v) => v === '0' || v === '1'],
  ['omnistax-exmode', (v) => v === 'all' || v === 'one'],
  ['omnistax-voice', (v) => v === '0' || v === '1'],
  ['omnistax-underlines', (v) => v === '0' || v === '1'],
  ['omnistax-map-progress', (v) => v === '0' || v === '1'],
  ['omnistax-zoom-keys', (v) => v === '0' || v === '1'],
  ['omnistax-zoom', (v) => Number.isFinite(Number(v)) && Number(v) > 0],
]);

const jsonKeys = new Set([
  'omnistax-keys', 'omnistax-practice-v2', 'omnistax-practice-v1',
  'omnistax-practice-pages-v2', 'omnistax-practice-pages-v1',
  'omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1',
  'omnistax-library-v1', 'omnistax-explorer-v1', 'omnistax-notedocs-v1',
  'omnistax-layout-v5', 'omnistax-scope-v2', 'omnistax-scope',
  'omnistax-folded', 'omnistax-hidden-figs',
  'omnistax-seen-releases-v1',
]);
const JSON_KEY_LIST = [...jsonKeys];

export type ReaderCategory = 'appearance' | 'shortcuts' | 'practice' | 'library' | 'notes' | 'layout' | 'reading';
export type ReaderRecord = { readonly key: string; readonly value: string; readonly category: ReaderCategory };
export type BackupAsset = { readonly id: string; readonly type: string; readonly dataUrl: string; readonly created: number };

export const categoryOf = (key: string): ReaderCategory | null => {
  if (scalarKeys.has(key)) return 'appearance';
  if (key === 'omnistax-keys') return 'shortcuts';
  if (['omnistax-practice-v2', 'omnistax-practice-v1', 'omnistax-practice-pages-v2', 'omnistax-practice-pages-v1', 'omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1'].includes(key)) return 'practice';
  if (key === 'omnistax-library-v1' || key === 'omnistax-explorer-v1') return 'library';
  if (key === 'omnistax-notedocs-v1' || /^omnistax-(?:notes|colours)-[^/]+$/.test(key)) return 'notes';
  if (key === 'omnistax-layout-v5' || key === 'omnistax-scope-v2' || key === 'omnistax-scope') return 'layout';
  if (key === 'omnistax-folded' || key === 'omnistax-hidden-figs' || key === 'omnistax-seen-releases-v1') return 'reading';
  return null;
};

const object = z.record(z.unknown());
const finite = z.number().finite();
const note = z.object({ id: z.string().min(1), section: z.string().min(1), doc: z.literal('text'), anchor: z.object({ quote: z.string().min(1), prefix: z.string(), suffix: z.string() }).strict(), color: z.enum(['yellow', 'green', 'blue', 'pink']), text: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict();
const noteDoc = z.object({ id: z.string().min(1), name: z.string(), body: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict();
const attempt = z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), at: finite, ok: z.boolean(), concepts: z.array(z.string()), round: z.string().optional(), release: z.string().optional(), mastered: z.array(z.string()).optional() }).strict();
const shown = z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), round: z.string().min(1), at: finite, release: z.string().optional() }).strict();
const pick = z.union([z.object({ concept: z.string().min(1) }).strict(), z.object({ book: z.string().min(1), chapter: z.string().optional(), section: z.string().optional() }).strict()]);
const mastery = z.record(z.object({ level: finite, target: finite, mastered: z.boolean(), masteredAt: finite, lastAt: finite, halfLife: finite, reviewedAt: finite, dueAt: finite, selfAssessed: z.boolean(), noDecay: z.boolean() }).strict());
const round = z.object({ id: z.string().min(1), started: finite, at: finite, concepts: z.array(z.object({ id: z.string().min(1), expected: finite, answered: finite, correct: finite, wasMastered: z.boolean(), wasDue: z.boolean() }).strict()), newlyMastered: z.array(z.string()) }).strict();
const practiceSettings = z.object({ masteryTarget: finite, freshnessDecay: z.boolean(), startingHalfLife: finite, maxHalfLife: finite, order: z.enum(['mixed', 'grouped']), includeFresh: z.boolean() }).strict();
const self = z.record(z.object({ level: finite, mastered: z.boolean(), at: finite, noDecay: z.boolean() }).strict());
const page = z.object({ curriculum: z.array(pick), session: z.string().nullable(), face: z.enum(['dashboard', 'choose', 'practise', 'progress']), showAll: z.boolean() }).strict();
const session = z.object({ id: z.string().min(1), curriculum: z.array(pick), concepts: z.array(z.string()), drawn: z.array(z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), why: z.enum(['new', 'unanswered', 'review']), release: z.string().optional() }).strict()), at: finite, outcomes: z.array(z.boolean().nullable()), started: finite, before: mastery }).strict();
const hue = z.object({ light: z.string().regex(/^#[0-9A-Fa-f]{6}$/), dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }).strict();
const hues = z.record(hue);
const overrides = z.object({ book: hues, chapters: z.record(hues), sections: z.record(hues) }).strict();
const side = z.object({ width: finite, items: z.array(z.string()) }).strict();
const splitNode: z.ZodType<unknown> = z.lazy(() => z.union([z.object({ type: z.literal('leaf'), group: z.string() }).strict(), z.object({ type: z.literal('split'), dir: z.enum(['row', 'column']), children: z.array(splitNode).min(1), sizes: z.array(finite.positive()).optional() }).strict()]));
const layout = z.object({ sides: z.object({ left: side, right: side }).strict(), home: z.record(z.enum(['left', 'right'])), collapsed: z.array(z.string()), groups: z.array(z.object({ key: z.string(), tabs: z.array(z.string()), active: z.string().nullable() }).strict()).min(1), focus: finite, tree: splitNode }).strict();
const scope = z.union([z.object({ follow: z.literal(true), level: z.enum(['book', 'chapter', 'section']) }).strict(), z.object({ follow: z.literal(false), target: z.union([z.object({ level: z.literal('book') }).strict(), z.object({ level: z.literal('chapter'), chapter: z.string() }).strict(), z.object({ level: z.literal('section'), section: z.string() }).strict()]) }).strict()]);
const scopes = z.record(scope);
const binding = z.record(z.string().min(1)).superRefine((value, ctx) => { Object.keys(value).forEach((key) => { if (!chord(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid chord ${key}` }); }); });
const tree = z.object({ entries: z.array(z.object({ id: z.string().min(1), parent: z.string().nullable(), kind: z.enum(['folder', 'note', 'book']), name: z.string(), bookId: z.string().optional() }).strict()), expanded: z.array(z.string()) }).strict();
const validators: Readonly<Record<string, z.ZodTypeAny>> = {
  'omnistax-keys': binding,
  'omnistax-practice-v2': z.object({ attempts: z.array(attempt), shown: z.array(shown), rounds: z.array(round), self, settings: practiceSettings }).strict(),
  'omnistax-practice-v1': object,
  'omnistax-practice-pages-v2': z.record(page), 'omnistax-practice-pages-v1': object,
  'omnistax-practice-sessions-v2': z.record(session), 'omnistax-practice-sessions-v1': object,
  'omnistax-library-v1': z.array(z.string()),
  'omnistax-explorer-v1': tree,
  'omnistax-notedocs-v1': z.array(noteDoc),
  'omnistax-layout-v5': layout, 'omnistax-scope-v2': scopes, 'omnistax-scope': object,
  'omnistax-folded': z.array(z.string()), 'omnistax-hidden-figs': z.array(z.string()),
  'omnistax-seen-releases-v1': z.record(z.record(z.string().min(1))),
};
const typedJson = (key: string, raw: string): boolean => {
  try {
    const value: unknown = JSON.parse(raw);
    if (/^omnistax-notes-[^/]+$/.test(key)) return z.array(note).safeParse(value).success;
    if (/^omnistax-colours-[^/]+$/.test(key)) {
      const parsed = z.object({ format: z.literal('omnistax-colours'), version: z.literal(1), book: z.string().min(1), order: z.array(z.string()), overrides }).strict().safeParse(value);
      return parsed.success && key === `omnistax-colours-${parsed.data.book}`;
    }
    return validators[key]?.safeParse(value).success === true;
  } catch { return false; }
};

export const validReaderRecord = (record: ReaderRecord): boolean => {
  if (record.key.length > 300 || record.value.length > MAX_BACKUP_BYTES) return false;
  const category = categoryOf(record.key);
  if (category === null || category !== record.category) return false;
  const scalar = scalarKeys.get(record.key);
  if (scalar) return scalar(record.value);
  if (JSON_KEY_LIST.includes(record.key) || /^omnistax-(?:notes|colours)-[^/]+$/.test(record.key)) return typedJson(record.key, record.value);
  return false;
};

const RecordSchema = z.object({ key: z.string(), value: z.string(), category: z.enum(['appearance', 'shortcuts', 'practice', 'library', 'notes', 'layout', 'reading']) }).strict()
  .refine(validReaderRecord, 'invalid reader record');
const AssetSchema = z.object({ id: z.string().min(1).max(200), type: z.string().min(1).max(200), dataUrl: z.string().startsWith('data:'), created: z.number().finite().nonnegative() }).strict();
const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT), version: z.literal(BACKUP_VERSION), exportedAt: z.string().datetime(),
  app: z.object({ readerFormat: z.literal(1) }).strict(),
  records: z.array(RecordSchema), assets: z.array(AssetSchema),
  books: z.array(z.object({ id: z.string().min(1), release: z.string().optional() }).strict()),
}).strict().superRefine((value, ctx) => {
  const keys = new Set<string>();
  value.records.forEach((record, index) => {
    if (keys.has(record.key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['records', index, 'key'], message: 'duplicate reader key' });
    keys.add(record.key);
  });
});

export type ReaderBackup = z.infer<typeof BackupSchema>;

export const parseBackupText = (text: string): ReaderBackup => {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('The backup is larger than 50 MB.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`This is not a valid OmniStax backup: ${parsed.error.issues[0]?.message ?? 'invalid data'}.`);
  return parsed.data;
};

export const summarizeBackup = (backup: ReaderBackup): { readonly exportedAt: string; readonly categories: Readonly<Record<string, number>>; readonly records: number; readonly assets: number } => ({
  exportedAt: backup.exportedAt,
  categories: Object.fromEntries(Array.from(new Set(backup.records.map((r) => r.category))).sort().map((category) => [category, backup.records.filter((r) => r.category === category).length])),
  records: backup.records.length,
  assets: backup.assets.length,
});
