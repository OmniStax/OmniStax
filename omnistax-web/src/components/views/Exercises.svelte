<script lang="ts">
  /* Practice, as a course of study rather than as a page of problems.

     Four faces, under two tabs. The dashboard is where a fresh view opens and
     what the Dashboard tab goes back to: the standing in summary tiles, every
     session still running anywhere in the shell, a year of days coloured by
     what each one earned, and concept counts for each book on the shelf.

     The Practice tab leads to the three faces of the practising itself. On the
     first the reader says what to practise: a folded tree of books, chapters
     and sections whose boxes are half-checked the way a file tree's are,
     and a search for a single concept. Selected items and Clear sit at the
     bottom, beside the controls that start practice. On the second the session runs one exercise at a time in the
     ordinary card, standing alone as it does in a tab of its own; the card
     records the answer into the store by itself, so Next arrives when the
     problem has been answered and not before. The third is Progress: what was
     earned, and how each concept's mastery box moved.

     A session belongs to the store rather than to this page: pausing one leaves
     it standing, closing its tab leaves it standing, and any dashboard offers
     it back. So this view holds only what is properly a tab's own — the picks
     being made, the face showing, and which choice-tree chapters are open.

     How a concept stands is drawn one way everywhere: a mastery box, a small
     rounded square outlined in the colour of the state and filled from the
     bottom by its discrete attainment fraction. The
     dashboard rows, the concept search and the progress screen all wear it,
     so the reader learns one picture everywhere. */
  import { registry } from '../../lib/sections/registry.svelte';
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
    DAY, conceptsOf, fillOf, freshnessOf, heatWeeks, samePick, standingOf, streakOf, workByDay,
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
  const statusOf = (id: string): string => books.status[id] ?? 'idle';
  /* The catalogue of what the library holds. Books themselves are loaded by
     the face that needs them: Choose loads the full shelf, while Dashboard
     waits until a progress accordion is opened. */
  $effect(() => { if (library.status === 'idle') library.load().catch(() => {}); });
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
  const loading = $derived(shelf.some((id) => statusOf(id) === 'idle' || statusOf(id) === 'loading') || dirs.some((d) => (registry.chapterStatus[d] ?? 'loading') === 'loading'));

  /* A checkbox that is neither on nor off: the browser takes that as a property
     only, so it is set here rather than written as an attribute. */
  const tri = (node: HTMLInputElement, on: boolean) => { node.indeterminate = on; return { update(v: boolean) { node.indeterminate = v; } }; };

  const plain = (s: string): string => s.replace(/\$[^$]*\$/g, ' ').replace(/<[^>]*>/g, ' ');
  const conceptName = (id: string): string => practice.conceptOf(id)?.name ?? id;
  const conceptKind = (id: string): string => practice.conceptOf(id)?.kind ?? '';
  /* The reader's words are American, whatever the code calls the state. */
  const STATE_WORD: Readonly<Record<State, string>> = { untouched: 'unpracticed', practised: 'practiced', mastered: 'mastered' };
  const exercises = (n: number): string => (n === 1 ? 'one exercise' : `${n} exercises`);

  /* ---------- the two tabs ---------- */

  /* The dashboard is one tab; choosing, the session and its Progress screen are
     the other. The Practice tab goes back to a session still running, and
     otherwise to the choice. */
  const onDash = $derived(page.face === 'dashboard');
  const toPractise = (): void => { if (practice.live(item)) practice.resume(item); else practice.choose(item); };
  const reopenRelease = (): void => {
    const required = practice.requiredRelease(item); if (!required) return;
    const url = new URL(location.href); url.searchParams.set('_omnistax_release', required.release); location.assign(url);
  };

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

  /* What a pick comes to: the concepts it holds and how many problems in the
     library test any of them. The tree
     no longer sets this out in a column of its own — it is what the row says
     when the pointer rests on it. */
  type Sum = { readonly concepts: number; readonly exercises: number };
  const sumOf = (picks: readonly Pick[]): Sum => {
    const ids = conceptsOf(picks, cat);
    return { concepts: ids.size, exercises: poolOf(picks, cat).length };
  };
  const countTitle = (s: Sum): string =>
    s.concepts === 0 ? 'Nothing here has a concept attached to it yet.'
      : `${s.concepts === 1 ? 'One concept' : `${s.concepts} concepts`} and ${s.exercises === 1 ? 'one problem' : `${s.exercises} problems`}.`;

  /* Books and chapters start folded. Expanding a row does not change its
     selection, and folding it keeps the selected items visible in the footer. */
  let openBooks = $state<readonly string[]>([]);
  const toggleBook = (id: string): void => { openBooks = openBooks.includes(id) ? openBooks.filter((b) => b !== id) : [...openBooks, id]; };
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
      .filter((c) => c.status === 'built' && practice.available(c.id) > 0 && (plain(c.name).toLowerCase().includes(needle) || c.id.includes(needle)))
      .map((c) => ({ c, book: id })))
      .slice(0, FOUND);
  });
  /* A concept is checked when the reader named it, and half-checked when a
     section or a chapter they picked brings it in. */
  const curriculumConcepts = $derived(conceptsOf(page.curriculum, cat));

  const choice = $derived(sumOf(page.curriculum));
  const plan = $derived(practice.plan(item));
  const choiceLine = $derived(
    page.curriculum.length === 0 ? 'You have not chosen anything to practice yet.'
      : `${choice.concepts === 1 ? '1 concept' : `${choice.concepts} concepts`} in ${choice.exercises === 1 ? '1 exercise' : `${choice.exercises} exercises`}.`,
  );
  const why = $derived(
    page.curriculum.length === 0 ? 'Tick a chapter, a section or a concept above, and a session will be drawn from what you tick.'
      : choice.exercises === 0 ? 'Nothing you have chosen has a problem attached to it yet. Choose another part of the book, or one of its concepts.'
        : '',
  );
  let note = $state('');
  const NOTHING = 'There is nothing left to draw on just now. Choose more of the book or try again later.';
  const begin = (): void => { note = practice.start(item) ? '' : NOTHING; };
  const diagnostic = $derived.by(() => {
    if (!plan.concepts.length) return '';
    const verb = plan.shortages ? 'Attempted' : 'Enrolled';
    const shortage = plan.shortages ? ` ${plan.shortages} ${plan.shortages === 1 ? 'concept has' : 'concepts have'} fewer than ${plan.target} available.` : '';
    return `${verb} ${plan.target} exercises for every eligible concept.${shortage} ${plan.sharedConcepts} ${plan.sharedConcepts === 1 ? 'concept shares' : 'concepts share'} one or more exercises.`;
  });

  /* ---------- practising ---------- */

  /* The card writes the answer into the store. One-at-a-time mode advances to
     the next unanswered square; the all-exercises mode leaves every card in
     place. The numbered grid is the session's navigation and progress display. */
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
  const outcome = $derived(session?.outcomes[at] ?? null);
  const allDone = $derived(!!session && session.outcomes.every((v) => v !== null));
  $effect(() => { if (page.face === 'practise' && session && cur) practice.markShown(item); });
  $effect(() => { if (page.face === 'practise' && page.showAll && session) session.drawn.forEach((_, i) => practice.markShownAt(item, i)); });

  /* The card's root is decorated the way a prepared document's root is, so the
     goto cards and the notes layer read it as they read any other. */
  let root = $state<HTMLElement | null>(null);
  $effect(() => { if (root && cur) registry.decorateRoot(root); });
  let allRoot = $state<HTMLElement | null>(null);
  $effect(() => { if (allRoot && page.showAll) { drawn; registry.decorateRoot(allRoot); } });
  /* All mode needs every local section at once; foreign books were fetched as a
     unit while the curriculum was assembled. */
  $effect(() => {
    if (!page.showAll) return;
    drawn.forEach((d) => {
      if (d.book === book) registry.load(d.section).catch(() => {});
      else if (statusOf(d.book) === 'idle') books.load(d.book).catch(() => {});
    });
  });
  const answeredAt = (i: number, ok: boolean): void => { if (!page.showAll) practice.afterAnswer(item, i); };

  /* Ending a round early is asked about first, in a strip that takes the place
     of the buttons rather than in a dialog the browser draws. The question is
     dropped the moment the reader moves on by any other way. */
  let ending = $state(false);
  $effect(() => { at; page.face; page.showAll; ending = false; });

  const freshnessTitle = (id: string, now = Date.now()): string => {
    const record = practice.mastery[id]; if (!record?.mastered) return '';
    const fresh = freshnessOf(record, practice.settings, now);
    if (fresh.permanent) return `${record.selfAssessed ? 'Progress override' : 'Mastered'} · freshness decay off`;
    const days = Math.ceil(Math.abs(fresh.dueAt - now) / DAY);
    return fresh.due ? `Mastered · ${days === 0 ? 'due now' : `overdue by ${days} ${days === 1 ? 'day' : 'days'}`}` : `Mastered · fresh for ${days} more ${days === 1 ? 'day' : 'days'}`;
  };
  const boxTitle = (id: string, s: State): string =>
    s === 'untouched' ? 'You have not completed an exercise on this concept yet.'
      : s === 'mastered' ? freshnessTitle(id)
        : `${practice.mastery[id]?.level ?? 0}/${practice.mastery[id]?.target ?? practice.settings.masteryTarget} correct steps toward mastery.`;

  /* ---------- progress after the session ---------- */

  const progressed = $derived(page.face === 'progress' ? practice.progress(item) : []);
  const done = $derived(drawn.filter((_, i) => session?.outcomes[i] !== null).length);
  const skipped = $derived(drawn.length - done);
  const correct = $derived(session?.outcomes.filter((v) => v === true).length ?? 0);
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
  const byDay = $derived(workByDay(practice.attempts));
  const streak = $derived(streakOf(practice.attempts, Date.now()));
  /* Five depths over the empty cell, so a day of steady work and a day of a
     great deal of it are told apart without a legend. */
  const depth = (day: string): number => { const n = byDay[day]?.completed ?? 0; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : n < 15 ? 4 : 5; };
  const dayTitle = (day: string): string => { const work = byDay[day]; return `${day} · ${work ? `${work.completed} exercises · ${work.correct} correct` : 'no exercises'}`; };
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
     as the Choose face sets them out but without the boxes to tick. */
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

  /* ---------- book-wide concept progress ---------- */

  /* Progress is deliberately demand-loaded. The book being read opens first,
     so its standing is immediately useful; another book costs nothing beyond
     its library row until the reader unfolds it. Choose still asks for every
     book because it must be able to draw a complete round. */
  let openProgressBooks = $state<readonly string[]>([]);
  let progressSeeded = $state(false);
  let openProgressChapters = $state<readonly string[]>([]);
  let openProgressSections = $state<readonly string[]>([]);
  const progressBookOpen = (id: string): boolean => openProgressBooks.includes(id);
  const progressChapterKey = (id: string, chapter: ChapterEntry): string => `${id}/${chapter.id}`;
  const progressSectionKey = (id: string, section: SectionEntry): string => `${id}/${section.id}`;
  const progressChapterOpen = (id: string, chapter: ChapterEntry): boolean => openProgressChapters.includes(progressChapterKey(id, chapter));
  const progressSectionOpen = (id: string, section: SectionEntry): boolean => openProgressSections.includes(progressSectionKey(id, section));
  const toggleProgressBook = (id: string): void => { openProgressBooks = progressBookOpen(id) ? openProgressBooks.filter((x) => x !== id) : [...openProgressBooks, id]; };
  const toggleProgressChapter = (id: string, chapter: ChapterEntry): void => {
    const key = progressChapterKey(id, chapter);
    openProgressChapters = openProgressChapters.includes(key) ? openProgressChapters.filter((x) => x !== key) : [...openProgressChapters, key];
  };
  const toggleProgressSection = (id: string, section: SectionEntry): void => {
    const key = progressSectionKey(id, section);
    openProgressSections = openProgressSections.includes(key) ? openProgressSections.filter((x) => x !== key) : [...openProgressSections, key];
  };
  $effect(() => {
    if (!progressSeeded && book) { progressSeeded = true; openProgressBooks = [book]; }
  });
  $effect(() => {
    if (page.face === 'choose') {
      if (dirs.length) registry.loadChapters(dirs).catch(() => {});
      shelf.forEach((id) => { if (statusOf(id) === 'idle') books.load(id).catch(() => {}); });
      return;
    }
    if (page.face !== 'dashboard') return;
    if (progressBookOpen(book)) {
      if (dirs.length) registry.loadChapters(dirs).catch(() => {});
      /* Availability determines each mastery fraction's denominator, so the
         current book's one compact exercise index belongs to its summary too. */
      if (statusOf(book) === 'idle') books.load(book).catch(() => {});
    }
    openProgressBooks.filter((id) => id !== book).forEach((id) => { if (statusOf(id) === 'idle') books.load(id).catch(() => {}); });
  });

  // conceptsIn deduplicates chapter prerequisites; standingOf excludes placeholders.
  const bookStanding = (id: string): Standing => standingOf(practice.conceptsIn(id), practice.mastery);
  const allConcepts = $derived([...new Map(cat.concepts.filter((c) => c.status === 'built').map((c) => [c.id, c] as const)).values()]);
  const overall = $derived(standingOf(allConcepts, practice.mastery));
  const progressStatus = (id: string): string => {
    if (id !== book) return statusOf(id);
    const states = dirs.map((d) => registry.chapterStatus[d]);
    if (states.some((s) => s === 'failed')) return 'failed';
    return states.some((s) => !s || s === 'loading') ? 'loading' : 'loaded';
  };

  const builtConcepts = (id: string) => practice.conceptsIn(id).filter((c) => c.status === 'built');
  const sectionConcepts = (id: string, section: SectionEntry) => builtConcepts(id).filter((c) => c.section === section.id);
  const chapterConcepts = (id: string, chapter: ChapterEntry) => {
    const sections = new Set(chapter.sections.map((s) => s.id));
    return builtConcepts(id).filter((c) => sections.has(c.section));
  };
  const standingLine = (standing: Standing): string => {
    const total = standing.untouched + standing.practised + standing.mastered;
    return total === 0 ? 'No concepts yet' : `${standing.mastered}/${total} mastered · ${standing.practised} practiced`;
  };

  type Row = { readonly id: string; readonly name: string; readonly kind: string; readonly state: State; readonly bar: number; readonly meta: string };

  const ago = (t: number, now: number): string => {
    const days = Math.round((now - t) / DAY);
    return days <= 0 ? 'last practiced today' : days === 1 ? 'last practiced yesterday' : `last practiced ${days} days ago`;
  };
  const rowOf = (id: string, now: number): Row | null => {
    const c = practice.conceptOf(id); if (!c || c.status !== 'built') return null;
    const r = practice.mastery[c.id], st = practice.stateOf(c.id);
    return {
      id: c.id, name: c.name, kind: c.kind, state: st, bar: practice.share(c.id),
        meta: [r?.selfAssessed ? 'overridden' : '', r?.lastAt ? ago(r.lastAt, now) : '', r?.mastered ? freshnessTitle(c.id, now) : `${r?.level ?? 0}/${r?.target ?? practice.settings.masteryTarget}`].filter(Boolean).join(' · '),
    };
  };
  const progressRows = $derived.by(() => {
    if (page.face !== 'progress') return [];
    const now = Date.now();
    return progressed.flatMap((p) => { const row = rowOf(p.id, now); return row ? [{ ...row, ...p }] : []; });
  });

  /* An override is edited in the progress hierarchy itself. It includes
     concepts with no exercises because prior knowledge is valid evidence too. */
  let overrideMode = $state(false);
  let selfQuery = $state('');
  const progressNeedle = $derived(selfQuery.trim().toLowerCase());
  const conceptMatches = (c: { readonly id: string; readonly name: string }): boolean => !progressNeedle || plain(c.name).toLowerCase().includes(progressNeedle) || c.id.includes(progressNeedle);
  const visibleSectionConcepts = (id: string, section: SectionEntry) => sectionConcepts(id, section).filter(conceptMatches);
  const chapterMatches = (id: string, chapter: ChapterEntry): boolean => !progressNeedle || chapterConcepts(id, chapter).some(conceptMatches);
  const bookMatches = (id: string): boolean => !progressNeedle || progressStatus(id) !== 'loaded' || builtConcepts(id).some(conceptMatches);
  const setSelfValue = (id: string, value: string): void => {
    if (value === 'none') { practice.clearSelf(id); return; }
    const mastered = value === 'mastered';
    practice.setSelf(id, mastered ? practice.settings.masteryTarget : Number(value), mastered, mastered && !!practice.self[id]?.noDecay);
  };
</script>

<!-- One concept's standing, drawn the same way wherever it is shown: a square
     outlined in the colour of the state and filled from the bottom by its
     discrete attainment fraction. -->
{#snippet box(st: State, sh: number, title: string, fresh = 1, due = false)}
  <i class="mbox st-{st}" class:hi={st === 'practised' && sh >= 0.5} class:due style:--fill="{Math.round(fillOf(st, sh) * 100)}%" style:--fresh={fresh} role="img" aria-label={STATE_WORD[st]} {title}></i>
{/snippet}
{#snippet masteryBox(id: string)}
  {@const st = practice.stateOf(id)}
  {@const fresh = practice.freshness(id)}
  {@render box(st, practice.share(id), boxTitle(id, st), fresh.value, fresh.due)}
{/snippet}
{#snippet standingMeter(standing: Standing)}
  {@const total = standing.untouched + standing.practised + standing.mastered}
  <span class="standing-meter" role="img" aria-label={standingLine(standing)} title={standingLine(standing)}>
    {#if total > 0}
      <i class="meter-mastered" style:width={`${standing.mastered / total * 100}%`}></i>
      <i class="meter-practised" style:width={`${standing.practised / total * 100}%`}></i>
      <i class="meter-untouched" style:width={`${standing.untouched / total * 100}%`}></i>
    {/if}
  </span>
{/snippet}

<div class="faces">
  <button type="button" class="tab" class:on={onDash} aria-current={onDash ? 'true' : undefined} onclick={() => practice.dashboard(item)}>Dashboard</button>
  <button type="button" class="tab" class:on={!onDash} aria-current={!onDash ? 'true' : undefined} onclick={toPractise}>Practice</button>
</div>

{#if page.face === 'dashboard'}
  <div class="dash">
    <div class="tiles">
      <div class="tile"><b>{streak}</b><span>{streak === 1 ? 'day in a row' : 'days in a row'}</span></div>
      <div class="tile"><b>{practice.lifetime}</b><span>{practice.lifetime === 1 ? 'exercise completed' : 'exercises completed'}</span></div>
      <div class="tile"><b>{overall.practised}</b><span>{overall.practised === 1 ? 'concept practiced' : 'concepts practiced'}</span></div>
      <div class="tile"><b>{overall.mastered}</b><span>{overall.mastered === 1 ? 'concept mastered' : 'concepts mastered'}</span></div>
    </div>
    <div class="acts">
      <button type="button" class="btn go" onclick={() => practice.choose(item)}>Choose what to practice</button>
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
                <span class="k">Exercise {Math.min(r.session.at + 1, r.session.drawn.length)} of {r.session.drawn.length} · {r.session.outcomes.filter((v) => v !== null).length} completed</span>
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

    <section class="panel book-progress" aria-label="Concept progress">
      <div class="progress-head">
        <div><h3 class="head">Concept progress</h3><p class="quiet">Trace your mastery from each book down to the concepts in a section.</p></div>
        <button type="button" class="btn override" class:on={overrideMode} aria-pressed={overrideMode} onclick={() => (overrideMode = !overrideMode)}>{overrideMode ? 'Done overriding' : 'Override progress'}</button>
      </div>
      {#if overrideMode}
        <div class="override-tools">
          <p class="quiet">Choose a concept’s progress independently of exercise history. “Use exercise history” removes the override.</p>
          <input class="find" type="search" placeholder="Find a concept…" aria-label="Find a concept to override" bind:value={selfQuery}>
        </div>
      {/if}
      <div class="progress-tree">
        {#each shelf as b (b)}
          {#if bookMatches(b)}
            {@const status = progressStatus(b)}
            {@const bookShown = progressBookOpen(b) || (!!progressNeedle && status === 'loaded')}
            {@const counts = bookStanding(b)}
            <div class="progress-branch book-branch">
              <button type="button" class="progress-node book-node" aria-expanded={bookShown} onclick={() => toggleProgressBook(b)}>
                <span class="progress-twisty" class:open={bookShown}>▸</span>
                <span class="node-copy"><strong>{bookTitle(b)}</strong><small>{status === 'loaded' ? standingLine(counts) : status === 'failed' ? 'Progress unavailable' : bookShown ? 'Loading progress…' : 'Open to load progress'}</small></span>
                {#if status === 'loaded'}{@render standingMeter(counts)}{/if}
              </button>
              {#if bookShown}
                <div class="branch-children">
                  {#if status === 'loaded'}
                    {#each chaptersOf(b) as c (c.id)}
                      {#if chapterMatches(b, c)}
                        {@const chapterShown = progressChapterOpen(b, c) || !!progressNeedle}
                        {@const chapterStanding = standingOf(chapterConcepts(b, c), practice.mastery)}
                        <div class="progress-branch chapter-branch">
                          <button type="button" class="progress-node chapter-node" aria-expanded={chapterShown} onclick={() => toggleProgressChapter(b, c)}>
                            <span class="progress-twisty" class:open={chapterShown}>▸</span>
                            <span class="node-copy"><strong>{c.id} · {c.title}</strong><small>{standingLine(chapterStanding)}</small></span>
                            {@render standingMeter(chapterStanding)}
                          </button>
                          {#if chapterShown}
                            <div class="branch-children">
                              {#each c.sections.filter((s) => s.built) as s (s.id)}
                                {@const concepts = visibleSectionConcepts(b, s)}
                                {#if !progressNeedle || concepts.length}
                                  {@const sectionShown = progressSectionOpen(b, s) || !!progressNeedle}
                                  {@const sectionStanding = standingOf(sectionConcepts(b, s), practice.mastery)}
                                  <div class="progress-branch section-branch">
                                    <button type="button" class="progress-node section-node" aria-expanded={sectionShown} onclick={() => toggleProgressSection(b, s)}>
                                      <span class="progress-twisty" class:open={sectionShown}>▸</span>
                                      <span class="node-copy"><strong>{s.id} · {s.title}</strong><small>{standingLine(sectionStanding)}</small></span>
                                      {@render standingMeter(sectionStanding)}
                                    </button>
                                    {#if sectionShown}
                                      <div class="concept-leaves">
                                        {#each concepts as c (c.id)}
                                          {@const own = practice.self[c.id]}
                                          {@const record = practice.mastery[c.id]}
                                          {@const fresh = practice.freshness(c.id)}
                                          <div class="concept-progress-row prow" tabindex="0" data-concept={c.id}>
                                            {@render masteryBox(c.id)}
                                            <i class="dot k-{c.kind}" aria-hidden="true"></i>
                                            <span class="lab"><span use:math={c.name}>{@html c.name}</span></span>
                                            {#if overrideMode}
                                              <div class="override-controls">
                                                <select aria-label={`Override progress for ${plain(c.name)}`} value={own ? own.mastered ? 'mastered' : String(own.level) : 'none'} onchange={(e) => setSelfValue(c.id, e.currentTarget.value)}>
                                                  <option value="none">Use exercise history</option>
                                                  <option value="0">Unpracticed</option>
                                                  {#each Array.from({ length: Math.max(0, practice.settings.masteryTarget - 1) }, (_, i) => i + 1) as level (level)}<option value={level}>{level}/{practice.settings.masteryTarget}</option>{/each}
                                                  <option value="mastered">Mastered</option>
                                                </select>
                                                <label class="no-decay" title="Available only for overridden mastery"><input type="checkbox" disabled={!own?.mastered} checked={own?.mastered && own.noDecay} onchange={(e) => practice.setSelf(c.id, practice.settings.masteryTarget, true, e.currentTarget.checked)}> No decay</label>
                                                {#if own?.mastered && practice.available(c.id) === 0 && fresh.due}
                                                  <span class="manual"><button type="button" class="btn" onclick={() => practice.manualReview(c.id, true)}>Still mastered</button><button type="button" class="btn" onclick={() => practice.manualReview(c.id, false)}>Needs review</button></span>
                                                {:else if record?.mastered}<span class="self-fresh">{freshnessTitle(c.id)}</span>{/if}
                                              </div>
                                            {:else}
                                              <span class="concept-state">{STATE_WORD[practice.stateOf(c.id)]}</span>
                                            {/if}
                                          </div>
                                        {:else}
                                          <p class="empty-section">No concepts are introduced in this section yet.</p>
                                        {/each}
                                      </div>
                                    {/if}
                                  </div>
                                {/if}
                              {/each}
                            </div>
                          {/if}
                        </div>
                      {/if}
                    {/each}
                  {:else}
                    <p class="progress-message">{status === 'failed' ? 'Concept progress could not be loaded.' : 'Loading this book’s concept map…'}</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </section>
  </div>

{:else if page.face === 'choose'}
  <div class="choose">
    {#if loading}<p class="quiet">Loading the book’s problems…</p>{/if}
    <div class="tree">
      {#each shelf as b (b)}
        {@const on = bookOn(b)}
        {@const bookShown = openBooks.includes(b)}
        <div class="row lvl-book" title={countTitle(sumOf([bookPick(b)]))}>
          <button type="button" class="twist" class:open={bookShown} aria-expanded={bookShown} aria-label={bookShown ? 'Fold this book' : 'Open this book'} onclick={() => toggleBook(b)}>▸</button>
          <input type="checkbox" aria-label={`Select ${bookTitle(b)}`} checked={on} use:tri={bookSome(b)} onchange={() => practice.toggle(item, bookPick(b))}>
          <button type="button" class="lab plain" aria-expanded={bookShown} onclick={() => toggleBook(b)}>{bookTitle(b)}</button>
        </div>
        {#if bookShown}
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
              <input type="checkbox" aria-label={`Select ${c.id} · ${c.title}`} checked={chOn} use:tri={!chOn && chapSome(b, c)} onchange={() => practice.toggle(item, chapPick(b, c))}>
              <button type="button" class="lab plain" aria-expanded={shown} onclick={() => toggleOpen(b, c)}>{c.id} · {c.title}</button>
            </div>
            {#if shown}
              {#each c.sections as s (s.id)}
                {#if s.built}
                  {@const sectionSum = sumOf([secPick(b, s)])}
                  <label class="row lvl-section" class:off={sectionSum.exercises === 0} title={sectionSum.exercises === 0 ? 'This section has no exercises.' : countTitle(sectionSum)}>
                    <span class="twist" aria-hidden="true"></span>
                    <input type="checkbox" disabled={sectionSum.exercises === 0} checked={secOn(b, c, s)} onchange={() => practice.toggle(item, secPick(b, s))}>
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
        {/if}
      {/each}
    </div>

    <div class="eyebrow">Add by concept</div>
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
      <section class="selection" aria-label="Selected items">
        <div class="selection-head">
          <h3 class="eyebrow">Selected items</h3>
          <button type="button" class="btn" disabled={page.curriculum.length === 0} onclick={() => practice.clear(item)}>Clear</button>
        </div>
        {#if page.curriculum.length}
          <ul class="chips">
            {#each page.curriculum as p, i (i)}
              <li class="pick">
                <span class="lab"><span use:math={pickLabel(p)}>{@html pickLabel(p)}</span></span>
                <button type="button" class="x" aria-label={`Remove ${plain(pickLabel(p))} from selected items`} title="Remove from selected items" onclick={() => practice.toggle(item, p)}>×</button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
      <div class="round-settings">
        <div class="seg" role="radiogroup" aria-label="Exercise order">
          <button type="button" class:on={practice.settings.order === 'mixed'} role="radio" aria-checked={practice.settings.order === 'mixed'} onclick={() => practice.setSetting('order', 'mixed')}>Mixed</button>
          <button type="button" class:on={practice.settings.order === 'grouped'} role="radio" aria-checked={practice.settings.order === 'grouped'} onclick={() => practice.setSetting('order', 'grouped')}>Grouped</button>
        </div>
        <label class="fresh-toggle"><input type="checkbox" checked={practice.settings.includeFresh} onchange={(e) => practice.setSetting('includeFresh', e.currentTarget.checked)}> Include fresh mastered concepts</label>
      </div>
      <p class="sum">{choiceLine}</p>
      {#if why}<p class="quiet">{why}</p>{/if}
      {#if note}<p class="quiet">{note}</p>{/if}
      <div class="acts">
        <button type="button" class="btn go" disabled={plan.drawn.length === 0} onclick={begin}>Start {plan.drawn.length}</button>
        <span class="diagnostic">{diagnostic}</span>
        {#if practice.live(item) && practice.requiredRelease(item)}
          <span class="diagnostic">This saved session uses textbook release {practice.requiredRelease(item)?.release.slice(0, 10)}…</span><button type="button" class="btn" onclick={reopenRelease}>Reopen its original release</button>
        {:else if practice.live(item)}<button type="button" class="btn" onclick={() => practice.resume(item)}>Back to the session</button>{/if}
      </div>
    </div>
  </div>

{:else if page.face === 'practise' && session}
  <div class="practise">
    {#if page.showAll}
      <div class="all-head"><button type="button" class="btn" onclick={() => practice.setShowAll(item, false)}>Show one at a time</button></div>
      <div class="all-list" bind:this={allRoot}>
        {#each drawn as d, i (`${d.book}/${d.section}/${d.ex}`)}
          {@const row = practice.exerciseAt(item, i)}
          <section class="all-exercise" aria-label="Exercise {i + 1} of {drawn.length}">
            <div class="exercise-number">Exercise {i + 1}</div>
            {#if row}
              <div class="card-root" data-sec={row.section} data-chapter={chapterDir(row.book, row.section)} data-one="1">
                <ExerciseCard book={row.book} section={row.section} ex={row.ex} outcome={session.outcomes[i]} session={session.id} onanswer={(ok) => answeredAt(i, ok)} />
              </div>
            {:else if statusOf(d.book) === 'failed'}
              <p class="quiet">This exercise comes from {practice.bookTitle(d.book)}, and that book could not be loaded.</p>
            {:else}
              <p class="quiet">Loading this exercise…</p>
            {/if}
          </section>
        {/each}
      </div>
    {:else}
      {#if cur}
        {#key `${cur.book}/${cur.section}/${cur.ex.id}/${at}`}
          <div class="card-root" data-sec={cur.section} data-chapter={chapterDir(cur.book, cur.section)} data-one="1" bind:this={root}>
            <ExerciseCard book={cur.book} section={cur.section} ex={cur.ex} {outcome} session={session.id} onanswer={(ok) => answeredAt(at, ok)} />
          </div>
        {/key}
      {:else if pending && statusOf(pending.book) === 'failed'}
        <p class="quiet">This exercise comes from {practice.bookTitle(pending.book)}, and that book could not be loaded. Choose another square to continue.</p>
      {:else}
        <p class="quiet">{pending && pending.book !== book ? 'Loading the book this exercise comes from…' : 'Loading the section this exercise comes from…'}</p>
      {/if}
    {/if}
    {#if ending}
      {@const incomplete = practice.incompleteReviews(item)}
      <div class="confirm">
        <span class="ask">{incomplete ? `Review incomplete. ${incomplete} mastered ${incomplete === 1 ? 'concept still has' : 'concepts still have'} unanswered freshness exercises. Ending now will leave their freshness unchanged, although incorrect answers already submitted may shorten it.` : allDone ? 'End this session? You have answered all of the questions.' : 'End this session? Your completed exercises are kept.'}</span>
        <button type="button" class="btn go" onclick={() => practice.end(item)}>End session</button>
        <button type="button" class="btn" onclick={() => (ending = false)}>Keep practicing</button>
      </div>
    {:else}
      {#if !page.showAll}
        <nav class="question-grid" aria-label="Exercises in this session">
          {#each drawn as _, i (i)}
            {@const result = session.outcomes[i]}
            <button type="button" class:now={i === at} class:right={result === true} class:wrong={result === false}
              aria-label="Exercise {i + 1}{result === true ? ', correct' : result === false ? ', incorrect' : i === at ? ', current' : ''}"
              aria-current={i === at ? 'step' : undefined} onclick={() => practice.go(item, i)}>{i + 1}</button>
          {/each}
        </nav>
      {/if}
      <div class="acts session-actions">
        {#if !page.showAll}<button type="button" class="btn" onclick={() => practice.setShowAll(item, true)}>Show all exercises</button>{/if}
        <button type="button" class="btn" title="Leave this session standing and go back to the dashboard. It will be waiting there." onclick={() => practice.pause(item)}>Pause</button>
        <button type="button" class="btn" class:go={allDone} title="Finish this session here, and see what it came to." onclick={() => (ending = true)}>End</button>
      </div>
    {/if}
  </div>

{:else if page.face === 'progress' && session}
  <div class="progress">
    <h2 class="progress-title">Progress</h2>
    <p class="sum">You completed {done} {done === 1 ? 'exercise' : 'exercises'} and answered {correct} correctly. {workLine}</p>
    <section class="panel concept-progress">
      {#if progressRows.length}
        {#each progressRows as r (r.id)}
          <div class="row prow progress-row" tabindex="0" data-concept={r.id}>
            <span class="transition" aria-label="Progress from {STATE_WORD[r.from]} to {STATE_WORD[r.to]}">
              {@render box(r.from, r.fromShare, `Before this session: ${STATE_WORD[r.from]}`)}
              <span class="arrow" aria-hidden="true">→</span>
              {@render box(r.to, r.toShare, `After this session: ${STATE_WORD[r.to]}`)}
            </span>
            <i class="dot k-{r.kind}" aria-hidden="true"></i>
            <span class="lab"><span use:math={r.name}>{@html r.name}</span></span>
            <span class="meta">{r.meta}</span>
          </div>
        {/each}
      {:else}
        <p class="quiet">No concept attainment changed in this session.</p>
      {/if}
    </section>
    <div class="acts">
      <button type="button" class="btn go" onclick={() => practice.finish(item)}>Return to Dashboard</button>
    </div>
  </div>
{/if}

<style>
  .dash,.choose,.practise,.progress{font-family:var(--sans);font-size:0.84rem;color:var(--ink);container-type:inline-size;display:flex;flex-direction:column;gap:12px}
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
  .mbox.st-mastered{border-color:color-mix(in srgb,var(--m-high) calc(var(--fresh,1) * 100%),var(--warm))}
  .mbox.st-mastered.due{border-style:dashed}
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
  /* Concept progress is a compact curriculum map rather than a flat report.
     The left rail visibly carries the reader from book to chapter to section;
     each node repeats the same three-part standing meter. */
  .book-progress{padding:0;overflow:hidden}
  .progress-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 9%,var(--panel)),var(--panel) 56%);border-bottom:1px solid var(--rule)}
  .progress-head .head{margin:0 0 3px}
  .progress-head .quiet{font-size:.75rem}
  .override{flex:none;border-color:color-mix(in srgb,var(--accent) 45%,var(--rule));color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,var(--panel))}
  .override.on{color:var(--panel);border-color:var(--accent);background:var(--accent)}
  .override-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,280px);align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid var(--rule);background:var(--soft)}
  .progress-tree{padding:8px 10px 12px}
  .progress-branch{position:relative;min-width:0}
  .branch-children{position:relative;margin-left:14px;padding-left:14px;border-left:1px solid color-mix(in srgb,var(--accent) 24%,var(--rule))}
  .progress-node{width:100%;display:grid;grid-template-columns:14px minmax(0,1fr) minmax(64px,120px);align-items:center;gap:8px;text-align:left;font:inherit;color:var(--ink);border:0;border-radius:8px;background:none;padding:7px 8px;cursor:pointer}
  .progress-node:hover{background:var(--soft)}
  .progress-node:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .book-node{padding-block:10px}
  .node-copy{display:flex;flex-direction:column;min-width:0;gap:1px}
  .node-copy strong{font-size:.82rem;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .book-node .node-copy strong{font-size:.9rem;font-weight:750}
  .section-node .node-copy strong{font-weight:550}
  .node-copy small{font-size:.68rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .progress-twisty{color:var(--muted);font-size:.7rem;line-height:1;transition:transform .14s ease}
  .progress-twisty.open{transform:rotate(90deg);color:var(--accent)}
  .standing-meter{height:6px;display:flex;overflow:hidden;border-radius:999px;background:var(--soft2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rule) 70%,transparent)}
  .standing-meter i{height:100%;display:block}
  .meter-mastered{background:var(--m-high)}
  .meter-practised{background:var(--m-mid)}
  .meter-untouched{background:var(--soft2)}
  .progress-message,.empty-section{font-size:.74rem;color:var(--muted);margin:4px 8px 8px}
  .concept-leaves{display:flex;flex-direction:column;padding:2px 0 7px}
  .concept-progress-row{display:grid;grid-template-columns:auto auto minmax(100px,1fr) auto;align-items:center;gap:7px;padding:6px 8px;border-radius:7px;min-width:0}
  .concept-progress-row:hover{background:var(--soft)}
  .concept-progress-row:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .concept-progress-row .lab{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .concept-state{text-transform:uppercase;letter-spacing:.055em;font-size:.62rem;font-weight:650;color:var(--muted)}
  .override-controls{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
  .override-controls select{font:inherit;font-size:.72rem;background:var(--panel);color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:4px 6px}
  /* ---------- choosing ---------- */
  /* the picks as they stand, each carrying the × that takes it out again */
  .selection-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  .selection-head h3{margin:0}
  .chips{display:flex;flex-wrap:wrap;gap:5px;list-style:none;margin:0 0 10px;padding:0}
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
  .round-settings{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0}
  .round-settings .seg{display:inline-flex;border:1px solid var(--rule);border-radius:7px;overflow:hidden}
  .round-settings .seg button{font:inherit;font-size:.78rem;border:0;background:var(--panel);color:var(--muted);padding:5px 10px;cursor:pointer}
  .round-settings .seg button+button{border-left:1px solid var(--rule)}
  .round-settings .seg button.on{background:var(--soft);color:var(--ink);font-weight:650}
  .fresh-toggle{color:var(--muted);display:flex;align-items:center;gap:5px}
  .diagnostic{color:var(--muted);font-size:.74rem;flex:1 1 280px}
  .no-decay{font-size:.72rem;color:var(--muted);white-space:nowrap}.manual{display:flex;gap:4px}.self-fresh{font-size:.7rem;color:var(--muted)}
  /* The numbered grid is navigation and progress in one place. The outline marks
     the question in hand; a completed square carries its verdict's colour. */
  .question-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:6px;padding-top:2px}
  .question-grid button{height:32px;min-width:32px;font:inherit;font-size:.76rem;font-weight:650;font-variant-numeric:tabular-nums;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--muted);cursor:pointer}
  .question-grid button:hover{background:var(--soft);color:var(--ink)}
  .question-grid button.now{outline:2px solid var(--accent);outline-offset:1px;color:var(--ink)}
  .question-grid button.right{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 18%,var(--panel));color:var(--ok)}
  .question-grid button.wrong{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 15%,var(--panel));color:var(--bad)}
  .question-grid button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .session-actions{justify-content:flex-end}
  .all-head{display:flex;justify-content:flex-end}
  .all-list{display:flex;flex-direction:column;gap:18px}
  .all-exercise{scroll-margin-top:12px}
  .exercise-number{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:0 0 5px 3px}
  .card-root{margin:0}
  /* the question asked before a round is ended, in the place the buttons stand */
  .confirm{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--rule);border-radius:10px;background:var(--soft)}
  .confirm .ask{flex:1 1 220px;min-width:0}
  .progress-title{font:700 1.45rem/1.15 var(--sans);letter-spacing:-.02em;margin:2px 0 0}
  .concept-progress{display:flex;flex-direction:column;gap:3px}
  .transition{display:inline-flex;align-items:center;gap:6px;flex:none}
  .arrow{color:var(--muted);font-size:.9rem;line-height:1}
  .progress-row{padding-block:5px}
  /* one concept's standing: the box, the kind's dot, the name, and the small
     print about the streak and last answer. The row is not
     a button — it is a place the concept's own card opens on, the way a term in
     the text is — so it wears the dotted rule the glossary terms wear, and the
     reader's Underlines setting takes it away with theirs. */
  .row.prow{width:100%;box-sizing:border-box;cursor:default}
  .row.prow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row.prow .meta{flex:none;color:var(--muted);font-size:0.7rem;font-variant-numeric:tabular-nums}
  :global(html:not(.no-underlines)) .prow .lab{text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px;text-decoration-thickness:1px}
  @container (max-width:520px){
    .row.prow{flex-wrap:wrap}
    .row.prow .lab{flex:1 1 70%;white-space:normal}
    .row.prow .meta{display:none}
    .progress-head{align-items:stretch;flex-direction:column}.progress-head .override{align-self:flex-start}
    .override-tools{grid-template-columns:1fr}
    .progress-node{grid-template-columns:12px minmax(0,1fr) 72px}
    .branch-children{margin-left:7px;padding-left:7px}
    .concept-progress-row{grid-template-columns:auto auto minmax(0,1fr)}
    .concept-progress-row .concept-state,.concept-progress-row .override-controls{grid-column:3;justify-content:flex-start}
    .concept-progress-row .lab{white-space:normal}
  }
  /* a page has room for the reading size the rest of the views take in one */
  :global(.view-pane) .dash,:global(.view-pane) .choose,:global(.view-pane) .practise,:global(.view-pane) .progress{font-size:0.95rem;max-width:900px;margin:0 auto;gap:16px}
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
</style>
