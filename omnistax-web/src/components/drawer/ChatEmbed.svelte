<script lang="ts">
  /* A whole chat held in a note, `![[chat:<id>]]`: the tree, inline, at a
     fixed height, panned and zoomed on its own plane, or as its transcript. */
  import TreeView from '../chat/TreeView.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import Transcript from '../chat/Transcript.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { showChat } from '../../lib/chat/open.svelte';
  import { chatId as toChatId } from '../../lib/types/ids';
  import type { MessageId } from '../../lib/chat/model';

  let { chat: id }: { chat: string } = $props();

  const cid = $derived(toChatId(id));
  $effect(() => { void chats.load(cid); });
  const chat = $derived(chats.get(cid));
  let fitted = $state(0);
  let tree = $state(true);

  const open = (m?: MessageId): void => {
    if (m) chats.goTo(cid, m);
    showChat(cid);
  };
</script>

<div class="chat-tree" data-chat={id}>
  <div class="head">
    <span class="name">{chats.nameOf(cid)}</span>
    <button type="button" class="act" class:on={tree} aria-pressed={tree} onclick={() => (tree = !tree)}>{i18n.t('drawer.chat.tree')}</button>
    {#if tree}<button type="button" class="act icon" title={i18n.t('drawer.toolbar.fit')} aria-label={i18n.t('drawer.chat.fitTree')} onclick={() => (fitted += 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>{/if}
    <button type="button" class="act" onclick={() => open()}>{i18n.t('drawer.chat.open')}</button>
  </div>
  <div class="body">
    {#if chat}
      {#if tree}
        {#key fitted}<TreeView {chat} compact onopen={open} />{/key}
      {:else}
        <Transcript {chat} compact />
      {/if}
    {/if}
  </div>
</div>

<style>
  .chat-tree{display:flex;flex-direction:column;height:260px;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg);font-family:var(--sans)}
  .head{flex:none;display:flex;align-items:center;gap:6px;padding:3px 8px;background:var(--soft);border-bottom:1px solid var(--rule)}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem;font-weight:600;color:var(--ink)}
  .act{font:inherit;font-size:0.74rem;color:var(--accent);background:transparent;border:0;padding:2px 4px;cursor:pointer}
  .act:hover{text-decoration:underline}
  .act[aria-pressed]{color:var(--muted)}
  .act.on{color:var(--accent);font-weight:600}
  .act.icon{display:inline-flex;align-items:center}
  .act.icon svg{width:13px;height:13px}
  .body{flex:1;min-height:0;position:relative}
</style>
