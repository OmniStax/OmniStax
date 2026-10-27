/* Persistent practice evidence and the lifecycle of a prepared round. */
import type { ExerciseDTO, ConceptDTO } from '../content/schema';
import { type SectionId, bookId } from '../types/ids';
import type { ItemKey } from '../layout/model';
import { registry } from '../sections/registry.svelte';
import { books } from './books.svelte';
import { emptyCatalog, mergeCatalog } from './books';
import {
  DEFAULT_SETTINGS, availabilityOf, conceptsOf, dueConcepts, exerciseRefsOf, freshnessOf, keyOf, newSessionId, prepare, progressOf, readyConcepts, rebuild,
  shareOf, startedConcepts, dropSlots, fillSlots, removeSlot, isPending, PENDING, stateOf, togglePick, uniqueById,
  type Attempt, type Catalog, type Curriculum, type Drawn, type ExerciseRef, type Mastery, type Pick,
  type PracticeSettings, type Presentation, type Progress, type RoundEnd, type RoundPlan,
  type SelfAssessments, type SessionId, type State,
} from './model';
import { readerWritesAllowed } from '../backup/guard';
import { offlineBooks } from '../offline/store.svelte';
import { generated } from './generated.svelte';
import { generatedIdOf, isGenerated } from './generated';
import type { CatalogExercise, RoundChoice } from './model';
import { checkOf, setNode, type Check, type Node, type Shape } from './select';
import { BLANK, KEY, OLD_KEY, PAGES, OLD_PAGES, SESSIONS, OLD_SESSIONS, obj, parseAttempts, parseShown, parseSettings, parseRounds, parseSelf, parsePages, parseSessions, restrict, type Face, type Page, type Session } from './stored';
export { BLANK, type Face, type Page, type Session } from './stored';

class Practice {
  attempts = $state.raw<readonly Attempt[]>([]);
  shown = $state.raw<readonly Presentation[]>([]);
  rounds = $state.raw<readonly RoundEnd[]>([]);
  self = $state.raw<SelfAssessments>({});
  settings = $state.raw<PracticeSettings>(DEFAULT_SETTINGS);
  pages = $state.raw<Readonly<Record<ItemKey, Page>>>({});
  sessions = $state.raw<Readonly<Record<SessionId, Session>>>({});
  /* Book exercises per concept, and the stored generated ones beside them unless the reader keeps to the book. */
  /* The book's own end exercises per concept, read once per change of the books:
     the session plan asks for it on every row. */
  private readonly bookAvailability: Readonly<Record<string, number>> = $derived(availabilityOf(this.catalog()));
  readonly availability: Readonly<Record<string, number>> = $derived.by(() => {
    const book = this.bookAvailability;
    if (this.settings.generated !== 'include') return book;
    const out = { ...book };
    Object.entries(generated.counts()).forEach(([id, n]) => { out[id] = (out[id] ?? 0) + n; });
    return out;
  });
  readonly mastery: Mastery = $derived.by(() => rebuild(this.attempts, this.rounds, this.self, this.settings, this.availability));
  private readonly lastOk: ReadonlyMap<string, boolean> = $derived(new Map([...this.attempts].sort((a, b) => a.at - b.at).map((a) => [keyOf(a), a.ok] as const)));

  init(): void {
    const fresh = obj(this.read(KEY)), old = obj(this.read(OLD_KEY)), saved = fresh ?? old;
    if (saved) {
      this.attempts = parseAttempts(saved.attempts); this.shown = parseShown(saved.shown);
      this.rounds = parseRounds(saved.rounds); this.self = parseSelf(saved.self);
      this.settings = fresh ? parseSettings(saved.settings) : DEFAULT_SETTINGS;
    }
    this.pages = parsePages(this.read(PAGES) ?? this.read(OLD_PAGES));
    this.sessions = parseSessions(this.read(SESSIONS) ?? this.read(OLD_SESSIONS));
    void generated.load();
  }

  /* The books' exercises as one catalog, merged once per change of the books
     rather than on every ask: the curriculum tree asks for it on every row. */
  private readonly merged: Catalog = $derived(mergeCatalog(emptyCatalog, Object.entries(books.loaded)));
  catalog(): Catalog { return this.merged; }
  /* The built concepts of each loaded book by section, read once per change of the books. */
  private readonly bySection: ReadonlyMap<string, readonly string[]> = $derived.by(() => {
    const out = new Map<string, string[]>();
    Object.entries(books.loaded).forEach(([book, b]) => uniqueById(b.concepts).forEach((c) => { if (c.status !== 'built') return; const k = `${book}/${c.section}`; (out.get(k) ?? out.set(k, []).get(k)!).push(c.id); }));
    return out;
  });
  /* The concepts a curriculum reaches, kept for the curriculum and catalog it was read from. */
  private inside: { readonly curriculum: Curriculum; readonly catalog: Catalog; readonly set: ReadonlySet<string> } | null = null;
  private insideOf(curriculum: Curriculum): ReadonlySet<string> {
    const cat = this.catalog();
    if (this.inside?.curriculum !== curriculum || this.inside.catalog !== cat) this.inside = { curriculum, catalog: cat, set: conceptsOf(curriculum, cat) };
    return this.inside.set;
  }
  conceptOf(id: string, book?: string): ConceptDTO | undefined { return books.concept(id, book); }
  bookTitle(id: string): string { return books.title(id); }
  conceptsIn(book: string): readonly ConceptDTO[] { const b = books.loaded[book]; return b ? uniqueById(b.concepts) : registry.concepts(bookId(book)); }
  stateOf(id: string): State { return stateOf(this.mastery[id]); }
  due(): readonly string[] { return dueConcepts(this.mastery, this.settings, Date.now()); }
  started(): readonly string[] { return startedConcepts(this.mastery); }
  ready(): readonly ConceptDTO[] { return uniqueById(readyConcepts(this.catalog().concepts, this.mastery)); }
  lastOutcome(ref: ExerciseRef): boolean | null { return this.lastOk.get(keyOf(ref)) ?? null; }
  share(id: string): number { return shareOf(this.mastery[id]); }
  freshness(id: string, now = Date.now()) { return freshnessOf(this.mastery[id], this.settings, now); }
  get lifetime(): number { return this.attempts.length; }
  available(id: string): number { return this.availability[id] ?? 0; }
  /* The book's own end exercises for a concept, without the generated ones. */
  bookAvailable(id: string): number { return this.bookAvailability[id] ?? 0; }

  record(book: string, section: SectionId, ex: ExerciseDTO, ok: boolean, _self = true, now = Date.now(), inRound?: SessionId): Attempt {
    const round = inRound ?? Object.values(this.sessions).find((s) => s.drawn[s.at]?.book === book && s.drawn[s.at]?.section === section && s.drawn[s.at]?.ex === ex.id)?.id;
    const release = offlineBooks.releaseOf(book);
    const mastered = ok ? ex.concepts.filter((id) => { const before = this.mastery[id]; const target = before?.target ?? this.settings.masteryTarget; return !before?.mastered && (before?.level ?? 0) + 1 >= target; }) : [];
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
    const session = this.sessionOf(key), d = session?.drawn[at]; if (!session || !d || isPending(d.ex)) return;
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
  setSelfMany(ids: readonly string[], level: number, mastered: boolean, noDecay: boolean, now = Date.now()): void {
    this.self = { ...this.self, ...Object.fromEntries(ids.map((id) => [id, { level, mastered, noDecay: mastered && noDecay, at: now }])) }; this.save();
  }
  clearSelfMany(ids: readonly string[]): void { const drop = new Set(ids); this.self = Object.fromEntries(Object.entries(this.self).filter(([key]) => !drop.has(key))); this.save(); }
  manualReview(id: string, still: boolean, now = Date.now()): void {
    const record = this.mastery[id]; if (!record?.mastered) return;
    const rid = newSessionId();
    this.rounds = [...this.rounds, { id: rid, started: now, at: now, concepts: [{ id, expected: 1, answered: 1, correct: still ? 1 : 0, wasMastered: true, wasDue: true }], newlyMastered: [] }]; this.save();
  }
  wipe(): void { this.attempts = []; this.shown = []; this.rounds = []; this.self = {}; this.save(); }
  clearHistory(): void { this.wipe(); this.past().forEach((s) => this.drop(s.id)); }

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
  take(key: ItemKey, id: SessionId): void {
    const s = this.sessions[id]; if (!s) return;
    this.pages = Object.fromEntries(Object.entries(this.pages).map(([k, page]) => [k, k !== key && page.session === id ? { ...page, session: null, face: 'dashboard' as Face } : page]));
    this.set(key, { ...this.page(key), session: id, face: 'practise' });
  }
  setShowAll(key: ItemKey, on: boolean): void { this.set(key, { ...this.page(key), showAll: on }); }
  setRound(key: ItemKey, round: RoundChoice): void { this.set(key, { ...this.page(key), round }); }
  exclude(key: ItemKey, exKey: string): void { const page = this.page(key), round = page.round ?? {}; this.set(key, { ...page, round: { ...round, excluded: [...new Set([...(round.excluded ?? []), exKey])] } }); }
  restore(key: ItemKey): void { const page = this.page(key); this.set(key, { ...page, round: { ...page.round, excluded: [] } }); }
  shape(): Shape {
    return {
      chapters: (book) => books.manifest(book)?.chapters.map((c) => c.id) ?? [],
      conceptsIn: (book, section) => this.bySection.get(`${book}/${section}`) ?? (books.loaded[book] ? [] : registry.concepts(bookId(book)).filter((c) => c.status === 'built' && c.section === section).map((c) => c.id)),
    };
  }
  check(key: ItemKey, node: Node): Check { const c = this.page(key).curriculum; return checkOf(c, node, this.catalog(), this.shape(), this.insideOf(c)); }
  setNode(key: ItemKey, node: Node, on: boolean): void { const page = this.page(key); this.set(key, { ...page, curriculum: [...setNode(page.curriculum, node, on, this.catalog(), this.shape())] }); }
  toggleNode(key: ItemKey, node: Node): void { this.setNode(key, node, this.check(key, node) !== 'on'); }
  pinned(key: ItemKey): readonly CatalogExercise[] {
    return exerciseRefsOf(this.page(key).curriculum).flatMap((r) => { const ex = this.exerciseOf(r); return ex ? [{ book: r.book, section: r.section, ex }] : []; });
  }
  plan(key: ItemKey, now = Date.now(), extra: readonly CatalogExercise[] = []): RoundPlan {
    const page = this.page(key);
    return prepare(page.curriculum, this.mastery, this.catalog(), this.attempts, this.shown, this.settings, now, page.round, extra, this.pinned(key));
  }
  /* A round begins at once: the book's exercises, then an open slot for each one the model is still to write. */
  startLive(key: ItemKey, now = Date.now()): SessionId | null {
    const page = this.page(key), plan = this.plan(key, now);
    const slots = plan.concepts.flatMap((id) => {
      const gap = plan.quotas[id]?.gap ?? 0, book = books.bookOf(id), section = book ? this.conceptOf(id, book)?.section : undefined;
      return gap > 0 && book && section ? Array.from({ length: gap }, () => ({ book, section, why: 'new' as const, concept: id })) : [];
    }).map((d, i) => ({ ...d, ex: `${PENDING}${i}` }));
    if (!plan.drawn.length && !slots.length) return null;
    generated.use(plan.drawn.filter((d) => isGenerated(d.ex.id)).map((d) => generatedIdOf(d.ex.id)));
    const drawn = [...plan.drawn.map((d) => { const release = offlineBooks.releaseOf(d.book); return { book: d.book, section: d.section, ex: d.ex.id, why: d.why, ...(release ? { release } : {}) }; }), ...slots];
    const session: Session = {
      id: newSessionId(), curriculum: [...page.curriculum], concepts: [...new Set([...plan.concepts, ...plan.drawn.filter((d) => d.pinned).flatMap((d) => d.ex.concepts)])],
      drawn, at: 0, outcomes: drawn.map(() => null), started: now, before: this.mastery,
    };
    this.put(session); this.set(key, { curriculum: [], session: session.id, face: 'practise', showAll: page.showAll }); return session.id;
  }
  pendingOf(id: SessionId, concept: string): number { return this.sessions[id]?.drawn.filter((d) => isPending(d.ex) && d.concept === concept).length ?? 0; }
  fill(id: SessionId, concept: string, exercises: readonly CatalogExercise[]): void {
    const s = this.sessions[id]; if (!s) return;
    const { drawn, placed } = fillSlots(s.drawn, concept, exercises.map((e) => { const release = offlineBooks.releaseOf(e.book); return { book: e.book, section: e.section, ex: e.ex.id, why: 'new' as const, ...(release ? { release } : {}) }; }));
    if (!placed) return;
    generated.use(exercises.slice(0, placed).filter((e) => isGenerated(e.ex.id)).map((e) => generatedIdOf(e.ex.id)));
    this.put({ ...s, drawn });
  }
  /* One exercise of a live session opened again as a slot for its concept, to be written afresh. */
  reopen(id: SessionId, at: number, concept: string): void {
    const s = this.sessions[id], d = s?.drawn[at]; if (!s || !d) return;
    if (s.outcomes[at] !== null) { this.attempts = this.attempts.filter((a) => a.round !== id || a.book !== d.book || a.section !== d.section || a.ex !== d.ex); this.save(); }
    const slot = { book: d.book, section: d.section, ex: `${PENDING}r${at}-${Date.now().toString(36)}`, why: 'new' as const, concept };
    this.put({ ...s, drawn: s.drawn.map((x, i) => (i === at ? slot : x)), outcomes: s.outcomes.map((o, i) => (i === at ? null : o)) });
  }
  dropPending(id: SessionId, concept?: string): void {
    const s = this.sessions[id]; if (!s?.drawn.some((d) => isPending(d.ex))) return;
    const next = { ...s, ...dropSlots(s, concept) };
    if (next.drawn.length) this.put(next); else this.drop(id);
  }
  /* One exercise out of a live session, and the answer it was given there with it. */
  remove(id: SessionId, at: number): void {
    const s = this.sessions[id], d = s?.drawn[at]; if (!s || !d) return;
    if (s.outcomes[at] !== null) { this.attempts = this.attempts.filter((a) => a.round !== id || a.book !== d.book || a.section !== d.section || a.ex !== d.ex); this.save(); }
    const next = { ...s, ...removeSlot(s, at) };
    if (next.drawn.length) this.put(next); else this.drop(id);
  }
  exerciseOf(ref: ExerciseRef): ExerciseDTO | undefined { return isPending(ref.ex) ? undefined : books.exercise(ref.book, ref.section, ref.ex); }
  current(key: ItemKey): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const s = this.sessionOf(key), d = s?.drawn[s.at]; if (!d) return null; const ex = this.exerciseOf(d); return ex ? { ...d, ex } : null;
  }
  exerciseAt(key: ItemKey, at: number): { book: string; section: SectionId; ex: ExerciseDTO; why: Drawn['why'] } | null {
    const d = this.sessionOf(key)?.drawn[at]; if (!d) return null; const ex = this.exerciseOf(d); return ex ? { ...d, ex } : null;
  }
  go(key: ItemKey, at: number): void { const s = this.sessionOf(key); if (s && at >= 0 && at < s.drawn.length) this.put({ ...s, at }); }
  afterAnswer(key: ItemKey, from: number): void {
    const s = this.sessionOf(key); if (!s) return;
    const order = [...s.outcomes.keys()].filter((i) => i > from).concat([...s.outcomes.keys()].filter((i) => i < from));
    const open = order.filter((i) => s.outcomes[i] === null), next = open.find((i) => !isPending(s.drawn[i].ex)) ?? open[0]; if (next !== undefined) this.put({ ...s, at: next });
  }
  incompleteReviews(key: ItemKey): number {
    const s = this.sessionOf(key); if (!s) return 0;
    return s.concepts.filter((id) => s.before[id]?.mastered && s.drawn.some((d, i) => this.exerciseOf(d)?.concepts.some((concept) => concept === id) && s.outcomes[i] === null)).length;
  }
  end(key: ItemKey, now = Date.now()): void {
    const live = this.sessionOf(key); if (!live) return;
    if (live.drawn.some((d) => isPending(d.ex))) { this.dropPending(live.id); if (!this.sessions[live.id]) return; }
    const s = this.sessions[live.id];
    const concepts = s.concepts.map((id) => {
      const indexes = s.drawn.flatMap((d, i) => this.exerciseOf(d)?.concepts.some((concept) => concept === id) ? [i] : []);
      const answered = indexes.filter((i) => s.outcomes[i] !== null), correct = indexes.filter((i) => s.outcomes[i] === true);
      return { id, expected: indexes.length, answered: answered.length, correct: correct.length, wasMastered: !!s.before[id]?.mastered, wasDue: freshnessOf(s.before[id], this.settings, s.started).due };
    });
    const newlyMastered = concepts.filter((c) => {
      if (c.wasMastered) return false;
      const before = s.before[c.id]?.level ?? 0, target = s.before[c.id]?.target ?? this.settings.masteryTarget;
      return Math.max(0, Math.min(target, before + c.correct - (c.answered - c.correct))) >= target;
    }).map((c) => c.id);
    if (!this.rounds.some((r) => r.id === s.id)) this.rounds = [...this.rounds, { id: s.id, started: s.started, at: now, concepts, newlyMastered }];
    this.put({ ...s, at: s.drawn.length, status: 'done', ended: now, after: restrict(this.mastery, s.concepts) }); this.save(); this.set(key, { ...this.page(key), face: 'review' });
  }
  review(key: ItemKey, id: SessionId): void { if (this.sessions[id]?.status === 'done') this.set(key, { ...this.page(key), session: id, face: 'review' }); }
  again(key: ItemKey, id: SessionId, missedOnly: boolean): void {
    const s = this.sessions[id]; if (!s) return;
    this.seed(key, s.drawn.filter((_, i) => !missedOnly || s.outcomes[i] !== true).map((d): Pick => ({ exercise: { book: d.book, section: d.section, ex: d.ex } })), 'choose');
  }
  reviewOf(id: SessionId): { session: Session; round: RoundEnd | null; changes: readonly Progress[]; correct: number; wrong: number; skipped: number } | null {
    const session = this.sessions[id]; if (!session) return null;
    const tally = (v: boolean | null): number => session.outcomes.filter((o) => o === v).length;
    return {
      session, round: this.rounds.find((r) => r.id === id) ?? null,
      changes: session.after ? progressOf(restrict(session.before, session.concepts), session.after) : [],
      correct: tally(true), wrong: tally(false), skipped: tally(null),
    };
  }
  /* Back to the dashboard. The session stays, listed under Past sessions. */
  finish(key: ItemKey): void { this.set(key, { ...this.page(key), session: null, face: 'dashboard' }); }
  past(): readonly Session[] { return Object.values(this.sessions).filter((s) => s.status === 'done').sort((a, b) => (b.ended ?? 0) - (a.ended ?? 0)); }
  replay(id: SessionId, at: number): { book: string; section: SectionId; ex: ExerciseDTO } | null {
    const d = this.sessions[id]?.drawn[at]; if (!d) return null; const ex = this.exerciseOf(d); return ex ? { ...d, ex } : null;
  }
  pause(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  progress(key: ItemKey): ReturnType<typeof progressOf> { const s = this.sessionOf(key); return s ? progressOf(s.before, this.mastery) : []; }
  dashboard(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'dashboard' }); }
  sessionsPage(key: ItemKey): void { this.set(key, { ...this.page(key), face: 'sessions' }); }
  releaseFor(id: SessionId): { readonly book: string; readonly release: string } | null {
    const session = this.sessions[id]; if (!session) return null;
    const mismatch = session.drawn.find((drawn) => drawn.release && drawn.release !== offlineBooks.releaseOf(drawn.book));
    return mismatch?.release ? { book: mismatch.book, release: mismatch.release } : null;
  }
  discard(id: SessionId): void { this.drop(id); }
  forget(key: ItemKey): void { if (key in this.pages) { this.pages = Object.fromEntries(Object.entries(this.pages).filter(([id]) => id !== key)); this.savePages(); } }
  prune(open: readonly ItemKey[]): void { const keep = new Set(open), entries = Object.entries(this.pages).filter(([key]) => keep.has(key)); if (entries.length !== Object.keys(this.pages).length) { this.pages = Object.fromEntries(entries); this.savePages(); } }

  private set(key: ItemKey, page: Page): void { this.pages = { ...this.pages, [key]: page }; this.savePages(); }
  private put(session: Session): void { this.sessions = { ...this.sessions, [session.id]: session }; this.saveSessions(); }
  private drop(id: SessionId): void {
    this.sessions = Object.fromEntries(Object.entries(this.sessions).filter(([key]) => key !== id)); this.saveSessions();
    this.pages = Object.fromEntries(Object.entries(this.pages).map(([key, page]) => [key, page.session === id ? { ...page, session: null, face: page.face === 'choose' ? 'choose' : 'dashboard' as Face } : page])); this.savePages();
  }
  private read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify({ attempts: this.attempts, shown: this.shown, rounds: this.rounds, self: this.self, settings: this.settings })); } catch { /* private mode */ } }
  private savePages(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(PAGES, JSON.stringify(this.pages)); } catch { /* private mode */ } }
  private saveSessions(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(SESSIONS, JSON.stringify(this.sessions)); } catch { /* private mode */ } }
}
export const practice = new Practice();
