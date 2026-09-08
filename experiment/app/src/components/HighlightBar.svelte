<script lang="ts">
  /* A small toolbar over a text selection in an article: four highlight colours
     and a note. Clicking an existing highlight reopens it to recolour, annotate
     or remove. */
  import { onMount } from 'svelte';
  import { notes, HL_COLORS, type HlColor } from '../lib/notes/store.svelte';
  import { textIndex, rangeSpan } from '../lib/notes/paint';
  import { makeAnchor, type Anchor } from '../lib/notes/anchor';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { openSide, homeSide } from '../lib/layout/model';
  import { reveal } from '../lib/sections/nav.svelte';
  import { sectionId, type SectionId, type DocKind } from '../lib/types/ids';
  type Pending = { section: SectionId; doc: DocKind; anchor: Anchor };
  let open = $state(false), x = $state(0), y = $state(0), mode = $state<'new' | 'edit'>('new'), noteId = $state<string | null>(null);
  let pending: Pending | null = null;
  const place = (r: DOMRect) => { x = Math.max(120, Math.min(window.innerWidth - 120, r.left + r.width / 2)); y = Math.max(44, Math.min(window.innerHeight - 8, r.top - 8)); };
  const fromSelection = () => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (mode === 'new') open = false; return; }
    const range = sel.getRangeAt(0); const c = range.commonAncestorContainer; const el = c.nodeType === Node.ELEMENT_NODE ? (c as Element) : c.parentElement;
    const art = el?.closest<HTMLElement>('article[data-doc]');
    if (!art || !art.contains(range.startContainer) || !art.contains(range.endContainer)) { open = false; return; }
    const ix = textIndex(art); const span = rangeSpan(ix, range);
    if (!span || !ix.full.slice(span.start, span.end).trim()) { open = false; return; }
    const [section, doc] = (art.dataset.doc ?? '').split('/') as [string, DocKind];
    pending = { section: sectionId(section), doc, anchor: makeAnchor(ix.full, span) }; mode = 'new'; noteId = null; place(range.getBoundingClientRect()); open = true;
  };
  let timer = 0;
  const onSel = () => { clearTimeout(timer); timer = window.setTimeout(fromSelection, 160); };
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement; if (t.closest('.hl-bar')) return;
    const m = t.closest<HTMLElement>('mark.hl');
    if (m?.dataset.note) { noteId = m.dataset.note; mode = 'edit'; pending = null; place(m.getBoundingClientRect()); open = true; return; }
    if (mode === 'edit') open = false;
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open = false; };
  onMount(() => { document.addEventListener('selectionchange', onSel); document.addEventListener('click', onClick); document.addEventListener('keydown', onKey); return () => { document.removeEventListener('selectionchange', onSel); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); }; });
  const openNotesView = () => { const v = document.querySelector('[data-view="notes"]'); if (v) reveal(v); else layoutStore.apply((l) => openSide(l, 'view:notes', homeSide(l, 'view:notes'))); };
  const choose = (c: HlColor) => {
    if (mode === 'edit' && noteId) { notes.setColor(noteId, c); open = false; return; }
    if (!pending) return; notes.add(pending.section, pending.doc, pending.anchor, c); document.getSelection()?.removeAllRanges(); open = false;
  };
  const annotate = () => {
    let id = noteId;
    if (mode === 'new' && pending) { id = notes.add(pending.section, pending.doc, pending.anchor, 'yellow').id; document.getSelection()?.removeAllRanges(); }
    if (!id) return; open = false; openNotesView(); notes.editing = id;
  };
  const remove = () => { if (noteId) notes.remove(noteId); open = false; };
  const current = $derived(noteId ? notes.get(noteId)?.color ?? null : null);
</script>

{#if open}
  <div class="hl-bar" role="toolbar" aria-label="Highlight" style:left="{x}px" style:top="{y}px" onmousedown={(e) => e.preventDefault()}>
    {#each HL_COLORS as c (c)}<button type="button" class="dot {c}" class:on={current === c} title="Highlight in {c}" aria-label="Highlight in {c}" onclick={() => choose(c)}></button>{/each}
    <span class="sep"></span>
    <button type="button" class="act" onclick={annotate}>{mode === 'edit' && notes.get(noteId ?? '')?.text ? 'Edit note' : 'Note'}</button>
    {#if mode === 'edit'}<button type="button" class="act" onclick={remove}>Remove</button>{/if}
  </div>
{/if}

<style>
  .hl-bar{position:fixed;transform:translate(-50%,-100%);display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.18);z-index:40;font-family:var(--sans);font-size:0.8rem}
  .dot{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0}
  .dot.yellow{background:var(--hl-yellow)} .dot.green{background:var(--hl-green)} .dot.blue{background:var(--hl-blue)} .dot.pink{background:var(--hl-pink)}
  .dot:hover{transform:scale(1.15)}
  .dot.on{box-shadow:0 0 0 2px var(--panel),0 0 0 3px var(--ink)}
  .sep{width:1px;height:18px;background:var(--rule);margin:0 2px}
  .act{font:inherit;border:0;background:transparent;color:var(--ink);cursor:pointer;padding:3px 6px;border-radius:4px}
  .act:hover{background:var(--soft)}
</style>
