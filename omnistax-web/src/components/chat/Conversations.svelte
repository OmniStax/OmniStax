<script lang="ts">
  /* The conversations page: every chat, newest message first, or filed by the
     places of the books the reader handed it, and one chat at a time opened in
     the page itself, under a way back to the list. A Ctrl or middle click
     opens the chat as a tab of its own beside. */
  import { onDestroy } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { chats, type ChatEntry } from '../../lib/chat/store.svelte';
  import { chatTabKey } from '../../lib/chat/open.svelte';
  import { chatPages } from '../../lib/chat/pages.svelte';
  import { chatSeen } from '../../lib/chat/seen.svelte';
  import { filed, lastSaid, recent, NO_BOOK } from '../../lib/chat/entries';
  import { ageOf } from '../../lib/chat/tree';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { closeItem } from '../../lib/layout/model';
  import { openFromView, openingOf, onMiddle } from '../../lib/sections/nav.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label as chapterLabel } from '../../lib/sections/grouping';
  import { bookPagesOf, pageLabel, pagesOf } from '../../lib/content/roles';
  import { books } from '../../lib/practice/books.svelte';
  import BackLink from '../ui/BackLink.svelte';
  import ChatTab from './ChatTab.svelte';
  import { bookId, type ChatId } from '../../lib/types/ids';

  let { item }: { item: string } = $props();

  const UNDO_FOR = 6000;

  /* The chat this page stands on, while it is still one the reader holds. */
  const shown = $derived.by((): ChatId | null => { const id = chatPages.of(item); return id && chats.entry(id) ? id : null; });

  let filter = $state('');
  let now = $state(Date.now());
  const tick = setInterval(() => { now = Date.now(); }, 30_000);
  /* rows written before chats were filed are filed from their messages once the page is up */
  $effect(() => { void chats.file(); });

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
  const byBook = $derived(chatPages.byBook);
  const list = $derived(recent(named));

  /* Filed, the chapters and sections go in the order of the book, which its
     manifest gives once fetched, and are named by it. */
  const orderOf = (b: string): readonly string[] | null =>
    registry.hasBook(bookId(b)) ? registry.manifest(bookId(b)).chapters.flatMap((c) => [c.id, ...pagesOf(c).map((s) => s.id)]) : null;
  const shelves = $derived(byBook ? filed(named, orderOf) : []);
  $effect(() => { for (const s of shelves) if (s.book !== NO_BOOK && !registry.hasBook(bookId(s.book))) void registry.ensureBook(bookId(s.book)).catch(() => null); });
  const titleOf = (book: string): string => (book === NO_BOOK ? i18n.t('chat.conversations.noBook') : books.title(book));
  const chapterOf = (book: string, ch: string): string => {
    const c = registry.hasBook(bookId(book)) ? registry.manifest(bookId(book)).chapters.find((x) => x.id === ch) : undefined;
    return chapterLabel(ch, c?.title ?? '');
  };
  const sectionOf = (book: string, sec: string): string => {
    const e = registry.hasBook(bookId(book)) ? bookPagesOf(registry.manifest(bookId(book))).find((s) => s.id === sec) : undefined;
    return e ? pageLabel(e) : sec;
  };

  /* A place folded away for now, by its book and its id. */
  let folded = $state.raw<ReadonlySet<string>>(new Set());
  const fold = (k: string): void => { const next = new Set(folded); if (!next.delete(k)) next.add(k); folded = next; };

  /* A row opens its chat here; asked for beside, it opens as a tab of its own. */
  const open = (id: ChatId, e?: MouseEvent): void => {
    if (e && openingOf(e) === 'new') { void openFromView(chatTabKey(id), 'new'); return; }
    chatPages.show(item, id);
  };
  const fresh = (e: MouseEvent): void => {
    const chat = chats.create();
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

{#snippet row(e: ChatEntry)}
  <li class="row" data-chat={e.id}>
    {#if renaming === e.id}
      <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={() => void commit()} use:takeFocus aria-label={i18n.t('chat.tab.name')} />
    {:else}
      <button type="button" class="open" onclick={(ev) => open(e.id, ev)} onauxclick={onMiddle((ev) => open(e.id, ev))} ondblclick={() => startRename(e)}>
        <span class="name">{e.name || i18n.t('chat.newChat')}</span>
        {#if chats.streaming(e.id)}
          <span class="brow running" role="img" aria-label={i18n.t('chat.conversations.answering')}><i></i><i></i><i></i></span>
        {:else if chatSeen.unread(e)}
          <span class="brow unread">{i18n.t('chat.conversations.unread')}</span>
        {/if}
        <span class="age">{void i18n.locale, ageOf(lastSaid(e), now)}</span>
      </button>
    {/if}
    <span class="acts">
      <button type="button" class="btn ghost sm" onclick={() => startRename(e)}>{i18n.t('chat.tab.rename')}</button>
      <button type="button" class="btn ghost sm" onclick={() => remove(e)}>{i18n.t('chat.conversations.delete')}</button>
    </span>
  </li>
{/snippet}

{#snippet head(k: string, text: string, cls: string)}
  <button type="button" class="place {cls}" aria-expanded={!folded.has(k)} onclick={() => fold(k)}>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
    <span>{text}</span>
  </button>
{/snippet}

{#if shown}
  <section class="conversations reading" aria-label={i18n.t('chat.conversations.label')}>
    <div class="back-row"><BackLink label={i18n.t('chat.conversations.label')} onclick={() => chatPages.back(item)} /></div>
    {#key shown}<ChatTab chatId={shown} inline />{/key}
  </section>
{:else}
<section class="conversations" aria-label={i18n.t('chat.conversations.label')}>
  <div class="bar">
    <input class="filter" type="search" placeholder={i18n.t('chat.conversations.filter')} bind:value={filter} aria-label={i18n.t('chat.conversations.filterLabel')} />
    <button type="button" class="toggle" class:on={byBook} aria-pressed={byBook} onclick={() => chatPages.fileByBook(!byBook)}>{i18n.t('chat.conversations.byBook')}</button>
    <button type="button" class="btn sm" onclick={fresh} onauxclick={onMiddle(fresh)}>{i18n.t('chat.newChat')}</button>
  </div>

  {#if gone}
    <div class="undo" role="status">{i18n.t('chat.conversations.deleted', { name: gone.name })} <button type="button" class="btn ghost sm" onclick={undo}>{i18n.t('chat.conversations.undo')}</button></div>
  {/if}

  {#if list.length === 0}
    <p class="empty">{filter.trim() ? i18n.t('chat.conversations.noMatch') : i18n.t('chat.conversations.none')}</p>
  {:else if !byBook}
    <ul>{#each list as e (e.id)}{@render row(e)}{/each}</ul>
  {:else}
    {#each shelves as s (s.book)}
      {@const bk = s.book}
      <div class="shelf">
        {@render head(bk, titleOf(bk), 'book')}
        {#if !folded.has(bk)}
          {#if s.entries.length}<ul>{#each s.entries as e (e.id)}{@render row(e)}{/each}</ul>{/if}
          {#each s.chapters as c (c.chapter)}
            {@const ck = `${bk}/${c.chapter}`}
            <div class="nest">
              {@render head(ck, chapterOf(bk, c.chapter), 'chapter')}
              {#if !folded.has(ck)}
                {#if c.entries.length}<ul>{#each c.entries as e (e.id)}{@render row(e)}{/each}</ul>{/if}
                {#each c.sections as x (x.section)}
                  {@const sk = `${bk}/${x.section}`}
                  <div class="nest">
                    {@render head(sk, sectionOf(bk, x.section), 'section')}
                    {#if !folded.has(sk)}<ul>{#each x.entries as e (e.id)}{@render row(e)}{/each}</ul>{/if}
                  </div>
                {/each}
              {/if}
            </div>
          {/each}
        {/if}
      </div>
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
  .bar{display:flex;align-items:center;gap:6px;margin-bottom:8px}
  .filter{flex:1;min-width:0;font:inherit;font-size:0.86rem;padding:5px 9px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink)}
  .filter:focus{outline:none;border-color:var(--accent)}
  /* Filed, a book is a heading and its chapters and sections stand a step in
     under it, each folding away what it holds. */
  .shelf{margin-top:12px}
  .shelf:first-of-type{margin-top:4px}
  .place{display:flex;align-items:center;gap:3px;width:100%;min-width:0;margin:2px 0;padding:3px 6px 3px 2px;border:0;border-radius:6px;background:none;font:inherit;text-align:left;color:var(--muted);cursor:pointer}
  .place:hover{color:var(--ink);background:var(--soft)}
  .place:focus-visible{outline:2px solid var(--accent)}
  .place span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .place svg{flex:none;width:12px;height:12px;transition:transform 120ms}
  .place[aria-expanded="true"] svg{transform:rotate(90deg)}
  .place.book{font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase}
  .place.chapter{font-size:0.8rem;font-weight:600}
  .place.section{font-size:0.78rem;font-weight:500}
  .nest{padding-left:12px}
  .shelf ul{padding-left:9px}
  .undo{display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:4px 8px;font-size:0.8rem;color:var(--muted);background:var(--soft);border-radius:7px}
  ul{list-style:none;margin:0;padding:0}
  .row{display:flex;align-items:center;gap:4px;border-radius:6px}
  .row:hover{background:var(--soft)}
  .open{flex:1;min-width:0;display:flex;align-items:baseline;gap:10px;font:inherit;font-size:0.88rem;color:var(--ink);text-align:left;background:none;border:0;padding:5px 8px;cursor:pointer}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* What a row says of its chat on the right, in the voice of an eyebrow: an
     answer on its way, or one the reader has not seen. */
  .brow{flex:none;align-self:center;font-size:0.64rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)}
  .running{display:inline-flex;gap:2px}
  .running i{width:3px;height:3px;border-radius:50%;background:currentColor;animation:brow-dot 1.2s infinite ease-in-out}
  .running i:nth-child(2){animation-delay:0.2s}
  .running i:nth-child(3){animation-delay:0.4s}
  @keyframes brow-dot{0%,80%,100%{opacity:0.25}40%{opacity:1}}
  @media (prefers-reduced-motion:reduce){ .running i{animation:none;opacity:0.7} }
  .age{flex:none;font-size:0.74rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .name-input{flex:1;min-width:0;font:inherit;font-size:0.88rem;padding:4px 7px;border:1px solid var(--accent);border-radius:6px;background:var(--panel);color:var(--ink)}
  .name-input:focus{outline:none}
  .acts{display:flex;gap:2px;opacity:0;transition:opacity 120ms}
  .row:hover .acts,.acts:focus-within{opacity:1}
  @media (hover: none){ .acts{opacity:.7} }
  .empty{color:var(--muted);font-size:0.86rem}
  @media (max-width:900px){ .back-row{padding:0 14px} }
</style>
