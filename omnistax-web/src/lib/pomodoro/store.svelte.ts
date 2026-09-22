/* The live pomodoro: one session value, changed only through the pure model
   functions, the categories the reader files their sittings under, and the
   history of the ones that have ended, both kept in this browser. The store
   owns the three things the model will not touch — the ticking clock, the
   chime, and the screen-lock watch — and says when the panel should come
   forward, which the panel itself listens for. */
import { type Category, type Instant, type Millis, type Mode, type Pomodoro, type Session, LENGTH, LOCK_GRACE, addCategory, clampLength, clockText, dropped, faceMs, finish, idle, instant, isLive, logged, lose, amended, millis, nextColor, parseCategories, parseLog, pause, recolourCategory, record, removeCategory, renameCategory, resume, setLength, setMode, setSeed, start, stop, tick, unfiled } from './model';
import { armSound, chime } from './sound';
import { type Unwatch, hasPointer, watchAway } from './lock';
import { layoutStore } from '../layout/store.svelte';
import { openSide, where } from '../layout/model';
import { readerWritesAllowed } from '../backup/guard';

const KEYS = { log: 'omnistax-pomodoros', len: 'omnistax-pomodoro-len', lock: 'omnistax-pomodoro-lock', cats: 'omnistax-pomodoro-categories' } as const;
export const POMODORO_KEY = 'view:pomodoro';
/* How often the clock is read: four times a second, so the seconds never
   visibly stick, and nothing is computed between the reads. */
const TICK_MS = 250;

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const readJson = (key: string): unknown => { try { return JSON.parse(read(key) ?? 'null'); } catch { return null; } };
const now = (): Instant => instant(Date.now());
/* A fresh id, for a category the reader has just named and for a sitting as it is written down. */
const freshId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

class PomodoroStore {
  session = $state.raw<Session>(idle());
  log = $state.raw<readonly Pomodoro[]>([]);
  categories = $state.raw<readonly Category[]>([]);
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
    this.log = parseLog(readJson(KEYS.log));
    this.categories = parseCategories(readJson(KEYS.cats));
    const len = read(KEYS.len);
    this.session = idle(len === null ? LENGTH.default : clampLength(Number(len)));
    this.screenLock = read(KEYS.lock) === '1' && hasPointer();
    this.left = faceMs(this.session, now());
  }

  get phase(): Session['phase'] { return this.session.phase; }
  get mode(): Mode { return this.session.mode; }
  get clock(): string { return clockText(this.left); }
  get lockable(): boolean { return hasPointer(); }
  /* What the rail writes under its icon: the clock while a session is under
     way, and nothing at all otherwise. */
  get railText(): string { return isLive(this.session) ? this.clock : ''; }

  private face(): void { this.left = faceMs(this.session, now()); }

  setMode(mode: Mode): void { this.session = setMode(this.session, mode); this.face(); }
  setSeed(ms: number): void { this.session = setSeed(this.session, ms); this.face(); }
  setLength(mins: number): void {
    this.session = setLength(this.session, mins);
    this.face();
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
    this.face();
    this.run();
  }
  pause(): void { this.session = pause(this.session, now()); this.run(); }
  resume(): void { this.session = resume(this.session, now()); this.run(); }
  /* Give up on the session: nothing is written down, since nothing finished. */
  stop(): void { this.session = stop(this.session); this.face(); this.run(); }
  /* A stopwatch is ended by the reader, and the ending is an ending like any
     other: the summary is asked for and the sitting is written down. */
  finish(): void { this.end(finish(this.session, now())); }

  /* Write the ended session into the history under the reader's summary and the
     categories they filed it under, and stand ready for the next one. */
  keep(summary: string, categories: readonly string[] = []): void {
    const p = record(this.session, now(), summary, categories, freshId());
    if (p) this.writeLog(logged(this.log, p));
    this.session = idle(this.session.minutes, this.session.mode);
    this.face();
  }
  /* Let an ended session go unrecorded. */
  discard(): void { this.session = idle(this.session.minutes, this.session.mode); this.face(); }
  clearLog(): void { this.writeLog([]); }

  private writeLog(log: readonly Pomodoro[]): void { this.log = log; write(KEYS.log, JSON.stringify(log)); }
  private writeCats(cats: readonly Category[]): void { this.categories = cats; write(KEYS.cats, JSON.stringify(cats)); }

  /* The stats view edits the history: a sitting is moved in time, resaid or
     refiled, or struck out altogether. */
  amend(p: Pomodoro): void { this.writeLog(amended(this.log, p)); }
  remove(id: string): void { this.writeLog(dropped(this.log, id)); }

  /* Categories. A new one is named by the reader and takes the first hue no
     other has; deleting one leaves the sittings it was on standing. */
  addCategory(name: string, color?: string): string | null {
    const id = freshId();
    const next = addCategory(this.categories, name, color ?? nextColor(this.categories), id);
    if (next === this.categories) return null;
    this.writeCats(next);
    return id;
  }
  renameCategory(id: string, name: string): void { this.writeCats(renameCategory(this.categories, id, name)); }
  recolourCategory(id: string, color: string): void { this.writeCats(recolourCategory(this.categories, id, color)); }
  removeCategory(id: string): void {
    this.writeCats(removeCategory(this.categories, id));
    this.writeLog(unfiled(this.log, id));
  }

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
    this.unwatch ??= watchAway(() => this.end(lose(this.session, now())), LOCK_GRACE);
  }
  private beat(): void {
    const at = now();
    const next = tick(this.session, at);
    if (next !== this.session) { this.end(next); return; }
    this.left = faceMs(next, at);
  }
  /* Every end of a session passes through here: the clock stops, the chime
     rings for the one that got there, and the panel is asked to come forward. */
  private end(next: Session): void {
    if (next === this.session) return;
    this.session = next;
    this.face();
    this.run();
    if (next.phase === 'done') chime();
    if (!where(layoutStore.layout, POMODORO_KEY)) layoutStore.apply((l) => openSide(l, POMODORO_KEY, 'left'));
    /* On a narrow screen the sidebar lies over the text, so it has to be asked for. */
    if (window.innerWidth < 900) layoutStore.overlay = 'left';
    this.ended += 1;
  }
}

export const pomodoro = new PomodoroStore();
