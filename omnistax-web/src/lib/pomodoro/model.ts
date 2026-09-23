/* One pomodoro as a plain immutable value: how long it runs, how much of it has
   been spent, and which of the five phases it stands in. Nothing here touches a
   clock, a browser or storage — every function is handed the instant it should
   reckon from — so the whole of the logic can be checked without a browser.

   The five phases are the whole of the machine: idle before a session, running
   while it counts down, paused while the reader has stopped it, done when the
   time is up, and lost when screen lock caught the reader away from the window.
   Done and lost are both ends: the next start begins a fresh session. */
import { z } from 'zod';

/* Two magic numbers that are easy to swap for one another, so they are branded
   apart: how long a session is asked for in, and how long anything lasts in. */
export type Minutes = number & { readonly __brand: 'Minutes' };
export type Millis = number & { readonly __brand: 'Millis' };
export const minutes = (n: number): Minutes => n as Minutes;
export const millis = (n: number): Millis => n as Millis;
/* An instant, as Date.now() gives it. */
export type Instant = number & { readonly __brand: 'Instant' };
export const instant = (n: number): Instant => n as Instant;

export type Phase = 'idle' | 'running' | 'paused' | 'done' | 'lost';
/* The two ways a sitting is timed: counting down to a length the reader chose,
   or counting up from nothing until they say it is over. */
export type Mode = 'pomodoro' | 'stopwatch';
export const MODES = ['pomodoro', 'stopwatch'] as const;

export type Session = {
  readonly phase: Phase;
  readonly mode: Mode;                    /* counting down, or counting up */
  readonly minutes: Minutes;              /* how long this session was asked to run; the countdown's only */
  readonly seed: Millis;                  /* time the stopwatch starts from, so an untracked stretch can still be written down */
  readonly startedAt: Instant | null;     /* when the reader first started it */
  readonly spent: Millis;                 /* time counted before the last resume */
  readonly since: Instant | null;         /* when the current run began; only while running */
};

export const LENGTH = { min: minutes(1), max: minutes(999), default: minutes(25) } as const;
/* The furthest back a stopwatch may be seeded: a day, which is longer than any sitting. */
export const SEED_MAX = millis(24 * 3_600_000);
/* How long the mouse may be away from the window before screen lock gives up on the session, unless the reader says otherwise. */
export const LOCK_GRACE = millis(10_000);

/* Whole seconds, so a length typed as mm:ss survives the trip. */
export const clampLength = (n: number): Minutes =>
  minutes(Math.max(LENGTH.min, Math.min(LENGTH.max, Math.round((Number.isFinite(n) ? n : LENGTH.default) * 60) / 60)));

/* What the reader types into the clock face: plain minutes (up to three
   digits), mm:ss, or h:mm:ss. Anything else reads as nothing. */
export const parseClock = (text: string): Millis | null => {
  const t = text.trim();
  if (/^\d{1,3}$/.test(t)) return millis(Number(t) * 60_000);
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})$/.exec(t);
  if (!m || Number(m[3]) > 59) return null;
  return millis(((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000);
};

export const idle = (len: Minutes = LENGTH.default, mode: Mode = 'pomodoro'): Session =>
  ({ phase: 'idle', mode, minutes: clampLength(len), seed: millis(0), startedAt: null, spent: millis(0), since: null });

/* The mode is the reader's to choose between sittings, never during one; the
   seed it starts from goes with it, since only a stopwatch has one. */
export const setMode = (s: Session, mode: Mode): Session =>
  isLive(s) ? s : { ...idle(s.minutes, mode), seed: mode === 'stopwatch' ? s.seed : millis(0) };
export const clampSeed = (ms: number): Millis =>
  millis(Math.max(0, Math.min(SEED_MAX, Math.round(Number.isFinite(ms) ? ms : 0))));
/* hh:mm as the field gives it, which is how a reader remembers a stretch they did not time. */
export const seedOf = (hours: number, mins: number): Millis =>
  clampSeed((Number.isFinite(hours) ? hours : 0) * 3_600_000 + (Number.isFinite(mins) ? mins : 0) * 60_000);
export const setSeed = (s: Session, ms: number): Session =>
  isLive(s) || s.mode !== 'stopwatch' ? s : { ...s, seed: clampSeed(ms) };

const lengthMs = (s: Session): Millis => millis(s.minutes * 60_000);
/* How much of the session has been counted at this instant: what was banked
   before the last resume, plus the stretch since it, while it is running. */
export const spentAt = (s: Session, now: Instant): Millis =>
  millis(s.spent + (s.phase === 'running' && s.since !== null ? Math.max(0, now - s.since) : 0));
export const remaining = (s: Session, now: Instant): Millis =>
  millis(Math.max(0, lengthMs(s) - spentAt(s, now)));
/* How long the sitting has run, counting the stretch a stopwatch was seeded with. */
export const elapsed = (s: Session, now: Instant): Millis => millis(s.seed + spentAt(s, now));
/* What the digital face reads: the time left on a countdown, the time gone on a stopwatch. */
export const faceMs = (s: Session, now: Instant): Millis => (s.mode === 'stopwatch' ? elapsed(s, now) : remaining(s, now));
export const isOver = (s: Session): boolean => s.phase === 'done' || s.phase === 'lost';
export const isLive = (s: Session): boolean => s.phase === 'running' || s.phase === 'paused';

/* mm:ss, rounded up, so a clock reading 1:00 still has a whole second to run
   and only reads 0:00 when the session is actually over. */
export const clockText = (ms: Millis): string => {
  const secs = Math.ceil(Math.max(0, ms) / 1000);
  const mins = Math.floor(secs / 60);
  const tail = `${String(mins % 60).padStart(mins >= 60 ? 2 : 1, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return mins >= 60 ? `${Math.floor(mins / 60)}:${tail}` : tail;
};

/* Start a session: from idle it begins, and from either end it begins again at
   the same length. A running or paused session is left alone, since starting
   one that is already under way would throw its time away. */
export const start = (s: Session, now: Instant): Session =>
  isLive(s) ? s : { ...s, phase: 'running', startedAt: now, spent: millis(0), since: now };

export const pause = (s: Session, now: Instant): Session =>
  s.phase !== 'running' ? s : { ...s, phase: 'paused', spent: spentAt(s, now), since: null };

export const resume = (s: Session, now: Instant): Session =>
  s.phase !== 'paused' ? s : { ...s, phase: 'running', since: now };

/* Give up on the session and go back to idle, keeping the length, the mode and
   the seed for the next one. */
export const stop = (s: Session): Session => ({ ...idle(s.minutes, s.mode), seed: s.seed });

/* A stopwatch has no end of its own, so the reader gives it one: the sitting is
   done, with everything it counted kept, and is written down like any other. */
export const finish = (s: Session, now: Instant): Session =>
  !isLive(s) ? s : { ...s, phase: 'done', spent: spentAt(s, now), since: null };

/* Screen lock caught the reader away from the window: the session is lost, and
   nothing of it is ever written down. */
export const lose = (s: Session, now: Instant): Session =>
  !isLive(s) ? s : { ...s, phase: 'lost', spent: spentAt(s, now), since: null };

/* The clock moving on. The only thing a tick can change is a running session
   reaching its end; everything else reads the same at any instant. */
export const tick = (s: Session, now: Instant): Session =>
  s.phase === 'running' && s.mode === 'pomodoro' && remaining(s, now) <= 0 ? { ...s, phase: 'done', spent: lengthMs(s), since: null } : s;

/* The length is the reader's to choose between sessions, never during one. */
export const setLength = (s: Session, len: number): Session =>
  isLive(s) ? s : { ...s, minutes: clampLength(len) };

/* Persistence boundary: the categories the reader has made and the history of
   the sittings that have ended, as both are written to this browser and read
   back from it. A log written before categories or modes existed is read all
   the same — every field a session has gained has a plain default — so nothing
   a reader has already recorded is thrown away. */
export type CategoryId = string & { readonly __brand: 'CategoryId' };
export const categoryId = (s: string): CategoryId => s as CategoryId;
export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  color: z.string(),
});
export const CategoryLogSchema = z.array(CategorySchema);
export type Category = z.infer<typeof CategorySchema>;

/* Fifteen hues, three rows of five, chosen to stand apart from one another and
   to keep their footing on a light page and a dark one alike. */
export const CATEGORY_COLORS: readonly string[] = [
  '#e0564f', '#e08a3c', '#d8b229', '#79ad3e', '#3fa87a',
  '#38a3a5', '#4b8fd6', '#5f6fd4', '#8a63cf', '#b95bbd',
  '#d4568c', '#a9714f', '#6b8f9c', '#7f8a5a', '#8b8b96',
];
export const nextColor = (cats: readonly Category[]): string =>
  CATEGORY_COLORS.find((c) => !cats.some((k) => k.color === c)) ?? CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length];

export const addCategory = (cats: readonly Category[], name: string, color: string, id: string): readonly Category[] => {
  const n = name.trim();
  return !n || cats.some((c) => c.name.toLowerCase() === n.toLowerCase()) ? cats : [...cats, { id, name: n, color }];
};
export const renameCategory = (cats: readonly Category[], id: string, name: string): readonly Category[] =>
  !name.trim() ? cats : cats.map((c) => (c.id === id ? { ...c, name: name.trim() } : c));
export const recolourCategory = (cats: readonly Category[], id: string, color: string): readonly Category[] =>
  cats.map((c) => (c.id === id ? { ...c, color } : c));
export const removeCategory = (cats: readonly Category[], id: string): readonly Category[] => cats.filter((c) => c.id !== id);
export const colorOf = (cats: readonly Category[], id: string): string => cats.find((c) => c.id === id)?.color ?? 'var(--muted)';
export const nameOf = (cats: readonly Category[], id: string): string => cats.find((c) => c.id === id)?.name ?? '';

export const PomodoroSchema = z.object({
  id: z.string().min(1).optional(),
  start: z.number().finite(),
  end: z.number().finite(),
  minutes: z.number().finite(),
  summary: z.string(),
  completed: z.boolean(),
  /* Gained in the second round; an older entry has neither, and reads as a
     countdown that was filed under nothing. */
  mode: z.enum(MODES).catch('pomodoro').default('pomodoro'),
  categories: z.array(z.string()).catch([]).default([]),
});
export const PomodoroLogSchema = z.array(PomodoroSchema);
export type Pomodoro = z.infer<typeof PomodoroSchema>;

/* How many finished sessions are kept. */
export const LOG_CAP = 5000;
export const logged = (log: readonly Pomodoro[], p: Pomodoro, cap = LOG_CAP): readonly Pomodoro[] => {
  const next = [p, ...log];
  return next.length > cap ? next.slice(0, cap) : next;
};
/* An entry is edited and deleted by its id, so that moving a sitting in time
   does not lose hold of it. */
export const amended = (log: readonly Pomodoro[], p: Pomodoro): readonly Pomodoro[] =>
  log.map((e) => (e.id === p.id ? p : e));
export const dropped = (log: readonly Pomodoro[], id: string): readonly Pomodoro[] => log.filter((e) => e.id !== id);
/* A category that is deleted leaves the sittings it was on standing, under whatever else they were filed as. */
export const unfiled = (log: readonly Pomodoro[], id: string): readonly Pomodoro[] =>
  log.map((e) => (e.categories.includes(id) ? { ...e, categories: e.categories.filter((c) => c !== id) } : e));

/* A session that got to its end, written down: when it ran and what the reader
   filed it under. A lost one is never written. A stopwatch that was seeded
   reads as having begun that much earlier, which is the stretch the reader
   means to record. */
export const record = (s: Session, now: Instant, summary = '', categories: readonly string[] = [], id = String(now)): Pomodoro | null =>
  s.phase !== 'done' || s.startedAt === null ? null
    : {
      id,
      start: s.startedAt - (s.mode === 'stopwatch' ? s.seed : 0),
      end: now,
      minutes: s.minutes,
      summary: summary.trim(),
      completed: s.phase === 'done',
      mode: s.mode,
      categories: [...categories],
    };

/* How long an entry ran, which is the only duration the stats ever quote. */
export const ranMs = (p: Pomodoro): number => Math.max(0, p.end - p.start);
export const totalMs = (log: readonly Pomodoro[]): number => log.reduce((n, p) => n + ranMs(p), 0);
/* A stretch of time, said the short way: 2h 05m, or 45m, or 30s for a sitting that barely was. */
export const spanText = (ms: number): string => {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return `${Math.max(0, Math.round(ms / 1000))}s`;
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

/* The day an instant falls in, as this reader's own calendar has it, which is
   what a date field reads and writes. */
export type DayKey = string & { readonly __brand: 'DayKey' };
export const dayKey = (ms: number): DayKey => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as DayKey;
};
const dayDate = (day: DayKey): Date => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
export const dayBefore = (day: DayKey, back: number): DayKey => {
  const d = dayDate(day);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime());
};
export const monthBefore = (day: DayKey, back: number): DayKey => {
  const d = dayDate(day);
  return dayKey(new Date(d.getFullYear(), d.getMonth() - back, d.getDate()).getTime());
};

/* How a range is cut into bars: a week or less by the day, a month or less by
   the week, a year or less by the month, and anything longer by the year. */
export type Unit = 'day' | 'week' | 'month' | 'year';
export const unitFor = (from: DayKey, to: DayKey): Unit => {
  const a = dayDate(from);
  const b = dayDate(to);
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  if (days <= 7) return 'day';
  if (b <= new Date(a.getFullYear(), a.getMonth() + 1, a.getDate())) return 'week';
  if (b <= new Date(a.getFullYear() + 1, a.getMonth(), a.getDate())) return 'month';
  return 'year';
};
/* The first instant of the unit an instant falls in; a week begins on Monday. */
const unitStart = (ms: number, unit: Unit): Date => {
  const d = new Date(ms);
  if (unit === 'year') return new Date(d.getFullYear(), 0, 1);
  if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (unit === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const unitAfter = (d: Date, unit: Unit): Date =>
  unit === 'year' ? new Date(d.getFullYear() + 1, 0, 1)
    : unit === 'month' ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
      : new Date(d.getFullYear(), d.getMonth(), d.getDate() + (unit === 'week' ? 7 : 1));

export type BarPart = { readonly id: string; readonly ms: number };
export type Bar = {
  readonly start: number;          /* the first instant of its unit */
  readonly total: number;          /* what was really spent, counting every sitting once */
  readonly stacked: number;        /* the parts added up, higher than the total when a sitting carries several categories */
  readonly parts: readonly BarPart[];
};
/* One bar per unit from the first day to the last, both whole. A category is
   a tag rather than a share: a sitting filed under three of them gives its
   whole length to each. One filed under nothing counts under the empty id. */
export const rangeBars = (log: readonly Pomodoro[], from: DayKey, to: DayKey): { readonly unit: Unit; readonly bars: readonly Bar[] } => {
  const unit = unitFor(from, to);
  const lo = dayDate(from).getTime();
  const hi = unitAfter(dayDate(to), 'day').getTime();
  const starts: number[] = [];
  for (let d = unitStart(lo, unit); d.getTime() < hi; d = unitAfter(d, unit)) starts.push(d.getTime());
  const rows = new Map<number, Map<string, number>>(starts.map((s) => [s, new Map<string, number>()]));
  const totals = new Map<number, number>();
  for (const p of log) {
    if (p.start < lo || p.start >= hi) continue;
    const at = unitStart(p.start, unit).getTime();
    const row = rows.get(at);
    if (!row) continue;
    const ran = ranMs(p);
    totals.set(at, (totals.get(at) ?? 0) + ran);
    for (const id of p.categories.length ? p.categories : ['']) row.set(id, (row.get(id) ?? 0) + ran);
  }
  return {
    unit,
    bars: starts.map((start) => {
      const parts = [...(rows.get(start) ?? new Map<string, number>()).entries()].map(([id, ms]) => ({ id, ms }));
      return { start, total: totals.get(start) ?? 0, stacked: parts.reduce((n, q) => n + q.ms, 0), parts };
    }),
  };
};
/* A round step for a time axis whose tallest bar is so long: about four lines. */
export const axisStep = (peak: number): number => {
  const steps = [5, 10, 15, 30, 60, 120, 180, 300, 600, 1200, 1800, 3000, 6000, 12000, 30000].map((m) => m * 60_000);
  return steps.find((s) => peak / s <= 4) ?? steps[steps.length - 1];
};

/* Read back what this browser holds. A single entry that cannot be made sense
   of is dropped and the rest are kept, and an entry that never had an id is
   given a steady one, so that an old log survives its own gaps. A sitting an
   older build wrote down as lost is forgotten here. */
export const parseLog = (raw: unknown): readonly Pomodoro[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.flatMap((row, i): readonly Pomodoro[] => {
    const out = PomodoroSchema.safeParse(row);
    return out.success && out.data.completed ? [{ ...out.data, id: out.data.id ?? `${out.data.start}-${i}` }] : [];
  });
};
export const parseCategories = (raw: unknown): readonly Category[] => {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.flatMap((row): readonly Category[] => {
    const out = CategorySchema.safeParse(row);
    return out.success ? [out.data] : [];
  });
};
