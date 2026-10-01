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

     a figure or a simulation is the figure itself, live, as a note holds it:
     the section's own markup and script, in the book's dress, as wide as the
     frame and as tall as it draws. Its controls write their values into the
     frame's embed. A simulation reads the pointer as a fraction of the box the
     browser drew, so the page's zoom does not throw it off. A frame left from
     before, holding a picture of a figure, shows the live figure instead;

     an image is the image.

     A note is the one card that can be written in where it stands: a
     double-click puts the note's own editor in the frame, writing to the note
     itself, and Escape or a press outside the frame leaves it. */
  import { tick } from 'svelte';
  import type MarkdownEditorType from '../notes/MarkdownEditor.svelte';
  import { getAsset, putAsset } from '../../lib/notes/assets';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import type { NoteId } from '../../lib/types/ids';
  import { assetOfEmbed } from '../../lib/drawer/snapshot';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import type { Resolver } from '../../lib/notes/md/render';
  import { embedText, isBook, linkInner, parseLink } from '../../lib/notes/md/links';
  import { FigureMounts } from '../../lib/notes/md/figlive';
  import { focusedBook } from '../../lib/notes/resolve';
  import '../../lib/notes/md/cards.css';

  let {
    x, y, w, h, embed, open, selected = false, scale = 1, resolver, onopen, onmove, onresize, ondecorate,
    tint = null, note = null, editing = false, onedit, onembed, onfit,
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
    /* The colour the reader gave the frame, as CSS, tinting its border. */
    tint?: string | null;
    /* The note this frame holds, when it holds one that can be written in. */
    note?: NoteId | null;
    editing?: boolean;
    onedit?: (on: boolean) => void;
    /* A live figure's controls moved: the embed that now holds their values. */
    onembed?: (embed: string) => void;
    /* A live figure is as tall as it draws, and says so. */
    onfit?: (h: number) => void;
  } = $props();

  let Editor = $state<typeof MarkdownEditorType | null>(null);
  let editor = $state<{ focus(): void } | null>(null);
  let host = $state<HTMLElement | null>(null);
  $effect(() => {
    if (!editing || Editor !== null) return;
    void import('../notes/MarkdownEditor.svelte').then((m) => { Editor = m.default; });
  });
  $effect(() => { const ed = editor; if (editing && ed) void tick().then(() => ed.focus()); });
  $effect(() => {
    if (!editing) return;
    const away = (e: PointerEvent): void => { if (!host?.contains(e.target as Node)) onedit?.(false); };
    window.addEventListener('pointerdown', away, true);
    return () => window.removeEventListener('pointerdown', away, true);
  });
  const body = $derived(note ? noteDocs.get(note)?.body ?? '' : '');
  const onkey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); onedit?.(false); }
  };

  const figure = $derived.by(() => { const t = parseLink(open ?? embed); return t.kind === 'figure' ? t : null; });
  /* The figure as the card names it, its values aside: a slider moved is not a
     new card, only new values on the one the frame holds. */
  const figureKey = $derived(figure ? linkInner({ ...figure, params: undefined }) : null);
  const asset = $derived(figure ? null : assetOfEmbed(embed));
  /* A figure and a card of the book are as tall as they draw at the frame's width. */
  const fitted = $derived(figureKey !== null || isBook(parseLink(embed)));

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
  const html = $derived(asset || render === null ? '' : render(figureKey ? `![[${figureKey}]]` : embedText(parseLink(embed)), resolver()));

  const mounts = new FigureMounts(focusedBook, (_fig, _n, values) => {
    const t = figure;
    if (t) onembed?.(linkInner({ ...t, params: values }));
  });
  $effect(() => () => mounts.releaseAll());

  let card = $state<HTMLElement | null>(null);
  $effect(() => { const el = card; void html; if (el) ondecorate?.(el); });
  /* The values the frame holds go onto the card before the figure is filled,
     so an undo sets the live figure back. */
  $effect(() => {
    const el = card, t = figure; void html;
    if (!el || !t) return;
    const fc = el.querySelector<HTMLElement>('.fig-embed[data-embed]');
    if (fc) fc.dataset.embed = linkInner(t);
    mounts.fill(el);
  });

  $effect(() => {
    const el = card;
    if (!el || !fitted || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { const want = el.offsetHeight + 2; if (Math.abs(want - h) > 1) onfit?.(want); });
    ro.observe(el);
    return () => ro.disconnect();
  });

  /* What the open glyph goes to: the figure the frame holds, else what a
     snapshot names in its own field, else the card's own embed. Nothing means
     nothing opens. */
  const target = $derived(figureKey ?? open ?? (asset ? null : embed));

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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="frame" class:selected class:tinted={tint !== null} class:editing class:live={figure !== null} class:fitted data-embed={embed} bind:this={host}
  style:left="{x}px" style:top="{y}px" style:width="{w}px" style:height="{h}px" style:--tint={tint}
  ondblclick={(e) => { if (!note || editing) return; e.stopPropagation(); onedit?.(true); }}>
  {#if editing && note}
    <div class="editor" onkeydown={onkey} onpointerdown={(e) => e.stopPropagation()} onwheel={(e) => e.stopPropagation()}>
      {#if Editor}
        {@const Ed = Editor}
        <Ed bind:this={editor} value={body} onchange={(v: string) => noteDocs.setBody(note, v)} onimage={(f: File) => putAsset(f)} />
      {/if}
    </div>
  {:else if asset}
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
  .frame.tinted{border-color:var(--tint);background:color-mix(in srgb,var(--tint) 8%,var(--panel))}
  .frame.editing{overflow:visible;z-index:2}
  .editor{width:100%;height:100%;overflow:auto;background:var(--panel);cursor:text;-webkit-user-select:text;user-select:text}
  .frame.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .shot{display:block;width:100%;height:100%;object-fit:contain}
  .frame.live{background:var(--bg)}
  .frame.fitted .card{height:auto;padding:0}
  .frame.fitted .card :global(.book-embed){height:auto}
  .waiting{width:100%;height:100%;background:var(--soft)}
  .card{width:100%;height:100%;overflow:hidden;padding:2px}
  /* The cards are dressed by cards.css; inside a frame they fill it. */
  .card :global(:is(.book-embed,.hl-embed,.fig-embed,.stub-embed,.file-embed,.chat-embed,.drawing-embed)){margin:0;width:100%;max-width:none;height:100%;overflow:hidden;box-shadow:none}
  .card :global(.fig-embed.live){height:auto}
  .frame:has(:global(.book-embed,.stub-embed,.file-embed,.chat-embed)){border-color:transparent;background:none}
  .card :global(.wiki.dead){color:var(--muted);font-style:italic;padding:8px;display:block}
  .open{position:absolute;right:4px;top:4px;width:22px;height:22px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);cursor:pointer;font-size:12px;line-height:1;padding:0;opacity:0}
  .frame:hover .open,.frame.selected .open{opacity:1}
  .open:hover{color:var(--accent);border-color:var(--accent)}
  .grab{position:absolute;left:0;top:0;right:30px;height:10px;cursor:move;opacity:0}
  .corner{position:absolute;right:0;bottom:0;width:13px;height:13px;cursor:nwse-resize;opacity:0;background:var(--accent);border-radius:3px 0 6px 0}
  .frame:hover .grab,.frame.selected .grab{opacity:1;background:color-mix(in srgb,var(--accent) 22%,transparent)}
  .frame:hover .corner,.frame.selected .corner{opacity:.85}
</style>
