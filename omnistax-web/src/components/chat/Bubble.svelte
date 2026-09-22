<script lang="ts">
  /* One message of the transcript. What the reader wrote is shown as they
     wrote it, with the chips it was asked with standing above it; what the
     model answered is markdown, rendered the way a note is rendered, so the
     maths is set and a link into the book is a link. A block tagged `widget`
     becomes the page it holds, in a sandbox, when the chat has widgets on.

     Every message that has siblings wears a pager, because the reader has been
     here more than once; a reader message can be edited and sent again, and an
     answer can be asked for again, and both of those make a sibling rather than
     writing over what stands. The bubble drags out as a card. */
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

  /* The renderer is the note's own, fetched the first time anything is read
     with it; until it lands the answer stands as its own words, which is what
     a stream shows anyway. */
  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = (markdown: string): string => (render === null ? '' : render(markdown, chatResolver()));

  /* ── editing and resending ─────────────────────────────────────────────── */

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

  /* ── what the rendered answer still needs ──────────────────────────────── */

  /* The book writes its symbols with macros of its own, so anything carrying
     `$…$` is set by the book's renderer, as it is in a note. A fenced block
     gets the one button a reader wants on code. */
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
      button.type = 'button'; button.className = 'copy'; button.textContent = 'Copy';
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
        <button type="button" title="The one before this" aria-label="Previous version" disabled={pager.index === 0} onclick={() => chats.choose(chatId, message.id, pager.index - 1)}>‹</button>
        <span class="count">{pager.index + 1} of {pager.count}</span>
        <button type="button" title="The one after this" aria-label="Next version" disabled={pager.index === pager.count - 1} onclick={() => chats.choose(chatId, message.id, pager.index + 1)}>›</button>
      </span>
    {/if}
    <span class="spacer"></span>
    <span class="acts" data-nodrag>
      {#if mine}
        <button type="button" onclick={startEdit}>Edit</button>
      {:else if message.state !== 'streaming'}
        <button type="button" onclick={() => void chats.retry(chatId, message.id)}>Retry</button>
      {/if}
    </span>
  </div>

  {#if message.chips.length}
    <ul class="chips">{#each message.chips as c (c.kind + c.key)}<li title={c.text.slice(0, 400)}>{c.label}</li>{/each}</ul>
  {/if}

  {#if editing}
    <textarea class="edit" bind:value={draft} onkeydown={onEditKey} use:takeFocus aria-label="Edit and send again" data-nodrag></textarea>
    <div class="edit-acts" data-nodrag><button type="button" onclick={commit}>Send again</button><button type="button" class="plain" onclick={() => (editing = false)}>Cancel</button></div>
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
  .pager button,.acts button{font:inherit;font-size:0.72rem;background:transparent;border:1px solid transparent;border-radius:4px;color:var(--muted);cursor:pointer;padding:1px 5px}
  .pager button:hover:not(:disabled),.acts button:hover{color:var(--ink);background:var(--soft)}
  .pager button:disabled{opacity:0.35;cursor:default}
  .said{margin:6px 0 0;white-space:pre-wrap;font-size:0.95rem;line-height:1.55}
  .answer{margin-top:6px;font-size:0.95rem;line-height:1.6}
  .answer :global(pre){position:relative;overflow:auto;padding:10px 12px;background:var(--soft);border-radius:6px}
  .answer :global(pre .copy){position:absolute;top:6px;right:6px;font:inherit;font-size:0.72rem;padding:2px 7px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--muted);cursor:pointer}
  .answer :global(a.wiki){color:var(--accent);cursor:pointer}
  .answer :global(.wiki.dead){color:var(--muted);text-decoration:underline dotted}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0;padding:0;list-style:none}
  .chips li{font-size:0.72rem;color:var(--muted);background:var(--soft);border-radius:999px;padding:1px 8px}
  .edit{width:100%;min-height:5rem;font:inherit;font-size:0.95rem;padding:8px 10px;border:1px solid var(--accent);border-radius:6px;background:var(--panel);color:var(--ink);resize:vertical}
  .edit-acts{display:flex;gap:6px;margin-top:6px}
  .edit-acts button{font:inherit;font-size:0.8rem;padding:3px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--soft);color:var(--ink);cursor:pointer}
  .edit-acts .plain{background:transparent;color:var(--muted)}
  .waiting,.note-line{color:var(--muted);font-size:0.85rem;margin:6px 0 0}
  .bad{color:var(--bad, #b42318);font-size:0.85rem;margin:6px 0 0}
</style>
