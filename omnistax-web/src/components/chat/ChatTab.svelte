<script lang="ts">
  /* One chat in a tab of its own. Across the top: the chat's name, which a
     click renames, the branches toggle, and the fork trail. Below it the
     transcript — the path from the root to the leaf — and at the foot the
     composer with the chips the model will be shown.

     When a chat opens, the section being read is pinned as the first chip; the
     reader may take it away, and moving to another section offers a chip for
     that one rather than swapping it behind their back. */
  import { tick } from 'svelte';
  import Bubble from './Bubble.svelte';
  import Composer from './Composer.svelte';
  import Crumbs from './Crumbs.svelte';
  import Leaves from './Leaves.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { pending } from '../../lib/chat/open.svelte';
  import { transcript, type Chat } from '../../lib/chat/model';
  import { chip, withChip, type Chip } from '../../lib/chat/context';
  import { sectionTextOf } from '../../lib/picker/sources';
  import { focus } from '../../lib/sections/focus.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label as sectionLabel } from '../../lib/sections/grouping';
  import { goSpan, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { parseLink } from '../../lib/notes/md/links';
  import { conceptId, itemKey, noteId as asNoteId, noteItem, qualifiedId, sectionId, spanId, type ChatId } from '../../lib/types/ids';
  import { spansOf } from '../../lib/sections/concepts.svelte';
  import { chatResolver } from '../../lib/chat/resolve';

  let { chatId }: { chatId: ChatId } = $props();

  const chat = $derived<Chat | null>(chats.get(chatId));
  const path = $derived(chat ? transcript(chat) : []);
  const streaming = $derived(chats.streaming(chatId));

  /* The record is read once per tab; a chat already open in another tab is the
     same value, so the two tabs are one conversation. */
  $effect(() => { if (!chats.get(chatId)) void chats.load(chatId); });

  /* ── the chips ─────────────────────────────────────────────────────────── */

  const chipFor = (id: string): Chip | null => {
    const entry = registry.entry(sectionId(id));
    if (!entry?.built) return null;
    return chip('section', id, sectionLabel(id, entry.title), sectionTextOf(sectionId(id)), true);
  };

  let chips = $state.raw<readonly Chip[]>([]);
  /* Which section the pinned chip stands for, so that moving away is noticed
     once and not on every scroll. */
  let pinnedSection = $state<string | null>(null);
  let started = false;
  $effect(() => {
    if (started) return;
    started = true;
    const id = focus.section;
    /* The text is in the section's own document, which may still be loading;
       the chip is put up either way and filled in when it lands. */
    void registry.load(sectionId(id)).catch(() => {}).then(() => {
      const c = chipFor(id);
      if (c) { chips = withChip(chips, c); pinnedSection = id; }
    });
  });

  /* Moving to another section is offered, never taken. */
  const offer = $derived.by((): Chip | null => {
    const here = focus.section;
    if (here === pinnedSection || chips.some((c) => c.kind === 'section' && c.key === here)) return null;
    return chipFor(here);
  });
  const takeOffer = (): void => { const c = offer; if (!c) return; chips = withChip(chips, c); pinnedSection = c.key; };

  /* ── the words waiting from the highlight bar ──────────────────────────── */

  let composer = $state<{ focus(): void; insert(words: string): void } | null>(null);
  $effect(() => {
    const words = pending.words[chatId];
    if (!words || !composer) return;
    const c = composer;
    void tick().then(() => c.insert(pending.take(chatId)));
  });

  /* ── the name ──────────────────────────────────────────────────────────── */

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

  let branches = $state(false);

  /* ── following a link out of an answer ─────────────────────────────────── */

  const follow = (target: string): void => {
    const t = parseLink(target.replace(/^note:/, ''));
    if (target.startsWith('note:')) { void openItem(itemKey(noteItem(asNoteId(target.slice(5))))); return; }
    if (t.kind === 'section') { void openDoc(sectionId(t.section), 'text'); return; }
    if (t.kind === 'figure') { goSpan(qualifiedId(sectionId(t.section), t.id)); return; }
    if (t.kind === 'chat') { if (t.message) chats.goTo(t.chat as ChatId, t.message as never); return; }
    if (t.kind === 'equation') { const e = chatResolver().equation(t.section, t.id); if (e?.anchor) { goSpan(spanId(e.anchor)); return; } }
    if (t.kind === 'symbol') { const v = chatResolver().symbol(t.section, t.sym); if (v?.anchor) { goSpan(spanId(v.anchor)); return; } }
    if (t.kind === 'concept') { const intro = spansOf(conceptId(t.id)).intro[0]; if (intro) { goSpan(intro); return; } }
    if ('section' in t) void openDoc(sectionId(t.section), 'text');
  };

  const send = (text: string): void => { void chats.ask(chatId, text, chips); };
</script>

<article class="chat-tab" data-chat={chatId}>
  <header class="chat-head">
    {#if renaming}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={commitName} use:takeFocus aria-label="Chat name" />
    {:else}
      <button type="button" class="name" title="Rename this chat" onclick={startRename}>{chat?.name || 'New chat'}</button>
    {/if}
    <span class="model">{ai.model || 'no model chosen'}</span>
    <button type="button" class="toggle" class:on={branches} onclick={() => (branches = !branches)} title="The branches of this chat">Branches</button>
  </header>

  {#if chat}
    {#if branches}<Leaves {chatId} {chat} />{/if}
    <Crumbs {chatId} {chat} />
    <div class="messages">
      {#if path.length === 0}
        <p class="empty">Ask about what you are reading. The model is shown only what stands as a chip below.</p>
      {/if}
      {#each path as m (m.id)}
        <Bubble {chatId} {chat} message={m} onfollow={follow} />
      {/each}
    </div>
    <Composer bind:this={composer} {chips} onchips={(c) => (chips = c)} onsend={send} onstop={() => chats.stop(chatId)}
      {streaming} widgets={chats.widgetsOn(chatId)} onwidgets={() => chats.toggleWidgets(chatId)}
      {offer} onoffer={takeOffer} ready={ai.ready} />
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
  .model{flex:none;font-size:0.72rem;color:var(--muted)}
  .toggle{flex:none;font:inherit;font-size:0.78rem;color:var(--muted);background:var(--soft);border:1px solid var(--rule);border-radius:5px;padding:3px 10px;cursor:pointer}
  .toggle.on{color:var(--ink);border-color:var(--accent)}
  .messages{flex:1;min-height:0;overflow:auto;padding:4px 40px 20px}
  .empty{color:var(--muted);font-size:0.9rem;margin:18px 0}
  @media (max-width:900px){ .chat-head{padding:10px 18px 8px} .messages{padding:4px 18px 20px} }
</style>
