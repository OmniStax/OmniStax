<script lang="ts">
  import { tick } from 'svelte';
  import Bubble from './Bubble.svelte';
  import Composer from './Composer.svelte';
  import Crumbs from './Crumbs.svelte';
  import TreeView from './TreeView.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { pending } from '../../lib/chat/open.svelte';
  import { transcript, type Chat, type MessageId } from '../../lib/chat/model';
  import { dayLabel, replyParent, startsDay, withLeaf } from '../../lib/chat/tree';
  import { chip, withChip, type Chip } from '../../lib/chat/context';
  import { sectionTextOf } from '../../lib/picker/sources';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label as sectionLabel } from '../../lib/sections/grouping';
  import { goSpan, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { parseLink } from '../../lib/notes/md/links';
  import { itemKey, noteId as asNoteId, noteItem, parseSecKey, secKey, type ChatId, type SectionRef } from '../../lib/types/ids';
  import { isSpan } from '../../lib/notes/resolve';
  import { chatBooks } from '../../lib/chat/resolve';

  let { chatId }: { chatId: ChatId } = $props();

  const chat = $derived<Chat | null>(chats.get(chatId));
  const path = $derived(chat ? transcript(chat) : []);
  const streaming = $derived(chats.streaming(chatId));

  $effect(() => { if (!chats.get(chatId)) void chats.load(chatId); });

  const chipFor = (ref: SectionRef): Chip | null => {
    const entry = registry.entry(ref);
    if (!entry?.built) return null;
    return chip('section', secKey(ref), sectionLabel(ref.section, entry.title), sectionTextOf(ref), true);
  };

  let chips = $state.raw<readonly Chip[]>([]);
  let pinnedSection = $state<string | null>(null);
  let started = false;
  $effect(() => {
    if (started) return;
    started = true;
    const ref = focus.section;
    if (ref) void registry.load(ref).then(() => {
      const c = chipFor(ref);
      if (c) { chips = withChip(chips, c); pinnedSection = c.key; }
    });
  });

  const offer = $derived.by((): Chip | null => {
    const here = focus.section; if (!here) return null; const key = secKey(here);
    if (key === pinnedSection || chips.some((c) => c.kind === 'section' && c.key === key)) return null;
    return chipFor(here);
  });
  const takeOffer = (): void => { const c = offer; if (!c) return; chips = withChip(chips, c); pinnedSection = c.key; };

  let composer = $state<{ focus(): void; insert(words: string): void } | null>(null);
  $effect(() => {
    const words = pending.words[chatId];
    if (!words || !composer) return;
    const c = composer;
    void tick().then(() => c.insert(pending.take(chatId)));
  });

  let renaming = $state(false);
  let draft = $state('');
  const startRename = (): void => { draft = chat?.name ?? ''; renaming = true; };
  const commitName = (): void => { if (draft.trim()) chats.rename(chatId, draft); renaming = false; };
  const onNameKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.stopPropagation();
    if (e.key === 'Enter') commitName(); else renaming = false;
  };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };

  const TREE_KEY = 'omnistax-chat-tree-v1';
  const treeChats = (): readonly string[] => { try { const v: unknown = JSON.parse(localStorage.getItem(TREE_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };
  let tree = $state(treeChats().includes(chatId));
  let selected = $state<MessageId | undefined>(undefined);
  const setTree = (on: boolean): void => {
    tree = on;
    const rest = treeChats().filter((x) => x !== chatId);
    try { localStorage.setItem(TREE_KEY, JSON.stringify(on ? [...rest, chatId] : rest)); } catch { /* private mode */ }
  };
  let list = $state<HTMLElement | null>(null);
  const openInTranscript = (id: MessageId): void => {
    chats.goTo(chatId, id);
    setTree(false);
    selected = undefined;
    void tick().then(() => list?.querySelector(`[data-message="${id}"]`)?.scrollIntoView({ block: 'center' }));
  };
  const now = Date.now();

  const follow = (target: string): void => {
    const t = parseLink(target.replace(/^(note|section):/, ''));
    if (target.startsWith('note:')) { void openItem(itemKey(noteItem(asNoteId(target.slice(5))))); return; }
    if (t.kind === 'section') { const r = chatBooks.ref(t.section, t.book); if (r) void openDoc(r, 'text'); return; }
    if (t.kind === 'chat') { if (t.message) chats.goTo(t.chat as ChatId, t.message as never); return; }
    const to = chatBooks.target(target);
    if (to) { if (isSpan(to)) goSpan(to); else void openDoc(to, 'text'); return; }
    const r = 'section' in t ? chatBooks.ref(t.section, t.book) : null; if (r) void openDoc(r, 'text');
  };

  /* In the tree the reply goes under the selected node: the chat stands on it
     for the asking, and the new branch becomes the leaf. */
  const send = (text: string): void => {
    const c = chat;
    if (tree && selected && c) chats.open = { ...chats.open, [chatId]: withLeaf(c, replyParent(c, selected)) };
    selected = undefined;
    void chats.ask(chatId, text, chips);
  };
</script>

<article class="chat-tab" data-chat={chatId}>
  <header class="chat-head">
    {#if renaming}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commitName} use:takeFocus aria-label="Chat name" />
    {:else}
      <button type="button" class="name" title="Rename this chat" onclick={startRename}>{chat?.name || 'New chat'}</button>
    {/if}
    <button type="button" class="toggle" class:on={tree} aria-pressed={tree} onclick={() => setTree(!tree)}>Tree</button>
  </header>

  {#if chat}
    {#if tree}
      <div class="tree-host"><TreeView {chat} bind:selected onopen={openInTranscript} /></div>
    {:else}
      <Crumbs {chatId} {chat} />
      <div class="messages" bind:this={list}>
        {#each path as m, i (m.id)}
          {#if startsDay(path, i)}<div class="day">{dayLabel(m.at, now)}</div>{/if}
          <Bubble {chatId} {chat} message={m} onfollow={follow} />
        {/each}
      </div>
    {/if}
    <Composer bind:this={composer} {chatId} {chips} onchips={(c) => (chips = c)} onsend={send} onstop={() => chats.stop(chatId)}
      {streaming} {offer} onoffer={takeOffer} />
  {:else}
    <div class="messages"><p class="empty">Opening this chat…</p></div>
  {/if}
</article>

<style>
  .chat-tab{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans)}
  .chat-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 40px 8px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .name{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .messages{flex:1;min-height:0;overflow:auto;padding:4px 40px 20px}
  .tree-host{flex:1;min-height:0;border-bottom:1px solid var(--rule)}
  .day{margin:14px 0 2px;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);text-align:center}
  .empty{color:var(--muted);font-size:0.86rem;margin:18px 0}
  @media (max-width:900px){ .chat-head{padding:10px 18px 8px} .messages{padding:4px 18px 20px} }
</style>
