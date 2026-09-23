<script lang="ts">
  /* The line from a feature the about page names to where it lives in the
     shell. It rises out of the word into the blank above its paragraph, runs
     along that gap to the margin of the page, and bends from there into the
     side of the control, so it runs along no line of the text. */
  import { tick } from 'svelte';
  import { ui } from '../lib/commands/ui.svelte';

  type Pt = { readonly x: number; readonly y: number };
  let d = $state('');
  let end = $state<Pt | null>(null);

  const route = (from: HTMLElement, to: HTMLElement): { d: string; end: Pt } | null => {
    const word = from.getClientRects()[0];
    const box = to.getBoundingClientRect();
    const page = from.closest('article')?.getBoundingClientRect();
    const para = from.closest('p')?.getBoundingClientRect();
    if (!word || !page || !para || box.width === 0) return null;
    const s: Pt = { x: word.left + word.width / 2, y: word.top + 3 };
    const gap = para.top - 12;
    const r = Math.min(18, s.y - gap);
    const g: Pt = { x: Math.max(page.left - 20, box.right + 60), y: gap };
    const e: Pt = { x: box.right + 6, y: box.top + box.height / 2 };
    const p: Pt = { x: e.x + 26, y: e.y };
    const k = (g.x - p.x) / 2;
    return { d: `M${s.x},${s.y} V${gap + r} Q${s.x},${gap} ${s.x - r},${gap} H${g.x} C${g.x - k},${g.y} ${p.x + k},${p.y} ${p.x},${p.y} H${e.x}`, end: e };
  };

  const redraw = (): void => {
    const to = document.querySelector<HTMLElement>('.spot');
    const r = ui.spotFrom && to ? route(ui.spotFrom, to) : null;
    d = r?.d ?? ''; end = r?.end ?? null;
  };

  $effect(() => {
    if (!ui.spot || !ui.spotFrom) { d = ''; end = null; return; }
    void tick().then(redraw);
    window.addEventListener('scroll', redraw, true); window.addEventListener('resize', redraw);
    return () => { window.removeEventListener('scroll', redraw, true); window.removeEventListener('resize', redraw); };
  });
</script>

{#key ui.spotFrom}
  {#if d && end}
    <svg class="curve" aria-hidden="true">
      <path {d} pathLength="1" />
      <circle cx={end.x} cy={end.y} r="3" />
    </svg>
  {/if}
{/key}

<style>
  .curve{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:40;overflow:visible}
  path{fill:none;stroke:var(--spot);stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;animation:draw .45s cubic-bezier(.3,.7,.3,1) both}
  circle{fill:var(--spot);animation:appear .15s .4s both}
  @keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
  @keyframes appear{from{opacity:0}to{opacity:1}}
  :global(html.anim-off) path, :global(html.anim-off) circle{animation:none}
</style>
