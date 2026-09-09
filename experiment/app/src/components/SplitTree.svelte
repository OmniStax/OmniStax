<script lang="ts">
  /* The arrangement of the document groups. A leaf draws one group; a split
     draws its children in a row or a column, each taking the share the layout
     gives it, with a grip between neighbours that carries share from one to the
     other. The component names itself, so a tree of any depth draws itself. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { groupIndex, resizeSplit, type SplitNode, type SplitPath } from '../lib/layout/model';
  import { FIG } from '../lib/fig/figlib';
  import DocGroup from './DocGroup.svelte';
  import SplitTree from './SplitTree.svelte';
  let { node, path = [], onPick }: { node: SplitNode; path?: SplitPath; onPick: (index: number, anchor: HTMLElement) => void } = $props();
  const l = $derived(layoutStore.layout);
  const MIN = 120;                             /* no group is dragged narrower or shorter than this many pixels */
  /* A subtree is known by its first group, which no other subtree can hold. */
  const nodeKey = (n: SplitNode): string => (n.type === 'leaf' ? n.group : nodeKey(n.children[0]));
  const sharesOf = (n: SplitNode): number[] => (n.type === 'leaf' ? [] : n.children.map((_, i) => n.sizes?.[i] ?? 1));
  const weights = $derived(sharesOf(node));
  const shared = (i: number, a: number, b: number): number[] => weights.map((w, j) => (j === i ? a : j === i + 1 ? b : w));

  /* Dragging the grip after child i: the two groups either side trade weight as
     the pointer travels, written live on their own boxes, and the layout hears
     of the new shares once, when the reader lets go. The axis is read from the
     container, because a narrow screen stacks even a row. */
  const drag = (e: PointerEvent, i: number) => {
    const grip = e.currentTarget as HTMLElement; e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const box = grip.parentElement; if (!box) return;
    const cells = Array.from(box.querySelectorAll<HTMLElement>(':scope > .cell'));
    const a = cells[i], b = cells[i + 1]; if (!a || !b) return;
    const column = getComputedStyle(box).flexDirection === 'column';
    const start = column ? e.clientY : e.clientX;
    const per = weights.reduce((x, y) => x + y, 0) / Math.max(column ? box.clientHeight : box.clientWidth, 1);
    const wa = weights[i], wb = weights[i + 1], floor = MIN * per;
    const low = floor - wa, high = wb - floor;
    let share = [wa, wb];
    const move = (ev: PointerEvent) => {
      const travel = ((column ? ev.clientY : ev.clientX) - start) * per;
      const d = low > high ? 0 : Math.max(low, Math.min(high, travel));
      share = [wa + d, wb - d];
      a.style.flex = `${share[0]} 1 0px`; b.style.flex = `${share[1]} 1 0px`;
    };
    const up = () => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up);
      layoutStore.apply((x) => resizeSplit(x, path, shared(i, share[0], share[1]))); FIG.redrawAll();
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  };
  /* A double click settles the argument: the two neighbours take equal shares. */
  const evenPair = (i: number) => {
    const mid = (weights[i] + weights[i + 1]) / 2;
    layoutStore.apply((x) => resizeSplit(x, path, shared(i, mid, mid))); FIG.redrawAll();
  };
</script>

{#if node.type === 'leaf'}
  {@const i = groupIndex(l, node.group)}
  {#if i >= 0}<DocGroup index={i} group={l.groups[i]} {onPick} />{/if}
{:else}
  <div class="split {node.dir}">
    {#each node.children as child, i (nodeKey(child))}
      {#if i > 0}
        <div class="grip" role="separator" aria-orientation={node.dir === 'row' ? 'vertical' : 'horizontal'} aria-label="Resize groups"
          onpointerdown={(e) => drag(e, i - 1)} ondblclick={() => evenPair(i - 1)}></div>
      {/if}
      <div class="cell" style:flex="{weights[i]} 1 0px">
        <SplitTree node={child} path={[...path, i]} {onPick} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .split{display:flex;flex:1;min-width:0;min-height:0}
  .split.row{flex-direction:row}
  .split.column{flex-direction:column}
  .cell{display:flex;min-width:0;min-height:0}
  .cell > :global(*){flex:1;min-width:0;min-height:0}
  /* The grip is a broad target with the rule between the groups drawn down the middle of it. */
  .grip{position:relative;flex:none;z-index:2}
  .grip::before{content:"";position:absolute;background:var(--rule)}
  .grip:hover::before,.grip:active::before{background:var(--muted)}
  .split.row > .grip{width:7px;cursor:col-resize}
  .split.row > .grip::before{top:0;bottom:0;left:3px;width:1px}
  .split.row > .grip:hover::before,.split.row > .grip:active::before{width:2px}
  .split.column > .grip{height:7px;cursor:row-resize}
  .split.column > .grip::before{left:0;right:0;top:3px;height:1px}
  .split.column > .grip:hover::before,.split.column > .grip:active::before{height:2px}
  /* Narrow screens have no room for columns of documents: everything stacks, and every grip works up and down. */
  @media (max-width:900px){
    .split.row,.split.column{flex-direction:column}
    .split.row > .grip{width:auto;height:7px;cursor:row-resize}
    .split.row > .grip::before{top:3px;left:0;right:0;width:auto;height:1px}
    .split.row > .grip:hover::before,.split.row > .grip:active::before{width:auto;height:2px}
  }
</style>
