<script lang="ts">
  /* One drawing in a tab of its own. The whole of the pane is drawable from
     the first frame and the plane under it has no edge: there is no page, no
     sheet and no scrollbar, and dragging or zooming only shows more of the
     same plane. What the tab holds instead is a view — the canvas point at the
     top left of the pane and the scale — which is its own while it is open and
     is written into the drawing so that opening it again lands where the
     reader left off.

     What is on the plane is drawn twice over. The canvas is the size of the
     pane; on every change, and on every pan or zoom frame, the items whose
     box meets the view are drawn into an offscreen bitmap under the view's
     transform, and that bitmap stands as the cache of this view until either
     the view or the items move. The stroke the pen is laying down this moment
     goes onto the canvas above it, so a plane of a thousand strokes costs no
     more per frame than a plane of one. The boxes and the frames are HTML,
     laid over both inside a single transformed container, because a card sets
     KaTeX and follows links and a picture of one would do neither.

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
    addItem, amend, canRedo, canUndo, clampZoom, moveItems, newDrawItemId, ORIGIN, redo, removeItems,
    replaceItem, scaleItems, setBoxBody, setView, step, timeline, undo,
    type Box, type Drawing, type DrawItem, type DrawItemId, type Point, type ShapeKind, type View,
  } from '../../lib/drawer/model';
  import { bounds, boundsOf, erasedAt, fitView, handleUnder, inBox, lassoed, meets, resized, simplify, snapped, viewBox, type Handle, type Vec } from '../../lib/drawer/geometry';
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

  /* ── the view: the window the pane is onto the plane ───────────────────── */

  /* The canvas point at the top left of the pane, and the scale. The tab opens
     on the view the drawing was left at, and a drawing that has never been
     opened opens at the origin. */
  let view = $state<View>(drawing.view ?? ORIGIN);
  const scale = $derived(view.zoom);

  let host = $state<HTMLElement | null>(null);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let paneW = $state(900);
  let paneH = $state(600);

  /* Where the reader was looking is written down a change behind the drawing
     itself, and never as a step of its own: taking back a stroke should not
     take back a pan. */
  const rememberView = (): void => nudge(setView(drawing, view));

  /* The point of the plane under a point of the screen, which is what every
     press asks first. */
  const at = (clientX: number, clientY: number): Vec => {
    const r = host?.getBoundingClientRect();
    return [view.x + (clientX - (r?.left ?? 0)) / view.zoom, view.y + (clientY - (r?.top ?? 0)) / view.zoom];
  };

  /* Zoom about a point of the screen: the plane point under the pointer is the
     one place that does not move, which is what makes a pinch feel like one. */
  const zoomTo = (next: number, clientX: number, clientY: number): void => {
    const zoom = clampZoom(next);
    if (zoom === view.zoom) return;
    const [px, py] = at(clientX, clientY);
    const r = host?.getBoundingClientRect();
    view = { x: px - (clientX - (r?.left ?? 0)) / zoom, y: py - (clientY - (r?.top ?? 0)) / zoom, zoom };
  };
  const zoomAbout = (factor: number, clientX: number, clientY: number): void => zoomTo(view.zoom * factor, clientX, clientY);

  /* The two ways back to the ink: one frames everything there is, the other
     goes home to the origin at the size the ink was drawn. */
  const zoomToFit = (): void => {
    const fitted = fitView(drawing.items, paneW, paneH);
    view = fitted ?? ORIGIN;
    rememberView();
  };
  const resetView = (): void => { view = ORIGIN; rememberView(); };

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
    | { readonly kind: 'pan'; readonly x: number; readonly y: number; readonly from: View }
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

  /* The finished ink of this view, drawn into a bitmap the size of the pane
     and kept until either the items or the view move. Only the items whose
     box meets the window are drawn, so a plane with a mile of ink on it costs
     what is on the screen and nothing more. */
  let bitmap: HTMLCanvasElement | null = null;
  let bitmapFor: readonly DrawItem[] | null = null;
  let bitmapAt: string = '';

  /* What the cache was made for: the items it drew and the window it drew
     them in, as one string, since that is all that has to be compared. */
  const viewKey = (): string => `${view.x},${view.y},${view.zoom},${paneW},${paneH}`;

  const rebuild = (): void => {
    if (typeof document === 'undefined') return;
    bitmap ??= document.createElement('canvas');
    const ctx = fitCanvas(bitmap, paneW, paneH);
    if (!ctx) return;
    const window = viewBox(view, paneW, paneH);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);
    drawItems(ctx, drawing.items.filter((i) => meets(bounds(i), window)));
    bitmapFor = drawing.items;
    bitmapAt = viewKey();
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
    const ctx = fitCanvas(c, paneW, paneH);
    if (!ctx) return;
    if (bitmapFor !== drawing.items || bitmapAt !== viewKey()) rebuild();
    if (bitmap) ctx.drawImage(bitmap, 0, 0, paneW, paneH);
    /* Whatever is being done this moment is drawn on top, in plane units
       under the same transform the cache was drawn with. */
    const g = gesture;
    if (!g || (g.kind !== 'ink' && g.kind !== 'shape' && g.kind !== 'lasso')) return;
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);
    if (g.kind === 'ink') drawLive(ctx, tool === 'highlighter' ? 'highlighter' : 'pen', color, size, g.points);
    if (g.kind === 'shape') drawItems(ctx, [{ kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to }]);
    if (g.kind === 'lasso') drawLasso(ctx, g.poly, color, view.zoom);
  };

  $effect(() => { void drawing.items; void view; void gesture; void paneW; void paneH; paint(); });

  /* The canvas is the pane, so it is measured rather than given a size: the
     whole of the tab is drawable from the first frame, and it stays so when
     the pane is dragged wider. */
  const measurePane = (): void => {
    const el = host; if (!el) return;
    const r = el.getBoundingClientRect();
    paneW = r.width; paneH = r.height;
  };
  onMount(() => {
    measurePane();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measurePane);
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
    if (panning) { gesture = { kind: 'pan', x: e.clientX, y: e.clientY, from: view }; return; }
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
          zoomTo(pinch.scale * (gap / pinch.gap), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        return;
      }
    }
    const g = gesture;
    if (!g || (drawingPointer !== null && e.pointerId !== drawingPointer && e.pointerType !== 'touch')) return;
    if (g.kind === 'pan') {
      view = { ...g.from, x: g.from.x - (e.clientX - g.x) / g.from.zoom, y: g.from.y - (e.clientY - g.y) / g.from.zoom };
      return;
    }
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

  const onpointerup = (e: PointerEvent): void => {
    touches.delete(e.pointerId);
    /* A pinch ends when a finger leaves, and what it changed is the view. */
    if (touches.size < 2 && pinch) { pinch = null; rememberView(); }
    if (e.pointerType === 'pen') penDown = false;
    const g = gesture;
    gesture = null;
    drawingPointer = null;
    release(e.currentTarget as HTMLElement, e.pointerId);
    if (!g) return;
    /* A pan is not a change to the drawing, only to where it is looked at
       from, so what it leaves behind is the view and nothing else. */
    if (g.kind === 'pan') { rememberView(); return; }
    if (g.kind === 'ink') {
      const points = simplify(g.points, 0.8 / view.zoom);
      if (points.length) commit(addItem(drawing, { kind: 'stroke', id: newDrawItemId(), tool: tool === 'highlighter' ? 'highlighter' : 'pen', color, size, points }));
      return;
    }
    if (g.kind === 'shape') {
      const moved = Math.hypot(g.to[0] - g.from[0], g.to[1] - g.from[1]) > 2 / view.zoom;
      if (moved) commit(addItem(drawing, { kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to }));
      return;
    }
    if (g.kind === 'lasso') { selection = lassoed(drawing.items, g.poly).map((i) => i.id); return; }
    if (g.kind === 'move' || g.kind === 'resize') {
      /* The drag was one nudge after another; the step is the whole of it. */
      const settled = history.now;
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

  /* Ctrl and the wheel zooms about the pointer, as it does in every canvas;
     the wheel alone walks the plane up and down, and with Shift held it walks
     it sideways. A wheel is a run of events with no end of its own, so the
     view it leaves is written down once the turning stops. */
  let wheelRest: ReturnType<typeof setTimeout> | null = null;
  const afterWheel = (): void => {
    if (wheelRest !== null) clearTimeout(wheelRest);
    wheelRest = setTimeout(() => { wheelRest = null; rememberView(); }, 200);
  };
  const onwheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { zoomAbout(Math.exp(-e.deltaY / 400), e.clientX, e.clientY); afterWheel(); return; }
    /* Shift and a wheel that only turns one way is a sideways walk; a trackpad
       that reports both already says which way it went. */
    const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
    const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
    view = { ...view, x: view.x + dx / view.zoom, y: view.y + dy / view.zoom };
    afterWheel();
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
    /* Zero frames everything there is; with Shift it goes home instead. The
       plane has no edge, so these two are the way back to the ink. */
    if (e.key === '0' || e.key === ')') {
      e.preventDefault(); e.stopPropagation();
      if (e.shiftKey) resetView(); else zoomToFit();
      return;
    }
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
    commit(addItem(drawing, item));
    selection = [id];
  };

  /* Where something with no drop point of its own lands: the middle of what
     the reader is looking at, less half of itself, so it arrives centred. */
  const middle = (w: number, h: number): Vec =>
    [view.x + paneW / (2 * view.zoom) - w / 2, view.y + paneH / (2 * view.zoom) - h / 2];

  /* An image dropped lands at the point it was let go of; one placed from the
     toolbar has no such point and lands centred on what is being looked at,
     which is where the reader is looking for it. */
  const dropImage = async (file: File, p: Vec | null): Promise<void> => {
    const shot = await snapshotImage(file);
    if (!shot) return;
    const { w, h } = frameSize(shot);
    placeFrame(assetEmbed(shot.asset), p ?? middle(w, h), w, h);
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
    onfit={zoomToFit} onreset={resetView} canFit={drawing.items.length > 0}
    onimage={(f) => void dropImage(f, null)} />

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="surface" class:dropping bind:this={host} role="application" tabindex="0"
    aria-label="Drawing canvas: press P for the pen, E for the eraser, L for the lasso"
    style:cursor={gesture?.kind === 'pan' ? 'grabbing' : CURSOR[tool]}
    {onpointerdown} {onpointermove} {onpointerup} onpointercancel={oncancel}
    {onwheel} {onkeydown} {onkeyup} {ondragover} {ondragleave} {ondrop}>
    <!-- The canvas is the pane; the boxes and the frames stand on a container
         of no size at all, carrying the view's transform, so they are placed
         in plane units and follow the ink exactly. -->
    <canvas class="ink" bind:this={canvas} style:width="{paneW}px" style:height="{paneH}px"></canvas>
    <div class="plane" style:transform="translate({-view.x * view.zoom}px,{-view.y * view.zoom}px) scale({view.zoom})">
      <div class="layer">
        {#each frames as f (f.id)}
          <Frame x={f.x} y={f.y} w={f.w} h={f.h} embed={f.embed} open={f.open}
            selected={selection.includes(f.id)} {scale} {resolver}
            onopen={openFrame}
            onmove={(nx, ny) => moveOne(f, nx, ny)} onresize={(nw, nh) => sizeOne(f, nw, nh)}
            ondecorate={decorate} />
        {/each}
        {#each boxes as b (b.id)}
          <!-- The box is placed by whoever holds it, which here is the plane:
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
  /* The tab is an `article`, and the book's own rule for one is a column of
     prose 820px wide with a wide margin under it. Here it is the pane itself,
     so that rule is turned off: the whole of the panel is drawable ground. */
  .drawing-tab{position:absolute;inset:0;max-width:none;margin:0;padding:0;display:flex;flex-direction:column;font-family:var(--sans);background:var(--bg)}
  /* The canvas takes every pointer for itself: no scrolling, no pinch of the
     browser's own, no long-press menu, because all of those are gestures the
     drawing means something else by. */
  .surface{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;outline:none;-webkit-user-select:none;user-select:none;background:var(--panel)}
  .surface:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .surface.dropping{box-shadow:inset 0 0 0 2px var(--accent)}
  /* The plane has no size and no ground of its own: it is a point at the top
     left of the pane carrying the view's transform, and everything standing on
     it is placed in plane units. The ground the reader sees is the pane's. */
  .plane{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}
  .ink{position:absolute;left:0;top:0;display:block}
  .layer{position:absolute;left:0;top:0}
  /* A text box fills whatever rectangle it is put in, so the plane is what
     puts it somewhere. */
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
