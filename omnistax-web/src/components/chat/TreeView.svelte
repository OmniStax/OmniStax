<script lang="ts">
  import Plane from '../ui/Plane.svelte';
  import { layoutTree, boundsOf, type Box } from '../../lib/tree/layout';
  import { childrenOf, pathTo, type Chat, type Message, type MessageId } from '../../lib/chat/model';
  import { ANCHOR, NODE, NODE_COMPACT, nodeSize, opening, timeOf } from '../../lib/chat/tree';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import { chatResolver } from '../../lib/chat/resolve';
  import { sendChatToDrawing } from '../../lib/drawer/chatdrop';

  let { chat, compact = false, root, selected = $bindable(), onopen }:
    { chat: Chat; compact?: boolean; root?: MessageId; selected?: MessageId; onopen?: (id: MessageId) => void } = $props();

  const scale = $derived(compact ? NODE_COMPACT : NODE);
  const top = $derived(root ?? chat.root);
  const kidsOf = (id: MessageId): readonly MessageId[] => childrenOf(chat, id).map((m) => m.id);
  const boxes = $derived(layoutTree(top, kidsOf, (id) => (id === chat.root ? ANCHOR : nodeSize(chat.messages[id], scale)), compact ? { x: 16, y: 22 } : { x: 24, y: 32 }));
  const bounds = $derived(boundsOf(boxes.values()));
  const nodes = $derived([...boxes].flatMap(([id, box]) => { const m = chat.messages[id]; return m ? [{ m, box }] : []; }));
  const onPath = $derived(new Set<string>(pathTo(chat, chat.leaf).map((m) => m.id)));
  const edges = $derived(nodes.flatMap(({ m, box }) => {
    const up = m.parent !== null && m.id !== top ? boxes.get(m.parent) : undefined;
    return up ? [{ id: m.id, d: link(up, box), on: onPath.has(m.id) }] : [];
  }));

  function link(a: Box, b: Box): string {
    const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y, my = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
  }

  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = (m: Message): string => (render === null ? '' : render(opening(m.text, scale.chars), chatResolver()));
</script>

<div class="tree" class:compact data-tree>
  {#if !compact}
    <div class="head-bar"><button type="button" class="btn ghost sm" onclick={() => sendChatToDrawing(chat.id)}>Send to drawing</button></div>
  {/if}
  <Plane fit>
    <div class="sheet" style:width="{bounds.w}px" style:height="{bounds.h}px">
      <svg class="edges" width={bounds.w} height={bounds.h} aria-hidden="true">
        {#each edges as e (e.id)}<path d={e.d} class:on={e.on} />{/each}
      </svg>
      {#each nodes as { m, box } (m.id)}
        {#if m.id === chat.root}
          <span class="anchor" style:left="{box.x}px" style:top="{box.y}px"></span>
        {:else}
          <button type="button" class="node" class:mine={m.role === 'user'} class:on={onPath.has(m.id)} class:selected={selected === m.id}
            data-node={m.id} data-role={m.role} title={timeOf(m.at)}
            style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px"
            onclick={() => (selected = selected === m.id ? undefined : m.id)} ondblclick={() => onopen?.(m.id)}>
            <span class="head"><span class="role">{m.role === 'user' ? 'You' : m.model || 'Assistant'}</span>{#if !compact}<time>{timeOf(m.at)}</time>{/if}</span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <span class="text" style:-webkit-line-clamp={scale.lines}>{@html html(m)}</span>
          </button>
        {/if}
      {/each}
    </div>
  </Plane>
</div>

<style>
  .tree{position:relative;width:100%;height:100%;min-height:0;background:var(--bg);font-family:var(--sans)}
  .head-bar{position:absolute;top:8px;right:8px;z-index:1;background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:2px}
  .sheet{position:relative}
  .edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
  .edges path{fill:none;stroke:var(--rule);stroke-width:1.5}
  .edges path.on{stroke:var(--accent);stroke-width:2}
  .anchor{position:absolute;width:12px;height:12px;border-radius:50%;background:var(--rule)}
  .node{position:absolute;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;padding:8px 10px;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:9px;cursor:pointer;overflow:hidden;opacity:0.72;transition:opacity 120ms,border-color 120ms,box-shadow 120ms}
  .node :global(a){pointer-events:none}
  .node.mine{background:var(--soft)}
  .node.on{opacity:1;border-color:color-mix(in srgb, var(--accent) 45%, var(--rule))}
  .node:hover{opacity:1}
  .node.selected{opacity:1;border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)}
  .head{display:flex;align-items:baseline;gap:6px;font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .role{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  time{flex:none;text-transform:none;letter-spacing:0}
  .text{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;font-size:0.82rem;line-height:19px}
  .text :global(p),.text :global(ul),.text :global(ol),.text :global(h1),.text :global(h2),.text :global(h3),.text :global(pre),.text :global(blockquote){display:inline;margin:0;padding:0;font-size:inherit}
  .compact .node{padding:5px 8px;gap:2px;border-radius:7px}
  .compact .text{font-size:0.74rem;line-height:16px}
</style>
