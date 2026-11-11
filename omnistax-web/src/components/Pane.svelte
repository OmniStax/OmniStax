<script lang="ts">
  /* One scroll pane for one tab. A document tab adopts its DOM instance; a
     figure tab adopts a root holding that one figure; a standing page adopts
     the article the registry keeps for it; a view tab renders the view and a
     note tab renders the note, each with the room a tab gives it. The focused
     group's active pane feeds the scroll spy. The pane is drawn in the shell's
     one list of panes and stands in the body of the group that shows it; when
     its tab goes to another group it is moved there as it is. A view in the
     sidebar is a pane as well, drawn as a box with a head to drag it by, so
     the view itself is the same one on either side of a drag. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { registry } from '../lib/sections/registry.svelte';
  import { spy } from '../lib/sections/spy.svelte';
  import { parseItemKey, sectionOfItem, type GroupKey } from '../lib/types/ids';
  import { adopt } from './actions/adopt';
  import { lodge, paneHosts } from '../lib/layout/panehosts.svelte';
  import View from './views/View.svelte';
  import { closeItem } from '../lib/layout/model';
  import { draggable } from '../lib/layout/drag.svelte';
  import { viewTitle } from '../lib/icons';
  import NoteTab from './notes/NoteTab.svelte';
  import Sheet from './sheets/Sheet.svelte';
  import Placeholder from './ui/Placeholder.svelte';
  import FileTab from './files/FileTab.svelte';
  import DrawingPane from './drawer/DrawingPane.svelte';
  import ScratchPane from './drawer/ScratchPane.svelte';
  import ExerciseTab from './exercises/ExerciseTab.svelte';
  import ChatTab from './chat/ChatTab.svelte';
  import { i18n } from '../lib/i18n/store.svelte';
  let { groupKey, groupIndex, itemKey, active, side = false, order = 0 }: { groupKey: GroupKey; groupIndex: number; itemKey: string; active: boolean; side?: boolean; order?: number } = $props();
  const id = $derived(parseItemKey(itemKey));
  const holds = (g: GroupKey, k: string) => layoutStore.layout.groups.some((x) => x.key === g && x.tabs.includes(k));
  let el = $state<HTMLElement | null>(null);
  const sec = $derived(id ? sectionOfItem(id) : null);
  $effect(() => { el = !id ? null : id.kind === 'doc' ? registry.instanceFor(groupKey, id, holds) : id.kind === 'fig' ? registry.figureFor(groupKey, id) : id.kind === 'page' ? registry.pageFor(id) : null; });
  const status = $derived(sec ? registry.state(sec)?.status ?? 'loading' : 'loaded');
  const error = $derived(sec ? registry.state(sec)?.error : undefined);
  const entry = $derived(sec ? registry.entry(sec) : undefined);
  $effect(() => { if (sec && status === 'loading' && !registry.state(sec)?.docs.text) void registry.load(sec); });
  /* The failure line around its link: {link} is left in place by the template and cut here. */
  const failed = $derived(i18n.t('shell.pane.failed', { section: sec?.section ?? '', error: String(error) }).split('{link}'));
  const onscroll = (e: Event) => { if (active && layoutStore.layout.focus === groupIndex) spy.read(e.currentTarget as HTMLElement); };
</script>

<div class={side ? 'vbox' : 'pane'} data-tab={side ? undefined : itemKey} data-key={side ? undefined : groupKey} data-group={side ? undefined : groupIndex}
  data-item={side ? itemKey : undefined} style:order={side ? order : undefined} hidden={!active} {onscroll} use:lodge={paneHosts.of(groupKey)}>
  {#if id && id.kind === 'view'}
    {#if side}
      <header use:draggable={{ key: itemKey, from: null }}>
        <span class="eyebrow">{viewTitle(id.view, i18n.t)}</span>
        <button type="button" class="x" aria-label={i18n.t('shell.close')} onclick={() => layoutStore.apply((x) => closeItem(x, itemKey))}>×</button>
      </header>
    {/if}
    <div class={side ? 'vbody' : 'view-pane'} data-view={side ? undefined : id.view} data-item={side ? undefined : itemKey}><View item={itemKey} /></div>
  {:else if id && id.kind === 'note'}
    <NoteTab noteId={id.note} {groupKey} />
  {:else if id && id.kind === 'sheet'}
    <div class="sheet-pane"><Sheet book={id.book} id={id.sheet} /></div>
  {:else if id && id.kind === 'file'}
    <FileTab fileId={id.file} {groupKey} />
  {:else if id && id.kind === 'drawing'}
    <DrawingPane id={id.drawing} {groupKey} />
  {:else if id && id.kind === 'chat'}
    <ChatTab chatId={id.chat} />
  {:else if id && id.kind === 'ex'}
    <ExerciseTab book={id.book} section={id.section} ex={id.ex} {groupKey} />
  {:else if id && id.kind === 'scratch'}
    <ScratchPane book={id.book} section={id.section} ex={id.ex} {groupKey} />
  {:else if el}
    <div class="doc-host" class:page-host={id?.kind === 'page'} use:adopt={el}></div>
  {:else if sec && status === 'missing'}
    <article class="placeholder"><div class="loading">{registry.missingLine(sec)}</div></article>
  {:else if status === 'failed' && !navigator.onLine}
    <article class="placeholder"><div class="loading">{sec ? i18n.t('shell.pane.notDownloaded', { section: sec.section }) : i18n.t('shell.pane.notDownloadedThis')}</div></article>
  {:else if status === 'failed'}
    <article class="placeholder"><div class="loading bad">{failed[0]}<a href={entry?.url}>{i18n.t('shell.pane.ownPage')}</a>{failed[1] ?? ''}</div></article>
  {:else}
    <article class="placeholder"><div class="loading">{i18n.t('shell.pane.loading', { title: id ? registry.title(id) : itemKey })}</div></article>
  {/if}
</div>

<style>
  .pane{position:absolute;inset:0;overflow:auto;scroll-behavior:smooth;scroll-padding-top:16px}
  @media (prefers-reduced-motion: reduce){ .pane{scroll-behavior:auto} }
  .pane[hidden]{display:none}
  /* a view in the sidebar: a box that shares the stack's height with the others, under a head it is dragged by */
  .vbox{flex:1;min-height:0;display:flex;flex-direction:column}
  .vbox header{display:flex;align-items:center;gap:4px;padding:6px 6px 6px 12px;cursor:grab;user-select:none;position:sticky;top:0;background:var(--bg);z-index:2}
  .vbox header .eyebrow{flex:1;margin:0}
  .vbox header button{width:22px;height:22px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0;font-size:14px;line-height:1}
  .vbox header button:hover{background:var(--soft2);color:var(--ink)}
  .vbox header button:focus-visible{outline:2px solid var(--accent)}
  .vbody{flex:1;min-height:0;overflow:auto;padding:2px 12px 16px 12px}
  .view-pane{max-width:760px;margin:0 auto;padding:28px 40px 120px;font-family:var(--sans);font-size:0.95rem}
  .page-host{max-width:760px;margin:0 auto;padding:28px 40px 120px}
  /* a sheet is a table before it is prose, so it is given the width of the pane rather than a column of text */
  .sheet-pane{max-width:1180px;margin:0 auto;padding:28px 28px 120px}
  .placeholder{display:grid;place-items:center;min-height:60vh;max-width:820px;margin:0 auto;text-align:center}
  @media (max-width:900px){ .view-pane,.page-host,.sheet-pane{padding:20px 18px 80px} }
</style>
