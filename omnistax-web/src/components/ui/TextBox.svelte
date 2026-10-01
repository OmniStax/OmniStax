<script lang="ts">
  /* A box of markdown placed on a surface: on a page of a PDF, and on the
     Drawer's canvas. It knows nothing of either — it is given a rectangle in
     whatever units the parent counts in, hands back the rectangle the reader
     drags it to, and leaves the parent to say where that is on the page. So
     the same component serves a page measured in fractions and a canvas
     measured in canvas units.

     At rest it is a card of text and nothing more. Its edge, and a grip that
     shows while the pointer is on it, move it; a double-click writes in it,
     in the same type it is read in, and Escape or a press anywhere else ends
     the writing; the handles that size it are there only while it is
     selected. The body renders with the note renderer, so a box may hold
     everything a note can hold — maths, a link to a section, a card of the
     book. */
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import type { Resolver } from '../../lib/notes/md/render';
  import '../../lib/notes/md/cards.css';

  type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

  let {
    x, y, w, h, body, resolver, selected = false, placeholder = 'Double-click to write…',
    onchange, onmove, onresize, onselect, onremove, onlink, autowrite = false,
  }: {
    x: number; y: number; w: number; h: number; body: string;
    /* What the markdown may point at. A parent with nothing to lend passes a
       resolver that answers nothing, and the box still renders. */
    resolver: () => Resolver;
    selected?: boolean;
    placeholder?: string;
    onchange: (body: string) => void;
    /* Both are given the whole rectangle, since a move and a resize each leave
       the box somewhere the parent must write down. */
    onmove: (r: Rect) => void;
    onresize: (r: Rect) => void;
    onselect?: () => void;
    onremove?: () => void;
    /* A link followed inside the box: the parent knows where links open. */
    onlink?: (link: string) => void;
    autowrite?: boolean;
  } = $props();

  let writing = $state(autowrite);
  let host = $state<HTMLElement | null>(null);

  /* The renderer carries marked and KaTeX with it, so it is fetched the first
     time a box is drawn and shared with every note on the page. */
  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = $derived(render !== null && body.trim() ? render(body, resolver()) : '');

  const startWriting = (): void => { writing = true; };
  const stopWriting = (): void => { writing = false; };
  /* The caret goes after the last word, where writing on is most likely. */
  const takeFocus = (node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(node.value.length, node.value.length); };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); stopWriting(); }
  };

  /* A drag in the parent's own units: the pointer moves in pixels, and the
     parent lends the scale that turns one into the other. */
  type Handle = 'move' | 'e' | 's' | 'se';
  type Drag = { readonly kind: Handle; readonly px: number; readonly py: number; readonly r: Rect };
  let drag: Drag | null = null;
  /* How many of the parent's units one pixel is, read off the box itself: the
     box is w units wide and however many pixels wide the browser drew it. */
  const unitsPerPixel = (): { readonly ux: number; readonly uy: number } => {
    const box = host?.getBoundingClientRect();
    return { ux: box && box.width ? w / box.width : 1, uy: box && box.height ? h / box.height : 1 };
  };

  const begin = (e: PointerEvent, kind: Handle): void => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    onselect?.();
    drag = { kind, px: e.clientX, py: e.clientY, r: { x, y, w, h } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const during = (e: PointerEvent): void => {
    if (!drag) return;
    const { ux, uy } = unitsPerPixel();
    const dx = (e.clientX - drag.px) * ux, dy = (e.clientY - drag.py) * uy;
    if (drag.kind === 'move') { onmove({ ...drag.r, x: drag.r.x + dx, y: drag.r.y + dy }); return; }
    const wide = drag.kind === 's' ? drag.r.w : Math.max(ux * 40, drag.r.w + dx);
    const tall = drag.kind === 'e' ? drag.r.h : Math.max(uy * 24, drag.r.h + dy);
    onresize({ ...drag.r, w: wide, h: tall });
  };
  const finish = (e: PointerEvent): void => {
    if (!drag) return;
    drag = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const grip = (node: HTMLElement, kind: Handle) => {
    const down = (e: PointerEvent): void => begin(e, kind);
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', during);
    node.addEventListener('pointerup', finish);
    node.addEventListener('pointercancel', finish);
    return { destroy() { node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', during); node.removeEventListener('pointerup', finish); node.removeEventListener('pointercancel', finish); } };
  };

  const follow = (e: MouseEvent): void => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.wiki[data-link]');
    const link = a?.dataset.link;
    if (!link) return;
    e.preventDefault(); e.stopPropagation();
    onlink?.(link);
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="text-box" class:selected class:writing bind:this={host}
  ondblclick={(e) => { e.stopPropagation(); startWriting(); }}
  onclick={(e) => { e.stopPropagation(); onselect?.(); follow(e); }}>
  {#if writing}
    <textarea class="text" value={body} spellcheck="false" aria-label="Text box"
      oninput={(e) => onchange((e.currentTarget as HTMLTextAreaElement).value)}
      onkeydown={onKey} onblur={stopWriting} use:takeFocus></textarea>
  {:else if html}
    <div class="text read">{@html html}</div>
  {:else}
    <div class="text blank">{placeholder}</div>
  {/if}
  {#if !writing}
    {#each ['top', 'right', 'bottom', 'left'] as side (side)}<span class="edge {side}" use:grip={'move'} aria-hidden="true"></span>{/each}
  {/if}
  <span class="grip" use:grip={'move'} title="Drag to move" aria-hidden="true">⠿</span>
  {#if selected && onremove && !writing}
    <button type="button" class="remove" title="Remove this box" aria-label="Remove this box"
      onpointerdown={(e) => e.stopPropagation()} onclick={(e) => { e.stopPropagation(); onremove(); }}>×</button>
  {/if}
  {#if selected}
    <span class="size e" use:grip={'e'} title="Drag to resize" aria-hidden="true"></span>
    <span class="size s" use:grip={'s'} title="Drag to resize" aria-hidden="true"></span>
    <span class="size se" use:grip={'se'} title="Drag to resize" aria-hidden="true"></span>
  {/if}
</div>

<style>
  /* The parent places the box; everything here is what it looks like once it
     is placed, so the component carries no position of its own. */
  .text-box{position:absolute;inset:0;min-width:0;border:1px solid color-mix(in srgb,var(--rule) 70%,transparent);border-radius:8px;background:var(--panel);font-family:var(--sans);font-size:0.82rem;line-height:1.45;color:var(--ink)}
  .text-box:hover{border-color:var(--rule);box-shadow:0 1px 4px rgb(0 0 0 / .08)}
  .text-box.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .text-box.writing{border-color:var(--accent);cursor:text}

  /* Read and written alike: one face, one size, one measure, so the words do
     not jump when the box turns from one to the other. */
  .text{position:absolute;inset:0;box-sizing:border-box;margin:0;padding:8px 10px;overflow:auto;font:inherit;line-height:inherit;color:inherit}
  .read :global(p){margin:0 0 .5em}
  .read :global(p:last-child){margin-bottom:0}
  .read :global(a.wiki){color:var(--accent);cursor:pointer}
  .blank{color:var(--muted)}
  textarea.text{width:100%;height:100%;border:0;border-radius:8px;background:transparent;resize:none;outline:none;caret-color:var(--accent);white-space:pre-wrap;-webkit-user-select:text;user-select:text}

  /* The edge moves the box: a band across the border all round. */
  .edge{position:absolute;cursor:move;touch-action:none}
  .edge.top,.edge.bottom{left:0;right:0;height:7px}
  .edge.left,.edge.right{top:0;bottom:0;width:7px}
  .edge.top{top:-4px} .edge.bottom{bottom:-4px} .edge.left{left:-4px} .edge.right{right:-4px}
  .grip{position:absolute;left:-1px;top:-1px;transform:translate(-100%,0);padding:2px 3px;border-radius:5px;background:var(--panel);border:1px solid var(--rule);color:var(--muted);font-size:0.7rem;line-height:1;cursor:grab;touch-action:none;user-select:none;opacity:0;transition:opacity .12s}
  .grip:active{cursor:grabbing}
  .text-box:hover .grip,.text-box.selected .grip{opacity:1}
  .remove{position:absolute;right:-1px;top:-1px;transform:translate(100%,0);width:18px;height:18px;padding:0;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);font:inherit;font-size:0.8rem;line-height:1;cursor:pointer}
  .remove:hover{color:var(--ink);border-color:var(--accent)}

  .size{position:absolute;touch-action:none;z-index:1}
  .size.e{top:8px;bottom:8px;right:-4px;width:8px;cursor:ew-resize}
  .size.s{left:8px;right:8px;bottom:-4px;height:8px;cursor:ns-resize}
  .size.se{right:-5px;bottom:-5px;width:10px;height:10px;border-radius:2px;background:var(--accent);cursor:nwse-resize}
</style>
