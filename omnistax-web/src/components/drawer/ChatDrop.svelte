<script lang="ts">
  /* Where a chat is sent, and how: a drawing of the reader's own or a new one,
     and the live tree or a copy that belongs to the drawing. */
  import { drawings } from '../../lib/drawer/store.svelte';
  import type { DrawingId } from '../../lib/types/ids';
  import type { ChatDropChoice } from '../../lib/drawer/chatdrop';

  let { name, onpick, oncancel }: { name: string; onpick: (c: ChatDropChoice) => void; oncancel: () => void } = $props();

  const rows = $derived([...drawings.rows].sort((a, b) => b.updated - a.updated));
  let target = $state<DrawingId | null>(null);
  let plain = $state(false);

  const onkey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); oncancel(); }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onpick({ drawing: target, plain }); }
  };
  const takeFocus = (node: HTMLElement) => { node.focus(); };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="scrim" onclick={oncancel}>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Send to drawing" tabindex="-1"
    onclick={(e) => e.stopPropagation()} onkeydown={onkey} use:takeFocus>
    <h2>Send “{name}” to a drawing</h2>
    <div class="list" role="listbox" aria-label="Drawing">
      <button type="button" role="option" aria-selected={target === null} class:on={target === null} onclick={() => (target = null)}>New drawing</button>
      {#each rows as r (r.id)}
        <button type="button" role="option" aria-selected={target === r.id} class:on={target === r.id} onclick={() => (target = r.id)}>{r.name}</button>
      {/each}
    </div>
    <div class="modes" role="radiogroup" aria-label="How">
      <label><input type="radio" name="how" checked={!plain} onchange={() => (plain = false)} /> Referenced <span>the live tree</span></label>
      <label><input type="radio" name="how" checked={plain} onchange={() => (plain = true)} /> Plain <span>cards and connectors</span></label>
    </div>
    <div class="acts">
      <button type="button" class="chip" onclick={oncancel}>Cancel</button>
      <button type="button" class="chip go" onclick={() => onpick({ drawing: target, plain })}>Send</button>
    </div>
  </div>
</div>

<style>
  .scrim{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgb(0 0 0 / .28);font-family:var(--sans)}
  .sheet{width:min(360px,calc(100vw - 32px));max-height:80vh;display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--rule);border-radius:10px;background:var(--bg);color:var(--ink);box-shadow:0 8px 30px rgb(0 0 0 / .25);outline:none}
  h2{margin:0;font-size:0.95rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .list{display:flex;flex-direction:column;gap:2px;max-height:40vh;overflow:auto;border:1px solid var(--rule);border-radius:6px;padding:3px;background:var(--panel)}
  .list button{font:inherit;font-size:0.85rem;text-align:left;color:var(--ink);background:transparent;border:0;border-radius:4px;padding:4px 8px;cursor:pointer}
  .list button:hover{background:var(--soft)}
  .list button.on{background:var(--soft2);color:var(--accent)}
  .modes{display:flex;flex-direction:column;gap:4px;font-size:0.85rem}
  .modes span{color:var(--muted);font-size:0.78rem}
  .acts{display:flex;justify-content:flex-end;gap:6px}
  .chip{font:inherit;font-size:0.8rem;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:4px 12px;cursor:pointer}
  .chip.go{border-color:var(--accent);color:var(--accent)}
</style>
