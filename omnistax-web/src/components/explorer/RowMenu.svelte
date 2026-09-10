<script lang="ts">
  /* The little menu a row opens, from its own button or from a right click.
     It knows nothing of the tree: it is handed the choices and the corner to
     hang from, and it closes on the next click anywhere, on Escape, or once a
     choice has been taken. */
  type MenuItem = { readonly label: string; readonly run: () => void };
  type Props = { x: number; y: number; items: readonly MenuItem[]; onclose: () => void };
  let { x, y, items, onclose }: Props = $props();

  /* The click that opened the menu has finished travelling by the time this
     effect runs, so the listener below never sees it. */
  $effect(() => {
    const close = (): void => onclose();
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onclose(); };
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', close); document.removeEventListener('contextmenu', close); document.removeEventListener('keydown', onKey); };
  });
  /* Kept inside the window, whichever corner the row sits in. */
  const wide = (): number => (typeof window === 'undefined' ? 1200 : window.innerWidth);
  const tall = (): number => (typeof window === 'undefined' ? 800 : window.innerHeight);
  const left = $derived(Math.max(4, Math.min(x, wide() - 190)));
  const top = $derived(Math.max(4, Math.min(y, tall() - 24 - items.length * 26)));
</script>

<div class="menu" role="menu" tabindex="-1" style="left:{left}px;top:{top}px"
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Escape') onclose(); }}>
  {#each items as it (it.label)}
    <button type="button" role="menuitem" class="mi" onclick={() => { it.run(); onclose(); }}>{it.label}</button>
  {/each}
</div>

<style>
  .menu{position:fixed;z-index:60;min-width:172px;background:var(--panel);border:1px solid var(--rule);border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.22);padding:4px;font-family:var(--sans);font-size:0.82rem;display:flex;flex-direction:column}
  .mi{border:0;background:transparent;color:var(--ink);font:inherit;text-align:left;padding:5px 10px;border-radius:4px;cursor:pointer;white-space:nowrap}
  .mi:hover{background:var(--soft)}
  .mi:focus-visible{outline:2px solid var(--accent)}
</style>
