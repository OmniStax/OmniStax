/* Persistent practice evidence and the lifecycle of a prepared round. */
import type { ExerciseDTO, ChapterEntry, ConceptDTO } from '../content/schema';
import { type SectionId, sectionId, conceptId } from '../types/ids';
import type { ItemKey } from '../layout/model';
import { registry } from '../sections/registry.svelte';
import { books } from './books.svelte';
import { mergeCatalog } from './books';
import {
  DEFAULT_SETTINGS, availabilityOf, freshnessOf, newSessionId, prepare, progressOf, rebuild,
  sessionId, shareOf, stateOf, togglePick, uniqueById,
  type Attempt, type Catalog, type Curriculum, type Drawn, type Mastery, type Pick,
  type PracticeSettings, type Presentation, type RoundEnd, type RoundPlan,
  type SelfAssessments, type SessionId, type State,
} from './model';
import { readerWritesAllowed } from '../backup/guard';
import { offlineBooks } from '../offline/store.svelte';

export type Face = 'dashboard' | 'choose' | 'practise' | 'progress';
export type Session = {
  readonly id: SessionId;
  readonly curriculum: Curriculum;
  readonly concepts: readonly string[];
  readonly drawn: readonly { book: string; section: SectionId; ex: string; why: Drawn['why']; release?: string }[];
  readonly at: number;
  readonly outcomes: readonly (boolean | null)[];
  readonly started: number;
  readonly before: Mastery;
};
export type Page = { readonly curriculum: Curriculum; readonly session: SessionId | null; readonly face: Face; readonly showAll: boolean };
export const BLANK: Page = { curriculum: [], session: null, face: 'dashboard', showAll: false };

const KEY = 'omnistax-practice-v2';
const OLD_KEY = 'omnistax-practice-v1';
const PAGES = 'omnistax-practice-pages-v2';
const OLD_PAGES = 'omnistax-practice-pages-v1';
const SESSIONS = 'omnistax-practice-sessions-v2';
const OLD_SESSIONS = 'omnistax-practice-sessions-v1';
const FACES: readonly Face[] = ['dashboard', 'choose', 'practise', 'progress'];

const obj = (raw: unknown): Record<string, unknown> | null => typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
const str = (v: unknown): string => typeof v === 'string' ? v : '';
const num = (v: unknown, fallback = 0): number => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown, fallback: boolean): boolean => typeof v === 'boolean' ? v : fallback;
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const oldConcepts = (raw: unknown): string[] => Object.keys(obj(raw) ?? {});

const parseAttempts = (raw: unknown): Attempt[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.book) || !str(o.section) || !str(o.ex) || !Number.isFinite(o.at)) return [];
  const concepts = strings(o.concepts); const round = str(o.round);
  return [{ book: str(o.book), section: sectionId(str(o.section)), ex: str(o.ex), at: num(o.at), ok: o.ok === true, concepts: concepts.length ? concepts : oldConcepts(o.earned), ...(round ? { round: sessionId(round) } : {}), ...(str(o.release) ? { release: str(o.release) } : {}), ...(strings(o.mastered).length ? { mastered: strings(o.mastered) } : {}) }];
});
const parseShown = (raw: unknown): Presentation[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.book) || !str(o.section) || !str(o.ex) || !str(o.round) || !Number.isFinite(o.at)) return [];
  return [{ book: str(o.book), section: sectionId(str(o.section)), ex: str(o.ex), at: num(o.at), round: sessionId(str(o.round)), ...(str(o.release) ? { release: str(o.release) } : {}) }];
});
const parseSettings = (raw: unknown): PracticeSettings => {
  const o = obj(raw); if (!o) return DEFAULT_SETTINGS;
  return {
    masteryTarget: Math.max(1, Math.round(num(o.masteryTarget, DEFAULT_SETTINGS.masteryTarget))),
    freshnessDecay: bool(o.freshnessDecay, DEFAULT_SETTINGS.freshnessDecay),
    startingHalfLife: Math.max(1, num(o.startingHalfLife, DEFAULT_SETTINGS.startingHalfLife)),
    maxHalfLife: Math.max(1, num(o.maxHalfLife, DEFAULT_SETTINGS.maxHalfLife)),
    order: o.order === 'grouped' ? 'grouped' : 'mixed',
    includeFresh: bool(o.includeFresh, DEFAULT_SETTINGS.includeFresh),
  };
};
const parseSelf = (raw: unknown): SelfAssessments => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, value]) => {
    const r = obj(value); if (!r) return [];
    return [[id, { level: Math.max(0, Math.round(num(r.level))), mastered: r.mastered === true, at: num(r.at), noDecay: r.noDecay === true }] as const];
  }));
};
const parseRounds = (raw: unknown): RoundEnd[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.id) || !Array.isArray(o.concepts)) return [];
  const concepts = o.concepts.flatMap((value) => {
    const r = obj(value); if (!r || !str(r.id)) return [];
    return [{ id: str(r.id), expected: Math.max(0, Math.round(num(r.expected))), answered: Math.max(0, Math.round(num(r.answered))), correct: Math.max(0, Math.round(num(r.correct))), wasMastered: r.wasMastered === true, wasDue: r.wasDue === true }];
  });
  return [{ id: sessionId(str(o.id)), started: num(o.started), at: num(o.at), concepts, newlyMastered: strings(o.newlyMastered) }];
});
const parseCurriculum = (raw: unknown): Pick[] => !Array.isArray(raw) ? [] : raw.flatMap((value): Pick[] => {
  const o = obj(value); if (!o) return [];
  if (str(o.concept)) return [{ concept: conceptId(str(o.concept)) }];
  if (!str(o.book)) return [];
  return [{ book: str(o.book), ...(str(o.chapter) ? { chapter: str(o.chapter) } : {}), ...(str(o.section) ? { section: sectionId(str(o.section)) } : {}) }];
});
const parseMastery = (raw: unknown): Mastery => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, value]) => {
    const r = obj(value); if (!r) return [];
    const oldScore = num(r.score), target = Math.max(1, Math.round(num(r.target, DEFAULT_SETTINGS.masteryTarget)));
    return [[id, {
      level: Math.min(target, Math.max(0, Math.round(num(r.level, oldScore)))), target,
      mastered: r.mastered === true, masteredAt: num(r.masteredAt, num(r.lastAt)), lastAt: num(r.lastAt),
      halfLife: num(r.halfLife, DEFAULT_SETTINGS.startingHalfLife), reviewedAt: num(r.reviewedAt, num(r.lastAt)),
      dueAt: num(r.dueAt), selfAssessed: r.selfAssessed === true, noDecay: r.noDecay === true,
    }] as const];
  }));
};
const parseSession = (raw: unknown, id: SessionId): Session | null => {
  const o = obj(raw); if (!o || !Array.isArray(o.drawn)) return null;
  const drawn = o.drawn.flatMap((value) => {
    const d = obj(value); if (!d || !str(d.book) || !str(d.section) || !str(d.ex)) return [];
    const why: Drawn['why'] = d.why === 'new' || d.why === 'unanswered' || d.why === 'review' ? d.why : 'review';
    return [{ book: str(d.book), section: sectionId(str(d.section)), ex: str(d.ex), why, ...(str(d.release) ? { release: str(d.release) } : {}) }];
  });
  if (!drawn.length) return null;
  const oldAnswered = Array.isArray(o.answered) ? o.answered : [];
  const outcomes = drawn.map((_, i): boolean | null => { const v = Array.isArray(o.outcomes) ? o.outcomes[i] : undefined; return typeof v === 'boolean' ? v : oldAnswered[i] === true ? true : null; });
  return {
    id, curriculum: parseCurriculum(o.curriculum), concepts: strings(o.concepts), drawn,
    at: Math.min(drawn.length, Math.max(0, Math.round(num(o.at)))), outcomes,
    started: num(o.started), before: parseMastery(o.before),
  };
};
const parseSessions = (raw: unknown): Record<SessionId, Session> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, value]) => { const parsed = parseSession(value, sessionId(id)); return parsed ? [[id, parsed] as const] : []; }));
};
const parsePage = (raw: unknown): Page => {
  const o = obj(raw); if (!o) return BLANK;
  const named = str(o.session);
  return { curriculum: parseCurriculum(o.curriculum), session: named ? sessionId(named) : null, face: o.face === 'summary' ? 'progress' : FACES.find((x) => x === o.face) ?? 'dashboard', showAll: o.showAll === true };
};
const parsePages = (raw: unknown): Record<ItemKey, Page> => {
  const o = obj(raw); return o ? Object.fromEntries(Object.entries(o).map(([key, value]) => [key, parsePage(value)])) : {};
};

class Practice {
  attempts = $state.raw<readonly Attempt[]>([]);
  shown = $state.raw<readonly Presentation[]>([]);
  rounds = $state.raw<readonly RoundEnd[]>([]);
  self = $state.raw<SelfAssessments>({});
  settings = $state.raw<PracticeSettings>(DEFAULT_SETTINGS);
  pages = $state.raw<Readonly<Record<ItemKey, Page>>>({});
  sessions = $state.raw<Readonly<Record<SessionId, Session>>>({});
  readonly mastery: Mastery = $derived.by(() => rebuild(this.attempts, this.rounds, this.self, this.settings, availabilityOf(this.catalog())));

  init(): void {
    const fresh = obj(this.read(KEY)), old = obj(this.read(OLD_KEY)), saved = fresh ?? old;
    if (saved) {
      this.attempts = parseAttempts(saved.attempts); this.shown = parseShown(saved.shown);
      this.rounds = parseRounds(saved.rounds); this.self = parseSelf(saved.self);
      this.settings = fresh ? parseSettings(saved.settings) : DEFAULT_SETTINGS;
    }
    this.pages = parsePages(this.read(PAGES) ?? this.read(OLD_PAGES));
    this.sessions = parseSessions(this.read(SESSIONS) ?? this.read(OLD_SESSIONS));
  }

  catalog(): Catalog {
    const book = registry.manifest.id;
    const built = (c: ChapterEntry): SectionId[] => c.sections.filter((x) => x.built).map((x) => sectionId(x.id));
    const home: Catalog = {
      concepts: registry.concepts,
      sectionsOf: (id, chapter) => { const c = id === book ? registry.manifest.chapters.find((x) => x.id === chapter || x.dir === chapter) : undefined; return c ? built(c) : []; },
      allSections: (id) => id === book ? registry.manifest.chapters.flatMap(built) : [],
      exercises: Object.entries(books.homeExercises).flatMap(([section, list]) => list.map((ex) => ({ book, section: sectionId(section), ex }))),
    };
    return mergeCatalog(home, Object.entries(books.loaded).filter(([id]) => id !== book));
  }
  conceptOf(id: string): ConceptDTO | undefined { return books.concept(id); }
  bookTitle(id: string): string { return books.title(id); }
  conceptsIn(book: string): readonly ConceptDTO[] { return book === registry.manifest.id ? registry.concepts : uniqueById(books.loaded[book]?.concepts ?? []); }
  stateOf(id: string): State { return stateOf(this.mastery[id]); }
  share(id: string): number { return shareOf(this.mastery[id]); }
  freshness(id: string, now = Date.now()) { return freshnessOf(this.mastery[id], this.settings, now); }
  get lifetime(): number { return this.attempts.length; }
  available(id: string): number { return availabilityOf(this.catalog())[id] ?? 0; }

  record(book: string, section: SectionId, ex: ExerciseDTO, ok: boolean, _self = true, now = Date.now(), inRound?: SessionId): Attempt {
    const round = inRound ?? Object.values(this.sessions).find((s) => s.drawn[s.at]?.book === book && s.drawn[s.at]?.section === section && s.drawn[s.at]?.ex === ex.id)?.id;
    const release = offlineBooks.releaseOf(book);
    const mastered = ok ? ex.concepts.filter((id) => { const before = this.mastery[id]; const target = before?.target ?? Math.min(this.settings.masteryTarget, Math.max(1, this.available(id))); return !before?.mastered && (before?.level ?? 0) + 1 >= target; }) : [];
    const attempt: Attempt = { book, section, ex: ex.id, at: now, ok, concepts: [...ex.concepts], ...(round ? { round } : {}), ...(release ? { release } : {}), ...(mastered.length ? { mastered } : {}) };
    this.attempts = [...this.attempts, attempt];
    if (round) {
      const session = this.sessions[round];
      const outcomes = session.outcomes.map((value, i) => { const d = session.drawn[i]; return d.book === book && d.section === section && d.ex === ex.id ? ok : value; });
      this.put({ ...session, outcomes });
    }
    this.save(); return attempt;
  }
  markShown(key: ItemKey, now = Date.now()): void {
    const session = this.sessionOf(key); if (session) this.markShownAt(key, session.at, now);
  }
  markShownAt(key: ItemKey, at: number, now = Date.now()): void {
    const session = this.sessionOf(key), d = session?.drawn[at]; if (!session || !d) return;
    if (this.shown.some((p) => p.round === session.id && p.book === d.book && p.section === d.section && p.ex === d.ex)) return;
    this.shown = [...this.shown, { book: d.book, section: d.section, ex: d.ex, at: now, round: session.id, ...(d.release ? { release: d.release } : {}) }]; this.save();
  }
  setSetting<K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]): void {
    let next = { ...this.settings, [key]: value };
    if (key === 'startingHalfLife' && Number(value) > next.maxHalfLife) next = { ...next, maxHalfLife: Number(value) };
    if (key === 'maxHalfLife' && Number(value) < next.startingHalfLife) next = { ...next, startingHalfLife: Number(value) };
    this.settings = next; this.save();
  }
  resetSettings(): void { this.settings = DEFAULT_SETTINGS; this.save(); }
  setSelf(id: string, level: number, mastered: boolean, noDecay: boolean, now = Date.now()): void {
    this.self = { ...this.self, [id]: { level, mastered, noDecay: mastered && noDecay, at: now } }; this.save();
  }
  clearSelf(id: string): void { this.self = Object.fromEntries(Object.entries(this.self).filter(([key]) => key !== id)); this.save(); }
  manualReview(id: string, still: boolean, now = Date.now()): void {
    const record = this.mastery[id]; if (!record?.mastered) return;
    const rid = newSessionId();
    this.rounds = [...this.rounds, { id: rid, started: now, at: now, concepts: [{ id, expected: 1, answered: 1, correct: still ? 1 : 0, wasMastered: true, wasDue: true }], newlyMastered: [] }]; this.save();
  }
  wipe(): void { this.attempts = []; this.shown = []; this.rounds = []; this.self = {}; this.save(); }

  page(key: ItemKey): Page { return this.pages[key] ?? BLANK; }
  sessionOf(key: ItemKey): Session | null { const id = this.page(key).session; return id ? this.sessions[id] ?? null : null; }
  private static running(session: Session): boolean { return session.at < session.drawn.length; }
  live(key: ItemKey): boolean { const session = this.sessionOf(key); return !!session && Practice.running(session); }
  liveSessions(): readonly { readonly session: Session; readonly key: ItemKey | null }[] {
    const attached = new Map(Object.entries(this.pages).flatMap(([key, page]) => page.session ? [[page.session, key] as const] : []));
    return Object.values(this.sessions).filter(Practice.running).sort((a, b) => a.started - b.started).map((session) => ({ session, key: attached.get(session.id) ?? null }));
  }
  toggle(key: ItemKey, pick: Pick): void { const page = this.page(key); this.set(key, { ...page, curriculum: togglePick(page.curriculum, pick) }); }
  clear(key: ItemKey): void { this.set(key, { ...this.page(key), curriculum: [] }); }
  replace(key: ItemKey, picks: readonly Pick[]): void { this.set(key, { ...this.page(key), curriculum: [...picks] }); }
  seed(key: ItemKey, picks: readonly Pick[], face: Face = 'choose'): void { this.set(key, { ...BLANK, curriculum: [...picks], face }); }
  seedSession(key: ItemKey, id: SessionId): void { const s = this.sessions[id]; if (s) this.set(key, { ...BLANK, curriculum: [...s.curriculum], session: id, face: 'practise' }); }
  attach(key: ItemKey, id: SessionId): void { const s = this.sessions[id]; if (s) this.set(key, { ...this.page(key), curriculum: [...s.curriculum], session: id, face: 'practise' }); }
  setShowAll(key: ItemKey, on: boolean): void { this.set(key, { ...this.page(key), showAll: on }); }
  plan(key: ItemKey, now = Date.now()): RoundPlan { return prepare(this.page(key).curriculum, this.mastery, this.catalog(), this.attempts, this.shown, this.settings, now); }
  start(key: ItemKey, now = Date.now()): boolean {
    const page = this.page(key), plan = this.plan(key, now); if (!plan.drawn.length) return false;
    const session: Session = {
      id: newSessionId(), curriculum: [...page.curriculum], concepts: [...plan.concepts],
      drawn: plan.drawn.map((d) => { const release = offlineBooks.releaseOf(d.book); return { book: d.book, section: d.section, ex: d.ex.id, why: d.why, ...(release ? { release } : {}) }; }),
      at: 0, outcomes: plan.drawn.map(() => null), started: now, before: this.mastery,
    };
    this.put(session); this.set(key, { ...page, session: session.id, face: 'practise' }); return true;
  }
  private exercise(d: Session['drawn'][number]): ExerciseDTO | undefined { return books.exercises(d.book, d.section)?.find((e) => e.id === d.ex); }
  current(key: ItemKey): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.sessionOf(key), d = s?.drawn[s.at]; if (!d) return null; const ex = this.exercise(d); return ex ? { ...d, ex } : null;
  }
  exerciseAt(key: ItemKey, at: number): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const d = this.sessionOf(key)?.drawn[at]; if (!d) return null; const ex = this.exercise(d); return ex ? { ...d, ex } : null;
  }
  go(key: ItemKey, at: number): void { const s = this.sessionOf(key); if (s && at >= 0 && at < s.drawn.length) this.put({ ...s, at }); }
  afterAnswer(key: ItemKey, from: number): void {
    const s = this.sessionOf(key); if (!s) return;
    const order = [...s.outcomes.keys()].filter((i) => i > from).concat([...s.outcomes.keys()].filter((i) => i < from));
    const next = order.find((i) => s.outcomes[i] === null); if (next !== undefined) this.put({ ...s, at: next });
  }
  incompleteReviews(key: ItemKey): number {
    const s = this.sessionOf(key); if (!s) return 0;
    return s.concepts.filter((id) => s.before[id]?.mastered && s.drawn.some((d, i) => this.exercise(d)?.concepts.some((concept) => concept === id) && s.outcomes[i] === null)).length;
  }
  end(key: ItemKey, now = Date.now()): void {
    const s = this.sessionOf(key); if (!s) return;
    const concepts = s.concepts.map((id) => {
      const indexes = s.drawn.flatMap((d, i) => this.exercise(d)?.concepts.some((concept) => concept === id) ? [i] : []);
      const answered = indexes.filter((i) => s.outcomes[i] !== null), correct = indexes.filter((i) => s.outcomes[i] === true);
      return { id, expected: indexes.length, answered: answered.length, correct: correct.length, wasMastered: !!s.before[id]?.mastered, wasDue: freshnessOf(s.before[id], this.settings, s.started).due };
    });
    const newlyMastered = concepts.filter((c) => {
      if (c.wasMastered) return false;
      const before = s.before[c.id]?.level ?? 0, target = s.before[c.id]?.target ?? Math.min(this.settings.masteryTarget, Math.max(1, this.available(c.id)));
      return Math.max(0, Math.min(target, before + c.correct - (c.answered - c.correct))) >= target;
    }).map((c) => c.id);
    if (!this.rounds.some((r) => r.id === s.id)) this.rounds = [...this.rounds, { id: s.id, started: s.started, at: now, concepts, newlyMastered }];
    this.put({ ...s, at: s.drawn.length }); this.save(); this.set(key, { ...this.page(key), face: 'progress' });
  }
  finish(key: ItemKey): void { const id = this.page(key).session; if (id) this.drop(id); this.set(key, { ...this.page(key), session: null, face: 'dashboard' }); }
  pause(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  progress(key: ItemKey): ReturnType<typeof progressOf> { const s = this.sessionOf(key); return s ? progressOf(s.before, this.mastery) : []; }
  choose(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'choose' }); }
  dashboard(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  requiredRelease(key: ItemKey): { readonly book: string; readonly release: string } | null {
    const session = this.sessionOf(key); if (!session) return null;
    const mismatch = session.drawn.find((drawn) => drawn.release && drawn.release !== offlineBooks.releaseOf(drawn.book));
    return mismatch?.release ? { book: mismatch.book, release: mismatch.release } : null;
  }
  resume(key: ItemKey): boolean { if (!this.live(key) || this.requiredRelease(key)) return false; this.set(key, { ...this.page(key), face: 'practise' }); return true; }
  discard(key: ItemKey): void { const id = this.page(key).session; if (id) this.drop(id); this.set(key, { ...this.page(key), session: null, face: 'choose' }); }
  forget(key: ItemKey): void { if (key in this.pages) { this.pages = Object.fromEntries(Object.entries(this.pages).filter(([id]) => id !== key)); this.savePages(); } }
  prune(open: readonly ItemKey[]): void { const keep = new Set(open), entries = Object.entries(this.pages).filter(([key]) => keep.has(key)); if (entries.length !== Object.keys(this.pages).length) { this.pages = Object.fromEntries(entries); this.savePages(); } }

  private set(key: ItemKey, page: Page): void { this.pages = { ...this.pages, [key]: page }; this.savePages(); }
  private put(session: Session): void { this.sessions = { ...this.sessions, [session.id]: session }; this.saveSessions(); }
  private drop(id: SessionId): void {
    this.sessions = Object.fromEntries(Object.entries(this.sessions).filter(([key]) => key !== id)); this.saveSessions();
    this.pages = Object.fromEntries(Object.entries(this.pages).map(([key, page]) => [key, page.session === id ? { ...page, session: null } : page])); this.savePages();
  }
  private read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify({ attempts: this.attempts, shown: this.shown, rounds: this.rounds, self: this.self, settings: this.settings })); } catch { /* private mode */ } }
  private savePages(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(PAGES, JSON.stringify(this.pages)); } catch { /* private mode */ } }
  private saveSessions(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(SESSIONS, JSON.stringify(this.sessions)); } catch { /* private mode */ } }
}
export const practice = new Practice();
