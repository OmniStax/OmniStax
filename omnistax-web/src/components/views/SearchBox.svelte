<script lang="ts" generics="T">
  /* The search bar a listing view wears: a box at the top, and under it, while
     the reader types, the things of the view's level that the words find — by
     the name the view prints them under, or by the line beside it. The list is
     the view's own, cut to its level before it comes here; the box only finds
     and hands back. Choosing a row — a click, or Enter on the marked one — gives
     the item to the view, which scrolls to it and lights it briefly. The arrows
     move the mark, Escape closes the list and a second Escape clears the box,
     and the keys stop here so the chords the shell listens for stay quiet. */
  import type { Snippet } from 'svelte';
  import { search, type Findable, type Found } from '../../lib/sections/search';
  import { ICON } from '../../lib/icons';
  type Props = {
    items: readonly T[];
    of: (item: T) => Findable;
    onpick: (item: T) => void;
    row: Snippet<[T]>;
    placeholder: string;
  };
  let { items, of, onpick, row, placeholder }: Props = $props();
  const uid = $props.id();
  let query = $state('');
  let open = $state(false);
  let sel = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  const found = $derived<readonly Found<T>[]>(search(query, items, of));
  const showing = $derived(open && query.trim().length > 0);
  $effect(() => { query; sel = 0; });
  const take = (i: number): void => { const f = found[i]; if (!f) return; open = false; onpick(f.item); };
  const move = (d: 1 | -1): void => { const n = found.length; if (n) sel = (((sel + d) % n) + n) % n; };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); if (showing) open = false; else query = ''; return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); open = true; move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); open = true; move(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (showing) take(sel); else open = true; }
  };
  /* The marked row stays in sight as the arrows walk past the edge of the list. */
  $effect(() => {
    const r = list?.children[sel] as HTMLElement | undefined; if (!list || !r) return;
    const top = r.offsetTop, bottom = top + r.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top; else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  });
</script>

<div class="find" role="combobox" aria-expanded={showing} aria-haspopup="listbox" aria-controls="{uid}-list">
  <span class="glyph" aria-hidden="true">{@html ICON.search}</span>
  <input bind:this={input} bind:value={query} type="search" spellcheck="false" autocomplete="off" aria-label={placeholder} {placeholder}
    aria-autocomplete="list" aria-activedescendant={showing && found.length ? `${uid}-${sel}` : undefined}
    oninput={() => (open = true)} onfocus={() => (open = true)} onblur={() => (open = false)} onkeydown={onKey} />
  {#if showing}
    <div class="drop" id="{uid}-list" role="listbox" bind:this={list} aria-label="What the search found">
      {#each found as f, i (f.item)}
        <!-- pointerdown keeps the box focused, so the click below still lands before any blur closes the list -->
        <div class="row" id="{uid}-{i}" class:sel={i === sel} role="option" aria-selected={i === sel}
          onpointerdown={(e) => e.preventDefault()} onmousemove={() => (sel = i)} onclick={() => take(i)}>
          {@render row(f.item)}
        </div>
      {:else}
        <div class="none">Nothing here matches</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .find{position:relative;display:flex;align-items:center;gap:6px;margin:0 0 10px;padding:0 8px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);font-family:var(--sans)}
  .find:focus-within{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent)}
  .glyph{flex:none;display:grid;place-items:center;color:var(--muted)}
  .glyph :global(svg){width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  input{flex:1;min-width:0;border:0;padding:5px 0;font:inherit;font-size:0.8rem;background:transparent;color:var(--ink);outline:none}
  input::placeholder{color:var(--muted)}
  input::-webkit-search-cancel-button{appearance:none}
  /* the list hangs under the box, over whatever the view draws below */
  .drop{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;max-height:min(50vh,320px);overflow:auto;padding:4px 0;background:var(--panel);border:1px solid var(--rule);border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.22);font-size:0.8rem;color:var(--ink)}
  .row{display:flex;align-items:baseline;gap:8px;padding:4px 10px;cursor:pointer;line-height:1.4;min-width:0}
  .row.sel{background:var(--soft)}
  .row :global(.key){flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .row :global(.text){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:0.74rem}
  .none{padding:4px 10px;color:var(--muted)}
  :global(.view-pane) input{font-size:0.88rem;padding:6px 0}
  :global(.view-pane) .drop{font-size:0.88rem}
</style>
