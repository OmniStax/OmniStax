<script lang="ts">
  /* The shell: mounts once per page, adopts the static article from the pool,
     and lays out the rail, the sidebar and the document groups from the layout
     store. The page it mounts on may be a section, the front of the book or the
     front of OmniStax; what it carries is one item, and that is what opens.
     Everything that touches document-wide state (theme, colour coding, pinned
     concept highlights, the address bar) is an effect here. */
  import { onMount, mount, tick, untrack } from 'svelte';
  import { initFig, FIG, figFor, registerFigBook } from '../lib/fig/figlib';
  import { registry } from '../lib/sections/registry.svelte';
  import { focus } from '../lib/sections/focus.svelte';
  import { pin } from '../lib/sections/concepts.svelte';
  import { spy } from '../lib/sections/spy.svelte';
  import { folded, hiddenFigs, applyState } from '../lib/sections/fold.svelte';
  import { findEl, jump, activePane, openDoc, bookOfEl } from '../lib/sections/nav.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { focusedGroup, instancesOf, splitRight } from '../lib/layout/model';
  import { settings, zoomPx } from '../lib/settings/store.svelte';
  import { colours } from '../lib/colours/store.svelte';
  import { installCommands, ui, keys } from '../lib/commands/setup.svelte';
  import type { Spot } from '../lib/commands/ui.svelte';
  import { BUILTIN } from '../lib/commands/builtin';
  import { chordKeys, chordOf, type Chord } from '../lib/commands/chord';
  import { reader } from '../lib/voice.svelte';
  import { aboutItem, bookId, bookOfItem, docItem, parseItemKey, sameSection, secKey, sectionId, sectionOfItem, sectionRef, viewKindOf, type BookId, type ItemId, type SecKey, type SectionRef } from '../lib/types/ids';
  import { refOfPath, resolvePath, sectionOfUrl } from '../lib/content/urls';
  import { bookPagesOf, pageLabel } from '../lib/content/roles';
  import { lastPage, rememberPage, setBookWalk } from '../lib/sections/books';
  import type { BootDTO } from '../lib/sections/boot';
  import Rail from './Rail.svelte';
  import Sidebar from './Sidebar.svelte';
  import SplitTree from './SplitTree.svelte';
  import Settings from './Settings.svelte';
  import Hover from './Hover.svelte';
  import Palette from './Palette.svelte';
  import Tooltip from './Tooltip.svelte';
  import Browser from './Browser.svelte';
  import FindTextbook from './explorer/FindTextbook.svelte';
  import SpotCurve from './SpotCurve.svelte';
  import DragToast from './ui/DragToast.svelte';
  import TipToast from './ui/TipToast.svelte';
  import ExerciseList from './exercises/ExerciseList.svelte';
  import HighlightBar from './HighlightBar.svelte';
  import { sheets } from '../lib/sheets/store.svelte';
  import { markFormulas } from '../lib/sheets/mark';
  import { notes } from '../lib/notes/store.svelte';
  import { noteDocs } from '../lib/notes/docs.svelte';
  import { ai } from '../lib/chat/settings.svelte';
  import { chats } from '../lib/chat/store.svelte';
  import { explorer } from '../lib/explorer/store.svelte';
  import { files } from '../lib/files/store.svelte';
  import { drawings } from '../lib/drawer/store.svelte';
  import { fileMarks } from '../lib/files/marks.svelte';
  import { sweepBlobs } from '../lib/files/import';
  import { library } from '../lib/explorer/library.svelte';
  import { practice } from '../lib/practice/store.svelte';
  import { openPractice } from '../lib/practice/open.svelte';
  import { paint, setNoted } from '../lib/notes/paint';
  import { offlineBooks } from '../lib/offline/store.svelte';
  import { registerOfflineWorker } from '../lib/offline/register';

  /* own: the item the page was built for; the 404 page has none, and reads its address instead. */
  type Props = { own?: ItemId; threeUrl?: string; boot: BootDTO };
  let { own, threeUrl, boot: booted }: Props = $props();
  /* The manifest the page was served for, and the concepts and formulas of the
     chapter this page stands in, fetched by the loader before the shell mounts. */
  const boot = untrack(() => booted);
  const { chapterDir, chapterData } = boot;
  const home = boot.manifest;
  /* The page's own item never changes. An offline copy answers every address
     of a book with the book's page, and the 404 page every address at all, so
     the address, not the page, names the section a reader asked for. */
  const carried = untrack(() => own);
  const path = refOfPath(location.pathname);
  const addressedBy = (): SectionRef | null => {
    if (!path) return null;
    if (!carried) return resolvePath(path.book === home.id ? home : null, path);
    const s = path.book === home.id ? sectionOfUrl(home, location.pathname) : null;
    return s ? sectionRef(home.id, s) : null;
  };
  const addressed = addressedBy();
  const carriedRef = carried ? sectionOfItem(carried) : null;
  const page: ItemId = addressed && !(carriedRef && sameSection(carriedRef, addressed)) ? docItem(addressed, 'text') : carried ?? aboutItem();
  let ready = $state(false);
  let narrow = $state(false);

  /* What a saved layout may name: a page of a view the shell still has — the
     singleton or one of the reader's own pages of it — anything of a book,
     whose pane says so when the book no longer has it, and a note the reader
     still keeps. */
  const known = (k: string): boolean => {
    const id = parseItemKey(k);
    if (!id) return false;
    if (id.kind === 'view') return viewKindOf(k) !== null;
    if (id.kind === 'page' || id.kind === 'sheet') return true;
    if (id.kind === 'note') return noteDocs.get(id.note) !== undefined;
    /* A file the reader still keeps; one they have deleted leaves no tab. */
    if (id.kind === 'file') return files.get(id.file) !== undefined;
    /* The same for a drawing and a chat, each read off the list its own store
       mirrors in localStorage, so a saved layout is settled without opening a
       database. The scratch page of an exercise is named by the exercise and
       not by a record, so it stands as long as its section does. */
    if (id.kind === 'drawing') return drawings.row(id.drawing) !== undefined;
    if (id.kind === 'chat') return chats.entry(id.chat) !== null;
    return true;
  };
  const mountExercises = (root: HTMLElement, ref: SectionRef) => {
    root.querySelectorAll<HTMLElement>('.exercises[data-place]').forEach((host) => { if (host.dataset.mounted) return; host.dataset.mounted = '1'; mount(ExerciseList, { target: host, props: { book: ref.book, section: ref.section, place: host.dataset.place ?? 'end' } }); });
  };

  /* highlights: paint a document from the notes that belong to it */
  const paintDoc = (root: HTMLElement) => {
    const [sec, doc] = (root.dataset.doc ?? '').split('/'); if (!sec || !root.dataset.book) return;
    const ref = sectionRef(bookId(root.dataset.book), sectionId(sec));
    const relevant = notes.forSection(ref).filter((n) => n.doc === doc);
    const lost = paint(root, relevant.map((n) => ({ id: n.id, anchor: n.anchor, color: n.color, noted: !!n.text })));
    notes.setUnresolved(ref, lost);
  };

  onMount(() => {
    initFig({ id: home.id, macros: home.macros, symbols: home.symbols, colorKeys: Object.keys(home.types) });
    notes.init();
    noteDocs.init();
    ai.init();
    chats.init();
    files.init();
    fileMarks.init();
    drawings.init();
    explorer.init();
    /* The bytes of a file deleted are kept until now, so that an undo in that
       session had something to come back to; this session is not that one. */
    void sweepBlobs().catch(() => {});
    library.init(home.id, home.title);
    void (async () => { await registerOfflineWorker(); await offlineBooks.init(); await offlineBooks.refreshClientPin(); await offlineBooks.reclaim(); })()
      .catch((error) => { offlineBooks.message = error instanceof Error ? error.message : 'Offline storage could not be initialized.'; });
    practice.init();
    registry.init({ figFor, mounter: mountExercises, decorate: paintDoc, threeUrl });
    registry.onBook((m) => { registerFigBook({ id: m.id, macros: m.macros, symbols: m.symbols, colorKeys: Object.keys(m.types) }); colours.ensureBook(m); });
    registry.home = home.id;
    focus.boot = home.id;
    registry.addBook(home);
    sheets.init(markFormulas);
    colours.init(home);
    if (chapterDir && chapterData) registry.setChapter(home.id, chapterDir, chapterData);
    focus.own = page;
    layoutStore.init(page, known, home.id);
    practice.prune(instancesOf(layoutStore.layout, 'exercises'));
    installCommands();
    registry.adopt(document.getElementById('pool') ?? document);
    if (addressed && page !== carried) void openDoc(addressed, 'text');
    /* A page opened at a span — a search hit in another book links here with the span in
       the hash — lands on it once the document stands in its pane, since the browser's own
       landing came while it still stood in the pool; a hash that changes under the shell
       lands the same way. */
    const landAt = (book: string, hash: string) => { const at = decodeURIComponent(hash.slice(1)); if (at) requestAnimationFrame(() => jump(findEl(bookId(book), at))); };
    const onHash = () => landAt(focus.book, location.hash);
    onHash(); window.addEventListener('hashchange', onHash);
    const mq = matchMedia('(max-width: 900px)'); narrow = mq.matches; const onMq = () => { narrow = mq.matches; layoutStore.overlay = null; }; mq.addEventListener('change', onMq);
    const onResize = () => FIG.redrawAll(); window.addEventListener('resize', onResize);
    /* A drawing is written a short pause after the last stroke, so a page left
       within that pause would owe the database the stroke that finished it.
       Going away is the moment to make every pending write good. */
    const onLeave = () => { if (document.visibilityState === 'hidden') drawings.flush(); };
    document.addEventListener('visibilitychange', onLeave);
    const onHide = () => drawings.flush(); window.addEventListener('pagehide', onHide);
    /* Where the reader is typing, undo and redo are not the shell's: a field has
       the browser's own history and the note editor has CodeMirror's, and either
       is what Ctrl+Z means there. Every other chord behaves as it does anywhere. */
    const typingIn = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      return el?.closest?.('input, textarea, [contenteditable], .cm-editor') != null;
    };
    const ownUndo = (c: Chord | null): boolean => {
      const id = c ? keys.commandFor(c) : undefined;
      return id === BUILTIN.undo || id === BUILTIN.redo;
    };
    /* Ctrl+= , Ctrl+− and Ctrl+0 are the browser's zoom chords, and the shell
       takes them to size its own text instead — a root font size, which leaves
       the window the width it had. Turned off, the press is never dispatched
       and the browser zooms the page with it as it always did; the three
       commands stay in the palette either way. */
    const ZOOM = [BUILTIN.zoomIn, BUILTIN.zoomOut, BUILTIN.zoomReset] as const;
    const browserZoom = (c: Chord | null): boolean => {
      const id = c ? keys.commandFor(c) : undefined;
      return !settings.zoomKeys && id !== undefined && (ZOOM as readonly string[]).includes(id);
    };
    /* Escape closes whatever is open; anything else may be a chord. Dialogs stop their own keydowns.
       Ctrl+P and Ctrl+S are the shell's whether anything is bound to them or not: nothing here
       prints a page or saves one, so the browser is not given the chance to offer either. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { ui.closeAll(); if (pin.pinned) pin.clear(); return; }
      const c = chordOf(e);
      if (!keys.pending && ownUndo(c) && typingIn(e.target)) return;
      if (browserZoom(c)) return;
      if (keys.dispatch(e)) return;
      if (c === 'Ctrl+P' || c === 'Ctrl+S') e.preventDefault();
    };
    /* A click or a focus outside every view lets go of "this view", so the scope commands stop aiming at it. */
    const clearView = (e: Event) => { const el = e.target as HTMLElement | null; if (!el?.closest?.('.view')) focus.view = null; };
    /* The group an element was clicked in, or the focused one when it stands outside every pane. */
    const groupOf = (el: HTMLElement): number => { const pane = el.closest<HTMLElement>('.pane'); return pane ? +(pane.dataset.group ?? layoutStore.layout.focus) : layoutStore.layout.focus; };
    /* A book's last page, else its first built page, opens as a tab beside what is open. */
    setBookWalk(async (book) => {
      const m = await registry.ensureBook(bookId(book));
      if (!m) return false;
      const last = lastPage(book);
      const first = bookPagesOf(m).find((p) => p.built);
      const sec = (last ? sectionOfUrl(m, last) : null) ?? (first ? sectionId(first.id) : null);
      if (!sec) return false;
      await openDoc(sectionRef(m.id, sec), 'text');
      return true;
    });
    /* A page of any book is written as a plain link, so that it can still be
       opened in a window of its own; a left click on one opens it as a tab of
       the group it was clicked in instead of loading the page. The listen is on
       the way down, since the row a link stands in may keep the click to
       itself. A page no book here has falls back to the link, which is what it
       always did. */
    const onLink = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.origin !== location.origin) return;
      const at = refOfPath(link.pathname);
      if (!at) return;
      const { href, pathname, hash } = link; const group = groupOf(link);
      e.preventDefault();
      void registry.ensureBook(at.book).then(async (m) => {
        const sec = m ? sectionOfUrl(m, pathname) : null;
        if (!sec) { location.assign(href); return; }
        await openDoc(sectionRef(at.book, sec), 'text', group);
        landAt(at.book, hash);
      });
    };
    const onClick = (e: MouseEvent) => {
      clearView(e);
      ui.closeAll();
      if ((e.target as HTMLElement).closest('[data-find-textbook]')) { ui.openFindTextbook(); return; }
      const sb = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-split-key]');
      if (sb?.dataset.splitKey) { const gi = groupOf(sb); layoutStore.apply((x) => splitRight(x, gi, sb.dataset.splitKey)); return; }
      /* "Practice this section" at the end of a section: a practice view opens as a
         tab of the group the section is reading in, with that one section picked. */
      const pb = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-practise-section]');
      const pbook = pb && bookOfEl(pb);
      if (pb?.dataset.practiseSection && pbook) { openPractice([{ book: pbook, section: sectionId(pb.dataset.practiseSection) }], groupOf(pb)); return; }
      /* A link a pane has already answered — a wiki link in a note or a text
         box, which opens a note, a file or a section of its own accord — is
         not the shell's to follow as well: it says so by preventing the
         default, and its own `href="#"` would otherwise read as this page. */
      if (e.defaultPrevented) return;
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href')!.slice(1), ab = bookOfEl(a);
      const t = ab ? findEl(ab, id) : document.getElementById(id); if (!t) return; e.preventDefault(); jump(t);
    };
    /* A feature the about page names lights where it lives: the new note and
       new drawing buttons when the explorer shows them, the explorer's own
       button on the rail when it does not. */
    const onOver = (e: MouseEvent) => {
      const from = (e.target as HTMLElement).closest<HTMLElement>('[data-feature]');
      const f = from?.dataset.feature as Spot | undefined;
      const shown = (s: Spot) => [...document.querySelectorAll<HTMLElement>(`[data-spot="${s}"]`)].some((el) => el.getClientRects().length > 0);
      ui.spot = !f ? null : (f === 'notes' || f === 'drawer') && !shown(f) ? 'explorer' : f;
      ui.spotFrom = from;
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('keydown', onKey); document.addEventListener('click', onLink, true); document.addEventListener('click', onClick); document.addEventListener('focusin', clearView);
    document.fonts?.ready.then(() => FIG.redrawAll());
    ready = true;
    return () => { document.removeEventListener('mouseover', onOver); mq.removeEventListener('change', onMq); window.removeEventListener('resize', onResize); window.removeEventListener('hashchange', onHash); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onLink, true); document.removeEventListener('click', onClick); document.removeEventListener('focusin', clearView); document.removeEventListener('visibilitychange', onLeave); window.removeEventListener('pagehide', onHide); reader.stop(); };
  });

  /* settings → document */
  $effect(() => { document.documentElement.classList.toggle('cc', settings.colorCoding); FIG.setCC(settings.colorCoding); FIG.redrawAll(); });
  $effect(() => { if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', settings.theme); FIG.redrawAll(); });
  $effect(() => { FIG.setPaused(!settings.animations); document.documentElement.classList.toggle('anim-off', !settings.animations); });
  $effect(() => { document.documentElement.classList.toggle('no-underlines', !settings.underlines); });
  /* The app's own text size: one root font size, which every rem in the book and
     in the chrome is measured against, so the reading column, the rails and the
     views grow together. Figures are drawn in their own logical space and are
     measured out of the page, so they are marked for a redraw at the new size. */
  $effect(() => { document.documentElement.style.fontSize = `${zoomPx(settings.zoom)}px`; FIG.redrawAll(); });
  $effect(() => { if (!settings.voice) reader.stop(); });

  /* folded headings and hidden figures → classes on every copy, then the spy re-reads the shorter page */
  $effect(() => { folded.ids; hiddenFigs.ids; registry.sections; applyState(document); spy.read(activePane(layoutStore.layout.focus)); });

  /* notes → marks in every copy of every document */
  $effect(() => { notes.paintVersion; tick().then(() => document.querySelectorAll<HTMLElement>('article[data-doc]').forEach(paintDoc)); });
  $effect(() => { notes.list.forEach((n) => setNoted(document, n.id, !!n.text)); });

  /* layout → practice: what a practice tab stands on belongs to that tab, so a
     page whose tab the layout no longer holds is dropped as the layout settles. */
  $effect(() => { practice.prune(instancesOf(layoutStore.layout, 'exercises')); });


  /* The page the focused tab is showing, whatever its book: a section, or the
     front of a book. A tab of no book leaves the address alone. */
  type Addressed = { readonly key: string; readonly book: BookId; readonly url: string; readonly label: string };
  const addressOf = (id: ItemId | null): Addressed | null => {
    const ref = id ? sectionOfItem(id) : null;
    if (ref) { const e = registry.entry(ref); return e ? { key: secKey(ref), book: ref.book, url: e.url, label: pageLabel(e) } : null; }
    const book = id?.kind === 'page' ? bookOfItem(id) : null;
    return book && registry.hasBook(book) ? { key: book, book, url: `/${book}/`, label: registry.manifest(book).title } : null;
  };
  const reading = $derived.by(() => { const a = focusedGroup(layoutStore.layout).active; return addressOf(a ? parseItemKey(a) : null); });
  /* layout → address bar, title, released copies, spy, redraw */
  let urlKey: SecKey | string | null = null;
  $effect(() => {
    const l = layoutStore.layout; const at = reading;
    tick().then(() => {
      registry.release(new Set(Array.from(document.querySelectorAll<HTMLElement>('.pane article[data-doc], .pane .fig-root'))));
      FIG.redrawAll(); spy.read(activePane(l.focus));
      if (!at || at.key === urlKey) return; urlKey = at.key;
      try { history.replaceState(null, '', at.url); } catch { /* file:// */ }
      const title = registry.manifest(at.book).title;
      if (at.url !== `/${at.book}/`) rememberPage(at.book, at.url);
      document.title = at.label === title ? title : `${at.label} · ${title}`;
    });
  });
  /* The "+" on a tab strip: the browser, opening whatever is picked into that group. */
  const onPick = (group: number) => { ui.openBrowser({ group }); };
</script>

{#if ready}
  <div class="shell" role="application" aria-label="OmniStax" onpointerdown={() => { if (layoutStore.overlay && !narrow) layoutStore.overlay = null; }}>
    <Rail {narrow} />
    <Sidebar {narrow} />
    <main class="docs" onpointerdown={() => { if (layoutStore.overlay) layoutStore.overlay = null; }}>
      <SplitTree node={layoutStore.layout.tree} {onPick} />
    </main>
  </div>
  {#if keys.pending}
    <div class="chord-hint" role="status">{#each chordKeys(keys.pending) as k, i}{i ? ' ' : ''}<kbd>{k}</kbd>{/each}{' …'}</div>
  {/if}
  <Settings />
  <Hover />
  <Tooltip />
  <HighlightBar />
  <Palette />
  <Browser manifest={registry.manifest(focus.book)} />
  <FindTextbook />
  <SpotCurve />
  <DragToast />
  <TipToast />
{/if}

<style>
  /* What the shell is waiting for: the first press of a sequence, until the second comes. */
  /* Block, with the keys inline inside it, so that the hint reads as one line of
     words — "Ctrl K …" — to anything that takes the shell at its text. */
  .chord-hint{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:120;display:block;white-space:nowrap;padding:5px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--muted);font-family:var(--sans);font-size:0.78rem;line-height:1.5;box-shadow:0 2px 10px rgb(0 0 0 / 0.16)}
  .chord-hint kbd{display:inline-block;font:inherit;border:1px solid var(--rule);border-radius:3px;padding:0 4px;color:var(--ink)}
  .shell{height:100vh;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:44px auto minmax(0,1fr);grid-template-areas:"rl sl docs"}
  .docs{grid-area:docs;display:flex;min-width:0;min-height:0;background:var(--bg);position:relative}
  @media (max-width:900px){ .shell{grid-template-columns:44px 0 minmax(0,1fr)} .docs{flex-direction:column} }
</style>
