/* What the practice store keeps in this browser, and how a value read back
   from it (or from a backup, or from another device) is made into one this
   version can use: leniently, a field at a time, so a record written by an
   older or a newer version still reads. Pure, so the backup's validator can be
   checked against what these write. */
import { type SectionId, sectionId, conceptId } from '../types/ids';
import type { ItemKey } from '../layout/model';
import {
  DEFAULT_SETTINGS, MAX_WANTED, sessionId,
  type Attempt, type Curriculum, type Drawn, type Mastery, type Pick,
  type PracticeSettings, type Presentation, type RoundChoice, type RoundEnd, type SelfAssessments, type SessionId,
} from './model';
import { PROVIDER_IDS, type ModelPick } from '../chat/providers/index';
export type Face = 'dashboard' | 'choose' | 'practise' | 'review' | 'sessions';
export type Session = {
  readonly id: SessionId;
  readonly curriculum: Curriculum;
  readonly concepts: readonly string[];
  readonly drawn: readonly { book: string; section: SectionId; ex: string; why: Drawn['why']; release?: string; concept?: string }[];
  readonly at: number;
  readonly outcomes: readonly (boolean | null)[];
  readonly started: number;
  readonly before: Mastery;
  /* Set when the round ends; a done session stays listed until the reader deletes it. */
  readonly status?: 'done';
  readonly ended?: number;
  /* The session's concepts as the round left them. */
  readonly after?: Mastery;
};
export type Page = { readonly curriculum: Curriculum; readonly session: SessionId | null; readonly face: Face; readonly showAll: boolean; readonly round?: RoundChoice };
export const BLANK: Page = { curriculum: [], session: null, face: 'dashboard', showAll: false };

export const KEY = 'omnistax-practice-v2';
export const OLD_KEY = 'omnistax-practice-v1';
export const PAGES = 'omnistax-practice-pages-v2';
export const OLD_PAGES = 'omnistax-practice-pages-v1';
export const SESSIONS = 'omnistax-practice-sessions-v2';
export const OLD_SESSIONS = 'omnistax-practice-sessions-v1';
const FACES: readonly Face[] = ['dashboard', 'choose', 'practise', 'review', 'sessions'];

export const obj = (raw: unknown): Record<string, unknown> | null => typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
const str = (v: unknown): string => typeof v === 'string' ? v : '';
const num = (v: unknown, fallback = 0): number => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown, fallback: boolean): boolean => typeof v === 'boolean' ? v : fallback;
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const oldConcepts = (raw: unknown): string[] => Object.keys(obj(raw) ?? {});

export const parseAttempts = (raw: unknown): Attempt[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.book) || !str(o.section) || !str(o.ex) || !Number.isFinite(o.at)) return [];
  const concepts = strings(o.concepts); const round = str(o.round);
  return [{ book: str(o.book), section: sectionId(str(o.section)), ex: str(o.ex), at: num(o.at), ok: o.ok === true, concepts: concepts.length ? concepts : oldConcepts(o.earned), ...(round ? { round: sessionId(round) } : {}), ...(str(o.release) ? { release: str(o.release) } : {}), ...(strings(o.mastered).length ? { mastered: strings(o.mastered) } : {}) }];
});
export const parseShown = (raw: unknown): Presentation[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.book) || !str(o.section) || !str(o.ex) || !str(o.round) || !Number.isFinite(o.at)) return [];
  return [{ book: str(o.book), section: sectionId(str(o.section)), ex: str(o.ex), at: num(o.at), round: sessionId(str(o.round)), ...(str(o.release) ? { release: str(o.release) } : {}) }];
});
export const parseSettings = (raw: unknown): PracticeSettings => {
  const o = obj(raw); if (!o) return DEFAULT_SETTINGS;
  return {
    masteryTarget: Math.max(1, Math.round(num(o.masteryTarget, DEFAULT_SETTINGS.masteryTarget))),
    freshnessDecay: bool(o.freshnessDecay, DEFAULT_SETTINGS.freshnessDecay),
    startingHalfLife: Math.max(1, num(o.startingHalfLife, DEFAULT_SETTINGS.startingHalfLife)),
    maxHalfLife: Math.max(1, num(o.maxHalfLife, DEFAULT_SETTINGS.maxHalfLife)),
    order: o.order === 'grouped' ? 'grouped' : 'mixed',
    includeFresh: bool(o.includeFresh, DEFAULT_SETTINGS.includeFresh),
    generated: o.generated === 'book-only' ? 'book-only' : 'include',
    grading: o.grading === 'ai' ? 'ai' : 'reveal',
    promptNote: str(o.promptNote) || DEFAULT_SETTINGS.promptNote,
    fresh: bool(o.fresh, DEFAULT_SETTINGS.fresh),
    stopwatch: bool(o.stopwatch, DEFAULT_SETTINGS.stopwatch),
    model: parsePick(o.model),
  };
};
const parsePick = (raw: unknown): ModelPick | null => {
  const o = obj(raw), provider = PROVIDER_IDS.find((p) => p === o?.provider);
  return provider && str(o?.model) ? { provider, model: str(o?.model) } : null;
};
export const parseRound = (raw: unknown): RoundChoice | undefined => {
  const o = obj(raw); if (!o) return undefined;
  const count = (v: unknown): number => Math.min(MAX_WANTED, Math.max(0, Math.round(num(v))));
  const wanted = Object.fromEntries(Object.entries(obj(o.wanted) ?? {}).map(([id, v]) => [id, count(v)]));
  const excluded = strings(o.excluded);
  return { ...(o.perConcept === undefined ? {} : { perConcept: count(o.perConcept) }), wanted, ...(excluded.length ? { excluded } : {}) };
};
export const parseSelf = (raw: unknown): SelfAssessments => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, value]) => {
    const r = obj(value); if (!r) return [];
    return [[id, { level: Math.max(0, Math.round(num(r.level))), mastered: r.mastered === true, at: num(r.at), noDecay: r.noDecay === true }] as const];
  }));
};
export const parseRounds = (raw: unknown): RoundEnd[] => !Array.isArray(raw) ? [] : raw.flatMap((value) => {
  const o = obj(value); if (!o || !str(o.id) || !Array.isArray(o.concepts)) return [];
  const concepts = o.concepts.flatMap((value) => {
    const r = obj(value); if (!r || !str(r.id)) return [];
    return [{ id: str(r.id), expected: Math.max(0, Math.round(num(r.expected))), answered: Math.max(0, Math.round(num(r.answered))), correct: Math.max(0, Math.round(num(r.correct))), wasMastered: r.wasMastered === true, wasDue: r.wasDue === true }];
  });
  return [{ id: sessionId(str(o.id)), started: num(o.started), at: num(o.at), concepts, newlyMastered: strings(o.newlyMastered) }];
});
export const parseCurriculum = (raw: unknown): Pick[] => !Array.isArray(raw) ? [] : raw.flatMap((value): Pick[] => {
  const o = obj(value); if (!o) return [];
  if (str(o.concept)) return [{ concept: conceptId(str(o.concept)) }];
  const e = obj(o.exercise);
  if (e) return str(e.book) && str(e.section) && str(e.ex) ? [{ exercise: { book: str(e.book), section: sectionId(str(e.section)), ex: str(e.ex) } }] : [];
  if (!str(o.book)) return [];
  return [{ book: str(o.book), ...(str(o.chapter) ? { chapter: str(o.chapter) } : {}), ...(str(o.section) ? { section: sectionId(str(o.section)) } : {}) }];
});
export const parseMastery = (raw: unknown): Mastery => {
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
export const parseSession = (raw: unknown, id: SessionId): Session | null => {
  const o = obj(raw); if (!o || !Array.isArray(o.drawn)) return null;
  const drawn = o.drawn.flatMap((value) => {
    const d = obj(value); if (!d || !str(d.book) || !str(d.section) || !str(d.ex)) return [];
    const why: Drawn['why'] = d.why === 'new' || d.why === 'unanswered' || d.why === 'review' ? d.why : 'review';
    return [{ book: str(d.book), section: sectionId(str(d.section)), ex: str(d.ex), why, ...(str(d.release) ? { release: str(d.release) } : {}), ...(str(d.concept) ? { concept: str(d.concept) } : {}) }];
  });
  if (!drawn.length) return null;
  const oldAnswered = Array.isArray(o.answered) ? o.answered : [];
  const outcomes = drawn.map((_, i): boolean | null => { const v = Array.isArray(o.outcomes) ? o.outcomes[i] : undefined; return typeof v === 'boolean' ? v : oldAnswered[i] === true ? true : null; });
  return {
    id, curriculum: parseCurriculum(o.curriculum), concepts: strings(o.concepts), drawn,
    at: Math.min(drawn.length, Math.max(0, Math.round(num(o.at)))), outcomes,
    started: num(o.started), before: parseMastery(o.before),
    ...(o.status === 'done' ? { status: 'done' as const, ended: num(o.ended, num(o.started)) } : {}),
    ...(obj(o.after) ? { after: parseMastery(o.after) } : {}),
  };
};
export const parseSessions = (raw: unknown): Record<SessionId, Session> => {
  const o = obj(raw); if (!o) return {};
  return Object.fromEntries(Object.entries(o).flatMap(([id, value]) => { const parsed = parseSession(value, sessionId(id)); return parsed ? [[id, parsed] as const] : []; }));
};
export const parsePage = (raw: unknown): Page => {
  const o = obj(raw); if (!o) return BLANK;
  const named = str(o.session);
  const round = parseRound(o.round);
  return { curriculum: parseCurriculum(o.curriculum), session: named ? sessionId(named) : null, face: o.face === 'summary' || o.face === 'progress' ? 'review' : FACES.find((x) => x === o.face) ?? 'dashboard', showAll: o.showAll === true, ...(round ? { round } : {}) };
};
export const restrict = (m: Mastery, ids: readonly string[]): Mastery => Object.fromEntries(ids.flatMap((id) => m[id] ? [[id, m[id]] as const] : []));
export const parsePages = (raw: unknown): Record<ItemKey, Page> => {
  const o = obj(raw); return o ? Object.fromEntries(Object.entries(o).map(([key, value]) => [key, parsePage(value)])) : {};
};

