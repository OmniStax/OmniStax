<script lang="ts">
  /* The reading side of a note: the markdown as the reader means it to look.
     The rendering itself is pure — render.ts takes the text and a resolver and
     hands back HTML — so all that is left here is what HTML alone cannot do. An
     image the reader pasted carries only its id, and the blob is fetched from
     the asset store and put in place. Every image takes a grip at its right
     edge, and dragging it writes the new width back into the markdown, where it
     stays. A card of the book is set in the book's own maths, and the chapter
     holding it is asked for when the note names a chapter nobody has fetched.
     And the links the note makes are followed: a note opens in a tab of its
     own, a section opens in the book, a highlight jumps to the words it marks,
     and a card of the book goes to where the book says it. The note takes a
     drop as well: a row dragged out of a panel is appended as an embed, so a
     card is gathered by hand and not by typing. */
  import type { Resolver } from '../../lib/notes/md/render';
  import { loadRenderer, loaded, type RenderFn } from '../../lib/notes/md/lazy';
  import { setImageWidth } from '../../lib/notes/md/width';
  import { untrack } from 'svelte';
  import { findLinks, isBook, linkInner, linkKey, parseLink, withEmbedWidth, withFigureParams, withoutFigureParams, type BookKind } from '../../lib/notes/md/links';
  import { addEmbedGrips } from '../../lib/notes/md/grips';
  import { fetchMissing } from '../../lib/notes/md/fetch';
  import '../../lib/notes/md/cards.css';
  import { FigureMounts } from '../../lib/notes/md/figlive';
  import { assetId, getAsset } from '../../lib/notes/assets';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import { notes } from '../../lib/notes/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { anyHighlight, fileStub, goMark } from '../../lib/files/resolver';
  import { registry } from '../../lib/sections/registry.svelte';
  import { BookResolver, focusedBook, isSpan } from '../../lib/notes/resolve';
  import { goSpan, openDoc, openFile, openItem } from '../../lib/sections/nav.svelte';
  import { dragging } from '../../lib/layout/drag.svelte';
  import { drawingId as asDrawingId, drawingItem, fileId as asFileId, itemKey, noteId as asNoteId, noteItem, parseSecKey, type NoteId } from '../../lib/types/ids';
  import { chatInfo, drawingInfo, drawingNamed } from '../../lib/drawer/cards';
  import { fillThumbs, thumbnailOf, waitingThumbs } from '../../lib/drawer/thumb';
  import { ChatMounts } from '../../lib/drawer/chatmounts';

  let { noteId, body }: { noteId: NoteId; body: string } = $props();

  /* The book's things are found in the book each link names; a link without
     one is read against the focused book. A note may name a section of a
     chapter nobody has opened, so its tables answer nothing until `decorate`
     has asked for them. */
  const books = new BookResolver();

  /* Everything the renderer cannot know by itself. The asset is the one lookup
     that cannot be answered here and now: IndexedDB takes a turn of the loop,
     so the image renders without a source and is filled in below. */
  const resolver = (): Resolver => ({
    ...books.lookups(),
    note: (name) => noteDocs.byName(name)?.id ?? null,
    /* A drawing is shown small in the note and opens on a click. A name with
       no note behind it may be one, so both lookups are lent here and the
       renderer tries the note first. */
    drawing: (id) => drawingInfo(id),
    drawingByName: (name) => drawingNamed(name),
    /* A highlight may be the book's or one written on a file; the two stores
       keep ids of different shapes, and `anyHighlight` reads which. */
    highlight: (id) => anyHighlight(id),
    asset: () => null,
    file: (id) => fileStub(id),
    chat: (id) => chatInfo(id),
  });

  /* The markdown renderer carries marked and KaTeX with it, which no page needs
     until a note is read, so it is fetched the first time one is. Until it
     lands the note shows nothing rather than its own source: the wait is a tick
     and a half-rendered note would only flicker. Once it is here the rendering
     is ordinary and synchronous, and every later note goes straight through. */
  let render = $state<RenderFn | null>(loaded());
  if (render === null) void loadRenderer().then((f) => { render = f; });

  /* A figure's controls write their values into the body; a body that changed
     only there is not rendered again, so the live figure is never pulled out
     from under the reader's hand. The values reach the cards below instead. */
  const skeleton = $derived(withoutFigureParams(body));
  const shown = $derived.by(() => { void skeleton; return untrack(() => body); });
  const html = $derived(render !== null && shown.trim() ? render(shown, resolver()) : '');

  /* ── what the rendered HTML still needs ────────────────────────────────── */

  /* A note swapped in under this view leaves its asset lookups in flight; only
     the newest pass may write what it finds. */
  let pass = 0;
  /* The figures this note holds live. They are the note's own: a rendering puts
     the same ones back, and they are let go when the note is closed or another
     note takes its place. */
  /* A control moved by hand is written into the figure's link, one undo step per drag. */
  const mounts = new FigureMounts(focusedBook, (fig, n, values, gesture) => {
    const doc = noteDocs.get(noteId);
    if (doc) noteDocs.setBodyRecorded(noteId, withFigureParams(doc.body, fig, n, values), 'set figure', gesture);
  });
  const chatMounts = new ChatMounts();
  $effect(() => { void noteId; return () => { mounts.releaseAll(); chatMounts.releaseAll(); }; });

  const startDrag = (e: PointerEvent, bar: HTMLElement, img: HTMLImageElement): void => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = img.getBoundingClientRect().width;
    let width = Math.round(w0);
    bar.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent): void => { width = Math.max(40, Math.round(w0 + (m.clientX - x0))); img.style.width = `${width}px`; };
    const up = (): void => {
      bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
      /* The width the drag settled on is written into the markdown, and unlike
         typing in the editor — which CodeMirror remembers for itself — this is
         an edit of the shell's own, so Ctrl+Z can put the old width back. */
      const src = img.dataset.src, doc = noteDocs.get(noteId);
      if (src && doc) noteDocs.setBodyRecorded(noteId, setImageWidth(doc.body, src, width), 'resize image');
    };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  };

  /* The grip rides in a wrapper around the image, so that it can sit at the
     edge however wide the image happens to be drawn. */
  const grip = (img: HTMLImageElement): void => {
    const parent = img.parentElement;
    if (!parent || parent.classList.contains('img-wrap')) return;
    const wrap = document.createElement('span');
    wrap.className = 'img-wrap';
    parent.insertBefore(wrap, img); wrap.appendChild(img);
    const bar = document.createElement('span');
    bar.className = 'img-grip'; bar.title = 'Drag to resize';
    wrap.appendChild(bar);
    bar.addEventListener('pointerdown', (e) => startDrag(e, bar, img));
  };

  /* A link that points at nothing says so when the pointer rests on it. A thing
     of the book is a third case: it may be gone from the book, or the chapter
     holding it may still be on its way, and the two read differently. */
  const MISSING: Readonly<Record<BookKind, string>> = {
    equation: 'That equation is not in the book.',
    term: 'That term is not in the book.',
    symbol: 'That symbol is not in the book.',
    concept: 'That concept is not in the book.',
  };
  const deadTitle = (el: HTMLElement): string => {
    const embed = el.dataset.embed;
    const t = embed ? parseLink(embed) : null;
    if (t && isBook(t)) {
      const dir = books.chapterDir(t.section, t.book);
      return dir && registry.chapterStatusOf(books.ref(t.section, t.book).book, dir) === 'loading' ? `Section ${t.section} is loading…` : MISSING[t.kind];
    }
    if (t?.kind === 'figure') return registry.state(books.ref(t.section, t.book)) ? 'That figure is not in the section.' : `Section ${t.section} is loading…`;
    const words = el.textContent ?? '';
    return words.startsWith('hl:') ? 'That highlight is gone.'
      : /^\d+\.\d+/.test(words) ? `Section ${words.split(/\s/)[0]} is not in the book yet.`
        : `No note named “${words}”.`;
  };

  const decorate = (el: HTMLElement): void => {
    const mine = ++pass;
    for (const img of el.querySelectorAll<HTMLImageElement>('img[data-asset]')) {
      const id = img.dataset.asset ?? '';
      void getAsset(assetId(id)).then((url) => { if (mine === pass && url) img.src = url; });
    }
    /* A drawing held in the note is shown as a small picture of its ink. The
       picture is made from the drawing itself, which takes a turn of the loop,
       so the card is rendered waiting and filled here — the same way a pasted
       image is filled once the asset store hands its blob over. */
    for (const id of waitingThumbs(el)) {
      void thumbnailOf(asDrawingId(id)).then((url) => { if (mine === pass && url) void fillThumbs(el, asDrawingId(id), url); });
    }
    for (const img of el.querySelectorAll<HTMLImageElement>('img')) grip(img);
    /* the rendering reads the registry, so it runs again when these land */
    void fetchMissing(el, books);
    books.setMath(el);
    /* Last, so that a figure's own markup is not walked by the passes above:
       the book's script draws it and the book's styles dress it. */
    mounts.fill(el);
    chatMounts.fill(el);
    addEmbedGrips(el, sizeEmbed);
    for (const d of el.querySelectorAll<HTMLElement>('.wiki.dead')) d.title = deadTitle(d);
  };

  let host = $state<HTMLElement | null>(null);
  $effect(() => { const el = host; void html; if (el) decorate(el); });

  /* The values the body holds for each figure, written onto its card, so that
     an undo of a slider sets the live figure back without a rendering. */
  const syncFigures = (el: HTMLElement, text: string): void => {
    const figs = findLinks(text).filter((t) => t.kind === 'figure');
    const seen: Record<string, number> = {};
    for (const card of el.querySelectorAll<HTMLElement>('.fig-embed[data-embed]')) {
      const t = parseLink(card.dataset.embed ?? ''); const key = linkKey(t);
      const n = (seen[key] = (seen[key] ?? -1) + 1);
      const now = figs.filter((f) => linkKey(f) === key)[n];
      if (now) card.dataset.embed = linkInner(now);
    }
    mounts.fill(el);
  };
  $effect(() => { const el = host, text = body; if (el) syncFigures(el, text); });

  /* A card dragged wider or narrower: the width goes into its embed, one step
     of the shell's timeline. */
  const sizeEmbed = (inner: string, n: number, width: number): void => {
    const doc = noteDocs.get(noteId);
    if (doc) noteDocs.setBodyRecorded(noteId, withEmbedWidth(doc.body, inner, n, width), 'resize card');
  };

  /* ── following a link ──────────────────────────────────────────────────── */

  const goBook = (embed: string): void => {
    const to = books.target(embed); if (!to) return;
    if (isSpan(to)) goSpan(to); else void openDoc(to, 'text');
  };

  const onclick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('.hl-embed[data-hl]');
    if (card?.dataset.hl) { const n = notes.get(card.dataset.hl); if (n) goNote(n); return; }
    /* A figure the note holds live is a figure to use, not a link to follow:
       the sliders, the buttons and the orbit are its own. Its eyebrow — the
       line that names it — still goes to where the book prints it, as the whole
       card does while it is only a card. */
    const fig = t.closest<HTMLElement>('.fig-embed[data-embed]');
    if (fig?.dataset.embed) {
      if (fig.classList.contains('live') && !t.closest('.eyebrow')) return;
      goBook(fig.dataset.embed);
      return;
    }
    const book = t.closest<HTMLElement>('.book-embed[data-embed]');
    if (book?.dataset.embed) { goBook(book.dataset.embed); return; }
    const a = t.closest<HTMLAnchorElement>('a.wiki[data-link]');
    const link = a?.dataset.link; if (!link) return;
    e.preventDefault();
    /* A file opens in its tab, at the page the link named. */
    const file = /^file:([^:]+)(?::p(\d+))?$/.exec(link);
    if (file) { void openFile(asFileId(file[1]), file[2] ? Number(file[2]) : undefined); return; }
    const hl = /^hl:(.+)$/.exec(link);
    if (hl) { goMark(hl[1]); return; }
    const note = /^note:(.+)$/.exec(link);
    if (note) { void openItem(itemKey(noteItem(asNoteId(note[1])))); return; }
    const drawing = /^drawing:(.+)$/.exec(link);
    if (drawing) { void openItem(itemKey(drawingItem(asDrawingId(drawing[1])))); return; }
    const sec = /^section:(.+)$/.exec(link);
    if (sec) void openDoc(parseSecKey(sec[1]) ?? books.ref(sec[1]), 'text');
  };

  /* ── a thing dropped into the note ─────────────────────────────────────── */

  /* A row of a panel carries the text that writes it, so a drop is a paste of
     words: anything of the note's own syntax is taken, and everything else is
     left to whoever else wants it. A tab being dragged across the shell is the
     layout's own drag and never lands here, so the pane it would open still
     opens. What `dataTransfer` holds cannot be read until the drop itself, so
     until then the shape of the payload is all there is to go on. */
  const BRACKETS = /^!?\[\[([^\]\n]+)\]\]$/;
  let dropping = $state(false);
  const takeable = (e: DragEvent): boolean => !dragging() && (e.dataTransfer?.types.includes('text/plain') ?? false);

  /* The thing goes at the end, on a line of its own, with a blank line above it
     so that markdown reads it as a block and not as the tail of a paragraph. */
  const appended = (text: string, embed: string): string =>
    text.trim() === '' ? `${embed}\n` : `${text.replace(/\n+$/, '')}\n\n${embed}\n`;

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
    const text = e.dataTransfer?.getData('text/plain').trim() ?? '';
    if (!BRACKETS.test(text)) return;
    e.preventDefault();
    const doc = noteDocs.get(noteId); if (!doc) return;
    /* Whoever hands the words over says whether they are a card or a link — a
       panel row drags out an embed, a tab strip drags out nothing of the sort —
       and the note keeps what they wrote. */
    noteDocs.setBodyRecorded(noteId, appended(doc.body, text), 'drop into note');
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="note-view" class:dropping bind:this={host} {onclick} {ondragover} {ondragleave} {ondrop}>
  {#if html}{@html html}{:else}<p class="blank">Nothing here yet — press Ctrl+E to write.</p>{/if}
</div>

<style>
  .note-view{max-width:760px;margin:0 auto;padding:8px 40px 40vh;font-family:var(--serif);font-size:1rem;line-height:1.65;color:var(--ink)}
  .blank{color:var(--muted);font-family:var(--sans);font-size:0.9rem}
  @media (max-width:900px){ .note-view{padding:8px 18px 30vh} }

  /* The rendered markdown is written by render.ts, so its rules are global,
     held inside this view by the class around them. */
  .note-view :global(h1),.note-view :global(h2),.note-view :global(h3),.note-view :global(h4){font-family:var(--sans);font-weight:600;line-height:1.25;margin:1.6em 0 0.5em}
  .note-view :global(h1){font-size:1.5rem;margin-top:0.6em} .note-view :global(h2){font-size:1.25rem} .note-view :global(h3){font-size:1.05rem} .note-view :global(h4){font-size:0.95rem}
  .note-view :global(p),.note-view :global(ul),.note-view :global(ol),.note-view :global(blockquote){margin:0.85em 0}
  .note-view :global(ul),.note-view :global(ol){padding-left:1.4em}
  .note-view :global(li){margin:0.25em 0}
  .note-view :global(hr){border:0;border-top:1px solid var(--rule);margin:2em 0}
  .note-view :global(blockquote){border-left:3px solid var(--rule);padding-left:14px;color:var(--muted);font-style:italic}
  .note-view :global(code){font-family:var(--mono,ui-monospace,monospace);font-size:0.85em;padding:1px 5px;border-radius:4px;background:var(--soft)}
  .note-view :global(pre){background:var(--soft);border:1px solid var(--rule);border-radius:6px;padding:12px 14px;overflow:auto}
  .note-view :global(pre code){background:none;padding:0;font-size:0.82rem;line-height:1.5}
  .note-view :global(table){border-collapse:collapse;font-family:var(--sans);font-size:0.9rem;width:100%}
  .note-view :global(th),.note-view :global(td){border:1px solid var(--rule);padding:5px 9px;text-align:left}
  .note-view :global(a){color:var(--accent)}
  .note-view :global(img){max-width:100%;height:auto;border-radius:4px;display:block}

  /* an image and the grip that sizes it */
  .note-view :global(.img-wrap){position:relative;display:inline-block;max-width:100%;line-height:0}
  .note-view :global(.img-grip){position:absolute;top:0;right:-3px;width:10px;height:100%;cursor:ew-resize;touch-action:none;border-radius:3px}
  .note-view :global(.img-wrap:hover .img-grip){background:linear-gradient(to right,transparent,color-mix(in srgb,var(--accent) 45%,transparent))}

  /* the links a note makes */
  .note-view :global(a.wiki){color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;cursor:pointer}
  .note-view :global(.wiki.dead){color:var(--muted);text-decoration:underline dashed;text-underline-offset:3px;cursor:help}

  /* The cards are dressed by cards.css wherever they stand; here they are
     only given room in the column. A figure held live is as wide as the book
     draws it, the note's 40 px sides included, until the reader sizes it. */
  .note-view :global(:is(.hl-embed,.drawing-embed,.book-embed,.fig-embed,.stub-embed,.file-embed,.chat-embed)){margin:1.1em 0}
  .note-view :global(.fig-embed.live:not([style*="width"]) .fig-root){margin:0 -40px}
  @media (max-width:900px){ .note-view :global(.fig-embed.live .fig-root){margin:0} }

  /* while something is being dragged over the note, which will land at its end */
  .note-view.dropping{outline:2px dashed var(--accent);outline-offset:-6px;border-radius:8px}
</style>
