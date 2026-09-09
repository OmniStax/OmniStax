<script lang="ts">
  /* One collapsible box in a sidebar holding a view. Its header drags. */
  import { layoutStore } from '../lib/layout/store.svelte';
  import { toggleCollapsed, closeItem } from '../lib/layout/model';
  import { draggable } from '../lib/layout/drag.svelte';
  import { VIEW_TITLE } from '../lib/icons';
  import View from './views/View.svelte';
  let { itemKey }: { itemKey: string } = $props();
  const kind = $derived(itemKey.slice(5));
  const collapsed = $derived(layoutStore.layout.collapsed.includes(itemKey));
</script>

<div class="vbox" class:collapsed data-item={itemKey}>
  <header use:draggable={{ key: itemKey, from: null }}>
    <button type="button" class="chev" title="Collapse" onclick={() => layoutStore.apply((x) => toggleCollapsed(x, itemKey))}>▾</button>
    <span class="eyebrow">{VIEW_TITLE[kind]}</span>
    <button type="button" class="x" title="Close" onclick={() => layoutStore.apply((x) => closeItem(x, itemKey))}>×</button>
  </header>
  <div class="body" hidden={collapsed}><View {kind} /></div>
</div>

<style>
  .vbox{border-bottom:1px solid var(--rule);flex:none}
  header{display:flex;align-items:center;gap:4px;padding:6px 6px 6px 12px;cursor:grab;user-select:none;position:sticky;top:0;background:var(--bg);z-index:2}
  header .eyebrow{flex:1;margin:0}
  header button{width:22px;height:22px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0;font-size:14px;line-height:1}
  header button:hover{background:var(--soft2);color:var(--ink)}
  header button:focus-visible{outline:2px solid var(--accent)}
  .chev{transition:transform .15s}
  .collapsed .chev{transform:rotate(-90deg)}
  .body{padding:2px 12px 16px 12px}
  .body[hidden]{display:none}
</style>
