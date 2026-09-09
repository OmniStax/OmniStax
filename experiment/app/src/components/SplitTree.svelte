<script lang="ts">
  /* The arrangement of the document groups. A leaf draws one group; a split
     draws its children in a row or a column, each taking an equal share, with a
     single rule between neighbours. The component names itself, so a tree of
     any depth draws itself. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { groupIndex, type SplitNode } from '../lib/layout/model';
  import DocGroup from './DocGroup.svelte';
  import SplitTree from './SplitTree.svelte';
  let { node, onPick }: { node: SplitNode; onPick: (index: number, anchor: HTMLElement) => void } = $props();
  const l = $derived(layoutStore.layout);
  /* A subtree is known by its first group, which no other subtree can hold. */
  const nodeKey = (n: SplitNode): string => (n.type === 'leaf' ? n.group : nodeKey(n.children[0]));
</script>

{#if node.type === 'leaf'}
  {@const i = groupIndex(l, node.group)}
  {#if i >= 0}<DocGroup index={i} group={l.groups[i]} {onPick} />{/if}
{:else}
  <div class="split {node.dir}">
    {#each node.children as child (nodeKey(child))}<SplitTree node={child} {onPick} />{/each}
  </div>
{/if}

<style>
  .split{display:flex;flex:1;min-width:0;min-height:0}
  .split.row{flex-direction:row}
  .split.column{flex-direction:column}
  .split > :global(*){flex:1;min-width:0;min-height:0}
  .split.row > :global(* + *){border-left:1px solid var(--rule)}
  .split.column > :global(* + *){border-top:1px solid var(--rule)}
  /* Narrow screens have no room for columns of documents: everything stacks. */
  @media (max-width:900px){
    .split{flex-direction:column}
    .split.row > :global(* + *){border-left:0;border-top:1px solid var(--rule)}
  }
</style>
