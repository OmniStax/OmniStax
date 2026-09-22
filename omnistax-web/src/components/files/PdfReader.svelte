<script lang="ts">
  /* A PDF read in a tab. The pages stand in one scroller, each at the size the
     document says it is, and a page is drawn only as it nears the viewport and
     let go again when it is far: a two-hundred-page book costs one canvas or
     two, not two hundred.

     Every page carries a text layer over its canvas — pdf.js's own, so the
     glyphs land where the glyphs are — and that layer is what everything else
     works on. Selecting in it opens the shell's highlight bar, the same bar the
     book's text uses; a highlight is painted into it with the same painter, so
     a mark survives the page being drawn again at another zoom. A text box is
     placed on the page itself, in fractions of its width and height, so it
     stays where the reader put it however large the page is drawn.

     Zoom is the app's, not the browser's: Ctrl+wheel is left alone. The page
     starts at the width of the pane and the two buttons step from there. */
  import { onMount, tick } from 'svelte';
  import TextBox from '../ui/TextBox.svelte';
  import { openPdf, type PdfDoc, type PdfPage, type RenderTask } from '../../lib/files/pdfjs';
  import { loadPdfjs } from '../../lib/files/pdfjs';
  import { files } from '../../lib/files/store.svelte';
  import { fileMarks } from '../../lib/files/marks.svelte';
  import { fileOpens } from '../../lib/files/open.svelte';
  import { clampFraction, type FileMark } from '../../lib/files/marks';
  import { fileResolver, followLink } from '../../lib/files/resolver';
  import { paint } from '../../lib/notes/paint';
  import type { FileId } from '../../lib/types/ids';

  let { fileId, bytes, startPage }: { fileId: FileId; bytes: ArrayBuffer; startPage?: number } = $props();

  /* How far outside the viewport a page is drawn, and how far out it is let
     go: two screens either way, so a steady scroll never waits on a render and
     a jump of one page never throws the page beside it away. */
  const NEAR = '200% 0px';

  type Sheet = { readonly n: number; readonly w: number; readonly h: number };

  let doc: PdfDoc | null = null;
  let sheets = $state.raw<readonly Sheet[]>([]);
  let failed = $state('');
  let scroller = $state<HTMLElement | null>(null);
  /* How many CSS pixels one PDF unit is drawn at: fit-width until the reader
     says otherwise, and then whatever they said. */
  let scale = $state(1);
  let chosen = $state(false);
  let at = $state(1);            /* the page the reader is looking at */
  let placing = $state(false);   /* the text box tool is armed */
  let selected = $state<string | null>(null);

  const doc0 = $derived(files.get(fileId));
  const resolver = () => fileResolver();

  /* ── the document ──────────────────────────────────────────────────────── */

  onMount(() => {
    let live = true;
    /* pdf.js takes the buffer over, so it is copied: the tab keeps its own to
       reopen from if the reader closes and opens the file again. */
    void openPdf(bytes.slice(0)).then(async (d) => {
      if (!live) { await d.destroy().catch(() => {}); return; }
      doc = d;
      files.setPages(fileId, d.numPages);
      const first = await d.getPage(1);
      const v = first.getViewport({ scale: 1 });
      /* Every page is assumed the size of the first until it is drawn, which
         is true of nearly every document and is only ever a scrollbar's worth
         of error where it is not. */
      sheets = Array.from({ length: d.numPages }, (_, i) => ({ n: i + 1, w: v.width, h: v.height }));
      await tick();
      fit();
      land();
    }).catch((e: unknown) => { if (live) failed = e instanceof Error ? e.message : 'This PDF could not be opened.'; });
    return () => { live = false; void doc?.destroy().catch(() => {}); doc = null; };
  });

  /* The width of the pane, less the room the page is given around it. */
  const GUTTER = 48;
  const fit = (): void => {
    const box = scroller?.clientWidth ?? 0;
    const w = sheets[0]?.w ?? 0;
    if (box > 0 && w > 0) scale = Math.max(0.2, (box - GUTTER) / w);
  };
  const zoom = (by: number): void => { chosen = true; scale = Math.min(6, Math.max(0.2, scale * by)); };
  const refit = (): void => { chosen = false; fit(); };
  /* The pane may be resized, split or made narrow; while the reader has not
     chosen a zoom of their own, the page follows the width they have. */
  $effect(() => {
    const el = scroller; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (!chosen) fit(); });
    ro.observe(el);
    return () => ro.disconnect();
  });

  /* ── one page, drawn as it comes near ──────────────────────────────────── */

  /* What a page is holding while it is drawn, so that it can be let go. */
  type Live = { task: RenderTask | null; page: PdfPage | null };
  const live = new Map<number, Live>();

  const drawPage = async (host: HTMLElement, n: number): Promise<void> => {
    const d = doc; if (!d || live.has(n)) return;
    const slot: Live = { task: null, page: null };
    live.set(n, slot);
    try {
      const page = await d.getPage(n);
      slot.page = page;
      if (!live.has(n)) return;
      const viewport = page.getViewport({ scale });
      const canvas = host.querySelector<HTMLCanvasElement>('canvas');
      const layer = host.querySelector<HTMLElement>('.textLayer');
      if (!canvas || !layer) return;
      /* A retina screen wants more pixels than CSS ones; the canvas carries
         them and the CSS box stays the size of the page. */
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.floor(viewport.width * dpr); canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      slot.task = page.render({ canvasContext: ctx, viewport });
      await slot.task.promise;
      /* The text layer is pdf.js's own, so a selection lands on the glyphs and
         not near them. It is rebuilt at every scale, and the marks with it. */
      const lib = await loadPdfjs() as unknown as { TextLayer: new (o: { textContentSource: unknown; container: HTMLElement; viewport: unknown }) => { render(): Promise<void> } };
      layer.textContent = '';
      layer.style.setProperty('--scale-factor', String(scale));
      const tl = new lib.TextLayer({ textContentSource: await page.getTextContent(), container: layer, viewport });
      await tl.render();
      host.dataset.drawn = '1';
      repaint(n);
    } catch { /* a page that will not draw stays blank; the rest of the file reads */ }
  };

  const releasePage = (host: HTMLElement, n: number): void => {
    const slot = live.get(n); if (!slot) return;
    live.delete(n);
    try { slot.task?.cancel(); } catch { /* it had already finished */ }
    const canvas = host.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    const layer = host.querySelector<HTMLElement>('.textLayer');
    if (layer) layer.textContent = '';
    delete host.dataset.drawn;
  };

  /* Which pages are near enough to be worth drawing. One observer for the
     whole file: a page coming into range is drawn, one leaving it is let go. */
  let watcher: IntersectionObserver | null = null;
  $effect(() => {
    const root = scroller; if (!root) return;
    /* A change of scale is a new set of renders, so the old ones are dropped
       and every page in view is drawn again at the size it is now. */
    void scale;
    root.querySelectorAll<HTMLElement>('.pdf-page').forEach((host) => releasePage(host, Number(host.dataset.page)));
    watcher?.disconnect();
    watcher = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const host = e.target as HTMLElement;
        const n = Number(host.dataset.page);
        if (e.isIntersecting) void drawPage(host, n); else releasePage(host, n);
      });
    }, { root, rootMargin: NEAR });
    root.querySelectorAll<HTMLElement>('.pdf-page').forEach((host) => watcher?.observe(host));
    return () => { watcher?.disconnect(); watcher = null; };
  });

  /* ── the marks on the pages ────────────────────────────────────────────── */

  const hostOf = (n: number): HTMLElement | null => scroller?.querySelector<HTMLElement>(`.pdf-page[data-page="${n}"]`) ?? null;

  /* The highlights of one page, laid into its text layer. The painter is the
     book's own: the same anchors, the same marks, so a highlight is found
     again however pdf.js cut the page into spans this time. */
  const repaint = (n: number): void => {
    const layer = hostOf(n)?.querySelector<HTMLElement>('.textLayer');
    if (!layer) return;
    const hls = fileMarks.forPage(fileId, n).filter((m): m is Extract<FileMark, { kind: 'highlight' }> => m.kind === 'highlight');
    paint(layer, hls.map((m) => ({ id: m.id, anchor: m.anchor, color: m.color, noted: !!m.text })));
  };
  /* A mark added, removed or recoloured repaints every page that is drawn. */
  $effect(() => {
    void fileMarks.paintVersion;
    scroller?.querySelectorAll<HTMLElement>('.pdf-page[data-drawn]').forEach((h) => repaint(Number(h.dataset.page)));
  });

  const boxesOf = (n: number): readonly Extract<FileMark, { kind: 'box' }>[] =>
    fileMarks.forPage(fileId, n).filter((m): m is Extract<FileMark, { kind: 'box' }> => m.kind === 'box');

  /* Clicking a page with the tool armed places a box where the pointer is, in
     fractions of the page, and disarms the tool: one click, one box. */
  const placeBox = (e: MouseEvent, n: number): void => {
    if (!placing) return;
    const host = e.currentTarget as HTMLElement;
    const box = host.getBoundingClientRect();
    const mark = fileMarks.addBox(fileId, n, (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
    placing = false;
    selected = mark.id;
  };

  /* ── where the reader is, and where a link asked them to be ────────────── */

  const onscroll = (): void => {
    const root = scroller; if (!root) return;
    const mid = root.scrollTop + root.clientHeight / 3;
    let seen = 1;
    root.querySelectorAll<HTMLElement>('.pdf-page').forEach((h) => { if (h.offsetTop <= mid) seen = Number(h.dataset.page); });
    at = seen;
  };

  export const goPage = (n: number): void => {
    const host = hostOf(Math.min(Math.max(1, n), sheets.length || 1));
    if (host && scroller) scroller.scrollTo({ top: host.offsetTop - 8, behavior: 'auto' });
  };
  /* A `[[file:…:p12]]` link, or a row of the Annotations view: both ask beside
     the tab rather than through its key, and both are answered once. */
  const land = (): void => {
    const page = fileOpens.takePage(fileId) ?? startPage ?? null;
    if (page !== null) goPage(page);
    const mark = fileOpens.takeMark(fileId);
    if (mark === null) return;
    const m = fileMarks.get(mark);
    if (!m) return;
    goPage(m.page);
    if (m.kind === 'box') { selected = m.id; return; }
    /* The page has to be drawn before the mark is in it, so the flash waits a
       moment for the render the scroll has just asked for. */
    window.setTimeout(() => {
      const el = hostOf(m.page)?.querySelector<HTMLElement>(`mark.hl[data-note="${m.id}"]`);
      if (!el) return;
      el.classList.add('flash'); window.setTimeout(() => el.classList.remove('flash'), 1600);
    }, 400);
  };
  /* The tab is already open and the reader follows another link into it. */
  $effect(() => { void fileOpens.pages[fileId]; void fileOpens.marks[fileId]; if (sheets.length) land(); });
</script>

<div class="pdf">
  <div class="bar" role="toolbar" aria-label="Reading this PDF">
    <span class="where">{sheets.length ? `Page ${at} of ${sheets.length}` : 'Opening…'}</span>
    <span class="gap"></span>
    <button type="button" class:on={placing} title="Place a text box on the page" onclick={() => (placing = !placing)}>Text box</button>
    <button type="button" title="Smaller" aria-label="Smaller" onclick={() => zoom(1 / 1.2)}>−</button>
    <button type="button" title="Fit the width of the pane" onclick={refit}>{Math.round(scale * 100)}%</button>
    <button type="button" title="Larger" aria-label="Larger" onclick={() => zoom(1.2)}>+</button>
  </div>
  {#if failed}
    <div class="gone">{failed}</div>
  {/if}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="scroll" bind:this={scroller} {onscroll} class:placing onclick={() => (selected = null)}>
    {#each sheets as s (s.n)}
      <div class="pdf-page" data-file={fileId} data-page={s.n}
        style:width="{s.w * scale}px" style:height="{s.h * scale}px"
        onclick={(e) => placeBox(e, s.n)}>
        <canvas></canvas>
        <div class="textLayer"></div>
        {#each boxesOf(s.n) as b (b.id)}
          <!-- The page places the box and TextBox fills it: the rectangle is
               fractions of the page, so it holds at any zoom. -->
          <div class="boxed" style:left="{b.x * 100}%" style:top="{b.y * 100}%" style:width="{b.w * 100}%" style:height="{b.h * 100}%">
            <TextBox x={b.x} y={b.y} w={b.w} h={b.h} body={b.body} {resolver}
              selected={selected === b.id}
              onchange={(body) => fileMarks.setBody(b.id, body)}
              onmove={(r) => fileMarks.place(b.id, { x: clampFraction(r.x), y: clampFraction(r.y), w: b.w, h: b.h })}
              onresize={(r) => fileMarks.place(b.id, { x: b.x, y: b.y, w: clampFraction(r.w), h: clampFraction(r.h) })}
              onselect={() => (selected = b.id)}
              onremove={() => fileMarks.remove(b.id)}
              onlink={(link) => followLink(link)} />
          </div>
        {/each}
      </div>
    {/each}
    {#if doc0 && !sheets.length && !failed}<div class="gone">Reading {doc0.name}…</div>{/if}
  </div>
</div>

<style>
  .pdf{flex:1;min-height:0;display:flex;flex-direction:column}
  .bar{flex:none;display:flex;align-items:center;gap:6px;padding:5px 12px;border-bottom:1px solid var(--rule);background:var(--bg);font-size:0.78rem;color:var(--muted)}
  .gap{flex:1}
  .bar button{font:inherit;font-size:0.76rem;color:var(--muted);background:var(--soft);border:1px solid var(--rule);border-radius:5px;padding:2px 8px;cursor:pointer}
  .bar button:hover{color:var(--ink);border-color:var(--accent)}
  .bar button.on{color:var(--ink);border-color:var(--accent);background:var(--soft2)}
  .scroll{flex:1;min-height:0;overflow:auto;padding:16px 0 40vh;display:flex;flex-direction:column;align-items:center;gap:14px;background:var(--soft)}
  .scroll.placing{cursor:crosshair}
  .gone{padding:24px;color:var(--muted);font-size:0.85rem}
  .pdf-page{position:relative;flex:none;background:#fff;box-shadow:0 1px 6px rgb(0 0 0 / 0.2)}
  .pdf-page canvas{display:block;width:100%;height:100%}
  .boxed{position:absolute;z-index:2}

  /* pdf.js's text layer, dressed here rather than by its own stylesheet: the
     vendored build carries the script alone, and these are the rules the layer
     needs to sit over the glyphs it names. */
  .textLayer{position:absolute;text-align:initial;inset:0;overflow:clip;line-height:1;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;caret-color:CanvasText;z-index:1}
  .textLayer :global(span),.textLayer :global(br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
  .textLayer :global(span.markedContent){top:0;height:0}
  .textLayer :global(span[role="img"]){user-select:none;cursor:default}
  .textLayer :global(.endOfContent){display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;user-select:none}
  .textLayer :global(::selection){background:color-mix(in srgb, var(--accent), transparent 70%)}
  /* A highlight is a background behind glyphs that are themselves invisible,
     so it is the mark and not the text that the reader sees. */
  .textLayer :global(mark.hl){color:transparent;mix-blend-mode:multiply}
</style>
