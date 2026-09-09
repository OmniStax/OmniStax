<script lang="ts">
  /* The menu one crumb of the scope bar opens: the chapters of the book, or the
     sections of one chapter, so a reader can send a view somewhere else without
     leaving the bar. Every place the book names is listed, and the ones nothing
     has been built for are dimmed and refuse to be chosen, so the shape of the
     book is never a surprise. The entry the view stands on is marked, the entry
     the open page lies in says so, and choosing one hands its target back — the
     bar decides what following or pinning to it means. Hover moves the mark, the
     arrows move it, Enter chooses, Escape closes, and a press anywhere outside
     closes too, except on the chevron that opened this, which closes it itself.
     The keys stop here, so the chords the shell listens for stay quiet. */
  import type { Target } from '../../lib/sections/scope';
  type Entry = { readonly target: Target; readonly label: string; readonly enabled: boolean; readonly here: boolean; readonly page: boolean };
  type Props = { entries: readonly Entry[]; onchoose: (target: Target) => void; onclose: () => void };
  let { entries, onchoose, onclose }: Props = $props();

  const uid = $props.id();
  let list = $state<HTMLElement | null>(null);
  /* Where the mark may sit: the entries that can be chosen, wrapping round as the browser's rows do. */
  const marked = (i: number, d: 1 | -1, from: number): number => { const n = entries.length; for (let s = from; s < n + from; s++) { const j = (((i + d * s) % n) + n) % n; if (entries[j].enabled) return j; } return i; };
  const stands = entries.findIndex((e) => e.here);   /* it opens on the place the view stands, or on the first place it could be sent */
  let sel = $state(stands >= 0 ? stands : marked(0, 1, 0));

  const take = (i: number): void => { const e = entries[i]; if (e?.enabled) onchoose(e.target); };
  /* The arrows land only where the reader can be sent, so a chapter with little built is quick to cross; the pointer may rest anywhere. */
  const move = (d: 1 | -1): void => { if (entries.length) sel = marked(sel, d, 1); };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); onclose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
    if (e.key === 'Home') { e.preventDefault(); if (entries.length) sel = marked(0, 1, 0); return; }
    if (e.key === 'End') { e.preventDefault(); if (entries.length) sel = marked(entries.length - 1, -1, 0); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(sel); }
  };
  /* The list takes the focus while it is open, and keeps the marked row in sight — by
     scrolling itself, since a page that moved out from under the menu would be a surprise. */
  $effect(() => { list?.focus({ preventScroll: true }); });
  $effect(() => {
    const row = list?.children[sel] as HTMLElement | undefined; if (!list || !row) return;
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top; else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  });
  $effect(() => {
    const away = (e: PointerEvent): void => { const t = e.target as Element | null; if (!list?.contains(t) && !t?.closest?.('.crumbs .chev')) onclose(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });
</script>

<div class="menu" role="listbox" tabindex="-1" aria-label="Choose the place this view describes" aria-activedescendant="{uid}-{sel}" bind:this={list} onkeydown={onKey}>
  {#each entries as e, i (e.label)}
    <div class="row" id="{uid}-{i}" class:sel={i === sel} class:here={e.here} class:off={!e.enabled} role="option" aria-selected={e.here} aria-disabled={!e.enabled} onmousemove={() => (sel = i)} onclick={() => take(i)}>
      <span class="lbl">{e.label}</span>
      {#if e.page}<span class="detail">open page</span>{/if}
    </div>
  {/each}
</div>

<style>
  .menu{width:max-content;min-width:220px;max-width:100%;max-height:50vh;overflow:auto;padding:4px 0;background:var(--panel);border:1px solid var(--rule);border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.22);font-family:var(--sans);font-size:0.82rem;color:var(--ink);outline:none}
  .row{display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;line-height:1.4;white-space:nowrap}
  .row.sel{background:var(--soft)}
  .row.here{font-weight:600}
  .row.off{opacity:.45;cursor:default}
  .lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
  .detail{color:var(--muted);font-size:0.74rem}
</style>
