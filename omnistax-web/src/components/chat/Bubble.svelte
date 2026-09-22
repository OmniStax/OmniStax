<script lang="ts">
  import { tick } from 'svelte';
  import Widget from './Widget.svelte';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import { chatResolver } from '../../lib/chat/resolve';
  import { partsOf } from '../../lib/chat/widget';
  import { CORS_MESSAGE } from '../../lib/chat/providers/index';
  import { dragout } from '../../lib/notes/md/dragout';
  import { FIG } from '../../lib/fig/figlib';
  import type { Chat, Message } from '../../lib/chat/model';
  import { pagerOf } from '../../lib/chat/model';
  import { chats } from '../../lib/chat/store.svelte';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chat, message, onfollow }: { chatId: ChatId; chat: Chat; message: Message; onfollow: (embed: string) => void } = $props();

  const pager = $derived(pagerOf(chat, message.id));
  const mine = $derived(message.role === 'user');
  const parts = $derived(partsOf(message.text, chats.widgetsOn(chatId)));

  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = (markdown: string): string => (render === null ? '' : render(markdown, chatResolver()));

  let editing = $state(false);
  let draft = $state('');
  const startEdit = (): void => { draft = message.text; editing = true; };
  const commit = (): void => { const text = draft.trim(); editing = false; if (text && text !== message.text) void chats.resend(chatId, message.id, text); };
  const onEditKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { editing = false; return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
  };
  const takeFocus = (node: HTMLTextAreaElement) => { node.focus(); node.select(); };

  /* Maths goes through the book's renderer for its macros. */
  const decorate = (el: HTMLElement): void => {
    for (const m of el.querySelectorAll<HTMLElement>('[data-math]')) {
      if (m.dataset.math === 'set') continue;
      m.dataset.math = 'set';
      FIG.renderMath(m);
    }
    for (const pre of el.querySelectorAll<HTMLPreElement>('pre')) {
      if (pre.dataset.copy === '1') continue;
      pre.dataset.copy = '1';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'copy btn ghost sm'; button.textContent = 'Copy';
      button.addEventListener('click', () => {
        void navigator.clipboard?.writeText(pre.querySelector('code')?.textContent ?? '').then(() => {
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = 'Copy'; }, 1200);
        }).catch(() => { button.textContent = 'Copy failed'; });
      });
      pre.appendChild(button);
    }
  };
  let body = $state<HTMLElement | null>(null);
  $effect(() => { const el = body; void message.text; void render; if (el) void tick().then(() => decorate(el)); });

  const onclick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-embed]');
    if (card?.dataset.embed) { onfollow(card.dataset.embed); return; }
    const a = t.closest<HTMLAnchorElement>('a.wiki[data-link]');
    if (a?.dataset.link) { e.preventDefault(); onfollow(a.dataset.link); }
  };
</script>

<div class="bubble" class:mine data-message={message.id} data-role={message.role} data-state={message.state}
  use:dragout={{ kind: 'chat', chat: chatId, message: message.id }}>
  <div class="who">
    <span class="role">{mine ? 'You' : message.model || 'Assistant'}</span>
    {#if pager}
      <span class="pager" data-nodrag>
        <button type="button" class="btn ghost icon sm" aria-label="Previous version" disabled={pager.index === 0} onclick={() => chats.choose(chatId, message.id, pager.index - 1)}>‹</button>
        <span class="count">{pager.index + 1}/{pager.count}</span>
        <button type="button" class="btn ghost icon sm" aria-label="Next version" disabled={pager.index === pager.count - 1} onclick={() => chats.choose(chatId, message.id, pager.index + 1)}>›</button>
      </span>
    {/if}
    <span class="spacer"></span>
    <span class="acts" data-nodrag>
      {#if mine}
        <button type="button" class="btn ghost sm" onclick={startEdit}>Edit</button>
      {:else if message.state !== 'streaming'}
        <button type="button" class="btn ghost sm" onclick={() => void chats.retry(chatId, message.id)}>Retry</button>
      {/if}
    </span>
  </div>

  {#if message.chips.length}
    <ul class="chips">{#each message.chips as c (c.kind + c.key)}<li title={c.text.slice(0, 400)}>{c.label}</li>{/each}</ul>
  {/if}

  {#if editing}
    <textarea class="edit" bind:value={draft} onkeydown={onEditKey} use:takeFocus aria-label="Edit and send again" data-nodrag></textarea>
    <div class="edit-acts" data-nodrag><button type="button" class="btn primary sm" onclick={commit}>Send</button><button type="button" class="btn ghost sm" onclick={() => (editing = false)}>Cancel</button></div>
  {:else if mine}
    <p class="said">{message.text}</p>
  {:else}
    <div class="answer" bind:this={body} {onclick} role="presentation">
      {#each parts as part, i (i)}
        {#if part.kind === 'widget'}
          <Widget html={part.html} open={part.open} />
        {:else}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html html(part.text)}
        {/if}
      {/each}
      {#if message.state === 'streaming' && message.text === ''}<p class="waiting">Thinking…</p>{/if}
    </div>
  {/if}

  {#if message.state === 'stopped'}<p class="note-line">Stopped.</p>{/if}
  {#if message.state === 'failed'}
    <p class="bad" role="alert">{message.error === CORS_MESSAGE ? `The answer did not come: ${CORS_MESSAGE}.` : message.error}</p>
  {/if}
</div>

<style>
  .bubble{padding:12px 0;border-bottom:1px solid var(--rule)}
  .who{display:flex;align-items:center;gap:8px;font-size:0.72rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .spacer{flex:1}
  .role{font-weight:600}
  .pager{display:inline-flex;align-items:center;gap:2px;text-transform:none;letter-spacing:0}
  .count{font-variant-numeric:tabular-nums}
  .acts{display:flex;gap:2px;text-transform:none;letter-spacing:0;opacity:0;transition:opacity 120ms}
  .bubble:hover .acts,.acts:focus-within{opacity:1}
  .said{margin:6px 0 0;white-space:pre-wrap;font-size:0.95rem;line-height:1.55}
  .answer{margin-top:6px;font-size:0.95rem;line-height:1.6}
  .answer :global(pre){position:relative;overflow:auto;padding:10px 12px;background:var(--soft);border-radius:6px}
  .answer :global(pre .copy){position:absolute;top:6px;right:6px}
  .answer :global(a.wiki){color:var(--accent);cursor:pointer}
  .answer :global(.wiki.dead){color:var(--muted);text-decoration:underline dotted}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0;padding:0;list-style:none}
  .chips li{font-size:0.72rem;font-weight:600;color:var(--muted);background:var(--soft);border-radius:999px;padding:2px 9px}
  .edit{width:100%;min-height:5rem;font:inherit;font-size:0.92rem;padding:10px 12px;border:0;border-radius:10px;box-shadow:inset 0 0 0 1px var(--accent);background:var(--panel);color:var(--ink);resize:vertical}
  .edit:focus{outline:none}
  .edit-acts{display:flex;gap:6px;margin-top:6px}
  .waiting,.note-line{color:var(--muted);font-size:0.85rem;margin:6px 0 0}
  .bad{color:var(--bad, #b42318);font-size:0.85rem;margin:6px 0 0}
</style>
