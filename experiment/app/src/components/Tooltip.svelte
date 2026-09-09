<script lang="ts">
  /* One tooltip for the whole shell. The browser's own tooltip waits about a
     second and cannot be styled, so the shell takes the title off whatever the
     pointer is over — keeping the words in `data-tip`, which is where this
     reads them from ever after — and draws its own a quarter of a second later,
     under the element where there is room and over it where there is not. An
     element with no title of its own is named by its aria-label, so a button
     labelled for a screen reader is labelled for everyone. Nothing in a
     document or in the note editor is touched: their titles are the author's. */
  import { onMount } from 'svelte';

  const DELAY = 250;                  /* how long the pointer rests before the tooltip shows */
  const GAP = 6;                      /* between the element and the tooltip */
  const EDGE = 8;                     /* the nearest the tooltip comes to the edge of the window */
  type Tip = { readonly text: string; readonly x: number; readonly y: number; readonly above: boolean };
  let tip = $state<Tip | null>(null);
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
  /* What the pointer is on: the nearest named thing of the shell, and nothing inside
     a document, a figure or the note editor, whose titles belong to what is written there. */
  const namedAt = (target: EventTarget | null): HTMLElement | null => {
    const el = target instanceof Element ? target.closest<HTMLElement>('[title], [data-tip], [aria-label]') : null;
    return el && !el.closest('.cm-content, article, .fig-root, .hover-card') ? el : null;
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
    const above = r.bottom + GAP + 34 > window.innerHeight;
    turn++;
    tip = { text, x: Math.min(Math.max(r.left + r.width / 2, EDGE + 70), window.innerWidth - EDGE - 70), y: above ? r.top - GAP : r.bottom + GAP, above };
  };
  const enter = (e: Event): void => {
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
  <div class="tip" class:above={tip.above} style="left:{tip.x}px;top:{tip.y}px" role="tooltip">{tip.text}</div>
{/if}

<style>
  .tip{position:fixed;z-index:120;transform:translateX(-50%);max-width:260px;padding:3px 7px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:0.75rem;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgb(0 0 0 / 0.14);pointer-events:none}
  .tip.above{transform:translate(-50%,-100%)}
</style>
