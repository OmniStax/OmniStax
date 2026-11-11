/* What stands in a chat's composer before it is sent: the words typed and the
   chips beside them, kept in this browser so that a reload gives the question
   back as it was being asked. A draft goes when it is sent or emptied, and
   with its chat. It is not one of the reader's records: no backup carries it. */
import { readerWritesAllowed } from '../backup/guard';
import { CHIP_KINDS, type Chip } from './context';

export type Draft = { readonly text: string; readonly chips: readonly Chip[] };
export type Drafts = Readonly<Record<string, Draft>>;

const KEY = 'omnistax-chat-drafts';
/* How long after the last keystroke a draft is written down. */
const SAVE_MS = 300;

const parseChip = (raw: unknown): Chip | null => {
  const c = raw as Partial<Record<keyof Chip, unknown>> | null;
  if (!c || typeof c !== 'object' || !CHIP_KINDS.includes(c.kind as Chip['kind'])) return null;
  if (typeof c.key !== 'string' || typeof c.label !== 'string' || typeof c.text !== 'string') return null;
  return { kind: c.kind as Chip['kind'], key: c.key, label: c.label, text: c.text, ...(c.pinned === true ? { pinned: true } : {}), ...(typeof c.image === 'string' ? { image: c.image } : {}) };
};
export const parseDrafts = (raw: unknown): Drafts => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Draft> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const d = v as { text?: unknown; chips?: unknown } | null;
    if (!d || typeof d.text !== 'string') continue;
    const chips = Array.isArray(d.chips) ? d.chips.flatMap((c) => { const p = parseChip(c); return p ? [p] : []; }) : [];
    if (d.text || chips.length) out[id] = { text: d.text, chips };
  }
  return out;
};
/* A draft with a part changed; one left with nothing in it is no draft. */
export const withDraft = (all: Drafts, id: string, part: Partial<Draft>): Drafts => {
  const { [id]: had, ...rest } = all;
  const next: Draft = { text: had?.text ?? '', chips: had?.chips ?? [], ...part };
  return next.text || next.chips.length ? { ...rest, [id]: next } : rest;
};

let all: Drafts | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const load = (): Drafts => {
  if (all) return all;
  try { all = parseDrafts(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { all = {}; }
  return all;
};
const write = (): void => {
  timer = null;
  if (!readerWritesAllowed()) return;
  const drafts = load();
  try { localStorage.setItem(KEY, JSON.stringify(drafts)); return; } catch { /* too large, or private mode */ }
  /* The chips carry the text of what they stand for; where that does not fit, the words alone are kept. */
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(drafts).flatMap(([id, d]) => (d.text ? [[id, { text: d.text, chips: [] }]] : []))))); } catch { /* private mode */ }
};
const later = (): void => { timer ??= setTimeout(write, SAVE_MS); };

export const chatDrafts = {
  get: (id: string): Draft | null => load()[id] ?? null,
  set: (id: string, part: Partial<Draft>): void => {
    const before = load(), next = withDraft(before, id, part);
    const was = before[id], now = next[id];
    if (was?.text === now?.text && was?.chips === now?.chips) return;
    all = next; later();
  },
  drop: (id: string): void => { if (load()[id]) { all = withDraft(load(), id, { text: '', chips: [] }); later(); } },
  /* The drafts of chats that are still there. */
  keep: (ids: ReadonlySet<string>): void => {
    const before = load(), next = Object.fromEntries(Object.entries(before).filter(([id]) => ids.has(id)));
    if (Object.keys(next).length !== Object.keys(before).length) { all = next; later(); }
  },
};
