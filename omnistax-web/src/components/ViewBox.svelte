<script lang="ts">
  import { layoutStore } from '../lib/layout/store.svelte';
  import { closeItem } from '../lib/layout/model';
  import { draggable } from '../lib/layout/drag.svelte';
  import { VIEW_TITLE } from '../lib/icons';
  import { viewKindOf } from '../lib/types/ids';
  import View from './views/View.svelte';
  let { itemKey }: { itemKey: string } = $props();
  const kind = $derived(viewKindOf(itemKey) ?? '');
</script>

<div class="vbox" data-item={itemKey}>
  <header use:draggable={{ key: itemKey, from: null }}>
    <span class="eyebrow">{VIEW_TITLE[kind]}</span>
    <button type="button" class="x" title="Close" onclick={() => layoutStore.apply((x) => closeItem(x, itemKey))}>×</button>
  </header>
  <div class="body"><View item={itemKey} /></div>
</div>

<style>
  .vbox{flex:1;min-height:0;display:flex;flex-direction:column}
  header{display:flex;align-items:center;gap:4px;padding:6px 6px 6px 12px;cursor:grab;user-select:none;position:sticky;top:0;background:var(--bg);z-index:2}
  header .eyebrow{flex:1;margin:0}
  header button{width:22px;height:22px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0;font-size:14px;line-height:1}
  header button:hover{background:var(--soft2);color:var(--ink)}
  header button:focus-visible{outline:2px solid var(--accent)}
  .body{flex:1;min-height:0;overflow:auto;padding:2px 12px 16px 12px}
</style>
