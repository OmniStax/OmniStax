<script lang="ts">
  /* The reading side of a note: the markdown as the reader means it to look.
     The rendering itself is pure — render.ts takes the text and a resolver and
     hands back HTML — so all that is left here is the three things HTML alone
     cannot do. An image the reader pasted carries only its id, and the blob is
     fetched from the asset store and put in place. Every image takes a grip at
     its right edge, and dragging it writes the new width back into the
     markdown, where it stays. And the links the note makes are followed: a note
     opens in a tab of its own, a section opens in the book, and a highlight
     jumps to the words it marks. */
  import { render, setImageWidth, type Resolver } from '../../lib/notes/md/render';
  import { assetId, getAsset } from '../../lib/notes/assets';
  import { noteDocs } from '../../lib/notes/docs.svelte';
  import { notes } from '../../lib/notes/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { registry } from '../../lib/sections/registry.svelte';
  import { label } from '../../lib/sections/grouping';
  import { openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { itemKey, noteId as asNoteId, noteItem, sectionId, type NoteId } from '../../lib/types/ids';

  let { noteId, body }: { noteId: NoteId; body: string } = $props();

  /* Everything the renderer cannot know by itself. The asset is the one lookup
     that cannot be answered here and now: IndexedDB takes a turn of the loop,
     so the image renders without a source and is filled in below. */
  const resolver = (): Resolver => ({
    note: (name) => noteDocs.byName(name)?.id ?? null,
    section: (id) => { const e = registry.entry(sectionId(id)); return e?.built ? { title: e.title } : null; },
    highlight: (id) => {
      const n = notes.get(id); if (!n) return null;
      return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(n.section)?.title ?? '') };
    },
    asset: () => null,
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
      const src = img.dataset.src, doc = noteDocs.get(noteId);
      if (src && doc) noteDocs.setBody(noteId, setImageWidth(doc.body, src, width));
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

  /* A link that points at nothing says so when the pointer rests on it. */
  const deadTitle = (words: string): string =>
    words.startsWith('hl:') ? 'That highlight is gone.'
      : /^\d+\.\d+/.test(words) ? `Section ${words.split(/\s/)[0]} is not in the book yet.`
        : `No note named “${words}”.`;

  const decorate = (el: HTMLElement): void => {
    const mine = ++pass;
    for (const img of el.querySelectorAll<HTMLImageElement>('img[data-asset]')) {
      const id = img.dataset.asset ?? '';
      void getAsset(assetId(id)).then((url) => { if (mine === pass && url) img.src = url; });
    }
    for (const img of el.querySelectorAll<HTMLImageElement>('img')) grip(img);
    for (const d of el.querySelectorAll<HTMLElement>('.wiki.dead')) d.title = deadTitle(d.textContent ?? '');
  };

  let host = $state<HTMLElement | null>(null);
  $effect(() => { const el = host; void html; if (el) decorate(el); });

  /* ── following a link ──────────────────────────────────────────────────── */

  const onclick = (e: MouseEvent): void => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('.hl-embed[data-hl]');
    if (card?.dataset.hl) { const n = notes.get(card.dataset.hl); if (n) goNote(n); return; }
    const a = t.closest<HTMLAnchorElement>('a.wiki[data-link]');
    const link = a?.dataset.link; if (!link) return;
    e.preventDefault();
    const note = /^note:(.+)$/.exec(link);
    if (note) { void openItem(itemKey(noteItem(asNoteId(note[1])))); return; }
    const sec = /^section:(.+)$/.exec(link);
    if (sec) void openDoc(sectionId(sec[1]), 'text');
  };
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="note-view" bind:this={host} {onclick}>
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
</style>
