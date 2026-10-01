<script lang="ts">
  /* The path the chat stands on, message by message. In a chat tab each
     message folds to its opening and the last question stays pinned above;
     held compact in a drawing or a note it is read only. */
  import Bubble from './Bubble.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { transcript, type Chat, type MessageId } from '../../lib/chat/model';
  import { dayLabel, lastAsked, opening, startsDay } from '../../lib/chat/tree';
  import { goSpan, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { parseLink } from '../../lib/notes/md/links';
  import { itemKey, noteId as asNoteId, noteItem, type ChatId } from '../../lib/types/ids';
  import { isSpan } from '../../lib/notes/resolve';
  import { chatBooks } from '../../lib/chat/resolve';

  type Ids = ReadonlySet<MessageId>;

  let { chat, compact = false, collapsed = $bindable(new Set()) }: { chat: Chat; compact?: boolean; collapsed?: Ids } = $props();

  const chatId = $derived(chat.id);
  const path = $derived(transcript(chat));
  const asked = $derived(compact ? null : lastAsked(path));
  const now = Date.now();

  let list = $state<HTMLElement | null>(null);
  export const scrollTo = (id: MessageId, block: ScrollLogicalPosition = 'center'): void => {
    list?.querySelector(`[data-message="${id}"]`)?.scrollIntoView({ block, behavior: block === 'start' ? 'smooth' : 'auto' });
  };

  const toggle = (id: MessageId): void => {
    collapsed = new Set(collapsed.has(id) ? [...collapsed].filter((x) => x !== id) : [...collapsed, id]);
  };

  const follow = (target: string): void => {
    const t = parseLink(target.replace(/^(note|section):/, ''));
    if (target.startsWith('note:')) { void openItem(itemKey(noteItem(asNoteId(target.slice(5))))); return; }
    if (t.kind === 'section') { const r = chatBooks.ref(t.section, t.book); if (r) void openDoc(r, 'text'); return; }
    if (t.kind === 'chat') { if (t.message) chats.goTo(t.chat as ChatId, t.message as never); return; }
    const to = chatBooks.target(target);
    if (to) { if (isSpan(to)) goSpan(to); else void openDoc(to, 'text'); return; }
    const r = 'section' in t ? chatBooks.ref(t.section, t.book) : null; if (r) void openDoc(r, 'text');
  };
</script>

<div class="messages" class:compact bind:this={list}>
  {#if asked}
    <button type="button" class="asked" onclick={() => scrollTo(asked.id, 'start')}>
      <span class="you">You</span><span class="words">{opening(asked.text, 200).replace(/\s+/g, ' ')}</span>
    </button>
  {/if}
  {#each path as m, i (m.id)}
    {#if startsDay(path, i)}<div class="day">{dayLabel(m.at, now)}</div>{/if}
    <Bubble {chatId} {chat} message={m} onfollow={follow} readonly={compact}
      collapsed={collapsed.has(m.id)} ontoggle={compact ? undefined : () => toggle(m.id)} />
  {/each}
</div>

<style>
  .messages{flex:1;min-height:0;overflow:auto;padding:0 40px 20px;scroll-padding-top:44px}
  /* a long chat lays out only the messages near the view; the rest keep the height they last had */
  .messages:not(.compact) > :global(.bubble){content-visibility:auto;contain-intrinsic-block-size:auto 160px}
  .asked{position:sticky;top:0;z-index:2;display:flex;align-items:baseline;gap:8px;width:100%;margin:0 0 4px;padding:7px 2px 6px;font:inherit;font-size:0.82rem;text-align:left;color:var(--ink);background:var(--bg);border:0;border-bottom:1px solid var(--rule);cursor:pointer}
  .asked:hover .words{color:var(--accent)}
  .you{flex:none;font-size:0.68rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .words{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .day{margin:14px 0 2px;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);text-align:center}
  .compact{position:absolute;inset:0;padding:0 12px 10px;font-size:0.8rem}
  .compact :global(.bubble){padding:8px 0}
  .compact :global(.answer){font-size:0.82rem;line-height:1.5}
  .compact .day{margin:8px 0 0}
  @media (max-width:900px){ .messages:not(.compact){padding:0 18px 20px} }
</style>
