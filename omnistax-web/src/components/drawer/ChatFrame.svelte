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
    <button type="button" class="tree" class:on={tree} aria-pressed={tree} onclick={() => (tree = !tree)}>Tree</button>
    <button type="button" class="open" title="Open the chat" aria-label="Open the chat" onclick={() => open()}>↗</button>
  </div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="body" onpointerdown={(e) => { e.stopPropagation(); onselect(); }} onwheel={(e) => e.stopPropagation()} ondblclick={(e) => e.stopPropagation()}>
    {#if chat}
      {#if tree}
        <TreeView {chat} compact root={root as MessageId | undefined} onopen={open} />
      {:else}
        <Transcript {chat} compact />
      {/if}
    {/if}
  </div>
  <span class="corner" role="presentation" title="Drag to resize" onpointerdown={onCorner}></span>
</div>

<style>
  .chat-item{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;border:1px solid var(--rule);border-radius:8px;background:var(--panel);overflow:hidden;font-family:var(--sans)}
  .chat-item.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .head{flex:none;display:flex;align-items:center;gap:6px;height:24px;padding:0 6px;background:var(--soft);border-bottom:1px solid var(--rule);cursor:move;touch-action:none;user-select:none}
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--ink)}
  .open{flex:none;width:20px;height:20px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);cursor:pointer;font-size:12px;line-height:1;padding:0}
  .open:hover,.tree:hover{color:var(--accent);border-color:var(--accent)}
  .tree{flex:none;height:20px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);cursor:pointer;font:inherit;font-size:11px;line-height:1;padding:0 6px}
  .tree.on{color:var(--accent);border-color:color-mix(in srgb, var(--accent) 50%, var(--rule))}
  .body{flex:1;min-height:0;position:relative}
  .corner{position:absolute;right:0;bottom:0;width:13px;height:13px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,var(--rule) 50%)}
  .chat-item.selected .corner{background:linear-gradient(135deg,transparent 50%,var(--accent) 50%)}
</style>
