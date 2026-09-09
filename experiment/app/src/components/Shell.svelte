<script lang="ts">
  /* The shell: mounts once per page, adopts the static article from the pool,
     and lays out the rail, the sidebar and the document groups from the layout
     store. The page it mounts on may be a section, the front of the book or the
     front of OmniStax; what it carries is one item, and that is what opens.
     Everything that touches document-wide state (theme, colour coding, pinned
     concept highlights, the address bar) is an effect here. */
  import { onMount, mount, tick, untrack } from 'svelte';
  import { initFig, FIG } from '../lib/fig/figlib';
  import { registry } from '../lib/sections/registry.svelte';
  import { focus } from '../lib/sections/focus.svelte';
  import { pin } from '../lib/sections/concepts.svelte';
  import { spy } from '../lib/sections/spy.svelte';
  import { folded, hiddenFigs, applyState } from '../lib/sections/fold.svelte';
  import { findEl, jump, activePane, openDoc } from '../lib/sections/nav.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { focusedGroup, splitRight } from '../lib/layout/model';
  import { settings } from '../lib/settings/store.svelte';
  import { installCommands, ui, keys } from '../lib/commands/setup.svelte';
  import { BUILTIN } from '../lib/commands/builtin';
  import { chordKeys, chordOf, type Chord } from '../lib/commands/chord';
  import { reader } from '../lib/voice.svelte';
  import { parseItemKey, sectionOfItem, viewKindOf, type ItemId, type SectionId } from '../lib/types/ids';
  import { sectionOfUrl } from '../lib/content/urls';
  import type { BookManifest, ConceptsDTO, FormulasDTO, SectionMetaDTO, ExerciseDTO } from '../lib/content/schema';
  import Rail from './Rail.svelte';
  import Sidebar from './Sidebar.svelte';
  import SplitTree from './SplitTree.svelte';
  import Settings from './Settings.svelte';
  import Hover from './Hover.svelte';
  import Palette from './Palette.svelte';
  import Tooltip from './Tooltip.svelte';
  import Browser from './Browser.svelte';
  import FindTextbook from './explorer/FindTextbook.svelte';
  import ExerciseList from './exercises/ExerciseList.svelte';
  import HighlightBar from './HighlightBar.svelte';
  import { notes } from '../lib/notes/store.svelte';
  import { noteDocs } from '../lib/notes/docs.svelte';
  import { explorer } from '../lib/explorer/store.svelte';
  import { library } from '../lib/explorer/library.svelte';
  import { paint, setNoted } from '../lib/notes/paint';

  type Props = { manifest: BookManifest; own: ItemId; chapterDir?: string; chapterData?: { concepts: ConceptsDTO; formulas: FormulasDTO }; section?: SectionMetaDTO; exercises?: readonly ExerciseDTO[]; threeUrl?: string };
  let { manifest, own, chapterDir, chapterData }: Props = $props();
  const page = untrack(() => own);   /* the page's own item never changes */
  let ready = $state(false);
  let narrow = $state(false);

  /* What a saved layout may name: a page of a view the shell still has — the
     singleton or one of the reader's own pages of it — a document, figure or
     exercise of a section that is built, either standing page, and a note the
     reader still keeps. */
  const known = (k: string): boolean => {
    const id = parseItemKey(k);
    if (!id) return false;
    if (id.kind === 'view') return viewKindOf(k) !== null;
    if (id.kind === 'page') return true;
    if (id.kind === 'note') return noteDocs.get(id.note) !== undefined;
    return registry.isBuilt(id.section);
  };
  const mountExercises = (root: HTMLElement, sec: SectionId) => {
    root.querySelectorAll<HTMLElement>('.exercises[data-place]').forEach((host) => { if (host.dataset.mounted) return; host.dataset.mounted = '1'; mount(ExerciseList, { target: host, props: { section: sec, place: host.dataset.place ?? 'end' } }); });
  };

  /* highlights: paint a document from the notes that belong to it */
  const paintDoc = (root: HTMLElement) => {
    const [sec, doc] = (root.dataset.doc ?? '').split('/'); if (!sec) return;
    paint(root, notes.list.filter((n) => n.section === sec && n.doc === doc).map((n) => ({ id: n.id, anchor: n.anchor, color: n.color, noted: !!n.text })));
  };

  onMount(() => {
    const fig = initFig({ macros: manifest.macros, symbols: manifest.symbols, colorKeys: Object.keys(manifest.types), chapterKeys: Object.entries(manifest.types).filter(([, t]) => !t.light).map(([k]) => k) });
    notes.init(manifest.id);
    noteDocs.init();
    explorer.init();
    library.init(manifest.id, manifest.title);
    registry.init(manifest, fig, mountExercises, paintDoc);
    if (chapterDir && chapterData) registry.setChapter(chapterDir, chapterData);
    focus.own = page;
    layoutStore.init(page, known);
    installCommands();
    registry.adopt(document.getElementById('pool') ?? document);
    const mq = matchMedia('(max-width: 900px)'); narrow = mq.matches; const onMq = () => { narrow = mq.matches; layoutStore.overlay = null; }; mq.addEventListener('change', onMq);
    const onResize = () => FIG.redrawAll(); window.addEventListener('resize', onResize);
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
    /* Escape closes whatever is open; anything else may be a chord. Dialogs stop their own keydowns.
       Ctrl+P and Ctrl+S are the shell's whether anything is bound to them or not: nothing here
       prints a page or saves one, so the browser is not given the chance to offer either. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { ui.closeAll(); if (pin.pinned) pin.clear(); return; }
      const c = chordOf(e);
      if (!keys.pending && ownUndo(c) && typingIn(e.target)) return;
      if (keys.dispatch(e)) return;
      if (c === 'Ctrl+P' || c === 'Ctrl+S') e.preventDefault();
    };
    /* A click or a focus outside every view lets go of "this view", so the scope commands stop aiming at it. */
    const clearView = (e: Event) => { const el = e.target as HTMLElement | null; if (!el?.closest?.('.view')) focus.view = null; };
    const onClick = (e: MouseEvent) => {
      clearView(e);
      ui.closeAll();
      const sb = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-split-key]');
      if (sb?.dataset.splitKey) { const pane = sb.closest<HTMLElement>('.pane'); const gi = pane ? +(pane.dataset.group ?? layoutStore.layout.focus) : layoutStore.layout.focus; layoutStore.apply((x) => splitRight(x, gi, sb.dataset.splitKey)); return; }
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      /* A link inside a pane that names a section of this book opens as a tab
         rather than as a page of its own; anything else — another host, the
         front of the book, a section this build has not made — is left alone. */
      if (link?.closest('.pane') && link.origin === location.origin && !link.hash && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const sec = sectionOfUrl(manifest, link.pathname);
        if (sec) { e.preventDefault(); void openDoc(sec, 'text'); return; }
      }
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return;
      const t = findEl(a.getAttribute('href')!.slice(1)); if (!t) return; e.preventDefault(); jump(t);
    };
    document.addEventListener('keydown', onKey); document.addEventListener('click', onClick); document.addEventListener('focusin', clearView);
    document.fonts?.ready.then(() => FIG.redrawAll());
    ready = true;
    return () => { mq.removeEventListener('change', onMq); window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); document.removeEventListener('focusin', clearView); reader.stop(); };
  });

  /* settings → document */
  $effect(() => { document.documentElement.classList.toggle('cc', settings.colorCoding); FIG.setCC(settings.colorCoding); FIG.redrawAll(); });
  $effect(() => { if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', settings.theme); FIG.redrawAll(); });
  $effect(() => { FIG.setPaused(!settings.animations); document.documentElement.classList.toggle('anim-off', !settings.animations); });
  $effect(() => { if (!settings.voice) reader.stop(); });

  /* folded headings and hidden figures → classes on every copy, then the spy re-reads the shorter page */
  $effect(() => { folded.ids; hiddenFigs.ids; registry.sections; applyState(document); spy.read(activePane(layoutStore.layout.focus)); });

  /* notes → marks in every copy of every document */
  $effect(() => { notes.paintVersion; tick().then(() => document.querySelectorAll<HTMLElement>('article[data-doc]').forEach(paintDoc)); });
  $effect(() => { notes.list.forEach((n) => setNoted(document, n.id, !!n.text)); });

  /* The section the focused tab is showing, if it is showing one at all: a
     standing page and a note belong to no section and leave the address alone. */
  const reading = $derived.by(() => { const a = focusedGroup(layoutStore.layout).active; const id = a ? parseItemKey(a) : null; return id ? sectionOfItem(id) : null; });
  /* layout → address bar, title, released copies, spy, redraw */
  let urlSec: SectionId | null = null;
  $effect(() => {
    const l = layoutStore.layout; const sec = reading;
    tick().then(() => {
      registry.release(new Set(Array.from(document.querySelectorAll<HTMLElement>('.pane article[data-doc], .pane .fig-root'))));
      FIG.redrawAll(); spy.read(activePane(l.focus));
      if (!sec || sec === urlSec) return; const e = registry.entry(sec); if (!e) return; urlSec = sec;
      try { history.replaceState(null, '', e.url); } catch { /* file:// */ }
      document.title = `${sec} ${e.title} · ${manifest.title}`;
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
  <Browser {manifest} />
  <FindTextbook />
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
