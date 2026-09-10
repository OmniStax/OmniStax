<script lang="ts">
  /* Practice, as a curriculum rather than as a page of problems. The view has
     four faces and the store remembers which one is showing, so closing the tab
     and opening it again puts the reader back where they were. Two quiet tabs
     divide them: three faces are the practising itself, and the fourth is the
     standing the practising builds up, which is a step to the side rather than
     a step on — the Practise tab puts the reader back on the face they left.

     On the first face the reader says what they want to practise: rows of every
     book in their library — the book itself, its chapters, its sections — each a
     checkbox that stands for a pick, and beside them every concept those chapters
     teach, so a reader who wants one idea rather than one section can say so. A row is
     checked when its own pick is in the curriculum or when everything under it
     is, and half-checked when only some of it is, which is the rule a file tree
     uses. The foot adds the choice up in a sentence and draws a session from it.

     On the second face the session runs one exercise at a time in the ordinary
     card, standing alone as it does in a tab of its own. The card records the
     answer into the store by itself; this face only watches for it, so that Next
     arrives when the problem has been answered and not before. The third face is
     the reckoning: what was earned, which concepts moved, and when the ones just
     practised come round again. The fourth is the long view of the same thing:
     every concept the reader has chosen or ever answered, in the order they need
     attention, with what each book has earned them at the foot. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { library } from '../../lib/explorer/library.svelte';
  import { sectionId, conceptId, type SpanId, type SectionId } from '../../lib/types/ids';
  import type { BookManifest, ChapterEntry, ConceptDTO, SectionEntry } from '../../lib/content/schema';
  import { math } from '../actions/math';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';
  import { pin, spansOf } from '../../lib/sections/concepts.svelte';
  import { goSpan } from '../../lib/sections/nav.svelte';
  import { practice, type Face } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { DAY, conceptsOf, decayed, dueAt, pointsByBook, samePick, type Pick, type State, poolOf } from '../../lib/practice/model';

  /* The curriculum spans the shelf rather than the page: the book the reader has
     open stands first, and after it every other book they have taken into their
     library, each fetched once and then held. Everything the store keeps is keyed
     by book already, so a chapter of one book and a section of another sit in the
     curriculum side by side. */
  const book = $derived(registry.manifest.id);
  const cat = $derived(practice.catalog());
  const shelf = $derived([book, ...library.added.filter((id) => id !== book)]);
  /* A book's shape is read from its own manifest: the one the shell was started
     with for the book being read, a fetched one for every other. */
  const manifestOf = (id: string): BookManifest | undefined => (id === book ? registry.manifest : books.manifest(id));
  const chaptersOf = (id: string): readonly ChapterEntry[] => manifestOf(id)?.chapters ?? [];
  const statusOf = (id: string): string => (id === book ? 'loaded' : books.status[id] ?? 'idle');
  /* The catalogue of what the library holds, and then each book on the shelf. A
     book is asked for only while nothing has been tried, so a book that will not
     load is reported rather than fetched again and again. */
  $effect(() => { if (library.status === 'idle') library.load().catch(() => {}); });
  $effect(() => { shelf.forEach((id) => { if (statusOf(id) === 'idle') books.load(id).catch(() => {}); }); });
  const bookTitle = (id: string): string => (id === book ? registry.manifest.title || 'This book' : practice.bookTitle(id));
  const chapterDir = (id: string, sec: SectionId): string => chaptersOf(id).find((c) => c.sections.some((s) => s.id === sec))?.dir ?? '';
  const sectionTitle = (id: string, sec: string): string => chaptersOf(id).flatMap((c) => c.sections).find((s) => s.id === sec)?.title ?? '';
  const chapters = $derived(registry.manifest.chapters);
  const builtOf = (c: ChapterEntry): readonly SectionEntry[] => c.sections.filter((s) => s.built);

  /* What the Choose face needs before it can say anything true: every chapter's
     concepts, and every built section, whose exercises only join the catalog
     once the section itself has been fetched. */
  const dirs = $derived(chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir));
  const secs = $derived(chapters.flatMap((c) => builtOf(c)).map((s) => sectionId(s.id)));
  $effect(() => { if (dirs.length) registry.loadChapters(dirs).catch(() => {}); });
  $effect(() => { secs.forEach((s) => registry.load(s).catch(() => {})); });
  const loading = $derived(
    dirs.some((d) => (registry.chapterStatus[d] ?? 'loading') === 'loading') || secs.some((s) => (registry.state(s)?.status ?? 'loading') === 'loading'),
  );

  /* A checkbox that is neither on nor off: the browser takes that as a property
     only, so it is set here rather than written as an attribute. */
  const tri = (node: HTMLInputElement, on: boolean) => { node.indeterminate = on; return { update(v: boolean) { node.indeterminate = v; } }; };

  const bookPick = (id: string): Pick => ({ book: id });
  const chapPick = (id: string, c: ChapterEntry): Pick => ({ book: id, chapter: c.id });
  const secPick = (id: string, s: SectionEntry): Pick => ({ book: id, section: sectionId(s.id) });
  const conceptPick = (id: string): Pick => ({ concept: conceptId(id) });
  const has = (p: Pick): boolean => practice.curriculum.some((q) => samePick(q, p));
  /* A section is in the curriculum on its own account or through the chapter or
     the book above it; a chapter is in it when every section it has built is. */
  const secOn = (id: string, c: ChapterEntry, s: SectionEntry): boolean => has(bookPick(id)) || has(chapPick(id, c)) || has(secPick(id, s));
  const chapOn = (id: string, c: ChapterEntry): boolean => { const b = builtOf(c); return has(bookPick(id)) || has(chapPick(id, c)) || (b.length > 0 && b.every((s) => secOn(id, c, s))); };
  const chapSome = (id: string, c: ChapterEntry): boolean => builtOf(c).some((s) => secOn(id, c, s));
  const bookOn = (id: string): boolean => { const ch = chaptersOf(id); return has(bookPick(id)) || (ch.length > 0 && ch.every((c) => chapOn(id, c))); };
  const bookSome = (id: string): boolean => !bookOn(id) && chaptersOf(id).some((c) => chapSome(id, c));

  /* What a pick comes to: the concepts it holds, how many of them are waiting
     for review, and how many problems in the book test any of them. */
  type Sum = { readonly concepts: number; readonly due: number; readonly exercises: number };
  const sumOf = (picks: readonly Pick[]): Sum => {
    const ids = conceptsOf(picks, cat);
    let due = 0;
    ids.forEach((id) => { if (practice.stateOf(id) === 'due') due += 1; });
    return { concepts: ids.size, due, exercises: poolOf(picks, cat).length };
  };
  const countLine = (s: Sum): string => `${s.concepts} · ${s.exercises}${s.due ? ` · ${s.due} due` : ''}`;
  const countTitle = (s: Sum): string =>
    s.concepts === 0 ? 'Nothing here has a concept attached to it yet.'
      : `${s.concepts === 1 ? 'One concept' : `${s.concepts} concepts`}, ${s.exercises === 1 ? 'one problem' : `${s.exercises} problems`}, and ${
        s.due === 0 ? 'nothing due for review' : s.due === 1 ? 'one of them due for review' : `${s.due} of them due for review`}.`;

  /* The concept list: everything the loaded chapters of the shelf teach that the
     book stating it states, book by book and in the order each book states it,
     narrowed by what is typed above. Section ids repeat from one book to the
     next, so a group is keyed by its book as well as by its section. */
  let q = $state('');
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/<[^>]*>/g, ' ');
  const conceptsIn = (id: string): readonly ConceptDTO[] => (id === book ? registry.concepts : books.loaded[id]?.concepts ?? []);
  const conceptGroups = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    return shelf.flatMap((id) => {
      const order = chaptersOf(id).flatMap((c) => c.sections.map((s) => s.id));
      const kept = conceptsIn(id).filter((c) => !c.placeholder && (!needle || plain(c.name).toLowerCase().includes(needle) || c.id.includes(needle)));
      const by = new Map<string, ConceptDTO[]>();
      kept.forEach((c) => { const g = by.get(c.section); if (g) g.push(c); else by.set(c.section, [c]); });
      return [...by.entries()]
        .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
        .map(([section, items]) => ({ key: `${id}/${section}`, book: id, section, title: sectionTitle(id, section), items }));
    });
  });
  /* The book a group belongs to is worth saying only where more than one book has
     something to say. */
  const manyBooks = $derived(new Set(conceptGroups.map((g) => g.book)).size > 1);
  /* A concept is checked when the reader named it, and half-checked when a
     section or a chapter they picked brings it in. */
  const curriculumConcepts = $derived(conceptsOf(practice.curriculum, cat));
  const STATE_WORD: Readonly<Record<State, string>> = { untouched: 'untouched', practised: 'practised', mastered: 'mastered', due: 'due' };

  /* The presets replace the choice rather than adding to it, which is what makes
     them a quick way back to a clean start. */
  const replace = (picks: readonly Pick[]): void => { practice.clear(); picks.forEach((p) => practice.toggle(p)); };
  const here = $derived(focus.section);
  const hereChapter = $derived(registry.chapterOf(here));
  const dueNow = $derived(cat.concepts.filter((c) => !c.placeholder && practice.stateOf(c.id) === 'due'));

  const choice = $derived(sumOf(practice.curriculum));
  const size = $derived(Math.min(practice.settings.session, choice.exercises));
  const choiceLine = $derived(
    practice.curriculum.length === 0 ? 'You have not chosen anything to practise yet.'
      : `${choice.concepts === 1 ? '1 concept' : `${choice.concepts} concepts`}, ${
        choice.due === 0 ? 'none of them due' : choice.due === 1 ? '1 of them due' : `${choice.due} of them due`}, in ${
        choice.exercises === 1 ? '1 exercise' : `${choice.exercises} exercises`}.`,
  );
  const why = $derived(
    practice.curriculum.length === 0 ? 'Tick a chapter, a section or a concept above, and a session will be drawn from what you tick.'
      : choice.exercises === 0 ? 'Nothing you have chosen has a problem attached to it yet. Choose another part of the book, or one of its concepts.'
        : '',
  );
  const live = $derived(practice.session !== null && practice.session.at < practice.session.drawn.length);
  let note = $state('');
  const begin = (): void => { note = practice.start() ? '' : 'There is nothing left to draw on just now. Choose more of the book, or come back when the last answers have had time to fade.'; };

  /* Practise. The card writes the answer into the store; this face reads the
     store back, so Next arrives the moment the answer is recorded, however the
     card came to record it. */
  const session = $derived(practice.session);
  const at = $derived(session?.at ?? 0);
  const drawn = $derived(session?.drawn ?? []);
  const cur = $derived(practice.current());
  const pending = $derived(session ? session.drawn[at] : undefined);
  /* A problem of the book being read waits on its section; one drawn out of
     another book waits on that book, which arrives whole. */
  $effect(() => {
    if (!pending || cur) return;
    if (pending.book === book) registry.load(pending.section).catch(() => {});
    else if (statusOf(pending.book) === 'idle') books.load(pending.book).catch(() => {});
  });
  const answered = $derived(session?.answered[at] === true);
  const last = $derived(session !== null && at === drawn.length - 1);
  const WHY: Readonly<Record<string, string>> = { review: 'review', frontier: 'new', more: 'more' };

  /* The card's root is decorated the way a prepared document's root is, so the
     goto cards and the notes layer read it as they read any other. */
  let root = $state<HTMLElement | null>(null);
  $effect(() => { if (root && cur) registry.decorateRoot(root); });
  /* Next takes the focus as it appears, so a reader who has just answered can go
     on with the Enter key without reaching for the pointer. */
  let nextBtn = $state<HTMLButtonElement | null>(null);
  $effect(() => { if (answered && nextBtn) nextBtn.focus({ preventScroll: true }); });

  const conceptName = (id: string): string => practice.conceptOf(id)?.name ?? id;
  const bar = (id: string): number => { const r = practice.mastery[id]; return r ? Math.min(1, decayed(r, Date.now(), practice.settings) / practice.settings.threshold) : 0; };
  const barTitle = (id: string, s: State): string =>
    s === 'untouched' ? 'You have not answered anything on this concept yet.'
      : s === 'mastered' ? 'You have mastered this one; the bar shows how much of its score is left.'
        : s === 'due' ? 'This one has faded below the threshold and is waiting for a review.'
          : `The bar is how far your score on this concept stands towards the ${practice.settings.threshold} points that count as mastery.`;

  /* Summary. */
  const changed = $derived(practice.face === 'summary' ? practice.changed() : []);
  const done = $derived(drawn.filter((_, i) => session?.answered[i] === true).length);
  const skipped = $derived(drawn.length - done);
  const upcoming = $derived.by(() => {
    if (practice.face !== 'summary') return [];
    const now = Date.now();
    return [...curriculumConcepts]
      .flatMap((id) => { const r = practice.mastery[id]; if (!r) return []; const t = dueAt(r, practice.settings); return t === null ? [] : [{ id, at: t, now }]; })
      .sort((a, b) => a.at - b.at);
  });
  const when = (t: number, now: number): string => {
    if (t <= now) return 'now';
    const days = Math.round((t - now) / 86400000);
    return days <= 0 ? 'later today' : days === 1 ? 'in a day' : `in ${days} days`;
  };
  const earnedLine = (n: number): string => (n === 0 ? 'You earned no points this round.' : n === 1 ? 'You earned one point this round.' : `You earned ${n} points this round.`);
  const workLine = $derived(
    skipped === 0 ? `You answered ${drawn.length === 1 ? 'the one problem' : `all ${drawn.length} problems`} it drew.`
      : done === 0 ? `You skipped ${drawn.length === 1 ? 'it' : 'all of them'}.`
        : `You answered ${done} of the ${drawn.length} problems and skipped ${skipped === 1 ? 'the other one' : `the other ${skipped}`}.`,
  );
  const lifetimeLine = $derived(practice.lifetime === 1 ? 'You have earned one point in all.' : `You have earned ${practice.lifetime} points in all.`);

  /* ---------- the two tabs, and what the Practise one goes back to ---------- */

  /* Progress is read beside the practising rather than after it, so stepping
     over to it remembers the face it was read from and stepping back returns
     there; with nothing to return to, the choice. */
  let back = $state<Face | null>(null);
  const toProgress = (): void => { if (practice.face !== 'progress') back = practice.face; practice.progress(); };
  const toPractise = (): void => {
    const to = back ?? (live ? 'practise' : 'choose');
    back = null;
    if (to === 'summary' && session) practice.end();
    else if (to === 'practise' && live) practice.resume();
    else practice.choose();
  };

  /* ---------- progress ---------- */

  /* The curriculum, or everything the reader has ever answered: a record is
     kept by the concept alone, so the wider list reaches into books that are
     not open; a concept is named by whichever book on the shelf states it, and
     by its id while no loaded book does. */
  let scope = $state<'curriculum' | 'everything'>('curriculum');
  const STATES: readonly State[] = ['due', 'practised', 'mastered', 'untouched'];
  type Row = { readonly id: string; readonly name: string; readonly kind: string; readonly state: State; readonly bar: number; readonly at: number | null; readonly meta: string; readonly intro: SpanId | undefined };

  const ago = (at: number, now: number): string => {
    const days = Math.round((now - at) / DAY);
    return days <= 0 ? 'last practised today' : days === 1 ? 'last practised yesterday' : `last practised ${days} days ago`;
  };
  const streak = (n: number): string => (n <= 0 ? '' : n === 1 ? 'one day in a row' : `${n} days in a row`);
  const rows = $derived.by((): readonly Row[] => {
    if (practice.face !== 'progress') return [];
    const now = Date.now();
    const mine = [...conceptsOf(practice.curriculum, cat)];
    const ids = scope === 'curriculum' ? mine : [...new Set([...Object.keys(practice.mastery), ...mine])];
    return ids.map((id): Row => {
      const r = practice.mastery[id], c = practice.conceptOf(id), st = practice.stateOf(id, now);
      const at = r ? dueAt(r, practice.settings) : null;
      return {
        id, name: c?.name ?? id, kind: c?.kind ?? '', state: st, bar: bar(id), at, intro: spansOf(conceptId(id)).intro[0],
        meta: [streak(r?.days ?? 0), r && r.earned > 0 ? ago(r.lastAt, now) : '', at !== null && (st === 'mastered' || st === 'due') ? `due ${when(at, now)}` : ''].filter(Boolean).join(' · '),
      };
    });
  });
  /* Each group in the order the reader would work through it: the most overdue
     first, then the concept nearest to mastery, then the mastered one that
     comes round soonest, and the untouched by name. */
  const byName = (a: Row, b: Row): number => plain(a.name).trim().localeCompare(plain(b.name).trim()) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ORDER: Readonly<Record<State, (a: Row, b: Row) => number>> = {
    due: (a, b) => a.bar - b.bar || byName(a, b),
    practised: (a, b) => b.bar - a.bar || byName(a, b),
    mastered: (a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || byName(a, b),
    untouched: byName,
  };
  /* Untouched is a fact about the curriculum: outside it, a concept nobody has
     answered is simply one of the thousands the library holds. */
  const groups = $derived(
    STATES.filter((st) => scope === 'curriculum' || st !== 'untouched')
      .flatMap((st) => { const items = rows.filter((r) => r.state === st).sort(ORDER[st]); return items.length ? [{ state: st, items }] : []; }),
  );
  const dueLine = $derived(practice.due.length === 0 ? '' : practice.due.length === 1 ? 'One concept is due now.' : `${practice.due.length} concepts are due now.`);
  /* Points are earned in a book even though mastery is not, so this is summed
     over the attempts; a book the reader has since taken out of their library is
     named by its id until it is put back. */
  const bookTotals = $derived.by(() => Object.entries(pointsByBook(practice.attempts))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([id, n]) => ({ id, line: `${practice.bookTitle(id)} · ${n === 1 ? 'one point' : `${n} points`}` })));
  const rowTitle = (r: Row): string => (r.intro ? 'Pin this concept on the map and go to where the book introduces it.' : 'Pin this concept on the map; the book has no page that introduces it yet.');
  const open = (r: Row): void => { const id = conceptId(r.id); const was = pin.pinned === id; pin.toggle(id); if (!was && r.intro) goSpan(r.intro); };
</script>

{#snippet stateChip(id: string)}
  {@const s = practice.stateOf(id)}
  {#if s !== 'untouched'}<span class="chip st-{s}">{STATE_WORD[s]}</span>{/if}
{/snippet}

<div class="faces">
  <button type="button" class="tab" class:on={practice.face !== 'progress'} aria-current={practice.face !== 'progress' ? 'true' : undefined} onclick={toPractise}>Practise</button>
  <button type="button" class="tab" class:on={practice.face === 'progress'} aria-current={practice.face === 'progress' ? 'true' : undefined} onclick={toProgress}>Progress</button>
</div>

{#if practice.face === 'choose'}
  <div class="choose">
    {#if loading}<p class="quiet">Loading the book’s problems…</p>{/if}
    <div class="presets">
      <button type="button" class="btn" onclick={() => replace([{ book, section: here }])}>This section</button>
      <button type="button" class="btn" disabled={!hereChapter} onclick={() => hereChapter && replace([chapPick(book, hereChapter)])}>This chapter</button>
      <button type="button" class="btn" onclick={() => replace([bookPick(book)])}>This book</button>
      <button type="button" class="btn" disabled={dueNow.length === 0}
        title={dueNow.length === 0 ? 'Nothing is waiting for review at the moment.' : 'The concepts whose score has faded below the threshold since you last practised them.'}
        onclick={() => replace(dueNow.map((c) => conceptPick(c.id)))}>Everything due</button>
      <button type="button" class="btn" disabled={practice.curriculum.length === 0} onclick={() => practice.clear()}>Clear</button>
    </div>

    <div class="cols">
      <div class="pane">
        <div class="eyebrow">{shelf.length > 1 ? 'The books' : 'The book'}</div>
        {#each shelf as b (b)}
          {@const on = bookOn(b)}
          <label class="row lvl-book">
            <input type="checkbox" checked={on} use:tri={bookSome(b)} onchange={() => practice.toggle(bookPick(b))}>
            <span class="lab">{bookTitle(b)}</span>
            <span class="cnt" title={countTitle(sumOf([bookPick(b)]))}>{countLine(sumOf([bookPick(b)]))}</span>
          </label>
          {#if !manifestOf(b)}
            <div class="row lvl-chapter off" title="Its chapters cannot be listed until the book itself arrives.">
              <span class="lab">{statusOf(b) === 'failed' ? 'This book could not be loaded.' : 'Loading the book…'}</span>
            </div>
          {/if}
          {#each chaptersOf(b) as c (c.id)}
            {@const chOn = chapOn(b, c)}
            <label class="row lvl-chapter">
              <input type="checkbox" checked={chOn} use:tri={!chOn && chapSome(b, c)} onchange={() => practice.toggle(chapPick(b, c))}>
              <span class="lab">{c.id} · {c.title}</span>
              <span class="cnt" title={countTitle(sumOf([chapPick(b, c)]))}>{countLine(sumOf([chapPick(b, c)]))}</span>
            </label>
            {#each c.sections as s (s.id)}
              {#if s.built}
                <label class="row lvl-section">
                  <input type="checkbox" checked={secOn(b, c, s)} onchange={() => practice.toggle(secPick(b, s))}>
                  <span class="lab">{s.id} · {s.title}</span>
                  <span class="cnt" title={countTitle(sumOf([secPick(b, s)]))}>{countLine(sumOf([secPick(b, s)]))}</span>
                </label>
              {:else}
                <div class="row lvl-section off" title="This section has not been built yet, so it has no problems to draw on.">
                  <input type="checkbox" disabled>
                  <span class="lab">{s.id} · {s.title}</span>
                  <span class="cnt">not built yet</span>
                </div>
              {/if}
            {/each}
          {/each}
        {/each}
      </div>

      <div class="pane">
        <div class="eyebrow">The concepts</div>
        <input class="find" type="search" placeholder="Narrow the concepts…" aria-label="Narrow the concepts by name" bind:value={q}>
        {#if conceptGroups.length === 0}
          <p class="quiet">{loading ? 'The concepts are still loading.' : q.trim() ? 'No concept in your library is named that.' : 'Your library lists no concepts yet.'}</p>
        {/if}
        {#each conceptGroups as g, i (g.key)}
          {#if manyBooks && (i === 0 || conceptGroups[i - 1].book !== g.book)}<div class="eyebrow bk">{bookTitle(g.book)}</div>{/if}
          <div class="eyebrow sec">{g.section}{g.title ? ` · ${g.title}` : ''}</div>
          {#each g.items as c (c.id)}
            {@const own = has(conceptPick(c.id))}
            {@const brought = !own && curriculumConcepts.has(c.id)}
            <label class="row concept">
              <input type="checkbox" checked={own} use:tri={brought} onchange={() => practice.toggle(conceptPick(c.id))}
                title={brought ? 'A section you have already chosen brings this concept in.' : 'Practise this concept on its own.'}>
              <i class="dot k-{c.kind}" aria-hidden="true"></i>
              <span class="lab"><span use:math={c.name}>{@html c.name}</span></span>
              {@render stateChip(c.id)}
            </label>
          {/each}
        {/each}
      </div>
    </div>

    <div class="foot">
      <p class="sum">{choiceLine}</p>
      {#if why}<p class="quiet">{why}</p>{/if}
      {#if note}<p class="quiet">{note}</p>{/if}
      <div class="acts">
        <button type="button" class="btn go" disabled={size === 0} onclick={begin}>Practise {size}</button>
        {#if live}<button type="button" class="btn" onclick={() => practice.resume()}>Back to the session</button>{/if}
      </div>
    </div>
  </div>

{:else if practice.face === 'practise' && session}
  <div class="practise">
    <div class="strip">
      <span class="where">Exercise {at + 1} of {drawn.length}</span>
      <span class="points">{session.earned === 1 ? '1 point so far' : `${session.earned} points so far`}</span>
      {#if pending}<span class="chip why-{pending.why}">{WHY[pending.why] ?? pending.why}</span>{/if}
    </div>
    {#if cur}
      <div class="bars">
        {#each cur.ex.concepts as id (id)}
          {@const s = practice.stateOf(id)}
          <div class="one" title={barTitle(id, s)}>
            <span class="nm"><span use:math={conceptName(id)}>{@html conceptName(id)}</span></span>
            <span class="track"><i class="fill st-{s}" style="width:{Math.round(bar(id) * 100)}%"></i></span>
          </div>
        {/each}
      </div>
      {#if cur.book !== book}<div class="eyebrow from">From {practice.bookTitle(cur.book)} · {cur.section}</div>{/if}
      {#key `${cur.book}/${cur.section}/${cur.ex.id}/${at}`}
        <div class="card-root" data-sec={cur.section} data-chapter={chapterDir(cur.book, cur.section)} data-one="1" bind:this={root}>
          <ExerciseCard book={cur.book} section={cur.section} ex={cur.ex} standalone />
        </div>
      {/key}
    {:else if pending && statusOf(pending.book) === 'failed'}
      <p class="quiet">This problem comes from {practice.bookTitle(pending.book)}, and that book would not load. Skip it and the session goes on without it.</p>
    {:else}
      <p class="quiet">{pending && pending.book !== book ? 'Loading the book this problem comes from…' : 'Loading the section this problem comes from…'}</p>
    {/if}
    <div class="acts">
      <button type="button" class="btn" onclick={() => practice.skip()}>Skip</button>
      {#if answered}<button type="button" class="btn go" bind:this={nextBtn} onclick={() => practice.next()}>{last ? 'Finish' : 'Next'}</button>{/if}
      <button type="button" class="btn" onclick={() => practice.choose()}>Add to the curriculum</button>
      <button type="button" class="btn" onclick={() => practice.end()}>Stop here</button>
    </div>
  </div>

{:else if practice.face === 'summary' && session}
  <div class="summary">
    <p class="sum">{earnedLine(session.earned)} {workLine}</p>
    {#if changed.length}
      <div class="eyebrow">What moved</div>
      <ul class="moved">
        {#each changed as c (c.id)}
          <li><span use:math={conceptName(c.id)}>{@html conceptName(c.id)}</span>: {STATE_WORD[c.from]} → {STATE_WORD[c.to]}</li>
        {/each}
      </ul>
    {:else}
      <p class="quiet">No concept changed its standing this round; the score you added to them is still building.</p>
    {/if}
    {#if upcoming.length}
      <div class="eyebrow">When these come round again</div>
      <ul class="due">
        {#each upcoming as u (u.id)}
          <li><span use:math={conceptName(u.id)}>{@html conceptName(u.id)}</span><span class="q">{when(u.at, u.now)}</span></li>
        {/each}
      </ul>
    {/if}
    {#if note}<p class="quiet">{note}</p>{/if}
    <div class="acts">
      <button type="button" class="btn go" onclick={begin}>Another round</button>
      <button type="button" class="btn" onclick={() => { practice.discard(); practice.choose(); }}>Change what to practise</button>
    </div>
    <p class="quiet total">{lifetimeLine}</p>
  </div>

{:else if practice.face === 'progress'}
  <div class="progress">
    <div class="presets">
      <div class="seg" role="radiogroup" aria-label="Which concepts to show">
        <button type="button" class:on={scope === 'curriculum'} role="radio" aria-checked={scope === 'curriculum'} onclick={() => (scope = 'curriculum')}>In my curriculum</button>
        <button type="button" class:on={scope === 'everything'} role="radio" aria-checked={scope === 'everything'} onclick={() => (scope = 'everything')}>Everything practised</button>
      </div>
    </div>
    <p class="sum">{lifetimeLine}{dueLine ? ` ${dueLine}` : ''}</p>
    {#if practice.attempts.length === 0}
      <p class="quiet">You have not answered anything yet; choose a section or a concept, practise it, and every point you earn is counted here.</p>
      <div class="acts"><button type="button" class="btn go" onclick={() => practice.choose()}>Choose what to practise</button></div>
    {:else}
      {#if groups.length === 0}
        <p class="quiet">{scope === 'curriculum' ? 'You have not chosen anything to practise yet, so there is nothing here to report on.' : 'Nothing you have answered has a concept attached to it yet.'}</p>
      {/if}
      {#each groups as g (g.state)}
        <div class="eyebrow">{STATE_WORD[g.state]}</div>
        {#each g.items as r (r.id)}
          <button type="button" class="row prow" title={rowTitle(r)} onclick={() => open(r)}>
            <i class="dot k-{r.kind}" aria-hidden="true"></i>
            <span class="lab"><span use:math={r.name}>{@html r.name}</span></span>
            <span class="track" title={barTitle(r.id, r.state)}><i class="fill st-{r.state}" style="width:{Math.round(r.bar * 100)}%"></i></span>
            <span class="chip st-{r.state}">{STATE_WORD[r.state]}</span>
            <span class="meta">{r.meta}</span>
          </button>
        {/each}
      {/each}
      {#if bookTotals.length}
        <div class="eyebrow">Book by book</div>
        <ul class="books">
          {#each bookTotals as b (b.id)}<li>{b.line}</li>{/each}
        </ul>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .choose,.practise,.summary,.progress{font-family:var(--sans);font-size:0.82rem;color:var(--ink);container-type:inline-size}
  /* the two tabs over the faces: the eyebrow's small capitals, and the face showing underlined in the accent */
  .faces{display:flex;gap:14px;margin:0 0 10px;border-bottom:1px solid var(--rule)}
  .tab{font-family:var(--sans);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--muted);background:none;border:0;border-bottom:2px solid transparent;padding:2px 0 5px;margin-bottom:-1px;cursor:pointer}
  .tab:hover{color:var(--ink)}
  .tab.on{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .quiet{color:var(--muted);margin:6px 0}
  .eyebrow{margin:10px 0 4px}
  .eyebrow.sec{margin:10px 0 2px;opacity:.85}
  .eyebrow.bk{margin:14px 0 0;font-weight:600}   /* which book the sections under it belong to, where the shelf holds more than one */
  .presets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .btn{font:inherit;font-size:0.78rem;font-weight:600;padding:4px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn:disabled{opacity:.5;cursor:default}
  .btn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .btn.go{border-color:var(--accent);color:var(--accent)}
  /* the tree and the concept list stand side by side where the pane has room for both, and stack where it has not */
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @container (max-width:700px){ .cols{grid-template-columns:1fr} }
  .pane{min-width:0}
  .find{width:100%;box-sizing:border-box;font:inherit;font-size:0.78rem;padding:4px 8px;margin:0 0 4px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink)}
  .find:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  /* one row of the tree: the box, the name, and what the row comes to, kept to the right so the counts line up */
  .row{display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:4px;cursor:pointer;min-width:0}
  .row:hover{background:var(--soft)}
  .row.off{cursor:default;color:var(--muted);opacity:.65}
  .row.off:hover{background:none}
  .row input{margin:0;flex:none;accent-color:var(--accent)}
  .row .lab{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .row .cnt{flex:none;color:var(--muted);font-size:0.7rem;font-variant-numeric:tabular-nums}
  .lvl-book{font-weight:600}
  .lvl-chapter{padding-left:16px}
  .lvl-section{padding-left:32px;color:var(--muted)}
  .lvl-section .lab{color:var(--ink)}
  .row.concept .lab :global(.katex),.row.prow .lab :global(.katex){font-size:0.95em}
  /* the kind's hue as a dot beside the name: the same three the concept map gives its shapes */
  .dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted)}
  .dot.k-idea{background:var(--cm-idea)}
  .dot.k-result{background:var(--cm-result)}
  .dot.k-skill{background:var(--cm-skill)}
  .chip{flex:none;font-size:0.65rem;padding:1px 6px;border-radius:9px;background:var(--soft);color:var(--muted);font-weight:600;letter-spacing:0.02em}
  .chip.st-practised{color:var(--accent)}
  .chip.st-mastered{color:var(--ok)}
  .chip.st-due{color:var(--warm)}
  .foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--rule)}
  .sum{margin:0 0 8px}
  .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  /* the strip over the session: where the reader is, what they have earned, and why this problem was drawn */
  .strip{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
  .strip .where{font-weight:600}
  .strip .points{color:var(--muted);font-variant-numeric:tabular-nums}
  .chip.why-review{color:var(--warm)}
  .chip.why-frontier{color:var(--accent)}
  .bars{display:flex;flex-direction:column;gap:3px;margin:8px 0}
  .bars .one{display:flex;align-items:center;gap:8px;min-width:0}
  .bars .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
  .track{flex:none;width:84px;height:5px;border-radius:3px;background:var(--soft2);overflow:hidden}
  .fill{display:block;height:100%;background:var(--muted)}
  .fill.st-practised{background:var(--accent)}
  .fill.st-mastered{background:var(--ok)}
  .fill.st-due{background:var(--warm)}
  .eyebrow.from{margin:8px 0 0;opacity:.85}
  .card-root{margin:6px 0 2px}
  .moved,.due{list-style:none;margin:0;padding:0}
  .moved li,.due li{padding:2px 0;display:flex;gap:8px;align-items:baseline;min-width:0}
  .due .q{color:var(--muted);margin-left:auto;flex:none}
  .total{margin-top:12px;padding-top:8px;border-top:1px solid var(--rule)}
  /* the segmented pair the settings use, for a choice of two that is not a checkbox */
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .seg button{font:inherit;font-size:0.78rem;padding:4px 12px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button+button{border-left:1px solid var(--rule)}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:600}
  .seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  /* one concept's standing, on a row that is a button: the bar, the word for the state, and the small print about the streak, the last answer and the next review */
  .row.prow{width:100%;box-sizing:border-box;font:inherit;font-size:inherit;text-align:left;background:none;border:0;color:inherit}
  .row.prow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row.prow .meta{flex:none;color:var(--muted);font-size:0.7rem;font-variant-numeric:tabular-nums}
  @container (max-width:520px){ .row.prow{flex-wrap:wrap} .row.prow .lab{flex:1 1 70%;white-space:normal} .row.prow .meta{display:none} }   /* in a narrow box the name takes a line of its own and the bar drops under it */
  .books{list-style:none;margin:0;padding:0;color:var(--muted)}
  .books li{padding:2px 0;font-variant-numeric:tabular-nums}
  /* a page has room for the reading size the rest of the views take in one */
  :global(.view-pane) .choose,:global(.view-pane) .practise,:global(.view-pane) .summary,:global(.view-pane) .progress{font-size:0.95rem;max-width:900px;margin:0 auto}
  :global(.view-pane) .faces{max-width:900px;margin:0 auto 12px}
  :global(.view-pane) .tab{font-size:0.8rem}
  :global(.view-pane) .seg button{font-size:0.85rem}
  :global(.view-pane) .row.prow .meta{font-size:0.78rem}
  :global(.view-pane) .btn{font-size:0.85rem;padding:5px 12px}
  :global(.view-pane) .find{font-size:0.85rem}
  :global(.view-pane) .row .cnt{font-size:0.78rem}
  :global(.view-pane) .chip{font-size:0.7rem}
  :global(.view-pane) .track{width:120px;height:6px}
</style>
