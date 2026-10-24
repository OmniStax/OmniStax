<script lang="ts">
  /* The goto card: one popover for every underlinable thing in a document.
     Mounted once. Listens on the document for the pointer or the focus
     reaching a target, opens after a short delay, and stays while the pointer
     crosses into the card. Escape closes; on touch, or with cards set to open
     on click, a click opens and a click elsewhere closes. It also carries the underline rules for its targets and
     the click that follows a figure reference into a section not yet open.
     A concept's card carries more than a sentence: under it stand the places
     the text introduces it, uses it and tests it, each one a link to go there. */
  import { onMount, tick } from 'svelte';
  import { targetOf, cardFor, openDelay, readyFor } from '../lib/hover/cards';
  import type { Card } from '../lib/hover/resolve';
  import { KIND_LABEL } from '../lib/sections/reference';
  import type { ConceptKind } from '../lib/content/schema';
  import { glyphOf } from '../lib/hover/data';
  import { bookOfEl, findEl, goSpan, openingIn, openingAs, onMiddle, wantsNewGroup } from '../lib/sections/nav.svelte';
  import { spanId, spanRef } from '../lib/types/ids';
  import { figFor } from '../lib/fig/figlib';
  import { elementColor } from '../lib/fig/elements';
  import { settings } from '../lib/settings/store.svelte';
  import { sketch, pathOf, type Win } from '../lib/grapher/plot';

  const CLOSE_GRACE = 200;
  const PLOT_W = 260, PLOT_H = 150;
  const px = (w: Win, x: number): number => ((x - w.x0) / (w.x1 - w.x0)) * PLOT_W;
  const py = (w: Win, y: number): number => ((w.y1 - y) / (w.y1 - w.y0)) * PLOT_H;
  type Placed = { readonly top: number; readonly left: number; readonly ready: boolean; readonly most?: number };
  let card = $state<Card | null>(null);
  let anchor = $state<HTMLElement | null>(null);
  let box = $state<HTMLElement | null>(null);
  let pos = $state<Placed>({ top: 0, left: 0, ready: false });
  const chapter = $derived(anchor?.closest<HTMLElement>('[data-chapter]')?.dataset.chapter ?? '');
  const book = $derived(anchor ? bookOfEl(anchor) ?? '' : '');
  const symColor = $derived.by(() => { const g = anchor ? glyphOf(anchor) : null; return g ? getComputedStyle(g).color : ''; });   /* the glyph's own hue: chapter, section and colour coding all applied */

  let openT = 0, closeT = 0, pending: HTMLElement | null = null;
  let mouseDown = false, touch = false;
  const clearTimers = () => { clearTimeout(openT); clearTimeout(closeT); pending = null; };
  const close = () => { clearTimers(); card = null; anchor = null; };
  /* A card whose facts are still on their way opens once they arrive, if the pointer is still there. */
  const show = (t: HTMLElement, waited = false) => {
    clearTimers();
    const wait = waited ? null : readyFor(t);
    if (wait) { pending = t; void wait.then(() => { if (pending === t) show(t, true); }); return; }
    const c = cardFor(t); if (!c) { if (anchor) close(); return; } card = c; anchor = t; pos = { ...pos, ready: false }; };
  const scheduleOpen = (t: HTMLElement) => { if (t === anchor || t === pending) { clearTimeout(closeT); return; } clearTimers(); pending = t; openT = window.setTimeout(() => show(t), openDelay(t)); };
  const scheduleClose = () => { clearTimers(); if (card) closeT = window.setTimeout(close, CLOSE_GRACE); };
  const inCard = (n: EventTarget | null): boolean => n instanceof Node && !!box && box.contains(n);
  /* A symbol reaches a few pixels past its box: a derivation drawn small makes it a sliver, an italic glyph hangs over
     the bracket beside it, and a figure's labels let the pointer through to the canvas under them. */
  const REACH = 6;
  const nearSym = (e: MouseEvent): HTMLElement | null => {
    const at = e.target instanceof Element ? e.target : null, scope = at?.closest('figure') ?? at?.closest('.katex-html'); if (!scope) return null;
    let best: Element | null = null, bd = REACH;
    for (const s of scope.querySelectorAll('[data-sym]')) {
      const r = (s.closest('.enclosing[class*="kv-"]') ?? s).getBoundingClientRect(); if (!r.width) continue;
      const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
      if (d < bd) { bd = d; best = s; }
    }
    return best ? targetOf(best) : null;
  };
  /* a whole equation's card gives way to a symbol in reach */
  const hoverTarget = (e: MouseEvent): HTMLElement | null => { const t = targetOf(e.target); return t && !t.matches('.katex-display, [data-eq]') ? t : nearSym(e) ?? t; };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  /* The card never covers what it belongs to. It hangs below the target, or
     above it where below has no room; beside it where neither has; and where
     no side holds the whole card, on the roomier of above and below, cut to
     that room and scrolled. Sliding it along the target's edge to keep it on
     screen never brings it back over the target, and a card that grows once
     its maths is set is placed again. */
  const GAP = 6, EDGE = 8;
  const place = () => {
    if (!anchor || !box) return;
    const r = anchor.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) { close(); return; }
    const b = { width: box.getBoundingClientRect().width, height: box.scrollHeight + box.offsetHeight - box.clientHeight };
    const room = { below: vh - EDGE - r.bottom - GAP, above: r.top - GAP - EDGE, right: vw - EDGE - r.right - GAP, left: r.left - GAP - EDGE };
    const across = clamp(r.left, EDGE, Math.max(EDGE, vw - b.width - EDGE)), down = clamp(r.top, EDGE, Math.max(EDGE, vh - b.height - EDGE));
    /* An anchor that asks for its card at its right, rising from its own line, gets that while it fits. */
    const side = anchor.dataset.cardSide === 'right' ? (b.width <= room.right ? 'right' : b.width <= room.left ? 'left' : null) : null;
    pos = side ? { top: clamp(r.bottom - b.height, EDGE, Math.max(EDGE, vh - b.height - EDGE)), left: side === 'right' ? r.right + GAP : r.left - GAP - b.width, ready: true }
      : b.height <= room.below ? { top: r.bottom + GAP, left: across, ready: true }
      : b.height <= room.above ? { top: r.top - GAP - b.height, left: across, ready: true }
      : b.width <= room.right ? { top: down, left: r.right + GAP, ready: true }
      : b.width <= room.left ? { top: down, left: r.left - GAP - b.width, ready: true }
      : room.below >= room.above ? { top: r.bottom + GAP, left: across, ready: true, most: room.below }
      : { top: EDGE, left: across, ready: true, most: room.above };
  };
  $effect(() => { if (!card || !anchor) return; tick().then(place); });
  $effect(() => { const el = box; if (!el) return; const ro = new ResizeObserver(() => place()); ro.observe(el); return () => ro.disconnect(); });
  $effect(() => { const click = settings.cardOpen === 'click'; document.documentElement.classList.toggle('cards-click', click); if (click) close(); });

  const tex = (node: HTMLElement, s: string) => { figFor(book).tex(node, s); return { update(n: string) { figFor(book).tex(node, n); } }; };
  const math = (node: HTMLElement, _dep?: unknown) => { figFor(book).renderMath(node); return { update() { figFor(book).renderMath(node); } }; };
  const run = (a: { run: (split?: boolean) => void }, e?: MouseEvent) => { const how = openingIn(e, anchor); openingAs(how, () => a.run(how === 'new')); close(); };

  /* A tap, or a click when cards open on click: the card waits for it and stays until the next one elsewhere. */
  const byClick = (): boolean => touch || settings.cardOpen === 'click';

  onMount(() => {
    const onOver = (e: MouseEvent) => {
      if (mouseDown || byClick()) return;
      const t = hoverTarget(e);
      if (t) { scheduleOpen(t); return; }
      if (inCard(e.target)) { clearTimeout(closeT); return; }
      if (card || pending) scheduleClose();
    };
    const onOut = (e: MouseEvent) => { if (!byClick() && e.relatedTarget === null && (card || pending)) scheduleClose(); };
    const onFocusIn = (e: FocusEvent) => { if (byClick()) return; const t = targetOf(e.target); if (t) show(t); else if (inCard(e.target)) clearTimeout(closeT); };
    const onFocusOut = (e: FocusEvent) => { if (!card || byClick()) return; const to = e.relatedTarget; if (inCard(to) || (to instanceof Element && targetOf(to) === anchor)) return; scheduleClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && card) close(); };
    const onPointerDown = (e: PointerEvent) => {
      touch = e.pointerType === 'touch'; mouseDown = !touch && e.button === 0;
      if (inCard(e.target)) return;
      if (byClick() && targetOf(e.target)) return;   /* the click that follows decides */
      close();
    };
    const onPointerUp = () => { mouseDown = false; };
    /* over a figure the pointer can come near a symbol without crossing into an element, so the reach is read as it moves */
    let lastNear: HTMLElement | null = null;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return; touch = false;   /* a mouse after a touch hovers again */
      if (mouseDown || byClick() || !(e.target instanceof Element) || !e.target.closest('figure')) { lastNear = null; return; }
      const t = hoverTarget(e); if (t === lastNear) return; lastNear = t;
      if (t) scheduleOpen(t); else if ((card || pending) && !inCard(e.target)) scheduleClose();
    };
    /* Capture phase, so it runs before the shell's own link handler. */
    /* A target that asks for a double-click — a node of the concept map, whose
       single click selects it — opens its card on the second click where
       cards open on click; a single click on it only puts away another's. */
    const onDouble = (t: HTMLElement | null): boolean => !!t && t.dataset.cardOpen === 'dblclick' && !touch && settings.cardOpen === 'click';
    const onDblClick = (e: MouseEvent) => { const t = targetOf(e.target); if (t && onDouble(t)) show(t); };
    const onClick = (e: MouseEvent) => {
      const t = targetOf(e.target);
      if (t && onDouble(t)) { if (t !== anchor) close(); return; }
      const link = (t ?? (e.target instanceof Element ? e.target : null))?.closest<HTMLAnchorElement>('a[href]') ?? null;
      if (t && byClick()) {
        if (t !== anchor) { if (link) { e.preventDefault(); e.stopPropagation(); } show(t); return; }   /* a link opens its card first, and a second click follows it */
        close(); if (!link) return;
      }
      const a = link?.matches('a.figref, a.xref') ? link : null; if (!a) return;
      const id = a.getAttribute('href')?.slice(1); const book = bookOfEl(a); if (!id || !book || findEl(book, id)) return;
      e.preventDefault(); goSpan(spanRef(book, spanId(id)), wantsNewGroup(e)); close();
    };
    const onScroll = () => { if (card) place(); };
    document.addEventListener('mouseover', onOver); document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onFocusIn); document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onPointerDown, true); document.addEventListener('pointerup', onPointerUp, true); document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('click', onClick, true); document.addEventListener('dblclick', onDblClick, true); document.addEventListener('scroll', onScroll, true); window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mouseover', onOver); document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointerDown, true); document.removeEventListener('pointerup', onPointerUp, true); document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('click', onClick, true); document.removeEventListener('dblclick', onDblClick, true); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
    };
  });
</script>

{#if card}{#key card}
  <div class="hover-card" class:ready={pos.ready} style:top="{pos.top}px" style:left="{pos.left}px" style:max-height={pos.most ? `${pos.most}px` : null} style:overflow-y={pos.most ? 'auto' : null} data-book={book || null} data-chapter={chapter} data-kind={card.kind} bind:this={box} role="dialog" aria-label={card.title}>
    <div class="eyebrow">{#each card.eyebrow.split(' · ') as piece, i (i)}{#if i}{' · '}{/if}{#if card.conceptKind && piece === KIND_LABEL[card.conceptKind as ConceptKind]}<span class="kb k-{card.conceptKind}">{piece}</span>{:else}{piece}{/if}{/each}{#if card.unit}{' · '}<span class="unit">{card.unit}</span>{/if}</div>
    {#if card.tex}<div class="sym" style:color={symColor || null} use:tex={card.tex}></div>{:else}<div class="title" data-type={card.type ?? null} use:math={card.title}>{@html card.title}</div>{/if}
    {#if card.plot}{@const sk = sketch(card.plot, PLOT_W)}{#if sk}{@const w = sk.win}<svg class="plot" viewBox="0 0 {PLOT_W} {PLOT_H}" data-type={card.type ?? null} aria-hidden="true">
      {#if w.y0 < 0 && w.y1 > 0}<line class="axis" x1="0" x2={PLOT_W} y1={py(w, 0)} y2={py(w, 0)} />{/if}
      <line class="axis" x1={px(w, 0)} x2={px(w, 0)} y1="0" y2={PLOT_H} />
      <path class="curve" d={pathOf(sk.trace.pieces, w, PLOT_W, PLOT_H)} />
      {#each sk.trace.marks as m, i (i)}<circle class="mark" class:open={m.open} cx={px(w, m.x)} cy={py(w, m.y)} r="3" />{/each}
    </svg>{/if}{/if}
    {#if card.body}<p class="body" use:math={card.body}>{card.body}</p>{/if}
    {#each card.notes ?? [] as n (n.label)}<p class="aside" use:math={n.text}><span class="lead">{n.label}</span> {n.text}</p>{/each}
    {#if card.chips?.length}<div class="chips">{#each card.chips as c (c.symbol)}<button type="button" class="chip" style:--el={settings.shown.facts ? elementColor(c.symbol, settings.dark) : 'var(--ink)'} title="{c.name} · {c.count === 1 ? 'one atom' : `${c.count} atoms`}" onclick={(e) => run(c, e)} onauxclick={onMiddle((e) => run(c, e))}><span class="sym">{c.symbol}</span>{#if c.count > 1}<span class="n">{c.count}</span>{/if}</button>{/each}</div>{/if}
    {#if card.refs?.length}<dl class="refs">{#each card.refs as g (g.label)}<dt>{g.label}</dt><dd>{#each g.links as l, i}{#if i}<span class="sep">·</span>{/if}<button type="button" class="ref" onclick={(e) => run(l, e)} onauxclick={onMiddle((e) => run(l, e))} use:math={l.label}>{@html l.label}</button>{/each}{#if g.more}{@const m = g.more}<span class="sep">·</span><button type="button" class="ref more" onclick={(e) => run(m, e)} onauxclick={onMiddle((e) => run(m, e))}>{m.label}</button>{/if}</dd>{/each}</dl>{/if}
    {#if card.swatch}<div class="swatch"><span class="box" style:background="var(--c-{card.swatch.type})"></span>{card.swatch.label}</div>{/if}
    {#if card.actions.length}<div class="actions">{#each card.actions as a (a.label)}<button type="button" onclick={(e) => run(a, e)} onauxclick={onMiddle((e) => run(a, e))}>{a.label}</button>{/each}</div>{/if}
  </div>
{/key}{/if}

<style>
  .hover-card{position:fixed;z-index:60;max-width:min(340px,calc(100vw - 16px));padding:10px 12px 9px;background:var(--panel);color:var(--ink);border:1px solid var(--rule);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.14),0 1px 3px rgba(0,0,0,0.08);font-family:var(--sans);font-size:0.82rem;line-height:1.45;visibility:hidden}
  .hover-card.ready{visibility:visible}
  .eyebrow{margin-bottom:3px}
  .sym{font-size:1.25rem;line-height:1.2;margin:2px 0 4px}
  .sym :global(.katex){font-size:1em}
  .title{font-weight:600;font-size:0.92rem;margin-bottom:3px}
  .body{margin:0;color:var(--ink);max-width:36em}
  .body :global(.katex){font-size:1em}
  .aside{margin:5px 0 0;max-width:36em}
  .aside .lead{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);font-weight:600;margin-right:4px}
  .aside :global(.katex){font-size:1em}
  /* a unit keeps its case: m is not M */
  .eyebrow .unit{text-transform:none;letter-spacing:0;font-family:var(--mono);font-weight:400}
  .hover-card[data-kind="definition"]{max-width:min(380px,calc(100vw - 16px))}
  /* a concept's places: the lead in the eyebrow's voice, the places beside it as quiet links */
  /* a formula's composition: one chip per element, on the element's own colour, which is a convention and not a signal the app adds */
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0 0}
  .chip{display:inline-flex;align-items:baseline;gap:2px;font:inherit;font-size:0.78rem;font-weight:600;padding:2px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--el) 55%,transparent);background:color-mix(in srgb,var(--el) 18%,transparent);color:var(--ink);cursor:pointer}
  .chip:hover{background:color-mix(in srgb,var(--el) 32%,transparent)}
  .chip:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .chip .n{font-size:0.68rem;font-weight:500;color:var(--muted)}
  .hover-card[data-kind="formula"] .body{font-variant-numeric:tabular-nums;color:var(--muted)}
  .refs{margin:8px 0 0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:baseline}
  .refs dt{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);font-weight:600;white-space:nowrap}
  .refs dd{margin:0;display:flex;flex-wrap:wrap;gap:3px 6px}
  .ref{font:inherit;font-size:0.78rem;padding:0;border:0;background:none;color:var(--ink);cursor:pointer;text-align:left;text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px}
  .ref:hover,.ref:focus-visible{text-decoration-color:var(--accent);color:var(--accent)}
  .ref:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .ref.more{color:var(--muted);text-decoration:none;font-style:italic}
  .refs .sep{color:var(--muted);font-size:0.78rem}
  .ref :global(.katex){font-size:1em}
  .hover-card[data-kind="concept"]{max-width:min(400px,calc(100vw - 16px))}
  .plot{display:block;width:260px;max-width:100%;height:auto;margin:4px 0 2px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);overflow:hidden}
  .plot .axis{stroke:var(--muted);stroke-width:1}
  .plot .curve{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
  .plot .mark{fill:currentColor;stroke:currentColor;stroke-width:1.5}
  .plot .mark.open{fill:var(--bg)}
  .swatch{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:0.72rem;color:var(--muted)}
  .swatch .box{width:10px;height:10px;border-radius:2px;flex:none}
  .actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--rule)}
  .actions button{font:inherit;font-size:0.76rem;font-weight:600;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--accent);cursor:pointer}
  .actions button:hover{background:var(--soft)}
  .actions button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

  /* The underline affordance: symbols (on the outer type wrapper, so a subscript
     is included), glossary terms, the concepts the prose names, example references. It is the reader's to
     keep or to do without — "Underline what can be looked up" in the settings
     writes the class the rules hang from — and either way the card still opens. */
  :global(html:not(.no-underlines) .katex-html .enclosing[class*="kv-"]:has([data-sym])), :global(html:not(.no-underlines) .term[data-term]), :global(html:not(.no-underlines) article span[data-concept]:not(.book-word)), :global(html:not(.no-underlines) .formula[data-formula]), :global(html:not(.no-underlines) a.xref){text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px;text-decoration-thickness:1px}
  :global(html:not(.no-underlines) .katex-html .enclosing[class*="kv-"]:hover:has([data-sym])), :global(html:not(.no-underlines) .term[data-term]:hover), :global(html:not(.no-underlines) article span[data-concept]:not(.book-word):hover), :global(html:not(.no-underlines) .formula[data-formula]:hover), :global(html:not(.no-underlines) a.xref:hover){text-decoration-color:var(--accent)}
  /* A function token wraps its math, which a text decoration does not reach into, so it is underlined by a border. */
  :global(html:not(.no-underlines) article [data-fn]){border-bottom:1px dotted var(--muted)}
  :global(html:not(.no-underlines) article [data-fn]:hover){border-bottom-color:var(--accent)}
  :global(html:not(.no-underlines) article [data-fn] .katex-html .enclosing[class*="kv-"]){text-decoration:none}
  :global([data-fn]){cursor:pointer}
  :global([data-fn]:focus-visible){outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
  /* A thing of the book an answer or a note names by a link: underlined in the link colour, since nothing around it says it is one. */
  :global(html:not(.no-underlines) .book-word){text-decoration:underline dotted;text-decoration-color:var(--accent);text-underline-offset:3px;text-decoration-thickness:1px}
  :global(.book-word .katex-html .enclosing[class*="kv-"]){text-decoration:none}
  :global(.book-word){cursor:pointer;border-radius:2px}
  :global(.book-word:hover){background:color-mix(in srgb,var(--accent) 10%,transparent)}
  :global(.book-word:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
  :global(.sim .katex-html .enclosing[class*="kv-"]){text-decoration:none}   /* a sim's readouts and control labels stay clean; the card still opens */
  /* The card is where a symbol is explained, not another place to look it up. */
  :global(.hover-card .katex-html .enclosing[class*="kv-"]), :global(.hover-card .term[data-term]), :global(.hover-card [data-concept]), :global(.hover-card .formula[data-formula]), :global(.hover-card a.xref){text-decoration:none}
  :global(.term[data-term]), :global(.formula[data-formula]), :global([data-sym]), :global([data-concept]), :global(a.xref), :global(a.figref), :global(html.cards-click .katex-display){cursor:pointer}
  :global(.hover-card .term[data-term]), :global(.hover-card .formula[data-formula]), :global(.hover-card [data-sym]){cursor:auto}
  :global(.formula[data-formula]:focus-visible){outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
  :global(a.xref){color:inherit}
  :global(a.xref:hover){color:var(--accent)}
  :global(.term[data-term]:focus-visible), :global([data-sym]:focus-visible), :global(article span[data-concept]:focus-visible){outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
  :global([data-sym]){outline-offset:2px}
</style>
