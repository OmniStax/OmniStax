<script lang="ts">
  /* A small toolbar over a text selection in an article: four highlight colours
     and, once the words are marked, the two things a reader does with a
     highlight — write a note on it and take it away. Both are icons, each named
     by the shell's tooltip.

     Marking the words does not put the bar away: the same bar stays where it
     stands, now over a highlight rather than a selection, so the reader can go
     straight on to annotate it. Clicking a highlight in the text opens it again
     the same way. */
  import { onMount } from 'svelte';
  import { notes, HL_COLORS, type HlColor } from '../lib/notes/store.svelte';
  import { ICON } from '../lib/icons';
  import { textIndex, rangeSpan } from '../lib/notes/paint';
  import { makeAnchor, type Anchor } from '../lib/notes/anchor';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openSide, homeSide } from '../lib/layout/model';
  import { reveal } from '../lib/sections/nav.svelte';
  import { bookId, sectionId, sectionRef, type SectionRef, type DocKind, type FileId, fileId } from '../lib/types/ids';
  import { fileMarks } from '../lib/files/marks.svelte';
  import { isMarkId } from '../lib/files/marks';
  import { askAi } from '../lib/chat/open.svelte';
  /* The two surfaces a highlight can be made on: a document of the book, and a
     page of a file the reader imported. They anchor the same way — the same
     quote, the same context — and differ only in which store keeps the mark,
     which the id's own shape says afterwards: ten of base 36 is a file mark
     and eight is the book's. */
  type Pending =
    | { kind: 'doc'; ref: SectionRef; doc: DocKind; anchor: Anchor }
    | { kind: 'file'; file: FileId; page: number; anchor: Anchor };
  /* Which store owns a mark, read off its id, so that everything below acts on
     one of them without asking both. */
  const markOf = (id: string) => (isMarkId(id) ? fileMarks.get(id) : notes.get(id));
  const colorOf = (id: string): HlColor | null => {
    const m = markOf(id);
    return m && (!('kind' in m) || m.kind === 'highlight') ? m.color : null;
  };
  const textOf = (id: string): string => {
    const m = markOf(id);
    return m && (!('kind' in m) || m.kind === 'highlight') ? m.text : '';
  };
  const quoteOf = (id: string): string => {
    const m = markOf(id);
    return m && (!('kind' in m) || m.kind === 'highlight') ? m.anchor.quote : '';
  };
  const recolour = (id: string, c: HlColor): void => { if (isMarkId(id)) fileMarks.setColor(id, c); else notes.setColor(id, c); };
  const drop = (id: string): void => { if (isMarkId(id)) fileMarks.remove(id); else notes.remove(id); };
  const make = (p: Pending, c: HlColor): string =>
    p.kind === 'doc' ? notes.add(p.ref, p.doc, p.anchor, c).id : fileMarks.addHighlight(p.file, p.page, p.anchor, c).id;
  let open = $state(false), x = $state(0), y = $state(0), mode = $state<'new' | 'edit'>('new'), noteId = $state<string | null>(null);
  let pending: Pending | null = null;
  /* The words under the bar, kept because asking the model clears the
     selection and a highlight reopened later has only its quote. */
  let selectedWords = $state('');
  const place = (r: DOMRect) => { x = Math.max(120, Math.min(window.innerWidth - 120, r.left + r.width / 2)); y = Math.max(44, Math.min(window.innerHeight - 8, r.top - 8)); };
  const fromSelection = () => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (mode === 'new') open = false; return; }
    const range = sel.getRangeAt(0); const c = range.commonAncestorContainer; const el = c.nodeType === Node.ELEMENT_NODE ? (c as Element) : c.parentElement;
    /* A page of a file is a surface like a document of the book: the text
       layer over it is the text, and it is anchored in exactly the same way. */
    const art = el?.closest<HTMLElement>('article[data-doc], .pdf-page[data-file] .textLayer');
    if (!art || !art.contains(range.startContainer) || !art.contains(range.endContainer)) { open = false; return; }
    const ix = textIndex(art); const span = rangeSpan(ix, range);
    if (!span || !ix.full.slice(span.start, span.end).trim()) { open = false; return; }
    selectedWords = ix.full.slice(span.start, span.end).trim();
    const anchor = makeAnchor(ix.full, span);
    const sheet = art.closest<HTMLElement>('.pdf-page[data-file]');
    if (sheet) pending = { kind: 'file', file: fileId(sheet.dataset.file ?? ''), page: Number(sheet.dataset.page), anchor };
    else {
      const [section, doc] = (art.dataset.doc ?? '').split('/') as [string, DocKind];
      pending = { kind: 'doc', ref: sectionRef(bookId(art.dataset.book ?? ''), sectionId(section)), doc, anchor };
    }
    mode = 'new'; noteId = null; place(range.getBoundingClientRect()); open = true;
  };
  let timer = 0;
  const onSel = () => { clearTimeout(timer); timer = window.setTimeout(fromSelection, 160); };
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement; if (t.closest('.hl-bar')) return;
    const m = t.closest<HTMLElement>('mark.hl');
    if (m?.dataset.note) { noteId = m.dataset.note; mode = 'edit'; pending = null; selectedWords = quoteOf(m.dataset.note); place(m.getBoundingClientRect()); open = true; return; }
    if (mode === 'edit') open = false;
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open = false; };
  onMount(() => { document.addEventListener('selectionchange', onSel); document.addEventListener('click', onClick); document.addEventListener('keydown', onKey); return () => { document.removeEventListener('selectionchange', onSel); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); }; });
  const openNotesView = () => { const v = document.querySelector('[data-view="annotations"]'); if (v) reveal(v); else layoutStore.apply((l) => openSide(l, 'view:annotations', homeSide(l, 'view:annotations'))); };
  const choose = (c: HlColor) => {
    if (mode === 'edit' && noteId) { recolour(noteId, c); return; }
    if (!pending) return;
    const id = make(pending, c);
    document.getSelection()?.removeAllRanges();
    /* The bar stands over the words it has just marked. */
    noteId = id; mode = 'edit'; pending = null;
  };
  const annotate = () => {
    let id = noteId;
    if (mode === 'new' && pending) { id = make(pending, 'yellow'); document.getSelection()?.removeAllRanges(); }
    if (!id) return; open = false; openNotesView();
    if (isMarkId(id)) fileMarks.editing = id; else notes.editing = id;
  };
  const remove = () => { if (noteId) drop(noteId); open = false; };
  /* The words themselves go into the composer of a chat — the one already
     open, or one opened for them. A selection means nothing more than its
     words: no chip, no highlight, and nothing marked on the page. */
  const askAI = () => {
    const words = selectedWords || (noteId ? quoteOf(noteId) : '');
    open = false;
    document.getSelection()?.removeAllRanges();
    askAi(words);
  };
  const noted = $derived(mode === 'edit' && !!textOf(noteId ?? ''));
  const current = $derived(noteId ? colorOf(noteId) : null);
</script>

{#if open}
  <div class="hl-bar" role="toolbar" aria-label="Highlight" style:left="{x}px" style:top="{y}px" onmousedown={(e) => e.preventDefault()}>
    {#each HL_COLORS as c (c)}<button type="button" class="dot {c}" class:on={current === c} title="Highlight in {c}" aria-label="Highlight in {c}" onclick={() => choose(c)}></button>{/each}
    <span class="sep"></span>
    <button type="button" class="act ask" title="Ask AI about this" aria-label="Ask AI about this" onclick={askAI}>Ask AI</button>
    <button type="button" class="act" title={noted ? 'Edit the note on this highlight' : 'Write a note on this highlight'} aria-label={noted ? 'Edit the note on this highlight' : 'Write a note on this highlight'} onclick={annotate}>{@html ICON.highlighter}</button>
    {#if mode === 'edit'}<button type="button" class="act" title="Remove this highlight" aria-label="Remove this highlight" onclick={remove}>{@html ICON.trash}</button>{/if}
  </div>
{/if}

<style>
  .hl-bar{position:fixed;transform:translate(-50%,-100%);display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:40;font-family:var(--sans);font-size:0.8rem}
  .dot{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0}
  .dot.yellow{background:var(--hl-yellow)} .dot.green{background:var(--hl-green)} .dot.blue{background:var(--hl-blue)} .dot.pink{background:var(--hl-pink)}
  .dot:hover{transform:scale(1.15)}
  .dot.on{box-shadow:0 0 0 2px var(--panel),0 0 0 3px var(--ink)}
  .sep{width:1px;height:18px;background:var(--rule);margin:0 2px}
  .act{display:grid;place-items:center;width:24px;height:24px;border:0;background:transparent;color:var(--ink);cursor:pointer;padding:0;border-radius:4px}
  .act:hover{background:var(--soft)}
  .act:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  /* the one action with words rather than a glyph: "Ask AI" names a thing no icon says plainly */
  .act.ask{width:auto;padding:0 7px;font:inherit;font-size:0.76rem;color:var(--muted)}
  .act.ask:hover{color:var(--ink)}
  .act :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
</style>
