/* The live practice: what the reader has answered, the numbers they set, and
   the page each open practice tab stands on. The mastery records are not kept
   — they are rebuilt from the attempts every time one of those changes, which
   is how a change of settings takes effect on old work.

   What the reader has earned is one thing across every book in the library,
   because concept ids are canonical: mastering hookes-law in one book is
   mastering it in all. What is book-bound — an attempt, a drawn exercise —
   carries its book beside its section, since section ids are not unique across
   books. What is page-bound is the practising itself: the curriculum, the
   session running, the face showing and the shuffle, all keyed by the tab they
   belong to, so a reader may open one practice view on this section and another
   on a chapter they are revising and neither disturbs the other. A page goes
   when its tab does. None of this is on the shell's undo stack, for the same
   reason the colours are not: answering a question is not an edit to take
   back. */
import type { ExerciseDTO, ChapterEntry, ConceptDTO } from '../content/schema';
import { type SectionId, sectionId, conceptId } from '../types/ids';
import type { ItemKey } from '../layout/model';
import { registry } from '../sections/registry.svelte';
import { books } from './books.svelte';
import { mergeCatalog } from './books';
import {
  DEFAULT_SETTINGS, dayOf, draw, pointsOf, rebuild, stateOf, summarize, togglePick, total,
  type Attempt, type Catalog, type Curriculum, type Drawn, type Mastery, type Pick, type PracticeSettings, type State,
} from './model';

/* The five faces a practice page may show. Dashboard is where a fresh page
   opens: what the reader has done and what is waiting, with the practising one
   click away. Progress is one book's standing, reached from that book's row. */
export type Face = 'dashboard' | 'choose' | 'practise' | 'summary' | 'progress';
export type Session = { readonly drawn: readonly { book: string; section: SectionId; ex: string; why: Drawn['why'] }[]; readonly at: number /* index of the current exercise */; readonly answered: readonly boolean[] /* per drawn: recorded */; readonly earned: number; readonly started: number; readonly before: Mastery /* snapshot at start, for the summary */ };
/* One practice tab's own state. `book` is the book the progress face is scoped
   to, and means nothing on any other face. */
export type Page = { readonly curriculum: Curriculum; readonly session: Session | null; readonly face: Face; readonly book?: string; readonly shuffle: boolean };
/* A page nobody has opened yet, and the page every closed tab goes back to. */
export const BLANK: Page = { curriculum: [], session: null, face: 'dashboard', shuffle: false };

const KEY = 'omnistax-practice-v1';          /* the attempts and the numbers: the reader's own record */
const PAGES = 'omnistax-practice-pages-v1';  /* one entry per open practice tab */
const FACES: readonly Face[] = ['dashboard', 'choose', 'practise', 'summary', 'progress'];
const WHYS: readonly Drawn['why'][] = ['review', 'frontier', 'more'];
/* A shuffled draw wants a seed that is new every time, where the ordinary one
   wants the day, so that a refresh draws the same session. */
const freshSeed = (): string => Math.random().toString(36).slice(2, 10);
const exKey = (d: { book: string; section: SectionId; ex: string }): string => `${d.book}/${d.section}/${d.ex}`;

const obj = (raw: unknown): Record<string, unknown> | null => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const points = (raw: unknown): Record<string, number> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([k, v]) => (typeof v === 'number' && Number.isFinite(v) ? [[k, v] as const] : [])));
};
const parseAttempts = (raw: unknown): Attempt[] => (!Array.isArray(raw) ? [] : raw.flatMap((r) => {
  const o = obj(r); if (!o || !str(o.book) || !str(o.section) || !str(o.ex) || typeof o.at !== 'number' || !Number.isFinite(o.at)) return [];
  return [{ book: str(o.book), section: sectionId(str(o.section)), ex: str(o.ex), at: o.at, ok: o.ok === true, self: o.self === true, earned: points(o.earned) }];
}));
const parseCurriculum = (raw: unknown): Pick[] => (!Array.isArray(raw) ? [] : raw.flatMap((r): Pick[] => {
  const o = obj(r); if (!o) return [];
  if (str(o.concept)) return [{ concept: conceptId(str(o.concept)) }];
  if (!str(o.book)) return [];
  const chapter = str(o.chapter), section = str(o.section);
  return [{ book: str(o.book), ...(chapter ? { chapter } : {}), ...(section ? { section: sectionId(section) } : {}) }];
}));
const parseSettings = (raw: unknown): PracticeSettings => {
  const o = obj(raw); if (!o) return DEFAULT_SETTINGS;
  return {
    threshold: num(o.threshold, DEFAULT_SETTINGS.threshold), days: num(o.days, DEFAULT_SETTINGS.days), halfLife: num(o.halfLife, DEFAULT_SETTINGS.halfLife),
    session: num(o.session, DEFAULT_SETTINGS.session), reviewShare: num(o.reviewShare, DEFAULT_SETTINGS.reviewShare),
    spaced: typeof o.spaced === 'boolean' ? o.spaced : DEFAULT_SETTINGS.spaced, selfChecked: typeof o.selfChecked === 'boolean' ? o.selfChecked : DEFAULT_SETTINGS.selfChecked,
  };
};
const parseRecord = (raw: unknown): Mastery => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, v]) => {
    const r = obj(v); if (!r) return [];
    return [[id, { score: num(r.score, 0), lastAt: num(r.lastAt, 0), days: num(r.days, 0), lastDay: str(r.lastDay), mastered: r.mastered === true, halfLife: num(r.halfLife, DEFAULT_SETTINGS.halfLife), earned: num(r.earned, 0) }] as const];
  }));
};
const parseSession = (raw: unknown): Session | null => {
  const o = obj(raw); if (!o || !Array.isArray(o.drawn)) return null;
  const drawn = o.drawn.flatMap((d) => {
    const e = obj(d); if (!e || !str(e.book) || !str(e.section) || !str(e.ex)) return [];
    const why = WHYS.find((w) => w === e.why) ?? 'more';
    return [{ book: str(e.book), section: sectionId(str(e.section)), ex: str(e.ex), why }];
  });
  if (!drawn.length) return null;
  const answered = drawn.map((_, i) => (Array.isArray(o.answered) ? o.answered[i] === true : false));
  return { drawn, at: Math.min(Math.max(0, Math.round(num(o.at, 0))), drawn.length), answered, earned: num(o.earned, 0), started: num(o.started, 0), before: parseRecord(o.before) };
};
const parsePage = (raw: unknown): Page => {
  const o = obj(raw); if (!o) return BLANK;
  const book = str(o.book);
  return { curriculum: parseCurriculum(o.curriculum), session: parseSession(o.session), face: FACES.find((f) => f === o.face) ?? 'dashboard', ...(book ? { book } : {}), shuffle: o.shuffle === true };
};
const parsePages = (raw: unknown): Record<ItemKey, Page> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, parsePage(v)] as const));
};

class Practice {
  attempts = $state.raw<readonly Attempt[]>([]);
  settings = $state.raw<PracticeSettings>(DEFAULT_SETTINGS);
  /* One entry per practice tab, by the key that tab holds. A tab with no entry
     is a fresh page; a key with no tab is pruned as the layout settles. */
  pages = $state.raw<Readonly<Record<ItemKey, Page>>>({});
  /* Derived, never stored: the records follow from the attempts and the numbers
     in force, and the concept DAG says what a right answer freshens below it.
     The DAG is the catalogue's, not the registry's, so a prerequisite a foreign
     book taught is freshened too; the map is built once per recompute, and a
     book loading is one of the things that recomputes it. */
  readonly mastery: Mastery = $derived.by(() => {
    const prereqs = new Map<string, readonly string[]>(this.catalog().concepts.map((c) => [c.id, c.prereqs]));
    return rebuild(this.attempts, (id) => prereqs.get(id) ?? [], this.settings);
  });

  /* The record is read from where it has always been kept, and the pages from
     their own key. An older reading wrote one curriculum, one session and one
     face into the record's key, for a view that was a singleton; those are left
     where they lie rather than carried onto a page, since there is no longer
     one page they would belong to. */
  init(): void {
    const o = obj(this.read(KEY));
    if (o) {
      this.attempts = parseAttempts(o.attempts);
      this.settings = parseSettings(o.settings);
    }
    this.pages = parsePages(this.read(PAGES));
  }

  /* What the model is allowed to see of the library: the book the shell was
     started with, and every other book the cache has loaded beside it. A pick
     naming a book that has not loaded comes to nothing until it does. */
  catalog(): Catalog {
    const book = registry.manifest.id;
    const built = (c: ChapterEntry): SectionId[] => c.sections.filter((x) => x.built).map((x) => sectionId(x.id));
    const home: Catalog = {
      concepts: registry.concepts,
      sectionsOf: (b, chapter) => { const c = b === book ? registry.manifest.chapters.find((x) => x.id === chapter || x.dir === chapter) : undefined; return c ? built(c) : []; },
      allSections: (b) => (b === book ? registry.manifest.chapters.flatMap(built) : []),
      exercises: Object.entries(registry.sections).flatMap(([sec, st]) => st.exercises.map((ex) => ({ book, section: sectionId(sec), ex }))),
    };
    return mergeCatalog(home, Object.entries(books.loaded));
  }
  /* A concept and a book's name, wherever they were taught: the view shows both
     beside an exercise drawn out of a book the reader is not reading. */
  conceptOf(id: string): ConceptDTO | undefined { return books.concept(id); }
  bookTitle(id: string): string { return books.title(id); }

  stateOf(id: string, now = Date.now()): State { return stateOf(this.mastery[id], now, this.settings); }
  /* The concepts waiting for review. Read off the records alone, which are
     keyed by the concept and know nothing of the library, so the count is true
     before a single chapter has loaded — which is what the rail needs. */
  get due(): readonly string[] {
    const now = Date.now();
    return Object.keys(this.mastery).filter((id) => stateOf(this.mastery[id], now, this.settings) === 'due');
  }
  /* The reader's one running number, across every book: what was earned, not
     what is left after the decay, so it never goes down. */
  get lifetime(): number { return total(this.mastery); }

  /* An answer, written down once. A second right answer to the same exercise on
     the same day earns nothing — otherwise a card could be checked over and over
     for points — but tomorrow it counts again. The answer is marked on every
     page standing on that exercise, not only the one the reader typed it in:
     two tabs drawing the same problem both move on. */
  record(book: string, section: SectionId, ex: ExerciseDTO, ok: boolean, self: boolean, now = Date.now()): Attempt | null {
    const day = dayOf(now);
    if (this.attempts.some((a) => a.ok && a.book === book && a.section === section && a.ex === ex.id && dayOf(a.at) === day)) return null;
    const worth = pointsOf(ex);
    const earned = ok ? { ...worth } : Object.fromEntries(Object.keys(worth).map((id) => [id, 0]));
    const attempt: Attempt = { book, section, ex: ex.id, at: now, ok, self, earned };
    this.attempts = [...this.attempts, attempt];
    const got = Object.values(earned).reduce((n, v) => n + v, 0);
    const on = (p: Page): boolean => { const d = p.session?.drawn[p.session.at]; return !!d && d.book === book && d.section === section && d.ex === ex.id; };
    const mark = (s: Session): Session => ({ ...s, answered: s.answered.map((v, i) => (i === s.at ? true : v)), earned: s.earned + got });
    const pages = Object.entries(this.pages);
    if (pages.some(([, p]) => on(p))) {
      this.pages = Object.fromEntries(pages.map(([k, p]) => [k, on(p) && p.session ? { ...p, session: mark(p.session) } : p] as const));
      this.savePages();
    }
    this.save();
    return attempt;
  }

  setSetting<K extends keyof PracticeSettings>(k: K, v: PracticeSettings[K]): void { this.settings = { ...this.settings, [k]: v }; this.save(); }
  resetSettings(): void { this.settings = DEFAULT_SETTINGS; this.save(); }
  wipe(): void { this.attempts = []; this.save(); }

  /* ---------- one page of practice ---------- */

  page(key: ItemKey): Page { return this.pages[key] ?? BLANK; }
  /* Whether this page has a session still to finish, which is what the
     dashboard's cards and the Practise tab go back to. */
  live(key: ItemKey): boolean { const s = this.page(key).session; return !!s && s.at < s.drawn.length; }
  /* Every open page with a session running, for the dashboard to list: a reader
     practising in two tabs sees both, and the card for the tab they are on
     resumes in place. */
  liveSessions(): readonly { readonly key: ItemKey; readonly session: Session }[] {
    return Object.entries(this.pages).flatMap(([key, p]) => (p.session && p.session.at < p.session.drawn.length ? [{ key, session: p.session }] : []));
  }

  toggle(key: ItemKey, p: Pick): void { const page = this.page(key); this.set(key, { ...page, curriculum: togglePick(page.curriculum, p) }); }
  clear(key: ItemKey): void { this.set(key, { ...this.page(key), curriculum: [] }); }
  /* The presets and the section button replace the choice rather than adding to
     it, which is what makes them a quick way to a clean start. */
  replace(key: ItemKey, picks: readonly Pick[]): void { this.set(key, { ...this.page(key), curriculum: [...picks] }); }
  /* A page opened with something already chosen, on the face that shows it. */
  seed(key: ItemKey, picks: readonly Pick[], face: Face = 'choose'): void { this.set(key, { ...BLANK, curriculum: [...picks], face }); }
  setShuffle(key: ItemKey, on: boolean): void { this.set(key, { ...this.page(key), shuffle: on }); }

  /* The seed is the day, so a refresh draws the same session and tomorrow draws
     another; with the shuffle on it is a seed of its own, since the whole point
     of shuffling is that the next draw is not the last one. */
  start(key: ItemKey, now = Date.now()): boolean {
    const page = this.page(key);
    const drawn = this.drawFor(page, now);
    if (!drawn.length) return false;
    this.set(key, { ...page, session: { drawn: drawn.map((d) => ({ book: d.book, section: d.section, ex: d.ex.id, why: d.why })), at: 0, answered: drawn.map(() => false), earned: 0, started: now, before: this.mastery }, face: 'practise' });
    return true;
  }
  /* Review, straight off the dashboard: everything due becomes the curriculum,
     and the session is drawn from it. */
  startDue(key: ItemKey, now = Date.now()): boolean {
    const picks: Pick[] = this.due.map((id) => ({ concept: conceptId(id) }));
    this.replace(key, picks);
    return this.start(key, now);
  }
  /* The exercise the session stands on, read back out of the book it belongs to;
     nothing while the section holding it — or the whole foreign book — is still
     being fetched. */
  current(key: ItemKey): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.page(key).session, d = s?.drawn[s.at];
    if (!s || !d) return null;
    const ex = books.exercises(d.book, d.section)?.find((e) => e.id === d.ex);
    return ex ? { book: d.book, section: d.section, ex, why: d.why } : null;
  }
  skip(key: ItemKey): void { this.advance(key); }
  next(key: ItemKey): void { this.advance(key); }
  end(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'summary' }); }
  changed(key: ItemKey, now = Date.now()): ReturnType<typeof summarize> { const s = this.page(key).session; return s ? summarize(s.before, this.mastery, now, this.settings) : []; }
  /* The curriculum opened beside a session, which is not the end of it. */
  choose(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'choose' }); }
  dashboard(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  /* The standing of one book, which is a face rather than a session: it is
     there to be read whether or not anything is running. */
  progress(key: ItemKey, book?: string): void { const page = this.page(key); this.set(key, { ...page, face: 'progress', ...(book ? { book } : {}) }); }
  resume(key: ItemKey): void { const page = this.page(key); if (page.session) this.set(key, { ...page, face: 'practise' }); }
  discard(key: ItemKey): void { this.set(key, { ...this.page(key), session: null, face: 'choose' }); }
  /* The tab has gone, and so has what it stood on. */
  forget(key: ItemKey): void {
    if (!(key in this.pages)) return;
    this.pages = Object.fromEntries(Object.entries(this.pages).filter(([k]) => k !== key));
    this.savePages();
  }
  /* Every page whose tab the layout no longer holds, dropped at once: the shell
     runs this as the layout settles, so a tab closed in one reading leaves
     nothing behind in the next. */
  prune(open: readonly ItemKey[]): void {
    const keep = new Set(open);
    const kept = Object.entries(this.pages).filter(([k]) => keep.has(k));
    if (kept.length === Object.keys(this.pages).length) return;
    this.pages = Object.fromEntries(kept);
    this.savePages();
  }

  /* What a page draws on: its own curriculum, in the order the book sets unless
     the reader has asked for a shuffle. */
  private drawFor(page: Page, now: number, exclude?: ReadonlySet<string>, size?: number): readonly Drawn[] {
    const order = page.shuffle ? 'random' as const : 'book' as const;
    const seed = page.shuffle ? freshSeed() : dayOf(now);
    return draw(page.curriculum, this.mastery, this.catalog(), this.attempts, this.settings, now, seed, { order, ...(exclude ? { exclude } : {}), ...(size ? { size } : {}) });
  }
  /* On to the next exercise, and off the end of the session into the summary.
     With the shuffle on, the slots the reader has not reached are drawn again
     as they go, leaving out everything the session has already served, so the
     rest of the round is not the list it was when it began. */
  private advance(key: ItemKey): void {
    const page = this.page(key), s = page.session; if (!s) return;
    const at = Math.min(s.at + 1, s.drawn.length);
    if (at >= s.drawn.length) { this.set(key, { ...page, session: { ...s, at }, face: 'summary' }); return; }
    this.set(key, { ...page, session: page.shuffle ? this.reshuffle(page, s, at) : { ...s, at } });
  }
  private reshuffle(page: Page, s: Session, at: number): Session {
    const served = new Set(s.drawn.slice(0, at).map(exKey));
    const rest = this.drawFor(page, Date.now(), served, s.drawn.length - at);
    if (!rest.length) return { ...s, at };
    return {
      ...s, at,
      drawn: [...s.drawn.slice(0, at), ...rest.map((d) => ({ book: d.book, section: d.section, ex: d.ex.id, why: d.why }))],
      answered: [...s.answered.slice(0, at), ...rest.map(() => false)],
    };
  }

  private set(key: ItemKey, page: Page): void { this.pages = { ...this.pages, [key]: page }; this.savePages(); }
  private read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
  private save(): void {
    try { localStorage.setItem(KEY, JSON.stringify({ attempts: this.attempts, settings: this.settings })); } catch { /* private mode */ }
  }
  private savePages(): void { try { localStorage.setItem(PAGES, JSON.stringify(this.pages)); } catch { /* private mode */ } }
}
export const practice = new Practice();
