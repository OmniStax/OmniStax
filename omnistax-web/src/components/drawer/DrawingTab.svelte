<script lang="ts">
  /* One drawing in a tab of its own. The page is as wide as the pane and as
     tall as it needs to be: it grows downward as the reader draws near the
     foot of it, as a pad of paper does, and never shrinks back under what is
     already on it.

     What is on the page is drawn twice over. The finished strokes go into an
     offscreen bitmap, redrawn only when the drawing itself changes, and the
     stroke the pen is laying down this moment goes onto the canvas above it,
     so a page of a thousand strokes costs no more per frame than a page of
     one. The boxes and the frames are HTML, laid over both inside a single
     transformed container, because a card sets KaTeX and follows links and a
     picture of one would do neither.

     Pointers, not mice: `pointerType` says whether this is a pen, a finger or
     a mouse, and each is answered in its own way. While a pen is touching the
     glass every touch is ignored, which is the palm resting on the page. A
     finger pans and two zoom; a mouse draws, and pans with the middle button
     or with space held. Pressure sets the width of the nib where the device
     reports it.

     Undo here is the drawing's own, as it is in the note editor and the colour
     menu: Ctrl+Z inside this tab takes back a stroke and never a highlight
     made somewhere else. */
  import { onMount, tick } from 'svelte';
  import Toolbar from './Toolbar.svelte';
  import Frame from './Frame.svelte';
  import TextBox from '../ui/TextBox.svelte';
  import {
    addItem, amend, canRedo, canUndo, grownTo, moveItems, newDrawItemId, redo, removeItems,
    replaceItem, scaleItems, setBoxBody, step, timeline, undo,
    type Box, type Drawing, type DrawItem, type DrawItemId, type Point, type ShapeKind,
  } from '../../lib/drawer/model';
  import { boundsOf, erasedAt, handleUnder, inBox, lassoed, lowestPoint, resized, simplify, snapped, type Handle, type Vec } from '../../lib/drawer/geometry';
  import { drawItems, drawLasso, drawLive, fitCanvas } from '../../lib/drawer/render';
  import { CURSOR, isInk, toolForKey, type Tool } from '../../lib/drawer/tools';
  import { assetEmbed, frameSize, snapshotFigure, snapshotImage } from '../../lib/drawer/snapshot';
  import { cardResolver } from '../../lib/drawer/cards';
  import { fillThumbs, thumbnailOf, waitingThumbs } from '../../lib/drawer/thumb';
  import { registry } from '../../lib/sections/registry.svelte';
  import { openItem } from '../../lib/sections/nav.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { split } from '../../lib/layout/model';
  import { parseLink } from '../../lib/notes/md/links';
  import { dragging } from '../../lib/layout/drag.svelte';
  import { FIG } from '../../lib/fig/figlib';
  import {
    chatId, chatItem, docItem, drawingId, drawingItem, exItem, fileId, fileItem, figItem,
    itemKey, noteId, noteItem, sectionId, type GroupKey,
  } from '../../lib/types/ids';

  let {
    drawing, onchange, groupKey, scratch = false, busy = false, onsave,
  }: {
    drawing: Drawing;
    onchange: (next: Drawing) => void;
    groupKey?: GroupKey;
    /* A scratch page of an exercise carries the one button a drawing of the
       reader's own does not need. */
    scratch?: boolean; busy?: boolean;
    onsave?: () => void;
  } = $props();

  /* ── what the toolbar holds ────────────────────────────────────────────── */

  let tool = $state<Tool>('pen');
  let color = $state('#111111');
  let size = $state(2);
  let fill = $state(false);
  let shape = $state<ShapeKind>('line');
  /* The ink starts at whatever the theme calls ink, read once the tab is up. */
  onMount(() => { color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#111111'; });

  /* ── the drawing's own timeline ────────────────────────────────────────── */

  /* The stack is this tab's, and the value it stands on is the drawing the
     parent holds: a drawing opened in two tabs is one value, and each tab
     remembers its own way back through it. */
  let history = $state.raw(timeline(drawing));
  $effect(() => { if (history.now !== drawing) history = timeline(drawing); });

  /* A step: what the reader would take back in one Ctrl+Z. */
  const commit = (next: Drawing): void => { if (next === history.now) return; history = step(history, next); onchange(next); };
  /* Not a step: the stroke as it is being laid down, and the page growing
     under it, which belong to the step that finishes them. */
  const nudge = (next: Drawing): void => { if (next === history.now) return; history = amend(history, next); onchange(next); };

  const takeBack = (): void => { if (canUndo(history)) { history = undo(history); onchange(history.now); } };
  const putBack = (): void => { if (canRedo(history)) { history = redo(history); onchange(history.now); } };

  /* ── the view: where the page stands under the pane ────────────────────── */

  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  const MIN_SCALE = 0.2, MAX_SCALE = 6;

  let host = $state<HTMLElement | null>(null);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let paneW = $state(900);
  let paneH = $state(600);

  /* The point of the page under a point of the screen, which is what every
     press asks first. */
  const at = (clientX: number, clientY: number): Vec => {
    const r = host?.getBoundingClientRect();
    return [((clientX - (r?.left ?? 0)) - panX) / scale, ((clientY - (r?.top ?? 0)) - panY) / scale];
  };

  const zoomAbout = (factor: number, clientX: number, clientY: number): void => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (next === scale) return;
    const [px, py] = at(clientX, clientY);
    const r = host?.getBoundingClientRect();
    panX = (clientX - (r?.left ?? 0)) - px * next;
    panY = (clientY - (r?.top ?? 0)) - py * next;
    scale = next;
  };

  /* ── what is being done this moment ────────────────────────────────────── */

  /* At most one of these is live: a stroke being laid, a shape being pulled
     out, a lasso being drawn, a selection being dragged or resized, and the
     page being panned. Each is its own shape, so none of them can be half
     true at once. */
  type Gesture =
    | { readonly kind: 'ink'; readonly points: Point[] }
    | { readonly kind: 'shape'; readonly from: Vec; to: Vec }
    | { readonly kind: 'lasso'; readonly poly: Vec[] }
    | { readonly kind: 'move'; readonly from: Vec; last: Vec; readonly base: Drawing }
    | { readonly kind: 'resize'; readonly handle: Handle; readonly box: Box; readonly from: Vec; readonly base: Drawing }
    | { readonly kind: 'pan'; readonly x: number; readonly y: number; readonly panX: number; readonly panY: number }
    | { readonly kind: 'erase' };
  let gesture = $state.raw<Gesture | null>(null);
  let selection = $state.raw<readonly DrawItemId[]>([]);
  let shiftHeld = $state(false);
  let spaceHeld = $state(false);

  const selected = $derived(drawing.items.filter((i) => selection.includes(i.id)));
  const selectionBox = $derived(boundsOf(selected));

  /* The pointer that is drawing, and whether a pen has the page: a pen down
     makes every touch a palm, which is what the reader's hand resting on the
     glass is. */
  let drawingPointer = $state<number | null>(null);
  let penDown = $state(false);
  /* The fingers on the glass, for the pinch. */
  const touches = new Map<number, Vec>();
  let pinch: { readonly gap: number; readonly scale: number } | null = null;

  /* ── the two canvases ──────────────────────────────────────────────────── */

  /* The finished strokes, drawn once into a bitmap and kept until the drawing
     changes. It is the page's own size in CSS pixels, so zooming does not
     redraw it — the canvas element is scaled by the same transform the HTML
     layer wears. */
  let bitmap: HTMLCanvasElement | null = null;
  let bitmapFor: readonly DrawItem[] | null = null;

  const rebuild = (): void => {
    if (typeof document === 'undefined') return;
    bitmap ??= document.createElement('canvas');
    const ctx = fitCanvas(bitmap, drawing.width, drawing.height);
    if (!ctx) return;
    drawItems(ctx, drawing.items);
    bitmapFor = drawing.items;
  };

  /* The one paint: the bitmap, then whatever is being done this moment. It is
     asked for on every change and coalesced into the next frame, so a stroke
     moving fast paints once per frame and not once per event. */
  let painting = 0;
  const paint = (): void => {
    if (painting) return;
    painting = requestAnimationFrame(() => { painting = 0; draw(); });
  };

  const draw = (): void => {
    const c = canvas;
    if (!c) return;
    const ctx = fitCanvas(c, drawing.width, drawing.height);
    if (!ctx) return;
    if (bitmapFor !== drawing.items) rebuild();
    if (bitmap) ctx.drawImage(bitmap, 0, 0, drawing.width, drawing.height);
    const g = gesture;
    if (g?.kind === 'ink') drawLive(ctx, tool === 'highlighter' ? 'highlighter' : 'pen', color, size, g.points);
    if (g?.kind === 'shape') drawItems(ctx, [{ kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to }]);
    if (g?.kind === 'lasso') drawLasso(ctx, g.poly, color, scale);
  };

  $effect(() => { void drawing.items; void drawing.width; void drawing.height; void gesture; void scale; paint(); });

  /* The page is as wide as the pane, which is what "a page as wide as the
     pane" means: the width follows the room the tab has, and the ink already
     on it keeps the coordinates it was laid at. */
  const fitWidth = (): void => {
    const el = host; if (!el) return;
    const r = el.getBoundingClientRect();
    paneW = r.width; paneH = r.height;
  };
  onMount(() => {
    fitWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fitWidth);
    if (host) ro.observe(host);
    return () => ro.disconnect();
  });

  /* ── the press ─────────────────────────────────────────────────────────── */

  const pointOf = (e: PointerEvent): Point => { const [x, y] = at(e.clientX, e.clientY); return [x, y, e.pressure || 0.5]; };

  /* A capture is only given back when it was taken: a pointer that never went
     down here — a palm whose press was ignored, or one the browser has already
     taken back — has none, and asking for it anyway throws. */
  const release = (el: Element, id: number): void => {
    if (el.hasPointerCapture?.(id)) el.releasePointerCapture(id);
  };

  /* A touch while a pen is on the glass is the reader's palm, and a touch with
     another already down is a pinch and not a stroke. */
  const isPalm = (e: PointerEvent): boolean => e.pointerType === 'touch' && (penDown || touches.size > 0);

  const beginSelectionDrag = (p: Vec): boolean => {
    const box = selectionBox;
    if (!box) return false;
    const handle = handleUnder(box, p[0], p[1], 10 / scale);
    if (handle) { gesture = { kind: 'resize', handle, box, from: p, base: drawing }; return true; }
    if (inBox(box, p[0], p[1])) { gesture = { kind: 'move', from: p, last: p, base: drawing }; return true; }
    return false;
  };

  const newTextBox = (p: Vec): void => {
    const id = newDrawItemId();
    commit(addItem(drawing, { kind: 'box', id, x: p[0], y: p[1], w: 260, h: 90, body: '' }));
    selection = [id];
  };

  const onpointerdown = (e: PointerEvent): void => {
    host?.focus({ preventScroll: true });
    if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (isPalm(e)) {
      /* Two fingers on the glass: the second one turns the first one's pan
         into a pinch rather than starting anything of its own. */
      if (touches.size === 2) { gesture = null; pinch = { gap: touchGap(), scale }; }
      return;
    }
    if (e.pointerType === 'pen') penDown = true;
    /* The page itself is moved by the hand tool, by the middle button, and by
       a drag with space held, which is what every canvas does. */
    const panning = tool === 'pan' || e.button === 1 || spaceHeld || (e.pointerType === 'touch' && touches.size === 1);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingPointer = e.pointerId;
    if (panning) { gesture = { kind: 'pan', x: e.clientX, y: e.clientY, panX, panY }; return; }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = at(e.clientX, e.clientY);
    if (tool === 'lasso') { if (beginSelectionDrag(p)) return; selection = []; gesture = { kind: 'lasso', poly: [p] }; return; }
    if (tool === 'text') { newTextBox(p); return; }
    if (tool === 'eraser') { gesture = { kind: 'erase' }; eraseAt(p); return; }
    if (tool === 'shape') { gesture = { kind: 'shape', from: p, to: p }; return; }
    if (isInk(tool)) { selection = []; gesture = { kind: 'ink', points: [pointOf(e)] }; }
  };

  const touchGap = (): number => {
    const [a, b] = [...touches.values()];
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0;
  };

  const eraseAt = (p: Vec): void => {
    const hit = erasedAt(drawing.items, p[0], p[1], Math.max(6, size * 2) / 1);
    if (hit.length) nudge(removeItems(drawing, hit.map((i) => i.id)));
  };

  const onpointermove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2 && pinch) {
        const gap = touchGap();
        if (pinch.gap > 0 && gap > 0) {
          const [a, b] = [...touches.values()];
          zoomAboutAbsolute(pinch.scale * (gap / pinch.gap), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        return;
      }
    }
    const g = gesture;
    if (!g || (drawingPointer !== null && e.pointerId !== drawingPointer && e.pointerType !== 'touch')) return;
    if (g.kind === 'pan') { panX = g.panX + (e.clientX - g.x); panY = g.panY + (e.clientY - g.y); return; }
    const p = at(e.clientX, e.clientY);
    if (g.kind === 'ink') {
      /* Every point the browser held back between frames, so the ink is as
         smooth as the hand that drew it rather than as the frame rate. */
      const all = e.getCoalescedEvents?.() ?? [];
      (all.length ? all : [e]).forEach((ev) => g.points.push(pointOf(ev)));
      gesture = { ...g, points: g.points };
      return;
    }
    if (g.kind === 'shape') { gesture = { ...g, to: shiftHeld ? snapped(shape, g.from, p) : p }; return; }
    if (g.kind === 'lasso') { g.poly.push(p); gesture = { ...g, poly: g.poly }; return; }
    if (g.kind === 'erase') { eraseAt(p); return; }
    if (g.kind === 'move') { nudge(moveItems(g.base, selection, p[0] - g.from[0], p[1] - g.from[1])); gesture = { ...g, last: p }; return; }
    if (g.kind === 'resize') {
      const next = resized(g.box, g.handle, p[0] - g.from[0], p[1] - g.from[1]);
      nudge(scaleItems(g.base, selection, g.box, next));
    }
  };

  const zoomAboutAbsolute = (next: number, clientX: number, clientY: number): void => {
    const capped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    zoomAbout(capped / scale, clientX, clientY);
  };

  /* Where the page must reach to hold what has just been drawn. */
  const grown = (d: Drawing): Drawing => grownTo(d, lowestPoint(d.items));

  const onpointerup = (e: PointerEvent): void => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (e.pointerType === 'pen') penDown = false;
    const g = gesture;
    gesture = null;
    drawingPointer = null;
    release(e.currentTarget as HTMLElement, e.pointerId);
    if (!g) return;
    if (g.kind === 'ink') {
      const points = simplify(g.points, 0.8 / scale);
      if (points.length) commit(grown(addItem(drawing, { kind: 'stroke', id: newDrawItemId(), tool: tool === 'highlighter' ? 'highlighter' : 'pen', color, size, points })));
      return;
    }
    if (g.kind === 'shape') {
      const moved = Math.hypot(g.to[0] - g.from[0], g.to[1] - g.from[1]) > 2 / scale;
      if (moved) commit(grown(addItem(drawing, { kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to })));
      return;
    }
    if (g.kind === 'lasso') { selection = lassoed(drawing.items, g.poly).map((i) => i.id); return; }
    if (g.kind === 'move' || g.kind === 'resize') {
      /* The drag was one nudge after another; the step is the whole of it. */
      const settled = grown(history.now);
      history = step({ ...history, now: g.base }, settled);
      onchange(settled);
      return;
    }
    if (g.kind === 'erase') { const settled = history.now; history = step({ ...history, now: drawingBefore ?? settled }, settled); onchange(settled); }
  };

  /* The drawing as it stood when the eraser went down, so that a sweep of it
     is one step and not one step per stroke rubbed out. */
  let drawingBefore: Drawing | null = null;
  $effect(() => { if (gesture?.kind === 'erase' && drawingBefore === null) drawingBefore = history.now; if (gesture === null) drawingBefore = null; });

  const oncancel = (e: PointerEvent): void => { touches.delete(e.pointerId); pinch = null; gesture = null; drawingPointer = null; if (e.pointerType === 'pen') penDown = false; };

  /* Ctrl and the wheel zooms, as it does in every canvas; the wheel alone
     scrolls the page up and down, which is how a long drawing is read. */
  const onwheel = (e: WheelEvent): void => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAbout(Math.exp(-e.deltaY / 400), e.clientX, e.clientY); return; }
    e.preventDefault();
    panX -= e.deltaX; panY -= e.deltaY;
  };

  /* ── the keys ──────────────────────────────────────────────────────────── */

  /* Inside the tab a bare letter picks a tool and Ctrl+Z is the drawing's own,
     so neither reaches the shell. A key pressed while a text box is being
     typed in belongs to the box, which stops the event before it arrives. */
  const onkeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') shiftHeld = true;
    if (e.key === ' ' && !e.repeat) { spaceHeld = true; e.preventDefault(); }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault(); e.stopPropagation();
      if (e.shiftKey) putBack(); else takeBack();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopPropagation(); putBack(); return; }
    if (mod || e.altKey) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault(); e.stopPropagation();
      commit(removeItems(drawing, selection));
      selection = [];
      return;
    }
    if (e.key === 'Escape') { selection = []; return; }
    const t = toolForKey(e.key);
    if (t) { e.preventDefault(); e.stopPropagation(); tool = t; }
  };
  const onkeyup = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') shiftHeld = false;
    if (e.key === ' ') spaceHeld = false;
  };

  /* ── what is dropped on the page ───────────────────────────────────────── */

  /* Everything that drags out of a panel or a page today lands here: the row
     carries the embed text of the thing it stands for, so a drop is the same
     payload a note takes, and what it becomes is a frame at the drop point.
     A file dragged in from the desktop is an image, which goes to the asset
     store and is framed at its own shape. */
  const BRACKETS = /^!?\[\[([^\]\n]+)\]\]$/;
  let dropping = $state(false);
  const takeable = (e: DragEvent): boolean =>
    !dragging() && ((e.dataTransfer?.types.includes('text/plain') ?? false) || (e.dataTransfer?.types.includes('Files') ?? false));

  const CARD_SIZE = { w: 300, h: 170 };

  /* A figure is a picture of itself: the registry builds the very root a split
     pane would show, it is left to draw one frame off the page, and what it
     drew is stored. A figure that draws nothing photographable keeps its card,
     which still says what it is and still opens. */
  const framedFigure = async (section: string, fig: string, p: Vec): Promise<void> => {
    const embed = `fig:${section}:${fig}`;
    const root = registry.figureRoot(sectionId(section), fig);
    if (!root) { placeFrame(embed, p, CARD_SIZE.w, CARD_SIZE.h); return; }
    /* The root must be in the document to be laid out and drawn, so it is put
       somewhere the reader cannot see and taken away again. */
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;pointer-events:none;opacity:0';
    stage.appendChild(root);
    document.body.appendChild(stage);
    try {
      const shot = await snapshotFigure(root);
      if (!shot) { placeFrame(embed, p, CARD_SIZE.w, CARD_SIZE.h); return; }
      const { w, h } = frameSize(shot);
      placeFrame(assetEmbed(shot.asset), p, w, h, embed);
    } finally { stage.remove(); }
  };

  const placeFrame = (embed: string, p: Vec, w: number, h: number, open?: string): void => {
    const id = newDrawItemId();
    const item: DrawItem = open
      ? { kind: 'frame', id, x: p[0], y: p[1], w, h, embed, open }
      : { kind: 'frame', id, x: p[0], y: p[1], w, h, embed };
    commit(grownTo(addItem(drawing, item), p[1] + h));
    selection = [id];
  };

  const dropImage = async (file: File, p: Vec): Promise<void> => {
    const shot = await snapshotImage(file);
    if (!shot) return;
    const { w, h } = frameSize(shot);
    placeFrame(assetEmbed(shot.asset), p, w, h);
  };

  const ondragover = (e: DragEvent): void => {
    if (!takeable(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    dropping = true;
  };
  const ondragleave = (e: DragEvent): void => { if (!host?.contains(e.relatedTarget as Node | null)) dropping = false; };
  const ondrop = (e: DragEvent): void => {
    dropping = false;
    if (!takeable(e)) return;
    e.preventDefault();
    const p = at(e.clientX, e.clientY);
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (file) { void dropImage(file, p); return; }
    const text = e.dataTransfer?.getData('text/plain').trim() ?? '';
    const m = BRACKETS.exec(text);
    if (!m) return;
    const inner = m[1];
    const link = parseLink(inner);
    if (link.kind === 'figure') { void framedFigure(link.section, link.id, p); return; }
    placeFrame(inner, p, CARD_SIZE.w, CARD_SIZE.h);
  };

  /* ── opening what a frame holds ────────────────────────────────────────── */

  /* A figure opens live in a split to the right of the drawing, where it has a
     pane to itself and draws as it does anywhere else — which is the whole
     reason the frame holds a picture and not the figure. Everything else with
     a tab of its own opens wherever its tab opens; a card of the book's tables
     has no tab, so its glyph is not drawn at all. */
  const openFrame = (key: string): void => {
    const link = parseLink(key);
    if (link.kind === 'figure') {
      const group = layoutStore.layout.groups.findIndex((g) => g.key === groupKey);
      layoutStore.apply((l) => split(l, group < 0 ? l.focus : group, 'right', figItem(sectionId(link.section), link.id)));
      return;
    }
    const item = link.kind === 'exercise' ? exItem(sectionId(link.section), link.id)
      : link.kind === 'file' ? fileItem(fileId(link.file))
        : link.kind === 'chat' ? chatItem(chatId(link.chat))
          : link.kind === 'drawing' ? drawingItem(drawingId(link.id))
            : link.kind === 'note' ? noteOf(link.name)
              : link.kind === 'section' ? docItem(sectionId(link.section), 'text')
                : null;
    if (item) void openItem(itemKey(item)).catch(() => {});
  };
  /* A note is named rather than pointed at, so its id is looked up the way the
     renderer looked it up to draw the card. */
  const noteOf = (name: string) => { const id = cardResolver().note(name); return id ? noteItem(noteId(id)) : null; };

  /* A link followed from inside a text box. What a rendered anchor carries is
     already resolved — `note:<id>`, `section:16.4` — so it is not the embed
     text a frame holds and is read on its own terms. */
  const followLink = (link: string): void => {
    const note = /^note:(.+)$/.exec(link);
    if (note) { void openItem(itemKey(noteItem(noteId(note[1])))); return; }
    const sec = /^section:(.+)$/.exec(link);
    if (sec) { void openItem(itemKey(docItem(sectionId(sec[1]), 'text'))); return; }
    openFrame(link);
  };

  /* The cards a frame holds set their maths with the book's own renderer, as a
     note's cards do: the macros are the book's and KaTeX alone does not know
     them. */
  const decorate = (el: HTMLElement): void => {
    /* A drawing held in a frame shows a picture of its ink, filled in after
       the rendering as a note's is. */
    for (const id of waitingThumbs(el)) {
      void thumbnailOf(drawingId(id)).then((url) => { if (url) void fillThumbs(el, drawingId(id), url); });
    }
    for (const t of el.querySelectorAll<HTMLElement>('.embed-tex[data-tex]')) {
      if (t.dataset.set === '1') continue;
      t.dataset.set = '1';
      FIG.tex(t, t.dataset.tex ?? '');
    }
    for (const m of el.querySelectorAll<HTMLElement>('[data-math]')) {
      if (m.dataset.math === 'set') continue;
      m.dataset.math = 'set';
      FIG.renderMath(m);
    }
  };

  /* ── the boxes and the frames ──────────────────────────────────────────── */

  const boxes = $derived(drawing.items.filter((i): i is Extract<DrawItem, { kind: 'box' }> => i.kind === 'box'));
  const frames = $derived(drawing.items.filter((i): i is Extract<DrawItem, { kind: 'frame' }> => i.kind === 'frame'));
  const resolver = () => cardResolver();

  const moveOne = (i: Extract<DrawItem, { kind: 'box' | 'frame' }>, x: number, y: number): void =>
    nudge(replaceItem(drawing, { ...i, x, y }));
  const sizeOne = (i: Extract<DrawItem, { kind: 'box' | 'frame' }>, w: number, h: number): void =>
    nudge(replaceItem(drawing, { ...i, w, h }));
  /* A drag of a box or a frame is a run of nudges and one step at its end, as
     a lasso drag is; the pointer leaving the grip is what ends it. */
  const settle = (): void => { if (history.now !== drawing) return; history = step(history, history.now); };
</script>

<svelte:window onpointerup={() => settle()} />

<article class="drawing-tab" data-drawing={drawing.id}>
  <Toolbar
    {tool} {color} {size} {fill} {shape} {scratch} {busy}
    canUndo={canUndo(history)} canRedo={canRedo(history)}
    ontool={(t) => (tool = t)} oncolor={(c) => (color = c)} onsize={(n) => (size = n)}
    onfill={(on) => (fill = on)} onshape={(s) => (shape = s)}
    onundo={takeBack} onredo={putBack} {onsave}
    onimage={(f) => void dropImage(f, [(-panX + paneW / 2) / scale, (-panY + paneH / 3) / scale])} />

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="surface" class:dropping bind:this={host} role="application" tabindex="0"
    aria-label="Drawing canvas: press P for the pen, E for the eraser, L for the lasso"
    style:cursor={gesture?.kind === 'pan' ? 'grabbing' : CURSOR[tool]}
    {onpointerdown} {onpointermove} {onpointerup} onpointercancel={oncancel}
    {onwheel} {onkeydown} {onkeyup} {ondragover} {ondragleave} {ondrop}>
    <div class="page" style:transform="translate({panX}px,{panY}px) scale({scale})"
      style:width="{drawing.width}px" style:height="{drawing.height}px">
      <canvas class="ink" bind:this={canvas} style:width="{drawing.width}px" style:height="{drawing.height}px"></canvas>
      <div class="layer">
        {#each frames as f (f.id)}
          <Frame x={f.x} y={f.y} w={f.w} h={f.h} embed={f.embed} open={f.open}
            selected={selection.includes(f.id)} {scale} {resolver}
            onopen={openFrame}
            onmove={(nx, ny) => moveOne(f, nx, ny)} onresize={(nw, nh) => sizeOne(f, nw, nh)}
            ondecorate={decorate} />
        {/each}
        {#each boxes as b (b.id)}
          <!-- The box is placed by whoever holds it, which here is the page:
               TextBox fills the rectangle it is given and says where the
               reader dragged it to. -->
          <div class="boxed" style:left="{b.x}px" style:top="{b.y}px" style:width="{b.w}px" style:height="{b.h}px">
            <TextBox x={b.x} y={b.y} w={b.w} h={b.h} body={b.body}
              selected={selection.includes(b.id)} {resolver}
              onchange={(body) => nudge(setBoxBody(drawing, b.id, body))}
              onmove={(r) => moveOne(b, r.x, r.y)}
              onresize={(r) => sizeOne(b, r.w, r.h)}
              onselect={() => (selection = [b.id])}
              onremove={() => { commit(removeItems(drawing, [b.id])); selection = []; }}
              onlink={followLink} />
          </div>
        {/each}
        {#if selectionBox}
          {@const s = selectionBox}
          <div class="sel" style:left="{s.x}px" style:top="{s.y}px" style:width="{s.w}px" style:height="{s.h}px"
            style:border-width="{1 / scale}px">
            {#each ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as k (k)}
              <span class="handle h-{k}" style:width="{8 / scale}px" style:height="{8 / scale}px"></span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</article>

<style>
  .drawing-tab{position:absolute;inset:0;display:flex;flex-direction:column;font-family:var(--sans);background:var(--bg)}
  /* The canvas takes every pointer for itself: no scrolling, no pinch of the
     browser's own, no long-press menu, because all of those are gestures the
     drawing means something else by. */
  .surface{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;outline:none;-webkit-user-select:none;user-select:none;background:var(--soft)}
  .surface:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .surface.dropping{box-shadow:inset 0 0 0 2px var(--accent)}
  .page{position:absolute;left:0;top:0;transform-origin:0 0;background:var(--panel);box-shadow:0 1px 8px rgba(0,0,0,.12)}
  .ink{position:absolute;left:0;top:0;display:block}
  .layer{position:absolute;left:0;top:0;width:100%;height:100%}
  /* A text box fills whatever rectangle it is put in, so the page is what puts
     it somewhere. */
  .boxed{position:absolute}
  .sel{position:absolute;border-style:dashed;border-color:var(--accent);pointer-events:none}
  .handle{position:absolute;background:var(--accent);border-radius:1px}
  .h-nw{left:0;top:0;transform:translate(-50%,-50%)}
  .h-n{left:50%;top:0;transform:translate(-50%,-50%)}
  .h-ne{left:100%;top:0;transform:translate(-50%,-50%)}
  .h-e{left:100%;top:50%;transform:translate(-50%,-50%)}
  .h-se{left:100%;top:100%;transform:translate(-50%,-50%)}
  .h-s{left:50%;top:100%;transform:translate(-50%,-50%)}
  .h-sw{left:0;top:100%;transform:translate(-50%,-50%)}
  .h-w{left:0;top:50%;transform:translate(-50%,-50%)}
</style>
