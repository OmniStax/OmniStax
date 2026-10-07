<script lang="ts">
  import { ai, openSettingsAt } from '../../lib/chat/settings.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { modelName, samePick, type ModelPick } from '../../lib/chat/providers/index';
  import type { MenuEntry } from '../../lib/chat/settings';
  import type { ChatId } from '../../lib/types/ids';

  /* In a chat the menu reads and writes the chat's pick; elsewhere the holder
     hands it `pick` and hears the choice through `onchoose`. */
  let { chatId, pick: held, onchoose }: { chatId?: ChatId; pick?: ModelPick | null; onchoose?: (pick: ModelPick) => void } = $props();

  let open = $state(false);
  let host = $state<HTMLElement | null>(null);
  const pick = $derived<ModelPick | null>(held !== undefined ? held ?? ai.last : (chatId ? chats.get(chatId)?.pick : null) ?? ai.last);
  const live = $derived(pick && ai.access(pick) !== null ? pick : null);
  const groups = $derived(ai.menu);

  /* Settings opened from here must not be shut again by the shell's own
     document click, which closes every overlay. */
  const choose = (ev: MouseEvent, e: MenuEntry): void => {
    ev.stopPropagation();
    open = false;
    if (!e.ready) { openSettingsAt(e.pick.provider); return; }
    if (onchoose) onchoose(e.pick); else if (chatId) chats.choosePick(chatId, e.pick);
  };

  $effect(() => {
    if (!open) return;
    const away = (e: PointerEvent): void => { if (host && !host.contains(e.target as Node)) open = false; };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  });

  const onkeydown = (e: KeyboardEvent): void => { if (e.key === 'Escape' && open) { e.stopPropagation(); open = false; } };
</script>

<div class="menu" bind:this={host} role="presentation" {onkeydown}>
  <button type="button" class="current" aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}>
    {#if live}{modelName(live)}{:else}<span class="unset">Configure a model…</span>{/if} <span class="caret" aria-hidden="true">▾</span>
  </button>
  {#if open}
    <div class="pop" role="menu" aria-label="Model">
      {#each groups as g (g.provider)}
        <div class="group">{g.label}{#if !g.ready}<span class="need">Needs key</span>{/if}</div>
        {#each g.entries as e (e.pick.model)}
          <button type="button" role="menuitemradio" aria-checked={!!live && samePick(e.pick, live)} class:on={!!live && samePick(e.pick, live)} class:off={!g.ready} onclick={(ev) => choose(ev, e)}>
            <span class="name">{e.name}</span>
          </button>
        {/each}
      {/each}
      <button type="button" role="menuitem" class="more" onclick={(ev) => { ev.stopPropagation(); open = false; openSettingsAt(pick?.provider ?? 'anthropic'); }}>Manage models…</button>
    </div>
  {/if}
</div>

<style>
  .menu{position:relative}
  .current{font:inherit;font-size:0.78rem;color:var(--muted);background:none;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;max-width:16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .current:hover,.current[aria-expanded="true"]{color:var(--ink);background:var(--soft)}
  .caret{font-size:0.7em;opacity:0.7}
  .pop{position:absolute;right:0;bottom:calc(100% + 6px);z-index:30;min-width:16rem;max-height:60vh;overflow:auto;padding:6px;background:var(--panel);border-radius:10px;box-shadow:0 0 0 1px var(--rule),0 8px 24px rgba(0,0,0,0.14)}
  .unset{opacity:0.75}
  .group{display:flex;align-items:baseline;gap:8px;font-size:0.68rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);padding:8px 8px 3px}
  .pop button{display:flex;align-items:center;gap:8px;width:100%;font:inherit;font-size:0.84rem;text-align:left;color:var(--ink);background:none;border:0;border-radius:6px;padding:5px 8px;cursor:pointer}
  .pop button:hover{background:var(--soft)}
  .pop button.on{color:var(--accent);font-weight:600}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .need{margin-left:auto;font-weight:400;letter-spacing:0;text-transform:none}
  .pop button.off{color:var(--muted)}
  .more{margin-top:4px;border-top:1px solid var(--rule) !important;border-radius:0 0 6px 6px !important;color:var(--muted) !important}
</style>
