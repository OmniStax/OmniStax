<script lang="ts">
  /* Practice, as a course of study rather than as a page of problems.

     Four faces, under two tabs. The dashboard is where a fresh view opens and
     what the Dashboard tab goes back to: the standing in three tiles, every
     session still running anywhere in the shell, a year of days coloured by
     what each one earned, and a row for every book on the shelf whose
     breakdown opens under it. Nothing on it is a paragraph — it is meant to be
     read at a glance and clicked through.

     The Practice tab leads to the three faces of the practising itself. On the
     first the reader says what to practise: presets for the obvious answers,
     the picks so far as chips, a tree of books, chapters and sections whose
     boxes are half-checked the way a file tree's are, and a search for a single
     concept. On the second the session runs one exercise at a time in the
     ordinary card, standing alone as it does in a tab of its own; the card
     records the answer into the store by itself, so Next arrives when the
     problem has been answered and not before. The third is the reckoning: what
     was earned, and which concepts moved.

     A session belongs to the store rather than to this page: pausing one leaves
     it standing, closing its tab leaves it standing, and any dashboard offers
     it back. So this view holds only what is properly a tab's own — the picks
     being made, the face showing, the shuffle, and which book's breakdown is
     open.

     How a concept stands is drawn one way everywhere: a mastery box, a small
     rounded square outlined in the colour of the state and filled from the
     bottom by how far the decayed score stands towards the threshold. The
     breakdown rows, the bars beside the running exercise, the concept search
     and the legend of the book bars all wear it, so the reader learns one
     picture and reads it in four places. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { library } from '../../lib/explorer/library.svelte';
  import { sectionId, conceptId, type SectionId } from '../../lib/types/ids';
  import type { BookManifest, ChapterEntry, SectionEntry } from '../../lib/content/schema';
  import { math } from '../actions/math';
  import ExerciseCard from '../exercises/ExerciseCard.svelte';
  import { practice } from '../../lib/practice/store.svelte';
  import { openSession } from '../../lib/practice/open.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { activate, groupsWith, type ItemKey } from '../../lib/layout/model';
  import {
    DAY, conceptsOf, dueAt, fillOf, heatWeeks, pointsByBook, pointsByDay, samePick, standingOf, streakOf,
    type Curriculum, type Pick, type SessionId, type Standing, type State, poolOf,
  } from '../../lib/practice/model';

  /* Practice is per page: the tab's own key says which curriculum, which
     session and which face this one stands on, so a second practice view is a
     second course of study rather than the same one twice. */
  let { item }: { item: string } = $props();
  const page = $derived(practice.page(item));

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
  const chapterOf = (id: string, ch: string): ChapterEntry | undefined => chaptersOf(id).find((c) => c.id === ch || c.dir === ch);
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

  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/<[^>]*>/g, ' ');
  const conceptName = (id: string): string => practice.conceptOf(id)?.name ?? id;
  const conceptKind = (id: string): string => practice.conceptOf(id)?.kind ?? '';
  /* The reader's words are American, whatever the code calls the state. */
  const STATE_WORD: Readonly<Record<State, string>> = { untouched: 'untouched', practised: 'practiced', mastered: 'mastered', due: 'due' };
  const points = (n: number): string => (n === 1 ? 'one point' : `${n} points`);

  /* ---------- the two tabs ---------- */

  /* The dashboard is one tab; the choosing, the session and its reckoning are
     the other. The Practice tab goes back to a session still running, and
     otherwise to the choice. */
  const onDash = $derived(page.face === 'dashboard');
  const toPractise = (): void => { if (practice.live(item)) practice.resume(item); else practice.choose(item); };

  /* ---------- choosing ---------- */

  const bookPick = (id: string): Pick => ({ book: id });
  const chapPick = (id: string, c: ChapterEntry): Pick => ({ book: id, chapter: c.id });
  const secPick = (id: string, s: SectionEntry): Pick => ({ book: id, section: sectionId(s.id) });
  const conceptPick = (id: string): Pick => ({ concept: conceptId(id) });
  const has = (p: Pick): boolean => page.curriculum.some((q) => samePick(q, p));
  /* A section is in the curriculum on its own account or through the chapter or
     the book above it; a chapter is in it when every section it has built is. */
  const secOn = (id: string, c: ChapterEntry, s: SectionEntry): boolean => has(bookPick(id)) || has(chapPick(id, c)) || has(secPick(id, s));
  const chapOn = (id: string, c: ChapterEntry): boolean => { const b = builtOf(c); return has(bookPick(id)) || has(chapPick(id, c)) || (b.length > 0 && b.every((s) => secOn(id, c, s))); };
  const chapSome = (id: string, c: ChapterEntry): boolean => builtOf(c).some((s) => secOn(id, c, s));
  const bookOn = (id: string): boolean => { const ch = chaptersOf(id); return has(bookPick(id)) || (ch.length > 0 && ch.every((c) => chapOn(id, c))); };
  const bookSome = (id: string): boolean => !bookOn(id) && chaptersOf(id).some((c) => chapSome(id, c));

  /* What a pick comes to: the concepts it holds, how many of them are waiting
     for review, and how many problems in the library test any of them. The tree
     no longer sets this out in a column of its own — it is what the row says
     when the pointer rests on it. */
  type Sum = { readonly concepts: number; readonly due: number; readonly exercises: number };
  const sumOf = (picks: readonly Pick[]): Sum => {
    const ids = conceptsOf(picks, cat);
    let due = 0;
    ids.forEach((id) => { if (practice.stateOf(id) === 'due') due += 1; });
    return { concepts: ids.size, due, exercises: poolOf(picks, cat).length };
  };
  const countTitle = (s: Sum): string =>
    s.concepts === 0 ? 'Nothing here has a concept attached to it yet.'
      : `${s.concepts === 1 ? 'One concept' : `${s.concepts} concepts`}, ${s.exercises === 1 ? 'one problem' : `${s.exercises} problems`}, and ${
        s.due === 0 ? 'nothing due for review' : s.due === 1 ? 'one of them due for review' : `${s.due} of them due for review`}.`;

  /* The tree opens book by book and stays folded at the chapters, which is what
     keeps a shelf of long books readable; which chapters this view has opened
     is its own, and is not worth keeping past the reading. */
  let open = $state<readonly string[]>([]);
  const isOpen = (id: string, c: ChapterEntry): boolean => open.includes(`${id}/${c.id}`);
  const toggleOpen = (id: string, c: ChapterEntry): void => { const k = `${id}/${c.id}`; open = open.includes(k) ? open.filter((x) => x !== k) : [...open, k]; };

  /* The picks as they stand, each one able to take itself out again. */
  const pickLabel = (p: Pick): string => {
    if ('concept' in p) return conceptName(String(p.concept));
    if (p.section) { const t = sectionTitle(p.book, p.section); return t ? `${p.section} · ${t}` : String(p.section); }
    if (p.chapter) { const c = chapterOf(p.book, p.chapter); return c ? `${c.id} · ${c.title}` : p.chapter; }
    return bookTitle(p.book);
  };

  /* The concept search: a reader who wants one idea rather than one section
     names it, and ticks it out of what the shelf turns up. The list is capped,
     since a needle of one letter matches most of a library. */
  const FOUND = 40;
  let q = $state('');
  const found = $derived.by(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return shelf.flatMap((id) => practice.conceptsIn(id)
      .filter((c) => c.status === 'built' && (plain(c.name).toLowerCase().includes(needle) || c.id.includes(needle)))
      .map((c) => ({ c, book: id })))
      .slice(0, FOUND);
  });
  /* A concept is checked when the reader named it, and half-checked when a
     section or a chapter they picked brings it in. */
  const curriculumConcepts = $derived(conceptsOf(page.curriculum, cat));

  /* The presets replace the choice rather than adding to it, which is what makes
     them a quick way back to a clean start. */
  const here = $derived(focus.section);
  const hereChapter = $derived(registry.chapterOf(here));
  const dueNow = $derived(cat.concepts.filter((c) => c.status === 'built' && practice.stateOf(c.id) === 'due'));

  const choice = $derived(sumOf(page.curriculum));
  /* The number beside Practice is what this choice can give, never more than
     the session size the reader keeps in Settings; stepping it writes that
     setting, so it holds from one choice to the next, and it cannot be stepped
     past what the choice holds — that is the number the button says. */
  const size = $derived(Math.min(practice.settings.session, choice.exercises));
  const setSize = (n: number): void => practice.setSetting('session', Math.max(1, Math.min(50, n)));
  const stepTitle = $derived(
    choice.exercises === 0 ? 'How many exercises a session draws.'
      : practice.settings.session > choice.exercises ? `How many exercises a session draws. Your session size is ${practice.settings.session}, but this choice holds only ${choice.exercises}.`
        : 'How many exercises a session draws.');
  const choiceLine = $derived(
    page.curriculum.length === 0 ? 'You have not chosen anything to practice yet.'
      : `${choice.concepts === 1 ? '1 concept' : `${choice.concepts} concepts`}, ${
        choice.due === 0 ? 'none of them due' : choice.due === 1 ? '1 of them due' : `${choice.due} of them due`}, in ${
        choice.exercises === 1 ? '1 exercise' : `${choice.exercises} exercises`}.`,
  );
  const why = $derived(
    page.curriculum.length === 0 ? 'Tick a chapter, a section or a concept above, and a session will be drawn from what you tick.'
      : choice.exercises === 0 ? 'Nothing you have chosen has a problem attached to it yet. Choose another part of the book, or one of its concepts.'
        : '',
  );
  let note = $state('');
  const NOTHING = 'There is nothing left to draw on just now. Choose more of the book, or come back when the last answers have had time to fade.';
  const begin = (): void => { note = practice.start(item) ? '' : NOTHING; };

  /* ---------- practising ---------- */

  /* The card writes the answer into the store; this face reads the store back,
     so Next arrives the moment the answer is recorded, however the card came to
     record it. The drawn list is read live rather than held, since a shuffled
     round rewrites the slots the reader has not reached yet. */
  const session = $derived(practice.sessionOf(item));
  const at = $derived(session?.at ?? 0);
  const drawn = $derived(session?.drawn ?? []);
  const cur = $derived(practice.current(item));
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

  /* Ending a round early is asked about first, in a strip that takes the place
     of the buttons rather than in a dialog the browser draws. The question is
     dropped the moment the reader moves on by any other way. */
  let ending = $state(false);
  $effect(() => { at; page.face; ending = false; });

  const boxTitle = (id: string, s: State): string =>
    s === 'untouched' ? 'You have not answered anything on this concept yet.'
      : s === 'mastered' ? 'You have mastered this one; the box shows how much of its score is left.'
        : s === 'due' ? 'This one has faded below the threshold and is waiting for a review.'
          : `The box is how far your score on this concept stands towards the ${practice.settings.threshold} points that count as mastery.`;

  /* ---------- the reckoning ---------- */

  const changed = $derived(page.face === 'summary' ? practice.changed(item) : []);
  const done = $derived(drawn.filter((_, i) => session?.answered[i] === true).length);
  const skipped = $derived(drawn.length - done);
  const earnedLine = (n: number): string => (n === 0 ? 'You earned no points this round.' : n === 1 ? 'You earned one point this round.' : `You earned ${n} points this round.`);
  const workLine = $derived(
    skipped === 0 ? `You answered ${drawn.length === 1 ? 'the one problem' : `all ${drawn.length} problems`} it drew.`
      : done === 0 ? `You skipped ${drawn.length === 1 ? 'it' : 'all of them'}.`
        : `You answered ${done} of the ${drawn.length} problems and skipped ${skipped === 1 ? 'the other one' : `the other ${skipped}`}.`,
  );

  /* ---------- the dashboard ---------- */

  /* The calendar is fixed as the view opens: a heatmap that slid a day forward
     under the reader would be a stranger thing than one that is a day stale. */
  const opened = Date.now();
  const weeks = heatWeeks(opened);
  const byDay = $derived(pointsByDay(practice.attempts));
  const streak = $derived(streakOf(practice.attempts, Date.now()));
  const byBook = $derived(pointsByBook(practice.attempts));
  /* Five depths over the empty cell, so a day of steady work and a day of a
     great deal of it are told apart without a legend. */
  const depth = (day: string): number => { const n = byDay[day] ?? 0; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : n < 15 ? 4 : 5; };
  const dayTitle = (day: string): string => `${day} · ${byDay[day] ? points(byDay[day]) : 'no points'}`;
  /* Today stands at the right edge, which is where the reader looks first; in a
     pane too narrow for the year the rest is scrolled back to. */
  let heat = $state<HTMLElement | null>(null);
  $effect(() => { if (heat) heat.scrollLeft = heat.scrollWidth; });

  /* Every session still running anywhere in the shell, this page's included: it
     is the store that keeps them now, so one whose tab was closed is listed all
     the same and can be taken up here. */
  const running = $derived(practice.liveSessions());
  const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const raise = (key: ItemKey): void => {
    if (key === item) { practice.resume(item); return; }
    const g = groupsWith(layoutStore.layout, key)[0];
    if (g !== undefined) layoutStore.apply((l) => activate(l, g, key));
  };
  /* Taking a card up. A session its own tab is still showing is reached by
     raising that tab; one whose tab has been closed is taken onto this page
     when this page has nothing running, and into a page of its own when it
     has, so a round in hand is never pushed aside by one picked up. */
  const takeUp = (id: SessionId, key: ItemKey | null): void => {
    if (key !== null) { raise(key); return; }
    if (!practice.live(item)) { practice.attach(item, id); return; }
    const g = groupsWith(layoutStore.layout, item)[0];
    if (g !== undefined) openSession(id, g);
  };
  const cardTitle = (key: ItemKey | null): string =>
    key === item ? 'Back to the session running in this view.'
      : key !== null ? 'Raise the view this session is running in.'
        : 'Take this session up again. The tab it was running in has been closed.';
  const whereWord = (key: ItemKey | null): string => (key === item ? 'this view' : key !== null ? 'another view' : 'not open in any tab');

  /* What a session tests, for the card's popover: the picks it was drawn from,
     as the Choose face sets them out but without the boxes to tick. A session
     drawn from everything due can hold a great many concepts, so the list is
     capped and says how many it did not name. */
  type PeekRow = { readonly level: 'book' | 'chapter' | 'section' | 'concept'; readonly label: string; readonly kind: string };
  const PEEK = 12;
  const peekRows = (cur: Curriculum): readonly PeekRow[] => {
    const rows: PeekRow[] = [];
    const places = cur.flatMap((p) => ('concept' in p ? [] : [p]));
    [...new Set(places.map((p) => p.book))].forEach((b) => {
      rows.push({ level: 'book', label: bookTitle(b), kind: '' });
      places.filter((p) => p.book === b).forEach((p) => {
        if (p.section) { const t = sectionTitle(b, p.section); rows.push({ level: 'section', label: t ? `${p.section} · ${t}` : String(p.section), kind: '' }); return; }
        if (p.chapter) { const c = chapterOf(b, p.chapter); rows.push({ level: 'chapter', label: c ? `${c.id} · ${c.title}` : p.chapter, kind: '' }); }
      });
    });
    cur.forEach((p) => { if ('concept' in p) rows.push({ level: 'concept', label: conceptName(String(p.concept)), kind: conceptKind(String(p.concept)) }); });
    return rows;
  };
  /* The card under the pointer, or the one holding the keyboard focus: one
     popover at a time, drawn by this component under the card it belongs to. */
  let peek = $state<SessionId | null>(null);

  const reviewDue = (): void => { note = practice.startDue(item) ? '' : NOTHING; };

  /* A book's standing is counted over the concepts it teaches and has built,
     which for the book being read is the registry's and for any other is what
     the cache fetched, each concept counted once. */
  const standing = (id: string): Standing => standingOf(practice.conceptsIn(id), practice.mastery, practice.settings, Date.now());
  const totalOf = (s: Standing): number => s.mastered + s.practised + s.due + s.untouched;
  const share = (n: number, of: number): number => (of === 0 ? 0 : (n / of) * 100);
  const standTitle = (id: string, s: Standing): string => {
    const n = totalOf(s);
    if (n === 0) return statusOf(id) === 'failed' ? 'This book could not be loaded, so its concepts cannot be counted.' : 'Its concepts have not arrived yet.';
    return `${s.mastered} mastered, ${s.practised} practiced, ${s.due} due, ${s.untouched} untouched.`;
  };

  /* ---------- one book's breakdown, under its row ---------- */

  /* Which book stands open is the page's, so a fetch finishing or an answer
     recorded does not fold it again. */
  const openBook = $derived(page.book ?? null);
  const STATES: readonly State[] = ['due', 'practised', 'mastered', 'untouched'];
  type Row = { readonly id: string; readonly name: string; readonly kind: string; readonly state: State; readonly bar: number; readonly at: number | null; readonly meta: string };

  const ago = (t: number, now: number): string => {
    const days = Math.round((now - t) / DAY);
    return days <= 0 ? 'last practiced today' : days === 1 ? 'last practiced yesterday' : `last practiced ${days} days ago`;
  };
  const inARow = (n: number): string => (n <= 0 ? '' : n === 1 ? 'one day in a row' : `${n} days in a row`);
  const nextUp = (t: number, now: number): string => {
    if (t <= now) return 'now';
    const days = Math.round((t - now) / DAY);
    return days <= 0 ? 'later today' : days === 1 ? 'in a day' : `in ${days} days`;
  };
  const rows = $derived.by((): readonly Row[] => {
    if (page.face !== 'dashboard' || !openBook) return [];
    const now = Date.now();
    return practice.conceptsIn(openBook).filter((c) => c.status === 'built').map((c): Row => {
      const r = practice.mastery[c.id], st = practice.stateOf(c.id, now);
      const t = r ? dueAt(r, practice.settings) : null;
      return {
        id: c.id, name: c.name, kind: c.kind, state: st, bar: practice.share(c.id, now), at: t,
        meta: [inARow(r?.days ?? 0), r && r.earned > 0 ? ago(r.lastAt, now) : '', t !== null && (st === 'mastered' || st === 'due') ? `due ${nextUp(t, now)}` : ''].filter(Boolean).join(' · '),
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
  const groups = $derived(
    STATES.flatMap((st) => { const items = rows.filter((r) => r.state === st).sort(ORDER[st]); return items.length ? [{ state: st, items }] : []; }),
  );
  const bookLine = $derived.by(() => {
    if (!openBook) return '';
    const earned = byBook[openBook] ?? 0;
    const due = rows.filter((r) => r.state === 'due').length;
    const first = earned === 0 ? 'You have earned nothing in this book yet.' : `You have earned ${points(earned)} in this book.`;
    return due === 0 ? first : `${first} ${due === 1 ? 'One of its concepts is due now.' : `${due} of its concepts are due now.`}`;
  });
</script>

<!-- One concept's standing, drawn the same way wherever it is shown: a square
     outlined in the colour of the state and filled from the bottom by how far
     the score stands towards the threshold. -->
{#snippet box(st: State, sh: number, title: string)}
  <i class="mbox st-{st}" class:hi={st === 'practised' && sh >= 0.5} style:--fill="{Math.round(fillOf(st, sh) * 100)}%" role="img" aria-label={STATE_WORD[st]} {title}></i>
{/snippet}
{#snippet masteryBox(id: string)}
  {@const st = practice.stateOf(id)}
  {@render box(st, practice.share(id), boxTitle(id, st))}
{/snippet}

<div class="faces">
  <button type="button" class="tab" class:on={onDash} aria-current={onDash ? 'true' : undefined} onclick={() => practice.dashboard(item)}>Dashboard</button>
  <button type="button" class="tab" class:on={!onDash} aria-current={!onDash ? 'true' : undefined} onclick={toPractise}>Practice</button>
</div>

{#if page.face === 'dashboard'}
  <div class="dash">
    <div class="tiles">
      <div class="tile"><b>{streak}</b><span>{streak === 1 ? 'day in a row' : 'days in a row'}</span></div>
      <div class="tile"><b>{practice.lifetime}</b><span>{practice.lifetime === 1 ? 'point in all' : 'points in all'}</span></div>
      <div class="tile"><b>{practice.due.length}</b><span>due for review</span></div>
    </div>
    <div class="acts">
      <button type="button" class="btn go" disabled={practice.due.length === 0}
        title={practice.due.length === 0 ? 'Nothing is waiting for review at the moment.' : 'Draw a session from the concepts whose score has faded below the threshold.'}
        onclick={reviewDue}>Review {practice.due.length} due</button>
      <button type="button" class="btn" onclick={() => practice.choose(item)}>Choose what to practice</button>
    </div>
    {#if note}<p class="quiet">{note}</p>{/if}

    {#if running.length}
      <section class="panel">
        <h3 class="head">Still running</h3>
        <div class="cards">
          {#each running as r (r.session.id)}
            <div class="cardwrap"
              onmouseenter={() => (peek = r.session.id)} onmouseleave={() => (peek = null)}
              onfocusin={() => (peek = r.session.id)} onfocusout={() => (peek = null)}>
              <button type="button" class="card" title={cardTitle(r.key)} onclick={() => takeUp(r.session.id, r.key)}>
                <span class="l">{when.format(r.session.started)}</span>
                <span class="k">Exercise {Math.min(r.session.at + 1, r.session.drawn.length)} of {r.session.drawn.length} · {points(r.session.earned)}</span>
                <span class="k where">{whereWord(r.key)}</span>
              </button>
              {#if peek === r.session.id}
                {@const list = peekRows(r.session.curriculum)}
                <div class="pop">
                  <div class="eyebrow">What this session tests</div>
                  {#if list.length === 0}
                    <p class="quiet">Everything this session drew on has since been taken out of its curriculum.</p>
                  {/if}
                  {#each list.slice(0, PEEK) as row, i (i)}
                    <div class="peek lvl-{row.level}">
                      {#if row.level === 'concept'}<i class="dot k-{row.kind}" aria-hidden="true"></i>{/if}
                      <span class="lab"><span use:math={row.label}>{@html row.label}</span></span>
                    </div>
                  {/each}
                  {#if list.length > PEEK}<p class="quiet">and {list.length - PEEK} more</p>{/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <section class="panel">
      <h3 class="head">The year</h3>
      <div class="heat" bind:this={heat}>
        <div class="weeks">
          {#each weeks as w, i (i)}
            <div class="week">
              {#each w as day, d (d)}
                {#if day}<i class="cell" data-d={depth(day)} title={dayTitle(day)}></i>{:else}<i class="cell ahead"></i>{/if}
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 class="head">Book Progress</h3>
      <div class="key">
        <span>{@render box('mastered', 1, 'A concept you have mastered.')}mastered</span>
        <span>{@render box('practised', 0.6, 'A concept you have begun and not yet mastered.')}practiced</span>
        <span>{@render box('due', 0.4, 'A concept whose score has faded below the threshold.')}due</span>
        <span>{@render box('untouched', 0, 'A concept you have not answered anything on yet.')}untouched</span>
      </div>
      {#each shelf as b (b)}
        {@const st = standing(b)}
        {@const n = totalOf(st)}
        {@const shown = openBook === b}
        <button type="button" class="brow" class:open={shown} aria-expanded={shown} title={standTitle(b, st)} onclick={() => practice.expand(item, b)}>
          <span class="twist" aria-hidden="true">▸</span>
          <span class="lab">{bookTitle(b)}</span>
          <span class="stack" aria-hidden="true">
            <i class="seg st-mastered" style="width:{share(st.mastered, n)}%"></i>
            <i class="seg st-practised" style="width:{share(st.practised, n)}%"></i>
            <i class="seg st-due" style="width:{share(st.due, n)}%"></i>
            <i class="seg st-untouched" style="width:{share(st.untouched, n)}%"></i>
          </span>
          <span class="pts">{byBook[b] ?? 0}</span>
        </button>
        {#if shown}
          <div class="breakdown">
            <p class="sum">{bookLine}</p>
            {#if rows.length === 0}
              <p class="quiet">{statusOf(b) === 'failed' ? 'This book could not be loaded, so its concepts cannot be listed.' : 'The concepts of this book have not arrived yet.'}</p>
            {/if}
            {#each groups as g (g.state)}
              <div class="eyebrow">{STATE_WORD[g.state]}</div>
              {#each g.items as r (r.id)}
                <div class="row prow" tabindex="0" data-concept={r.id}>
                  {@render masteryBox(r.id)}
                  <i class="dot k-{r.kind}" aria-hidden="true"></i>
                  <span class="lab"><span use:math={r.name}>{@html r.name}</span></span>
                  <span class="meta">{r.meta}</span>
                </div>
              {/each}
            {/each}
          </div>
        {/if}
      {/each}
    </section>
  </div>

{:else if page.face === 'choose'}
  <div class="choose">
    {#if loading}<p class="quiet">Loading the book’s problems…</p>{/if}
    <div class="presets">
      <button type="button" class="btn" onclick={() => practice.replace(item, [{ book, section: here }])}>This section</button>
      <button type="button" class="btn" disabled={!hereChapter} onclick={() => hereChapter && practice.replace(item, [chapPick(book, hereChapter)])}>This chapter</button>
      <button type="button" class="btn" onclick={() => practice.replace(item, [bookPick(book)])}>This book</button>
      <button type="button" class="btn" disabled={dueNow.length === 0}
        title={dueNow.length === 0 ? 'Nothing is waiting for review at the moment.' : 'The concepts whose score has faded below the threshold since you last practised them.'}
        onclick={() => practice.replace(item, dueNow.map((c) => conceptPick(c.id)))}>Everything due</button>
      <button type="button" class="btn" disabled={page.curriculum.length === 0} onclick={() => practice.clear(item)}>Clear</button>
    </div>

    {#if page.curriculum.length}
      <div class="chips">
        {#each page.curriculum as p, i (i)}
          <span class="pick">
            <span class="lab"><span use:math={pickLabel(p)}>{@html pickLabel(p)}</span></span>
            <button type="button" class="x" aria-label="Take this out of the curriculum" title="Take this out" onclick={() => practice.toggle(item, p)}>×</button>
          </span>
        {/each}
      </div>
    {/if}

    <div class="tree">
      {#each shelf as b (b)}
        {@const on = bookOn(b)}
        <label class="row lvl-book" title={countTitle(sumOf([bookPick(b)]))}>
          <span class="twist" aria-hidden="true"></span>
          <input type="checkbox" checked={on} use:tri={bookSome(b)} onchange={() => practice.toggle(item, bookPick(b))}>
          <span class="lab">{bookTitle(b)}</span>
        </label>
        {#if !manifestOf(b)}
          <div class="row lvl-chapter off" title="Its chapters cannot be listed until the book itself arrives.">
            <span class="lab">{statusOf(b) === 'failed' ? 'This book could not be loaded.' : 'Loading the book…'}</span>
          </div>
        {/if}
        {#each chaptersOf(b) as c (c.id)}
          {@const chOn = chapOn(b, c)}
          {@const shown = isOpen(b, c)}
          <div class="row lvl-chapter" title={countTitle(sumOf([chapPick(b, c)]))}>
            <button type="button" class="twist" class:open={shown} aria-expanded={shown} aria-label={shown ? 'Fold this chapter' : 'Open this chapter'} onclick={() => toggleOpen(b, c)}>▸</button>
            <input type="checkbox" checked={chOn} use:tri={!chOn && chapSome(b, c)} onchange={() => practice.toggle(item, chapPick(b, c))}>
            <button type="button" class="lab plain" onclick={() => toggleOpen(b, c)}>{c.id} · {c.title}</button>
          </div>
          {#if shown}
            {#each c.sections as s (s.id)}
              {#if s.built}
                <label class="row lvl-section" title={countTitle(sumOf([secPick(b, s)]))}>
                  <span class="twist" aria-hidden="true"></span>
                  <input type="checkbox" checked={secOn(b, c, s)} onchange={() => practice.toggle(item, secPick(b, s))}>
                  <span class="lab">{s.id} · {s.title}</span>
                </label>
              {:else}
                <div class="row lvl-section off" title="This section has not been built yet, so it has no problems to draw on.">
                  <span class="twist" aria-hidden="true"></span>
                  <input type="checkbox" disabled>
                  <span class="lab">{s.id} · {s.title}</span>
                </div>
              {/if}
            {/each}
          {/if}
        {/each}
      {/each}
    </div>

    <div class="eyebrow">A concept on its own</div>
    <input class="find" type="search" placeholder="Find a concept…" aria-label="Find a concept by name" bind:value={q}>
    {#if q.trim() && found.length === 0}
      <p class="quiet">{loading ? 'The concepts are still loading.' : 'No concept in your library is named that.'}</p>
    {/if}
    {#each found as f (`${f.book}/${f.c.id}`)}
      {@const own = has(conceptPick(f.c.id))}
      {@const brought = !own && curriculumConcepts.has(f.c.id)}
      <label class="row concept">
        <input type="checkbox" checked={own} use:tri={brought} onchange={() => practice.toggle(item, conceptPick(f.c.id))}
          title={brought ? 'A section you have already chosen brings this concept in.' : 'Practice this concept on its own.'}>
        <i class="dot k-{f.c.kind}" aria-hidden="true"></i>
        <span class="lab"><span use:math={f.c.name}>{@html f.c.name}</span></span>
        {@render masteryBox(f.c.id)}
      </label>
    {/each}
    {#if found.length === FOUND}<p class="quiet">The first {FOUND} are listed; type more of the name to narrow them.</p>{/if}

    <div class="foot">
      <p class="sum">{choiceLine}</p>
      {#if why}<p class="quiet">{why}</p>{/if}
      {#if note}<p class="quiet">{note}</p>{/if}
      <div class="acts">
        <button type="button" class="btn go" disabled={size === 0} onclick={begin}>Practice {size}</button>
        <span class="step" title={stepTitle}>
          <button type="button" class="stepb" aria-label="One exercise fewer" disabled={size <= 1} onclick={() => setSize(size - 1)}>−</button>
          <span class="n">{size}</span>
          <button type="button" class="stepb" aria-label="One exercise more" disabled={size >= Math.min(50, choice.exercises)} onclick={() => setSize(size + 1)}>+</button>
        </span>
        {#if practice.live(item)}<button type="button" class="btn" onclick={() => practice.resume(item)}>Back to the session</button>{/if}
      </div>
    </div>
  </div>

{:else if page.face === 'practise' && session}
  <div class="practise">
    <div class="strip">
      <span class="where">Exercise {at + 1} of {drawn.length}</span>
      <span class="points">{session.earned === 1 ? '1 point so far' : `${session.earned} points so far`}</span>
      {#if pending}<span class="chip why-{pending.why}">{WHY[pending.why] ?? pending.why}</span>{/if}
      <label class="shuffle" title="Draw the rest of the round again at random as you go, instead of taking it in the order the book sets.">
        <input type="checkbox" checked={page.shuffle} onchange={(e) => practice.setShuffle(item, e.currentTarget.checked)}>shuffle
      </label>
    </div>
    <div class="pips" aria-hidden="true">
      {#each drawn as _, i (i)}
        <i class="pip" class:done={session.answered[i]} class:now={i === at}></i>
      {/each}
    </div>
    {#if cur}
      <div class="bars">
        {#each cur.ex.concepts as id (id)}
          <div class="one">
            {@render masteryBox(id)}
            <span class="nm"><span use:math={conceptName(id)}>{@html conceptName(id)}</span></span>
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
    {#if ending}
      <div class="confirm">
        <span class="ask">End this session? Your answers so far are kept.</span>
        <button type="button" class="btn go" onclick={() => practice.end(item)}>End session</button>
        <button type="button" class="btn" onclick={() => (ending = false)}>Keep going</button>
      </div>
    {:else}
      <div class="acts">
        <button type="button" class="btn" onclick={() => practice.skip(item)}>Skip</button>
        {#if answered}<button type="button" class="btn go" bind:this={nextBtn} onclick={() => practice.next(item)}>{last ? 'Finish' : 'Next'}</button>{/if}
        <button type="button" class="btn" title="Leave this session standing and go back to the dashboard. It will be waiting there." onclick={() => practice.pause(item)}>Pause</button>
        <button type="button" class="btn" title="Finish this session here, and see what it came to." onclick={() => (ending = true)}>End</button>
      </div>
    {/if}
  </div>

{:else if page.face === 'summary' && session}
  <div class="summary">
    <p class="sum">{earnedLine(session.earned)} {workLine}</p>
    {#if changed.length}
      <section class="panel">
        <h3 class="head">What moved</h3>
        <ul class="moved">
          {#each changed as c (c.id)}
            <li><span use:math={conceptName(c.id)}>{@html conceptName(c.id)}</span>: {STATE_WORD[c.from]} → {STATE_WORD[c.to]}</li>
          {/each}
        </ul>
      </section>
    {/if}
    <div class="acts">
      <button type="button" class="btn go" onclick={() => practice.finish(item)}>Return to Dashboard</button>
    </div>
  </div>
{/if}

<style>
  .dash,.choose,.practise,.summary{font-family:var(--sans);font-size:0.84rem;color:var(--ink);container-type:inline-size;display:flex;flex-direction:column;gap:12px}
  /* the two tabs over the faces: the eyebrow's small capitals, and the face showing underlined in the accent */
  .faces{display:flex;gap:14px;margin:0 0 12px;border-bottom:1px solid var(--rule)}
  .tab{font-family:var(--sans);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--muted);background:none;border:0;border-bottom:2px solid transparent;padding:2px 0 6px;margin-bottom:-1px;cursor:pointer}
  .tab:hover{color:var(--ink)}
  .tab.on{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .quiet{color:var(--muted);margin:2px 0}
  .eyebrow{margin:8px 0 3px}
  /* a heading names a band of the view; the eyebrow is kept for the sub-labels inside one */
  .head{font-family:var(--sans);font-size:1.08rem;font-weight:700;letter-spacing:-0.01em;margin:0 0 8px}
  /* a band of the view, as a card with a hairline round it */
  .panel{background:var(--panel);border:1px solid var(--rule);border-radius:12px;padding:12px 14px}
  .presets{display:flex;flex-wrap:wrap;gap:6px}
  .btn{font:inherit;font-size:0.8rem;font-weight:600;padding:5px 12px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:8px;cursor:pointer}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn:disabled{opacity:.5;cursor:default}
  .btn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  /* the one button that carries the next move is filled. Its text is the panel's
     ground rather than a literal white: with the colour coding off the accent is
     the ink itself, which is near-white on a dark ground and would swallow it. */
  .btn.go{background:var(--accent);border-color:var(--accent);color:var(--panel);border-radius:10px;padding:7px 16px;font-size:0.85rem}
  .btn.go:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 85%,var(--ink));border-color:color-mix(in srgb,var(--accent) 85%,var(--ink))}
  .btn.go:disabled{background:var(--soft2);border-color:var(--rule);color:var(--muted)}
  /* ---------- the mastery box, the one drawing of how a concept stands ---------- */
  .mbox{position:relative;flex:none;display:block;width:14px;height:14px;box-sizing:border-box;border:1.5px solid var(--rule);border-radius:4px;background:var(--soft);overflow:hidden}
  .mbox::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--fill,0%);background:transparent}
  .mbox.st-practised{border-color:var(--m-low)}
  .mbox.st-practised::after{background:var(--m-low)}
  .mbox.st-practised.hi{border-color:var(--m-mid)}
  .mbox.st-practised.hi::after{background:var(--m-mid)}
  .mbox.st-mastered{border-color:var(--ink)}
  .mbox.st-mastered::after{background:var(--m-high)}
  .mbox.st-due{border-style:dashed;border-color:var(--ink)}
  .mbox.st-due::after{background:var(--m-due)}
  /* ---------- the dashboard ---------- */
  /* the three numbers, each on a tile of its own */
  .tiles{display:flex;flex-wrap:wrap;gap:10px}
  .tile{flex:1 1 100px;min-width:92px;display:flex;flex-direction:column;gap:1px;padding:10px 12px;border:1px solid var(--rule);border-radius:12px;background:var(--panel)}
  .tile b{font-size:1.6rem;line-height:1.1;font-weight:700;font-variant-numeric:tabular-nums}
  .tile span{font-size:0.72rem;color:var(--muted)}
  .acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
  /* a session still running, and what it tests under it when the pointer rests on the card */
  .cards{display:flex;flex-wrap:wrap;gap:8px}
  .cardwrap{position:relative}
  .card{display:flex;flex-direction:column;gap:2px;text-align:left;font:inherit;font-size:0.8rem;padding:8px 12px;border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:10px;background:var(--panel);color:var(--ink);cursor:pointer}
  .card:hover{background:var(--soft)}
  .card:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .card .l{font-weight:700}
  .card .k{font-size:0.72rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .card .where{text-transform:uppercase;letter-spacing:0.07em;font-size:0.64rem}
  .pop{position:absolute;top:100%;left:0;z-index:5;margin-top:4px;min-width:220px;max-width:320px;padding:8px 10px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);box-shadow:0 6px 20px rgba(0,0,0,.14)}
  .pop .peek{display:flex;align-items:center;gap:6px;padding:1px 0;min-width:0;font-size:0.76rem}
  .pop .peek .lab{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pop .lvl-book{font-weight:700}
  .pop .lvl-chapter{padding-left:12px}
  .pop .lvl-section{padding-left:24px;color:var(--muted)}
  /* a year of days, a column to the week, today in the last column; the pane
     scrolls back over it where it cannot hold the whole year */
  .heat{overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
  .weeks{display:flex;gap:2px;width:max-content}
  .week{display:flex;flex-direction:column;gap:2px}
  .cell{width:11px;height:11px;border-radius:2px;background:var(--soft2)}
  .cell.ahead{visibility:hidden}
  .cell[data-d="1"]{background:color-mix(in srgb,var(--ok) 22%,var(--soft2))}
  .cell[data-d="2"]{background:color-mix(in srgb,var(--ok) 42%,var(--soft2))}
  .cell[data-d="3"]{background:color-mix(in srgb,var(--ok) 62%,var(--soft2))}
  .cell[data-d="4"]{background:color-mix(in srgb,var(--ok) 82%,var(--soft2))}
  .cell[data-d="5"]{background:var(--ok)}
  /* the legend of the book bars, drawn in the same boxes the rows wear */
  .key{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:8px;font-size:0.72rem;color:var(--muted)}
  .key span{display:inline-flex;align-items:center;gap:5px}
  /* one book: what it is called, how it stands, what it has earned, and the twisty that opens it */
  .brow{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;font:inherit;font-size:inherit;text-align:left;padding:5px 4px;border:0;border-radius:8px;background:none;color:inherit;cursor:pointer}
  .brow:hover{background:var(--soft)}
  .brow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .brow .lab{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
  .brow .pts{flex:none;color:var(--muted);font-size:0.74rem;font-variant-numeric:tabular-nums}
  .brow .twist{flex:none;width:12px;font-size:0.7rem;line-height:1;color:var(--muted);transition:transform .12s}
  .brow.open .twist{transform:rotate(90deg)}
  .stack{flex:none;display:flex;width:150px;height:7px;border-radius:4px;overflow:hidden;background:var(--rule)}
  .seg{display:block;height:100%}
  .seg.st-mastered{background:var(--m-high)}
  .seg.st-practised{background:var(--m-mid)}
  .seg.st-due{background:var(--m-due)}
  .seg.st-untouched{background:var(--rule)}
  /* the breakdown, opened under the row it belongs to */
  .breakdown{margin:2px 0 10px;padding:8px 10px 6px;border-left:2px solid var(--rule);background:var(--soft)}
  .breakdown .sum{margin:0 0 4px}
  /* ---------- choosing ---------- */
  /* the picks as they stand, each carrying the × that takes it out again */
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .pick{display:inline-flex;align-items:center;gap:4px;max-width:100%;font-size:0.74rem;padding:2px 4px 2px 8px;border:1px solid var(--rule);border-radius:11px;background:var(--soft)}
  .pick .lab{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pick .x{font:inherit;font-size:0.9rem;line-height:1;color:var(--muted);background:none;border:0;border-radius:50%;padding:0 3px;cursor:pointer}
  .pick .x:hover{color:var(--ink);background:var(--soft2)}
  .pick .x:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .tree{margin:0}
  .find{width:100%;box-sizing:border-box;font:inherit;font-size:0.8rem;padding:6px 10px;margin:0;border:1px solid var(--rule);border-radius:8px;background:var(--panel);color:var(--ink)}
  .find:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  /* one row of the tree: the twisty, the box and the name; what the row comes to is in its title */
  .row{display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:6px;cursor:pointer;min-width:0}
  .row:hover{background:var(--soft)}
  .row.off{cursor:default;color:var(--muted);opacity:.65}
  .row.off:hover{background:none}
  .row input{margin:0;flex:none;accent-color:var(--accent)}
  .row .lab{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .row .lab.plain{font:inherit;font-size:inherit;text-align:left;background:none;border:0;color:inherit;padding:0;cursor:pointer}
  .row .lab.plain:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .twist{flex:none;width:12px;font:inherit;font-size:0.7rem;line-height:1;color:var(--muted);background:none;border:0;padding:0;cursor:pointer;transition:transform .12s}
  button.twist:hover{color:var(--ink)}
  .twist.open{transform:rotate(90deg)}
  .twist:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .lvl-book{font-weight:600}
  .lvl-chapter{padding-left:16px}
  .lvl-section{padding-left:32px;color:var(--muted)}
  .lvl-section .lab{color:var(--ink)}
  .row.concept .lab :global(.katex),.row.prow .lab :global(.katex),.pick .lab :global(.katex){font-size:0.95em}
  /* the kind's hue as a dot beside the name: the same three the concept map gives its shapes */
  .dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted)}
  .dot.k-idea{background:var(--cm-idea)}
  .dot.k-result{background:var(--cm-result)}
  .dot.k-skill{background:var(--cm-skill)}
  .chip{flex:none;font-size:0.65rem;padding:1px 6px;border-radius:9px;background:var(--soft);color:var(--muted);font-weight:600;letter-spacing:0.02em}
  .foot{margin-top:4px;padding-top:10px;border-top:1px solid var(--rule)}
  .sum{margin:0 0 6px}
  /* how many a round draws, set where the round is started rather than only in the settings */
  .step{display:inline-flex;align-items:center;border:1px solid var(--rule);border-radius:8px;background:var(--panel)}
  .stepb{font:inherit;font-size:0.85rem;line-height:1;color:var(--muted);background:none;border:0;padding:5px 9px;cursor:pointer}
  .stepb:hover:not(:disabled){color:var(--ink);background:var(--soft)}
  .stepb:disabled{opacity:.4;cursor:default}
  .stepb:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .step .n{min-width:1.6em;text-align:center;font-size:0.78rem;font-weight:600;font-variant-numeric:tabular-nums}
  /* the strip over the session: where the reader is, what they have earned, why this problem was drawn, and the shuffle */
  .strip{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
  .strip .where{font-weight:700}
  .strip .points{color:var(--muted);font-variant-numeric:tabular-nums}
  .chip.why-review{color:var(--m-due)}
  .chip.why-frontier{color:var(--accent)}
  /* one segment a problem: answered, the one in hand, and the ones still ahead */
  .pips{display:flex;flex-wrap:wrap;gap:3px;margin:-4px 0 0}
  .pip{flex:1 1 8px;max-width:40px;height:5px;border-radius:3px;background:var(--soft2)}
  .pip.done{background:var(--m-high)}
  .pip.now{background:var(--accent)}
  /* the same small switch the concept map's legend carries */
  .shuffle{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;color:var(--muted);cursor:pointer;user-select:none}
  .shuffle input{appearance:none;flex:none;width:22px;height:13px;margin:0;border:1px solid var(--rule);border-radius:7px;background:var(--panel);position:relative;cursor:pointer}
  .shuffle input::after{content:"";position:absolute;top:2px;left:2px;width:7px;height:7px;border-radius:50%;background:var(--muted);transition:left .15s}
  .shuffle input:checked{background:color-mix(in srgb,var(--accent) 22%,var(--panel));border-color:color-mix(in srgb,var(--accent) 50%,var(--rule))}
  .shuffle input:checked::after{left:11px;background:var(--accent)}
  .shuffle input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .bars{display:flex;flex-wrap:wrap;gap:4px 16px}
  .bars .one{display:flex;align-items:center;gap:7px;min-width:0}
  .bars .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)}
  .eyebrow.from{margin:0;opacity:.85}
  .card-root{margin:0}
  /* the question asked before a round is ended, in the place the buttons stand */
  .confirm{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--rule);border-radius:10px;background:var(--soft)}
  .confirm .ask{flex:1 1 220px;min-width:0}
  .moved{list-style:none;margin:0;padding:0}
  .moved li{padding:2px 0;display:flex;gap:8px;align-items:baseline;min-width:0}
  /* one concept's standing: the box, the kind's dot, the name, and the small
     print about the streak, the last answer and the next review. The row is not
     a button — it is a place the concept's own card opens on, the way a term in
     the text is — so it wears the dotted rule the glossary terms wear, and the
     reader's Underlines setting takes it away with theirs. */
  .row.prow{width:100%;box-sizing:border-box;cursor:default}
  .row.prow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row.prow .meta{flex:none;color:var(--muted);font-size:0.7rem;font-variant-numeric:tabular-nums}
  :global(html:not(.no-underlines)) .prow .lab{text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px;text-decoration-thickness:1px}
  @container (max-width:520px){ .row.prow{flex-wrap:wrap} .row.prow .lab{flex:1 1 70%;white-space:normal} .row.prow .meta{display:none} .stack{width:96px} }   /* in a narrow box the name takes a line of its own and the meta drops away */
  /* a page has room for the reading size the rest of the views take in one */
  :global(.view-pane) .dash,:global(.view-pane) .choose,:global(.view-pane) .practise,:global(.view-pane) .summary{font-size:0.95rem;max-width:900px;margin:0 auto;gap:16px}
  :global(.view-pane) .faces{max-width:900px;margin:0 auto 14px}
  :global(.view-pane) .tab{font-size:0.8rem}
  :global(.view-pane) .head{font-size:1.2rem}
  :global(.view-pane) .panel{padding:14px 18px}
  :global(.view-pane) .row.prow .meta{font-size:0.78rem}
  :global(.view-pane) .btn{font-size:0.88rem}
  :global(.view-pane) .btn.go{font-size:0.92rem;padding:8px 18px}
  :global(.view-pane) .find{font-size:0.88rem}
  :global(.view-pane) .chip{font-size:0.7rem}
  :global(.view-pane) .mbox{width:16px;height:16px}
  :global(.view-pane) .tile b{font-size:1.9rem}
  :global(.view-pane) .stack{width:200px}
</style>
