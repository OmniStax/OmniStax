<script lang="ts">
  import { onDestroy } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { chats, type ChatEntry } from '../../lib/chat/store.svelte';
  import { newChatTab, showChat, chatTabKey } from '../../lib/chat/open.svelte';
  import { ageOf } from '../../lib/chat/tree';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { closeItem } from '../../lib/layout/model';
  import type { ChatId } from '../../lib/types/ids';

  const UNDO_FOR = 6000;

  let filter = $state('');
  let now = $state(Date.now());
  const tick = setInterval(() => { now = Date.now(); }, 30_000);

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

  const rows = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    return [...chats.index]
      .filter((e) => e.id !== gone?.id && (q === '' || (e.name || i18n.t('chat.newChat')).toLowerCase().includes(q)))
      .sort((a, b) => b.updated - a.updated);
  });

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

<section class="conversations" aria-label={i18n.t('chat.conversations.label')}>
  <div class="bar">
    <input class="filter" type="search" placeholder={i18n.t('chat.conversations.filter')} bind:value={filter} aria-label={i18n.t('chat.conversations.filterLabel')} />
    <button type="button" class="btn sm" onclick={() => newChatTab()}>{i18n.t('chat.newChat')}</button>
  </div>

  {#if gone}
    <div class="undo" role="status">{i18n.t('chat.conversations.deleted', { name: gone.name })} <button type="button" class="btn ghost sm" onclick={undo}>{i18n.t('chat.conversations.undo')}</button></div>
  {/if}

  {#if rows.length === 0}
    <p class="empty">{filter.trim() ? i18n.t('chat.conversations.noMatch') : i18n.t('chat.conversations.none')}</p>
  {:else}
    <ul>
      {#each rows as e (e.id)}
        <li class="row" data-chat={e.id}>
          {#if renaming === e.id}
            <input class="name-input" bind:value={draft} onkeydown={onNameKey} onblur={() => void commit()} use:takeFocus aria-label={i18n.t('chat.tab.name')} />
          {:else}
            <button type="button" class="open" onclick={() => showChat(e.id)} ondblclick={() => startRename(e)}>
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
  {/if}
</section>

<style>
  .conversations{font-family:var(--sans)}
  .bar{display:flex;gap:6px;margin-bottom:8px}
  .filter{flex:1;min-width:0;font:inherit;font-size:0.86rem;padding:5px 9px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink)}
  .filter:focus{outline:none;border-color:var(--accent)}
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
</style>
