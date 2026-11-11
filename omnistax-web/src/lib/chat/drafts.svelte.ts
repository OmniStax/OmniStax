/* What the reader has put before a chat and not yet sent: the words in its
   composer and the chips above it. They are kept by the chat, in this browser,
   so a chat closed and opened again, or a page reloaded, is as the reader left
   it. A draft is this device's own: it is in no backup and no sync, and it
   goes when it is sent, emptied, or its chat is deleted.

   A chip carries the text the model is to read, and a section's is long, so
   the whole record is held to a size: past it the longest chips are left out
   of what is saved, and the words always are kept. */
import { readerWritesAllowed } from '../backup/guard';
import { CHIP_KINDS, type Chip } from './context';
import type { ChatId } from '../types/ids';

const KEY = 'omnistax-chat-drafts';
const ROOM = 1_500_000;
const WAIT = 400;

export type Draft = { readonly text: string; readonly chips: readonly Chip[] };

const isChip = (c: unknown): c is Chip => {
  if (typeof c !== 'object' || c === null) return false;
  const o = c as Record<string, unknown>;
  return (CHIP_KINDS as readonly unknown[]).includes(o.kind) && typeof o.key === 'string' && typeof o.label === 'string' && typeof o.text === 'string'
    && (o.pinned === undefined || typeof o.pinned === 'boolean') && (o.image === undefined || typeof o.image === 'string');
};
export const parseDrafts = (raw: unknown): Record<string, Draft> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).flatMap(([id, d]): [string, Draft][] => {
    if (!/^[a-z0-9]{8}$/.test(id) || typeof d !== 'object' || d === null) return [];
    const o = d as { text?: unknown; chips?: unknown };
    const text = typeof o.text === 'string' ? o.text : '', chips = Array.isArray(o.chips) ? o.chips.filter(isChip) : [];
    return text || chips.length ? [[id, { text, chips }]] : [];
  }));
};
/* The record as it is written: whole where it fits, and otherwise without its
   longest chips, one at a time, until it does. */
export const fitDrafts = (all: Readonly<Record<string, Draft>>, room = ROOM): string => {
  let held: Record<string, Draft> = { ...all }, out = JSON.stringify(held);
  while (out.length > room) {
    const longest = Object.entries(held).flatMap(([id, d]) => d.chips.map((c) => ({ id, c }))).sort((a, b) => b.c.text.length - a.c.text.length)[0];
    if (!longest) break;
    const d = held[longest.id]!;
    held = { ...held, [longest.id]: { ...d, chips: d.chips.filter((c) => c !== longest.c) } };
    out = JSON.stringify(held);
  }
  return out;
};

class ChatDrafts {
  private held: Record<string, Draft> | null = null;
  private later: ReturnType<typeof setTimeout> | null = null;

  private all(): Record<string, Draft> {
    if (this.held) return this.held;
    try { this.held = parseDrafts(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { this.held = {}; }
    if (typeof addEventListener === 'function') addEventListener('pagehide', () => this.flush());
    return this.held;
  }
  of(id: ChatId): Draft | null { return this.all()[id] ?? null; }
  setText(id: ChatId, text: string): void { this.put(id, { text, chips: this.of(id)?.chips ?? [] }); }
  setChips(id: ChatId, chips: readonly Chip[]): void { this.put(id, { text: this.of(id)?.text ?? '', chips }); }
  drop(id: ChatId): void { this.put(id, { text: '', chips: [] }); }

  private put(id: ChatId, d: Draft): void {
    const all = this.all(), had = all[id];
    if (!d.text && !d.chips.length) { if (!had) return; delete all[id]; }
    else { if (had && had.text === d.text && had.chips === d.chips) return; all[id] = d; }
    this.later ??= setTimeout(() => this.flush(), WAIT);
  }
  flush(): void {
    if (this.later !== null) { clearTimeout(this.later); this.later = null; }
    if (!this.held || !readerWritesAllowed()) return;
    try { localStorage.setItem(KEY, fitDrafts(this.held)); } catch { /* private mode, or no room: the draft lasts as long as the page */ }
  }
}
export const chatDrafts = new ChatDrafts();
