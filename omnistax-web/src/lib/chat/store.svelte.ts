/* The chats the reader holds, live. The model in `model.ts` is pure and knows
   nothing of storage or of the network; this is where a chat is read out of
   IndexedDB, where a question is carried to the provider, and where the deltas
   of an answer are written onto the message as they arrive.

   One request may be in flight per chat, and its abort controller is kept here
   rather than on the chat, because a chat that is saved and read back has no
   request to stop. */
import { newChatId, type ChatId } from '../types/ids';
import { readerWritesAllowed } from '../backup/guard';
import { deleteChat, getChat, putChat } from './db';
import { ai } from './settings.svelte';
import { providerOf } from './providers/all';
import { failureOf, requestOf } from './providers/index';
import type { Chip } from './context';
import * as M from './model';
import type { Chat, MessageId } from './model';

export const INDEX_KEY = 'omnistax-chats-v1';
const SAVE_DELAY = 250;

/* What the index holds: enough to name a chat without reading it. */
export type ChatEntry = { readonly id: ChatId; readonly name: string; readonly created: number; readonly updated: number };

export const parseIndex = (raw: unknown): ChatEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    if (typeof e !== 'object' || e === null) return [];
    const o = e as Record<string, unknown>;
    if (typeof o.id !== 'string' || !/^[a-z0-9]{8}$/.test(o.id)) return [];
    const now = Date.now();
    return [{ id: o.id as ChatId, name: typeof o.name === 'string' ? o.name : '', created: Number(o.created) || now, updated: Number(o.updated) || now }];
  });
};

const entryOf = (c: Chat): ChatEntry => ({ id: c.id, name: c.name, created: c.created, updated: c.updated });

class Chats {
  /* The index, which every chat has a row in, and the chats that have been
     opened in this session, which is what the tabs read. */
  index = $state.raw<readonly ChatEntry[]>([]);
  open = $state.raw<Readonly<Record<string, Chat>>>({});
  /* The widget block is opt-in per chat and for as long as the chat is open:
     a reader who wants a picture asks for one, and asking again is one click. */
  widgets = $state.raw<Readonly<Record<string, boolean>>>({});
  private flights = new Map<string, AbortController>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  init(): void { try { this.index = parseIndex(JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')); } catch { this.index = []; } }

  get(id: ChatId): Chat | null { return this.open[id] ?? null; }
  entry(id: ChatId): ChatEntry | null { return this.index.find((e) => e.id === id) ?? null; }
  nameOf(id: ChatId): string { return this.get(id)?.name || this.entry(id)?.name || 'Chat'; }
  streaming(id: ChatId): boolean { return this.flights.has(id); }
  widgetsOn(id: ChatId): boolean { return this.widgets[id] === true; }
  toggleWidgets(id: ChatId): void { this.widgets = { ...this.widgets, [id]: !this.widgetsOn(id) }; }

  /* A chat the rail has just opened: it is in the index at once, so that a
     link or the picker can name it before a word is said. */
  create(): Chat {
    const chat = M.newChat(newChatId());
    this.put(chat);
    return chat;
  }

  /* A tab mounting on a chat it has not read yet. The index row stands while
     the record is on its way, and a row whose record has gone opens empty
     rather than leaving the tab with nothing at all. */
  async load(id: ChatId): Promise<Chat> {
    const held = this.get(id); if (held) return held;
    const stored = await getChat(id);
    const chat = stored ?? { ...M.newChat(id), name: this.entry(id)?.name ?? '' };
    const again = this.get(id);
    if (again) return again;
    this.open = { ...this.open, [id]: chat };
    return chat;
  }

  rename(id: ChatId, name: string): void { const c = this.get(id); if (c) this.put(M.rename(c, name)); }

  remove(id: ChatId): void {
    this.abort(id);
    this.index = this.index.filter((e) => e.id !== id);
    const { [id]: _gone, ...rest } = this.open;
    this.open = rest;
    this.saveIndex();
    void deleteChat(id);
  }

  /* ── asking ────────────────────────────────────────────────────────────── */

  /* A question: the reader's message, then an empty answer under it which the
     stream fills. The chips standing above the composer are written onto the
     reader's message, so what was asked with is what is read back later. */
  async ask(id: ChatId, text: string, chips: readonly Chip[]): Promise<void> {
    const chat = this.get(id); if (!chat || text.trim() === '') return;
    const asked = M.ask(chat, text.trim(), chips);
    const answered = M.answer(asked.chat, asked.id, ai.model);
    this.put(answered.chat);
    await this.run(id, answered.id);
  }

  /* Edit-and-resend: the reader's words again under the same parent, and a
     fresh answer under those. */
  async resend(id: ChatId, message: MessageId, text: string, chips?: readonly Chip[]): Promise<void> {
    const chat = this.get(id); if (!chat) return;
    const asked = M.resend(chat, message, text.trim(), chips);
    if (asked.id === message) return;
    const answered = M.answer(asked.chat, asked.id, ai.model);
    this.put(answered.chat);
    await this.run(id, answered.id);
  }

  /* Retry: another answer beside the one that stands, asked with everything
     above it unchanged. */
  async retry(id: ChatId, message: MessageId): Promise<void> {
    const chat = this.get(id); if (!chat) return;
    const again = M.retry(chat, message, ai.model);
    if (again.id === message) return;
    this.put(again.chat);
    await this.run(id, again.id);
  }

  stop(id: ChatId): void {
    const chat = this.get(id); if (!chat) return;
    const flight = this.flights.get(id); if (!flight) return;
    flight.abort();
  }

  choose(id: ChatId, message: MessageId, index: number): void {
    const chat = this.get(id); if (!chat) return;
    this.put(M.chooseSibling(chat, message, index));
  }

  goTo(id: ChatId, message: MessageId): void {
    const chat = this.get(id); if (!chat || !M.messageOf(chat, message)) return;
    this.put({ ...chat, leaf: M.latestLeafUnder(chat, message) });
  }

  /* One request, written onto one message. Everything that can go wrong ends
     the same way: the words that had arrived stay, and the message says why it
     stopped, with a Retry beside it. */
  private async run(id: ChatId, answer: MessageId): Promise<void> {
    const start = this.get(id); if (!start) return;
    if (!ai.ready) { this.put(M.fail(start, answer, 'Choose a provider and paste a key under Settings → AI first.')); return; }
    this.abort(id);
    const flight = new AbortController();
    this.flights.set(id, flight);
    const request = requestOf(start, [], ai.value, this.widgetsOn(id));
    try {
      for await (const delta of providerOf(ai.provider).stream(request, flight.signal)) {
        const chat = this.get(id); if (!chat) return;
        this.put(M.grow(chat, answer, delta), true);
      }
      const chat = this.get(id); if (chat) this.put(M.finish(chat, answer));
    } catch (e) {
      const chat = this.get(id); if (!chat) return;
      /* An abort is the reader pressing Stop, which keeps what had come. */
      if (e instanceof DOMException && e.name === 'AbortError') { this.put(M.stop(chat, answer)); return; }
      this.put(M.fail(chat, answer, failureOf(e)));
    } finally {
      if (this.flights.get(id) === flight) this.flights.delete(id);
    }
  }

  private abort(id: ChatId): void { const flight = this.flights.get(id); if (flight) { this.flights.delete(id); flight.abort(); } }

  /* ── keeping ───────────────────────────────────────────────────────────── */

  /* The chat is right at once and the writing waits, because a stream writes
     on every delta and IndexedDB should not. */
  private put(chat: Chat, defer = false): void {
    this.open = { ...this.open, [chat.id]: chat };
    const row = entryOf(chat);
    this.index = this.index.some((e) => e.id === chat.id) ? this.index.map((e) => (e.id === chat.id ? row : e)) : [...this.index, row];
    if (defer) this.later(chat.id); else this.save(chat.id);
  }

  private later(id: ChatId): void {
    if (this.timers.has(id)) return;
    this.timers.set(id, setTimeout(() => { this.timers.delete(id); this.save(id); }, SAVE_DELAY));
  }

  private save(id: ChatId): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) { clearTimeout(timer); this.timers.delete(id); }
    const chat = this.get(id);
    this.saveIndex();
    if (chat) void putChat(chat);
  }

  private saveIndex(): void {
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(this.index)); } catch { /* private mode */ }
  }
}
export const chats = new Chats();
