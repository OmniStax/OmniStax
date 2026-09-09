<script lang="ts">
  /* The shell: mounts once per page, adopts the static article from the pool,
     and lays out rails, sidebars and document groups from the layout store.
     Everything that touches document-wide state (theme, colour coding, pinned
     concept highlights, the address bar) is an effect here. */
  import { onMount, mount, tick, untrack } from 'svelte';
  import { initFig, FIG } from '../lib/fig/figlib';
  import { registry } from '../lib/sections/registry.svelte';
  import { focus } from '../lib/sections/focus.svelte';
  import { pin } from '../lib/sections/concepts.svelte';
  import { spy } from '../lib/sections/spy.svelte';
  import { folded, hiddenFigs, applyState } from '../lib/sections/fold.svelte';
  import { findEl, jump, activePane } from '../lib/sections/nav.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { VIEW_KEYS, splitRight } from '../lib/layout/model';
  import { settings } from '../lib/settings/store.svelte';
  import { installCommands, ui, keys } from '../lib/commands/setup.svelte';
  import { reader } from '../lib/voice.svelte';
  import { parseItemKey, sectionId, itemKey, docItem, type SectionId } from '../lib/types/ids';
  import type { BookManifest, ConceptsDTO, FormulasDTO, SectionMetaDTO, ExerciseDTO } from '../lib/content/schema';
  import Rail from './Rail.svelte';
  import Sidebar from './Sidebar.svelte';
  import SplitTree from './SplitTree.svelte';
  import Settings from './Settings.svelte';
  import Hover from './Hover.svelte';
  import Palette from './Palette.svelte';
  import Browser from './Browser.svelte';
  import ExerciseList from './exercises/ExerciseList.svelte';
  import HighlightBar from './HighlightBar.svelte';
  import { notes } from '../lib/notes/store.svelte';
  import { paint, setNoted } from '../lib/notes/paint';

  type Props = { manifest: BookManifest; chapterDir: string; chapterData: { concepts: ConceptsDTO; formulas: FormulasDTO }; section: SectionMetaDTO; exercises: readonly ExerciseDTO[]; threeUrl: string };
  let { manifest, chapterDir, chapterData, section }: Props = $props();
  const page = sectionId(untrack(() => section.id));   /* the page's own section never changes */
  let ready = $state(false);
  let narrow = $state(false);

  const known = (k: string): boolean => { const id = parseItemKey(k); return !!id && (id.kind === 'view' ? VIEW_KEYS.includes(k) : registry.isBuilt(id.section)); };
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
    registry.init(manifest, fig, mountExercises, paintDoc);
    registry.setChapter(chapterDir, chapterData);
    focus.page = page;
    layoutStore.init(page, known);
    installCommands();
    registry.adopt(document.getElementById('pool') ?? document);
    const mq = matchMedia('(max-width: 900px)'); narrow = mq.matches; const onMq = () => { narrow = mq.matches; layoutStore.overlay = null; }; mq.addEventListener('change', onMq);
    const onResize = () => FIG.redrawAll(); window.addEventListener('resize', onResize);
    /* Escape closes whatever is open; anything else may be a chord. Dialogs stop their own keydowns. */
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { ui.closeAll(); if (pin.pinned) pin.clear(); return; } keys.dispatch(e); };
    /* A click or a focus outside every view lets go of "this view", so the scope commands stop aiming at it. */
    const clearView = (e: Event) => { const el = e.target as HTMLElement | null; if (!el?.closest?.('.view')) focus.view = null; };
    const onClick = (e: MouseEvent) => {
      clearView(e);
      ui.closeAll();
      const sb = (e.target as HTMLElement).closest<HTMLButtonElement>('button.fig-split');
      if (sb?.dataset.key) { const pane = sb.closest<HTMLElement>('.pane'); const gi = pane ? +(pane.dataset.group ?? layoutStore.layout.focus) : layoutStore.layout.focus; layoutStore.apply((x) => splitRight(x, gi, sb.dataset.key)); return; }
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

  /* layout → address bar, title, released copies, spy, redraw */
  let urlSec: SectionId = page;
  $effect(() => {
    const l = layoutStore.layout; const sec = focus.section;
    tick().then(() => {
      registry.release(new Set(Array.from(document.querySelectorAll<HTMLElement>('.pane article[data-doc], .pane .fig-root'))));
      FIG.redrawAll(); spy.read(activePane(l.focus));
      if (sec === urlSec) return; const e = registry.entry(sec); if (!e) return; urlSec = sec;
      try { history.replaceState(null, '', e.url); } catch { /* file:// */ }
      document.title = `${sec} ${e.title} · ${manifest.title}`;
    });
  });
  /* The "+" on a tab strip: the browser, opening whatever is picked into that group. */
  const onPick = (group: number) => { ui.openBrowser({ group }); };
</script>

{#if ready}
  <div class="shell" role="application" aria-label="OmniStax" onpointerdown={() => { if (layoutStore.overlay && !narrow) layoutStore.overlay = null; }}>
    <Rail side="left" {narrow} />
    <Sidebar side="left" {narrow} />
    <main class="docs" onpointerdown={() => { if (layoutStore.overlay) layoutStore.overlay = null; }}>
      <SplitTree node={layoutStore.layout.tree} {onPick} />
    </main>
    <Sidebar side="right" {narrow} />
    <Rail side="right" {narrow} />
  </div>
  <Settings />
  <Hover />
  <HighlightBar />
  <Palette />
  <Browser {manifest} />
{/if}

<style>
  .shell{height:100vh;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:44px auto minmax(0,1fr) auto 44px;grid-template-areas:"rl sl docs sr rr"}
  .docs{grid-area:docs;display:flex;min-width:0;min-height:0;background:var(--bg);position:relative}
  @media (max-width:900px){ .shell{grid-template-columns:44px 0 minmax(0,1fr) 0 44px} .docs{flex-direction:column} }
</style>
