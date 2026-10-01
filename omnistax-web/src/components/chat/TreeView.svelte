<script lang="ts">
  import Plane, { type PlaneRect } from '../ui/Plane.svelte';
  import { layoutTree, boundsOf, meets, type Box } from '../../lib/tree/layout';
  import { childrenOf, pathTo, type Chat, type Message, type MessageId } from '../../lib/chat/model';
  import { ANCHOR, NODE, NODE_COMPACT, nodeSize, opening, openSize, speakerOf, timeOf } from '../../lib/chat/tree';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import { chatBooks, chatResolver } from '../../lib/chat/resolve';

  type Ids = ReadonlySet<MessageId>;

  let { chat, compact = false, root, selection = $bindable(new Set()), onopen }:
    { chat: Chat; compact?: boolean; root?: MessageId; selection?: Ids; onopen?: (id: MessageId) => void } = $props();

  let expanded = $state.raw<Ids>(new Set());
  let measured = $state.raw<Readonly<Record<string, number>>>({});

  const scale = $derived(compact ? NODE_COMPACT : NODE);
  const top = $derived(root ?? chat.root);
  const kidsOf = (id: MessageId): readonly MessageId[] => childrenOf(chat, id).map((m) => m.id);
  const sizeOf = (id: MessageId) => {
    const m = chat.messages[id];
    if (id === chat.root || !m) return ANCHOR;
    return expanded.has(id) ? openSize(m, scale, measured[id]) : nodeSize(m, scale);
  };
  const boxes = $derived(layoutTree(top, kidsOf, sizeOf, compact ? { x: 16, y: 22 } : { x: 24, y: 32 }));
  const bounds = $derived(boundsOf(boxes.values()));
  const nodes = $derived([...boxes].flatMap(([id, box]) => { const m = chat.messages[id]; return m ? [{ m, box }] : []; }));
  const ids = $derived(nodes.flatMap(({ m }) => (m.id === chat.root ? [] : [m.id])));
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
  const html = (m: Message): string => (render === null ? '' : render(expanded.has(m.id) ? m.text.trim() : opening(m.text, scale.chars), chatResolver()));

  /* ── selection ─────────────────────────────────────────────────────────── */

  const toggled = (s: Ids, id: MessageId): Ids => new Set(s.has(id) ? [...s].filter((x) => x !== id) : [...s, id]);
  const pick = (e: MouseEvent, id: MessageId): void => {
    if (e.ctrlKey || e.metaKey) { selection = toggled(selection, id); return; }
    selection = selection.size === 1 && selection.has(id) ? new Set() : new Set([id]);
  };
  const lassoed = (r: PlaneRect, add: boolean): void => {
    const hit = nodes.filter(({ m, box }) => m.id !== chat.root && meets(r, box)).map(({ m }) => m.id);
    selection = new Set([...(add ? selection : []), ...hit]);
  };

  /* ── expanding ─────────────────────────────────────────────────────────── */

  const allOpen = $derived(ids.length > 0 && ids.every((id) => expanded.has(id)));
  const pickedOpen = $derived(selection.size > 0 && [...selection].every((id) => expanded.has(id)));
  const expandPicked = (): void => {
    expanded = pickedOpen ? new Set([...expanded].filter((id) => !selection.has(id))) : new Set([...expanded, ...selection]);
  };
  const expandAll = (): void => { expanded = allOpen ? new Set() : new Set(ids); };

  /* An expanded node's text is measured as drawn, and the tree laid out again
     whenever a height changes. */
  const measure = (node: HTMLElement, id: MessageId) => {
    const ro = new ResizeObserver(() => {
      const h = node.offsetHeight;
      if (h > 0 && measured[id] !== h) measured = { ...measured, [id]: h };
    });
    ro.observe(node);
    return { destroy: () => ro.disconnect() };
  };
  const math = (node: HTMLElement, _html: string) => {
    chatBooks.setMath(node);
    return { update: () => chatBooks.setMath(node) };
  };
</script>

<div class="tree" class:compact data-tree>
  {#if !compact}
    <div class="head-bar">
      <button type="button" class="btn ghost sm" disabled={selection.size === 0} onclick={expandPicked}>{pickedOpen ? 'Collapse' : 'Expand'}</button>
      <button type="button" class="btn ghost sm" disabled={ids.length === 0} onclick={expandAll}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
    </div>
  {/if}
  <Plane fit onlasso={lassoed} onblank={() => (selection = new Set())}>
    <div class="sheet" style:width="{bounds.w}px" style:height="{bounds.h}px">
      <svg class="edges" width={bounds.w} height={bounds.h} aria-hidden="true">
        {#each edges as e (e.id)}<path d={e.d} class:on={e.on} />{/each}
      </svg>
      {#each nodes as { m, box } (m.id)}
        {#if m.id === chat.root}
          <span class="anchor" style:left="{box.x}px" style:top="{box.y}px"></span>
        {:else}
          <button type="button" class="node" class:mine={m.role === 'user'} class:on={onPath.has(m.id)} class:selected={selection.has(m.id)}
            class:open={expanded.has(m.id)} data-node={m.id} data-role={m.role} title={timeOf(m.at)}
            style:left="{box.x}px" style:top="{box.y}px" style:width="{box.w}px" style:height="{box.h}px"
            onclick={(e) => pick(e, m.id)} ondblclick={() => onopen?.(m.id)}>
            <span class="head"><span class="role">{speakerOf(m)}</span>{#if !compact}<time>{timeOf(m.at)}</time>{/if}</span>
            {#if expanded.has(m.id)}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <span class="text full" use:measure={m.id} use:math={html(m)}>{@html html(m)}</span>
            {:else}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <span class="text" style:-webkit-line-clamp={scale.lines} use:math={html(m)}>{@html html(m)}</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  </Plane>
</div>

<style>
  .tree{position:relative;width:100%;height:100%;min-height:0;background:var(--bg);font-family:var(--sans)}
  .head-bar{position:absolute;top:8px;right:8px;z-index:1;display:flex;gap:2px;background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:2px}
  .sheet{position:relative}
  .edges{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}
  .edges path{fill:none;stroke:var(--rule);stroke-width:1.5}
  .edges path.on{stroke:var(--accent);stroke-width:2}
  .anchor{position:absolute;width:12px;height:12px;border-radius:50%;background:var(--rule)}
  .node{position:absolute;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;padding:8px 10px;text-align:left;font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:9px;cursor:pointer;overflow:hidden;opacity:0.72;transition:opacity 120ms,border-color 120ms,box-shadow 120ms}
  .node :global(a){pointer-events:none}
  .node.mine{background:var(--soft)}
  .node.on{opacity:1;border-color:color-mix(in srgb, var(--accent) 45%, var(--rule))}
  .node:hover,.node.open{opacity:1}
  .node.selected{opacity:1;border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)}
  .head{flex:none;display:flex;align-items:baseline;gap:6px;font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .role{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  time{flex:none;text-transform:none;letter-spacing:0}
  .text{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;font-size:0.82rem;line-height:19px}
  .text:not(.full) :global(:is(p,ul,ol,h1,h2,h3,pre,blockquote)){display:inline;margin:0;padding:0;font-size:inherit}
  .text.full{display:block;flex:none;overflow:visible}
  .text.full :global(:is(p,ul,ol,pre,blockquote)){margin:0 0 6px}
  .text.full :global(:is(ul,ol)){padding-left:18px}
  .text.full :global(:is(h1,h2,h3)){margin:6px 0 4px;font-size:0.9rem}
  .text.full :global(pre){overflow:auto;padding:6px 8px;background:var(--soft);border-radius:5px;font-size:0.76rem}
  .text.full :global(:last-child){margin-bottom:0}
  .compact .node{padding:5px 8px;gap:2px;border-radius:7px}
  .compact .text{font-size:0.74rem;line-height:16px}
</style>
