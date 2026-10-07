<script lang="ts">
  /* The activity rail, down the left of the shell, in four sections: the
     workspace (explorer, search, sync), the views about the open text
     (annotations, concept map, reference), the study tools (exercises,
     pomodoro, conversations), and at the foot read-aloud when voice is on, the
     command palette and the settings. A sidebar view's button shows it in the
     sidebar and a second click puts it away; a page view's click shows it in
     the focused group in place of the tab showing there, and a Ctrl click adds
     another page of it. Every button drags, so any view can be dropped into a group. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { where, openSide, openTab, closeItem, openInFocus, replaceTab, showViewInFocus, splitRight, instancesOf } from '../lib/layout/model';
  import { draggable, dropzone } from '../lib/layout/drag.svelte';
  import { openingOf } from '../lib/sections/nav.svelte';
  import { isSidebarKind, newViewItem, viewItem, viewKindOf, type ViewKind } from '../lib/types/ids';
  import { ICON, VIEW_TITLE } from '../lib/icons';
  import { ui } from '../lib/commands/ui.svelte';
  import { settings } from '../lib/settings/store.svelte';
  import { reader } from '../lib/voice.svelte';
  import { pomodoro } from '../lib/pomodoro/store.svelte';
  let { narrow = false }: { narrow?: boolean } = $props();
  const l = $derived(layoutStore.layout);
  const iconOf = (kind: ViewKind): string => ICON[kind as keyof typeof ICON] ?? '';
  const titleOf = (kind: ViewKind): string => VIEW_TITLE[kind] ?? kind;
  /* The clock reads itself back from this browser as soon as the shell is up, so
     that a countdown can stand under the icon wherever the panel happens to be. */
  $effect(() => { pomodoro.init(); });
  let drop = $state(false);
  const GROUPS: readonly (readonly ViewKind[])[] = [['explorer', 'search', 'sync'], ['annotations', 'concepts', 'reference'], ['exercises', 'pomodoro', 'chats']];
  const keyOf = (kind: ViewKind): string => `view:${kind}`;
  const lit = (kind: ViewKind): boolean => kind === 'chats' ? chatsOpen : isSidebarKind(kind) ? !!where(l, keyOf(kind)) : instancesOf(l, kind).length > 0;
  const press = (kind: ViewKind, e: MouseEvent): void => { if (kind === 'chats') openChats(e); else if (isSidebarKind(kind)) toggleSide(keyOf(kind)); else openPage(kind, e); };
  const toggleSide = (k: string) => {
    const loc = where(l, k);
    if (!loc || (loc.type === 'side' && loc.side !== 'left')) { layoutStore.apply((x) => openSide(x, k, 'left')); layoutStore.overlay = 'left'; return; }
    if (loc.type === 'side') {
      if (narrow && layoutStore.overlay !== 'left') { layoutStore.overlay = 'left'; return; }
      layoutStore.apply((x) => closeItem(x, k)); return;
    }
    layoutStore.apply((x) => openTab(x, k, loc.index));
  };
  /* A plain click shows the view in place of the focused group's tab, or brings
     forward the page of it that group holds; Ctrl adds a page of its own as a
     new tab, and Ctrl+Alt puts one in a group of its own beside. */
  const openPage = (kind: ViewKind, e: MouseEvent) => {
    const how = openingOf(e);
    layoutStore.apply((x) => (how === 'new' ? splitRight(x, x.focus, newViewItem(kind)) : how === 'tab' ? openTab(x, newViewItem(kind), x.focus) : showViewInFocus(x, kind, newViewItem(kind))));
  };
  /* The conversations are one page: wherever it stands it comes forward, and otherwise it opens the way the click asked. */
  const openChats = (e: MouseEvent) => {
    const how = openingOf(e); const k = viewItem('chats');
    layoutStore.apply((x) => (how === 'new' ? splitRight(x, x.focus, k) : where(x, k) || how === 'tab' ? openInFocus(x, k) : replaceTab(x, k, x.focus)));
  };
  const voiceTitle = $derived(reader.speaking ? 'Stop reading' : 'Read section aloud');
  /* The chat button lights while any chat stands open, as a view's button
     lights while any page of it does. */
  const chatsOpen = $derived(l.groups.some((g) => g.tabs.some((t) => t.startsWith('chat:') || viewKindOf(t) === 'chats')));
</script>

<nav class="rail" class:drop aria-label="Views"
  use:dropzone={{ over: () => (drop = true), leave: () => (drop = false), drop: (d) => { const k = d.key; layoutStore.apply((x) => (k.startsWith('view:') ? openSide(x, k, 'left') : openTab(x, k, x.focus, { from: d.from }))); } }}>
  {#each GROUPS as kinds, i (i)}
    {#if i}<div class="gap"></div>{/if}
    <div class="section">
      {#each kinds as kind (kind)}
        {@const count = kind === 'pomodoro' ? pomodoro.railText : ''}
        <button type="button" id={kind === 'sync' ? 'sync-btn' : undefined} class:on={lit(kind)} class:counting={!!count} class:spot={ui.spot === (kind === 'chats' ? 'ai' : kind)} aria-label={kind === 'chats' ? 'Conversations' : titleOf(kind)}
          use:draggable={{ key: keyOf(kind), from: null }} onclick={(e) => press(kind, e)} onauxclick={(e) => { if (e.button === 1 && !isSidebarKind(kind)) press(kind, e); }}>{@html kind === 'chats' ? ICON.chat : iconOf(kind)}{#if count}<span class="count">{count}</span>{/if}</button>
      {/each}
    </div>
  {/each}
  <div class="spacer"></div>
  <div class="section">
    {#if settings.voice && reader.supported}
      <button type="button" id="voice" class:on={reader.speaking} class:speaking={reader.speaking} aria-label={voiceTitle} onclick={(e) => { e.stopPropagation(); reader.toggle(); }}>{@html ICON.speaker}</button>
    {/if}
    <button type="button" id="palette-btn" class:on={ui.palette.open} title="Command palette (Ctrl+Shift+P)" aria-label="Command palette" onclick={(e) => { e.stopPropagation(); ui.togglePalette(); }}>{@html ICON.palette}</button>
    <button type="button" id="gear" class:on={ui.settings} title="Settings (Ctrl+,)" aria-label="Settings" onclick={(e) => { e.stopPropagation(); ui.toggleSettings(); }}>{@html ICON.gear}</button>
  </div>
</nav>

<style>
  .rail{grid-area:rl;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;background:var(--panel);border-right:1px solid var(--rule);font-family:var(--sans)}
  /* Three groups of views stand at the top, a rule between each; the app's own buttons sit at the foot. */
  .section{display:flex;flex-direction:column;align-items:center;gap:2px;flex:none}
  .gap{width:20px;height:1px;background:var(--rule);margin:6px 0}
  .spacer{flex:1}
  button{width:36px;height:36px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;position:relative;padding:0}
  button:hover{background:var(--soft);color:var(--ink)}
  button.on{color:var(--ink)}
  button.speaking{color:var(--accent)}
  /* the one marker a button wears: the bar down its left while the view stands open somewhere */
  button.on::before{content:"";position:absolute;left:-4px;top:8px;bottom:8px;width:2px;background:var(--ink);border-radius:1px}
  button :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  button[draggable="true"]{cursor:grab}
  /* While a session runs, the time left stands under the icon, which shifts up to make room for it. */
  .count{position:absolute;left:0;right:0;bottom:1px;font-size:0.56rem;font-variant-numeric:tabular-nums;letter-spacing:0.02em;color:var(--accent);line-height:1}
  button.counting{color:var(--accent)}
  button.counting :global(svg){transform:translateY(-4px)}
  .rail.drop{background:var(--soft)}
</style>
