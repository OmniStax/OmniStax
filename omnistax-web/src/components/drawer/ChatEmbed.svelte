<script lang="ts">
  /* A whole chat held in a note, `![[chat:<id>]]`: the tree, inline, at a
     fixed height, panned and zoomed on its own plane. */
  import TreeView from '../chat/TreeView.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { showChat } from '../../lib/chat/open.svelte';
  import { chatId as toChatId } from '../../lib/types/ids';
  import type { MessageId } from '../../lib/chat/model';

  let { chat: id }: { chat: string } = $props();

  const cid = $derived(toChatId(id));
  $effect(() => { void chats.load(cid); });
  const chat = $derived(chats.get(cid));
  let fitted = $state(0);

  const open = (m?: MessageId): void => {
    if (m) chats.goTo(cid, m);
    showChat(cid);
  };
</script>

<div class="chat-tree" data-chat={id}>
  <div class="head">
    <span class="name">{chats.nameOf(cid)}</span>
    <button type="button" class="act" onclick={() => (fitted += 1)}>Fit</button>
    <button type="button" class="act" onclick={() => open()}>Open</button>
  </div>
  <div class="body">
    {#if chat}
      {#key fitted}<TreeView {chat} compact onopen={open} />{/key}
    {/if}
  </div>
</div>

<style>
  .chat-tree{display:flex;flex-direction:column;height:260px;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--bg);font-family:var(--sans)}
  .head{flex:none;display:flex;align-items:center;gap:6px;padding:3px 8px;background:var(--soft);border-bottom:1px solid var(--rule)}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem;font-weight:600;color:var(--ink)}
  .act{font:inherit;font-size:0.74rem;color:var(--accent);background:transparent;border:0;padding:2px 4px;cursor:pointer}
  .act:hover{text-decoration:underline}
  .body{flex:1;min-height:0;position:relative}
</style>
