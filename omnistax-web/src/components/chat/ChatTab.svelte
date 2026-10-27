<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import Composer from './Composer.svelte';
  import Crumbs from './Crumbs.svelte';
  import CopyMenu from './CopyMenu.svelte';
  import Transcript from './Transcript.svelte';
  import TreeView from './TreeView.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { pending, takeChips } from '../../lib/chat/open.svelte';
  import { spokenIn, transcript, type Chat, type MessageId } from '../../lib/chat/model';
  import { replyParent, withLeaf } from '../../lib/chat/tree';
  import { chip, withChip, type Chip } from '../../lib/chat/context';
  import { sectionTextOf } from '../../lib/picker/sources';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { registerFigBlend } from '../../lib/fig/figlib';
  import { label as sectionLabel } from '../../lib/sections/grouping';
  import { secKey, bookId, type ChatId, type SectionRef } from '../../lib/types/ids';

  /* `inline` is the chat standing inside the Conversations page rather than
     filling a tab of its own: it takes the room the page gives it. */
  let { chatId, inline = false }: { chatId: ChatId; inline?: boolean } = $props();

  const chat = $derived<Chat | null>(chats.get(chatId));
  const path = $derived(chat ? transcript(chat) : []);
  const streaming = $derived(chats.streaming(chatId));

  $effect(() => { if (!chats.get(chatId)) void chats.load(chatId); });

  const chipFor = (ref: SectionRef): Chip | null => {
    const entry = registry.entry(ref);
    if (!entry?.built) return null;
    return chip('section', secKey(ref), sectionLabel(ref.section, entry.title), sectionTextOf(ref), true);
  };

  /* The chips the chat opens with. Chips handed to it from outside — a
     discussion's exercise, and its section once fetched — are taken whenever
     they come and stand in place of the pin; otherwise a chat that has said
     nothing yet pins the section focused when it opened. A chat reopened on
     a conversation already held is left as it was asked, with nothing pinned. */
  let chips = $state.raw<readonly Chip[]>([]);
  let handed = false;
  $effect(() => {
    if (!pending.chips[chatId]) return;
    const given = takeChips(chatId) ?? [];
    handed = true;
    chips = untrack(() => given.reduce(withChip, chips));
  });
  let started = false;
  $effect(() => {
    if (started) return;
    started = true;
    const ref = untrack(() => focus.section);
    if (!ref) return;
    void chats.load(chatId).then(async (c) => {
      if (handed || spokenIn(c).length) return;
      await registry.load(ref).catch(() => undefined);
      const pin = handed ? null : chipFor(ref);
      if (pin) chips = withChip(chips, pin);
    });
  });

  /* The books the chat's maths is set under: every book its chips come from, in
     the order they came, then the book being read; one book is named as itself,
     more are blended under the chat's own name, the earliest chip's book keeping
     a macro both define. */
  const mathBooks = $derived.by((): readonly string[] => {
    const out: string[] = [];
    chips.forEach((c) => { const b = c.key.replace(/^[a-z]+:/, '').split(/[/:]/)[0]; if (b && registry.hasBook(bookId(b)) && !out.includes(b)) out.push(b); });
    if (focus.book && !out.includes(focus.book)) out.push(focus.book);
    return out;
  });
  const mathBook = $derived.by((): string | null => {
    if (mathBooks.length <= 1) return mathBooks[0] ?? null;
    const name = `blend:${chatId}`; registerFigBlend(name, mathBooks); return name;
  });
  let composer = $state<{ focus(): void; insert(words: string): void; over(e: DragEvent, wide?: boolean): void; leave(e: DragEvent): void; drop(e: DragEvent, wide?: boolean): void } | null>(null);
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

  /* In the tree the reply goes under the one selected node, or on from the
     leaf when none is: the chat stands on it for the asking, and the new
     branch becomes the leaf. */
  const blocked = $derived(tree && selection.size > 1 ? i18n.t('chat.tab.selectOne') : undefined);
  const send = (text: string): void => {
    const c = chat;
    const [one] = selection;
    if (blocked) return;
    if (tree && one && c) chats.open = { ...chats.open, [chatId]: withLeaf(c, replyParent(c, one)) };
    selection = new Set();
    void chats.ask(chatId, text, chips);
  };
</script>

<!-- the book the maths is rendered under: the one the chips come from, else the one being read, so a book's macros read -->
<!-- what is dropped anywhere on the chat goes to its composer -->
<article class="chat-tab" class:inline data-chat={chatId} data-book={mathBook}
  ondragover={(e) => composer?.over(e, true)} ondragleave={(e) => composer?.leave(e)} ondrop={(e) => composer?.drop(e, true)}>
  <header class="chat-head">
    {#if renaming}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commitName} use:takeFocus aria-label={i18n.t('chat.tab.name')} />
    {:else}
      <button type="button" class="name" title={i18n.t('chat.tab.rename')} onclick={startRename}>{chat?.name || i18n.t('chat.newChat')}</button>
    {/if}
    {#if chat && !tree}
      <button type="button" class="btn ghost sm" disabled={path.length === 0} onclick={foldAll}>{anyOpen ? i18n.t('chat.collapseAll') : i18n.t('chat.expandAll')}</button>
    {/if}
    <CopyMenu {chatId} {chat} />
    <button type="button" class="toggle" class:on={tree} aria-pressed={tree} onclick={() => setTree(!tree)}>{i18n.t('drawer.chat.tree')}</button>
  </header>

  {#if chat}
    {#if tree}
      <div class="tree-host"><TreeView {chat} bind:selection onopen={openInTranscript} /></div>
    {:else}
      <Crumbs {chatId} {chat} />
      <Transcript bind:this={list} {chat} bind:collapsed />
    {/if}
    <Composer bind:this={composer} {chatId} {chips} onchips={(c) => (chips = c)} onsend={send} onstop={() => chats.stop(chatId)}
      {streaming} {blocked} />
  {:else}
    <div class="messages"><p class="empty">{i18n.t('chat.tab.opening')}</p></div>
  {/if}
</article>

<style>
  /* an article of the shell wears the page's padding; a chat keeps its sides and gives up most of the top and the foot */
  .chat-tab{position:absolute;inset:0;display:flex;flex-direction:column;max-width:920px;padding-top:4px;padding-bottom:20px;font-family:var(--sans)}
  .chat-tab.inline{position:relative;inset:auto;flex:1;min-height:0;width:100%;max-width:none;margin:0;padding:0 0 8px}
  .chat-head{flex:none;display:flex;align-items:center;gap:6px;padding:6px 40px 5px;border-bottom:1px solid var(--rule);background:var(--bg)}
  .name{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);text-align:left;background:none;border:0;padding:3px 6px;margin-left:-6px;border-radius:5px;cursor:text;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name:hover{background:var(--soft)}
  .name-input{flex:1;min-width:0;font:inherit;font-size:1.05rem;font-weight:600;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:5px;padding:2px 5px;margin-left:-6px}
  .name-input:focus{outline:none}
  .messages{flex:1;min-height:0;overflow:auto;padding:4px 40px 20px}
  .tree-host{flex:1;min-height:0;border-bottom:1px solid var(--rule)}
  .empty{color:var(--muted);font-size:0.86rem;margin:18px 0}
  @media (max-width:900px){ .chat-head{padding:6px 18px 5px} .messages{padding:4px 18px 20px} }
</style>
