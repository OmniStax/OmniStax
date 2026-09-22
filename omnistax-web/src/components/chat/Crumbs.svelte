<script lang="ts">
  /* The trail of forks from the root down to where the reader is standing: one
     crumb per message that has siblings, saying the first words of the one
     being read and which of them it is. A crumb's label jumps back to that
     message, so the reader is at the fork; its chevron lists the siblings and
     choosing one swaps the transcript below to that branch. */
  import { crumbsOf, type Chat, type MessageId } from '../../lib/chat/model';
  import { siblingsOf, firstWords } from '../../lib/chat/model';
  import { chats } from '../../lib/chat/store.svelte';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chat }: { chatId: ChatId; chat: Chat } = $props();
  const crumbs = $derived(crumbsOf(chat));
  let open = $state<MessageId | null>(null);
</script>

{#if crumbs.length}
  <nav class="crumbs" aria-label="Where this branch forked">
    {#each crumbs as c (c.id)}
      <span class="crumb">
        <button type="button" class="jump" title="Go back to this fork" onclick={() => chats.goTo(chatId, c.id)}>{c.words}</button>
        <button type="button" class="chev" aria-label="The other {c.count - 1} at this fork" title="The others at this fork"
          onclick={() => (open = open === c.id ? null : c.id)}>{c.index + 1}/{c.count} ▾</button>
        {#if open === c.id}
          <ul class="siblings">
            {#each siblingsOf(chat, c.id) as s, i (s.id)}
              <li><button type="button" class:on={i === c.index} onclick={() => { chats.choose(chatId, c.id, i); open = null; }}>{firstWords(s.text, 8) || '(empty)'}</button></li>
            {/each}
          </ul>
        {/if}
      </span>
    {/each}
  </nav>
{/if}

<style>
  .crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px 40px 6px;font-size:0.74rem;color:var(--muted)}
  .crumb{position:relative;display:inline-flex;align-items:center;gap:2px}
  .crumb + .crumb::before{content:"›";margin-right:4px;color:var(--rule)}
  button{font:inherit;background:transparent;border:0;color:var(--muted);cursor:pointer;padding:1px 4px;border-radius:4px;max-width:14rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  button:hover{background:var(--soft);color:var(--ink)}
  .siblings{position:absolute;top:100%;left:0;z-index:20;margin:2px 0 0;padding:4px;list-style:none;min-width:14rem;background:var(--panel);border:1px solid var(--rule);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
  .siblings button{display:block;width:100%;text-align:left;max-width:none}
  .siblings button.on{color:var(--ink);font-weight:600}
  @media (max-width:900px){ .crumbs{padding:4px 18px 6px} }
</style>
