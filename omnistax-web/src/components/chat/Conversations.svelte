<script lang="ts">
  /* The conversations page: every chat, filed by the book it belongs to, and
     one chat at a time opened in the page itself, under a way back to the
     list. A Ctrl or middle click opens the chat as a tab of its own beside. */
  import { onDestroy } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { chats, type ChatEntry } from '../../lib/chat/store.svelte';
  import { chatTabKey } from '../../lib/chat/open.svelte';
  import { chatPages } from '../../lib/chat/pages.svelte';
  import { byBook, NO_BOOK } from '../../lib/chat/entries';
  import { ageOf } from '../../lib/chat/tree';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { closeItem } from '../../lib/layout/model';
  import { openFromView, openingOf, onMiddle } from '../../lib/sections/nav.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import BackLink from '../ui/BackLink.svelte';
  import ChatTab from './ChatTab.svelte';
  import type { ChatId } from '../../lib/types/ids';

  let { item }: { item: string } = $props();

  const UNDO_FOR = 6000;

  /* The chat this page stands on, while it is still one the reader holds. */
  const shown = $derived.by((): ChatId | null => { const id = chatPages.of(item); return id && chats.entry(id) ? id : null; });

  let filter = $state('');
  let shelf = $state<string | null>(null);
  let now = $state(Date.now());
  const tick = setInterval(() => { now = Date.now(); }, 30_000);
  /* rows written before chats were filed are filed from their chips once the page is up */
  $effect(() => { void chats.fileBooks(); });

  /* A deleted chat leaves the list at once and the store only when the Undo
     has gone, so taking it back needs nothing restored. */
  let gone = $state<{ id: ChatId; name: string } | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settle = (): void => { clearTimeout(timer); if (gone) chats.remove(gone.id); gone = null; };
  const remove = (e: ChatEntry): void => {
    settle();
    layoutStore.apply((l) => closeItem(l, chatTabKey(e.id)));
    gone = { id: e.id, name: e.name || i18n.t('chat.newChat') };
    timer = setTimeout(settle, UNDO_FOR);
  };
  const undo = (): void => { clearTimeout(timer); gone = null; };
  onDestroy(() => { clearInterval(tick); settle(); });

  const named = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    return chats.index.filter((e) => e.id !== gone?.id && (q === '' || (e.name || i18n.t('chat.newChat')).toLowerCase().includes(q)));
  });
  /* The books the chats are filed under, the one talked about last first; the
     row of them shows only once there is more than one to choose between. */
  const shelves = $derived(byBook(named));
  const allShelves = $derived(byBook(chats.index.filter((e) => e.id !== gone?.id)));
  const shownShelves = $derived(shelf === null ? shelves : shelves.filter((s) => s.book === shelf));
  const titleOf = (book: string): string => (book === NO_BOOK ? i18n.t('chat.conversations.noBook') : books.title(book));

  /* A row opens its chat here; asked for beside, it opens as a tab of its own. */
  const open = (id: ChatId, e?: MouseEvent): void => {
    if (e && openingOf(e) === 'new') { void openFromView(chatTabKey(id), 'new'); return; }
    chatPages.show(item, id);
  };
  const fresh = (e: MouseEvent): void => {
    const chat = chats.create(focus.book);
    if (openingOf(e) === 'new') { void openFromView(chatTabKey(chat.id), 'new'); return; }
    chatPages.show(item, chat.id);
  };

  let renaming = $state<ChatId | null>(null);
  let draft = $state('');
  const startRename = (e: ChatEntry): void => { draft = e.name; renaming = e.id; };
  const commit = async (): Promise<void> => {
    const id = renaming; renaming = null;
    if (!id || !draft.trim()) return;
    await chats.load(id);
    chats.rename(id, draft);
  };
  const onNameKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.stopPropagation();
    if (e.key === 'Enter') void commit(); else renaming = null;
  };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };
</script>

{#if shown}
  <section class="conversations reading" aria-label={i18n.t('chat.conversations.label')}>
    <div class="back-row"><BackLink label={i18n.t('chat.conversations.label')} onclick={() => chatPages.back(item)} /></div>
    {#key shown}<ChatTab chatId={shown} inline />{/key}
  </section>
{:else}
<section class="conversations" aria-label={i18n.t('chat.conversations.label')}>
  <div class="bar">
    <input class="filter" type="search" placeholder={i18n.t('chat.conversations.filter')} bind:value={filter} aria-label={i18n.t('chat.conversations.filterLabel')} />
    <button type="button" class="btn sm" onclick={fresh} onauxclick={onMiddle(fresh)}>{i18n.t('chat.newChat')}</button>
  </div>

  {#if allShelves.length > 1}
    <div class="shelves" role="group" aria-label={i18n.t('chat.conversations.byBook')}>
      <button type="button" class="shelf" aria-pressed={shelf === null} onclick={() => (shelf = null)}>{i18n.t('chat.conversations.allBooks')}</button>
      {#each allShelves as s (s.book)}
        <button type="button" class="shelf" aria-pressed={shelf === s.book} onclick={() => (shelf = shelf === s.book ? null : s.book)}>{titleOf(s.book)} <span class="n">{s.entries.length}</span></button>
      {/each}
    </div>
  {/if}

  {#if gone}
    <div class="undo" role="status">{i18n.t('chat.conversations.deleted', { name: gone.name })} <button type="button" class="btn ghost sm" onclick={undo}>{i18n.t('chat.conversations.undo')}</button></div>
  {/if}

  {#if shownShelves.length === 0}
    <p class="empty">{filter.trim() || shelf !== null ? i18n.t('chat.conversations.noMatch') : i18n.t('chat.conversations.none')}</p>
  {:else}
    {#each shownShelves as s (s.book)}
      {#if allShelves.length > 1}<h3 class="book">{titleOf(s.book)}</h3>{/if}
      <ul>
        {#each s.entries as e (e.id)}
          <li class="row" data-chat={e.id}>
            {#if renaming === e.id}
              <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={() => void commit()} use:takeFocus aria-label={i18n.t('chat.tab.name')} />
            {:else}
              <button type="button" class="open" onclick={(ev) => open(e.id, ev)} onauxclick={onMiddle((ev) => open(e.id, ev))} ondblclick={() => startRename(e)}>
                <span class="name">{e.name || i18n.t('chat.newChat')}</span>
                <span class="age">{void i18n.locale, ageOf(e.updated, now)}</span>
              </button>
            {/if}
            <span class="acts">
              <button type="button" class="btn ghost sm" onclick={() => startRename(e)}>{i18n.t('chat.tab.rename')}</button>
              <button type="button" class="btn ghost sm" onclick={() => remove(e)}>{i18n.t('chat.conversations.delete')}</button>
            </span>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>
{/if}

<style>
  .conversations{font-family:var(--sans)}
  /* A chat open in the page takes the whole of it, as a chat tab takes its
     pane: the page loses its column and its foot, and the chat's transcript
     scrolls between its head and its composer. */
  :global(.view-pane:has(> .view > .conversations.reading)){max-width:920px;height:100%;padding:10px 0 0;display:flex;flex-direction:column}
  :global(.view-pane:has(> .view > .conversations.reading) > .view){flex:1;min-height:0;display:flex;flex-direction:column}
  .reading{flex:1;min-height:0;display:flex;flex-direction:column}
  .back-row{flex:none;padding:0 36px}
  .bar{display:flex;gap:6px;margin-bottom:8px}
  .filter{flex:1;min-width:0;font:inherit;font-size:0.86rem;padding:5px 9px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink)}
  .filter:focus{outline:none;border-color:var(--accent)}
  .shelves{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}
  .shelf{font:inherit;font-size:0.76rem;font-weight:600;color:var(--muted);background:var(--soft);border:0;border-radius:999px;padding:3px 10px;cursor:pointer;max-width:16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .shelf:hover{color:var(--ink)}
  .shelf[aria-pressed="true"]{color:var(--bg);background:var(--ink)}
  .shelf .n{font-weight:500;opacity:0.7;font-variant-numeric:tabular-nums}
  .book{margin:14px 0 4px;padding:0 8px;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .book:first-of-type{margin-top:4px}
  .undo{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:4px 8px;font-size:0.8rem;color:var(--muted);background:var(--soft);border-radius:7px}
  ul{list-style:none;margin:0;padding:0}
  .row{display:flex;align-items:center;gap:4px;border-radius:6px}
  .row:hover{background:var(--soft)}
  .open{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px;font:inherit;font-size:0.88rem;color:var(--ink);text-align:left;background:none;border:0;padding:5px 8px;cursor:pointer}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .age{flex:none;font-size:0.74rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .name-input{flex:1;min-width:0;font:inherit;font-size:0.88rem;padding:4px 7px;border:1px solid var(--accent);border-radius:6px;background:var(--panel);color:var(--ink)}
  .name-input:focus{outline:none}
  .acts{display:flex;gap:2px;opacity:0;transition:opacity 120ms}
  .row:hover .acts,.acts:focus-within{opacity:1}
  @media (hover: none){ .acts{opacity:.7} }
  .empty{color:var(--muted);font-size:0.86rem}
  @media (max-width:900px){ .back-row{padding:0 14px} }
</style>
