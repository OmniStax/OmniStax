<script lang="ts">
  import { leavesOf, type Chat } from '../../lib/chat/model';
  import { chats } from '../../lib/chat/store.svelte';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chat }: { chatId: ChatId; chat: Chat } = $props();
  const leaves = $derived(leavesOf(chat));
</script>

<aside class="leaves" aria-label="Branches of this chat">
  {#if leaves.length < 2}
    <p class="one">One branch</p>
  {:else}
    <ul>
      {#each leaves as l (l.id)}
        <li><button type="button" class="chip" class:on={l.id === chat.leaf} onclick={() => chats.goTo(chatId, l.id)}>{l.name}</button></li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .leaves{flex:none;border-bottom:1px solid var(--rule);padding:6px 40px 8px;font-family:var(--sans)}
  ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
  .chip{max-width:18rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .one{margin:0;font-size:0.76rem;color:var(--muted)}
  @media (max-width:900px){ .leaves{padding:6px 18px 8px} }
</style>
