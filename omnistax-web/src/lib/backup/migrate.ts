/* The names the reader's records were once kept under, and how each comes to
   the one name it has now. A record used to take a new name (`-v2`, `-v3`)
   whenever what it holds changed, and the old name was kept beside it for a
   tab still open on an older build; now each record has one name, a change to
   what it holds only ever adds to it, and the data format number
   (backup/format.ts) is what tells an older build to update before it syncs.

   The same step runs wherever records an older build wrote can arrive: on
   this device as the app starts (migrateStorage), in a backup file
   (parseBackup), and in a sync repo an older build last wrote (sync/run.ts).

   For each record: when the current name is already there, the old ones are
   only what an older build left behind and go. Otherwise the first old name
   there is taken over, converted where its shape was different. An old
   record that cannot be converted is left where it is rather than lost.
   Pure, but for migrateStorage. */
import { parseBindings } from '../commands/chord';
import { changesFrom } from '../commands/defaults';
import { browserOf, type Host } from '../commands/host';
import { mergeIndex, parseIndex } from '../chat/entries';
import { parsePages, parseSessions, parseAttempts, parseShown, parseRounds, parseSelf, obj } from '../practice/stored';
import { DEFAULT_SETTINGS } from '../practice/model';
import { parseScopes } from '../sections/scope';
import { retiredViewKeys } from '../types/ids';

type Get = (key: string) => string | undefined;
type Rename = {
  readonly to: string;
  readonly from: readonly string[];
  /* The value under `to`, from the old records; absent, the first old one as it is. */
  readonly convert?: (get: Get) => string | null;
};

const json = (v: string | undefined): unknown => (v === undefined ? undefined : JSON.parse(v));
const firstOf = (get: Get, keys: readonly string[]): string | undefined => keys.map(get).find((v) => v !== undefined);

/* The host the old whole map of shortcuts is read against: its changes are
   what differs from this browser's own defaults. */
const hostNow = (): Host => ({ browser: typeof navigator === 'undefined' ? 'other' : browserOf(navigator.userAgent), surface: 'tab' });

export const RENAMES: readonly Rename[] = [
  {
    to: 'omnistax-shortcuts', from: ['omnistax-keys-v2', 'omnistax-keys'],
    convert: (get) => {
      const changes = get('omnistax-keys-v2'); if (changes !== undefined) return changes;
      const old = parseBindings(json(retiredViewKeys(get('omnistax-keys') ?? 'null')));
      return old ? JSON.stringify(changesFrom(hostNow(), old)) : null;
    },
  },
  {
    to: 'omnistax-practice', from: ['omnistax-practice-v2', 'omnistax-practice-v1'],
    convert: (get) => {
      const fresh = get('omnistax-practice-v2'); if (fresh !== undefined) return fresh;
      const old = obj(json(get('omnistax-practice-v1')));
      return old ? JSON.stringify({ attempts: parseAttempts(old.attempts), shown: parseShown(old.shown), rounds: parseRounds(old.rounds), self: parseSelf(old.self), settings: DEFAULT_SETTINGS }) : null;
    },
  },
  { to: 'omnistax-practice-pages', from: ['omnistax-practice-pages-v2', 'omnistax-practice-pages-v1'], convert: (get) => { const v = firstOf(get, ['omnistax-practice-pages-v2', 'omnistax-practice-pages-v1']); return v === undefined ? null : JSON.stringify(parsePages(json(v))); } },
  { to: 'omnistax-practice-sessions', from: ['omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1'], convert: (get) => { const v = firstOf(get, ['omnistax-practice-sessions-v2', 'omnistax-practice-sessions-v1']); return v === undefined ? null : JSON.stringify(parseSessions(json(v))); } },
  { to: 'omnistax-practice-links', from: ['omnistax-practice-links-v1'] },
  { to: 'omnistax-library', from: ['omnistax-library-v1'] },
  { to: 'omnistax-explorer', from: ['omnistax-explorer-v1'] },
  { to: 'omnistax-notedocs', from: ['omnistax-notedocs-v1'] },
  { to: 'omnistax-layout', from: ['omnistax-layout-v6'] },
  {
    to: 'omnistax-scopes', from: ['omnistax-scope-v2', 'omnistax-scope'],
    convert: (get) => get('omnistax-scope-v2') ?? (get('omnistax-scope') === undefined ? null : JSON.stringify(parseScopes(json(retiredViewKeys(get('omnistax-scope') as string))))),
  },
  { to: 'omnistax-seen-releases', from: ['omnistax-seen-releases-v2'] },
  { to: 'omnistax-auto-update', from: ['omnistax-auto-update-v1'] },
  { to: 'omnistax-file-index', from: ['omnistax-files-v1'] },
  { to: 'omnistax-filemarks', from: ['omnistax-filemarks-v1'] },
  { to: 'omnistax-ai', from: ['omnistax-ai-v1'] },
  {
    /* The third index wins; without it, the second (which never shipped) and
       the first are put together row by row, as the store once did. */
    to: 'omnistax-chat-index', from: ['omnistax-chats-v3', 'omnistax-chats-v2', 'omnistax-chats-v1'],
    convert: (get) => get('omnistax-chats-v3') ?? JSON.stringify(mergeIndex(parseIndex(json(get('omnistax-chats-v2') ?? '[]')), parseIndex(json(get('omnistax-chats-v1') ?? '[]')))),
  },
  { to: 'omnistax-chat-pages', from: ['omnistax-chat-pages-v1'] },
  { to: 'omnistax-chats-by-book', from: ['omnistax-chats-by-book-v1'] },
  { to: 'omnistax-chat-seen', from: ['omnistax-chat-seen-v1'] },
  { to: 'omnistax-chat-tree', from: ['omnistax-chat-tree-v1'] },
  { to: 'omnistax-drawing-index', from: ['omnistax-drawings-v1'] },
  { to: 'omnistax-scratch-index', from: ['omnistax-scratch-v1'] },
  { to: 'omnistax-tip-history', from: ['omnistax-tips-v1'] },
  { to: 'omnistax-last-page', from: ['omnistax-last-page-v1'] },
  { to: 'omnistax-seen-notes', from: ['omnistax-seen-notes-v1'] },
  { to: 'omnistax-drawing-palette', from: ['omnistax-drawing-palette-v1'] },
];

/* Records no build has read for a while, which only go: the fifth layout,
   read past since the sixth, the first list of seen releases, and the
   switches the highlights had before each book kept its own. */
export const RETIRED: readonly string[] = [
  'omnistax-layout-v5', 'omnistax-seen-releases-v1',
  'omnistax-cc', 'omnistax-cc-all', 'omnistax-cc-facts', 'omnistax-cc-refs', 'omnistax-cc-words', 'omnistax-cc-symbols', 'omnistax-underlines', 'omnistax-zoom-keys',
];

const OLD = new Set([...RENAMES.flatMap((r) => r.from), ...RETIRED]);
/* A name a record was once kept under and is no longer. */
export const isOldKey = (key: string): boolean => OLD.has(key);
/* The name an old record is kept under now. */
export const currentKeyOf = (key: string): string | null => RENAMES.find((r) => r.from.includes(key))?.to ?? null;

export type Migration = { readonly set: ReadonlyMap<string, string>; readonly remove: readonly string[] };

/* What to write and what to drop so that `has` holds no old name. `has` says
   whether a key is there at all, `get` reads one; the two are apart so that a
   caller can say a current record is there without reading it. */
export const migration = (has: (key: string) => boolean, get: Get): Migration => {
  const set = new Map<string, string>(), remove: string[] = [];
  for (const r of RENAMES) {
    const old = r.from.filter(has);
    if (!old.length) continue;
    if (has(r.to)) { remove.push(...old); continue; }
    let value: string | null;
    try { value = r.convert ? r.convert((k) => (has(k) ? get(k) : undefined)) : get(old[0]) ?? null; } catch { value = null; }
    if (value === null) continue;
    set.set(r.to, value);
    remove.push(...old);
  }
  remove.push(...RETIRED.filter(has));
  return { set, remove };
};

/* The records under the names they have now. */
export const migrateRecords = <R extends { readonly key: string; readonly value: string }>(records: readonly R[], make: (key: string, value: string) => R): R[] => {
  const by = new Map(records.map((r) => [r.key, r.value] as const));
  const m = migration((k) => by.has(k), (k) => by.get(k));
  if (!m.set.size && !m.remove.length) return [...records];
  const gone = new Set(m.remove);
  return [...records.filter((r) => !gone.has(r.key)), ...[...m.set].map(([k, v]) => make(k, v))];
};

/* This device's own records, moved to their names as the app starts, before
   any store reads one. */
export const migrateStorage = (storage: Storage = localStorage): void => {
  try {
    const m = migration((k) => storage.getItem(k) !== null, (k) => storage.getItem(k) ?? undefined);
    for (const [k, v] of m.set) storage.setItem(k, v);
    for (const k of m.remove) storage.removeItem(k);
  } catch { /* private mode, or storage full: the old names are read again next time */ }
};
