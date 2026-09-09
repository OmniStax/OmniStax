<script lang="ts">
  /* The explorer: everything the reader has, drawn as one tree under a row
     called User — the folders they have made, the notes they have written and
     the textbooks they have added. A textbook opens into its chapters and its
     chapters into their sections; a section is a file, so clicking it opens the
     text, and it opens further into the subconcepts of that text and the
     problems set at its end. The rows of the reader's own things can be made,
     named, moved and deleted here; the rows of a book are read only, since the
     book is the book.

     The tree the rows are drawn from is the explorer store, which keeps the
     entries and which rows are open; the chapters and sections come from the
     manifest instead, since they are the book's and not the reader's. A book
     that is not the one this page belongs to has its manifest fetched, and its
     sections are links out to it, because the shell reads one book at a time. */
  import { onMount } from 'svelte';
  import { explorer } from '../../lib/explorer/store.svelte';
  import { bookKey, chapterKey, entryId, sectionKey, type Entry, type EntryId } from '../../lib/explorer/model';
  import { createFolder, createNote, deleteEntry, moveEntry, renameEntry } from '../../lib/explorer/edits';
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { spy } from '../../lib/sections/spy.svelte';
  import { go, openDoc, openItem } from '../../lib/sections/nav.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { focusedGroup } from '../../lib/layout/model';
  import { draggable } from '../../lib/layout/drag.svelte';
  import { ui } from '../../lib/commands/ui.svelte';
  import { ICON } from '../../lib/icons';
  import { docItem, itemKey, noteId, noteItem, sectionId, type SectionId } from '../../lib/types/ids';
  import type { BookManifest, SectionEntry } from '../../lib/content/schema';
  import RowMenu from '../explorer/RowMenu.svelte';

  type RowKind = 'root' | 'folder' | 'note' | 'book' | 'chapter' | 'section' | 'heading' | 'exercises' | 'hint';
  type Row = {
    readonly key: string;            /* what selection and the expanded set call this row */
    readonly kind: RowKind;
    readonly depth: number;
    readonly label: string;
    readonly icon: string;
    readonly entry?: Entry;          /* the reader's own rows carry theirs */
    readonly section?: SectionId;
    readonly href?: string;          /* a section of another book is a link out to it */
    readonly domId?: string;         /* a heading to jump to */
    readonly expandable: boolean;
    readonly open: boolean;
    readonly dim: boolean;           /* not built, or nothing to say yet */
    readonly active: boolean;        /* what the focused group is showing */
  };

  /* The manifests of the books that are not this page's, fetched once each. */
  let others = $state.raw<Readonly<Record<string, BookManifest>>>({});
  const asked = new Set<string>();
  const manifestOf = (bookId: string): BookManifest | null => {
    if (bookId === registry.manifest.id) return registry.manifest;
    const have = others[bookId];
    if (have) return have;
    if (!asked.has(bookId)) {
      asked.add(bookId);
      fetch(`/${bookId}/book.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((m: BookManifest | null) => { if (m) others = { ...others, [bookId]: m }; })
        .catch(() => { /* the row says it could not be read */ });
    }
    return null;
  };

  const activeKey = $derived(focusedGroup(layoutStore.layout).active);
  /* The headings of a loaded section: its spans, each named by the first
     heading it carries, with the maths stripped out of the name. Null while the
     section has not been opened, which is a different thing from having none. */
  const headingsOf = (sec: SectionId): { id: string; label: string }[] | null => {
    const st = registry.sections[sec];
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
    const section = (bookId: string, s: SectionEntry, depth: number): void => {
      const own = bookId === registry.manifest.id;
      const key = sectionKey(bookId, s.id);
      const open = explorer.expanded(key);
      const sec = sectionId(s.id);
      out.push({
        key, kind: 'section', depth, label: `${s.id} ${s.title}`, icon: ICON.text, section: sec,
        href: own ? undefined : s.url, expandable: own && s.built, open,
        dim: !s.built, active: own && s.built && focus.section === sec,
      });
      if (!own || !s.built || !open) return;
      const heads = headingsOf(sec);
      if (heads === null) hint(`${key}?`, depth + 1, 'Open the section to see its headings');
      else heads.forEach((h) => out.push({
        key: `${key}#${h.id}`, kind: 'heading', depth: depth + 1, label: h.label, icon: '', domId: h.id,
        expandable: false, open: false, dim: false, active: spy.current.section === h.id,
      }));
      if (s.exercises.length) out.push({
        key: `${key}!ex`, kind: 'exercises', depth: depth + 1, label: 'Problems & Exercises', icon: ICON.exercises, section: sec,
        expandable: false, open: false, dim: false, active: activeKey === itemKey(docItem(sec, 'exercises')),
      });
    };
    const book = (bookId: string, depth: number): void => {
      const m = manifestOf(bookId);
      if (!m) { hint(`${bookKey(bookId)}?`, depth, 'Reading the book…'); return; }
      m.chapters.forEach((c) => {
        const key = chapterKey(bookId, c.id);
        const open = explorer.expanded(key);
        out.push({ key, kind: 'chapter', depth, label: `${c.id} ${c.title}`, icon: ICON.folder, expandable: true, open, dim: false, active: false });
        if (open) c.sections.forEach((s) => section(bookId, s, depth + 1));
      });
    };
    const walk = (parent: EntryId | null, depth: number): void => {
      explorer.children(parent).forEach((e) => {
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
        const bookId = e.bookId ?? '';
        const key = bookKey(bookId);
        const open = explorer.expanded(key);
        out.push({ key, kind: 'book', depth, label: e.name, icon: ICON.book, entry: e, expandable: true, open, dim: false, active: false });
        if (open) book(bookId, depth + 1);
      });
    };
    out.push({ key: 'root', kind: 'root', depth: 0, label: 'User', icon: ICON.folder, expandable: false, open: true, dim: false, active: false });
    walk(null, 1);
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
  const remove = (e: Entry): void => {
    const kids = explorer.children(e.id);
    if (kids.length && !confirm(`Delete “${e.name}” and the ${kids.length === 1 ? 'row' : 'rows'} inside it?`)) return;
    deleteEntry(e);
  };

  /* Renaming happens in place: the label gives way to a box, Enter and losing
     the focus keep what was typed, Escape leaves the name as it was. */
  let abandoned = false;
  const commit = (e: Entry, name: string): void => {
    if (explorer.renaming !== e.id) return;
    explorer.renaming = null;
    const next = name.trim();
    if (!next || next === e.name) return;
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
  const activate = (r: Row): void => {
    explorer.selected = r.key;
    if (r.kind === 'folder' || r.kind === 'book' || r.kind === 'chapter') { explorer.toggle(r.key); return; }
    if (r.kind === 'note' && r.entry) { void openItem(itemKey(noteItem(noteId(r.entry.id)))); return; }
    if (r.kind === 'section' && r.section && !r.dim && !r.href) { void openDoc(r.section, 'text'); return; }
    if (r.kind === 'exercises' && r.section) { void openDoc(r.section, 'exercises'); return; }
    if (r.kind === 'heading' && r.domId) go(r.domId);
  };

  /* The row menu, hanging where the pointer or the button left it. */
  type Menu = { readonly entry: Entry; readonly x: number; readonly y: number };
  let menu = $state.raw<Menu | null>(null);
  const menuItems = $derived.by(() => {
    const m = menu;
    if (!m) return [];
    const e = m.entry;
    const inside = e.kind === 'folder' ? e.id : e.parent;
    return [
      { label: 'New note here', run: () => newNote(inside) },
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

  /* Dragging inside the tree moves a row; a note row is draggable into a
     document group as well, which the layout's own action takes care of, so the
     move below only listens for the rows this tree knows. */
  let dragged = $state.raw<EntryId | null>(null);
  let over = $state.raw<string | null>(null);
  const canDrop = (r: Row): boolean => dragged !== null && (r.kind === 'root' || r.kind === 'folder') && r.entry?.id !== dragged;
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
    const m = registry.manifest;
    if (!m.id) return;
    explorer.toggle(bookKey(m.id));
    const ch = registry.chapterOf(focus.section);
    if (ch) explorer.toggle(chapterKey(m.id, ch.id));
  });
</script>

<div class="explorer">
  <div class="tools">
    <button type="button" class="tool" title="New note" onclick={() => newNote(parentForNew())}>
      <span class="ico">{@html ICON.note}</span><span class="tlabel">New note</span>
    </button>
    <button type="button" class="tool" title="New folder" onclick={() => newFolder(parentForNew())}>
      <span class="ico">{@html ICON.folder}</span><span class="tlabel">New folder</span>
    </button>
    <button type="button" class="tool" title="Find a textbook" onclick={(e) => { e.stopPropagation(); ui.openFindTextbook(); }}>
      <span class="ico">{@html ICON.search}</span><span class="tlabel">Find a textbook</span>
    </button>
  </div>

  <div class="tree" role="tree" aria-label="Your notes and books" tabindex="0" onkeydown={onKey}>
    {#each rows as r (r.key)}
      {#if r.kind === 'hint'}
        <div class="row hint" style:padding-left="{6 + r.depth * 13}px">{r.label}</div>
      {:else}
        <div class="row r-{r.kind}" data-key={r.key} data-kind={r.kind}
          class:sel={explorer.selected === r.key} class:active={r.active} class:dim={r.dim} class:drop={over === r.key}
          role="treeitem" tabindex="-1" aria-selected={explorer.selected === r.key} aria-expanded={r.expandable ? r.open : undefined}
          style:padding-left="{6 + r.depth * 13}px"
          onclick={() => activate(r)}
          oncontextmenu={(e) => { if (r.entry && r.kind !== 'book') openMenu(e, r.entry); }}
          ondragstart={(e) => { if (r.entry && r.kind !== 'book') { dragged = r.entry.id; e.dataTransfer?.setData('text/plain', r.entry.id); } }}
          ondragend={() => { dragged = null; over = null; }}
          ondragover={(e) => { if (canDrop(r)) { e.preventDefault(); e.stopPropagation(); over = r.key; } }}
          ondragleave={() => { if (over === r.key) over = null; }}
          ondrop={(e) => { if (canDrop(r)) { e.preventDefault(); e.stopPropagation(); dropInto(r); } }}
          draggable={r.kind === 'folder' || r.kind === 'note'}
          use:noteDrag={r.kind === 'note' && r.entry ? itemKey(noteItem(noteId(r.entry.id))) : null}>
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
          {:else if r.href}
            <a class="lbl" href={r.href} onclick={(e) => e.stopPropagation()}>{r.label}</a>
          {:else}
            <span class="lbl">{r.label}</span>
          {/if}
          {#if r.entry && r.kind !== 'book'}
            {@const own = r.entry}
            <button type="button" class="dots" tabindex="-1" title="More" aria-label="More for {r.label}"
              onclick={(e) => openMenu(e, own)}>…</button>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

{#if menu}
  <RowMenu x={menu.x} y={menu.y} items={menuItems} onclose={() => (menu = null)} />
{/if}

<style>
  .explorer{display:flex;flex-direction:column;min-width:0}
  .tools{display:flex;flex-wrap:wrap;gap:4px;padding:0 0 6px}
  .tool{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:5px;background:transparent;color:var(--muted);font:inherit;font-size:0.74rem;padding:3px 6px;cursor:pointer}
  .tool:hover{background:var(--soft);color:var(--ink)}
  .tool:focus-visible{outline:2px solid var(--accent)}
  .tool .ico :global(svg){width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6}
  .tool .ico{display:grid;place-items:center}

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

  :global(.view-pane) .row{font-size:0.92rem;line-height:2}
  :global(.view-pane) .row.r-heading .lbl{font-size:0.88rem}
  :global(.view-pane) .tool{font-size:0.82rem}
  :global(.view-pane) .ico :global(svg){width:16px;height:16px}
</style>
