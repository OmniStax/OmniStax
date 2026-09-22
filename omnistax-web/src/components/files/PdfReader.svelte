<script lang="ts">
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

  const NEAR = '200% 0px';

  type Sheet = { readonly n: number; readonly w: number; readonly h: number };

  let doc: PdfDoc | null = null;
  let sheets = $state.raw<readonly Sheet[]>([]);
  let failed = $state('');
  let scroller = $state<HTMLElement | null>(null);
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
    void openPdf(bytes.slice(0)).then(async (d) => {
      if (!live) { await d.destroy().catch(() => {}); return; }
      doc = d;
      files.setPages(fileId, d.numPages);
      const first = await d.getPage(1);
      const v = first.getViewport({ scale: 1 });
      sheets = Array.from({ length: d.numPages }, (_, i) => ({ n: i + 1, w: v.width, h: v.height }));
      await tick();
      fit();
      land();
    }).catch((e: unknown) => { if (live) failed = e instanceof Error ? e.message : 'This PDF could not be opened.'; });
    return () => { live = false; void doc?.destroy().catch(() => {}); doc = null; };
  });

  const GUTTER = 0;
  const fit = (): void => {
    const box = scroller?.clientWidth ?? 0;
    const w = sheets[0]?.w ?? 0;
    if (box > 0 && w > 0) scale = Math.max(0.2, (box - GUTTER) / w);
  };
  const zoom = (by: number): void => { chosen = true; scale = Math.min(6, Math.max(0.2, scale * by)); };
  const refit = (): void => { chosen = false; fit(); };
  $effect(() => {
    const el = scroller; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (!el.clientWidth) return;
      if (!chosen) fit();
      if (!restored && sheets.length) void tick().then(land);
    });
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
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.floor(viewport.width * dpr); canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      slot.task = page.render({ canvasContext: ctx, viewport });
      await slot.task.promise;
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

  let watcher: IntersectionObserver | null = null;
  $effect(() => {
    const root = scroller; if (!root) return;
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

  const placeBox = (e: MouseEvent, n: number): void => {
    if (!placing) return;
    const host = e.currentTarget as HTMLElement;
    const box = host.getBoundingClientRect();
    const mark = fileMarks.addBox(fileId, n, (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
    placing = false;
    selected = mark.id;
  };

  /* ── where the reader is, and where a link asked them to be ────────────── */

  const placeKey = `omnistax:pdf-page:${fileId}`;
  type Place = { page: number; frac: number };
  const readPlace = (): Place | null => {
    try {
      const v = JSON.parse(localStorage.getItem(placeKey) ?? 'null') as Place | null;
      return v && Number.isFinite(v.page) && Number.isFinite(v.frac) ? v : null;
    } catch { return null; }
  };
  let saveTimer = 0;
  const savePlace = (p: Place): void => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { try { localStorage.setItem(placeKey, JSON.stringify(p)); } catch { /* storage off */ } }, 300);
  };

  const onscroll = (): void => {
    const root = scroller; if (!root) return;
    const mid = root.scrollTop + root.clientHeight / 3;
    let seen = 1;
    root.querySelectorAll<HTMLElement>('.pdf-page').forEach((h) => { if (h.offsetTop <= mid) seen = Number(h.dataset.page); });
    at = seen;
    const host = hostOf(seen);
    if (host && restored) savePlace({ page: seen, frac: Math.min(1, Math.max(0, (root.scrollTop - host.offsetTop) / host.offsetHeight)) });
  };

  export const goPage = (n: number, frac = 0): void => {
    const host = hostOf(Math.min(Math.max(1, n), sheets.length || 1));
    if (host && scroller) scroller.scrollTo({ top: host.offsetTop + (frac ? frac * host.offsetHeight : -4), behavior: 'auto' });
  };
  let restored = false;
  const land = (): void => {
    /* A tab restored in the background has no size yet; the resize observer lands it when shown. */
    if (!scroller?.clientWidth) return;
    const page = fileOpens.takePage(fileId) ?? (restored ? null : startPage ?? null);
    if (page !== null) goPage(page);
    else if (!restored) { const p = readPlace(); if (p) goPage(p.page, p.frac); }
    restored = true;
    const mark = fileOpens.takeMark(fileId);
    if (mark === null) return;
    const m = fileMarks.get(mark);
    if (!m) return;
    goPage(m.page);
    if (m.kind === 'box') { selected = m.id; return; }
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
  .pdf{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
  .bar{position:absolute;top:6px;right:14px;z-index:3;display:flex;align-items:center;gap:4px;padding:3px 4px 3px 8px;border:1px solid var(--rule);border-radius:7px;background:color-mix(in srgb, var(--bg), transparent 10%);box-shadow:0 1px 4px rgb(0 0 0 / 0.15);font-size:0.74rem;color:var(--muted)}
  .gap{width:4px}
  .bar button{font:inherit;font-size:0.76rem;color:var(--muted);background:var(--soft);border:1px solid var(--rule);border-radius:5px;padding:1px 6px;cursor:pointer}
  .bar button:hover{color:var(--ink);border-color:var(--accent)}
  .bar button.on{color:var(--ink);border-color:var(--accent);background:var(--soft2)}
  .scroll{flex:1;min-height:0;overflow:auto;padding:0 0 40vh;display:flex;flex-direction:column;align-items:safe center;gap:4px;background:var(--soft)}
  .scroll.placing{cursor:crosshair}
  .gone{padding:24px;color:var(--muted);font-size:0.85rem}
  .pdf-page{position:relative;flex:none;background:#fff;}
  .pdf-page canvas{display:block;width:100%;height:100%}
  .boxed{position:absolute;z-index:2}

  .textLayer{position:absolute;text-align:initial;inset:0;overflow:clip;line-height:1;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;caret-color:CanvasText;z-index:1}
  .textLayer :global(span),.textLayer :global(br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
  .textLayer :global(span.markedContent){top:0;height:0}
  .textLayer :global(span[role="img"]){user-select:none;cursor:default}
  .textLayer :global(.endOfContent){display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;user-select:none}
  .textLayer :global(::selection){background:color-mix(in srgb, var(--accent), transparent 70%)}
  .textLayer :global(mark.hl){color:transparent;mix-blend-mode:multiply}
</style>
