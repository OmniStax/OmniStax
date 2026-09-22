<script lang="ts">
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

  $effect(() => { if (!chats.get(chatId)) void chats.load(chatId); });

  const chipFor = (id: string): Chip | null => {
    const entry = registry.entry(sectionId(id));
    if (!entry?.built) return null;
    return chip('section', id, sectionLabel(id, entry.title), sectionTextOf(sectionId(id)), true);
  };

  let chips = $state.raw<readonly Chip[]>([]);
  let pinnedSection = $state<string | null>(null);
  let started = false;
  $effect(() => {
    if (started) return;
    started = true;
    const id = focus.section;
    void registry.load(sectionId(id)).catch(() => {}).then(() => {
      const c = chipFor(id);
      if (c) { chips = withChip(chips, c); pinnedSection = id; }
    });
  });

  const offer = $derived.by((): Chip | null => {
    const here = focus.section;
    if (here === pinnedSection || chips.some((c) => c.kind === 'section' && c.key === here)) return null;
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

  let branches = $state(false);

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
    <button type="button" class="toggle" class:on={branches} aria-pressed={branches} onclick={() => (branches = !branches)}>Branches</button>
  </header>

  {#if chat}
    {#if branches}<Leaves {chatId} {chat} />{/if}
    <Crumbs {chatId} {chat} />
    <div class="messages">
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
  .messages{flex:1;min-height:0;overflow:auto;padding:4px 40px 20px}
  .empty{color:var(--muted);font-size:0.86rem;margin:18px 0}
  @media (max-width:900px){ .chat-head{padding:10px 18px 8px} .messages{padding:4px 18px 20px} }
</style>
