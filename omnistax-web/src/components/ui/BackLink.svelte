<script lang="ts">
  /* The way back out of one thing to the list it was opened from, "‹ Practice",
     "‹ Conversations": a line of its own above what it leaves, read before it. */
  let { label, onclick }: { label: string; onclick: () => void } = $props();
</script>

<button type="button" class="back" {onclick}>
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
  <span>{label}</span>
</button>

<style>
  .back{display:inline-flex;align-items:center;gap:2px;margin:0 0 6px -4px;padding:2px 8px 2px 4px;border:0;border-radius:6px;background:none;color:var(--muted);font:inherit;font-size:0.82rem;cursor:pointer}
  .back svg{width:14px;height:14px}
  .back:hover{color:var(--ink);background:var(--soft)}
  .back:focus-visible{outline:2px solid var(--accent)}
</style>
