/* Pure practice rules. The store persists evidence; this module turns that
   evidence into attainment, freshness, and a fixed round of exercises. */
import type { ExerciseDTO, ConceptDTO } from '../content/schema';
import type { SectionId, ConceptId } from '../types/ids';

export const DAY = 86_400_000;

export type PracticeOrder = 'mixed' | 'grouped';
export type PracticeSettings = {
  readonly masteryTarget: number;
  readonly freshnessDecay: boolean;
  readonly startingHalfLife: number;
  readonly maxHalfLife: number;
  readonly order: PracticeOrder;
  readonly includeFresh: boolean;
};
export const DEFAULT_SETTINGS: PracticeSettings = {
  masteryTarget: 3, freshnessDecay: true, startingHalfLife: 3,
  maxHalfLife: 240, order: 'mixed', includeFresh: false,
};

export type Attempt = {
  readonly book: string; readonly section: SectionId; readonly ex: string;
  readonly at: number; readonly ok: boolean; readonly concepts: readonly string[];
  readonly round?: SessionId;
};
export type Presentation = {
  readonly book: string; readonly section: SectionId; readonly ex: string;
  readonly at: number; readonly round: SessionId;
};
export type SelfAssessment = { readonly level: number; readonly mastered: boolean; readonly at: number; readonly noDecay: boolean };
export type SelfAssessments = Readonly<Record<string, SelfAssessment>>;
export type RoundConcept = {
  readonly id: string; readonly expected: number; readonly answered: number; readonly correct: number;
  readonly wasMastered: boolean; readonly wasDue: boolean;
};
export type RoundEnd = {
  readonly id: SessionId; readonly started: number; readonly at: number;
  readonly concepts: readonly RoundConcept[]; readonly newlyMastered: readonly string[];
};

export type ConceptRecord = {
  readonly level: number; readonly target: number; readonly mastered: boolean;
  readonly masteredAt: number; readonly lastAt: number; readonly halfLife: number;
  readonly reviewedAt: number; readonly dueAt: number; readonly selfAssessed: boolean;
  readonly noDecay: boolean;
};
export type Mastery = Readonly<Record<string, ConceptRecord>>;
export type State = 'untouched' | 'practised' | 'mastered';

export type SessionId = string & { readonly __brand: 'SessionId' };
export const sessionId = (s: string): SessionId => s as SessionId;
export const newSessionId = (): SessionId => sessionId(Math.random().toString(36).slice(2, 10).padEnd(8, '0'));

const pad = (n: number): string => String(n).padStart(2, '0');
export const dayOf = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const stepDay = (day: string, by: number): string => {
  const p = day.split('-').map(Number);
  if (p.length !== 3 || !p.every((n) => Number.isFinite(n))) return '';
  return dayOf(new Date(p[0], p[1] - 1, p[2] + by, 12).getTime());
};

export const stateOf = (r: ConceptRecord | undefined): State => !r || r.level === 0 && !r.mastered ? 'untouched' : r.mastered ? 'mastered' : 'practised';
export const shareOf = (r: ConceptRecord | undefined): number => !r ? 0 : r.mastered ? 1 : Math.min(1, r.level / Math.max(1, r.target));
export const MIN_FILL = 0.15;
export const fillOf = (state: State, share: number): number => state === 'untouched' ? 0 : state === 'mastered' ? 1 : Math.max(MIN_FILL, Math.min(1, share));

export type Freshness = { readonly value: number; readonly due: boolean; readonly dueAt: number; readonly permanent: boolean };
export const freshnessOf = (r: ConceptRecord | undefined, s: PracticeSettings, now: number): Freshness => {
  if (!r?.mastered) return { value: 0, due: false, dueAt: 0, permanent: false };
  if (!s.freshnessDecay || r.noDecay) return { value: 1, due: false, dueAt: Number.POSITIVE_INFINITY, permanent: true };
  const elapsedDays = Math.max(0, now - r.reviewedAt) / DAY;
  return { value: Math.pow(2, -elapsedDays / Math.max(1, r.halfLife)), due: now >= r.dueAt, dueAt: r.dueAt, permanent: false };
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
export const rebuild = (
  attempts: readonly Attempt[], rounds: readonly RoundEnd[], self: SelfAssessments,
  s: PracticeSettings, available: Readonly<Record<string, number>>,
): Mastery => {
  const ids = new Set<string>([
    ...Object.keys(available), ...Object.keys(self), ...attempts.flatMap((a) => a.concepts),
    ...rounds.flatMap((r) => [...r.newlyMastered, ...r.concepts.map((c) => c.id)]),
  ]);
  const out: Record<string, ConceptRecord> = {};
  const ended = new Set(rounds.map((r) => r.id));
  ids.forEach((id) => {
    const target = Math.min(Math.max(1, Math.round(s.masteryTarget)), Math.max(1, available[id] ?? s.masteryTarget));
    const own = self[id];
    const relevant = attempts.filter((a) => (!a.round || ended.has(a.round)) && a.concepts.includes(id) && (!own || a.at > own.at)).sort((a, b) => a.at - b.at);
    let level = own ? (own.mastered ? target : clamp(Math.round(own.level), 0, target)) : 0;
    relevant.forEach((a) => { level = clamp(level + (a.ok ? 1 : -1), 0, target); });
    const achievements = rounds.filter((r) => (!own || r.at > own.at) && r.newlyMastered.includes(id)).map((r) => r.at);
    const mastered = own ? own.mastered || achievements.length > 0 || level >= target : achievements.length > 0 || level >= target;
    if (!mastered && level === 0 && !own && relevant.length === 0) return;
    const masteredAt = own?.mastered ? own.at : achievements[0] ?? (mastered ? relevant.at(-1)?.at ?? 0 : 0);
    let halfLife = Math.max(1, s.startingHalfLife), reviewedAt = masteredAt;
    let dueAt = masteredAt ? masteredAt + halfLife * DAY : 0;
    rounds.filter((r) => r.at > masteredAt).sort((a, b) => a.at - b.at).forEach((round) => {
      const review = round.concepts.find((c) => c.id === id);
      if (!review?.wasMastered || review.answered === 0) return;
      const ratio = review.correct / review.answered;
      if (ratio < 2 / 3) {
        halfLife = Math.max(s.startingHalfLife, halfLife / 2);
        reviewedAt = round.at; dueAt = round.at + DAY;
      } else if (review.answered === review.expected && review.wasDue) {
        if (review.correct === review.expected) halfLife = Math.min(s.maxHalfLife, halfLife * 2);
        reviewedAt = round.at; dueAt = round.at + halfLife * DAY;
      }
    });
    out[id] = {
      level: mastered ? target : level, target, mastered, masteredAt,
      lastAt: Math.max(0, ...attempts.filter((a) => a.concepts.includes(id)).map((a) => a.at)),
      halfLife, reviewedAt, dueAt, selfAssessed: !!own,
      noDecay: !!own?.mastered && !!own.noDecay,
    };
  });
  return out;
};

export const completed = (attempts: readonly Attempt[]): number => attempts.length;
export type DayWork = { readonly completed: number; readonly correct: number };
export const workByDay = (attempts: readonly Attempt[]): Readonly<Record<string, DayWork>> => attempts.reduce<Record<string, DayWork>>((out, a) => {
  const day = dayOf(a.at), was = out[day] ?? { completed: 0, correct: 0 };
  out[day] = { completed: was.completed + 1, correct: was.correct + (a.ok ? 1 : 0) };
  return out;
}, {});
export const completedByBook = (attempts: readonly Attempt[]): Readonly<Record<string, number>> => attempts.reduce<Record<string, number>>((out, a) => ({ ...out, [a.book]: (out[a.book] ?? 0) + 1 }), {});
export const streakOf = (attempts: readonly Attempt[], now: number): number => {
  const days = new Set(attempts.map((a) => dayOf(a.at))), today = dayOf(now);
  let day = days.has(today) ? today : stepDay(today, -1), n = 0;
  while (days.has(day)) { n += 1; day = stepDay(day, -1); }
  return n;
};

export const uniqueById = <T extends { readonly id: string }>(list: readonly T[]): readonly T[] => {
  const seen = new Set<string>(); return list.filter((c) => seen.has(c.id) ? false : (seen.add(c.id), true));
};
export type Standing = Readonly<Record<State, number>>;
export const standingOf = (concepts: readonly ConceptDTO[], m: Mastery): Standing => concepts.filter((c) => c.status === 'built').reduce<Standing>((out, c) => {
  const state = stateOf(m[c.id]); return { ...out, [state]: out[state] + 1 };
}, { untouched: 0, practised: 0, mastered: 0 });
export const heatWeeks = (now: number, weeks = 52): readonly (readonly string[])[] => {
  const today = dayOf(now), first = stepDay(today, -(new Date(now).getDay() + (weeks - 1) * 7));
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => { const day = stepDay(first, w * 7 + d); return day > today ? '' : day; }));
};

export type Pick = { readonly book: string; readonly chapter?: string; readonly section?: SectionId } | { readonly concept: ConceptId };
export type Curriculum = readonly Pick[];
export type CatalogExercise = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO };
export type Catalog = {
  readonly concepts: readonly ConceptDTO[];
  readonly sectionsOf: (book: string, chapter: string) => readonly SectionId[];
  readonly allSections: (book: string) => readonly SectionId[];
  readonly exercises: readonly CatalogExercise[];
};
const isConcept = (p: Pick): p is { readonly concept: ConceptId } => 'concept' in p;
export const samePick = (a: Pick, b: Pick): boolean => isConcept(a) ? isConcept(b) && a.concept === b.concept : !isConcept(b) && a.book === b.book && (a.chapter ?? '') === (b.chapter ?? '') && (a.section ?? '') === (b.section ?? '');
export const togglePick = (c: Curriculum, p: Pick): Curriculum => c.some((q) => samePick(q, p)) ? c.filter((q) => !samePick(q, p)) : [...c, p];
export const sectionsOfCurriculum = (c: Curriculum, cat: Catalog): readonly { book: string; section: SectionId }[] => {
  const out: { book: string; section: SectionId }[] = [], seen = new Set<string>();
  c.filter((p) => !isConcept(p)).forEach((p) => {
    const place = p as Extract<Pick, { book: string }>;
    const sections = place.section ? [place.section] : place.chapter ? cat.sectionsOf(place.book, place.chapter) : cat.allSections(place.book);
    sections.forEach((section) => { const key = `${place.book}/${section}`; if (!seen.has(key)) { seen.add(key); out.push({ book: place.book, section }); } });
  });
  return out;
};
export const conceptsOf = (c: Curriculum, cat: Catalog): ReadonlySet<string> => {
  const places = new Set(sectionsOfCurriculum(c, cat).map((p) => `${p.book}/${p.section}`)), out = new Set<string>();
  cat.exercises.filter((e) => places.has(`${e.book}/${e.section}`)).forEach((e) => e.ex.concepts.forEach((id) => out.add(id)));
  c.filter(isConcept).forEach((p) => { const found = cat.concepts.find((q) => q.id === p.concept); if (!found || found.status === 'built') out.add(String(p.concept)); });
  return out;
};
export const keyOf = (e: { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO | string }): string => `${e.book}/${e.section}/${typeof e.ex === 'string' ? e.ex : e.ex.id}`;
export const poolOf = (c: Curriculum, cat: Catalog): readonly CatalogExercise[] => {
  const selected = conceptsOf(c, cat), places = new Set(sectionsOfCurriculum(c, cat).map((p) => `${p.book}/${p.section}`));
  const explicit = new Set(c.filter(isConcept).map((p) => String(p.concept)));
  return cat.exercises.filter((e) => e.ex.concepts.some((id) => selected.has(id)) && (places.has(`${e.book}/${e.section}`) || e.ex.concepts.some((id) => explicit.has(id))));
};
export const availabilityOf = (cat: Catalog): Readonly<Record<string, number>> => {
  const sets: Record<string, Set<string>> = {};
  cat.exercises.forEach((e) => e.ex.concepts.forEach((id) => (sets[id] ??= new Set()).add(keyOf(e))));
  return Object.fromEntries(Object.entries(sets).map(([id, keys]) => [id, keys.size]));
};

export type Drawn = { readonly book: string; readonly section: SectionId; readonly ex: ExerciseDTO; readonly why: 'new' | 'unanswered' | 'review' };
export type RoundPlan = { readonly drawn: readonly Drawn[]; readonly concepts: readonly string[]; readonly shortages: number; readonly sharedConcepts: number; readonly target: number };
const bloomRank = (b: string): number => ({ remember: 0, understand: 1, apply: 2, analyze: 3, analyse: 3, evaluate: 4, create: 5 }[b.toLowerCase()] ?? 2);
const positionsOf = (cat: Catalog): ReadonlyMap<string, number> => new Map(cat.exercises.map((e, i) => [keyOf(e), i]));
type Candidate = CatalogExercise & { readonly key: string; readonly tier: number; readonly last: number; readonly pos: number };

export const prepare = (
  curriculum: Curriculum, mastery: Mastery, cat: Catalog, attempts: readonly Attempt[], shown: readonly Presentation[],
  settings: PracticeSettings, now: number,
): RoundPlan => {
  const available = availabilityOf(cat), selected = [...conceptsOf(curriculum, cat)].filter((id) => (available[id] ?? 0) > 0);
  const eligible = selected.filter((id) => { const r = mastery[id]; return !r?.mastered || settings.includeFresh || freshnessOf(r, settings, now).due; });
  const target = Math.max(1, Math.round(settings.masteryTarget)), quotas = new Map(eligible.map((id) => [id, Math.min(target, available[id] ?? 0)] as const));
  const positions = positionsOf(cat), lastShown = new Map<string, number>(), lastAttempt = new Map<string, number>();
  shown.forEach((p) => lastShown.set(keyOf(p), Math.max(lastShown.get(keyOf(p)) ?? 0, p.at)));
  attempts.forEach((a) => lastAttempt.set(keyOf(a), Math.max(lastAttempt.get(keyOf(a)) ?? 0, a.at)));
  const pool = poolOf(curriculum, cat).map((e): Candidate => {
    const key = keyOf(e), seen = lastShown.get(key) ?? 0, answered = lastAttempt.get(key) ?? 0;
    return { ...e, key, tier: seen === 0 ? 0 : answered === 0 ? 1 : 2, last: answered || seen, pos: positions.get(key) ?? 0 };
  });
  const compare = (id: string) => (a: Candidate, b: Candidate): number => a.tier - b.tier || a.last - b.last || (mastery[id]?.mastered ? 0 : bloomRank(a.ex.bloom) - bloomRank(b.ex.bloom)) || a.pos - b.pos || a.key.localeCompare(b.key);
  const chosen = new Map<string, Candidate>();
  eligible.forEach((id) => pool.filter((e) => e.ex.concepts.some((concept) => concept === id)).sort(compare(id)).slice(0, quotas.get(id)).forEach((e) => chosen.set(e.key, e)));
  const count = (list: readonly Candidate[], id: string): number => list.filter((e) => e.ex.concepts.some((concept) => concept === id)).length;
  let minimal = [...chosen.values()];
  [...minimal].sort((a, b) => b.tier - a.tier || b.last - a.last || b.pos - a.pos).forEach((e) => {
    const touched = e.ex.concepts.filter((id) => quotas.has(id));
    if (touched.length && touched.every((id) => count(minimal, id) - 1 >= (quotas.get(id) ?? 0))) minimal = minimal.filter((x) => x.key !== e.key);
  });
  const primary = (e: Candidate): number => Math.min(...e.ex.concepts.filter((id) => quotas.has(id)).map((id) => eligible.indexOf(id)));
  if (settings.order === 'grouped') minimal.sort((a, b) => primary(a) - primary(b) || a.pos - b.pos);
  else {
    const left = [...minimal], ordered: Candidate[] = [];
    while (left.length) {
      const recent = new Set(ordered.slice(-2).flatMap((e) => e.ex.concepts));
      left.sort((a, b) => a.ex.concepts.filter((id) => recent.has(id)).length - b.ex.concepts.filter((id) => recent.has(id)).length || a.tier - b.tier || a.last - b.last || a.pos - b.pos);
      ordered.push(left.shift()!);
    }
    minimal = ordered;
  }
  const shared = new Set<string>();
  minimal.forEach((e) => { const ids = e.ex.concepts.filter((id) => quotas.has(id)); if (ids.length > 1) ids.forEach((id) => shared.add(id)); });
  return {
    drawn: minimal.map((e) => ({ book: e.book, section: e.section, ex: e.ex, why: e.tier === 0 ? 'new' : e.tier === 1 ? 'unanswered' : 'review' })),
    concepts: eligible, shortages: eligible.filter((id) => (available[id] ?? 0) < target).length, sharedConcepts: shared.size, target,
  };
};

export type Progress = { readonly id: string; readonly from: State; readonly to: State; readonly fromShare: number; readonly toShare: number };
export const progressOf = (before: Mastery, after: Mastery): readonly Progress[] => [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((id) => {
  const from = stateOf(before[id]), to = stateOf(after[id]), fromShare = shareOf(before[id]), toShare = shareOf(after[id]);
  return from !== to || fromShare !== toShare ? [{ id, from, to, fromShare, toShare }] : [];
});
