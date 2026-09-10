/* Exercises as a curriculum: what an exercise is worth, what a concept's record
   says, and which exercises a session draws. All of it is pure — no DOM, no
   registry, no runes — so the whole model is tested in tests/practice.test.ts
   and the store beside it only holds the live value and writes it down.

   The rules come from docs/claude/exercises-curriculum.md. Only exercises earn
   points; points follow the Bloom level of the exercise unless the pipeline has
   weighted them; a score decays with a half-life in days, so mastery has to be
   kept up and review is spaced; a correct answer also freshens what the concept
   rests on, downward through the DAG and never up. Concept ids are canonical
   across books, so a record is keyed by the concept alone while an attempt
   carries the book, the section and the exercise it was answered in. */
import type { ExerciseDTO, ConceptDTO } from '../content/schema';
import type { SectionId, ConceptId } from '../types/ids';

export const DAY = 86_400_000;

/* The numbers the reader sets, in Settings under Exercises. Every one of them
   applies to old work as well as new, because the records are rebuilt from the
   attempts each time one changes. */
export type PracticeSettings = {
  readonly threshold: number;    /* decayed score that counts as mastered, default 10 */
  readonly days: number;         /* distinct days in a row with a correct answer before mastery, default 3 */
  readonly halfLife: number;     /* base half-life in days, default 7 */
  readonly session: number;      /* exercises per session, default 8 */
  readonly reviewShare: number;  /* share of a session given to due concepts, default 1/3 */
  readonly spaced: boolean;      /* off freezes decay, default true */
  readonly selfChecked: boolean; /* self-reported answers count, default true */
};
export const DEFAULT_SETTINGS: PracticeSettings = { threshold: 10, days: 3, halfLife: 7, session: 8, reviewShare: 1 / 3, spaced: true, selfChecked: true };

/* One answer. `earned` is points per concept the exercise tests (already weighted); zero for every concept when not ok. */
export type Attempt = { readonly book: string; readonly section: SectionId; readonly ex: string; readonly at: number /* ms since epoch */; readonly ok: boolean; readonly self: boolean; readonly earned: Readonly<Record<string, number>> };

export type ConceptRecord = { readonly score: number; readonly lastAt: number; readonly days: number; readonly lastDay: string /* local YYYY-MM-DD of the last correct answer */; readonly mastered: boolean; readonly halfLife: number; readonly earned: number /* lifetime, never decays */ };
export type Mastery = Readonly<Record<string, ConceptRecord>>;   /* by concept id (canonical across books) */
export type State = 'untouched' | 'practised' | 'mastered' | 'due';

/* The default weight of an exercise, by the Bloom level the pipeline gave it.
   Every concept the exercise lists receives the full amount: an exercise that
   joins two concepts is evidence for both. */
export const BLOOM_POINTS: Readonly<Record<string, number>> = { remember: 1, understand: 2, apply: 3, analyze: 4, analyse: 4, evaluate: 5, create: 6 };
const bloomOf = (bloom: string): number => BLOOM_POINTS[bloom.trim().toLowerCase()] ?? 2;
export const pointsOf = (ex: ExerciseDTO): Readonly<Record<string, number>> =>
  ex.weights ?? Object.fromEntries(ex.concepts.map((id) => [id, bloomOf(ex.bloom)]));

const pad = (n: number): string => String(n).padStart(2, '0');
export const dayOf = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/* Whether `day` is the calendar day right after `prev`, which is what keeps a
   streak alive. Built from the parts rather than by subtracting a day in ms, so
   that a clock change does not break the run. */
const isNextDay = (prev: string, day: string): boolean => {
  const p = prev.split('-').map(Number);
  return p.length === 3 && p.every((n) => Number.isFinite(n)) && dayOf(new Date(p[0], p[1] - 1, p[2] + 1, 12).getTime()) === day;
};

export const decayed = (r: ConceptRecord, now: number, s: PracticeSettings): number => (s.spaced ? r.score * 0.5 ** ((now - r.lastAt) / (r.halfLife * DAY)) : r.score);
/* The four states the reader sees. A mastered concept whose score has faded
   below the threshold stays mastered in name — the reader did master it — and
   is queued for review. */
export const stateOf = (r: ConceptRecord | undefined, now: number, s: PracticeSettings): State =>
  !r || r.earned === 0 ? 'untouched' : !r.mastered ? 'practised' : decayed(r, now, s) < s.threshold ? 'due' : 'mastered';
/* When a mastered concept comes due: the moment its decayed score reaches the
   threshold. Already below, it is due now; unmastered or with decay frozen,
   never. */
export const dueAt = (r: ConceptRecord, s: PracticeSettings): number | null => {
  if (!r.mastered || !s.spaced || s.threshold <= 0) return null;
  return r.score <= s.threshold ? r.lastAt : r.lastAt + r.halfLife * DAY * Math.log2(r.score / s.threshold);
};

/* One answer folded into the records. A correct answer adds its points to the
   decayed score, carries the streak on if it lands on the next calendar day,
   and doubles the half-life for each day the streak gains — which is the whole
   of the spacing rule. A wrong answer earns nothing, drops the streak and
   halves the half-life, never below the base. */
export const applyAttempt = (m: Mastery, a: Attempt, prereqsOf: (id: string) => readonly string[], s: PracticeSettings): Mastery => {
  if (a.self && !s.selfChecked) return m;
  const next: Record<string, ConceptRecord> = { ...m };
  const day = dayOf(a.at);
  const tested = Object.keys(a.earned);
  tested.forEach((id) => {
    const r = next[id] ?? { score: 0, lastAt: a.at, days: 0, lastDay: '', mastered: false, halfLife: s.halfLife, earned: 0 };
    const faded = decayed(r, a.at, s);
    if (!a.ok) { next[id] = { ...r, score: faded, days: 0, lastDay: '', halfLife: Math.max(s.halfLife, r.halfLife / 2), lastAt: a.at }; return; }
    const points = a.earned[id];
    const score = faded + points;
    const days = day === r.lastDay ? r.days : isNextDay(r.lastDay, day) ? r.days + 1 : 1;
    next[id] = {
      score, lastAt: a.at, days, lastDay: day, halfLife: days > r.days && r.days > 0 ? r.halfLife * 2 : r.halfLife,   /* each further day of the streak doubles it; the first day sets it */
      mastered: r.mastered || (score >= s.threshold && days >= s.days), earned: r.earned + points,
    };
  });
  if (!a.ok) return next;
  /* Downward propagation, done as freshness rather than as score: using Hooke's
     law keeps "restoring force" from fading, but earns it nothing and leaves its
     streak alone. The walk is breadth-first over a seen set, so a concept graph
     that has picked up a cycle still terminates. */
  const seen = new Set<string>(tested);
  const queue = [...tested];
  while (queue.length) {
    const id = queue.shift()!;
    prereqsOf(id).forEach((p) => {
      if (seen.has(p)) return;
      seen.add(p); queue.push(p);
      const r = next[p]; if (!r) return;
      next[p] = { ...r, score: decayed(r, a.at, s), lastAt: a.at };
    });
  }
  return next;
};
/* The records are derived, never stored: this is what a change of settings runs
   to make old work count under the new numbers. */
export const rebuild = (attempts: readonly Attempt[], prereqsOf: (id: string) => readonly string[], s: PracticeSettings): Mastery =>
  [...attempts].sort((x, y) => x.at - y.at).reduce<Mastery>((m, a) => applyAttempt(m, a, prereqsOf, s), {});
/* The reader's one running number: what was earned, not what remains after
   decay, so it never goes down. */
export const total = (m: Mastery): number => Object.values(m).reduce((n, r) => n + r.earned, 0);
/* The same number book by book, which the records cannot give: they are keyed
   by the concept alone, since mastering a concept in one book is mastering it
   in all, while an attempt remembers the book it was answered in. A book the
   reader has only answered wrongly still has a line, with nothing on it. */
export const pointsByBook = (attempts: readonly Attempt[]): Readonly<Record<string, number>> =>
  attempts.reduce<Record<string, number>>((out, a) => ({ ...out, [a.book]: (out[a.book] ?? 0) + Object.values(a.earned).reduce((n, v) => n + v, 0) }), {});

/* ---------- the curriculum ---------- */

/* A pick of a book, a chapter or a section stands for the concepts those
   sections teach; a pick of a concept is itself. */
export type Pick = { readonly book: string; readonly chapter?: string; readonly section?: SectionId } | { readonly concept: ConceptId };
export type Curriculum = readonly Pick[];
/* What the model is allowed to know about the library, so that it never reads
   the registry: the concepts loaded, which sections a book and a chapter have
   built, and every exercise standing open. */
export type Catalog = {
  readonly concepts: readonly ConceptDTO[];
  readonly sectionsOf: (book: string, chapter: string) => readonly SectionId[];   /* built sections of a chapter */
  readonly allSections: (book: string) => readonly SectionId[];                   /* built sections of a book */
  readonly exercises: readonly { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO }[];   /* every loaded exercise */
};
const isConcept = (p: Pick): p is { readonly concept: ConceptId } => 'concept' in p;
export const samePick = (a: Pick, b: Pick): boolean =>
  isConcept(a) ? isConcept(b) && a.concept === b.concept
    : !isConcept(b) && a.book === b.book && (a.chapter ?? '') === (b.chapter ?? '') && (a.section ?? '') === (b.section ?? '');
export const togglePick = (c: Curriculum, p: Pick): Curriculum => (c.some((q) => samePick(q, p)) ? c.filter((q) => !samePick(q, p)) : [...c, p]);
/* The sections the place picks come to, each with the book it belongs to, since
   section ids are not unique across books. */
export const sectionsOfCurriculum = (c: Curriculum, cat: Catalog): readonly { book: string; section: SectionId }[] => {
  const out: { book: string; section: SectionId }[] = [];
  const seen = new Set<string>();
  c.filter((p) => !isConcept(p)).forEach((p) => {
    const place = p as Extract<Pick, { book: string }>;
    const secs = place.section ? [place.section] : place.chapter ? cat.sectionsOf(place.book, place.chapter) : cat.allSections(place.book);
    secs.forEach((section) => { const k = `${place.book}/${section}`; if (!seen.has(k)) { seen.add(k); out.push({ book: place.book, section }); } });
  });
  return out;
};
/* The union of what the picks teach. A section is matched by id whatever book
   it is in, which is how a chapter picked in one book draws in another book's
   problems on the same concepts. Placeholders are left out: they stand for a
   section nobody has built, so nothing tests them. */
export const conceptsOf = (c: Curriculum, cat: Catalog): ReadonlySet<string> => {
  const secs = new Set(sectionsOfCurriculum(c, cat).map((p) => String(p.section)));
  const out = new Set(cat.concepts.filter((k) => !k.placeholder && secs.has(k.section)).map((k) => k.id));
  c.filter(isConcept).forEach((p) => { const k = cat.concepts.find((q) => q.id === p.concept); if (!k || !k.placeholder) out.add(String(p.concept)); });
  return out;
};

/* ---------- drawing a session ---------- */

export type Drawn = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO; readonly why: 'review' | 'frontier' | 'more' };
/* FNV-1a over the seed and the exercise's place, which is what breaks a tie: a
   page refresh draws the same session and tomorrow's seed draws another. */
export const hash = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};

type Cand = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO; readonly key: string; readonly h: number; readonly last: number; readonly ok: number };

/* Review first, then the frontier of the DAG, then whatever is left, so that a
   session is always full while exercises remain. */
export const draw = (c: Curriculum, m: Mastery, cat: Catalog, attempts: readonly Attempt[], s: PracticeSettings, now: number, seed: string): readonly Drawn[] => {
  const inSet = conceptsOf(c, cat);
  const places = new Set(sectionsOfCurriculum(c, cat).map((p) => `${p.book}/${p.section}`));
  const picked = new Set(c.filter(isConcept).map((p) => String(p.concept)));
  const state = (id: string): State => stateOf(m[id], now, s);
  const prereqs = new Map(cat.concepts.map((k) => [k.id, k.prereqs]));

  const last = new Map<string, number>(), lastOk = new Map<string, number>();
  attempts.forEach((a) => {
    const k = `${a.book}/${a.section}/${a.ex}`;
    last.set(k, Math.max(last.get(k) ?? 0, a.at));
    if (a.ok) lastOk.set(k, Math.max(lastOk.get(k) ?? 0, a.at));
  });
  /* A pick of a concept reaches into any section that tests it; a pick of a
     place reaches only its own sections. An exercise answered rightly in the
     last two days is left alone unless one of its concepts has come due. */
  const pool: Cand[] = cat.exercises
    .filter((e) => e.ex.concepts.some((id) => inSet.has(id)) && (places.has(`${e.book}/${e.section}`) || e.ex.concepts.some((id) => picked.has(id))))
    .map((e) => { const key = `${e.book}/${e.section}/${e.ex.id}`; return { book: e.book, section: e.section, ex: e.ex, key, h: hash(`${seed}:${key}`), last: last.get(key) ?? 0, ok: lastOk.get(key) ?? 0 }; })
    .filter((e) => e.ok === 0 || now - e.ok > DAY * 2 || e.ex.concepts.some((id) => inSet.has(id) && state(id) === 'due'));

  const ids = [...inSet];
  const overdue = (id: string): number => { const r = m[id]; return r ? decayed(r, now, s) / (s.threshold || 1) : 1; };
  const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const due = ids.filter((id) => state(id) === 'due').sort((a, b) => overdue(a) - overdue(b) || byId(a, b));
  const open = ids.filter((id) => state(id) === 'untouched' || state(id) === 'practised');
  /* The frontier: an unmastered concept everything it rests on inside the
     curriculum has been mastered, so the reader works upward through the DAG. A
     prerequisite outside the curriculum is not in the way. */
  const ready = (id: string): boolean => (prereqs.get(id) ?? []).every((p) => !inSet.has(p) || (m[p]?.mastered ?? false));
  /* Untouched before practised, then the shallowest concept first. */
  const rank = (a: string, b: string): number =>
    (state(a) === 'untouched' ? 0 : 1) - (state(b) === 'untouched' ? 0 : 1) || (prereqs.get(a)?.length ?? 0) - (prereqs.get(b)?.length ?? 0) || byId(a, b);
  const frontier = open.filter(ready).sort(rank), rest = open.filter((id) => !ready(id)).sort(rank), held = ids.filter((id) => state(id) === 'mastered').sort(byId);

  const taken = new Set<string>();
  const out: Drawn[] = [];
  const pick = (id: string, order: (a: Cand, b: Cand) => number): Cand | undefined =>
    pool.filter((e) => !taken.has(e.key) && e.ex.concepts.includes(id)).sort(order)[0];
  const take = (e: Cand, why: Drawn['why']): void => { taken.add(e.key); out.push({ book: e.book, section: e.section, ex: e.ex, why }); };
  /* The expert-reversal note: a concept with no score gets its lowest Bloom
     exercise, pattern before problem, and one with a score gets a higher one. */
  const worth = (e: Cand, id: string): number => pointsOf(e.ex)[id] ?? 0;
  const byLevel = (id: string) => { const dir = state(id) === 'untouched' ? 1 : -1; return (a: Cand, b: Cand): number => dir * (worth(a, id) - worth(b, id)) || a.h - b.h; };
  const byHardest = (id: string) => (a: Cand, b: Cand): number => worth(b, id) - worth(a, id) || a.h - b.h;
  /* One exercise per concept in turn, round after round, until the bucket runs
     dry or the session is full. */
  const rounds = (list: readonly string[], why: Drawn['why'], order: (id: string) => (a: Cand, b: Cand) => number): void => {
    for (let moved = true; moved && out.length < s.session;) {
      moved = false;
      for (const id of list) {
        if (out.length >= s.session) break;
        const e = pick(id, order(id));
        if (e) { take(e, why); moved = true; }
      }
    }
  };

  const byStale = (a: Cand, b: Cand): number => a.last - b.last || a.h - b.h;

  const reviewMax = Math.min(s.session, Math.max(0, Math.round(s.session * s.reviewShare)));
  due.forEach((id) => { if (out.length >= reviewMax) return; const e = pick(id, byStale); if (e) take(e, 'review'); });
  rounds(frontier, 'frontier', byLevel);
  rounds(rest, 'more', byLevel);
  rounds(held, 'more', byHardest);
  /* The review share caps what review takes off the top, not what the session
     holds: with everything else drawn and room to spare, the due concepts come
     back round to fill it, so a session is always full while exercises remain. */
  rounds(due, 'more', () => byStale);
  return out.slice(0, s.session);
};

/* What the summary says moved: the concepts whose state is not the one they had
   when the session began, in an order that does not wander. */
export const summarize = (before: Mastery, after: Mastery, now: number, s: PracticeSettings): readonly { id: string; from: State; to: State }[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
    .flatMap((id) => { const from = stateOf(before[id], now, s), to = stateOf(after[id], now, s); return from === to ? [] : [{ id, from, to }]; });
