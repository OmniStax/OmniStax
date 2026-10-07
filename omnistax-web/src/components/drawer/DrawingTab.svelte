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
     glass every touch is ignored, which is the palm resting on the page. One
     finger draws or pans as the toolbar's finger button says, and two always
     zoom; a mouse draws, and pans with the middle button or with space held. Pressure sets the width of the nib where the device
     reports it.

     Undo here is the drawing's own, as it is in the note editor and the colour
     menu: Ctrl+Z inside this tab takes back a stroke and never a highlight
     made somewhere else. */
  import { onMount, tick } from 'svelte';
  import Toolbar from './Toolbar.svelte';
  import Frame from './Frame.svelte';
  import Group from './Group.svelte';
  import ChatFrame from './ChatFrame.svelte';
  import { CHAT_ITEM, plainCopy, readChatClip, type ChatClipDTO } from '../../lib/drawer/chatcopy';
  import { chats } from '../../lib/chat/store.svelte';
  import { messageId } from '../../lib/chat/model';
  import { fetchMissing } from '../../lib/notes/md/fetch';
  import TextBox from '../ui/TextBox.svelte';
  import {
    addGroup, addItem, amend, canRedo, canUndo, clampZoom, endPoint, groupAround, moveItems, newDrawItemId, ORIGIN, rectOf,
    redo, removeItems, replaceItem, scaleItems, setBoxBody, setColour, setView, sideAt, SIDES, step, timeline, undo,
    type Box, type Drawing, type DrawItem, type DrawItemId, type End, type GroupItem, type LinkItem, type Placed, type Point,
    type ShapeTool, type Side, type Timeline, type View,
  } from '../../lib/drawer/model';
  import {
    boundsOf, connectableAt, erasedAt, fitView, handleUnder, inBox, lassoed, linkPath, linkUnder, meets, membersOf,
    nearestSide, pathBetween, placedBounds, pointOn, resized, simplify, snapped, viewBox, type Handle, type Vec,
  } from '../../lib/drawer/geometry';
  import { drawItems, drawLasso, drawLive, drawPath, fitCanvas } from '../../lib/drawer/render';
  import { cssOf, paintFrom, type Colour } from '../../lib/drawer/colour';
  import { focus } from '../../lib/sections/focus.svelte';
  import { CURSOR, isInk, toolForKey, type Tool } from '../../lib/drawer/tools';
  import { assetEmbed, frameSize, snapshotImage } from '../../lib/drawer/snapshot';
  import { cardBooks, cardResolver } from '../../lib/drawer/cards';
  import { fillThumbs, thumbnailOf, waitingThumbs } from '../../lib/drawer/thumb';
  import { openItem } from '../../lib/sections/nav.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { split } from '../../lib/layout/model';
  import { paramsQuery, parseLink } from '../../lib/notes/md/links';
  import { dragging } from '../../lib/layout/drag.svelte';
  import {
    chatId, chatItem, docItem, drawingId, drawingItem, exItem, fileId, fileItem, figItem,
    itemKey, noteId, noteItem, parseSecKey, secKey, type GroupKey, type NoteId,
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
  let color = $state<Colour>('ink');
  let size = $state(2);
  let fill = $state(false);
  let shape = $state<ShapeTool>('line');

  /* A swatch picked with something selected recolours it as well. */
  const pickColour = (c: Colour): void => {
    color = c;
    if (selection.length) commit(setColour(drawing, selection, c));
  };

  /* ── colour follows the theme ──────────────────────────────────────────── */

  /* Tokens are turned into colours only when something is painted, read off a
     probe that carries the focused book so its quantity colours resolve. A
     turn of the theme throws the answers away and repaints the cache. */
  let probe = $state<HTMLElement | null>(null);
  let theme = $state(0);
  onMount(() => {
    const bump = (): void => { theme += 1; };
    const watch = new MutationObserver(bump);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)');
    dark?.addEventListener('change', bump);
    return () => { watch.disconnect(); dark?.removeEventListener('change', bump); };
  });
  const palette = $derived.by(() => { void theme; void focus.book; return paintFrom(probe ?? null); });

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
    | { readonly kind: 'move'; readonly from: Vec; last: Vec; readonly base: Drawing; readonly ids: readonly DrawItemId[] }
    | { readonly kind: 'resize'; readonly handle: Handle; readonly box: Box; readonly from: Vec; readonly base: Drawing }
    | { readonly kind: 'pan'; readonly x: number; readonly y: number; readonly from: View }
    | { readonly kind: 'erase' }
    | { readonly kind: 'connect'; readonly from: End; to: Vec }
    | { readonly kind: 'group'; readonly from: Vec; to: Vec };
  let gesture = $state.raw<Gesture | null>(null);
  let selection = $state.raw<readonly DrawItemId[]>([]);
  let shiftHeld = $state(false);
  let spaceHeld = $state(false);

  const selected = $derived(drawing.items.filter((i) => selection.includes(i.id)));
  const selectionBox = $derived(boundsOf(selected, drawing.items));

  /* The pointer that is drawing, and whether a pen has the page: a pen down
     makes every touch a palm, which is what the reader's hand resting on the
     glass is. */
  let drawingPointer = $state<number | null>(null);
  let penDown = $state(false);

  /* Whether one finger draws or pans. A stylus always draws; this is the
     reader's to set per device, since a phone and a tablet with a pen want
     opposite answers, and it starts on so a tablet without a pen can write. */
  const FINGER_KEY = 'omnistax-finger-draws';
  let fingerDraws = $state((() => { try { return localStorage.getItem(FINGER_KEY) !== '0'; } catch { return true; } })());
  const setFingerDraws = (on: boolean): void => {
    fingerDraws = on;
    try { localStorage.setItem(FINGER_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  };
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
  const viewKey = (): string => `${view.x},${view.y},${view.zoom},${paneW},${paneH},${theme}`;

  const rebuild = (): void => {
    if (typeof document === 'undefined') return;
    bitmap ??= document.createElement('canvas');
    const ctx = fitCanvas(bitmap, paneW, paneH);
    if (!ctx) return;
    const window = viewBox(view, paneW, paneH);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);
    const all = drawing.items;
    drawItems(ctx, all.filter((i) => meets(placedBounds(all, i), window)), palette, all);
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
    if (!g || (g.kind !== 'ink' && g.kind !== 'shape' && g.kind !== 'lasso' && g.kind !== 'connect' && g.kind !== 'group')) return;
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);
    const ink = palette(color);
    if (g.kind === 'ink') drawLive(ctx, tool === 'highlighter' ? 'highlighter' : 'pen', ink, size, g.points);
    if (g.kind === 'shape' && shape === 'arrow') drawPath(ctx, pathBetween(g.from, g.to, 'straight'), ink, size, { start: false, end: true });
    else if (g.kind === 'shape') drawItems(ctx, [{ kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to }], palette);
    if (g.kind === 'lasso' || g.kind === 'group') drawLasso(ctx, g.kind === 'lasso' ? g.poly : corners(g.from, g.to), palette('accent'), view.zoom);
    if (g.kind === 'connect') {
      const a = endPoint(drawing.items, g.from);
      const target = connectTarget(g);
      const b = target ? endPoint(drawing.items, target) : g.to;
      if (a && b) drawPath(ctx, pathBetween(a, b, 'bezier', 'side' in g.from ? g.from.side : null, target && 'side' in target ? target.side : null), ink, 2, { start: false, end: true });
    }
  };
  const corners = (a: Vec, b: Vec): Vec[] => [a, [b[0], a[1]], b, [a[0], b[1]]];

  $effect(() => { void drawing.items; void view; void gesture; void paneW; void paneH; void palette; paint(); });

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
    if (inBox(box, p[0], p[1])) { gesture = { kind: 'move', from: p, last: p, base: drawing, ids: carried(drawing.items, selection) }; return true; }
    return false;
  };

  /* With the lasso, a press on the empty inside of a group takes the group:
     the innermost one, and only where no ink of its own lies under the press,
     so a stroke inside a group can still be swept up from where it is. */
  const groupUnder = (p: Vec): GroupItem | null => {
    if (erasedAt(drawing.items, p[0], p[1], 4 / scale).some((i) => i.kind !== 'group')) return null;
    const inside = drawing.items.filter((i): i is GroupItem => i.kind === 'group' && inBox(i, p[0], p[1]));
    return inside.reduce<GroupItem | null>((best, g) => (best && best.w * best.h <= g.w * g.h ? best : g), null);
  };
  const grabGroupAt = (g: GroupItem, p: Vec): void => {
    selection = [g.id];
    gesture = { kind: 'move', from: p, last: p, base: drawing, ids: carried(drawing.items, [g.id]) };
  };

  /* A group moved carries everything inside it. */
  const carried = (items: readonly DrawItem[], ids: readonly DrawItemId[]): readonly DrawItemId[] => {
    const groups = items.filter((i): i is GroupItem => i.kind === 'group' && ids.includes(i.id));
    return [...new Set([...ids, ...groups.flatMap((g) => membersOf(items, g).map((i) => i.id))])];
  };

  /* The card a double-click made, which opens for writing. */
  let fresh = $state<DrawItemId | null>(null);
  const newTextBox = (p: Vec, on: Drawing = drawing, write = false): void => {
    const id = newDrawItemId();
    commit(addItem(on, { kind: 'box', id, x: p[0], y: p[1], w: 260, h: 90, body: '', ...(color === 'ink' ? {} : { color }) }));
    selection = [id];
    if (write) fresh = id;
  };

  /* ── connectors ────────────────────────────────────────────────────────── */

  /* The element the pointer is over, which wears a handle on each side. */
  let hovered = $state<DrawItemId | null>(null);
  const hoveredRect = $derived.by(() => { const i = hovered ? drawing.items.find((x) => x.id === hovered) : undefined; return i ? rectOf(i) : null; });

  const connectTarget = (g: { readonly from: End; readonly to: Vec }): End | null => {
    const hit = connectableAt(drawing.items, g.to[0], g.to[1], 0, 'item' in g.from ? g.from.item : null);
    const r = hit ? rectOf(hit) : null;
    return hit && r ? { item: hit.id, side: nearestSide(r, g.to[0], g.to[1]) } : null;
  };

  const newLink = (from: End, to: End, curve: LinkItem['curve'] = 'bezier'): LinkItem =>
    ({ kind: 'link', id: newDrawItemId(), from, to, curve, heads: { start: false, end: true }, color, size: Math.min(size, 8), label: '' });

  const selectedLink = $derived(selected.length === 1 && selected[0].kind === 'link' ? selected[0] : null);
  const setLink = (l: LinkItem, patch: Partial<LinkItem>): void => commit(replaceItem(drawing, { ...l, ...patch }));

  let naming = $state<DrawItemId | null>(null);
  const labels = $derived(drawing.items.flatMap((i) => {
    if (i.kind !== 'link' || (!i.label && naming !== i.id)) return [];
    const path = linkPath(drawing.items, i);
    return path ? [{ link: i, at: pointOn(path, 0.5) }] : [];
  }));
  const nameLink = (l: LinkItem, label: string): void => { naming = null; if (label !== l.label) commit(replaceItem(drawing, { ...l, label })); };
  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };

  const OWN_POINTER = '.boxed, .frame, .chat-item, .link-label, .sel-bar';
  const grabsSelection = (e: PointerEvent): boolean => {
    const box = selectionBox;
    if (tool !== 'lasso' || !box || selection.length < 2) return false;
    const [x, y] = at(e.clientX, e.clientY);
    return inBox(box, x, y);
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
    const side = (e.target as HTMLElement).closest<HTMLElement>('[data-side]');
    if (side && hovered && e.button === 0) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      drawingPointer = e.pointerId;
      gesture = { kind: 'connect', from: { item: hovered, side: side.dataset.side as Side }, to: at(e.clientX, e.clientY) };
      return;
    }
    /* The page itself is moved by the hand tool, by the middle button, and by
       a drag with space held, which is what every canvas does. */
    const panning = tool === 'pan' || e.button === 1 || spaceHeld || (e.pointerType === 'touch' && touches.size === 1 && !fingerDraws);
    /* A press on a card, a frame or a chat is theirs: taking the pointer here
       would send their clicks and double-clicks to the surface instead. */
    if (!panning && !grabsSelection(e) && (e.target as HTMLElement).closest(OWN_POINTER)) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drawingPointer = e.pointerId;
    if (panning) { gesture = { kind: 'pan', x: e.clientX, y: e.clientY, from: view }; return; }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = at(e.clientX, e.clientY);
    if (tool === 'lasso') {
      if (beginSelectionDrag(p)) return;
      const l = linkUnder(drawing.items, p[0], p[1], 6 / scale);
      if (l) { selection = [l.id]; return; }
      const g = groupUnder(p);
      if (g) { grabGroupAt(g, p); return; }
      selection = []; gesture = { kind: 'lasso', poly: [p] }; return;
    }
    if (tool === 'group') { selection = []; gesture = { kind: 'group', from: p, to: p }; return; }
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
    if (e.pointerType !== 'touch') lastPointer = at(e.clientX, e.clientY);
    if (!g && e.pointerType !== 'touch') {
      const [x, y] = at(e.clientX, e.clientY);
      hovered = connectableAt(drawing.items, x, y, 16 / scale)?.id ?? null;
    }
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
    if (g.kind === 'connect' || g.kind === 'group') { gesture = { ...g, to: p }; return; }
    if (g.kind === 'erase') { eraseAt(p); return; }
    if (g.kind === 'move') { nudge(moveItems(g.base, g.ids, p[0] - g.from[0], p[1] - g.from[1])); gesture = { ...g, last: p }; return; }
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
      if (!points.length) return;
      const before = history;
      commit(addItem(drawing, { kind: 'stroke', id: newDrawItemId(), tool: tool === 'highlighter' ? 'highlighter' : 'pen', color, size, points }));
      const b = boundsOf([{ kind: 'stroke', id: newDrawItemId(), tool: 'pen', color, size: 0, points }]);
      const tiny = b !== null && b.w + b.h < 4 / view.zoom;
      const now = performance.now();
      dot = !tiny ? null : dot && now - dot.at < DOUBLE_MS ? dot : { before, at: now };
      return;
    }
    if (g.kind === 'shape') {
      const moved = Math.hypot(g.to[0] - g.from[0], g.to[1] - g.from[1]) > 2 / view.zoom;
      if (!moved) return;
      if (shape === 'arrow') commit(addItem(drawing, newLink({ x: g.from[0], y: g.from[1] }, { x: g.to[0], y: g.to[1] }, 'straight')));
      else commit(addItem(drawing, { kind: 'shape', id: newDrawItemId(), shape, color, size, fill, from: g.from, to: g.to }));
      return;
    }
    if (g.kind === 'connect') {
      const target = connectTarget(g);
      const a = endPoint(drawing.items, g.from);
      if (!target && (!a || Math.hypot(g.to[0] - a[0], g.to[1] - a[1]) < 12 / view.zoom)) return;
      const link = newLink(g.from, target ?? { x: g.to[0], y: g.to[1] });
      commit(addItem(drawing, link));
      selection = [link.id];
      return;
    }
    if (g.kind === 'group') {
      const x = Math.min(g.from[0], g.to[0]), y = Math.min(g.from[1], g.to[1]);
      const w = Math.abs(g.to[0] - g.from[0]), h = Math.abs(g.to[1] - g.from[1]);
      if (w < 20 / view.zoom || h < 20 / view.zoom) return;
      const id = newDrawItemId();
      commit(addGroup(drawing, { kind: 'group', id, x, y, w, h, label: 'Group', ...(color === 'ink' ? {} : { color }) }));
      selection = [id];
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

  /* A double-click with the pen leaves two dots before it is known to be a
     double-click; the timeline from before the first is kept to take them
     back when it turns out to be one. */
  const DOUBLE_MS = 600;
  let dot: { readonly before: Timeline; readonly at: number } | null = null;

  /* Double-clicking empty ground makes a text card there, and on a connector
     names it. */
  const ondblclick = (e: MouseEvent): void => {
    /* A captured pointer's clicks land on the surface itself. */
    if (e.target !== canvas && e.target !== host) return;
    const p = at(e.clientX, e.clientY);
    const l = linkUnder(drawing.items, p[0], p[1], 6 / scale);
    if (l) { naming = l.id; return; }
    const recent = dot && performance.now() - dot.at < DOUBLE_MS ? dot.before : null;
    dot = null;
    if (recent) { history = recent; onchange(recent.now); }
    newTextBox(p, history.now, true);
  };

  const groupSelection = (): void => {
    const box = selectionBox;
    if (!box) return;
    const id = newDrawItemId();
    commit(groupAround(drawing, box, id));
    selection = [id];
  };

  /* A group dragged by its label: its members come along, and the drag is one
     step when it ends. */
  let groupDrag: { readonly base: Drawing; readonly ids: readonly DrawItemId[] } | null = null;
  const grabGroup = (g: GroupItem): void => { groupDrag = { base: drawing, ids: carried(drawing.items, [g.id]) }; };
  const moveGroup = (dx: number, dy: number): void => { if (groupDrag) nudge(moveItems(groupDrag.base, groupDrag.ids, dx, dy)); };
  const endGroup = (): void => {
    const base = groupDrag?.base;
    groupDrag = null;
    if (!base || history.now === base) return;
    const settled = history.now;
    history = step({ ...history, now: base }, settled);
    onchange(settled);
  };

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
  const ARROWS: Readonly<Record<string, Vec>> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const onkeydown = (e: KeyboardEvent): void => {
    /* A live figure's controls keep their own keys. */
    if (e.target !== host && (e.target as HTMLElement).closest('.frame')) return;
    if (e.key === 'Shift') shiftHeld = true;
    if (e.key === ' ' && !e.repeat) { spaceHeld = true; e.preventDefault(); }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault(); e.stopPropagation();
      if (e.shiftKey) putBack(); else takeBack();
      return;
    }
    if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); e.stopPropagation(); groupSelection(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopPropagation(); putBack(); return; }
    if (mod || e.altKey) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault(); e.stopPropagation();
      commit(removeItems(drawing, selection));
      selection = [];
      return;
    }
    /* The arrows nudge what is selected a screen pixel, ten with Shift; a key
       held down is one step. */
    const arrow = ARROWS[e.key];
    if (arrow && selection.length) {
      e.preventDefault(); e.stopPropagation();
      const k = (e.shiftKey ? 10 : 1) / view.zoom;
      const next = moveItems(drawing, carried(drawing.items, selection), arrow[0] * k, arrow[1] * k);
      if (e.repeat) nudge(next); else commit(next);
      return;
    }
    if (e.key === 'Escape') { selection = []; naming = null; return; }
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
  /* A figure is live in its frame and grows to the height it draws at. */
  const FIGURE_SIZE = { w: 560, h: 360 };

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
    placeEmbed(e.dataTransfer?.getData('text/plain') ?? '', p);
  };

  /* An embed's text, dropped or pasted, as what it names: a whole chat is the
     live chat, a figure the live figure, anything else the card a note shows. */
  const placeEmbed = (text: string, p: Vec): boolean => {
    const m = BRACKETS.exec(text.trim());
    if (!m) return false;
    const inner = m[1];
    const link = parseLink(inner);
    if (link.kind === 'figure') {
      placeFrame(`fig:${secKey(cardBooks.ref(link.section, link.book))}:${link.id}${paramsQuery(link.params)}`, p, FIGURE_SIZE.w, FIGURE_SIZE.h);
      return true;
    }
    if (link.kind === 'chat' && link.message === undefined) {
      const id = newDrawItemId();
      commit(addItem(drawing, { kind: 'chat', id, x: p[0], y: p[1], ...CHAT_ITEM, chat: link.chat }));
      selection = [id];
      return true;
    }
    placeFrame(inner, p, CARD_SIZE.w, CARD_SIZE.h);
    return true;
  };

  /* ── what is pasted on the page ────────────────────────────────────────── */

  /* A chat copied plain is laid out as its cards and connectors, one step; an
     embed copied is placed as a drop would place it. Plain words are left
     alone. Whatever is pasted lands under the pointer when it is over the page. */
  let lastPointer: Vec | null = null;
  const pasteAt = (w: number, h: number): Vec => lastPointer ?? middle(w, h);

  const pasteChat = async (clip: ChatClipDTO): Promise<void> => {
    const chat = await chats.load(chatId(clip.chat)).catch(() => null);
    if (!chat) return;
    const items = plainCopy(chat, pasteAt(0, 0), clip.root ? messageId(clip.root) : undefined);
    if (!items.length) return;
    commit(items.reduce<Drawing>((d, i) => addItem(d, i), drawing));
    selection = items.map((i) => i.id);
  };

  const onpaste = (e: ClipboardEvent): void => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, textarea, [contenteditable], .cm-editor')) return;
    const clip = readChatClip(e.clipboardData);
    if (clip) { e.preventDefault(); void pasteChat(clip); return; }
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (placeEmbed(text, pasteAt(CARD_SIZE.w, CARD_SIZE.h))) e.preventDefault();
  };

  /* ── opening what a frame holds ────────────────────────────────────────── */

  /* A figure opens in a split to the right of the drawing, where it has a
     pane to itself at the size the book draws it. Everything else with
     a tab of its own opens wherever its tab opens; a card of the book's tables
     has no tab, so its glyph is not drawn at all. */
  const openFrame = (key: string): void => {
    const link = parseLink(key);
    if (link.kind === 'figure') {
      const group = layoutStore.layout.groups.findIndex((g) => g.key === groupKey);
      layoutStore.apply((l) => split(l, group < 0 ? l.focus : group, 'right', figItem(cardBooks.ref(link.section, link.book), link.id)));
      return;
    }
    const item = link.kind === 'exercise' ? exItem(cardBooks.ref(link.section, link.book), link.id)
      : link.kind === 'file' ? fileItem(fileId(link.file))
        : link.kind === 'chat' ? chatItem(chatId(link.chat))
          : link.kind === 'drawing' ? drawingItem(drawingId(link.id))
            : link.kind === 'note' ? noteOf(link.name)
              : link.kind === 'section' ? docItem(cardBooks.ref(link.section, link.book), 'text')
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
    if (sec) { void openItem(itemKey(docItem(parseSecKey(sec[1]) ?? cardBooks.ref(sec[1]), 'text'))); return; }
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
    cardBooks.setMath(el);
    void fetchMissing(el, cardBooks);
  };

  /* ── the boxes and the frames ──────────────────────────────────────────── */

  const boxes = $derived(drawing.items.filter((i): i is Extract<DrawItem, { kind: 'box' }> => i.kind === 'box'));
  const groups = $derived(drawing.items.filter((i): i is GroupItem => i.kind === 'group'));
  const chatItems = $derived(drawing.items.filter((i): i is Extract<DrawItem, { kind: 'chat' }> => i.kind === 'chat'));

  /* A drag of a whole item is a run of nudges, and one step when it ends. */
  let dragBase: Drawing | null = null;
  const settleDrag = (): void => {
    const base = dragBase;
    dragBase = null;
    if (!base || history.now === base) return;
    const settled = history.now;
    history = step({ ...history, now: base }, settled);
    onchange(settled);
  };
  const tintOf = (i: { readonly color?: Colour }): string | null => (i.color ? cssOf(i.color) : null);

  /* A frame holding a note can be written in where it stands. */
  let writingIn = $state<DrawItemId | null>(null);
  const noteIn = (embed: string): NoteId | null => {
    const link = parseLink(embed);
    const id = link.kind === 'note' ? cardResolver().note(link.name) : null;
    return id ? noteId(id) : null;
  };
  const frames = $derived(drawing.items.filter((i): i is Extract<DrawItem, { kind: 'frame' }> => i.kind === 'frame'));
  const resolver = () => cardResolver();

  const moveOne = (i: Placed, x: number, y: number): void =>
    nudge(replaceItem(drawing, { ...i, x, y }));
  const sizeOne = (i: Placed, w: number, h: number): void =>
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
    ontool={(t) => (tool = t)} oncolor={pickColour} onsize={(n) => (size = n)}
    onfill={(on) => (fill = on)} onshape={(s) => (shape = s)}
    {fingerDraws} onfinger={setFingerDraws}
    onundo={takeBack} onredo={putBack} {onsave}
    onfit={zoomToFit} onreset={resetView} canFit={drawing.items.length > 0}
    onimage={(f) => void dropImage(f, null)} />

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="surface" class:dropping bind:this={host} role="application" tabindex="0"
    aria-label="Drawing canvas: press P for the pen, E for the eraser, L for the lasso"
    style:cursor={gesture?.kind === 'pan' ? 'grabbing' : CURSOR[tool]}
    {onpointerdown} {onpointermove} {onpointerup} onpointercancel={oncancel}
    {onwheel} {onkeydown} {onkeyup} {ondragover} {ondragleave} {ondrop} {ondblclick} {onpaste}
    onpointerleave={() => { lastPointer = null; if (!gesture) hovered = null; }}>
    <span class="probe" data-book={focus.book} bind:this={probe} hidden></span>
    <!-- The canvas is the pane; the boxes and the frames stand on a container
         of no size at all, carrying the view's transform, so they are placed
         in plane units and follow the ink exactly. -->
    <canvas class="ink" bind:this={canvas} style:width="{paneW}px" style:height="{paneH}px"></canvas>
    <div class="plane" style:transform="translate({-view.x * view.zoom}px,{-view.y * view.zoom}px) scale({view.zoom})">
      <div class="layer">
        {#each groups as g (g.id)}
          <Group x={g.x} y={g.y} w={g.w} h={g.h} label={g.label} tint={tintOf(g)} selected={selection.includes(g.id)} {scale}
            ongrab={() => grabGroup(g)} onmove={moveGroup} onend={endGroup}
            onresize={(nw, nh) => sizeOne(g, nw, nh)}
            onlabel={(label) => { if (label !== g.label) commit(replaceItem(drawing, { ...g, label })); }}
            onselect={() => (selection = [g.id])} />
        {/each}
        {#each frames as f (f.id)}
          <Frame x={f.x} y={f.y} w={f.w} h={f.h} embed={f.embed} open={f.open}
            selected={selection.includes(f.id)} {scale} {resolver} tint={tintOf(f)}
            note={noteIn(f.embed)} editing={writingIn === f.id} onedit={(on) => (writingIn = on ? f.id : null)}
            onopen={openFrame}
            onmove={(nx, ny) => moveOne(f, nx, ny)} onresize={(nw, nh) => sizeOne(f, nw, nh)}
            onembed={(embed) => { const { open: _, ...rest } = f; commit(replaceItem(drawing, { ...rest, embed })); }}
            onfit={(nh) => nudge(replaceItem(drawing, { ...f, h: nh }))}
            ondecorate={decorate} />
        {/each}
        {#each chatItems as c (c.id)}
          <ChatFrame x={c.x} y={c.y} w={c.w} h={c.h} chat={c.chat} root={c.root} {scale}
            selected={selection.includes(c.id)}
            onselect={() => { selection = [c.id]; dragBase = drawing; }} onend={settleDrag}
            onmove={(nx, ny) => moveOne(c, nx, ny)} onresize={(nw, nh) => sizeOne(c, nw, nh)} />
        {/each}
        {#each boxes as b (b.id)}
          <!-- The box is placed by whoever holds it, which here is the plane:
               TextBox fills the rectangle it is given and says where the
               reader dragged it to. -->
          <div class="boxed" class:tinted={b.color !== undefined} data-box={b.id} style:--tint={tintOf(b)}
            style:left="{b.x}px" style:top="{b.y}px" style:width="{b.w}px" style:height="{b.h}px">
            <TextBox x={b.x} y={b.y} w={b.w} h={b.h} body={b.body} autowrite={fresh === b.id}
              selected={selection.includes(b.id)} {resolver}
              onchange={(body) => nudge(setBoxBody(drawing, b.id, body))}
              onmove={(r) => moveOne(b, r.x, r.y)}
              onresize={(r) => sizeOne(b, r.w, r.h)}
              onselect={() => (selection = [b.id])}
              onremove={() => { commit(removeItems(drawing, [b.id])); selection = []; }}
              onlink={followLink} />
          </div>
        {/each}
        {#each labels as { link, at: m } (link.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="link-label" style:left="{m[0]}px" style:top="{m[1]}px" style:color={palette(link.color)}
            onpointerdown={(e) => { e.stopPropagation(); selection = [link.id]; }}
            ondblclick={(e) => { e.stopPropagation(); naming = link.id; }}>
            {#if naming === link.id}
              <input value={link.label} aria-label="Connector label" use:takeFocus
                onblur={(e) => nameLink(link, (e.currentTarget as HTMLInputElement).value.trim())}
                onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur(); }} />
            {:else}{link.label}{/if}
          </div>
        {/each}
        {#if hoveredRect && (!gesture || gesture.kind === 'connect')}
          {@const r = hoveredRect}
          {#each SIDES as side (side)}
            {@const [hx, hy] = sideAt({ x: r.x - 10 / scale, y: r.y - 10 / scale, w: r.w + 20 / scale, h: r.h + 20 / scale }, side)}
            <span class="side" data-side={side} title="Drag to connect"
              style:left="{hx}px" style:top="{hy}px" style:width="{10 / scale}px" style:height="{10 / scale}px" style:border-width="{1.5 / scale}px"></span>
          {/each}
        {/if}
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
    {#if selectionBox && !gesture}
      {@const s = selectionBox}
      <!-- The bar for what is selected, in screen units so it does not scale. -->
      <div class="sel-bar" style:left="{(s.x - view.x) * view.zoom}px" style:top="{(s.y + s.h - view.y) * view.zoom + 8}px"
        onpointerdown={(e) => e.stopPropagation()}>
        {#if selectedLink}
          {@const l = selectedLink}
          <button type="button" class="chip" onclick={() => setLink(l, { curve: l.curve === 'bezier' ? 'straight' : 'bezier' })}>{l.curve === 'bezier' ? 'Curved' : 'Straight'}</button>
          <button type="button" class="chip" class:on={l.heads.start} title="Start arrowhead" onclick={() => setLink(l, { heads: { ...l.heads, start: !l.heads.start } })}>&larr;</button>
          <button type="button" class="chip" class:on={l.heads.end} title="End arrowhead" onclick={() => setLink(l, { heads: { ...l.heads, end: !l.heads.end } })}>&rarr;</button>
          <button type="button" class="chip" onclick={() => (naming = l.id)}>Label</button>
        {:else}
          <button type="button" class="chip" title="Ctrl+G" onclick={groupSelection}>Group</button>
        {/if}
      </div>
    {/if}
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
  .boxed.tinted :global(.text-box){border-color:var(--tint);background:color-mix(in srgb,var(--tint) 8%,var(--panel))}
  .side{position:absolute;box-sizing:border-box;border-radius:50%;border-style:solid;border-color:var(--accent);background:var(--panel);transform:translate(-50%,-50%);cursor:crosshair;z-index:3}
  .side:hover{background:var(--accent)}
  .link-label{position:absolute;transform:translate(-50%,-50%);padding:1px 6px;border-radius:4px;background:var(--panel);font-family:var(--sans);font-size:13px;white-space:nowrap;cursor:default;z-index:1}
  .link-label input{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:4px;padding:0 4px;width:10em}
  .sel-bar{position:absolute;display:flex;gap:4px;padding:3px;border:1px solid var(--rule);border-radius:7px;background:var(--bg);box-shadow:0 2px 8px rgb(0 0 0 / .12);z-index:5}
  .sel-bar .chip{font:inherit;font-size:0.74rem;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:5px;padding:2px 8px;cursor:pointer}
  .sel-bar .chip.on{border-color:var(--accent);color:var(--accent)}
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
