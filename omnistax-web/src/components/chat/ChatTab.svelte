<script lang="ts">
  import { tick } from 'svelte';
  import Composer from './Composer.svelte';
  import Crumbs from './Crumbs.svelte';
  import Transcript from './Transcript.svelte';
  import TreeView from './TreeView.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { pending } from '../../lib/chat/open.svelte';
  import { transcript, type Chat, type MessageId } from '../../lib/chat/model';
  import { replyParent, withLeaf } from '../../lib/chat/tree';
  import { copyChatPlain, copyChatReference } from '../../lib/drawer/chatdrop';
  import { chip, withChip, type Chip } from '../../lib/chat/context';
  import { sectionTextOf } from '../../lib/picker/sources';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label as sectionLabel } from '../../lib/sections/grouping';
  import { secKey, type ChatId, type SectionRef } from '../../lib/types/ids';

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
  let selection = $state.raw<ReadonlySet<MessageId>>(new Set());
  const setTree = (on: boolean): void => {
    tree = on;
    const rest = treeChats().filter((x) => x !== chatId);
    try { localStorage.setItem(TREE_KEY, JSON.stringify(on ? [...rest, chatId] : rest)); } catch { /* private mode */ }
  };
  let list = $state<{ scrollTo(id: MessageId): void } | null>(null);
  const openInTranscript = (id: MessageId): void => {
    chats.goTo(chatId, id);
    setTree(false);
    selection = new Set();
    void tick().then(() => list?.scrollTo(id));
  };

  let collapsed = $state.raw<ReadonlySet<MessageId>>(new Set());
  const anyOpen = $derived(path.some((m) => !collapsed.has(m.id)));
  const foldAll = (): void => { collapsed = anyOpen ? new Set(path.map((m) => m.id)) : new Set(); };

  let copying = $state(false);
  let copied = $state<string | null>(null);
  const copy = (how: () => Promise<boolean>): void => {
    copying = false;
    void how().then((ok) => { copied = ok ? 'Copied' : 'Copy failed'; setTimeout(() => (copied = null), 1200); });
  };
  const onCopyBlur = (e: FocusEvent): void => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) copying = false;
  };
  const onCopyKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); copying = false; } };
  const focusFirst = (node: HTMLElement) => { node.querySelector('button')?.focus(); };

  /* In the tree the reply goes under the one selected node, or on from the
     leaf when none is: the chat stands on it for the asking, and the new
     branch becomes the leaf. */
  const blocked = $derived(tree && selection.size > 1 ? 'Select one message to reply to' : undefined);
  const send = (text: string): void => {
    const c = chat;
    const [one] = selection;
    if (blocked) return;
    if (tree && one && c) chats.open = { ...chats.open, [chatId]: withLeaf(c, replyParent(c, one)) };
    selection = new Set();
    void chats.ask(chatId, text, chips);
  };
</script>

<article class="chat-tab" data-chat={chatId}>
  <header class="chat-head">
    {#if renaming}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commitName} use:takeFocus aria-label="Chat name" />
    {:else}
      <button type="button" class="name" title="Rename" onclick={startRename}>{chat?.name || 'New chat'}</button>
    {/if}
    {#if chat && !tree}
      <button type="button" class="btn ghost sm" disabled={path.length === 0} onclick={foldAll}>{anyOpen ? 'Collapse all' : 'Expand all'}</button>
    {/if}
    {#if copying}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <span class="split" role="group" aria-label="Copy" onfocusout={onCopyBlur} onkeydown={onCopyKey} use:focusFirst>
        <button type="button" class="btn ghost sm" onclick={() => copy(() => copyChatReference(chatId))}>Copy reference</button>
        <button type="button" class="btn ghost sm" onclick={() => { const c = chat; if (c) copy(() => copyChatPlain(c)); }}>Copy plain</button>
      </span>
    {:else}
      <button type="button" class="btn ghost sm" disabled={!chat} onclick={() => (copying = true)}>{copied ?? 'Copy'}</button>
    {/if}
    <button type="button" class="toggle" class:on={tree} aria-pressed={tree} onclick={() => setTree(!tree)}>Tree</button>
  </header>

  {#if chat}
    {#if tree}
      <div class="tree-host"><TreeView {chat} bind:selection onopen={openInTranscript} /></div>
    {:else}
      <Crumbs {chatId} {chat} />
      <Transcript bind:this={list} {chat} bind:collapsed />
    {/if}
    <Composer bind:this={composer} {chatId} {chips} onchips={(c) => (chips = c)} onsend={send} onstop={() => chats.stop(chatId)}
      {streaming} {offer} onoffer={takeOffer} {blocked} />
  {:else}
    <div class="messages"><p class="empty">Opening this chat…</p></div>
  {/if}
</article>

<style>
  .chat-tab{position:absolute;inset:0;display:flex;flex-direction:column;max-width:920px;padding-bottom:64px;font-family:var(--sans)}
  .split{display:inline-flex;gap:2px}
  .chat-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 40px 8px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .name{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .messages{flex:1;min-height:0;overflow:auto;padding:4px 40px 20px}
  .tree-host{flex:1;min-height:0;border-bottom:1px solid var(--rule)}
  .empty{color:var(--muted);font-size:0.86rem;margin:18px 0}
  @media (max-width:900px){ .chat-head{padding:10px 18px 8px} .messages{padding:4px 18px 20px} }
</style>
