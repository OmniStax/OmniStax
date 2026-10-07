<script lang="ts">
  import { untrack } from 'svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { generated } from '../../lib/practice/generated.svelte';
  import { catalogOf, isGenerated, generatedIdOf } from '../../lib/practice/generated';
  import { standingOf, exercisesIn, exercisesTesting, keyOf, type CatalogExercise, type Standing } from '../../lib/practice/model';
  import type { Node } from '../../lib/practice/select';
  import { plain, count, exerciseName, excerpt, standingLine } from '../../lib/practice/labels';
  import type { ChapterEntry, SectionEntry, ConceptDTO } from '../../lib/content/schema';
  import { bookId, sectionId, sectionRef, exItem, itemKey, type SectionId } from '../../lib/types/ids';
  import { openFromView } from '../../lib/sections/nav.svelte';
  import { mathHtml } from '../actions/math';
  import RowMenu from '../explorer/RowMenu.svelte';
  import MasteryBox from './MasteryBox.svelte';
  import StandingMeter from './StandingMeter.svelte';
  import KindDot from './KindDot.svelte';
  import AiTag from './AiTag.svelte';
  import ProgressOverride from './ProgressOverride.svelte';

  type Props = { item: string; shelf: readonly string[]; open?: string | null; selectable?: boolean };
  let { item, shelf, open = null, selectable = true }: Props = $props();

  type Lens = 'concepts' | 'exercises';
  type MenuItem = { readonly label: string; readonly run: () => void; readonly danger?: boolean };
  type Menu = { readonly x: number; readonly y: number; readonly items: readonly MenuItem[] };
  type Bulk = 'mastered' | 'unpracticed' | 'history';

  let lens = $state<Lens>('concepts');
  let query = $state('');
  let unfolded = $state<readonly string[]>([]);
  let menu = $state<Menu | null>(null);
  let editing = $state<string | null>(null);
  let asking = $state<{ readonly key: string; readonly act: Bulk } | null>(null);

  $effect(() => {
    const b = open;
    if (!b) return;
    untrack(() => {
      unfolded = [`b:${b}`];
      books.load(b).catch(() => {});
    });
  });

  const cat = $derived(practice.catalog());
  const needle = $derived(query.trim().toLowerCase());
  const has = (s: string): boolean => s.toLowerCase().includes(needle);

  const isOpen = (key: string): boolean => (needle !== '' && !key.startsWith('k:')) || unfolded.includes(key);
  const flip = (key: string, book?: string): void => {
    unfolded = unfolded.includes(key) ? unfolded.filter((k) => k !== key) : [...unfolded, key];
    if (book && (books.status[book] ?? 'idle') === 'idle') books.load(book).catch(() => {});
  };

  const chaptersOf = (b: string): readonly ChapterEntry[] => books.manifest(b)?.chapters ?? [];
  const sectionsOf = (c: ChapterEntry): readonly SectionEntry[] => c.sections.filter((s) => s.built);
  const builtIn = (b: string): readonly ConceptDTO[] => practice.conceptsIn(b).filter((c) => c.status === 'built');
  const conceptsAt = (b: string, sec: SectionId): readonly ConceptDTO[] => builtIn(b).filter((c) => c.section === sec);
  const exercisesAt = (b: string, sec: SectionId): readonly CatalogExercise[] =>
    [...exercisesIn(cat, b, sec), ...generated.list.filter((g) => g.book === b && g.section === sec).map(catalogOf)];
  const testing = (id: string): readonly CatalogExercise[] => [...exercisesTesting(cat, id), ...generated.forConcept(id).map(catalogOf)];
  const nameOf = (e: CatalogExercise): string => exerciseName(e.ex, books.manifest(e.book)?.exerciseKinds?.[e.ex.kind]);

  const standingIn = (concepts: readonly ConceptDTO[]): Standing => standingOf(concepts, practice.mastery);
  const chapterConcepts = (b: string, c: ChapterEntry): readonly ConceptDTO[] => {
    const ids = c.sections.map((s) => s.id);
    return builtIn(b).filter((x) => ids.includes(x.section));
  };
  const short = (s: Standing): string => standingLine(s).split(' · ')[0];

  const conceptHit = (c: ConceptDTO): boolean => has(plain(c.name)) || has(c.id);
  const exerciseHit = (e: CatalogExercise): boolean => has(nameOf(e));
  const sectionSelfHit = (s: SectionEntry): boolean => has(s.title) || has(s.id);
  const sectionHit = (b: string, s: SectionEntry): boolean => {
    if (!needle || sectionSelfHit(s)) return true;
    const sec = sectionId(s.id);
    return lens === 'concepts' ? conceptsAt(b, sec).some(conceptHit) : exercisesAt(b, sec).some(exerciseHit);
  };
  const chapterHit = (b: string, c: ChapterEntry): boolean => sectionsOf(c).some((s) => sectionHit(b, s));
  const bookHit = (b: string): boolean => !needle || (books.status[b] === 'loaded' && chaptersOf(b).some((c) => chapterHit(b, c)));
  const shownConcepts = (b: string, s: SectionEntry): readonly ConceptDTO[] => {
    const all = conceptsAt(b, sectionId(s.id));
    return !needle || sectionSelfHit(s) ? all : all.filter(conceptHit);
  };
  const shownExercises = (b: string, s: SectionEntry): readonly CatalogExercise[] => {
    const all = exercisesAt(b, sectionId(s.id));
    return !needle || sectionSelfHit(s) ? all : all.filter(exerciseHit);
  };
  const nothing = $derived(needle !== '' && !shelf.some(bookHit));

  const tri = (node: HTMLInputElement, on: boolean) => {
    node.indeterminate = on;
    return { update(v: boolean) { node.indeterminate = v; } };
  };

  const openExercise = (e: CatalogExercise): void => {
    void openFromView(itemKey(exItem(sectionRef(bookId(e.book), e.section), e.ex.id)), 'tab');
  };
  const showMenu = (ev: MouseEvent, items: readonly MenuItem[]): void => {
    ev.preventDefault();
    ev.stopPropagation();
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    menu = ev.type === 'contextmenu' ? { x: ev.clientX, y: ev.clientY, items } : { x: r.left, y: r.bottom, items };
  };
  const placeMenu = (key: string, book?: string): readonly MenuItem[] => {
    const ask = (act: Bulk) => () => {
      asking = { key, act };
      if (book && (books.status[book] ?? 'idle') === 'idle') books.load(book).catch(() => {});
    };
    return [
      { label: 'Mark all mastered', run: ask('mastered') },
      { label: 'Mark all unpracticed', run: ask('unpracticed') },
      { label: 'Calculate mastery from exercise history', run: ask('history') },
    ];
  };
  const question = (act: Bulk, n: number): string =>
    act === 'history' ? `Calculate mastery from exercise history for ${count(n, 'concept')}?` : `Mark ${count(n, 'concept')} ${act}?`;
  const apply = (act: Bulk, concepts: readonly ConceptDTO[]): void => {
    const ids = concepts.map((c) => c.id);
    if (act === 'mastered') practice.setSelfMany(ids, practice.settings.masteryTarget, true, false);
    else if (act === 'unpracticed') practice.setSelfMany(ids, 0, false, false);
    else practice.clearSelfMany(ids);
    asking = null;
  };
  const conceptMenu = (id: string): readonly MenuItem[] => [
    { label: 'Mark mastered', run: () => practice.setSelf(id, practice.settings.masteryTarget, true, false) },
    { label: 'Mark unpracticed', run: () => practice.setSelf(id, 0, false, false) },
    { label: 'Calculate mastery from exercise history', run: () => practice.clearSelf(id) },
    { label: 'Set progress…', run: () => { editing = id; } },
  ];
  const exerciseMenu = (e: CatalogExercise): readonly MenuItem[] => [
    { label: 'Open in a tab', run: () => openExercise(e) },
    ...(isGenerated(e.ex.id) ? [{ label: 'Delete', danger: true, run: () => void generated.remove(generatedIdOf(e.ex.id)) }] : []),
  ];
</script>

{#snippet twisty(key: string, name: string, book?: string)}
  <button type="button" class="tw" aria-expanded={isOpen(key)} aria-label={`${isOpen(key) ? 'Fold' : 'Open'} ${name}`} onclick={() => flip(key, book)}><span aria-hidden="true">▸</span></button>
{/snippet}

{#snippet box(node: Node, name: string)}
  {@const ck = practice.check(item, node)}
  <input type="checkbox" checked={ck === 'on'} use:tri={ck === 'some'} aria-label={`Select ${name}`} onchange={() => practice.toggleNode(item, node)}>
{/snippet}

{#snippet place(key: string, name: string, node: Node, concepts: readonly ConceptDTO[], book?: string)}
  {@const standing = standingIn(concepts)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="row" style:--d={node.level === 'book' ? 0 : node.level === 'chapter' ? 1 : 2} oncontextmenu={(ev) => showMenu(ev, placeMenu(key, book))}>
    {@render twisty(key, name, book)}
    {#if selectable}{@render box(node, name)}{/if}
    <button type="button" class="lab" tabindex="-1" onclick={() => flip(key, book)}>{name}</button>
    {#if asking?.key === key}
      {@const act = asking.act}
      <span class="end ask">
        {question(act, concepts.length)}
        <button type="button" class="btn sm primary" disabled={!concepts.length} onclick={() => apply(act, concepts)}>Yes</button>
        <button type="button" class="btn ghost sm" onclick={() => (asking = null)}>No</button>
      </span>
    {:else}
      <span class="end">
        {#if concepts.length && concepts.every((k) => practice.self[k.id])}<span class="muted tag">overridden</span>{/if}
        <span class="muted num">{short(standing)}</span>
        <span class="meter"><StandingMeter {standing} /></span>
        <button type="button" class="btn ghost icon sm" aria-label={`Actions for ${name}`} onclick={(ev) => showMenu(ev, placeMenu(key, book))}>⋯</button>
      </span>
    {/if}
  </div>
{/snippet}

{#snippet exRow(e: CatalogExercise, d: number, withSection: boolean)}
  {@const name = nameOf(e)}
  {@const last = practice.lastOutcome({ book: e.book, section: e.section, ex: e.ex.id })}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="row" style:--d={d} oncontextmenu={(ev) => showMenu(ev, exerciseMenu(e))}>
    <span class="tw-gap"></span>
    {@render box({ level: 'exercise', book: e.book, section: e.section, ex: e.ex.id }, name)}
    <span class="lab ex"><span class="exname">{name}</span>{#if withSection}<span class="muted num src">§ {e.section}</span>{/if}<span class="excerpt">{excerpt(e.ex.prompt)}</span></span>
    <span class="end">
      {#if isGenerated(e.ex.id)}<AiTag model={generated.list.find((g) => g.id === generatedIdOf(e.ex.id))?.model} text />{/if}
      {#if last === true}<span class="ok" aria-label="Last answer correct">✓</span>{:else if last === false}<span class="bad" aria-label="Last answer incorrect">✗</span>{/if}
      <button type="button" class="btn ghost icon sm" aria-label={`Actions for ${name}`} onclick={(ev) => showMenu(ev, exerciseMenu(e))}>⋯</button>
    </span>
  </div>
{/snippet}

<div class="tree">
  <div class="bar">
    {#if selectable}
      <div class="seg" role="radiogroup" aria-label="Sections open to">
        <button type="button" role="radio" aria-checked={lens === 'concepts'} class:on={lens === 'concepts'} onclick={() => (lens = 'concepts')}>Concepts</button>
        <button type="button" role="radio" aria-checked={lens === 'exercises'} class:on={lens === 'exercises'} onclick={() => (lens = 'exercises')}>Exercises</button>
      </div>
    {/if}
    <input class="input find" type="search" placeholder="Find a concept, section or exercise" aria-label="Find in the curriculum" bind:value={query}>
  </div>

  {#if nothing}<p class="muted note" role="status">Nothing matches.</p>{/if}

  {#each shelf.filter(bookHit) as b (b)}
    {@const title = practice.bookTitle(b)}
    {@render place(`b:${b}`, title, { level: 'book', book: b }, builtIn(b), b)}
    {#if isOpen(`b:${b}`)}
      {@const status = books.status[b] ?? 'idle'}
      {#if status === 'failed'}
        <p class="muted note" style:--d={1} role="status">This book could not be loaded.</p>
      {:else if status !== 'loaded'}
        <p class="muted note" style:--d={1} role="status">Loading…</p>
      {:else}
        {#each chaptersOf(b).filter((c) => sectionsOf(c).length && (!needle || chapterHit(b, c))) as c (c.id)}
          {@const ck = `c:${b}/${c.id}`}
          {@render place(ck, `${c.id} · ${c.title}`, { level: 'chapter', book: b, chapter: c.id }, chapterConcepts(b, c))}
          {#if isOpen(ck)}
            {#each sectionsOf(c).filter((s) => sectionHit(b, s)) as s (s.id)}
              {@const sk = `s:${b}/${s.id}`}
              {@const sec = sectionId(s.id)}
              {@render place(sk, `${s.id} · ${s.title}`, { level: 'section', book: b, chapter: c.id, section: sec }, conceptsAt(b, sec))}
              {#if isOpen(sk)}
                {#if lens === 'concepts'}
                  {@const concepts = shownConcepts(b, s)}
                  {#each concepts as k (k.id)}
                    {@const kk = `k:${b}/${k.id}`}
                    {@const name = plain(k.name)}
                    {@const tests = testing(k.id)}
                    {@const ai = generated.forConcept(k.id).length}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="row" style:--d={3} oncontextmenu={(ev) => showMenu(ev, conceptMenu(k.id))}>
                      {#if selectable}
                        {@render twisty(kk, name)}
                        {@render box({ level: 'concept', concept: k.id }, name)}
                      {:else}
                        <span class="tw-gap"></span>
                      {/if}
                      <MasteryBox id={k.id} />
                      <KindDot kind={k.kind} />
                      <span class="lab"><span class="go" data-book={b} data-concept={k.id} use:mathHtml={k.name}></span></span>
                      <span class="end">
                        <span class="muted num">{count(tests.length, 'exercise')}</span>
                        {#if ai > 0}<span class="ai num"><AiTag />{ai}</span>{/if}
                        {#if practice.self[k.id]}<span class="muted tag">overridden</span>{/if}
                        <button type="button" class="btn ghost icon sm" aria-label={`Actions for ${name}`} onclick={(ev) => showMenu(ev, conceptMenu(k.id))}>⋯</button>
                      </span>
                    </div>
                    {#if editing === k.id}
                      <div class="sub" style:--d={4}><ProgressOverride id={k.id} ondone={() => (editing = null)} /></div>
                    {/if}
                    {#if selectable && isOpen(kk)}
                      {#each tests as e (keyOf(e))}{@render exRow(e, 4, true)}{:else}<p class="muted note" style:--d={4}>No exercises here.</p>{/each}
                    {/if}
                  {:else}
                    <p class="muted note" style:--d={3}>No concepts introduced here.</p>
                  {/each}
                {:else}
                  {#each shownExercises(b, s) as e (keyOf(e))}{@render exRow(e, 3, false)}{:else}<p class="muted note" style:--d={3}>No exercises here.</p>{/each}
                {/if}
              {/if}
            {/each}
          {/if}
        {/each}
      {/if}
    {/if}
  {/each}
</div>

{#if menu}
  <RowMenu x={menu.x} y={menu.y} items={menu.items} onclose={() => (menu = null)} />
{/if}

<style>
  .tree { container-type: inline-size; width: 100%; min-width: 0; }
  .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
  .find { flex: 1 1 180px; min-width: 0; }
  .row { display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 4px 0 calc(var(--d) * 16px + 4px); border-radius: 6px; transition: background-color 120ms; }
  .row:hover { background: var(--soft); }
  .note { margin: 0; padding: 4px 4px 4px calc(var(--d, 0) * 16px + 34px); font-size: 0.78rem; }
  .sub { padding: 2px 4px 4px calc(var(--d) * 16px + 4px); }
  .tw, .tw-gap { flex: none; width: 24px; height: 24px; }
  .tw { display: grid; place-items: center; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--muted); cursor: pointer; font-size: 0.7rem; }
  .tw span { transition: transform 120ms; }
  .tw[aria-expanded='true'] span { transform: rotate(90deg); }
  .row input[type='checkbox'] { flex: none; width: 16px; height: 16px; margin: 4px; accent-color: var(--ink); }
  .lab { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; }
  button.lab { cursor: pointer; }
  .lab.ex { display: flex; align-items: baseline; gap: 8px; }
  .exname { font-weight: 600; white-space: nowrap; flex: none; }
  .src { flex: none; white-space: nowrap; }
  .excerpt { color: var(--muted); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .go { text-decoration: underline dotted var(--muted); text-underline-offset: 3px; }
  :global(html.no-underlines) .go { text-decoration: none; }
  .end { flex: none; display: inline-flex; align-items: center; gap: 8px; font-size: 0.78rem; }
  .muted { color: var(--muted); }
  .num { font-variant-numeric: tabular-nums; }
  .ai { display: inline-flex; align-items: center; gap: 2px; color: var(--muted); }
  .ask { gap: 4px; }
  .tag { padding: 0 6px; border: 1px solid var(--rule); border-radius: 6px; }
  .ok { color: var(--ok); }
  .bad { color: var(--bad); }
  .meter { display: inline-flex; width: 72px; }
  .tw:focus-visible, .lab:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  @container (max-width: 419px) {
    .meter { display: none; }
  }
</style>
