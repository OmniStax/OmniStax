<script lang="ts">
  /* The search in the rail: one box over every textbook of the library. Under
     the box the reader chooses what to look for — everything, or only the
     concepts, the definitions, the formulas or the prose — and the hits stand
     below, book by book, the things a book names before the prose that merely
     mentions the words. A hit is gone to with a click, or with Enter on the
     marked one: in the book being read it opens the page as a tab and lands on
     the thing; in another book it is a link out to that page. The library is
     read the first time this view opens and kept for the session. */
  import { onMount } from 'svelte';
  import { searchStore } from '../../lib/search/store.svelte';
  import { FILTERS, FILTER_LABEL, NOTHING, search, type Filter, type Hit } from '../../lib/search/model';
  import { goHit } from '../../lib/search/go';
  import { registry } from '../../lib/sections/registry.svelte';
  import { pageLabel } from '../../lib/content/roles';
  import { ICON } from '../../lib/icons';
  import { FIG } from '../../lib/fig/figlib';
  import { mathHtml } from '../actions/math';
  let query = $state('');
  let filter = $state<Filter>('all');
  let sel = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  const corpora = $derived(searchStore.loaded);
  const found = $derived(query.trim() ? search(query, corpora, filter) : NOTHING);
  const hits = $derived(found.hits);
  /* The hits by book, in the order the books were read, each book named where more than one has anything. */
  const byBook = $derived(corpora.map((c) => ({ book: c.book, title: c.title, urls: c.urls, hits: hits.map((h, i) => ({ h, i })).filter((x) => x.h.book === c.book) })).filter((b) => b.hits.length > 0));
  const failed = $derived(searchStore.books.filter((b) => searchStore.status[b] === 'failed'));
  $effect(() => { query; filter; sel = 0; });
  onMount(() => { void searchStore.loadAll(); input?.focus(); });
  const go = (i: number): void => { const h = hits[i]; if (!h) return; goHit(h, corpora.find((c) => c.book === h.book)?.urls ?? {}); };
  const move = (d: 1 | -1): void => { const n = hits.length; if (n) sel = (((sel + d) % n) + n) % n; };
  /* The keys stop here, so the chords the shell listens for stay quiet while the reader types. */
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); query = ''; return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  };
  /* The marked row stays in sight as the arrows walk past the edge of the list. */
  $effect(() => {
    const r = list?.querySelector<HTMLElement>(`[data-hit="${sel}"]`); if (!r) return;
    r.scrollIntoView({ block: 'nearest' });
  });
  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
  /* A symbol is set from the book's own table where this is the book being read; another book's is set as it is keyed. */
  const sym = (node: HTMLElement, v: { readonly book: string; readonly sym: string }) => { const set = (x: typeof v) => FIG.tex(node, x.book === registry.manifest.id ? registry.manifest.symbols[x.sym] ?? x.sym : x.sym); set(v); return { update: set }; };
  const KIND: Readonly<Record<Hit['kind'], string>> = { concept: 'concept', definition: 'definition', formula: 'formula', text: 'text' };
  const where = (h: Hit): string => h.kind === 'text' ? pageLabel(h.page) : h.kind === 'concept' ? h.concept.section : h.kind === 'formula' ? h.equation.section : h.def.kind === 'symbol' ? h.def.symbol.section : h.def.term.section;
</script>

<div class="search">
  <div class="box">
    <span class="glyph" aria-hidden="true">{@html ICON.search}</span>
    <input bind:this={input} bind:value={query} type="search" spellcheck="false" autocomplete="off" aria-label="Search every textbook" placeholder="Search every textbook…" onkeydown={onKey} />
  </div>
  <div class="filters" role="radiogroup" aria-label="What to look for">
    {#each FILTERS as f (f)}
      <button type="button" class="chip" class:on={filter === f} role="radio" aria-checked={filter === f} onclick={() => (filter = f)}>{FILTER_LABEL[f]}</button>
    {/each}
  </div>
  {#if searchStore.busy}<div class="status">Reading the library…</div>
  {:else if failed.length}<div class="status bad">Could not read all of {failed.map((b) => searchStore.corpora[b]?.title || b).join(', ')}.</div>{/if}
  {#if !query.trim()}
    <div class="hint">Every textbook of the library: its text, its concepts, its definitions and its formulas.</div>
  {:else if !hits.length && !searchStore.busy}
    <div class="hint">Nothing matches.</div>
  {:else}
    <div class="hits" bind:this={list}>
      {#each byBook as b (b.book)}
        {#if byBook.length > 1 || b.book !== registry.manifest.id}<div class="eyebrow book">{b.title}</div>{/if}
        {#each b.hits as { h, i } (i)}
          <button type="button" class="hit k-{h.kind}" class:sel={i === sel} data-hit={i} onmousemove={() => (sel = i)} onclick={() => go(i)}>
            {#if h.kind === 'text'}
              <span class="where">{where(h)}{#if h.head} › {h.head}{/if}</span>
              <span class="line">{#each h.excerpt as p}{#if p.hit}<b>{p.t}</b>{:else}{p.t}{/if}{/each}</span>
            {:else if h.kind === 'concept'}
              <span class="where">{#if filter === 'all'}<i class="kind">{KIND[h.kind]}</i>{/if}{where(h)} · {h.concept.kind}</span>
              <span class="line name" use:mathHtml={h.concept.name}></span>
              {#if h.concept.status === 'built' && h.concept.why}<span class="line why">{h.concept.why}</span>{/if}
            {:else if h.kind === 'formula'}
              <span class="where">{#if filter === 'all'}<i class="kind">{KIND[h.kind]}</i>{/if}{where(h)}{#if h.equation.condition} · {h.equation.condition}{/if}</span>
              <span class="line eq" use:tex={h.equation.tex}></span>
            {:else if h.def.kind === 'symbol'}
              <span class="where">{#if filter === 'all'}<i class="kind">symbol</i>{/if}{where(h)}</span>
              <span class="line"><span class="sym" use:sym={{ book: h.book, sym: h.def.symbol.sym }}></span> {h.def.symbol.meaning}{#if h.def.symbol.unit} <span class="unit">{h.def.symbol.unit}</span>{/if}</span>
            {:else}
              <span class="where">{#if filter === 'all'}<i class="kind">term</i>{/if}{where(h)}</span>
              <span class="line"><span class="term">{h.def.term.term}</span> {h.def.term.definition}</span>
            {/if}
          </button>
        {/each}
      {/each}
      {#if found.cut > 0}<div class="hint">…and {found.cut} more in the text{#if filter === 'all'}: choose Text to see them{/if}.</div>{/if}
    </div>
  {/if}
</div>

<style>
  .search{display:flex;flex-direction:column;gap:8px;font-family:var(--sans)}
  .box{display:flex;align-items:center;gap:6px;padding:0 8px;border:1px solid var(--rule);border-radius:6px;background:var(--panel)}
  .box:focus-within{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent)}
  .glyph{flex:none;display:grid;place-items:center;color:var(--muted)}
  .glyph :global(svg){width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  input{flex:1;min-width:0;border:0;padding:6px 0;font:inherit;font-size:0.84rem;background:transparent;color:var(--ink);outline:none}
  input::placeholder{color:var(--muted)}
  input::-webkit-search-cancel-button{appearance:none}
  /* what to look for, as a row of chips; the chosen one is inked */
  .filters{display:flex;flex-wrap:wrap;gap:4px}
  .chip{font:inherit;font-size:0.72rem;padding:2px 8px;border:1px solid var(--rule);border-radius:999px;background:transparent;color:var(--muted);cursor:pointer}
  .chip:hover{color:var(--ink);background:var(--soft)}
  .chip.on{color:var(--ink);border-color:var(--ink);background:var(--soft2)}
  .chip:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .status{font-size:0.76rem;color:var(--muted)}
  .status.bad{color:var(--bad)}
  .hint{font-size:0.78rem;color:var(--muted);line-height:1.45;padding:4px 0}
  .hits{display:flex;flex-direction:column;gap:2px;min-width:0}
  .book{margin:8px 0 2px}
  .hit{display:flex;flex-direction:column;gap:2px;width:100%;min-width:0;text-align:left;font:inherit;padding:5px 8px;border:0;border-radius:5px;background:transparent;color:var(--ink);cursor:pointer}
  .hit:hover,.hit.sel{background:var(--soft)}
  .hit:focus-visible{outline:2px solid var(--accent)}
  .where{font-size:0.7rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .kind{display:inline-block;font-style:normal;text-transform:uppercase;letter-spacing:0.06em;font-size:0.62rem;padding:0 5px;margin-right:6px;border-radius:9px;background:var(--soft);color:var(--muted)}
  .line{font-size:0.8rem;line-height:1.4;overflow-wrap:anywhere}
  .line b{font-weight:700;color:var(--ink);background:color-mix(in srgb,var(--warm) 22%,transparent);border-radius:2px}
  .name{font-weight:600}
  /* a concept's why and a term's definition are cut to a few lines; the page has the rest */
  .why{color:var(--muted);font-size:0.74rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .eq :global(.katex){font-size:1em}
  .sym :global(.katex){font-size:1.1em}
  .unit{font-family:var(--mono);font-size:0.72rem;color:var(--muted)}
  .term{font-weight:600}
  :global(.view-pane) input{font-size:0.92rem}
  :global(.view-pane) .line{font-size:0.9rem}
  :global(.view-pane) .where{font-size:0.76rem}
</style>
