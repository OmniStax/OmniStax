import { z } from 'zod';
import { VERSION } from '../releases/version';
import { t } from '../i18n/index';
import { chord } from '../commands/chord';
import { isFontId } from '../settings/fonts';
import { TipStateSchema } from '../tips/model';
import { AnswerSchema, BLOOM_LEVELS } from '../content/schema';

export const BACKUP_FORMAT = 'omnistax-reader-backup' as const;
export const BACKUP_VERSION = 1 as const;
/* A profile now carries whole PDFs, so the cap is what a browser can be asked
   to read in one go rather than what a profile of notes would ever reach. */
export const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
export const MAX_BACKUP_LABEL = '500 MB';

const bit = (v: string): boolean => v === '0' || v === '1';
const positive = (v: string): boolean => v !== '' && Number.isFinite(Number(v)) && Number(v) > 0;
const scalarKeys = new Map<string, (value: string) => boolean>([
  ['omnistax-cc', (v) => v === '0' || v === '1'], ['omnistax-cc-all', bit], ['omnistax-cc-facts', bit], ['omnistax-cc-refs', bit], ['omnistax-cc-words', bit], ['omnistax-cc-symbols', bit],
  ['omnistax-theme', (v) => v === 'light' || v === 'dark'],
  /* The reader's UI language (i18n/store.svelte.ts); absent, it follows the browser. */
  ['omnistax-lang', (v) => v === 'en' || v === 'zh-CN'],
  ['omnistax-anim', (v) => v === '0' || v === '1'],
  ['omnistax-exmode', (v) => v === 'all' || v === 'one'],
  ['omnistax-voice', (v) => v === '0' || v === '1'],
  ['omnistax-underlines', (v) => v === '0' || v === '1'],
  ['omnistax-map-progress', (v) => v === '0' || v === '1'],
  ['omnistax-zoom-keys', (v) => v === '0' || v === '1'],
  ['omnistax-tips', (v) => v === '0' || v === '1'],
  ['omnistax-zoom', (v) => Number.isFinite(Number(v)) && Number(v) > 0],
  ['omnistax-figure-font', isFontId], ['omnistax-body-font', isFontId],
  ['omnistax-card-open', (v) => v === 'hover' || v === 'click'],
  ['omnistax-swap-drag', bit],
  ['omnistax-lock-grace', positive], ['omnistax-pomodoro-len', positive], ['omnistax-pomodoro-lock', bit],
]);

const jsonKeys = new Set([
  'omnistax-keys-v2', 'omnistax-keys', 'omnistax-practice-v2', 'omnistax-practice-v1',
  'omnistax-practice-pages-v2', 'omnistax-practice-pages-v1',
  'omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1', 'omnistax-practice-links-v1',
  'omnistax-library-v1', 'omnistax-explorer-v1', 'omnistax-notedocs-v1',
  'omnistax-layout-v6', 'omnistax-layout-v5', 'omnistax-scope-v2', 'omnistax-scope',
  'omnistax-folded', 'omnistax-hidden-figs',
  'omnistax-seen-releases-v2', 'omnistax-seen-releases-v1', 'omnistax-auto-update-v1',
  /* The files the reader imported and what they have written on them. Only the
     metadata is here; the bytes travel as `files` below. */
  'omnistax-files-v1', 'omnistax-filemarks-v1',
  /* Which provider and model the reader chose for AI, and the index of the
     chats they have held. The keys they pasted are not here: the adapter
     strips them on the way out, and the validator below refuses a record
     that still carries one. */
  'omnistax-ai-v1', 'omnistax-chats-v2', 'omnistax-chats-v1', 'omnistax-chat-pages-v1',
  /* The drawings the reader has made and the scratch pages of their exercises.
     Only the names and the index are here; the ink travels as `drawings` and
     `scratch` below, since a page of strokes is far heavier than localStorage
     should ever hold. */
  'omnistax-drawings-v1', 'omnistax-scratch-v1',
  'omnistax-pomodoros', 'omnistax-pomodoro-categories',
  'omnistax-chat-tree-v1', 'omnistax-tips-v1', 'omnistax-last-page-v1', 'omnistax-seen-notes-v1',
]);
const JSON_KEY_LIST = [...jsonKeys];

/* One key per book, omnistax-highlights-<book>, beside the appearance scalars. */
const HIGHLIGHTS_KEY = /^omnistax-highlights-[^/]+$/;
const CATEGORIES = ['appearance', 'shortcuts', 'practice', 'library', 'notes', 'layout', 'reading', 'chats', 'focus'] as const;
export type ReaderCategory = typeof CATEGORIES[number];
const FOCUS_KEYS = ['omnistax-pomodoros', 'omnistax-pomodoro-categories', 'omnistax-pomodoro-len', 'omnistax-pomodoro-lock', 'omnistax-lock-grace'];
export type ReaderRecord = { readonly key: string; readonly value: string; readonly category: ReaderCategory };
export type BackupAsset = { readonly id: string; readonly type: string; readonly dataUrl: string; readonly created: number };

export const isScalarKey = (key: string): boolean => scalarKeys.has(key);

export const categoryOf = (key: string): ReaderCategory | null => {
  if (FOCUS_KEYS.includes(key)) return 'focus';
  if (scalarKeys.has(key) || HIGHLIGHTS_KEY.test(key)) return 'appearance';
  if (key === 'omnistax-keys-v2' || key === 'omnistax-keys') return 'shortcuts';
  if (['omnistax-practice-v2', 'omnistax-practice-v1', 'omnistax-practice-pages-v2', 'omnistax-practice-pages-v1', 'omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1', 'omnistax-practice-links-v1'].includes(key)) return 'practice';
  if (key === 'omnistax-library-v1' || key === 'omnistax-explorer-v1' || key === 'omnistax-auto-update-v1') return 'library';
  if (key === 'omnistax-notedocs-v1' || key === 'omnistax-files-v1' || key === 'omnistax-filemarks-v1'
    || key === 'omnistax-drawings-v1' || key === 'omnistax-scratch-v1'
    || /^omnistax-(?:notes|colours)-[^/]+$/.test(key)) return 'notes';
  if (key === 'omnistax-layout-v6' || key === 'omnistax-layout-v5' || key === 'omnistax-scope-v2' || key === 'omnistax-scope') return 'layout';
  if (['omnistax-folded', 'omnistax-hidden-figs', 'omnistax-seen-releases-v2', 'omnistax-seen-releases-v1', 'omnistax-tips-v1', 'omnistax-last-page-v1', 'omnistax-seen-notes-v1'].includes(key)) return 'reading';
  if (key === 'omnistax-ai-v1' || key === 'omnistax-chats-v2' || key === 'omnistax-chats-v1' || key === 'omnistax-chat-pages-v1' || key === 'omnistax-chat-tree-v1') return 'chats';
  return null;
};

const object = z.record(z.unknown());
const finite = z.number().finite();
const note = z.object({ id: z.string().min(1), book: z.string().min(1).optional(), section: z.string().min(1), doc: z.literal('text'), anchor: z.object({ quote: z.string().min(1), prefix: z.string(), suffix: z.string() }).strict(), color: z.enum(['yellow', 'green', 'blue', 'pink']), text: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict();
const noteDoc = z.object({ id: z.string().min(1), name: z.string(), body: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict();
const attempt = z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), at: finite, ok: z.boolean(), concepts: z.array(z.string()), round: z.string().optional(), release: z.string().optional(), mastered: z.array(z.string()).optional() }).strict();
const shown = z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), round: z.string().min(1), at: finite, release: z.string().optional() }).strict();
/* What a round is drawn from: a concept, a place in a book, or one exercise
   the reader picked by hand. */
const pick = z.union([
  z.object({ concept: z.string().min(1) }).strict(),
  z.object({ exercise: z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1) }).strict() }).strict(),
  z.object({ book: z.string().min(1), chapter: z.string().optional(), section: z.string().optional() }).strict(),
]);
const mastery = z.record(z.object({ level: finite, target: finite, mastered: z.boolean(), masteredAt: finite, lastAt: finite, halfLife: finite, reviewedAt: finite, dueAt: finite, selfAssessed: z.boolean(), noDecay: z.boolean() }).strict());
const round = z.object({ id: z.string().min(1), started: finite, at: finite, concepts: z.array(z.object({ id: z.string().min(1), expected: finite, answered: finite, correct: finite, wasMastered: z.boolean(), wasDue: z.boolean() }).strict()), newlyMastered: z.array(z.string()) }).strict();
const practiceSettings = z.object({
  masteryTarget: finite, freshnessDecay: z.boolean(), startingHalfLife: finite, maxHalfLife: finite, order: z.enum(['mixed', 'grouped']), includeFresh: z.boolean(),
  generated: z.enum(['include', 'book-only']).optional(), grading: z.enum(['reveal', 'ai']).optional(), promptNote: z.string().optional(), fresh: z.boolean().optional(),
  model: z.object({ provider: z.string().min(1), model: z.string().min(1) }).strict().nullable().optional(),
  stopwatch: z.boolean().optional(),
}).strict();
const self = z.record(z.object({ level: finite, mastered: z.boolean(), at: finite, noDecay: z.boolean() }).strict());
const roundChoice = z.object({ perConcept: finite.optional(), wanted: z.record(finite).optional(), excluded: z.array(z.string()).optional() }).strict();
const page = z.object({ curriculum: z.array(pick), session: z.string().nullable(), face: z.enum(['dashboard', 'choose', 'practise', 'review', 'sessions', 'progress', 'summary']), showAll: z.boolean(), round: roundChoice.optional() }).strict();
const session = z.object({ id: z.string().min(1), curriculum: z.array(pick), concepts: z.array(z.string()), drawn: z.array(z.object({ book: z.string().min(1), section: z.string().min(1), ex: z.string().min(1), why: z.enum(['new', 'unanswered', 'review']), release: z.string().optional(), concept: z.string().optional() }).strict()), at: finite, outcomes: z.array(z.boolean().nullable()), started: finite, before: mastery, status: z.literal('done').optional(), ended: finite.optional(), after: mastery.optional() }).strict();
const hue = z.object({ light: z.string().regex(/^#[0-9A-Fa-f]{6}$/), dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }).strict();
const hues = z.record(hue);
/* The reader's colours for a book sit under `book`; files written before colours were per book only carry chapter and section tables beside it. */
const overrides = z.object({ book: hues, chapters: z.record(hues).optional(), sections: z.record(hues).optional() }).strict();
const paletteChoice = z.object({ palette: z.string().min(1), mode: z.enum(['order', 'smart']), order: z.array(z.number()).optional(), target: z.number().optional() }).strict();
const side = z.object({ width: finite, items: z.array(z.string()) }).strict();
const splitNode: z.ZodType<unknown> = z.lazy(() => z.union([z.object({ type: z.literal('leaf'), group: z.string() }).strict(), z.object({ type: z.literal('split'), dir: z.enum(['row', 'column']), children: z.array(splitNode).min(1), sizes: z.array(finite.positive()).optional() }).strict()]));
const layout = z.object({ sides: z.object({ left: side, right: side }).strict(), home: z.record(z.enum(['left', 'right'])), collapsed: z.array(z.string()), groups: z.array(z.object({ key: z.string(), tabs: z.array(z.string()), active: z.string().nullable() }).strict()).min(1), focus: finite, tree: splitNode, offered: z.array(z.string()).optional() }).strict();
const scope = z.union([z.object({ follow: z.literal(true), level: z.enum(['book', 'chapter', 'section']) }).strict(), z.object({ follow: z.literal(false), target: z.union([z.object({ level: z.literal('book'), book: z.string().optional() }).strict(), z.object({ level: z.literal('chapter'), book: z.string().optional(), chapter: z.string() }).strict(), z.object({ level: z.literal('section'), book: z.string().optional(), section: z.string() }).strict()]) }).strict()]);
const scopes = z.record(scope);
const binding = z.record(z.string().min(1)).superRefine((value, ctx) => { Object.keys(value).forEach((key) => { if (!chord(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid chord ${key}` }); }); });
const changes = z.record(z.array(z.string().min(1)).superRefine((list, ctx) => { list.forEach((c) => { if (!chord(c)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid chord ${c}` }); }); }));
const tree = z.object({ entries: z.array(z.object({ id: z.string().min(1), parent: z.string().nullable(), kind: z.enum(['folder', 'note', 'book', 'drawing', 'file', 'chat']), name: z.string(), bookId: z.string().optional(), fileId: z.string().optional(), drawingId: z.string().optional(), chatId: z.string().optional() }).strict()), expanded: z.array(z.string()) }).strict();
/* A file the reader imported, and the two things they write on one. The ids
   are the shapes the stores generate: eight of base 36 for a file, as a note's
   id is, and ten for a mark, which is what tells a file mark from a book
   highlight where a `[[hl:…]]` link names either. */
const fileDoc = z.object({
  id: z.string().regex(/^[a-z0-9]{8}$/), name: z.string(), type: z.enum(['pdf', 'image']),
  mime: z.string().max(200), size: finite.nonnegative(), pages: finite.positive().optional(),
  created: finite.nonnegative(), updated: finite.nonnegative(),
}).strict();
const markId = z.string().regex(/^[a-z0-9]{10}$/);
const fileMark = z.union([
  z.object({
    kind: z.literal('highlight'), id: markId, file: z.string().min(1), page: finite.positive(),
    anchor: z.object({ quote: z.string().min(1), prefix: z.string(), suffix: z.string() }).strict(),
    color: z.enum(['yellow', 'green', 'blue', 'pink']), text: z.string(),
    created: finite.nonnegative(), updated: finite.nonnegative(),
  }).strict(),
  z.object({
    kind: z.literal('box'), id: markId, file: z.string().min(1), page: finite.positive(),
    x: finite, y: finite, w: finite, h: finite, body: z.string(),
    created: finite.nonnegative(), updated: finite.nonnegative(),
  }).strict(),
]);
/* The AI block as the backup may carry it: the models each provider lists and
   which are ticked, the Local AI endpoints and the last model chosen, or the
   single provider and model of the first shape. Every key must be the
   empty string — a backup is a file readers send to themselves across machines
   and post to each other for help, and a key that could be spent has no
   business in one. */
const PROVIDERS = ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'mistral', 'local'] as const;
const CLOUDS = ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'mistral'] as const;
const modelPick = z.object({ provider: z.enum(PROVIDERS), model: z.string().min(1) }).strict();
const byCloud = <T extends z.ZodTypeAny>(v: T) => z.record(z.enum(CLOUDS), v);
const aiSettings = z.object({
  keys: byCloud(z.string()).refine((k) => Object.values(k).every((v) => v === ''), 'a backup carries no API key'),
  listed: byCloud(z.array(z.string())),
  added: byCloud(z.array(z.string())),
  shown: z.array(modelPick),
  endpoints: z.array(z.object({ id: z.string().min(1), name: z.string(), baseUrl: z.string(), models: z.array(z.string()) }).strict()),
  last: modelPick.nullable(),
  inlineHtml: z.boolean(),
}).strict().or(z.object({
  provider: z.string(), models: z.record(z.string()), baseUrl: z.string(),
  keys: z.record(z.string()).refine((k) => Object.values(k).every((v) => v === ''), 'a backup carries no API key'),
}).strict());
/* The index of the chats: one row per chat, the records themselves being far
   too heavy for localStorage and carried by `chats` below. */
const chatRow = z.object({ id: z.string().regex(/^[a-z0-9]{8}$/), name: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict();
const chatIndex = z.array(chatRow);
/* The same, each row with the book its chat is filed under, `''` for none. */
const chatIndexFiled = z.array(chatRow.extend({ book: z.string().optional() }).strict());
const chatMessage = z.object({
  id: z.string().min(1), parent: z.string().min(1).nullable(), role: z.enum(['user', 'assistant']), text: z.string(),
  chips: z.array(z.object({ kind: z.string().min(1), key: z.string(), label: z.string(), text: z.string(), pinned: z.boolean().optional(), image: z.string().optional() }).strict()),
  model: z.string().optional(), at: finite.nonnegative(), state: z.enum(['done', 'streaming', 'stopped', 'failed']), error: z.string().optional(),
  steps: z.array(z.union([
    z.object({ kind: z.literal('text'), text: z.string() }).strict(),
    z.object({ kind: z.literal('tool'), id: z.string(), name: z.string(), input: z.unknown(), output: z.string().optional(), error: z.string().optional() }).strict(),
  ])).optional(),
}).strict();
export const ChatSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{8}$/), name: z.string(), root: z.string().min(1), messages: z.record(chatMessage),
  leaf: z.string().min(1), created: finite.nonnegative(), updated: finite.nonnegative(), pick: modelPick.optional(),
}).strict();

/* An exercise a model wrote for a concept, kept in IndexedDB and carried
   whole like a chat. Its answer is the book's own answer shape. */
export const GeneratedSchema = z.object({
  id: z.string().min(1).max(40), book: z.string().min(1), section: z.string().min(1), concepts: z.array(z.string().min(1)).min(1),
  prompt: z.string(), answer: AnswerSchema, bloom: z.enum(BLOOM_LEVELS), facet: z.string(),
  model: z.object({ provider: z.enum(PROVIDERS), model: z.string().min(1) }).strict(),
  created: finite.nonnegative(), uses: finite.nonnegative(),
  request: z.object({ standard: z.boolean(), note: z.string().optional() }).strict(),
}).strict();

/* The rows the explorer and the link resolver draw a drawing from: its name
   and its dates, never its ink, which is why they are in localStorage at all. */
const drawingRows = z.array(z.object({ id: z.string().regex(/^[a-z0-9]{8}$/), name: z.string(), created: finite.nonnegative(), updated: finite.nonnegative() }).strict());
/* What the reader's scratch pages are indexed by — book, section and exercise
   — and, where the work has been kept, the drawing it became. */
const scratchIndex = z.record(z.object({ linked: z.string().regex(/^[a-z0-9]{8}$/).optional() }).strict());

/* One drawing whole, as the database keeps it: a page of ink with boxes and
   frames standing on it. A point is a triple, x, y and pressure. */
const drawPoint = z.tuple([finite, finite, finite]);
/* A connector's end: a side of an element, or a point of the plane. */
const drawEnd = z.union([z.object({ item: z.string().min(1), side: z.enum(['n', 'e', 's', 'w']) }).strict(), z.object({ x: finite, y: finite }).strict()]);
const drawItem = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stroke'), id: z.string().min(1), tool: z.enum(['pen', 'highlighter']), color: z.string(), size: finite, points: z.array(drawPoint).min(1) }).strict(),
  z.object({ kind: z.literal('shape'), id: z.string().min(1), shape: z.enum(['line', 'arrow', 'rect', 'ellipse']), color: z.string(), size: finite, fill: z.boolean(), from: z.tuple([finite, finite]), to: z.tuple([finite, finite]) }).strict(),
  z.object({ kind: z.literal('box'), id: z.string().min(1), x: finite, y: finite, w: finite, h: finite, body: z.string(), color: z.string().optional() }).strict(),
  z.object({ kind: z.literal('frame'), id: z.string().min(1), x: finite, y: finite, w: finite, h: finite, embed: z.string().min(1), open: z.string().min(1).optional(), color: z.string().optional() }).strict(),
  z.object({ kind: z.literal('link'), id: z.string().min(1), from: drawEnd, to: drawEnd, curve: z.enum(['straight', 'bezier']), heads: z.object({ start: z.boolean(), end: z.boolean() }).strict(), color: z.string(), size: finite, label: z.string() }).strict(),
  z.object({ kind: z.literal('group'), id: z.string().min(1), x: finite, y: finite, w: finite, h: finite, label: z.string(), color: z.string().optional() }).strict(),
  z.object({ kind: z.literal('chat'), id: z.string().min(1), x: finite, y: finite, w: finite, h: finite, chat: z.string().min(1), root: z.string().min(1).optional() }).strict(),
]);
/* The plane is unbounded, so a drawing carries no page: `width` and `height`
   are the page a record written before that carried, read past and dropped,
   and `view` is the corner the reader was last looking from. */
export const DrawingSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{8}$/), name: z.string(),
  width: finite.positive().optional(), height: finite.positive().optional(),
  view: z.object({ x: finite, y: finite, zoom: finite.positive() }).strict().optional(),
  items: z.array(drawItem), created: finite.nonnegative(), updated: finite.nonnegative(),
}).strict();
/* A scratch page is named by the thing it belongs to rather than by an id, so
   it travels as that key and the page it holds. */
export const ScratchSchema = z.object({ key: z.string().min(1), drawing: DrawingSchema }).strict();

const validators: Readonly<Record<string, z.ZodTypeAny>> = {
  'omnistax-ai-v1': aiSettings,
  'omnistax-drawings-v1': drawingRows,
  'omnistax-scratch-v1': scratchIndex,
  'omnistax-chats-v2': chatIndexFiled, 'omnistax-chats-v1': chatIndex,
  'omnistax-chat-pages-v1': z.record(z.string().regex(/^[a-z0-9]{8}$/)),
  'omnistax-keys-v2': changes,
  'omnistax-seen-notes-v1': z.string().regex(VERSION),
  'omnistax-keys': binding,
  'omnistax-practice-v2': z.object({ attempts: z.array(attempt), shown: z.array(shown), rounds: z.array(round), self, settings: practiceSettings }).strict(),
  'omnistax-practice-v1': object,
  'omnistax-practice-pages-v2': z.record(page), 'omnistax-practice-pages-v1': object,
  'omnistax-practice-sessions-v2': z.record(session), 'omnistax-practice-sessions-v1': object,
  'omnistax-practice-links-v1': z.object({ folder: z.string().min(1).nullable(), links: z.record(z.array(z.string().regex(/^(?:note|drawing|chat):[a-z0-9]{8}$/))) }).strict(),
  'omnistax-library-v1': z.array(z.string()),
  'omnistax-explorer-v1': tree,
  'omnistax-notedocs-v1': z.array(noteDoc),
  'omnistax-files-v1': z.array(fileDoc),
  'omnistax-filemarks-v1': z.array(fileMark),
  'omnistax-layout-v6': layout, 'omnistax-layout-v5': layout, 'omnistax-scope-v2': scopes, 'omnistax-scope': object,
  'omnistax-folded': z.array(z.string()), 'omnistax-hidden-figs': z.array(z.string()),
  'omnistax-seen-releases-v2': z.record(z.object({ release: z.string().min(1), artifact: z.string().min(1), sections: z.array(z.object({ id: z.string().min(1), fingerprint: z.string().min(1) }).strict()) }).strict()),
  'omnistax-seen-releases-v1': z.record(z.record(z.string().min(1))),
  'omnistax-auto-update-v1': z.record(z.boolean()),
  'omnistax-tips-v1': TipStateSchema, 'omnistax-last-page-v1': z.record(z.string()),
  'omnistax-chat-tree-v1': z.array(z.string()),
  'omnistax-pomodoros': z.array(object), 'omnistax-pomodoro-categories': z.array(object),
};
/* The reader's highlights for one book: only the switches they set apart from its default. */
const bookHighlights = z.object({ facts: z.boolean(), refs: z.boolean(), concepts: z.boolean(), words: z.boolean(), symbols: z.boolean(), underlines: z.boolean() }).partial().strict();
const NOTES_KEY = /^omnistax-notes-[^/]+$/;
const COLOURS_KEY = /^omnistax-colours-[^/]+$/;
const colourFile = z.object({
  format: z.literal('omnistax-colours'), version: z.literal(1), book: z.string().min(1), order: z.array(z.string()), overrides,
  vision: z.enum(['normal', 'protan', 'deutan', 'tritan']).optional(), categories: paletteChoice.optional(), referents: paletteChoice.optional(),
}).strict();
/* The shape a JSON record's value must have, by its key. */
const shapeOf = (key: string): z.ZodTypeAny | null => {
  if (HIGHLIGHTS_KEY.test(key)) return bookHighlights;
  if (NOTES_KEY.test(key)) return z.array(note);
  if (COLOURS_KEY.test(key)) return colourFile.refine((v) => key === `omnistax-colours-${v.book}`, () => ({ message: t('shell.backup.record.otherBook') }));
  return JSON_KEY_LIST.includes(key) ? validators[key] ?? null : null;
};

/* What a zod failure says, and where in the value it stands, so a refusal
   names the field rather than only the record: "settings: Unrecognized
   key(s) in object: 'stopwatch'". */
export const issueOf = (error: z.ZodError): string => {
  const first = error.issues[0];
  if (!first) return t('shell.backup.invalidData');
  return first.path.length ? `${first.path.join('.')}: ${first.message}` : first.message;
};

/* Why this version cannot take a record back, or null when it can. A record
   the app does not know, a value that is not the JSON its key holds, and a
   value of the wrong shape each say so in their own words. */
export const recordProblem = (record: { readonly key: string; readonly value: string }): string | null => {
  if (record.key.length > 300) return t('shell.backup.record.longKey');
  if (record.value.length > MAX_BACKUP_BYTES) return t('shell.backup.record.tooLarge');
  if (categoryOf(record.key) === null) return t('shell.backup.record.unknown');
  const scalar = scalarKeys.get(record.key);
  if (scalar) return scalar(record.value) ? null : t('shell.backup.record.value', { value: record.value.length > 40 ? `${record.value.slice(0, 40)}…` : record.value });
  const shape = shapeOf(record.key);
  if (!shape) return t('shell.backup.record.unknown');
  let value: unknown;
  try { value = JSON.parse(record.value); } catch { return t('shell.backup.record.notJson'); }
  const parsed = shape.safeParse(value);
  return parsed.success ? null : issueOf(parsed.error);
};

/* A record as this version would write it: a key it knows, under that key's
   category, holding a value of the key's shape. */
export const validReaderRecord = (record: ReaderRecord): boolean =>
  recordProblem(record) === null && categoryOf(record.key) === record.category;

/* A record's category is derived from its key, so it is read past rather than
   checked: a file written when a key stood in another category (the focus
   keys once stood with the appearance) still restores, under today's. */
const RecordSchema = z.object({ key: z.string(), value: z.string(), category: z.string().optional() }).strict();
export type BackupChat = z.infer<typeof ChatSchema>;
/* One imported file's bytes on their way through a backup. The text pulled out
   of a PDF is not carried: it is derived from these bytes and is pulled out
   again on the way back in. */
const FileBlobSchema = z.object({
  id: z.string().min(1).max(200), type: z.enum(['pdf', 'image']), mime: z.string().min(1).max(200),
  base64: z.string(), created: z.number().finite().nonnegative(),
}).strict();
export type BackupFile = z.infer<typeof FileBlobSchema>;
const AssetSchema = z.object({ id: z.string().min(1).max(200), type: z.string().min(1).max(200), dataUrl: z.string().startsWith('data:'), created: z.number().finite().nonnegative() }).strict();
const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT), version: z.literal(BACKUP_VERSION), exportedAt: z.string().datetime(),
  app: z.object({ readerFormat: z.literal(1) }).strict(),
  records: z.array(RecordSchema), assets: z.array(AssetSchema),
  /* The chats themselves, which live in a database of their own rather than in
     localStorage. A backup written before chats existed carries none, and
     parses all the same. */
  chats: z.array(ChatSchema).default([]),
  /* The bytes of the imported files, base64 where the store keeps Blobs. A
     backup written before files existed carries none, and parses all the same. */
  files: z.array(FileBlobSchema).default([]),
  /* The ink of the drawings, and the scratch page of every exercise the reader
     has worked on: both live in a database of their own, since a page of
     strokes is heavier than localStorage should hold. A backup written before
     drawings existed carries neither, and parses all the same. */
  drawings: z.array(DrawingSchema).default([]),
  scratch: z.array(ScratchSchema).default([]),
  /* The practice exercises a model wrote. A backup written before them carries none. */
  generated: z.array(GeneratedSchema).default([]),
  books: z.array(z.object({ id: z.string().min(1), release: z.string().optional() }).strict()),
  /* What an earlier read of this same profile set aside: a profile read once
     and read again keeps the list rather than refusing its own field. */
  skipped: z.array(z.object({ key: z.string(), why: z.string() }).strict()).optional(),
}).strict().superRefine((value, ctx) => {
  const keys = new Set<string>();
  value.records.forEach((record, index) => {
    if (keys.has(record.key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['records', index, 'key'], message: t('shell.backup.duplicate', { key: record.key }) });
    keys.add(record.key);
  });
});

export type ReaderBackup = Omit<z.infer<typeof BackupSchema>, 'records' | 'skipped'> & { readonly records: readonly ReaderRecord[] };
/* A record a backup carried that this version left out, and why. */
export type SkippedRecord = { readonly key: string; readonly why: string };
/* A backup as read: the records this version can restore, and the ones it
   could not, which a restore leaves as they stand on this device. */
export type ParsedBackup = ReaderBackup & { readonly skipped: readonly SkippedRecord[] };

export const parseBackupText = (text: string): ParsedBackup => {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error(t('shell.backup.tooLarge', { limit: MAX_BACKUP_LABEL }));
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error(t('shell.backup.notJson')); }
  return parseBackup(raw);
};

/* The whole file is refused when it is not a backup at all, or when a chat,
   a drawing or an imported file in it is malformed: those are replaced whole
   on a restore, so one left out would be one deleted. A reader record is
   different. A restore replaces records key by key, so one this version
   cannot read is set aside and named, with the reason, and the restore keeps
   this device's own value for that key: nothing is written over with what
   could not be read, and nothing the device holds is dropped for it. That is
   also what lets a device on an older version take a profile from a newer
   one, whose records may carry what the older does not know yet. */
export const parseBackup = (raw: unknown): ParsedBackup => {
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) throw new Error(t('shell.backup.invalid', { why: issueOf(parsed.error) }));
  const { skipped: before = [], ...rest } = parsed.data;
  const records: ReaderRecord[] = [], skipped: SkippedRecord[] = [...before];
  for (const r of rest.records) {
    const why = recordProblem(r), category = categoryOf(r.key);
    if (why === null && category) records.push({ key: r.key, value: r.value, category });
    else skipped.push({ key: r.key, why: why ?? t('shell.backup.record.unknown') });
  }
  return { ...rest, records, skipped };
};

/* One line per record set aside, for the reader: "omnistax-practice-v2:
   settings: Unrecognized key(s) in object: 'stopwatch'". */
export const skippedLine = (s: SkippedRecord): string => t('shell.backup.skippedLine', { key: s.key, why: s.why });

export const summarizeBackup = (backup: ReaderBackup): { readonly exportedAt: string; readonly categories: Readonly<Record<string, number>>; readonly records: number; readonly assets: number; readonly files: number } => ({
  exportedAt: backup.exportedAt,
  categories: Object.fromEntries(Array.from(new Set(backup.records.map((r) => r.category))).sort().map((category) => [category, backup.records.filter((r) => r.category === category).length])),
  records: backup.records.length,
  assets: backup.assets.length,
  files: backup.files.length,
});
