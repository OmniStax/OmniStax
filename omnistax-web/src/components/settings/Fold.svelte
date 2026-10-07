<script lang="ts" module>
  /* Which top-level settings sections are folded, remembered in this browser. */
  const KEY = 'omnistax.settings.folded';
  const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
  let folded = $state.raw<ReadonlySet<string>>(new Set(read()));
  const setFolded = (name: string, on: boolean): void => {
    const s = new Set(folded); if (on) s.add(name); else s.delete(name); folded = s;
    try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* private window */ }
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  /* A search unfolds everything without touching what the reader folded. */
  let { name, show = true, force = false, children }: { name: string; show?: boolean; force?: boolean; children: Snippet } = $props();
</script>

<details hidden={!show} open={force || !folded.has(name)} ontoggle={(e) => { if (!force) setFolded(name, !e.currentTarget.open); }}>
  <summary><h3>{name}</h3></summary>
  <div class="body">{@render children()}</div>
</details>

<style>
  summary{display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none;padding-bottom:6px;border-bottom:1px solid var(--rule);user-select:none}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸";color:var(--muted);font-size:0.8rem;width:10px;transition:transform .15s}
  details[open]>summary::before{transform:rotate(90deg)}
  summary:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:4px}
  h3{font-size:0.95rem;font-weight:600;margin:0}
  .body{display:flex;flex-direction:column;gap:8px;padding-top:8px}
</style>
