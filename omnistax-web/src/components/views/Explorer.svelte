<script lang="ts">
  /* The explorer: everything the reader has, drawn under two fixed roots —
     Books, which holds the textbooks they have added and the row that finds
     more, and Notes, which holds the folders they have made and the notes they
     have written. A textbook opens into its chapters and its
     chapters into their sections; a section is a file, so clicking it opens the
     text, and it opens further into the subconcepts of that text and the
     problems set at its end. The rows of the reader's own things can be made,
     named, moved and deleted here, all of it inside Notes; a book and its rows
     are read only, since the book is the book, and the only thing a reader does
     to one is take it out of Books again.

     The tree the rows are drawn from is the explorer store, which keeps the
     entries and which rows are open; the chapters and sections come from the
     manifest instead, since they are the book's and not the reader's. Any
     book's section opens as a tab. */
  import { onMount } from 'svelte';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { bookKey, chapterKey, entryId, sectionKey, type Entry, type EntryId } from '../../lib/explorer/model';
  import { createFolder, createNote, deleteEntry, moveEntry, removeBook, renameEntry } from '../../lib/explorer/edits';
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { go, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { focusedGroup } from '../../lib/layout/model';
  import { draggable } from '../../lib/layout/drag.svelte';
  import { ui } from '../../lib/commands/ui.svelte';
  import { ICON } from '../../lib/icons';
  import { bookId, fileId, fileItem, itemKey, noteId, noteItem, sectionId, sectionRef, sheetId, sheetItem, sameSection, type SectionId, type SectionRef } from '../../lib/types/ids';
  import { createDrawing, deleteDrawing, renameDrawing } from '../../lib/drawer/edits';
  import { drawingId, drawingItem } from '../../lib/types/ids';
  import { importFiles, importSummary } from '../../lib/files/import';
  import ImportToast from '../files/ImportToast.svelte';
  import type { BookManifest, SectionEntry, SheetEntry } from '../../lib/content/schema';
  import { pageLabel, pagesOf } from '../../lib/content/roles';
  import RowMenu from '../explorer/RowMenu.svelte';
  import { offlineBooks } from '../../lib/offline/store.svelte';

  type RowKind = 'root' | 'find' | 'folder' | 'note' | 'file' | 'drawing' | 'book' | 'sheet' | 'sheets' | 'chapter' | 'section' | 'heading' | 'hint';
  type Row = {
    readonly key: string;            /* what selection and the expanded set call this row */
    readonly kind: RowKind;
    readonly depth: number;
    readonly label: string;
    readonly icon: string;
    readonly entry?: Entry;          /* the reader's own rows carry theirs */
    readonly section?: SectionId;
    readonly domId?: string;         /* a heading to jump to */
    readonly expandable: boolean;
    readonly open: boolean;
    readonly dim: boolean;           /* not built, or nothing to say yet */
    readonly active: boolean;        /* what the focused group is showing */
    readonly book?: string;
    readonly updated?: boolean;
    readonly root?: RootName;     /* which of the two fixed roots this row is */
  };
  type RootName = 'books' | 'notes';
  const ROOT_KEY: Readonly<Record<RootName, string>> = { books: 'root:books', notes: 'root:notes' };

  /* A book's manifest out of the registry, asked for once; null while it has not arrived. */
  const manifestOf = (id: string): BookManifest | null => {
    const b = bookId(id);
    if (registry.hasBook(b)) return registry.manifest(b);
    void registry.ensureBook(b);
    return null;
  };

  const activeKey = $derived(focusedGroup(layoutStore.layout).active);
  /* The headings of a loaded section: its spans, each named by the first
     heading it carries, with the maths stripped out of the name. Null while the
     section has not been opened, which is a different thing from having none. */
  const headingsOf = (ref: SectionRef): { id: string; label: string }[] | null => {
    const st = registry.state(ref);
    const root = st ? st.docs.text ?? Object.values(st.docs)[0] ?? null : null;
    if (!root) return null;
    return Array.from(root.querySelectorAll<HTMLElement>('section[id]')).flatMap((s) => {
      const h = s.querySelector('h2, h3');
      if (!h) return [];
      const clone = h.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.katex-mathml').forEach((m) => m.remove());
      const label = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      return label ? [{ id: s.id, label }] : [];
    });
  };

  const rows = $derived.by((): Row[] => {
    const out: Row[] = [];
    const hint = (key: string, depth: number, label: string): void => {
      out.push({ key, kind: 'hint', depth, label, icon: '', expandable: false, open: false, dim: true, active: false });
    };
    const section = (id: string, s: SectionEntry, depth: number): void => {
      const key = sectionKey(id, s.id);
      const open = explorer.expanded(key);
      const ref = sectionRef(bookId(id), sectionId(s.id));
      out.push({
        key, kind: 'section', depth, label: pageLabel(s), icon: ICON.text, section: ref.section,
        expandable: s.built, open,
        dim: !s.built, active: s.built && sameSection(focus.section, ref), book: id,
        updated: (offlineBooks.updatedSections[id] ?? []).includes(s.id),
      });
      if (!s.built || !open) return;
      const heads = headingsOf(ref);
      if (heads === null) hint(`${key}?`, depth + 1, 'Open the section to see its headings');
      else heads.forEach((h) => out.push({
        key: `${key}#${h.id}`, kind: 'heading', depth: depth + 1, label: h.label, icon: '', domId: h.id, book: id,
        expandable: false, open: false, dim: false, active: spy.current.section?.book === id && spy.current.section.span === h.id,
      }));
    };
    /* A book's own introduction stands before its chapters and its summary after
       them, and a chapter's stand either side of its sections, as the book
       prints them (rule 21). */
    const book = (bookId: string, depth: number): void => {
      const m = manifestOf(bookId);
      if (!m) { hint(`${bookKey(bookId)}?`, depth, 'Reading the book…'); return; }
      /* The book's reference sheets stand above its text: a reader reaches for
         the periodic table at any point in the book, not at one place in it.
         One sheet is a row of its own; a book with a shelf of them — the
         appendices of the chemistry book — keeps them in a folder, so the
         chapters are still the first thing under the book. */
      const sheetRow = (sh: SheetEntry, at: number): Row => ({
        key: `sheet:${bookId}/${sh.id}`, kind: 'sheet', depth: at, label: sh.title, icon: ICON.formulas,
        expandable: false, open: false, dim: false, book: m.id,
        active: activeKey === itemKey(sheetItem(m.id, sheetId(sh.id))),
      });
      const shelf = m.sheets.length > 3;
      if (!shelf) m.sheets.forEach((sh) => out.push(sheetRow(sh, depth)));
      else {
        const key = `sheets:${bookId}`;
        const open = explorer.expanded(key);
        out.push({ key, kind: 'sheets', depth, label: 'Reference', icon: ICON.folder, expandable: true, open, dim: false, active: false });
        if (open) m.sheets.forEach((sh) => out.push(sheetRow(sh, depth + 1)));
      }
      if (m.intro) section(bookId, m.intro, depth);
      m.chapters.forEach((c) => {
        const key = chapterKey(bookId, c.id);
        const open = explorer.expanded(key);
        out.push({ key, kind: 'chapter', depth, label: `${c.id} ${c.title}`, icon: ICON.folder, expandable: true, open, dim: false, active: false });
        if (open) pagesOf(c).forEach((s) => section(bookId, s, depth + 1));
      });
      if (m.summary) section(bookId, m.summary, depth);
    };
    const walk = (parent: EntryId | null, depth: number): void => {
      explorer.children(parent).forEach((e) => {
        if (e.kind === 'book') return;
        if (e.kind === 'folder') {
          const open = explorer.expanded(e.id);
          out.push({ key: e.id, kind: 'folder', depth, label: e.name, icon: ICON.folder, entry: e, expandable: true, open, dim: false, active: false });
          if (open) walk(e.id, depth + 1);
          return;
        }
        if (e.kind === 'note') {
          out.push({
            key: e.id, kind: 'note', depth, label: e.name, icon: ICON.note, entry: e,
            expandable: false, open: false, dim: false, active: activeKey === itemKey(noteItem(noteId(e.id))),
          });
          return;
        }
        /* A file the reader imported sits beside their notes and opens in a tab
           of its own, which is the only thing that tells it apart here. */
        if (e.kind === 'file') {
          out.push({
            key: e.id, kind: 'file', depth, label: e.name, icon: ICON.file, entry: e,
            expandable: false, open: false, dim: false, active: activeKey === itemKey(fileItem(fileId(e.fileId ?? e.id))),
          });
          return;
        }
        /* A drawing sits beside them and opens in a tab of its own too; it is
           the reader's to rename and to delete, as a note is. */
        if (e.kind === 'drawing') {
          out.push({
            key: e.id, kind: 'drawing', depth, label: e.name, icon: ICON.drawing, entry: e,
            expandable: false, open: false, dim: false, active: activeKey === itemKey(drawingItem(drawingId(e.drawingId ?? e.id))),
          });
          return;
        }
      });
    };
    /* A root is open by default, so its key in the expanded set means shut. */
    const booksOpen = !explorer.expanded(ROOT_KEY.books);
    const notesOpen = !explorer.expanded(ROOT_KEY.notes);
    out.push({ key: ROOT_KEY.books, kind: 'root', root: 'books', depth: 0, label: 'OmniBooks', icon: ICON.book, expandable: true, open: booksOpen, dim: false, active: false });
    if (booksOpen) explorer.children(null).filter((e) => e.kind === 'book').forEach((e) => {
      const bookId = e.bookId ?? '';
      const key = bookKey(bookId);
      const open = explorer.expanded(key);
      out.push({ key, kind: 'book', depth: 1, label: e.name, icon: ICON.book, entry: e, expandable: true, open, dim: false, active: false });
      if (open) book(bookId, 2);
    });
    if (booksOpen) out.push({ key: 'find', kind: 'find', depth: 1, label: 'Find new OmniBooks', icon: ICON.search, expandable: false, open: false, dim: false, active: false });
    out.push({ key: ROOT_KEY.notes, kind: 'root', root: 'notes', depth: 0, label: 'Your Files', icon: ICON.folder, expandable: true, open: notesOpen, dim: false, active: false });
    if (notesOpen) walk(null, 1);
    return out;
  });

  /* Where a new row goes: inside the selected folder, beside the selected note,
     and under User when nothing is selected or a book's row is. */
  const parentForNew = (): EntryId | null => {
    const sel = explorer.selected;
    const e = sel === null ? undefined : explorer.entry(entryId(sel));
    if (!e) return null;
    return e.kind === 'folder' ? e.id : e.kind === 'note' ? e.parent : null;
  };
  const openUpTo = (id: EntryId | null): void => {
    let at = id;
    const seen = new Set<string>();
    while (at !== null && !seen.has(at)) { seen.add(at); if (!explorer.expanded(at)) explorer.toggle(at); at = explorer.entry(at)?.parent ?? null; }
  };
  const newFolder = (parent: EntryId | null): void => {
    openUpTo(parent);
    const id = createFolder(parent);
    explorer.selected = id; explorer.renaming = id;
  };
  /* A note is two things under one id: the row here and the document itself.
     The tab opens first and the name box after it, so that the box and not the
     editor is what the reader types the name into. */
  const newNote = (parent: EntryId | null): void => {
    openUpTo(parent);
    const doc = createNote(parent);
    const id = entryId(doc.id);
    explorer.selected = id;
    void openItem(itemKey(noteItem(doc.id)));
    requestAnimationFrame(() => requestAnimationFrame(() => { explorer.renaming = id; }));
  };
  /* The row, the documents it stood for and their tabs all go at once, and the
     whole of it is one step of the shell's timeline. */
  /* A book leaves Books whole: nothing of the reader's is inside it, so there
     is nothing to lose, but it is asked for all the same. */
  const removeBookRow = (e: Entry): void => {
    if (!confirm(`Remove \u201c${e.name}\u201d from your books?`)) return;
    removeBook(e);
  };
  const remove = (e: Entry): void => {
    const kids = explorer.children(e.id);
    if (kids.length && !confirm(`Delete “${e.name}” and the ${kids.length === 1 ? 'row' : 'rows'} inside it?`)) return;
    /* A drawing is a row and the ink under it, kept by a store of its own, so
       its own compound edit takes both away together. */
    if (e.kind === 'drawing') { deleteDrawing(e); return; }
    deleteEntry(e);
  };

  /* A drawing is made as a note is: the ink is written first, the row takes its
     id, the tab opens, and the name box follows so that the reader names the
     row and not the page. */
  const newDrawing = (parent: EntryId | null): void => {
    openUpTo(parent);
    const made = createDrawing(parent);
    const id = entryId(made.id);
    explorer.selected = id;
    void openItem(itemKey(drawingItem(made.id)));
    requestAnimationFrame(() => requestAnimationFrame(() => { explorer.renaming = id; }));
  };

  /* Renaming happens in place: the label gives way to a box, Enter and losing
     the focus keep what was typed, Escape leaves the name as it was. */
  let abandoned = false;
  const commit = (e: Entry, name: string): void => {
    if (explorer.renaming !== e.id) return;
    explorer.renaming = null;
    const next = name.trim();
    if (!next || next === e.name) return;
    /* A drawing's name is its row and its record, renamed as one step. */
    if (e.kind === 'drawing') { renameDrawing(e.id, next); return; }
    renameEntry(e.id, next);
  };
  const renameKey = (ev: KeyboardEvent, e: Entry): void => {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); commit(e, (ev.currentTarget as HTMLInputElement).value); }
    else if (ev.key === 'Escape') { ev.preventDefault(); abandoned = true; explorer.renaming = null; }
  };
  /* The row the name box stands on, kept aside from the tree it was drawn from.
     The box loses the focus as Svelte takes it away — Enter and Escape both
     close it — and the row it was drawn for is no longer the branch's to read by
     then, so what the box needs of the row is held here instead. */
  let boxRow: Entry | null = null;
  const takeBox = (node: HTMLInputElement, e: Entry) => {
    boxRow = e; node.focus(); node.select();
    return { update: (next: Entry) => { boxRow = next; }, destroy: () => { boxRow = null; } };
  };
  /* Losing the focus keeps what was typed, unless Escape has just left the name
     as it was, or the box has already been closed by Enter — which `commit`
     sees for itself, since the row is no longer the one being named. */
  const leaveBox = (value: string): void => {
    const e = boxRow;
    if (abandoned) { abandoned = false; return; }
    if (e) commit(e, value);
  };

  /* A note row is draggable into a document group, which is the layout's own
     action; every other row is only ever dragged inside the tree, so the action
     is only attached where a note stands. */
  const noteDrag = (node: HTMLElement, key: string | null) => {
    if (!key) return { update: () => {}, destroy: () => {} };
    const d = draggable(node, { key, from: null });
    return { update: (next: string | null) => { if (next) d.update({ key: next, from: null }); }, destroy: () => d.destroy() };
  };

  /* Clicking a row: the reader's rows open or select, a book's rows walk into
     the book, and a section is a file that opens its text. */
  const activate = (r: Row, ev?: MouseEvent): void => {
    explorer.selected = r.key;
    /* The shell closes whatever is open on any click it sees, so the row that
       opens the finder keeps its own click to itself. */
    if (r.kind === 'find') { ev?.stopPropagation(); ui.openFindTextbook(); return; }
    if (r.kind === 'root' || r.kind === 'folder' || r.kind === 'book' || r.kind === 'chapter' || r.kind === 'sheets') { explorer.toggle(r.key); return; }
    if (r.kind === 'note' && r.entry) { void openItem(itemKey(noteItem(noteId(r.entry.id)))); return; }
    if (r.kind === 'file' && r.entry) { void openItem(itemKey(fileItem(fileId(r.entry.fileId ?? r.entry.id)))); return; }
    if (r.kind === 'drawing' && r.entry) { void openItem(itemKey(drawingItem(drawingId(r.entry.drawingId ?? r.entry.id)))); return; }
    if (!r.book) return;
    if (r.kind === 'sheet') { void openItem(itemKey(sheetItem(bookId(r.book), sheetId(r.key.slice(r.key.lastIndexOf('/') + 1))))); return; }
    if (r.kind === 'section' && r.section && !r.dim) { offlineBooks.markSeen(r.book, r.section); void openDoc(sectionRef(bookId(r.book), r.section), 'text'); return; }
    if (r.kind === 'heading' && r.domId) go(bookId(r.book), r.domId);
  };

  /* The row menu, hanging where the pointer or the button left it. */
  type Menu = { readonly entry: Entry; readonly x: number; readonly y: number };
  let menu = $state.raw<Menu | null>(null);
  const menuItems = $derived.by(() => {
    const m = menu;
    if (!m) return [];
    const e = m.entry;
    if (e.kind === 'book') return [{ label: 'Remove from OmniBooks', run: () => removeBookRow(e) }];
    const inside = e.kind === 'folder' ? e.id : e.parent;
    return [
      { label: 'New note here', run: () => newNote(inside) },
      { label: 'New drawing here', run: () => newDrawing(inside) },
      { label: 'Import files here', run: () => { pickInto = inside; picker?.click(); } },
      ...(e.kind === 'folder' ? [{ label: 'New folder here', run: () => newFolder(inside) }] : []),
      { label: 'Rename', run: () => { explorer.selected = e.id; explorer.renaming = e.id; } },
      { label: 'Delete', run: () => remove(e) },
    ];
  });
  const openMenu = (ev: MouseEvent, e: Entry): void => {
    ev.preventDefault(); ev.stopPropagation();
    explorer.selected = e.id;
    menu = { entry: e, x: ev.clientX, y: ev.clientY };
  };

  /* ── importing the reader's own files ─────────────────────────── */

  /* The icon on the Your Files row and a drop on the tree are the same thing,
     so both come through here: one call, one step of the timeline, and one
     line at the foot of the window saying what happened. The line stays a
     moment after the last file lands, so that a refusal is read and not
     glimpsed. */
  const TOAST_LINGER_MS = 3000;
  let importLine = $state<string | null>(null);
  let importTimer = 0;
  let picker = $state<HTMLInputElement | null>(null);
  /* Which folder the chooser was opened for; the root when it was the icon. */
  let pickInto: EntryId | null = null;
  const say = (line: string | null): void => {
    if (importTimer) { clearTimeout(importTimer); importTimer = 0; }
    importLine = line;
  };
  const runImport = async (list: FileList | readonly File[], parent: EntryId | null): Promise<void> => {
    openUpTo(parent);
    const done = await importFiles(list, parent, say);
    say(importSummary(done));
    importTimer = window.setTimeout(() => { importTimer = 0; importLine = null; }, TOAST_LINGER_MS);
  };
  /* Where a drop lands: inside the folder it was dropped on, and under Your
     Files when it was dropped on the root itself. */
  const importInto = (r: Row): EntryId | null => (r.kind === 'folder' ? r.entry?.id ?? null : null);
  /* Whether what is being dragged is files from outside the window rather than
     a row of the tree: only the former is an import. */
  const hasFiles = (e: DragEvent): boolean => (e.dataTransfer?.types ?? []).includes('Files');
  const canImport = (r: Row): boolean => r.root === 'notes' || r.kind === 'folder';

  /* Dragging inside the tree moves a row; a note row is draggable into a
     document group as well, which the layout's own action takes care of, so the
     move below only listens for the rows this tree knows. */
  let dragged = $state.raw<EntryId | null>(null);
  let over = $state.raw<string | null>(null);
  const canDrop = (r: Row): boolean =>
    dragged !== null && (r.root === 'notes' || r.kind === 'folder') && r.entry?.id !== dragged;
  const dropInto = (r: Row): void => {
    const id = dragged;
    if (id !== null) moveEntry(id, r.kind === 'root' ? null : r.entry?.id ?? null);
    dragged = null; over = null;
  };

  /* Up and down walk the rows that are showing, right and left open and close,
     Enter takes the row. */
  const step = (delta: 1 | -1): void => {
    const list = rows;
    if (!list.length) return;
    const at = list.findIndex((r) => r.key === explorer.selected);
    const next = at < 0 ? (delta === 1 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, at + delta));
    explorer.selected = list[next].key;
  };
  const onKey = (ev: KeyboardEvent): void => {
    if (explorer.renaming !== null) return;
    const list = rows;
    const at = list.findIndex((r) => r.key === explorer.selected);
    const r = at < 0 ? null : list[at];
    if (ev.key === 'ArrowDown') { ev.preventDefault(); ev.stopPropagation(); step(1); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); ev.stopPropagation(); step(-1); return; }
    if (ev.key === 'ArrowRight') {
      ev.preventDefault(); ev.stopPropagation();
      if (r && r.expandable && !r.open) explorer.toggle(r.key); else step(1);
      return;
    }
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault(); ev.stopPropagation();
      if (r && r.expandable && r.open) { explorer.toggle(r.key); return; }
      if (!r) { step(-1); return; }
      for (let i = at - 1; i >= 0; i--) if (list[i].depth < r.depth) { explorer.selected = list[i].key; return; }
      return;
    }
    if (ev.key === 'Enter' && r) { ev.preventDefault(); ev.stopPropagation(); activate(r); }
  };

  /* On the first showing, the book of the page opens down to the chapter being
     read, so that the tree says where the reader is standing. */
  let seeded = false;
  onMount(() => {
    if (seeded || explorer.tree.expanded.length) { seeded = true; return; }
    seeded = true;
    const m = registry.manifest(focus.book);
    if (!m.id) return;
    explorer.toggle(bookKey(m.id));
    const ch = registry.chapterOf(focus.section);
    if (ch) explorer.toggle(chapterKey(m.id, ch.id));
  });
</script>

<div class="explorer">
  <div class="tree" role="tree" aria-label="Explorer" tabindex="0" onkeydown={onKey}>
    {#each rows as r (r.key)}
      {#if r.kind === 'hint'}
        <div class="row hint" style:padding-left="{6 + r.depth * 13}px">{r.label}</div>
      {:else}
        <div class="row r-{r.kind}" data-key={r.key} data-kind={r.kind}
          class:sel={explorer.selected === r.key} class:active={r.active} class:dim={r.dim} class:drop={over === r.key}
          role="treeitem" tabindex="-1" aria-selected={explorer.selected === r.key} aria-expanded={r.expandable ? r.open : undefined}
          style:padding-left="{6 + r.depth * 13}px"
          onclick={(ev) => activate(r, ev)}
          oncontextmenu={(e) => { if (r.entry) openMenu(e, r.entry); }}
          ondragstart={(e) => { if (r.entry && r.kind !== 'book') { dragged = r.entry.id; e.dataTransfer?.setData('text/plain', r.entry.id); } }}
          ondragend={() => { dragged = null; over = null; }}
          ondragover={(e) => {
            if (hasFiles(e) && canImport(r)) { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; over = r.key; return; }
            if (canDrop(r)) { e.preventDefault(); e.stopPropagation(); over = r.key; }
          }}
          ondragleave={() => { if (over === r.key) over = null; }}
          ondrop={(e) => {
            if (hasFiles(e) && canImport(r)) {
              e.preventDefault(); e.stopPropagation(); over = null;
              const dropped = e.dataTransfer?.files;
              if (dropped?.length) void runImport(dropped, importInto(r));
              return;
            }
            if (canDrop(r)) { e.preventDefault(); e.stopPropagation(); dropInto(r); }
          }}
          draggable={r.kind === 'folder' || r.kind === 'note' || r.kind === 'file' || r.kind === 'drawing'}
          use:noteDrag={r.kind === 'note' && r.entry ? itemKey(noteItem(noteId(r.entry.id)))
            : r.kind === 'file' && r.entry ? itemKey(fileItem(fileId(r.entry.fileId ?? r.entry.id)))
              : r.kind === 'drawing' && r.entry ? itemKey(drawingItem(drawingId(r.entry.drawingId ?? r.entry.id))) : null}>
          {#if r.expandable}
            <button type="button" class="twist" class:open={r.open} tabindex="-1"
              title={r.open ? 'Collapse' : 'Expand'} aria-label={r.open ? 'Collapse' : 'Expand'}
              onclick={(e) => { e.stopPropagation(); explorer.selected = r.key; explorer.toggle(r.key); }}>▾</button>
          {:else}
            <span class="twist gap"></span>
          {/if}
          {#if r.icon}<span class="ico">{@html r.icon}</span>{:else}<span class="ico dot">·</span>{/if}
          {#if r.entry && explorer.renaming === r.entry.id}
            {@const own = r.entry}
            <input class="rename" value={own.name} spellcheck="false" autocomplete="off" aria-label="Name"
              use:takeBox={own}
              onclick={(ev) => ev.stopPropagation()}
              onkeydown={(ev) => renameKey(ev, own)}
              onblur={(ev) => leaveBox((ev.currentTarget as HTMLInputElement).value)} />
          {:else}
            <span class="lbl">{r.label}</span>
          {/if}
          {#if r.updated}<span class="updated" title="Updated since your last visit">Updated</span>{/if}
          {#if r.root === 'notes'}
            <button type="button" class="tool" id="import-files" tabindex="-1" title="Import files (PDF, images, markdown)" aria-label="Import files"
              onclick={(e) => { e.stopPropagation(); pickInto = null; picker?.click(); }}>{@html ICON.importFile}</button>
            <button type="button" class="tool" data-spot="notes" class:spot={ui.spot === 'notes'} tabindex="-1" title="New note" aria-label="New note"
              onclick={(e) => { e.stopPropagation(); newNote(parentForNew()); }}>{@html ICON.notePlus}</button>
            <button type="button" class="tool" data-spot="drawer" class:spot={ui.spot === 'drawer'} tabindex="-1" title="New drawing" aria-label="New drawing"
              onclick={(e) => { e.stopPropagation(); newDrawing(parentForNew()); }}>{@html ICON.drawingPlus}</button>
            <button type="button" class="tool" tabindex="-1" title="New folder" aria-label="New folder"
              onclick={(e) => { e.stopPropagation(); newFolder(parentForNew()); }}>{@html ICON.folderPlus}</button>
          {/if}
          {#if r.entry}
            {@const own = r.entry}
            <button type="button" class="dots" tabindex="-1" title="More" aria-label="More for {r.label}"
              onclick={(e) => openMenu(e, own)}>…</button>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<input class="picker" type="file" multiple bind:this={picker} accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain,image/*"
  onchange={(e) => {
    const chosen = e.currentTarget.files;
    const parent = pickInto; pickInto = null;
    if (chosen?.length) void runImport(chosen, parent);
    e.currentTarget.value = '';
  }} />
<ImportToast line={importLine} />

{#if menu}
  <RowMenu x={menu.x} y={menu.y} items={menuItems} onclose={() => (menu = null)} />
{/if}

<style>
  .explorer{display:flex;flex-direction:column;min-width:0}
  /* the file chooser the import icon opens: never drawn, only clicked */
  .picker{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  /* The two things a reader makes are icons on the Notes root itself. */
  .tool{flex:none;display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:5px;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .tool:hover{background:var(--soft);color:var(--ink)}
  .tool:focus-visible{outline:2px solid var(--accent)}
  .tool :global(svg){width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}

  .tree{display:flex;flex-direction:column;min-width:0;outline:none}
  .tree:focus-visible{outline:2px solid var(--accent);border-radius:4px}
  .row{display:flex;align-items:center;gap:4px;min-width:0;padding-right:4px;line-height:1.9;font-size:0.82rem;color:var(--muted);cursor:pointer;border-radius:4px;user-select:none}
  .row:hover{background:var(--soft)}
  .row.sel{background:var(--soft2)}
  .row.active{color:var(--ink);font-weight:600}
  .row.dim{opacity:.45;cursor:default}
  .row.drop{box-shadow:inset 0 0 0 2px var(--accent)}
  .row.hint{color:var(--muted);opacity:.7;font-size:0.76rem;font-style:italic;cursor:default}
  .row.r-root{color:var(--ink);font-weight:600}
  .row.r-find{color:var(--muted)}
  .row.r-find:hover{color:var(--accent)}
  .row.r-heading .lbl{font-size:0.78rem}
  .twist{flex:none;width:14px;height:14px;border:0;background:transparent;color:var(--muted);font-size:9px;line-height:1;padding:0;cursor:pointer;display:grid;place-items:center;transform:rotate(-90deg);transition:transform .12s}
  .twist.open{transform:none}
  .twist.gap{cursor:default}
  .ico{flex:none;display:grid;place-items:center;color:var(--muted)}
  .ico :global(svg){width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5}
  .ico.dot{width:14px;opacity:.5}
  .lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  a.lbl{color:inherit;text-decoration:none}
  a.lbl:hover{text-decoration:underline}
  .rename{flex:1;min-width:0;border:1px solid var(--accent);border-radius:3px;background:var(--panel);color:var(--ink);font:inherit;font-size:0.82rem;padding:0 4px;outline:none}
  .dots{flex:none;width:18px;height:18px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;padding:0;line-height:1;opacity:0}
  .row:hover .dots,.row.sel .dots,.dots:focus-visible{opacity:1}
  .dots:hover{background:var(--soft2);color:var(--ink)}
  .updated{font-size:.65rem;color:var(--accent);font-weight:600}

  :global(.view-pane) .row{font-size:0.92rem;line-height:2}
  :global(.view-pane) .row.r-heading .lbl{font-size:0.88rem}
  :global(.view-pane) .tool{width:24px;height:24px}
  :global(.view-pane) .tool :global(svg){width:16px;height:16px}
  :global(.view-pane) .ico :global(svg){width:16px;height:16px}
</style>
