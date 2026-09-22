<script lang="ts">
  /* The chat's branches, one row each, named by the first words of the first
     message on the branch that diverged from its neighbours — which is the
     thing that makes that branch the branch it is. A click opens it, and the
     one being read is marked. */
  import { leavesOf, type Chat } from '../../lib/chat/model';
  import { chats } from '../../lib/chat/store.svelte';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chat }: { chatId: ChatId; chat: Chat } = $props();
  const leaves = $derived(leavesOf(chat));
</script>

<aside class="leaves" aria-label="Branches of this chat">
  {#if leaves.length < 2}
    <p class="one">This chat has one branch. Editing a message or asking again makes another.</p>
  {:else}
    <ul>
      {#each leaves as l (l.id)}
        <li><button type="button" class:on={l.id === chat.leaf} onclick={() => chats.goTo(chatId, l.id)}>{l.name}</button></li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .leaves{flex:none;border-bottom:1px solid var(--rule);padding:6px 40px 8px;font-family:var(--sans)}
  ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
  button{font:inherit;font-size:0.76rem;padding:2px 9px;border:1px solid var(--rule);border-radius:999px;background:transparent;color:var(--muted);cursor:pointer;max-width:18rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  button:hover{color:var(--ink);background:var(--soft)}
  button.on{color:var(--ink);border-color:var(--accent)}
  .one{margin:0;font-size:0.76rem;color:var(--muted)}
  @media (max-width:900px){ .leaves{padding:6px 18px 8px} }
</style>
