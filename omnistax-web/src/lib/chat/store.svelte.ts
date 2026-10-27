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
import { t } from '../i18n';
import { entryOfChat, mergeIndex, parseIndex, unfiled, type ChatEntry, type HighlightAt } from './entries';
import { notes } from '../notes/store.svelte';
import { chatSeen } from './seen.svelte';

/* The index of the chats. The first held a chat's name and dates; the second
   added the one book a chat was filed under, and never shipped; this one
   keeps when the chat last said something, when it last answered and every
   place of the books it is filed at. The second is read only where this one
   has not been written yet, and the first is read beside this one and kept
   written in its own shape for a tab still open on a build that knows only it. */
export const INDEX_KEY = 'omnistax-chats-v3';
const FILED_KEY = 'omnistax-chats-v2';
export const OLD_INDEX_KEY = 'omnistax-chats-v1';
const SAVE_DELAY = 250;

export { parseIndex, type ChatEntry } from './entries';

/* A highlight handed to a chat is filed at the section it marks. */
const highlightAt: HighlightAt = (id) => { const n = notes.get(id); return n ? { book: n.book, section: n.section } : null; };

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
  /* The chats with an answer on its way, for the places that show it. */
  private running = $state.raw<ReadonlySet<string>>(new Set());
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  /* Models that refused tools this session. */
  private toolless = new Set<string>();

  init(): void {
    const read = (key: string): ChatEntry[] => { try { return parseIndex(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return []; } };
    const own = (() => { try { return localStorage.getItem(INDEX_KEY) !== null; } catch { return false; } })();
    this.index = mergeIndex(read(own ? INDEX_KEY : FILED_KEY), read(OLD_INDEX_KEY));
  }

  get(id: ChatId): Chat | null { return this.open[id] ?? null; }
  entry(id: ChatId): ChatEntry | null { return this.index.find((e) => e.id === id) ?? null; }
  nameOf(id: ChatId): string { return this.get(id)?.name || this.entry(id)?.name || t('chat.untitled'); }
  streaming(id: ChatId): boolean { return this.running.has(id); }

  /* A chat the rail has just opened: it is in the index at once, so that a
     link or the picker can name it before a word is said. */
  create(): Chat {
    const chat = M.newChat(newChatId());
    this.put(chat);
    return chat;
  }

  /* A row written before chats were filed, or one an older build touched,
     is filed from its messages, read out of the store once; a chat whose
     record has gone is of no book. */
  private filing = false;
  async file(): Promise<void> {
    if (this.filing) return;
    this.filing = true;
    try {
      for (const e of this.index.filter((x) => x.places === undefined || x.said === undefined)) {
        const chat = this.get(e.id) ?? await getChat(e.id).catch(() => null);
        const row = this.entry(e.id); if (!row) continue;
        const now: ChatEntry = chat ? { ...entryOfChat(chat, highlightAt), ...(row.answered !== undefined ? { answered: row.answered } : {}) } : { ...row, said: row.said ?? row.updated, places: [] };
        this.index = this.index.map((x) => (x.id === e.id ? now : x));
      }
      this.saveIndex();
    } finally { this.filing = false; }
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
    chatSeen.forget(id);
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
    if (!pick || !access) { this.put(M.fail(start, answer, t('chat.error.noModel'))); this.answered(id); return; }
    if (!start.pick) this.put(M.setPick(start, pick));
    this.abort(id);
    const flight = new AbortController();
    this.flights.set(id, flight);
    this.running = new Set([...this.running, id]);
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
      if (this.flights.get(id) === flight) { this.flights.delete(id); this.ran(id); this.answered(id); }
    }
  }

  private ran(id: ChatId): void { if (this.running.has(id)) this.running = new Set([...this.running].filter((x) => x !== id)); }

  /* When the answer ended, finished, stopped or failed, which is what Unread
     is measured against. */
  private answered(id: ChatId): void {
    if (!this.entry(id)) return;
    const at = Date.now();
    this.index = this.index.map((e) => (e.id === id ? { ...e, answered: at } : e));
    this.saveIndex();
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

  private abort(id: ChatId): void { const flight = this.flights.get(id); if (flight) { this.flights.delete(id); this.ran(id); flight.abort(); } }

  /* ── keeping ───────────────────────────────────────────────────────────── */

  /* The chat is right at once and the writing waits, because a stream writes
     on every delta and IndexedDB should not. */
  private put(chat: Chat, defer = false): void {
    this.open = { ...this.open, [chat.id]: chat };
    const had = this.entry(chat.id)?.answered;
    const row = { ...entryOfChat(chat, highlightAt), ...(had !== undefined ? { answered: had } : {}) };
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
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(this.index));
      localStorage.setItem(OLD_INDEX_KEY, JSON.stringify(unfiled(this.index)));
    } catch { /* private mode */ }
  }
}
export const chats = new Chats();
