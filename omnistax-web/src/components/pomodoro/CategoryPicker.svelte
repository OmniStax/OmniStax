<script lang="ts">
  import { CATEGORY_COLORS, type Category } from '../../lib/pomodoro/model';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  let { picked, onpick, label = 'Categories' }: { picked: readonly string[]; onpick: (ids: readonly string[]) => void; label?: string } = $props();
  const cats = $derived(pomodoro.categories);
  const chosen = $derived(cats.filter((c) => picked.includes(c.id)));
  let open = $state(false);
  let adding = $state(false);
  let name = $state('');
  let colour = $state(CATEGORY_COLORS[0]);
  let root = $state<HTMLDivElement | null>(null);

  const toggle = (c: Category): void => onpick(picked.includes(c.id) ? picked.filter((id) => id !== c.id) : [...picked, c.id]);
  const make = (): void => {
    const id = pomodoro.addCategory(name, colour);
    if (id) onpick([...picked, id]);
    name = ''; adding = false; open = false; colour = CATEGORY_COLORS[0];
  };
  $effect(() => {
    if (!open) return;
    const away = (e: MouseEvent): void => { if (root && !root.contains(e.target as Node)) { open = false; adding = false; } };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  });
</script>

<div class="picker" bind:this={root}>
  <button type="button" class="head" aria-expanded={open} onclick={() => (open = !open)}>
    {#if chosen.length}
      <span class="tags">
        {#each chosen as c (c.id)}
          <span class="tag" style="--hue:{c.color}">{c.name}</span>
        {/each}
      </span>
    {:else}<span class="none">{label}</span>{/if}
    <span class="caret" aria-hidden="true">▾</span>
  </button>
  {#if open}
    <div class="list" role="group" aria-label={label}>
      {#each cats as c (c.id)}
        <label class="row" style="--hue:{c.color}" class:on={picked.includes(c.id)}>
          <input type="checkbox" checked={picked.includes(c.id)} onchange={() => toggle(c)} />
          <span class="dot" aria-hidden="true"></span>
          <span class="name">{c.name}</span>
        </label>
      {/each}
      {#if !cats.length && !adding}<p class="empty">No categories yet.</p>{/if}
      {#if adding}
        <form class="new" onsubmit={(e) => { e.preventDefault(); make(); }}>
          <!-- svelte-ignore a11y_autofocus -->
          <input class="input name-field" bind:value={name} type="text" autocomplete="off" placeholder="Category name" autofocus />
          <div class="grid">
            {#each CATEGORY_COLORS as c (c)}
              <button type="button" class="swatch" class:on={colour === c} style="--hue:{c}" aria-label="Colour {c}" onclick={() => (colour = c)}></button>
            {/each}
          </div>
          <div class="acts">
            <button type="submit" class="btn primary sm">Add</button>
            <button type="button" class="btn ghost sm" onclick={() => { adding = false; name = ''; }}>Cancel</button>
          </div>
        </form>
      {:else}
        <button type="button" class="add" onclick={() => (adding = true)}>New category…</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .picker{position:relative;min-width:0}
  .head{display:flex;align-items:center;gap:6px;width:100%;min-height:30px;font:inherit;font-size:0.8rem;text-align:left;padding:3px 10px;border:0;border-radius:7px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--rule);color:var(--ink);cursor:pointer}
  .head:hover{background:var(--soft)}
  .tags{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0}
  .tag{font-size:0.72rem;padding:1px 6px;border-radius:999px;border:1px solid var(--hue);color:var(--hue);background:color-mix(in srgb,var(--hue) 14%,transparent)}
  .none{flex:1;color:var(--muted)}
  .caret{color:var(--muted);font-size:0.7rem}
  .list{position:absolute;z-index:40;top:calc(100% + 4px);left:0;min-width:100%;max-width:min(260px,80vw);max-height:280px;overflow:auto;display:flex;flex-direction:column;gap:2px;padding:6px;border:1px solid var(--rule);border-radius:8px;background:var(--panel);box-shadow:0 6px 20px rgba(0,0,0,.18)}
  .row{display:flex;align-items:center;gap:7px;font-size:0.8rem;padding:3px 5px;border-radius:5px;cursor:pointer;color:var(--ink)}
  .row:hover{background:var(--soft)}
  .row.on{background:color-mix(in srgb,var(--hue) 13%,transparent);color:var(--hue)}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--hue);flex:none}
  .name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .empty{margin:2px 5px;font-size:0.78rem;color:var(--muted)}
  .add{font:inherit;font-size:0.78rem;text-align:left;padding:4px 5px;margin-top:2px;border:0;border-top:1px solid var(--rule);border-radius:0;background:none;color:var(--muted);cursor:pointer}
  .add:hover{color:var(--accent)}
  .new{display:flex;flex-direction:column;gap:6px;padding:6px 5px 2px;border-top:1px solid var(--rule);margin-top:2px}
  .name-field{height:28px;font-size:0.8rem}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
  .swatch{width:100%;aspect-ratio:1;border-radius:5px;border:2px solid transparent;background:var(--hue);cursor:pointer;padding:0}
  .swatch.on{border-color:var(--ink);box-shadow:0 0 0 1px var(--panel) inset}
  .acts{display:flex;gap:6px}
  .head:focus-visible,.add:focus-visible{outline:2px solid var(--accent)}
</style>
