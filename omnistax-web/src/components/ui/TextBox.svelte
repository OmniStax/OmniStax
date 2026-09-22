<script lang="ts">
  /* A box of markdown placed on a surface: on a page of a PDF, and on the
     Drawer's canvas. It knows nothing of either — it is given a rectangle in
     whatever units the parent counts in, hands back the rectangle the reader
     drags it to, and leaves the parent to say where that is on the page. So
     the same component serves a page measured in fractions and a canvas
     measured in canvas units.

     Double-click opens the box for writing and Escape closes it again; the bar
     across its top is what it is moved by, and the corner is what it is sized
     by. The body renders with the note renderer, so a box may hold everything
     a note can hold — maths, a link to a section, a card of the book. */
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import type { Resolver } from '../../lib/notes/md/render';

  type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

  let {
    x, y, w, h, body, resolver, selected = false, placeholder = 'Double-click to write…',
    onchange, onmove, onresize, onselect, onremove, onlink,
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
  } = $props();

  let writing = $state(false);
  let host = $state<HTMLElement | null>(null);

  /* The renderer carries marked and KaTeX with it, so it is fetched the first
     time a box is drawn and shared with every note on the page. */
  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = $derived(render !== null && body.trim() ? render(body, resolver()) : '');

  const startWriting = (): void => { writing = true; };
  const stopWriting = (): void => { writing = false; };
  const takeFocus = (node: HTMLTextAreaElement) => { node.focus(); node.select(); };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); stopWriting(); }
  };

  /* A drag in the parent's own units: the pointer moves in pixels, and the
     parent lends the scale that turns one into the other. */
  type Drag = { readonly kind: 'move' | 'resize'; readonly px: number; readonly py: number; readonly r: Rect };
  let drag: Drag | null = null;
  /* How many of the parent's units one pixel is, read off the box itself: the
     box is w units wide and however many pixels wide the browser drew it. */
  const unitsPerPixel = (): { readonly ux: number; readonly uy: number } => {
    const box = host?.getBoundingClientRect();
    return { ux: box && box.width ? w / box.width : 1, uy: box && box.height ? h / box.height : 1 };
  };

  const begin = (e: PointerEvent, kind: 'move' | 'resize'): void => {
    e.preventDefault(); e.stopPropagation();
    onselect?.();
    drag = { kind, px: e.clientX, py: e.clientY, r: { x, y, w, h } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const during = (e: PointerEvent): void => {
    if (!drag) return;
    const { ux, uy } = unitsPerPixel();
    const dx = (e.clientX - drag.px) * ux, dy = (e.clientY - drag.py) * uy;
    if (drag.kind === 'move') onmove({ ...drag.r, x: drag.r.x + dx, y: drag.r.y + dy });
    else onresize({ ...drag.r, w: Math.max(ux * 40, drag.r.w + dx), h: Math.max(uy * 24, drag.r.h + dy) });
  };
  const finish = (e: PointerEvent): void => {
    if (!drag) return;
    drag = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
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
  <div class="bar" role="toolbar" aria-label="Text box"
    onpointerdown={(e) => begin(e, 'move')} onpointermove={during} onpointerup={finish} onpointercancel={finish}>
    <span class="grip" aria-hidden="true">⠿</span>
    <button type="button" class="act" title={writing ? 'Done' : 'Write in this box'} aria-label={writing ? 'Done' : 'Write in this box'}
      onpointerdown={(e) => e.stopPropagation()} onclick={(e) => { e.stopPropagation(); writing ? stopWriting() : startWriting(); }}>{writing ? '✓' : '✎'}</button>
    {#if onremove}
      <button type="button" class="act" title="Remove this box" aria-label="Remove this box"
        onpointerdown={(e) => e.stopPropagation()} onclick={(e) => { e.stopPropagation(); onremove(); }}>×</button>
    {/if}
  </div>
  <div class="body">
    {#if writing}
      <textarea value={body} spellcheck="false" aria-label="Text box"
        oninput={(e) => onchange((e.currentTarget as HTMLTextAreaElement).value)}
        onkeydown={onKey} onblur={stopWriting} use:takeFocus></textarea>
    {:else if html}
      <div class="read">{@html html}</div>
    {:else}
      <div class="blank">{placeholder}</div>
    {/if}
  </div>
  <span class="corner" role="presentation" title="Drag to resize"
    onpointerdown={(e) => begin(e, 'resize')} onpointermove={during} onpointerup={finish} onpointercancel={finish}></span>
</div>

<style>
  /* The parent places the box; everything here is what it looks like once it
     is placed, so the component carries no position of its own. */
  .text-box{position:absolute;inset:0;display:flex;flex-direction:column;min-width:0;border:1px solid var(--rule);border-radius:6px;background:var(--panel);box-shadow:0 1px 6px rgb(0 0 0 / 0.12);font-family:var(--sans);font-size:0.82rem;color:var(--ink);overflow:hidden}
  .text-box.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 1px 6px rgb(0 0 0 / 0.12)}
  .bar{flex:none;display:flex;align-items:center;gap:4px;height:18px;padding:0 4px;background:var(--soft);border-bottom:1px solid var(--rule);cursor:grab;touch-action:none}
  .bar:active{cursor:grabbing}
  .grip{flex:1;color:var(--muted);font-size:0.7rem;line-height:1;user-select:none}
  .act{flex:none;width:16px;height:16px;border:0;border-radius:3px;background:transparent;color:var(--muted);font:inherit;font-size:0.75rem;line-height:1;cursor:pointer;padding:0}
  .act:hover{background:var(--soft2);color:var(--ink)}
  .body{flex:1;min-height:0;overflow:auto}
  .read{padding:5px 7px;line-height:1.45}
  .read :global(p){margin:0 0 .5em}
  .read :global(p:last-child){margin-bottom:0}
  .read :global(a.wiki){color:var(--accent);cursor:pointer}
  .blank{padding:5px 7px;color:var(--muted);font-style:italic}
  textarea{display:block;width:100%;height:100%;box-sizing:border-box;border:0;background:var(--panel);color:var(--ink);font:inherit;line-height:1.45;padding:5px 7px;resize:none;outline:none}
  .corner{position:absolute;right:0;bottom:0;width:14px;height:14px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,var(--rule) 50%)}
  .text-box.selected .corner{background:linear-gradient(135deg,transparent 50%,var(--accent) 50%)}
</style>
