<script lang="ts">
  /* One tooltip for the whole shell. The browser's own tooltip waits about a
     second and cannot be styled, so the shell takes the title off whatever the
     pointer is over — keeping the words in `data-tip`, which is where this
     reads them from ever after — and draws its own a quarter of a second later,
     below and to the right of the pointer, so that it never lies across the
     element's neighbours; it turns to the left or upward only where the window
     ends. A tooltip raised by keyboard focus, with no pointer to follow, sits
     under the element's left edge. An
     element with no title of its own is named by its aria-label, so a button
     labelled for a screen reader is labelled for everyone. Nothing in a
     document or in the note editor is touched: their titles are the author's. */
  import { onMount } from 'svelte';

  const DELAY = 250;                  /* how long the pointer rests before the tooltip shows */
  const GAP = 12;                     /* between the pointer (or the element) and the tooltip */
  const EDGE = 8;                     /* the nearest the tooltip comes to the edge of the window */
  const WIDE = 260;                   /* the most a tooltip is allowed to be wide */
  const TALL = 24;                    /* about a line of tooltip */
  type Tip = { readonly text: string; readonly x: number; readonly y: number; readonly left: boolean; readonly above: boolean };
  let tip = $state<Tip | null>(null);
  let pointer: { x: number; y: number } | null = null;   /* where the pointer last was, if it raised the tooltip */
  let timer: ReturnType<typeof setTimeout> | null = null;
  let held: HTMLElement | null = null;
  /* Counts what the tooltip has been told to do, so that a putting-away which
     has been waiting cannot undo a tooltip raised after it. */
  let turn = 0;

  /* The words an element is named by, moved out of the way of the browser's own tooltip. */
  const wordsOf = (el: HTMLElement): string | null => {
    const title = el.getAttribute('title');
    if (title !== null) { if (title.trim()) el.dataset.tip = title.trim(); el.removeAttribute('title'); }
    return el.dataset.tip ?? el.getAttribute('aria-label') ?? null;
  };
  /* What the pointer is on: the nearest named thing inside the shell, but never
     the shell itself. Its aria-label names the application for assistive
     technology; it is not a fallback tooltip for every otherwise unnamed spot.
     Nothing inside a document, a figure or the note editor is touched, since
     those titles belong to what is written there. */
  const namedAt = (target: EventTarget | null): HTMLElement | null => {
    const el = target instanceof Element ? target.closest<HTMLElement>('[title], [data-tip], [aria-label]') : null;
    return el && !el.classList.contains('shell') && !el.closest('.cm-content, article, .fig-root, .hover-card') ? el : null;
  };
  /* Some of what puts a tooltip away happens while the shell is taking a piece
     of the page apart — the focusout of a name box that has just closed reaches
     this listener in the middle of Svelte's own work, and state may not be
     written there. So the tooltip goes as soon as that work is done, which is
     within the same frame and before anything is drawn. */
  const put = (): void => { const t = ++turn; queueMicrotask(() => { if (turn === t) tip = null; }); };
  const hide = (): void => { if (timer) clearTimeout(timer); timer = null; held = null; put(); };
  const show = (el: HTMLElement): void => {
    const text = wordsOf(el); if (!text || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const at = pointer ?? { x: r.left, y: r.bottom - GAP };
    const left = at.x + GAP + WIDE > window.innerWidth - EDGE;
    const above = at.y + GAP + TALL > window.innerHeight - EDGE;
    turn++;
    tip = { text, x: left ? at.x - GAP : at.x + GAP, y: above ? at.y - GAP : at.y + GAP, left, above };
  };
  const enter = (e: Event): void => {
    pointer = e instanceof MouseEvent ? { x: e.clientX, y: e.clientY } : null;
    const el = namedAt(e.target); if (!el || el === held) return;
    hide(); held = el; wordsOf(el);            /* the title goes at once, so the browser never draws its own */
    timer = setTimeout(() => { if (held === el) show(el); }, DELAY);
  };
  const leave = (e: Event): void => { if (held && !held.contains((e as MouseEvent).relatedTarget as Node | null)) hide(); };

  onMount(() => {
    const opts = { capture: true } as const;
    document.addEventListener('mouseover', enter, opts); document.addEventListener('focusin', enter, opts);
    document.addEventListener('mouseout', leave, opts); document.addEventListener('focusout', hide, opts);
    document.addEventListener('keydown', hide, opts); document.addEventListener('pointerdown', hide, opts);
    window.addEventListener('scroll', hide, true); window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('mouseover', enter, opts); document.removeEventListener('focusin', enter, opts);
      document.removeEventListener('mouseout', leave, opts); document.removeEventListener('focusout', hide, opts);
      document.removeEventListener('keydown', hide, opts); document.removeEventListener('pointerdown', hide, opts);
      window.removeEventListener('scroll', hide, true); window.removeEventListener('blur', hide);
    };
  });
</script>

{#if tip}
  <div class="tip" class:left={tip.left} class:above={tip.above} style="left:{tip.x}px;top:{tip.y}px" role="tooltip">{tip.text}</div>
{/if}

<style>
  .tip{position:fixed;z-index:120;max-width:260px;padding:3px 7px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:0.75rem;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgb(0 0 0 / 0.14);pointer-events:none}
  .tip.left{transform:translateX(-100%)}
  .tip.above{transform:translateY(-100%)}
  .tip.left.above{transform:translate(-100%,-100%)}
</style>
