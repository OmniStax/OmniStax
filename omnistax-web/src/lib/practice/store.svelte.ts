/* The live practice: what the reader has answered, the numbers they set, and
   the page each open practice tab stands on. The mastery records are not kept
   — they are rebuilt from the attempts every time one of those changes, which
   is how a change of settings takes effect on old work.

   What the reader has earned is one thing across every book in the library,
   because concept ids are canonical: mastering hookes-law in one book is
   mastering it in all. What is book-bound — an attempt, a drawn exercise —
   carries its book beside its section, since section ids are not unique across
   books.

   A session is not page-bound. It is a course of study the reader began, and it
   lives in a table of its own until it is finished or thrown away: pausing one
   leaves it standing, closing its tab leaves it standing, and it can be picked
   up again from the dashboard of whichever practice page is to hand. A page
   points at the session it is showing by id, and holds what is properly its
   own — the picks being made and the face showing — so two pages may run two sessions at once and neither
   disturbs the other. A page goes when its tab does; the session it was
   showing does not. None of this is on the shell's undo stack, for the same
   reason the colours are not: answering a question is not an edit to take
   back. */
import type { ExerciseDTO, ChapterEntry, ConceptDTO } from '../content/schema';
import { type SectionId, sectionId, conceptId } from '../types/ids';
import type { ItemKey } from '../layout/model';
import { registry } from '../sections/registry.svelte';
import { books } from './books.svelte';
import { mergeCatalog } from './books';
import {
  DEFAULT_SETTINGS, dayOf, draw, newSessionId, pointsOf, progressOf, rebuild, sessionId, shareOf, stateOf, togglePick, total, uniqueById,
  type Attempt, type Catalog, type Curriculum, type Drawn, type Mastery, type Pick, type PracticeSettings, type SessionId, type State,
} from './model';

/* The four faces a practice page may show. Dashboard is where a fresh page
   opens: what the reader has done and what is waiting, with the practising one
   click away, and every book's standing under a row that opens in place. */
export type Face = 'dashboard' | 'choose' | 'practise' | 'progress';
/* One course of study: what it was drawn from, what it drew, how far the reader
   has come and what they have earned on the way. `before` is the standing as it
   was when the session opened, which is what Progress reads to draw the old
   mastery boxes beside the new ones. */
export type Session = {
  readonly id: SessionId;
  readonly curriculum: Curriculum;   /* the picks as they stood when it was drawn */
  readonly drawn: readonly { book: string; section: SectionId; ex: string; why: Drawn['why'] }[];
  readonly at: number;               /* index of the current exercise */
  readonly answered: readonly boolean[];   /* per drawn: recorded */
  readonly outcomes: readonly (boolean | null)[]; /* per drawn: right, wrong, or not answered */
  readonly earned: number;
  readonly started: number;
  readonly before: Mastery;
};
/* One practice tab's own state. `session` is the session this tab is showing,
   which lives in the store's own table rather than here. `book` is the book
   whose breakdown stands open on the dashboard, and means nothing on any other
   face. */
export type Page = { readonly curriculum: Curriculum; readonly session: SessionId | null; readonly face: Face; readonly showAll: boolean };
/* A page nobody has opened yet, and the page every closed tab goes back to. */
export const BLANK: Page = { curriculum: [], session: null, face: 'dashboard', showAll: false };

const KEY = 'omnistax-practice-v1';             /* the attempts and the numbers: the reader's own record */
const PAGES = 'omnistax-practice-pages-v1';     /* one entry per open practice tab */
const SESSIONS = 'omnistax-practice-sessions-v1';   /* every session still to finish, whatever tab began it */
const FACES: readonly Face[] = ['dashboard', 'choose', 'practise', 'progress'];
const WHYS: readonly Drawn['why'][] = ['frontier', 'more'];

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
    threshold: num(o.threshold, DEFAULT_SETTINGS.threshold), days: num(o.days, DEFAULT_SETTINGS.days),
    session: num(o.session, DEFAULT_SETTINGS.session), selfChecked: typeof o.selfChecked === 'boolean' ? o.selfChecked : DEFAULT_SETTINGS.selfChecked,
  };
};
const parseRecord = (raw: unknown): Mastery => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, v]) => {
    const r = obj(v); if (!r) return [];
    return [[id, { score: num(r.score, 0), lastAt: num(r.lastAt, 0), days: num(r.days, 0), lastDay: str(r.lastDay), mastered: r.mastered === true, earned: num(r.earned, 0) }] as const];
  }));
};
/* A session as it was written down. The id it is filed under is the id it
   carries, so a table whose keys have been meddled with still reads back with
   every session pointing at itself. */
const parseSession = (raw: unknown, id: SessionId): Session | null => {
  const o = obj(raw); if (!o || !Array.isArray(o.drawn)) return null;
  const drawn = o.drawn.flatMap((d) => {
    const e = obj(d); if (!e || !str(e.book) || !str(e.section) || !str(e.ex)) return [];
    const why = WHYS.find((w) => w === e.why) ?? 'more';
    return [{ book: str(e.book), section: sectionId(str(e.section)), ex: str(e.ex), why }];
  });
  if (!drawn.length) return null;
  const answered = drawn.map((_, i) => (Array.isArray(o.answered) ? o.answered[i] === true : false));
  const outcomes = drawn.map((_, i): boolean | null => {
    const v = Array.isArray(o.outcomes) ? o.outcomes[i] : undefined;
    return typeof v === 'boolean' ? v : answered[i] ? true : null;
  });
  return {
    id, curriculum: parseCurriculum(o.curriculum), drawn,
    at: Math.min(Math.max(0, Math.round(num(o.at, 0))), drawn.length), answered, outcomes,
    earned: num(o.earned, 0), started: num(o.started, 0), before: parseRecord(o.before),
  };
};
const parseSessions = (raw: unknown): Record<SessionId, Session> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([k, v]) => { const s = parseSession(v, sessionId(k)); return s ? [[k, s] as const] : []; }));
};
/* A page, and beside it the session an older reading kept inside it. That
   reading wrote the session as an object where this one writes the id of a
   session in the table; a page carrying one is read back whole and the session
   is lifted out on `init`, so a round begun before this change goes on. */
type Stored = { readonly page: Page; readonly lifted: Session | null };
const parsePage = (raw: unknown): Stored => {
  const o = obj(raw); if (!o) return { page: BLANK, lifted: null };
  const curriculum = parseCurriculum(o.curriculum);
  const held = obj(o.session) ? parseSession(o.session, newSessionId()) : null;
  /* A session kept inside its page was drawn from that page's picks, and had no
     record of its own of what it was drawn from: the page's are its. */
  const lifted = held && !held.curriculum.length ? { ...held, curriculum } : held;
  const named = str(o.session);
  return {
    page: {
      curriculum,
      session: lifted ? lifted.id : named ? sessionId(named) : null,
      face: o.face === 'summary' ? 'progress' : FACES.find((f) => f === o.face) ?? 'dashboard', showAll: o.showAll === true,
    },
    lifted,
  };
};
const parsePages = (raw: unknown): Record<ItemKey, Stored> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, parsePage(v)] as const));
};

class Practice {
  attempts = $state.raw<readonly Attempt[]>([]);
  settings = $state.raw<PracticeSettings>(DEFAULT_SETTINGS);
  /* One entry per practice tab, by the key that tab holds. A tab with no entry
     is a fresh page; a key with no tab is pruned as the layout settles. */
  pages = $state.raw<Readonly<Record<ItemKey, Page>>>({});
  /* Every session the reader has begun and not finished, by its own id. It
     outlives the page that began it: a session goes only when the reader leaves
     its Progress screen or throws it away. */
  sessions = $state.raw<Readonly<Record<SessionId, Session>>>({});
  /* Derived, never stored: the records follow from the attempts and the mastery
     numbers in force. */
  readonly mastery: Mastery = $derived.by(() => rebuild(this.attempts, this.settings));

  /* The record is read from where it has always been kept, the pages and the
     sessions from their own keys. An older reading wrote one curriculum, one
     session and one face into the record's key, for a view that was a
     singleton; those are left where they lie rather than carried onto a page,
     since there is no longer one page they would belong to. A session an
     in-between reading kept inside its page is lifted into the table under a
     fresh id, with the page left pointing at it. */
  init(): void {
    const o = obj(this.read(KEY));
    if (o) {
      this.attempts = parseAttempts(o.attempts);
      this.settings = parseSettings(o.settings);
    }
    const stored = Object.entries(parsePages(this.read(PAGES)));
    const lifted = stored.flatMap(([, s]) => (s.lifted ? [[s.lifted.id, s.lifted] as const] : []));
    this.pages = Object.fromEntries(stored.map(([k, s]) => [k, s.page] as const));
    this.sessions = { ...parseSessions(this.read(SESSIONS)), ...Object.fromEntries(lifted) };
    if (lifted.length) { this.savePages(); this.saveSessions(); }
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
  /* What one book teaches, each concept once. The book being read has its list
     off the registry, which has already joined its chapters; any other has one
     list per chapter fetched, and a chapter carries the prerequisites it
     reaches as well as the concepts it teaches, so the flattened list repeats
     itself and has to be made one before it is counted or drawn. */
  conceptsIn(book: string): readonly ConceptDTO[] {
    return book === registry.manifest.id ? registry.concepts : uniqueById(books.loaded[book]?.concepts ?? []);
  }

  stateOf(id: string): State { return stateOf(this.mastery[id]); }
  /* How far a concept stands towards mastery, 0 to 1: the fill of its mastery
     box and the length of its bar. */
  share(id: string): number { return shareOf(this.mastery[id], this.settings); }
  /* The reader's one running number, across every book. */
  get lifetime(): number { return total(this.mastery); }

  /* An answer, written down once. A second right answer to the same exercise on
     the same day earns nothing — otherwise a card could be checked over and over
     for points — but tomorrow it counts again. The answer is marked on every
     session standing on that exercise, not only the one the reader typed it in:
     two rounds drawing the same problem both move on. */
  record(book: string, section: SectionId, ex: ExerciseDTO, ok: boolean, self: boolean, now = Date.now()): Attempt | null {
    const day = dayOf(now);
    const counted = this.attempts.some((a) => a.ok && a.book === book && a.section === section && a.ex === ex.id && dayOf(a.at) === day);
    const worth = pointsOf(ex);
    const earned = ok ? { ...worth } : Object.fromEntries(Object.keys(worth).map((id) => [id, 0]));
    const attempt: Attempt = { book, section, ex: ex.id, at: now, ok, self, earned };
    if (!counted) this.attempts = [...this.attempts, attempt];
    const got = counted ? 0 : Object.values(earned).reduce((n, v) => n + v, 0);
    const on = (s: Session): boolean => s.drawn.some((d) => d.book === book && d.section === section && d.ex === ex.id);
    const mark = (s: Session): Session => ({
      ...s,
      answered: s.answered.map((v, i) => { const d = s.drawn[i]; return d.book === book && d.section === section && d.ex === ex.id ? true : v; }),
      outcomes: s.outcomes.map((v, i) => { const d = s.drawn[i]; return d.book === book && d.section === section && d.ex === ex.id ? ok : v; }),
      earned: s.earned + got,
    });
    const sessions = Object.entries(this.sessions);
    if (sessions.some(([, s]) => on(s))) {
      this.sessions = Object.fromEntries(sessions.map(([k, s]) => [k, on(s) ? mark(s) : s] as const));
      this.saveSessions();
    }
    if (!counted) this.save();
    return counted ? null : attempt;
  }

  setSetting<K extends keyof PracticeSettings>(k: K, v: PracticeSettings[K]): void { this.settings = { ...this.settings, [k]: v }; this.save(); }
  resetSettings(): void { this.settings = DEFAULT_SETTINGS; this.save(); }
  wipe(): void { this.attempts = []; this.save(); }

  /* ---------- one page of practice ---------- */

  page(key: ItemKey): Page { return this.pages[key] ?? BLANK; }
  /* The session this page is showing, if it is still in the table. */
  sessionOf(key: ItemKey): Session | null { const id = this.page(key).session; return id ? this.sessions[id] ?? null : null; }
  /* A session is running while it has an exercise left to stand on. Reaching
     the end of the drawn list ends it, and so does the End button, which puts
     the reader at the end of the list rather than leaving them in the middle of
     a round they have said they are done with. */
  private static running(s: Session): boolean { return s.at < s.drawn.length; }
  /* Whether this page has a session still to finish, which is what the
     dashboard's cards and the Practice tab go back to. */
  live(key: ItemKey): boolean { const s = this.sessionOf(key); return !!s && Practice.running(s); }
  /* Every session still running, oldest first, each with the page showing it
     where one is: a reader practising in two tabs sees both, the card for the
     tab they are on resumes in place, and a session whose tab was closed says
     so and can be taken up again here. */
  liveSessions(): readonly { readonly session: Session; readonly key: ItemKey | null }[] {
    const attached = new Map(Object.entries(this.pages).flatMap(([k, p]) => (p.session ? [[p.session, k] as const] : [])));
    return Object.values(this.sessions)
      .filter(Practice.running)
      .sort((a, b) => a.started - b.started)
      .map((session) => ({ session, key: attached.get(session.id) ?? null }));
  }

  toggle(key: ItemKey, p: Pick): void { const page = this.page(key); this.set(key, { ...page, curriculum: togglePick(page.curriculum, p) }); }
  clear(key: ItemKey): void { this.set(key, { ...this.page(key), curriculum: [] }); }
  /* The presets and the section button replace the choice rather than adding to
     it, which is what makes them a quick way to a clean start. */
  replace(key: ItemKey, picks: readonly Pick[]): void { this.set(key, { ...this.page(key), curriculum: [...picks] }); }
  /* A page opened with something already chosen, on the face that shows it. */
  seed(key: ItemKey, picks: readonly Pick[], face: Face = 'choose'): void { this.set(key, { ...BLANK, curriculum: [...picks], face }); }
  /* A page opened straight onto a session already running, which is what the
     dashboard does when this page is busy with a round of its own: the new page
     takes the session's picks for its own, so choosing again there goes on from
     what that session is about. */
  seedSession(key: ItemKey, id: SessionId): void {
    const s = this.sessions[id]; if (!s) return;
    this.set(key, { ...BLANK, curriculum: [...s.curriculum], session: id, face: 'practise' });
  }
  /* A session taken up by a page that has none of its own: the same move, onto
     a page that already stands somewhere. */
  attach(key: ItemKey, id: SessionId): void {
    const s = this.sessions[id]; if (!s) return;
    this.set(key, { ...this.page(key), curriculum: [...s.curriculum], session: id, face: 'practise' });
  }
  setShowAll(key: ItemKey, on: boolean): void { this.set(key, { ...this.page(key), showAll: on }); }

  /* The seed is the day, so a refresh draws the same session and tomorrow draws
     another. A page that was already showing a session lets it go rather than
     ending it: the old round
     stays in the table, detached, and the dashboard offers it back. */
  start(key: ItemKey, now = Date.now()): boolean {
    const page = this.page(key);
    const drawn = this.drawFor(page, now);
    if (!drawn.length) return false;
    const session: Session = {
      id: newSessionId(), curriculum: [...page.curriculum],
      drawn: drawn.map((d) => ({ book: d.book, section: d.section, ex: d.ex.id, why: d.why })),
      at: 0, answered: drawn.map(() => false), outcomes: drawn.map(() => null), earned: 0, started: now, before: this.mastery,
    };
    this.put(session);
    this.set(key, { ...page, session: session.id, face: 'practise' });
    return true;
  }
  /* The exercise the session stands on, read back out of the book it belongs to;
     nothing while the section holding it — or the whole foreign book — is still
     being fetched. */
  current(key: ItemKey): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.sessionOf(key), d = s?.drawn[s.at];
    if (!s || !d) return null;
    const ex = books.exercises(d.book, d.section)?.find((e) => e.id === d.ex);
    return ex ? { book: d.book, section: d.section, ex, why: d.why } : null;
  }
  exerciseAt(key: ItemKey, at: number): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.sessionOf(key), d = s?.drawn[at];
    if (!s || !d) return null;
    const ex = books.exercises(d.book, d.section)?.find((e) => e.id === d.ex);
    return ex ? { book: d.book, section: d.section, ex, why: d.why } : null;
  }
  go(key: ItemKey, at: number): void {
    const s = this.sessionOf(key); if (!s || at < 0 || at >= s.drawn.length) return;
    this.put({ ...s, at });
  }
  /* After a verdict, move to the next unanswered exercise. A completed round
     stays on its last answer until the reader explicitly ends it. */
  afterAnswer(key: ItemKey, from: number): void {
    const s = this.sessionOf(key); if (!s) return;
    const order = [...s.outcomes.keys()].filter((i) => i > from).concat([...s.outcomes.keys()].filter((i) => i < from));
    const next = order.find((i) => s.outcomes[i] === null);
    if (next !== undefined) this.put({ ...s, at: next });
  }
  skip(key: ItemKey): void { this.advance(key); }
  next(key: ItemKey): void { this.advance(key); }
  /* The reader says they are done before the round is. The answers already
     given are kept and the session is taken to its end, so it stops asking to
     be resumed, and Progress is what they see. */
  end(key: ItemKey): void {
    const s = this.sessionOf(key);
    if (s && Practice.running(s)) this.put({ ...s, at: s.drawn.length });
    this.set(key, { ...this.page(key), face: 'progress' });
  }
  /* The session is over and the reader has read Progress: it goes, and the
     page is back on the dashboard with nothing running. */
  finish(key: ItemKey): void {
    const id = this.page(key).session;
    if (id) this.drop(id);
    this.set(key, { ...this.page(key), session: null, face: 'dashboard' });
  }
  /* A session paused: the page goes back to the dashboard and the session stays
     where it is, still this page's, so the Practice tab comes back to it. */
  pause(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  progress(key: ItemKey): ReturnType<typeof progressOf> { const s = this.sessionOf(key); return s ? progressOf(s.before, this.mastery, this.settings) : []; }
  /* The curriculum opened beside a session, which is not the end of it. */
  choose(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'choose' }); }
  dashboard(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  resume(key: ItemKey): void { const page = this.page(key); if (this.live(key)) this.set(key, { ...page, face: 'practise' }); }
  discard(key: ItemKey): void {
    const id = this.page(key).session;
    if (id) this.drop(id);
    this.set(key, { ...this.page(key), session: null, face: 'choose' });
  }
  /* The tab has gone, and so has the page it stood on. What it was showing is
     not the page's to take with it: a session goes when it ends or is thrown
     away, and until then the dashboard of any practice page offers it back. */
  forget(key: ItemKey): void {
    if (!(key in this.pages)) return;
    this.pages = Object.fromEntries(Object.entries(this.pages).filter(([k]) => k !== key));
    this.savePages();
  }
  /* Every page whose tab the layout no longer holds, dropped at once: the shell
     runs this as the layout settles, so a tab closed in one reading leaves
     nothing behind in the next. The sessions those pages were showing stay. */
  prune(open: readonly ItemKey[]): void {
    const keep = new Set(open);
    const kept = Object.entries(this.pages).filter(([k]) => keep.has(k));
    if (kept.length === Object.keys(this.pages).length) return;
    this.pages = Object.fromEntries(kept);
    this.savePages();
  }

  /* What a page draws on: its own curriculum, in the order the book sets. */
  private drawFor(page: Page, now: number, exclude?: ReadonlySet<string>, size?: number): readonly Drawn[] {
    return draw(page.curriculum, this.mastery, this.catalog(), this.attempts, this.settings, now, dayOf(now), { order: 'book', ...(exclude ? { exclude } : {}), ...(size ? { size } : {}) });
  }
  /* On to the next exercise, and off the end of the session into Progress. */
  private advance(key: ItemKey): void {
    const page = this.page(key), s = this.sessionOf(key); if (!s) return;
    const at = Math.min(s.at + 1, s.drawn.length);
    if (at >= s.drawn.length) { this.put({ ...s, at }); this.set(key, { ...page, face: 'progress' }); return; }
    this.put({ ...s, at });
  }

  private set(key: ItemKey, page: Page): void { this.pages = { ...this.pages, [key]: page }; this.savePages(); }
  /* One session written back into the table, whether it is new or has moved on. */
  private put(s: Session): void { this.sessions = { ...this.sessions, [s.id]: s }; this.saveSessions(); }
  /* A session gone for good, and every page that was showing it left with
     nothing running rather than pointing at a session that is not there. */
  private drop(id: SessionId): void {
    if (!(id in this.sessions)) return;
    this.sessions = Object.fromEntries(Object.entries(this.sessions).filter(([k]) => k !== id));
    this.saveSessions();
    const pages = Object.entries(this.pages);
    if (!pages.some(([, p]) => p.session === id)) return;
    this.pages = Object.fromEntries(pages.map(([k, p]) => [k, p.session === id ? { ...p, session: null } : p] as const));
    this.savePages();
  }
  private read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
  private save(): void {
    try { localStorage.setItem(KEY, JSON.stringify({ attempts: this.attempts, settings: this.settings })); } catch { /* private mode */ }
  }
  private savePages(): void { try { localStorage.setItem(PAGES, JSON.stringify(this.pages)); } catch { /* private mode */ } }
  private saveSessions(): void { try { localStorage.setItem(SESSIONS, JSON.stringify(this.sessions)); } catch { /* private mode */ } }
}
export const practice = new Practice();
