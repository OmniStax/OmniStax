<script lang="ts">
  /* A thing dropped on a drawing, standing in a box the reader can move and
     resize. What it holds depends on what was dropped, and the three cases are
     three different promises to the reader:

     a card — a definition, a concept, an equation, a symbol, a highlight, a
     note, a file or a chat message — is the very card the note renderer makes
     for the same embed, live: the maths sets, the links work, and a note
     renamed says its new name here. It scales with the page under the one CSS
     transform the canvas wears, which is safe because a card reads no pointer
     positions of its own;

     a figure or a simulation is a picture of it as it stood when it was
     dropped, with a glyph that opens the live one in a split beside the
     drawing. A simulation reads the pointer off its own canvas and would read
     it wrongly under a transform, so it is deliberately not run here;

     an image is the image.

     A frame that cannot show what it names still says what it is, so a
     snapshot that failed is a card with the figure's words on it and the glyph
     that opens the real thing. */
  import { getAsset } from '../../lib/notes/assets';
  import { assetOfEmbed } from '../../lib/drawer/snapshot';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import type { Resolver } from '../../lib/notes/md/render';
  import { embedText, parseLink } from '../../lib/notes/md/links';

  let {
    x, y, w, h, embed, open, selected = false, scale = 1, resolver, onopen, onmove, onresize, ondecorate,
  }: {
    x: number; y: number; w: number; h: number;
    embed: string; open?: string;
    selected?: boolean;
    /* How far the page is zoomed, so that the grips stay the same size on the
       screen however small the frame is drawn. */
    scale?: number;
    resolver: () => Resolver;
    onopen?: (key: string) => void;
    onmove: (x: number, y: number) => void;
    onresize: (w: number, h: number) => void;
    /* The card's own HTML, once it is in the document: the drawing sets its
       maths with the book's renderer, as a note does. */
    ondecorate?: (el: HTMLElement) => void;
  } = $props();

  const asset = $derived(assetOfEmbed(embed));

  /* A picture is read out of the asset store, which takes a turn of the loop;
     until it lands the frame is empty rather than broken. */
  let url = $state<string | null>(null);
  $effect(() => {
    const id = asset;
    if (!id) { url = null; return; }
    let live = true;
    void getAsset(id).then((u) => { if (live) url = u; });
    return () => { live = false; };
  });

  /* A card is the note renderer's, so it carries marked and KaTeX with it and
     is fetched the first time a drawing holds one. */
  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });
  const html = $derived(!asset && render !== null ? render(embedText(parseLink(embed)), resolver()) : '');

  let card = $state<HTMLElement | null>(null);
  $effect(() => { const el = card; void html; if (el) ondecorate?.(el); });

  /* What the open glyph goes to: a snapshot says so in its own field, and a
     card of a figure is its own embed. Nothing means nothing opens. */
  const target = $derived(open ?? (asset ? null : embed));

  /* ── moving and resizing ───────────────────────────────────────────────── */

  const drag = (e: PointerEvent, f: (dx: number, dy: number) => void): void => {
    e.preventDefault(); e.stopPropagation();
    const grip = e.currentTarget as HTMLElement;
    const x0 = e.clientX, y0 = e.clientY, k = scale === 0 ? 1 : 1 / scale;
    grip.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent): void => f((m.clientX - x0) * k, (m.clientY - y0) * k);
    const up = (): void => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };
  const MIN = 48;
  const onGrab = (e: PointerEvent): void => drag(e, (dx, dy) => onmove(x + dx, y + dy));
  const onCorner = (e: PointerEvent): void => drag(e, (dx, dy) => onresize(Math.max(MIN, w + dx), Math.max(MIN, h + dy)));
</script>

<div class="frame" class:selected data-embed={embed}
  style:left="{x}px" style:top="{y}px" style:width="{w}px" style:height="{h}px">
  {#if asset}
    {#if url}<img class="shot" src={url} alt="" draggable="false" />{:else}<div class="waiting"></div>{/if}
  {:else if html}
    <div class="card" bind:this={card}>{@html html}</div>
  {:else}
    <div class="waiting"></div>
  {/if}

  {#if target && onopen}
    {@const key = target}
    <button type="button" class="open" title="Open this where it lives" aria-label="Open"
      onclick={(e) => { e.stopPropagation(); onopen(key); }}>↗</button>
  {/if}
  <span class="grab" title="Drag to move" onpointerdown={onGrab}></span>
  <span class="corner" title="Drag to resize" onpointerdown={onCorner}></span>
</div>

<style>
  .frame{position:absolute;box-sizing:border-box;border:1px solid var(--rule);border-radius:8px;background:var(--panel);overflow:hidden;font-family:var(--sans);font-size:13px}
  .frame.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .shot{display:block;width:100%;height:100%;object-fit:contain;background:#fff}
  .waiting{width:100%;height:100%;background:var(--soft)}
  .card{width:100%;height:100%;overflow:hidden;padding:2px}
  /* The cards the note renderer writes are styled globally by the note view;
     inside a frame they fill it and lose the margins a page would give them. */
  .card :global(.book-embed),.card :global(.hl-embed),.card :global(.fig-embed),.card :global(.stub-embed){margin:0;height:100%;box-sizing:border-box;overflow:hidden}
  .card :global(.wiki.dead){color:var(--muted);font-style:italic;padding:8px;display:block}
  .open{position:absolute;right:4px;top:4px;width:22px;height:22px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);cursor:pointer;font-size:12px;line-height:1;padding:0;opacity:0}
  .frame:hover .open,.frame.selected .open{opacity:1}
  .open:hover{color:var(--accent);border-color:var(--accent)}
  .grab{position:absolute;left:0;top:0;right:30px;height:10px;cursor:move;opacity:0}
  .corner{position:absolute;right:0;bottom:0;width:13px;height:13px;cursor:nwse-resize;opacity:0;background:var(--accent);border-radius:3px 0 6px 0}
  .frame:hover .grab,.frame.selected .grab{opacity:1;background:color-mix(in srgb,var(--accent) 22%,transparent)}
  .frame:hover .corner,.frame.selected .corner{opacity:.85}
</style>
