/* Whether the reader has read a chat's last answer, pure. A chat is seen
   while it stands in front of them: as the active tab of a group, or inside a
   Conversations page that is. An answer that finished after the chat was last
   seen is unread, so one that streams while the reader watches never is. */
import { parseItemKey, viewKindOf, type ChatId } from '../types/ids';
import type { ChatEntry } from './entries';

export type Seen = Readonly<Record<string, number>>;

export const parseSeen = (raw: unknown): Seen =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter(([id, at]) => /^[a-z0-9]{8}$/.test(id) && typeof at === 'number' && Number.isFinite(at) && at >= 0))
    : {};

export const unread = (e: ChatEntry, seen: Seen): boolean => e.answered !== undefined && e.answered > (seen[e.id] ?? 0);

/* The chats in front of the reader: each group's active tab, a chat's own or
   the chat a Conversations page is showing. */
export const visibleChats = (groups: readonly { readonly active: string | null }[], pageOf: (page: string) => ChatId | null): readonly ChatId[] =>
  groups.flatMap((g): readonly ChatId[] => {
    if (!g.active) return [];
    const id = parseItemKey(g.active);
    if (id?.kind === 'chat') return [id.chat];
    if (viewKindOf(g.active) === 'chats') { const shown = pageOf(g.active); return shown ? [shown] : []; }
    return [];
  });

/* The chats in view marked seen now, where an answer has finished since they
   last were; the same value when nothing changed, so nothing is written. */
export const look = (seen: Seen, visible: readonly ChatId[], rows: readonly ChatEntry[], now: number): Seen => {
  const due = rows.filter((e) => visible.includes(e.id) && unread(e, seen));
  return due.length === 0 ? seen : { ...seen, ...Object.fromEntries(due.map((e) => [e.id, Math.max(now, e.answered ?? 0)])) };
};

