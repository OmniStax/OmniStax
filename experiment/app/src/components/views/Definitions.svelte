<script lang="ts">
  /* Symbols and glossary terms, the focused section first; the colour legend at the end. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { getContext as getCtx } from 'svelte';
  import type { SectionId as ScopeSection } from '../../lib/types/ids';
  import { settings } from '../../lib/settings/store.svelte';
  import { sectionId } from '../../lib/types/ids';
  import { FIG } from '../../lib/fig/figlib';
  const scoped = getCtx<() => ScopeSection>('scope');
  const sec = $derived(scoped());
  const vars = $derived(Object.values(registry.chapters).flatMap((c) => c.formulas.variables));
  const terms = $derived(Object.values(registry.chapters).flatMap((c) => c.formulas.glossary));
  const order = $derived([...new Set([...vars.map((v) => v.section), ...terms.map((t) => t.section)])].sort((a, b) => (a === sec ? -1 : b === sec ? 1 : a.localeCompare(b, undefined, { numeric: true }))));
  const titleOf = (s: string) => registry.entry(sectionId(s))?.title ?? '';
  const sym = (node: HTMLElement, s: string) => { FIG.tex(node, registry.manifest.symbols[s] ?? s); return {}; };
  /* the legend: the global tier, then the types the focused section's chapter binds */
  const legend = $derived.by(() => { const m = registry.manifest, bound = registry.chapterOf(sectionId(sec))?.colors ?? {}; return Object.entries(m.types).filter(([k, t]) => t.light || k in bound).map(([k, t]) => [k, t.label] as const); });
</script>

{#snippet block(s: string)}
  {@const vs = vars.filter((v) => v.section === s)}
  {@const ts = terms.filter((t) => t.section === s)}
  {#if vs.length}
    <div class="eyebrow">{s} · symbols</div>
    <ul class="defs">{#each vs as v (v.sym)}<li><span class="sym" use:sym={v.sym}></span><span>{v.meaning}<span class="unit">{v.unit}</span></span></li>{/each}</ul>
  {/if}
  {#if ts.length}
    <div class="eyebrow">{s} · terms</div>
    <ul class="defs terms">{#each ts as t (t.term)}<li><span class="term">{t.term}</span><span>{t.definition}</span></li>{/each}</ul>
  {/if}
{/snippet}

{#each order as s (s)}
  {#if s === sec}{@render block(s)}{:else}<details class="other"><summary>{s} · {titleOf(s)}</summary>{@render block(s)}</details>{/if}
{/each}
{#if settings.colorCoding}
  <div class="legend">{#each legend as [k, label] (k)}<i style:background="var(--c-{k})"></i><span>{label}</span>{/each}</div>
{/if}

<style>
  .defs{list-style:none;padding:0;margin:0}
  .defs li{display:grid;grid-template-columns:3.2em 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:0.82rem;align-items:baseline}
  .defs.terms li{grid-template-columns:8em 1fr}
  .sym :global(.katex){font-size:1.15em}
  .unit{font-family:var(--mono);font-size:0.72rem;color:var(--muted);margin-left:4px}
  .term{font-weight:600}
  .legend{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:0.8rem;margin-top:14px;padding-top:12px;border-top:1px solid var(--rule)}
  .legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle}
  :global(.view-pane) .defs li{font-size:0.95rem}
</style>
