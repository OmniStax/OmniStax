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
  import { render, setImageWidth, type Resolver } from '../../lib/notes/md/render';
  import { isBook, parseLink, type BookKind } from '../../lib/notes/md/links';
  import { assetId, getAsset } from '../../lib/notes/assets';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import { notes } from '../../lib/notes/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label } from '../../lib/sections/grouping';
  import { spansOf } from '../../lib/sections/concepts.svelte';
  import { goSpan, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { lookupVariable, symKey } from '../../lib/hover/data';
  import { dragging } from '../../lib/layout/drag.svelte';
  import { FIG } from '../../lib/fig/figlib';
  import { conceptId, itemKey, noteId as asNoteId, noteItem, sectionId, spanId, type NoteId } from '../../lib/types/ids';

  let { noteId, body }: { noteId: NoteId; body: string } = $props();

  /* The chapter a section belongs to, and its tables if they have been fetched.
     A note may name a section of a chapter nobody has opened, so this answers
     nothing until `decorate` has asked for it. */
  const chapterDir = (section: string): string | undefined => registry.chapterOf(sectionId(section))?.dir;
  const chapterData = (section: string) => { const dir = chapterDir(section); return dir ? registry.chapters[dir] : undefined; };

  /* Everything the renderer cannot know by itself. The asset is the one lookup
     that cannot be answered here and now: IndexedDB takes a turn of the loop,
     so the image renders without a source and is filled in below. The four
     things of the book are read out of the chapter's tables the way the hover
     cards read them, so a card in a note says what a card over the text says. */
  const resolver = (): Resolver => ({
    note: (name) => noteDocs.byName(name)?.id ?? null,
    section: (id) => { const e = registry.entry(sectionId(id)); return e?.built ? { title: e.title } : null; },
    highlight: (id) => {
      const n = notes.get(id); if (!n) return null;
      return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(n.section)?.title ?? '') };
    },
    asset: () => null,
    /* An equation's id is its chapter's, so the section says which chapter to
       read and the id finds the row in it; what the equation states is the
       concept that names it as its own. */
    equation: (section, id) => {
      const d = chapterData(section); if (!d) return null;
      const e = d.formulas.equations.find((x) => x.id === id); if (!e) return null;
      return { tex: e.tex, condition: e.condition, important: e.important, conceptName: d.concepts.concepts.find((c) => c.eq === e.id)?.name, anchor: e.anchor, section: e.section };
    },
    term: (section, term) => {
      const d = chapterData(section); if (!d) return null;
      const g = d.formulas.glossary.find((x) => x.term.toLowerCase() === term.toLowerCase());
      return g ? { term: g.term, definition: g.definition, section: g.section } : null;
    },
    /* A chapter may give one symbol two meanings in two sections, so the section
       the note names picks which; the TeX is the book's own macro for it. */
    symbol: (section, sym) => {
      const d = chapterData(section); if (!d) return null;
      const v = lookupVariable(d.formulas.variables, symKey(sym), section); if (!v) return null;
      return { sym, tex: registry.manifest.symbols[sym] ?? sym, meaning: v.meaning, unit: v.unit, typeLabel: v.type ? registry.manifest.types[v.type]?.label : undefined, section: v.section, anchor: v.anchor };
    },
    concept: (section, id) => {
      const d = chapterData(section); if (!d) return null;
      const c = d.concepts.concepts.find((x) => x.id === id); if (!c) return null;
      const eq = c.eq ? d.formulas.equations.find((e) => e.id === c.eq) : undefined;
      return { name: c.name, kind: c.kind, why: c.status === 'built' ? c.why : undefined, section: c.section, eqTex: eq?.tex, placeholder: c.status === 'placeholder' };
    },
  });

  const html = $derived(body.trim() ? render(body, resolver()) : '');

  /* ── what the rendered HTML still needs ────────────────────────────────── */

  /* A note swapped in under this view leaves its asset lookups in flight; only
     the newest pass may write what it finds. */
  let pass = 0;

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
      const dir = chapterDir(t.section);
      return dir && registry.chapterStatus[dir] === 'loading' ? `Section ${t.section} is loading…` : MISSING[t.kind];
    }
    const words = el.textContent ?? '';
    return words.startsWith('hl:') ? 'That highlight is gone.'
      : /^\d+\.\d+/.test(words) ? `Section ${words.split(/\s/)[0]} is not in the book yet.`
        : `No note named “${words}”.`;
  };

  /* A card of the book that resolved to nothing may only be waiting on its
     chapter: ask for it once per chapter per pass, and the rendering, which
     reads the chapters through the resolver, runs again when it lands. */
  const fetchChapters = (el: HTMLElement): void => {
    const asked = new Set<string>();
    for (const d of el.querySelectorAll<HTMLElement>('.wiki.dead[data-embed]')) {
      const t = parseLink(d.dataset.embed ?? ''); if (!isBook(t)) continue;
      const dir = chapterDir(t.section);
      if (!dir || asked.has(dir)) continue;
      asked.add(dir);
      void registry.loadChapter(dir).catch(() => {});
    }
  };

  /* The book writes its symbols with macros of its own, which KaTeX alone does
     not know, so every line of TeX and every name carrying `$…$` is set by the
     book's own renderer. Each element is set once: a rendering replaces them. */
  const setMath = (el: HTMLElement): void => {
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

  const decorate = (el: HTMLElement): void => {
    const mine = ++pass;
    for (const img of el.querySelectorAll<HTMLImageElement>('img[data-asset]')) {
      const id = img.dataset.asset ?? '';
      void getAsset(assetId(id)).then((url) => { if (mine === pass && url) img.src = url; });
    }
    for (const img of el.querySelectorAll<HTMLImageElement>('img')) grip(img);
    fetchChapters(el);
    setMath(el);
    for (const d of el.querySelectorAll<HTMLElement>('.wiki.dead')) d.title = deadTitle(d);
  };

  let host = $state<HTMLElement | null>(null);
  $effect(() => { const el = host; void html; if (el) decorate(el); });

  /* ── following a link ──────────────────────────────────────────────────── */

  /* A card of the book goes where the book puts the thing: an equation and a
     symbol to the span that states them, a concept to the span that introduces
     it, and anything with no span of its own to the section that holds it. */
  const goBook = (embed: string): void => {
    const t = parseLink(embed); if (!isBook(t)) return;
    const sec = sectionId(t.section);
    if (t.kind === 'equation') { const e = resolver().equation(t.section, t.id); if (e?.anchor) { goSpan(spanId(e.anchor)); return; } }
    if (t.kind === 'symbol') { const v = resolver().symbol(t.section, t.sym); if (v?.anchor) { goSpan(spanId(v.anchor)); return; } }
    if (t.kind === 'concept') { const intro = spansOf(conceptId(t.id)).intro[0]; if (intro) { goSpan(intro); return; } }
    void openDoc(sec, 'text');
  };

  const onclick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('.hl-embed[data-hl]');
    if (card?.dataset.hl) { const n = notes.get(card.dataset.hl); if (n) goNote(n); return; }
    const book = t.closest<HTMLElement>('.book-embed[data-embed]');
    if (book?.dataset.embed) { goBook(book.dataset.embed); return; }
    const a = t.closest<HTMLAnchorElement>('a.wiki[data-link]');
    const link = a?.dataset.link; if (!link) return;
    e.preventDefault();
    const note = /^note:(.+)$/.exec(link);
    if (note) { void openItem(itemKey(noteItem(asNoteId(note[1])))); return; }
    const sec = /^section:(.+)$/.exec(link);
    if (sec) void openDoc(sectionId(sec[1]), 'text');
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

  /* a highlight, quoted whole, in the colour it was marked with */
  .note-view :global(.hl-embed){margin:1.1em 0;padding:12px 14px;border:1px solid var(--rule);border-left-width:5px;border-radius:6px;background:var(--soft);cursor:pointer}
  .note-view :global(.hl-embed:hover){border-color:var(--accent)}
  .note-view :global(.hl-embed.hl-yellow){border-left-color:var(--hl-yellow)}
  .note-view :global(.hl-embed.hl-green){border-left-color:var(--hl-green)}
  .note-view :global(.hl-embed.hl-blue){border-left-color:var(--hl-blue)}
  .note-view :global(.hl-embed.hl-pink){border-left-color:var(--hl-pink)}
  .note-view :global(.hl-embed blockquote){margin:0;border:0;padding:0;font-style:normal;color:var(--ink)}
  .note-view :global(.hl-embed.hl-yellow blockquote){box-shadow:inset 0 -0.55em 0 var(--hl-yellow)}
  .note-view :global(.hl-embed.hl-green blockquote){box-shadow:inset 0 -0.55em 0 var(--hl-green)}
  .note-view :global(.hl-embed.hl-blue blockquote){box-shadow:inset 0 -0.55em 0 var(--hl-blue)}
  .note-view :global(.hl-embed.hl-pink blockquote){box-shadow:inset 0 -0.55em 0 var(--hl-pink)}
  .note-view :global(.hl-embed .hl-meta){margin-top:8px;font-family:var(--sans);font-size:0.72rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .note-view :global(.hl-embed .hl-text){margin-top:4px;font-family:var(--sans);font-size:0.88rem;color:var(--ink)}
  .note-view :global(.hl-embed .hl-text:empty){display:none}

  /* a thing of the book, held whole in the note: the same card as a highlight,
     with a left rule in the colour of what it holds */
  .note-view :global(.book-embed){margin:1.1em 0;padding:12px 14px;border:1px solid var(--rule);border-left-width:5px;border-left-color:var(--accent);border-radius:6px;background:var(--soft);cursor:pointer}
  .note-view :global(.book-embed:hover){border-color:var(--accent)}
  .note-view :global(.book-embed.kind-term){border-left-color:var(--warm)}
  .note-view :global(.book-embed .embed-eyebrow){font-family:var(--sans);font-size:0.72rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted)}
  .note-view :global(.book-embed .embed-title){margin-top:4px;font-family:var(--sans);font-size:0.95rem;font-weight:600;color:var(--ink)}
  .note-view :global(.book-embed .embed-tex){margin:8px 0 2px;color:var(--ink);overflow-x:auto}
  .note-view :global(.book-embed .embed-tex .katex){font-size:1.05em}
  .note-view :global(.book-embed .embed-body){margin-top:5px;font-family:var(--serif);font-size:0.92rem;line-height:1.5;color:var(--ink)}
  .note-view :global(.book-embed .embed-body .katex),.note-view :global(.book-embed .embed-title .katex){font-size:1em}

  /* while something is being dragged over the note, which will land at its end */
  .note-view.dropping{outline:2px dashed var(--accent);outline-offset:-6px;border-radius:8px}
</style>
