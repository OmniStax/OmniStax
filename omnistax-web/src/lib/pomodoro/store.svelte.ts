/* The live pomodoro: one session value, changed only through the pure model
   functions, and the history of the ones that have ended, kept in this browser.
   The store owns the three things the model will not touch — the ticking clock,
   the chime, and the screen-lock watch — and says when the panel should come
   forward, which the panel itself listens for. */
import { type Instant, type Millis, type Pomodoro, type Session, LENGTH, LOCK_GRACE, clampLength, clockText, idle, instant, isLive, logged, lose, millis, parseLog, pause, record, remaining, resume, setLength, start, stop, tick } from './model';
import { armSound, chime } from './sound';
import { type Unwatch, hasPointer, watchAway } from './lock';
import { layoutStore } from '../layout/store.svelte';
import { openSide, where } from '../layout/model';
import { readerWritesAllowed } from '../backup/guard';

const KEYS = { log: 'omnistax-pomodoros', len: 'omnistax-pomodoro-len', lock: 'omnistax-pomodoro-lock' } as const;
export const POMODORO_KEY = 'view:pomodoro';
/* How often the clock is read: four times a second, so the seconds never
   visibly stick, and nothing is computed between the reads. */
const TICK_MS = 250;

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const readLog = (): readonly Pomodoro[] => { try { return parseLog(JSON.parse(read(KEYS.log) ?? 'null')); } catch { return []; } };
const now = (): Instant => instant(Date.now());

class PomodoroStore {
  session = $state.raw<Session>(idle());
  log = $state.raw<readonly Pomodoro[]>([]);
  /* What the clock reads, refreshed by the tick rather than by every consumer. */
  left = $state<Millis>(millis(0));
  screenLock = $state(false);
  /* Bumped when a session ends: the panel watches it to scroll itself into view
     and put the cursor in the summary box. */
  ended = $state(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private unwatch: Unwatch | null = null;
  private loaded = false;

  /* Read back what this browser remembers. Called from the shell once it is up;
     calling it twice does nothing. */
  init(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.log = readLog();
    const len = read(KEYS.len);
    this.session = idle(len === null ? LENGTH.default : clampLength(Number(len)));
    this.screenLock = read(KEYS.lock) === '1' && hasPointer();
    this.left = remaining(this.session, now());
  }

  get phase(): Session['phase'] { return this.session.phase; }
  get clock(): string { return clockText(this.left); }
  get lockable(): boolean { return hasPointer(); }
  /* What the rail writes under its icon: the time left while a session is under
     way, and nothing at all otherwise. */
  get railText(): string { return isLive(this.session) ? this.clock : ''; }

  setLength(mins: number): void {
    this.session = setLength(this.session, mins);
    this.left = remaining(this.session, now());
    write(KEYS.len, String(this.session.minutes));
  }
  setScreenLock(on: boolean): void {
    this.screenLock = on && hasPointer();
    write(KEYS.lock, this.screenLock ? '1' : '0');
    if (this.session.phase === 'running') this.watch();
  }

  /* Start is the reader's gesture, so it is also where the sound is armed. */
  start(): void {
    armSound();
    this.session = start(this.session, now());
    this.left = remaining(this.session, now());
    this.run();
  }
  pause(): void { this.session = pause(this.session, now()); this.run(); }
  resume(): void { this.session = resume(this.session, now()); this.run(); }
  /* Give up on the session: nothing is written down, since nothing finished. */
  stop(): void { this.session = stop(this.session); this.left = remaining(this.session, now()); this.run(); }

  /* Write the ended session into the history under the reader's summary, and
     stand ready for the next one. */
  keep(summary: string): void {
    const p = record(this.session, now(), summary);
    if (p) { this.log = logged(this.log, p); write(KEYS.log, JSON.stringify(this.log)); }
    this.session = idle(this.session.minutes);
    this.left = remaining(this.session, now());
  }
  /* Let an ended session go unrecorded. */
  discard(): void { this.session = idle(this.session.minutes); this.left = remaining(this.session, now()); }
  clearLog(): void { this.log = []; write(KEYS.log, '[]'); }

  /* The clock and the watch follow the phase: both run while a session runs,
     the clock alone while it is paused, and neither otherwise. */
  private run(): void {
    this.watch();
    const wanted = this.session.phase === 'running';
    if (wanted && this.timer === null) this.timer = setInterval(() => this.beat(), TICK_MS);
    if (!wanted && this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }
  private watch(): void {
    const wanted = this.session.phase === 'running' && this.screenLock;
    if (!wanted) { this.unwatch?.(); this.unwatch = null; return; }
    this.unwatch ??= watchAway(() => this.finish(lose(this.session, now())), LOCK_GRACE);
  }
  private beat(): void {
    const at = now();
    const next = tick(this.session, at);
    if (next !== this.session) { this.finish(next); return; }
    this.left = remaining(next, at);
  }
  /* Both ends of a session pass through here: the clock stops, the chime rings
     for the one that got there, and the panel is asked to come forward. */
  private finish(next: Session): void {
    this.session = next;
    this.left = remaining(next, now());
    this.run();
    if (next.phase === 'done') chime();
    if (!where(layoutStore.layout, POMODORO_KEY)) layoutStore.apply((l) => openSide(l, POMODORO_KEY, 'left'));
    /* On a narrow screen the sidebar lies over the text, so it has to be asked for. */
    if (window.innerWidth < 900) layoutStore.overlay = 'left';
    this.ended += 1;
  }
}

export const pomodoro = new PomodoroStore();
