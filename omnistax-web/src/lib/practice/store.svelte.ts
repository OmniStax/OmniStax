/* The live practice: what the reader has answered, what they chose to practise,
   the numbers they set, and the session running. The mastery records are not
   kept — they are rebuilt from the attempts every time one of those changes,
   which is how a change of settings takes effect on old work.

   One key holds the lot, across every book in the library, because concept ids
   are canonical: mastering hookes-law in one book is mastering it in all. What
   is book-bound — an attempt, a drawn exercise — carries its book beside its
   section, since section ids are not unique across books. None of this is on
   the shell's undo stack, for the same reason the colours are not: answering a
   question is not an edit to take back. */
import type { ExerciseDTO, ChapterEntry, ConceptDTO } from '../content/schema';
import { type SectionId, sectionId, conceptId } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { books } from './books.svelte';
import { mergeCatalog } from './books';
import {
  DEFAULT_SETTINGS, dayOf, draw, pointsOf, rebuild, stateOf, summarize, togglePick, total,
  type Attempt, type Catalog, type Curriculum, type Drawn, type Mastery, type Pick, type PracticeSettings, type State,
} from './model';

export type Face = 'choose' | 'practise' | 'summary' | 'progress';
export type Session = { readonly drawn: readonly { book: string; section: SectionId; ex: string; why: Drawn['why'] }[]; readonly at: number /* index of the current exercise */; readonly answered: readonly boolean[] /* per drawn: recorded */; readonly earned: number; readonly started: number; readonly before: Mastery /* snapshot at start, for the summary */ };

const KEY = 'omnistax-practice-v1';
const FACES: readonly Face[] = ['choose', 'practise', 'summary', 'progress'];
const WHYS: readonly Drawn['why'][] = ['review', 'frontier', 'more'];

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

class Practice {
  attempts = $state.raw<readonly Attempt[]>([]);
  curriculum = $state.raw<Curriculum>([]);
  settings = $state.raw<PracticeSettings>(DEFAULT_SETTINGS);
  session = $state.raw<Session | null>(null);
  face = $state<Face>('choose');
  /* Derived, never stored: the records follow from the attempts and the numbers
     in force, and the concept DAG says what a right answer freshens below it.
     The DAG is the catalogue's, not the registry's, so a prerequisite a foreign
     book taught is freshened too; the map is built once per recompute, and a
     book loading is one of the things that recomputes it. */
  readonly mastery: Mastery = $derived.by(() => {
    const prereqs = new Map<string, readonly string[]>(this.catalog().concepts.map((c) => [c.id, c.prereqs]));
    return rebuild(this.attempts, (id) => prereqs.get(id) ?? [], this.settings);
  });

  init(): void {
    const o = obj(this.read());
    if (!o) return;
    this.attempts = parseAttempts(o.attempts);
    this.curriculum = parseCurriculum(o.curriculum);
    this.settings = parseSettings(o.settings);
    this.session = parseSession(o.session);
    this.face = FACES.find((f) => f === o.face) ?? 'choose';
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
     for points — but tomorrow it counts again. */
  record(book: string, section: SectionId, ex: ExerciseDTO, ok: boolean, self: boolean, now = Date.now()): Attempt | null {
    const day = dayOf(now);
    if (this.attempts.some((a) => a.ok && a.book === book && a.section === section && a.ex === ex.id && dayOf(a.at) === day)) return null;
    const worth = pointsOf(ex);
    const earned = ok ? { ...worth } : Object.fromEntries(Object.keys(worth).map((id) => [id, 0]));
    const attempt: Attempt = { book, section, ex: ex.id, at: now, ok, self, earned };
    this.attempts = [...this.attempts, attempt];
    const s = this.session, at = s?.drawn[s.at];
    if (s && at && at.book === book && at.section === section && at.ex === ex.id) {
      this.session = { ...s, answered: s.answered.map((v, i) => (i === s.at ? true : v)), earned: s.earned + Object.values(earned).reduce((n, v) => n + v, 0) };
    }
    this.save();
    return attempt;
  }

  setSetting<K extends keyof PracticeSettings>(k: K, v: PracticeSettings[K]): void { this.settings = { ...this.settings, [k]: v }; this.save(); }
  resetSettings(): void { this.settings = DEFAULT_SETTINGS; this.save(); }
  toggle(p: Pick): void { this.curriculum = togglePick(this.curriculum, p); this.save(); }
  clear(): void { this.curriculum = []; this.save(); }

  /* The seed is the day, so a refresh draws the same session and tomorrow draws another. */
  start(now = Date.now()): boolean {
    const drawn = draw(this.curriculum, this.mastery, this.catalog(), this.attempts, this.settings, now, dayOf(now));
    if (!drawn.length) return false;
    this.session = { drawn: drawn.map((d) => ({ book: d.book, section: d.section, ex: d.ex.id, why: d.why })), at: 0, answered: drawn.map(() => false), earned: 0, started: now, before: this.mastery };
    this.face = 'practise'; this.save();
    return true;
  }
  /* The exercise the session stands on, read back out of the book it belongs to;
     nothing while the section holding it — or the whole foreign book — is still
     being fetched. */
  current(): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.session, d = s?.drawn[s.at];
    if (!s || !d) return null;
    const ex = books.exercises(d.book, d.section)?.find((e) => e.id === d.ex);
    return ex ? { book: d.book, section: d.section, ex, why: d.why } : null;
  }
  skip(): void { this.advance(); }
  next(): void { this.advance(); }
  end(): void { this.face = 'summary'; this.save(); }
  changed(now = Date.now()): ReturnType<typeof summarize> { const s = this.session; return s ? summarize(s.before, this.mastery, now, this.settings) : []; }
  /* The curriculum opened beside a session, which is not the end of it. */
  choose(): void { this.face = 'choose'; this.save(); }
  /* The standing of every concept, which is a face rather than a session: it
     is there to be read whether or not anything is running. */
  progress(): void { this.face = 'progress'; this.save(); }
  resume(): void { if (this.session) { this.face = 'practise'; this.save(); } }
  discard(): void { this.session = null; this.face = 'choose'; this.save(); }
  wipe(): void { this.attempts = []; this.save(); }

  private advance(): void {
    const s = this.session; if (!s) return;
    const at = Math.min(s.at + 1, s.drawn.length);
    this.session = { ...s, at };
    if (at >= s.drawn.length) this.face = 'summary';
    this.save();
  }
  private read(): unknown { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } }
  private save(): void {
    const blob = { attempts: this.attempts, curriculum: this.curriculum, settings: this.settings, session: this.session, face: this.face };
    try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch { /* private mode */ }
  }
}
export const practice = new Practice();
