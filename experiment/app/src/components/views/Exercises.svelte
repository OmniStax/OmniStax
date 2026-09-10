<script lang="ts">
  /* Practice, as a curriculum rather than as a page of problems. The view has
     three faces and the store remembers which one is showing, so closing the tab
     and opening it again puts the reader back where they were.

     On the first face the reader says what they want to practise: rows of the
     book — the book itself, its chapters, its sections — each a checkbox that
     stands for a pick, and beside them every concept those chapters teach, so a
     reader who wants one idea rather than one section can say so. A row is
     checked when its own pick is in the curriculum or when everything under it
     is, and half-checked when only some of it is, which is the rule a file tree
     uses. The foot adds the choice up in a sentence and draws a session from it.

     On the second face the session runs one exercise at a time in the ordinary
     card, standing alone as it does in a tab of its own. The card records the
     answer into the store by itself; this face only watches for it, so that Next
     arrives when the problem has been answered and not before. The third face is
     the reckoning: what was earned, which concepts moved, and when the ones just
     practised come round again. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { sectionId, conceptId } from '../../lib/types/ids';
  import type { ChapterEntry, SectionEntry } from '../../lib/content/schema';
  import { math } from '../actions/math';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { conceptsOf, decayed, dueAt, samePick, total, type Pick, type State } from '../../lib/practice/model';

  /* Phase one is the book the reader has open; everything the store keeps is
     keyed by book already, so nothing here has to change when the rest of the
     library joins in. */
  const book = $derived(registry.manifest.id);
  const cat = $derived(practice.catalog());
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

  const bookPick = (): Pick => ({ book });
  const chapPick = (c: ChapterEntry): Pick => ({ book, chapter: c.id });
  const secPick = (s: SectionEntry): Pick => ({ book, section: sectionId(s.id) });
  const conceptPick = (id: string): Pick => ({ concept: conceptId(id) });
  const has = (p: Pick): boolean => practice.curriculum.some((q) => samePick(q, p));
  /* A section is in the curriculum on its own account or through the chapter or
     the book above it; a chapter is in it when every section it has built is. */
  const secOn = (c: ChapterEntry, s: SectionEntry): boolean => has(bookPick()) || has(chapPick(c)) || has(secPick(s));
  const chapOn = (c: ChapterEntry): boolean => { const b = builtOf(c); return has(bookPick()) || has(chapPick(c)) || (b.length > 0 && b.every((s) => secOn(c, s))); };
  const chapSome = (c: ChapterEntry): boolean => builtOf(c).some((s) => secOn(c, s));
  const bookOn = $derived(has(bookPick()) || (chapters.length > 0 && chapters.every((c) => chapOn(c))));
  const bookSome = $derived(!bookOn && chapters.some((c) => chapSome(c)));

  /* What a pick comes to: the concepts it holds, how many of them are waiting
     for review, and how many problems in the book test any of them. */
  type Sum = { readonly concepts: number; readonly due: number; readonly exercises: number };
  const sumOf = (picks: readonly Pick[]): Sum => {
    const ids = conceptsOf(picks, cat);
    let due = 0;
    ids.forEach((id) => { if (practice.stateOf(id) === 'due') due += 1; });
    return { concepts: ids.size, due, exercises: cat.exercises.filter((e) => e.ex.concepts.some((c) => ids.has(c))).length };
  };
  const countLine = (s: Sum): string => `${s.concepts} · ${s.exercises}${s.due ? ` · ${s.due} due` : ''}`;
  const countTitle = (s: Sum): string =>
    s.concepts === 0 ? 'Nothing here has a concept attached to it yet.'
      : `${s.concepts === 1 ? 'One concept' : `${s.concepts} concepts`}, ${s.exercises === 1 ? 'one problem' : `${s.exercises} problems`}, and ${
        s.due === 0 ? 'nothing due for review' : s.due === 1 ? 'one of them due for review' : `${s.due} of them due for review`}.`;

  /* The concept list: everything the loaded chapters teach that the book itself
     states, in the order the book states it, narrowed by what is typed above. */
  let q = $state('');
  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/<[^>]*>/g, ' ');
  const conceptGroups = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    const order = chapters.flatMap((c) => c.sections.map((s) => s.id));
    const kept = cat.concepts.filter((c) => !c.placeholder && (!needle || plain(c.name).toLowerCase().includes(needle) || c.id.includes(needle)));
    const by = new Map<string, typeof kept>();
    kept.forEach((c) => { const g = by.get(c.section); if (g) g.push(c); else by.set(c.section, [c]); });
    return [...by.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([section, items]) => ({ section, title: registry.entry(sectionId(section))?.title ?? '', items }));
  });
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
  $effect(() => { if (pending && !cur) registry.load(pending.section).catch(() => {}); });
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

  const conceptName = (id: string): string => registry.concept(id)?.name ?? id;
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
  const lifetime = $derived(total(practice.mastery));
</script>

{#snippet stateChip(id: string)}
  {@const s = practice.stateOf(id)}
  {#if s !== 'untouched'}<span class="chip st-{s}">{STATE_WORD[s]}</span>{/if}
{/snippet}

{#if practice.face === 'choose'}
  <div class="choose">
    {#if loading}<p class="quiet">Loading the book’s problems…</p>{/if}
    <div class="presets">
      <button type="button" class="btn" onclick={() => replace([{ book, section: here }])}>This section</button>
      <button type="button" class="btn" disabled={!hereChapter} onclick={() => hereChapter && replace([chapPick(hereChapter)])}>This chapter</button>
      <button type="button" class="btn" onclick={() => replace([bookPick()])}>This book</button>
      <button type="button" class="btn" disabled={dueNow.length === 0}
        title={dueNow.length === 0 ? 'Nothing is waiting for review at the moment.' : 'The concepts whose score has faded below the threshold since you last practised them.'}
        onclick={() => replace(dueNow.map((c) => conceptPick(c.id)))}>Everything due</button>
      <button type="button" class="btn" disabled={practice.curriculum.length === 0} onclick={() => practice.clear()}>Clear</button>
    </div>

    <div class="cols">
      <div class="pane">
        <div class="eyebrow">The book</div>
        <label class="row lvl-book">
          <input type="checkbox" checked={bookOn} use:tri={bookSome} onchange={() => practice.toggle(bookPick())}>
          <span class="lab">{registry.manifest.title || 'This book'}</span>
          <span class="cnt" title={countTitle(sumOf([bookPick()]))}>{countLine(sumOf([bookPick()]))}</span>
        </label>
        {#each chapters as c (c.id)}
          {@const on = chapOn(c)}
          <label class="row lvl-chapter">
            <input type="checkbox" checked={on} use:tri={!on && chapSome(c)} onchange={() => practice.toggle(chapPick(c))}>
            <span class="lab">{c.id} · {c.title}</span>
            <span class="cnt" title={countTitle(sumOf([chapPick(c)]))}>{countLine(sumOf([chapPick(c)]))}</span>
          </label>
          {#each c.sections as s (s.id)}
            {#if s.built}
              <label class="row lvl-section">
                <input type="checkbox" checked={secOn(c, s)} onchange={() => practice.toggle(secPick(s))}>
                <span class="lab">{s.id} · {s.title}</span>
                <span class="cnt" title={countTitle(sumOf([secPick(s)]))}>{countLine(sumOf([secPick(s)]))}</span>
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
      </div>

      <div class="pane">
        <div class="eyebrow">The concepts</div>
        <input class="find" type="search" placeholder="Narrow the concepts…" aria-label="Narrow the concepts by name" bind:value={q}>
        {#if conceptGroups.length === 0}
          <p class="quiet">{loading ? 'The concepts are still loading.' : q.trim() ? 'No concept of this book is named that.' : 'This book lists no concepts yet.'}</p>
        {/if}
        {#each conceptGroups as g (g.section)}
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
      {#key `${cur.section}/${cur.ex.id}/${at}`}
        <div class="card-root" data-sec={cur.section} data-chapter={registry.chapterOf(cur.section)?.dir ?? ''} data-one="1" bind:this={root}>
          <ExerciseCard section={cur.section} ex={cur.ex} standalone />
        </div>
      {/key}
    {:else}
      <p class="quiet">Loading the section this problem comes from…</p>
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
    <p class="quiet total">You have earned {lifetime === 1 ? 'one point' : `${lifetime} points`} in all.</p>
  </div>
{/if}

<style>
  .choose,.practise,.summary{font-family:var(--sans);font-size:0.82rem;color:var(--ink);container-type:inline-size}
  .quiet{color:var(--muted);margin:6px 0}
  .eyebrow{margin:10px 0 4px}
  .eyebrow.sec{margin:10px 0 2px;opacity:.85}
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
  .row.concept .lab :global(.katex){font-size:0.95em}
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
  .bars .track{flex:none;width:84px;height:5px;border-radius:3px;background:var(--soft2);overflow:hidden}
  .bars .fill{display:block;height:100%;background:var(--muted)}
  .bars .fill.st-practised{background:var(--accent)}
  .bars .fill.st-mastered{background:var(--ok)}
  .bars .fill.st-due{background:var(--warm)}
  .card-root{margin:6px 0 2px}
  .moved,.due{list-style:none;margin:0;padding:0}
  .moved li,.due li{padding:2px 0;display:flex;gap:8px;align-items:baseline;min-width:0}
  .due .q{color:var(--muted);margin-left:auto;flex:none}
  .total{margin-top:12px;padding-top:8px;border-top:1px solid var(--rule)}
  /* a page has room for the reading size the rest of the views take in one */
  :global(.view-pane) .choose,:global(.view-pane) .practise,:global(.view-pane) .summary{font-size:0.95rem;max-width:900px;margin:0 auto}
  :global(.view-pane) .btn{font-size:0.85rem;padding:5px 12px}
  :global(.view-pane) .find{font-size:0.85rem}
  :global(.view-pane) .row .cnt{font-size:0.78rem}
  :global(.view-pane) .chip{font-size:0.7rem}
  :global(.view-pane) .bars .track{width:120px;height:6px}
</style>
