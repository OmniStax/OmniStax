/* The chats the reader holds, live. The model in `model.ts` is pure and knows
   nothing of storage or of the network; this is where a chat is read out of
   IndexedDB, where a question is carried to the provider, where the deltas
   of an answer are written onto the message as they arrive, and where the
   tool calls an answer makes are run.

   One request may be in flight per chat, and its abort controller is kept here
   rather than on the chat, because a chat that is saved and read back has no
   request to stop. */
import { newChatId, type ChatId } from '../types/ids';
import { readerWritesAllowed } from '../backup/guard';
import { getAsset } from '../notes/assets';
import { assetOfEmbed } from '../drawer/snapshot';
import { deleteChat, getChat, putChat } from './db';
import { ai } from './settings.svelte';
import { providerOf } from './providers/all';
import { failureOf, modelName, rejectsTools, requestOf, type Access, type Images, type ModelPick, type ToolSpec } from './providers/index';
import type { Chip } from './context';
import { MAX_ROUNDS, TOOL_SPECS, runTool } from './tools';
import { liveLibrary } from './library';
import * as M from './model';
import type { Chat, MessageId, ToolStep } from './model';

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

/* The pictures the chips of a chat hold, read out of the asset store. */
const imagesOf = async (chat: Chat): Promise<Images> => {
  const refs = [...new Set(Object.values(chat.messages).flatMap((m) => m.chips.flatMap((c) => (c.image ? [c.image] : []))))];
  const read = await Promise.all(refs.map(async (r) => { const a = assetOfEmbed(r); return [r, a ? await getAsset(a).catch(() => null) : null] as const; }));
  return Object.fromEntries(read.filter((x): x is readonly [string, string] => x[1] !== null));
};

class Chats {
  /* The index, which every chat has a row in, and the chats that have been
     opened in this session, which is what the tabs read. */
  index = $state.raw<readonly ChatEntry[]>([]);
  open = $state.raw<Readonly<Record<string, Chat>>>({});
  private flights = new Map<string, AbortController>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  /* Models that refused tools this session. */
  private toolless = new Set<string>();

  init(): void { try { this.index = parseIndex(JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')); } catch { this.index = []; } }

  get(id: ChatId): Chat | null { return this.open[id] ?? null; }
  entry(id: ChatId): ChatEntry | null { return this.index.find((e) => e.id === id) ?? null; }
  nameOf(id: ChatId): string { return this.get(id)?.name || this.entry(id)?.name || 'Chat'; }
  streaming(id: ChatId): boolean { return this.flights.has(id); }

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

  /* The model a chat asks: its own pick, or the one last chosen anywhere. */
  pickOf(id: ChatId): ModelPick | null { return this.get(id)?.pick ?? ai.last; }

  choosePick(id: ChatId, pick: ModelPick): void {
    ai.choose(pick);
    const chat = this.get(id); if (chat) this.put(M.setPick(chat, pick));
  }

  /* A question: the reader's message, then an empty answer under it which the
     stream fills. The chips standing above the composer are written onto the
     reader's message, so what was asked with is what is read back later. */
  async ask(id: ChatId, text: string, chips: readonly Chip[]): Promise<void> {
    const chat = this.get(id); if (!chat || text.trim() === '') return;
    const asked = M.ask(chat, text.trim(), chips);
    const answered = M.answer(asked.chat, asked.id, this.modelOf(id));
    this.put(answered.chat);
    await this.run(id, answered.id);
  }

  /* Edit-and-resend: the reader's words again under the same parent, and a
     fresh answer under those. */
  async resend(id: ChatId, message: MessageId, text: string, chips?: readonly Chip[]): Promise<void> {
    const chat = this.get(id); if (!chat) return;
    const asked = M.resend(chat, message, text.trim(), chips);
    if (asked.id === message) return;
    const answered = M.answer(asked.chat, asked.id, this.modelOf(id));
    this.put(answered.chat);
    await this.run(id, answered.id);
  }

  /* Retry: another answer beside the one that stands, asked with everything
     above it unchanged. */
  async retry(id: ChatId, message: MessageId): Promise<void> {
    const chat = this.get(id); if (!chat) return;
    const again = M.retry(chat, message, this.modelOf(id));
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

  private modelOf(id: ChatId): string { const p = this.pickOf(id); return p ? modelName(p) : ''; }

  /* One answer, written onto one message: stream, run the tool calls it made,
     send their results, and stream again, up to MAX_ROUNDS. Everything that
     can go wrong ends the same way: the words that had arrived stay, and the
     message says why it stopped, with a Retry beside it. */
  private async run(id: ChatId, answer: MessageId): Promise<void> {
    const start = this.get(id); if (!start) return;
    const pick = this.pickOf(id);
    const access = pick ? ai.access(pick) : null;
    if (!pick || !access) { this.put(M.fail(start, answer, 'Choose a model and add its key under Settings → AI first.')); return; }
    if (!start.pick) this.put(M.setPick(start, pick));
    this.abort(id);
    const flight = new AbortController();
    this.flights.set(id, flight);
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const calls = await this.round(id, answer, pick, access, flight.signal);
        if (calls.length === 0) break;
        for (const c of calls) {
          const result = await runTool(liveLibrary, c.name, c.input);
          const chat = this.get(id); if (!chat) return;
          this.put(M.answerCall(chat, answer, c.id, result));
        }
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

  /* One round: the request is built from the chat as it stands, the answer
     message included, so a round after tool calls sends their results. A
     model that refuses tools is asked once more without them and is not
     offered them again this session. */
  private async round(id: ChatId, answer: MessageId, pick: ModelPick, access: Access, signal: AbortSignal): Promise<readonly ToolStep[]> {
    const tag = `${pick.provider}:${pick.model}`;
    const attempt = async (tools: readonly ToolSpec[]): Promise<readonly ToolStep[]> => {
      const chat = this.get(id); if (!chat) return [];
      const at = { ...chat, leaf: answer };
      const request = requestOf(at, [], pick, access, { widgets: ai.inlineHtml, tools, images: await imagesOf(at) });
      const calls: ToolStep[] = [];
      for await (const event of providerOf(pick.provider).stream(request, signal)) {
        const now = this.get(id); if (!now) return [];
        if (event.kind === 'text') { this.put(M.grow(now, answer, event.text), true); continue; }
        const step: ToolStep = { kind: 'tool', id: event.id, name: event.name, input: event.input };
        calls.push(step);
        this.put(M.call(now, answer, step));
      }
      return calls;
    };
    if (this.toolless.has(tag)) return attempt([]);
    try { return await attempt(TOOL_SPECS); } catch (e) {
      if (!(e instanceof Error) || e instanceof TypeError || !rejectsTools(e.message)) throw e;
      this.toolless.add(tag);
      return attempt([]);
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
