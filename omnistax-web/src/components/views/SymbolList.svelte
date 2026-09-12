<script lang="ts">
  /* The symbols of one quantity, on one line. A quantity of a long book carries a
     dozen of them, and the colour menu's row has room for a few, so the line takes as
     many as fit and ends in an ellipsis; the whole list is in the row's title, where
     the reader who wants it can hover for it. Every symbol is drawn, and the ones that
     did not fit are hidden rather than dropped, so that their widths — measured once,
     while they all stand — are there to measure the line against again when the pane
     is dragged wider or narrower. */
  import { fitCount } from '../../lib/colours/model';
  import { FIG } from '../../lib/fig/figlib';
  let { macros, label }: { macros: readonly string[]; label: string } = $props();

  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
  const GAP = 6;   /* the gap the row sets between two symbols, in pixels */

  let box = $state<HTMLElement | null>(null);
  let widths = $state<readonly number[]>([]);
  let room = $state(0);
  const shown = $derived(widths.length === 0 ? macros.length : fitCount(widths, room, 12, GAP));
  const title = $derived(shown < macros.length ? `Every symbol of ${label}: ${macros.join(' ')}` : '');

  /* The widths are the ones the symbols take when they all stand, which is how the
     first pass draws them; the room is the row's own, which the overflow keeps to the
     line whatever the symbols do, so measuring it again never chases itself. */
  $effect(() => {
    const el = box; if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>('.sym')];
    if (widths.length === 0 && items.length) widths = items.map((i) => i.getBoundingClientRect().width);
    room = el.clientWidth;
    const ro = new ResizeObserver(() => { room = el.clientWidth; });
    ro.observe(el);
    return () => ro.disconnect();
  });
</script>

<span class="syms" bind:this={box} title={title}>
  {#each macros as macro, i (macro)}
    <span class="sym" hidden={i >= shown} use:tex={macro}></span>
  {/each}
  {#if shown < macros.length}<span class="more" aria-label="{macros.length - shown} more">…</span>{/if}
</span>

<style>
  /* flex-basis zero, so the room the line has is the row's to give and never grows
     with the symbols in it — which is what keeps hiding one from changing the answer */
  .syms{flex:1 1 0;min-width:0;overflow:hidden;display:flex;gap:6px;align-items:baseline;white-space:nowrap}
  .syms :global(.katex){font-size:1em}
  .sym{flex:none}
  .sym[hidden]{display:none}
  .more{flex:none;color:var(--muted)}
</style>
