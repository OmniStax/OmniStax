<script lang="ts">
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
        <button type="button" class="chev" aria-label="The other {c.count - 1} at this fork"
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
  button{font:inherit;font-weight:500;height:22px;background:transparent;border:0;color:var(--muted);cursor:pointer;padding:0 6px;border-radius:6px;max-width:14rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background-color 120ms,color 120ms}
  .chev{font-variant-numeric:tabular-nums}
  button:hover{background:var(--soft);color:var(--ink)}
  .siblings{position:absolute;top:100%;left:0;z-index:20;margin:4px 0 0;padding:4px;list-style:none;min-width:14rem;background:var(--panel);border:1px solid var(--rule);border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,0.16)}
  .siblings button{display:block;width:100%;height:auto;padding:5px 8px;text-align:left;max-width:none}
  .siblings button.on{color:var(--ink);font-weight:600}
  @media (max-width:900px){ .crumbs{padding:4px 18px 6px} }
</style>
