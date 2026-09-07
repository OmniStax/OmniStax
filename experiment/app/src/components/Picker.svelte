<script lang="ts">
  /* The book's sections, to open one as a tab in a chosen group. */
  import { registry } from '../lib/sections/registry.svelte';
  import { openDoc } from '../lib/sections/nav.svelte';
  import { sectionId } from '../lib/types/ids';
  let { open = $bindable(false), group = 0, anchor = null as HTMLElement | null }: { open?: boolean; group?: number; anchor?: HTMLElement | null } = $props();
  const pos = $derived.by(() => { if (!anchor) return { left: 52, top: 12 }; const r = anchor.getBoundingClientRect(); return { left: Math.max(8, Math.min(r.left, window.innerWidth - 360)), top: r.bottom + 4 }; });
  const pick = (sec: string, doc: 'text' | 'exercises') => { open = false; openDoc(sectionId(sec), doc, group); };
</script>

{#if open}
  <div class="popover picker" style:left="{pos.left}px" style:top="{pos.top}px" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-label="Open a section">
    <div class="eyebrow">{registry.manifest.title}</div>
    {#each registry.manifest.chapters as ch (ch.dir)}
      <div class="ch">Chapter {ch.id} · {ch.title}</div>
      {#each ch.sections as s (s.id)}
        <div class="row" class:off={!s.built}>
          <span class="ttl">{s.id} {s.title}</span>
          {#if s.built}
            <button type="button" class="btn-sm" onclick={() => pick(s.id, 'text')}>Text</button>
            <button type="button" class="btn-sm" onclick={() => pick(s.id, 'exercises')}>Exercises</button>
          {:else}<span class="soon">not built yet</span>{/if}
        </div>
      {/each}
    {/each}
  </div>
{/if}

<style>
  .popover{position:fixed;z-index:40;background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:14px 16px;font-family:var(--sans);font-size:0.86rem;display:flex;flex-direction:column;gap:4px;box-shadow:0 8px 30px rgba(0,0,0,.18);min-width:320px;max-height:70vh;overflow:auto}
  .ch{font-weight:600;margin:8px 0 2px}
  .row{display:flex;align-items:center;gap:8px;padding:3px 0}
  .row.off{color:var(--muted)}
  .ttl{flex:1}
  .soon{font-size:0.75rem;color:var(--muted)}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer}
  .btn-sm:hover{background:var(--soft)}
</style>
