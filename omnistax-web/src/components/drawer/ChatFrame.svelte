<script lang="ts">
  /* A chat held on a drawing by reference: the live tree, drawn compact, so it
     grows as the chat does. Its header moves it and its corner sizes it; the
     tree inside pans and zooms on its own, so no press or wheel in it reaches
     the canvas. Double-clicking a message opens the chat there. The header
     turns it to the transcript and back; neither asks anything. */
  import TreeView from '../chat/TreeView.svelte';
  import Transcript from '../chat/Transcript.svelte';
  import { chats } from '../../lib/chat/store.svelte';
  import { showChat } from '../../lib/chat/open.svelte';
  import { chatId as toChatId } from '../../lib/types/ids';
  import type { MessageId } from '../../lib/chat/model';

  let {
    x, y, w, h, chat: id, root, selected = false, scale = 1, onmove, onresize, onselect, onend,
  }: {
    x: number; y: number; w: number; h: number; chat: string; root?: string;
    selected?: boolean; scale?: number;
    onmove: (x: number, y: number) => void;
    onresize: (w: number, h: number) => void;
    onselect: () => void;
    onend?: () => void;
  } = $props();

  const cid = $derived(toChatId(id));
  $effect(() => { void chats.load(cid); });
  const chat = $derived(chats.get(cid));
  let tree = $state(true);
  /* Fit draws the tree again from its start, which frames the whole of it. */
  let fitted = $state(0);
  const FIT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const open = (m?: MessageId): void => {
    if (m) chats.goTo(cid, m);
    showChat(cid);
  };

  const drag = (e: PointerEvent, f: (dx: number, dy: number) => void): void => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault(); e.stopPropagation();
    onselect();
    const grip = e.currentTarget as HTMLElement;
    const x0 = e.clientX, y0 = e.clientY, k = scale === 0 ? 1 : 1 / scale;
    grip.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent): void => f((m.clientX - x0) * k, (m.clientY - y0) * k);
    const up = (): void => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      onend?.();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };
  const onGrab = (e: PointerEvent): void => { const x1 = x, y1 = y; drag(e, (dx, dy) => onmove(x1 + dx, y1 + dy)); };
  const onCorner = (e: PointerEvent): void => { const w1 = w, h1 = h; drag(e, (dx, dy) => onresize(Math.max(200, w1 + dx), Math.max(140, h1 + dy))); };
</script>

<div class="chat-item" class:selected data-chat={id}
  style:left="{x}px" style:top="{y}px" style:width="{w}px" style:height="{h}px">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="head" onpointerdown={onGrab}>
    <span class="name">{chats.nameOf(cid)}</span>
    <button type="button" class="act" class:on={tree} aria-pressed={tree} onclick={() => (tree = !tree)}>Tree</button>
    {#if tree}<button type="button" class="act icon" title="Fit" aria-label="Fit the tree" onclick={() => (fitted += 1)}>{@html FIT}</button>{/if}
    <button type="button" class="act" onclick={() => open()}>Open</button>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="body" onpointerdown={(e) => { e.stopPropagation(); onselect(); }} onwheel={(e) => e.stopPropagation()} ondblclick={(e) => e.stopPropagation()}>
    {#if chat}
      {#if tree}
        {#key fitted}<TreeView {chat} compact root={root as MessageId | undefined} onopen={open} />{/key}
      {:else}
        <Transcript {chat} compact />
      {/if}
    {/if}
  </div>
  <!-- the grip and a band round the border move the chat, as they move a text box -->
  <span class="grip" onpointerdown={onGrab} aria-hidden="true">⠿</span>
  {#each ['right', 'bottom', 'left'] as side (side)}<span class="edge {side}" onpointerdown={onGrab} aria-hidden="true"></span>{/each}
  <span class="corner" role="presentation" onpointerdown={onCorner}></span>
</div>

<style>
  .chat-item{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;border:1px solid var(--rule);border-radius:8px;background:var(--panel);overflow:hidden;font-family:var(--sans)}
  .chat-item.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .head{flex:none;display:flex;align-items:center;gap:6px;height:24px;padding:0 6px;background:var(--soft);border-bottom:1px solid var(--rule);cursor:move;touch-action:none;user-select:none}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--ink)}
  /* the header's actions read as the chat embed's in a note: quiet links, the one on in colour */
  .act{flex:none;font:inherit;font-size:11.5px;color:var(--accent);background:transparent;border:0;padding:2px 4px;cursor:pointer;display:inline-flex;align-items:center}
  .act:hover{text-decoration:underline}
  .act[aria-pressed]{color:var(--muted)}
  .act.on{color:var(--accent);font-weight:600}
  .act.icon :global(svg){width:13px;height:13px}
  .edge{position:absolute;cursor:move;touch-action:none}
  .edge.bottom{left:0;right:16px;bottom:0;height:7px}
  .edge.left,.edge.right{top:24px;bottom:16px;width:7px}
  .edge.left{left:0} .edge.right{right:0}
  .grip{position:absolute;left:-1px;top:-1px;transform:translate(-100%,0);padding:2px 3px;border-radius:5px;background:var(--panel);border:1px solid var(--rule);color:var(--muted);font-size:0.7rem;line-height:1;cursor:grab;touch-action:none;user-select:none;opacity:0;transition:opacity .12s}
  .grip:active{cursor:grabbing}
  .chat-item:hover .grip,.chat-item.selected .grip{opacity:1}
  .body{flex:1;min-height:0;position:relative}
  .corner{position:absolute;right:0;bottom:0;width:13px;height:13px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,var(--rule) 50%)}
  .chat-item.selected .corner{background:linear-gradient(135deg,transparent 50%,var(--accent) 50%)}
</style>
