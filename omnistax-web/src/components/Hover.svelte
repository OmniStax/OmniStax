<script lang="ts">
  /* The goto card: one popover for every underlinable thing in a document.
     Mounted once. Listens on the document for the pointer or the focus
     reaching a target, opens after a short delay, and stays while the pointer
     crosses into the card. Escape closes; on touch a tap opens and a tap
     elsewhere closes. It also carries the underline rules for its targets and
     the click that follows a figure reference into a section not yet open.
     A concept's card carries more than a sentence: under it stand the places
     the text introduces it, uses it and tests it, each one a link to go there. */
  import { onMount, tick } from 'svelte';
  import { targetOf, cardFor, openDelay } from '../lib/hover/cards';
  import type { Card } from '../lib/hover/resolve';
  import { glyphOf } from '../lib/hover/data';
  import { findEl, goSpan } from '../lib/sections/nav.svelte';
  import { spanId } from '../lib/types/ids';
  import { FIG } from '../lib/fig/figlib';
  import { math } from './actions/math';

  const CLOSE_GRACE = 200;
  type Placed = { readonly top: number; readonly left: number; readonly ready: boolean };
  let card = $state<Card | null>(null);
  let anchor = $state<HTMLElement | null>(null);
  let box = $state<HTMLElement | null>(null);
  let pos = $state<Placed>({ top: 0, left: 0, ready: false });
  const chapter = $derived(anchor?.closest<HTMLElement>('[data-chapter]')?.dataset.chapter ?? '');
  const symColor = $derived.by(() => { const g = anchor ? glyphOf(anchor) : null; return g ? getComputedStyle(g).color : ''; });   /* the glyph's own hue: chapter, binds and colour coding all applied */

  let openT = 0, closeT = 0, pending: HTMLElement | null = null;
  let mouseDown = false, touch = false;
  const clearTimers = () => { clearTimeout(openT); clearTimeout(closeT); pending = null; };
  const close = () => { clearTimers(); card = null; anchor = null; };
  const show = (t: HTMLElement) => { clearTimers(); const c = cardFor(t); if (!c) { if (anchor) close(); return; } card = c; anchor = t; pos = { ...pos, ready: false }; };
  const scheduleOpen = (t: HTMLElement) => { if (t === anchor || t === pending) { clearTimeout(closeT); return; } clearTimers(); pending = t; openT = window.setTimeout(() => show(t), openDelay(t)); };
  const scheduleClose = () => { clearTimers(); if (card) closeT = window.setTimeout(close, CLOSE_GRACE); };
  const inCard = (n: EventTarget | null): boolean => n instanceof Node && !!box && box.contains(n);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const place = () => {
    if (!anchor || !box) return;
    const r = anchor.getBoundingClientRect(), b = box.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) { close(); return; }
    const below = r.bottom + 6; const above = r.top - b.height - 6;
    const top = below + b.height <= vh - 8 || above < 8 ? below : above;
    pos = { top: clamp(top, 8, Math.max(8, vh - b.height - 8)), left: clamp(r.left, 8, Math.max(8, vw - b.width - 8)), ready: true };
  };
  $effect(() => { if (!card || !anchor) return; tick().then(place); });

  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
  const run = (a: { run: () => void }) => { a.run(); close(); };

  onMount(() => {
    const onOver = (e: MouseEvent) => {
      if (mouseDown || touch) return;
      const t = targetOf(e.target);
      if (t) { scheduleOpen(t); return; }
      if (inCard(e.target)) { clearTimeout(closeT); return; }
      if (card || pending) scheduleClose();
    };
    const onOut = (e: MouseEvent) => { if (e.relatedTarget === null && (card || pending)) scheduleClose(); };
    const onFocusIn = (e: FocusEvent) => { const t = targetOf(e.target); if (t) show(t); else if (inCard(e.target)) clearTimeout(closeT); };
    const onFocusOut = (e: FocusEvent) => { if (!card) return; const to = e.relatedTarget; if (inCard(to) || (to instanceof Element && targetOf(to) === anchor)) return; scheduleClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && card) close(); };
    const onPointerDown = (e: PointerEvent) => {
      touch = e.pointerType === 'touch'; mouseDown = !touch && e.button === 0;
      if (inCard(e.target)) return;
      if (touch && targetOf(e.target) === anchor) return;   /* a second tap on the same target follows it */
      close();
    };
    const onPointerUp = () => { mouseDown = false; };
    const onPointerMove = (e: PointerEvent) => { if (e.pointerType === 'mouse') touch = false; };   /* a mouse after a touch hovers again */
    /* Capture phase, so it runs before the shell's own link handler. */
    const onClick = (e: MouseEvent) => {
      const t = targetOf(e.target); if (!t) return;
      if (touch && t !== anchor) { e.preventDefault(); e.stopPropagation(); show(t); return; }
      const a = t.closest<HTMLAnchorElement>('a.figref, a.xref'); if (!a) return;
      const id = a.getAttribute('href')?.slice(1); if (!id || findEl(id)) return;
      e.preventDefault(); goSpan(spanId(id)); close();
    };
    const onScroll = () => { if (card) place(); };
    document.addEventListener('mouseover', onOver); document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onFocusIn); document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onPointerDown, true); document.addEventListener('pointerup', onPointerUp, true); document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('click', onClick, true); document.addEventListener('scroll', onScroll, true); window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mouseover', onOver); document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onFocusIn); document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointerDown, true); document.removeEventListener('pointerup', onPointerUp, true); document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('click', onClick, true); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
    };
  });
</script>

{#if card}{#key card}
  <div class="hover-card" class:ready={pos.ready} style:top="{pos.top}px" style:left="{pos.left}px" data-chapter={chapter} data-kind={card.kind} bind:this={box} role="dialog" aria-label={card.title}>
    <div class="eyebrow">{card.eyebrow}</div>
    {#if card.tex}<div class="sym" style:color={symColor || null} use:tex={card.tex}></div>{:else}<div class="title" use:math={card.title}>{@html card.title}</div>{/if}
    {#if card.body}<p class="body" use:math={card.body}>{card.body}</p>{/if}
    {#if card.refs?.length}<dl class="refs">{#each card.refs as g (g.label)}<dt>{g.label}</dt><dd>{#each g.links as l, i}{#if i}<span class="sep">·</span>{/if}<button type="button" class="ref" onclick={() => run(l)} use:math={l.label}>{@html l.label}</button>{/each}{#if g.more}{@const m = g.more}<span class="sep">·</span><button type="button" class="ref more" onclick={() => run(m)}>{m.label}</button>{/if}</dd>{/each}</dl>{/if}
    {#if card.actions.length}<div class="actions">{#each card.actions as a (a.label)}<button type="button" onclick={() => run(a)}>{a.label}</button>{/each}</div>{/if}
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
  /* a concept's places: the lead in the eyebrow's voice, the places beside it as quiet links */
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
  .actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--rule)}
  .actions button{font:inherit;font-size:0.76rem;font-weight:600;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--accent);cursor:pointer}
  .actions button:hover{background:var(--soft)}
  .actions button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

  /* The underline affordance: symbols (on the outer type wrapper, so a subscript
     is included), glossary terms, example references. It is the reader's to
     keep or to do without — "Underline what can be looked up" in the settings
     writes the class the rules hang from — and either way the card still opens. */
  :global(html:not(.no-underlines) .katex-html .enclosing[class*="kv-"]:has([data-sym])), :global(html:not(.no-underlines) .term[data-term]), :global(html:not(.no-underlines) a.xref){text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px;text-decoration-thickness:1px}
  :global(html:not(.no-underlines) .katex-html .enclosing[class*="kv-"]:has([data-sym]:hover)), :global(html:not(.no-underlines) .term[data-term]:hover), :global(html:not(.no-underlines) a.xref:hover){text-decoration-color:var(--accent)}
  :global(.sim .katex-html .enclosing[class*="kv-"]){text-decoration:none}   /* a sim's readouts and control labels stay clean; the card still opens */
  /* The card is where a symbol is explained, not another place to look it up. */
  :global(.hover-card .katex-html .enclosing[class*="kv-"]), :global(.hover-card .term[data-term]), :global(.hover-card a.xref){text-decoration:none}
  :global(.term[data-term]){cursor:default}
  :global(a.xref){color:inherit}
  :global(a.xref:hover){color:var(--accent)}
  :global(.term[data-term]:focus-visible), :global([data-sym]:focus-visible){outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
  :global([data-sym]){outline-offset:2px}
</style>
