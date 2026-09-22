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

export type Session = {
  readonly phase: Phase;
  readonly minutes: Minutes;              /* how long this session was asked to run */
  readonly startedAt: Instant | null;     /* when the reader first started it */
  readonly spent: Millis;                 /* time counted before the last resume */
  readonly since: Instant | null;         /* when the current run began; only while running */
};

export const LENGTH = { min: minutes(1), max: minutes(120), default: minutes(25) } as const;
/* How long the mouse may be away from the window before screen lock gives up on the session. */
export const LOCK_GRACE = millis(10_000);

export const clampLength = (n: number): Minutes =>
  minutes(Math.max(LENGTH.min, Math.min(LENGTH.max, Math.round(Number.isFinite(n) ? n : LENGTH.default))));

export const idle = (len: Minutes = LENGTH.default): Session =>
  ({ phase: 'idle', minutes: clampLength(len), startedAt: null, spent: millis(0), since: null });

const lengthMs = (s: Session): Millis => millis(s.minutes * 60_000);
/* How much of the session has been counted at this instant: what was banked
   before the last resume, plus the stretch since it, while it is running. */
export const spentAt = (s: Session, now: Instant): Millis =>
  millis(s.spent + (s.phase === 'running' && s.since !== null ? Math.max(0, now - s.since) : 0));
export const remaining = (s: Session, now: Instant): Millis =>
  millis(Math.max(0, lengthMs(s) - spentAt(s, now)));
export const isOver = (s: Session): boolean => s.phase === 'done' || s.phase === 'lost';
export const isLive = (s: Session): boolean => s.phase === 'running' || s.phase === 'paused';

/* mm:ss, rounded up, so a clock reading 1:00 still has a whole second to run
   and only reads 0:00 when the session is actually over. */
export const clockText = (ms: Millis): string => {
  const secs = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
};

/* Start a session: from idle it begins, and from either end it begins again at
   the same length. A running or paused session is left alone, since starting
   one that is already under way would throw its time away. */
export const start = (s: Session, now: Instant): Session =>
  isLive(s) ? s : { phase: 'running', minutes: s.minutes, startedAt: now, spent: millis(0), since: now };

export const pause = (s: Session, now: Instant): Session =>
  s.phase !== 'running' ? s : { ...s, phase: 'paused', spent: spentAt(s, now), since: null };

export const resume = (s: Session, now: Instant): Session =>
  s.phase !== 'paused' ? s : { ...s, phase: 'running', since: now };

/* Give up on the session and go back to idle, keeping the length for the next one. */
export const stop = (s: Session): Session => idle(s.minutes);

/* Screen lock caught the reader away from the window: the session is lost, with
   whatever it had counted kept, so the history can say how far it got. */
export const lose = (s: Session, now: Instant): Session =>
  !isLive(s) ? s : { ...s, phase: 'lost', spent: spentAt(s, now), since: null };

/* The clock moving on. The only thing a tick can change is a running session
   reaching its end; everything else reads the same at any instant. */
export const tick = (s: Session, now: Instant): Session =>
  s.phase === 'running' && remaining(s, now) <= 0 ? { ...s, phase: 'done', spent: lengthMs(s), since: null } : s;

/* The length is the reader's to choose between sessions, never during one. */
export const setLength = (s: Session, len: number): Session =>
  isLive(s) ? s : { ...s, minutes: clampLength(len) };

/* Persistence boundary: the history of finished sessions, as it is written to
   this browser and read back from it. */
export const PomodoroSchema = z.object({
  start: z.number().finite(),
  end: z.number().finite(),
  minutes: z.number().finite(),
  summary: z.string(),
  completed: z.boolean(),
});
export const PomodoroLogSchema = z.array(PomodoroSchema);
export type Pomodoro = z.infer<typeof PomodoroSchema>;

/* How many finished sessions are kept. */
export const LOG_CAP = 200;
export const logged = (log: readonly Pomodoro[], p: Pomodoro, cap = LOG_CAP): readonly Pomodoro[] => {
  const next = [p, ...log];
  return next.length > cap ? next.slice(0, cap) : next;
};

/* A session that has ended, written down: how long it was asked for, when it
   ran, and whether it reached its end or was lost. The summary is added after. */
export const record = (s: Session, now: Instant, summary = ''): Pomodoro | null =>
  !isOver(s) || s.startedAt === null ? null
    : { start: s.startedAt, end: now, minutes: s.minutes, summary: summary.trim(), completed: s.phase === 'done' };

export const parseLog = (raw: unknown): readonly Pomodoro[] => {
  const out = PomodoroLogSchema.safeParse(raw);
  return out.success ? out.data : [];
};
