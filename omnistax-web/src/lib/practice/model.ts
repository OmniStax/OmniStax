/* Exercises as a curriculum: what an exercise is worth, what a concept's record
   says, and which exercises a session draws. All of it is pure — no DOM, no
   registry, no runes — so the whole model is tested in tests/practice.test.ts
   and the store beside it only holds the live value and writes it down.

   The rules come from omnistax-web/docs/exercises-curriculum.md. Only
   exercises earn points; points follow the Bloom level of the exercise unless
   the pipeline has weighted them; mastery requires enough points over enough
   consecutive days and, once earned, remains earned.
   Concept ids are canonical across books, so a record is keyed by the concept
   alone while an attempt carries the book, the section and the exercise it was
   answered in. */
import type { ExerciseDTO, ConceptDTO } from '../content/schema';
import type { SectionId, ConceptId } from '../types/ids';

export const DAY = 86_400_000;

/* The numbers the reader sets, in Settings under Exercises. Every one of them
   applies to old work as well as new, because the records are rebuilt from the
   attempts each time one changes. */
export type PracticeSettings = {
  readonly threshold: number;    /* score that counts as mastered, default 10 */
  readonly days: number;         /* distinct days in a row with a correct answer before mastery, default 3 */
  readonly session: number;      /* exercises per session, default 8 */
  readonly selfChecked: boolean; /* self-reported answers count, default true */
};
export const DEFAULT_SETTINGS: PracticeSettings = { threshold: 10, days: 3, session: 8, selfChecked: true };

/* One answer. `earned` is points per concept the exercise tests (already weighted); zero for every concept when not ok. */
export type Attempt = { readonly book: string; readonly section: SectionId; readonly ex: string; readonly at: number /* ms since epoch */; readonly ok: boolean; readonly self: boolean; readonly earned: Readonly<Record<string, number>> };

export type ConceptRecord = { readonly score: number; readonly lastAt: number; readonly days: number; readonly lastDay: string /* local YYYY-MM-DD of the last correct answer */; readonly mastered: boolean; readonly earned: number /* lifetime */ };
export type Mastery = Readonly<Record<string, ConceptRecord>>;   /* by concept id (canonical across books) */
export type State = 'untouched' | 'practised' | 'mastered';

/* A session is a thing of its own rather than a corner of the tab that began
   it: the reader may leave one paused while they read the section it came from,
   start another beside it, and come back to the first in whichever tab is to
   hand. So a session carries an id and a page points at it. The id is eight
   letters and digits, the shape the other ids of the shell take. */
export type SessionId = string & { readonly __brand: 'SessionId' };
export const sessionId = (s: string): SessionId => s as SessionId;
export const newSessionId = (): SessionId => sessionId(Math.random().toString(36).slice(2, 10).padEnd(8, '0'));

/* The default weight of an exercise, by the Bloom level the pipeline gave it.
   Every concept the exercise lists receives the full amount: an exercise that
   joins two concepts is evidence for both. */
export const BLOOM_POINTS: Readonly<Record<string, number>> = { remember: 1, understand: 2, apply: 3, analyze: 4, analyse: 4, evaluate: 5, create: 6 };
const bloomOf = (bloom: string): number => BLOOM_POINTS[bloom.trim().toLowerCase()] ?? 2;
export const pointsOf = (ex: ExerciseDTO): Readonly<Record<string, number>> =>
  Object.fromEntries(ex.concepts.map((id) => [id, ex.weights?.[id] ?? bloomOf(ex.bloom)]));

const pad = (n: number): string => String(n).padStart(2, '0');
export const dayOf = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/* The day so many days on from this one, forwards or back. Built from the parts
   rather than by adding days in ms, so that a clock change — an hour lost to
   daylight saving — does not shift the answer by a day; noon is twelve hours
   from either boundary, which is what keeps it. A day string that is not one
   steps nowhere. */
export const stepDay = (day: string, by: number): string => {
  const p = day.split('-').map(Number);
  if (p.length !== 3 || !p.every((n) => Number.isFinite(n))) return '';
  return dayOf(new Date(p[0], p[1] - 1, p[2] + by, 12).getTime());
};
/* Whether `day` is the calendar day right after `prev`, which is what keeps a
   streak alive. */
const isNextDay = (prev: string, day: string): boolean => day !== '' && stepDay(prev, 1) === day;

/* The three states the reader sees. Mastery is an achievement, not a score that
   can later be taken away. */
export const stateOf = (r: ConceptRecord | undefined): State =>
  !r || r.earned === 0 ? 'untouched' : r.mastered ? 'mastered' : 'practised';
/* How far a concept stands towards mastery, 0 to 1: its score against the
   threshold, which is the one number every drawing of a concept's standing
   is made of — the length of the map's bar and the height of the fill in a
   mastery box. A concept with no record at all stands at nothing. */
export const shareOf = (r: ConceptRecord | undefined, s: PracticeSettings): number => {
  if (!r) return 0;
  if (s.threshold <= 0) return 1;
  return Math.min(1, Math.max(0, r.score / s.threshold));
};
/* How much of a mastery box is filled. A box that is filled at all is filled
   enough to be seen, so a concept just begun reads as begun rather than as
   untouched; a mastered one is full. */
export const MIN_FILL = 0.15;
export const fillOf = (state: State, share: number): number =>
  state === 'untouched' ? 0 : state === 'mastered' ? 1 : Math.max(MIN_FILL, Math.min(1, share));
/* One answer folded into the records. A correct answer adds its points to the
   score and carries the streak on if it lands on the next calendar day. A
   wrong answer earns nothing and drops the streak. */
export const applyAttempt = (m: Mastery, a: Attempt, s: PracticeSettings): Mastery => {
  if (a.self && !s.selfChecked) return m;
  const next: Record<string, ConceptRecord> = { ...m };
  const day = dayOf(a.at);
  const tested = Object.keys(a.earned);
  tested.forEach((id) => {
    const r = next[id] ?? { score: 0, lastAt: a.at, days: 0, lastDay: '', mastered: false, earned: 0 };
    if (!a.ok) { next[id] = { ...r, days: 0, lastDay: '', lastAt: a.at }; return; }
    const points = a.earned[id];
    const score = r.score + points;
    const days = day === r.lastDay ? r.days : isNextDay(r.lastDay, day) ? r.days + 1 : 1;
    next[id] = {
      score, lastAt: a.at, days, lastDay: day,
      mastered: r.mastered || (score >= s.threshold && days >= s.days), earned: r.earned + points,
    };
  });
  return next;
};
/* The records are derived, never stored: this is what a change of settings runs
   to make old work count under the new numbers. */
export const rebuild = (attempts: readonly Attempt[], s: PracticeSettings): Mastery =>
  [...attempts].sort((x, y) => x.at - y.at).reduce<Mastery>((m, a) => applyAttempt(m, a, s), {});
/* The reader's one running number: what was earned, so it never goes down. */
export const total = (m: Mastery): number => Object.values(m).reduce((n, r) => n + r.earned, 0);
/* The same number book by book, which the records cannot give: they are keyed
   by the concept alone, since mastering a concept in one book is mastering it
   in all, while an attempt remembers the book it was answered in. A book the
   reader has only answered wrongly still has a line, with nothing on it. */
export const pointsByBook = (attempts: readonly Attempt[]): Readonly<Record<string, number>> =>
  attempts.reduce<Record<string, number>>((out, a) => ({ ...out, [a.book]: (out[a.book] ?? 0) + Object.values(a.earned).reduce((n, v) => n + v, 0) }), {});
/* The same number day by day, which is what the heatmap draws: a day the reader
   answered nothing has no entry at all, and one they answered only wrongly has
   an entry of nothing, since they did sit down to it. */
export const pointsByDay = (attempts: readonly Attempt[]): Readonly<Record<string, number>> =>
  attempts.reduce<Record<string, number>>((out, a) => ({ ...out, [dayOf(a.at)]: (out[dayOf(a.at)] ?? 0) + Object.values(a.earned).reduce((n, v) => n + v, 0) }), {});
/* The run of days the reader has kept up: calendar days in a row with at least
   one right answer, counted back from today. A day that is not over is not a
   day missed, so a reader who has not practised yet today keeps the streak they
   ended yesterday — it is only broken once yesterday is empty as well. */
export const streakOf = (attempts: readonly Attempt[], now: number): number => {
  const days = new Set(attempts.filter((a) => a.ok).map((a) => dayOf(a.at)));
  const today = dayOf(now);
  let day = days.has(today) ? today : stepDay(today, -1);
  let n = 0;
  while (days.has(day)) { n += 1; day = stepDay(day, -1); }
  return n;
};
/* One list of concepts out of several, each named once. A chapter's
   concepts.json carries every concept its own sections teach and every
   prerequisite they reach, wherever it was taught, so a book's list flattened
   out of its chapters says the same concept over and over: counting that list
   counts a concept once per chapter that leans on it, and drawing it from a
   keyed list is an error. The first of a repeated concept wins, which is the
   chapter that comes first in the book. */
export const uniqueById = <T extends { readonly id: string }>(list: readonly T[]): readonly T[] => {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
};
/* How a set of concepts stands, counted by state. Only the built ones are
   counted: a placeholder stands for a section nobody has written, so nothing
   tests it and the reader cannot be behind on it. */
export type Standing = Readonly<Record<State, number>>;
export const standingOf = (concepts: readonly ConceptDTO[], m: Mastery): Standing =>
  concepts.filter((c) => c.status === 'built')
    .reduce<Standing>((out, c) => { const st = stateOf(m[c.id]); return { ...out, [st]: out[st] + 1 }; }, { untouched: 0, practised: 0, mastered: 0 });
/* The calendar the heatmap is drawn on: `weeks` columns of seven days, a column
   to a week beginning on Sunday, the last of them the week today falls in. The
   days after today are empty strings rather than dates, so the last column
   still has seven cells and the grid keeps its shape. */
export const heatWeeks = (now: number, weeks = 52): readonly (readonly string[])[] => {
  const today = dayOf(now);
  const first = stepDay(today, -(new Date(now).getDay() + (weeks - 1) * 7));   /* the Sunday the first column opens on */
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => { const day = stepDay(first, w * 7 + d); return day > today ? '' : day; }));
};

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
  const out = new Set<string>(cat.concepts.filter((k) => k.status === 'built' && secs.has(k.section)).map((k) => String(k.id)));
  c.filter(isConcept).forEach((p) => { const k = cat.concepts.find((q) => q.id === p.concept); if (!k || k.status === 'built') out.add(String(p.concept)); });
  return out;
};

/* ---------- drawing a session ---------- */

export type Drawn = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO; readonly why: 'frontier' | 'more' };
/* FNV-1a over the seed and the exercise's place, which is what breaks a tie: a
   page refresh draws the same session and tomorrow's seed draws another. */
export const hash = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};

type Cand = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO; readonly key: string; readonly h: number; readonly pos: number; readonly ok: number };

/* How a session may break a tie between two exercises that serve the same
   concept equally well: by where they stand in the library, which is the order
   the reader would meet them reading, or by the hash of the seed, which is a
   shuffle that a refresh repeats. */
export type DrawOrder = 'book' | 'random';
export type DrawOpts = {
  readonly order?: DrawOrder;              /* 'book' by default */
  readonly exclude?: ReadonlySet<string>;  /* exercise keys `book/section/ex` this draw may not take */
  readonly size?: number;                  /* how many to draw, in place of the reader's session size */
};
/* Where every exercise stands on the shelf: the book first — the book being read
   heads the catalogue, so the order they were listed in is the shelf's — then the
   section in the order its book's manifest builds them, then the exercise in the
   order its section sets them. A section its book does not list falls after the
   ones it does. */
const positionsOf = (cat: Catalog): ReadonlyMap<string, number> => {
  const books = [...new Set(cat.exercises.map((e) => e.book))];
  const sections = new Map(books.map((b) => [b, cat.allSections(b)] as const));
  const at = (book: string, section: SectionId): number => { const list = sections.get(book) ?? []; const i = list.indexOf(section); return i < 0 ? list.length : i; };
  return new Map(cat.exercises
    .map((e, i) => ({ key: `${e.book}/${e.section}/${e.ex.id}`, book: books.indexOf(e.book), section: at(e.book, e.section), i }))
    .sort((a, b) => a.book - b.book || a.section - b.section || a.i - b.i)
    .map((e, i) => [e.key, i] as const));
};

/* Draw from the frontier of the DAG, then whatever is left, so that a session
   is always full while exercises remain. */
/* The exercises a curriculum can draw on. A pick of a concept reaches into any
   section of any book that tests it; a pick of a place reaches only its own
   sections. The Choose face counts with this same rule, so what it promises is
   what a session draws. */
export const poolOf = (c: Curriculum, cat: Catalog): Catalog['exercises'] => {
  const inSet = conceptsOf(c, cat);
  const places = new Set(sectionsOfCurriculum(c, cat).map((p) => `${p.book}/${p.section}`));
  const picked = new Set(c.filter(isConcept).map((p) => String(p.concept)));
  return cat.exercises.filter((e) => e.ex.concepts.some((id) => inSet.has(id)) && (places.has(`${e.book}/${e.section}`) || e.ex.concepts.some((id) => picked.has(id))));
};

export const draw = (c: Curriculum, m: Mastery, cat: Catalog, attempts: readonly Attempt[], s: PracticeSettings, now: number, seed: string, opts: DrawOpts = {}): readonly Drawn[] => {
  const inSet = conceptsOf(c, cat);
  const size = opts.size ?? s.session;
  /* Book order is the default, so a session reads the way the book does; the
     shuffle asks for the hash instead, and a seed of its own each time. */
  const pos = opts.order === 'random' ? null : positionsOf(cat);
  const tie = (a: Cand, b: Cand): number => (pos ? a.pos - b.pos : a.h - b.h);
  const state = (id: string): State => stateOf(m[id]);
  const prereqs = new Map<string, readonly string[]>(cat.concepts.map((k) => [k.id, k.prereqs]));

  const lastOk = new Map<string, number>();
  attempts.forEach((a) => {
    const k = `${a.book}/${a.section}/${a.ex}`;
    if (a.ok) lastOk.set(k, Math.max(lastOk.get(k) ?? 0, a.at));
  });
  /* An exercise answered rightly in the last two days is left alone. */
  const pool: Cand[] = poolOf(c, cat)
    .map((e) => { const key = `${e.book}/${e.section}/${e.ex.id}`; return { book: e.book, section: e.section, ex: e.ex, key, h: hash(`${seed}:${key}`), pos: pos?.get(key) ?? 0, ok: lastOk.get(key) ?? 0 }; })
    .filter((e) => !opts.exclude?.has(e.key))
    .filter((e) => e.ok === 0 || now - e.ok > DAY * 2);

  const ids = [...inSet];
  const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
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
    pool.filter((e) => !taken.has(e.key) && e.ex.concepts.some((c) => c === id)).sort(order)[0];
  const take = (e: Cand, why: Drawn['why']): void => { taken.add(e.key); out.push({ book: e.book, section: e.section, ex: e.ex, why }); };
  /* The expert-reversal note: a concept with no score gets its lowest Bloom
     exercise, pattern before problem, and one with a score gets a higher one. */
  const worth = (e: Cand, id: string): number => pointsOf(e.ex)[id] ?? 0;
  const byLevel = (id: string) => { const dir = state(id) === 'untouched' ? 1 : -1; return (a: Cand, b: Cand): number => dir * (worth(a, id) - worth(b, id)) || tie(a, b); };
  const byHardest = (id: string) => (a: Cand, b: Cand): number => worth(b, id) - worth(a, id) || tie(a, b);
  /* One exercise per concept in turn, round after round, until the bucket runs
     dry or the session is full. */
  const rounds = (list: readonly string[], why: Drawn['why'], order: (id: string) => (a: Cand, b: Cand) => number): void => {
    for (let moved = true; moved && out.length < size;) {
      moved = false;
      for (const id of list) {
        if (out.length >= size) break;
        const e = pick(id, order(id));
        if (e) { take(e, why); moved = true; }
      }
    }
  };

  rounds(frontier, 'frontier', byLevel);
  rounds(rest, 'more', byLevel);
  rounds(held, 'more', byHardest);
  return out.slice(0, size);
};

/* What a completed session can show as progress. A concept belongs here when
   its lifetime earned points increased, even if both ends still have the same
   state name: the two mastery boxes can then show a practiced concept filling
   from, say, two tenths to five tenths rather than hiding that gain. */
export type Progress = {
  readonly id: string;
  readonly from: State;
  readonly to: State;
  readonly fromShare: number;
  readonly toShare: number;
};
export const progressOf = (before: Mastery, after: Mastery, s: PracticeSettings): readonly Progress[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
    .flatMap((id) => ((after[id]?.earned ?? 0) > (before[id]?.earned ?? 0)
      ? [{ id, from: stateOf(before[id]), to: stateOf(after[id]), fromShare: shareOf(before[id], s), toShare: shareOf(after[id], s) }]
      : []));
