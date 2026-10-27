<script lang="ts">
  /* The one way a whole chat leaves its tab: Copy, and a small menu of the two
     things it can be pasted as, each saying what it becomes. By reference it
     is the live embed a note or a drawing draws and keeps growing; plain it is
     the branch the chat stands on as Markdown, which a drawing lays out as
     linked cards. The button says Copied for a moment once it is done. */
  import { tick } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { copyChatPlain, copyChatReference } from '../../lib/drawer/chatdrop';
  import type { Chat } from '../../lib/chat/model';
  import type { ChatId } from '../../lib/types/ids';

  let { chatId, chat }: { chatId: ChatId; chat: Chat | null } = $props();

  let open = $state(false);
  let said = $state<string | null>(null);
  let host = $state<HTMLElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const items = (): HTMLButtonElement[] => [...(host?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
  const show = async (): Promise<void> => { open = true; await tick(); items()[0]?.focus(); };
  const shut = (refocus = true): void => { open = false; if (refocus) trigger?.focus(); };

  const copy = (how: () => Promise<boolean>): void => {
    shut();
    void how().then((ok) => {
      said = ok ? i18n.t('chat.bubble.copied') : i18n.t('chat.bubble.copyFailed');
      clearTimeout(timer); timer = setTimeout(() => (said = null), 1400);
    });
  };
  const asReference = (): void => copy(() => copyChatReference(chatId));
  const asPlain = (): void => { const c = chat; if (c) copy(() => copyChatPlain(c)); };

  $effect(() => {
    if (!open) return;
    const away = (e: PointerEvent): void => { if (host && !host.contains(e.target as Node)) shut(false); };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  });
  $effect(() => () => clearTimeout(timer));

  /* Up and Down walk the two rows, Home and End go to either end, Escape and
     Tab put the menu away; Enter and Space are the buttons' own. */
  const onkeydown = (e: KeyboardEvent): void => {
    if (!open) { if (e.key === 'ArrowDown' && e.target === trigger) { e.preventDefault(); void show(); } return; }
    const all = items(), at = all.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); return; }
    if (e.key === 'Tab') { shut(false); return; }
    const next = e.key === 'ArrowDown' ? (at + 1) % all.length : e.key === 'ArrowUp' ? (at - 1 + all.length) % all.length : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    all[next]?.focus();
  };
</script>

<div class="copy" bind:this={host} role="presentation" {onkeydown}>
  <button type="button" class="trigger" class:said={said !== null} bind:this={trigger} disabled={!chat} aria-haspopup="menu" aria-expanded={open}
    onclick={() => (open ? shut() : void show())}>{said ?? i18n.t('chat.bubble.copy')}<svg class="caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg></button>
  {#if open}
    <div class="pop" role="menu" aria-label={i18n.t('chat.copy.label')}>
      <button type="button" role="menuitem" onclick={asReference}>
        <span class="what">{i18n.t('chat.copy.reference')}</span>
        <span class="how">{i18n.t('chat.copy.referenceHint')}</span>
      </button>
      <button type="button" role="menuitem" onclick={asPlain}>
        <span class="what">{i18n.t('chat.copy.plain')}</span>
        <span class="how">{i18n.t('chat.copy.plainHint')}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .copy{position:relative;flex:none}
  .trigger{display:inline-flex;align-items:center;gap:3px;font:inherit;font-size:0.8rem;color:var(--muted);background:none;border:0;border-radius:6px;padding:3px 6px 3px 8px;cursor:pointer;white-space:nowrap}
  .trigger:hover:not(:disabled),.trigger[aria-expanded="true"]{color:var(--ink);background:var(--soft)}
  .trigger:disabled{opacity:0.5;cursor:default}
  .trigger:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .trigger.said{color:var(--accent)}
  .caret{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:0.7}
  .pop{position:absolute;right:0;top:calc(100% + 4px);z-index:30;width:max-content;max-width:22rem;padding:4px;background:var(--panel);border-radius:10px;box-shadow:0 0 0 1px var(--rule),0 8px 24px rgba(0,0,0,0.14)}
  .pop button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;font:inherit;text-align:left;color:var(--ink);background:none;border:0;border-radius:6px;padding:6px 9px;cursor:pointer}
  .pop button:hover,.pop button:focus-visible{background:var(--soft);outline:none}
  .what{font-size:0.84rem;font-weight:600}
  .how{font-size:0.75rem;line-height:1.35;color:var(--muted)}
</style>
