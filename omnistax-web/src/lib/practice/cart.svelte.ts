/* The exercise session being gathered: places, concepts and exercises the
   reader added from cards, menus and commands, kept in this browser until the
   dashboard makes a session of them. The rail shows how many exercises they
   come to, counted off the main thread's way once the stores settle, so the
   adding itself is instant; and a few dots fly from where the reader clicked
   to the rail's exercises button, so the adding is seen. */
import { readerWritesAllowed } from '../backup/guard';
import { practice } from './store.svelte';
import { books } from './books.svelte';
import { prepare, togglePick, type Curriculum, type Pick } from './model';

const KEY = 'omnistax-practice-cart-v1';
const read = (): Curriculum => { try { const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(raw) ? raw : []; } catch { return []; } };

let pointer = { x: 0, y: 0 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, true);

/* A handful of dots that leave a point and land on the rail's button. */
const fly = (from: { readonly x: number; readonly y: number }): void => {
  if (typeof document === 'undefined') return;
  const to = document.getElementById('rail-exercises')?.getBoundingClientRect(); if (!to) return;
  const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
  for (let i = 0; i < 5; i++) {
    const dot = document.createElement('span');
    dot.className = 'cart-dot';
    dot.style.left = `${from.x}px`; dot.style.top = `${from.y}px`;
    document.body.appendChild(dot);
    const dx = tx - from.x, dy = ty - from.y, spread = (i - 2) * 22;
    const a = dot.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.5 + spread}px), calc(-50% + ${dy * 0.5 - 40}px)) scale(0.9)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0.2, offset: 1 },
    ], { duration: 520 + i * 60, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    a.onfinish = () => dot.remove();
  }
  document.getElementById('rail-exercises')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 360, delay: 520 });
};

class Cart {
  picks = $state.raw<Curriculum>(typeof localStorage === 'undefined' ? [] : read());
  /* How many exercises the picks come to, recounted after the stores settle. */
  count = $state(0);
  /* A count is running, or the picks changed while one ran. */
  private counting = false;
  private again = false;

  constructor() { this.recount(); }

  add(picks: readonly Pick[], from?: { readonly x: number; readonly y: number }): void {
    let next = this.picks;
    picks.forEach((p) => { if (!next.some((q) => JSON.stringify(q) === JSON.stringify(p))) next = togglePick(next, p); });
    this.put(next);
    fly(from ?? pointer);
  }
  /* The builder's picks, as they stand: the cart is the session being built, so
     adding and removing there moves the rail's count too, with no dots. */
  set(picks: readonly Pick[]): void { if (JSON.stringify(picks) !== JSON.stringify(this.picks)) this.put([...picks]); }
  remove(pick: Pick): void { this.put(this.picks.filter((q) => JSON.stringify(q) !== JSON.stringify(pick))); }
  /* The picks handed over to a session, and the cart emptied. */
  take(): Curriculum { const out = this.picks; this.put([]); return out; }
  clear(): void { this.put([]); }

  private put(next: Curriculum): void {
    this.picks = next;
    if (readerWritesAllowed()) { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ } }
    this.recount();
  }
  /* The count waits for the books the picks name, then runs once the thread is free. */
  recount(): void {
    if (typeof window === 'undefined') return;
    if (this.counting) { this.again = true; return; }
    this.counting = true;
    const run = async (): Promise<void> => {
      try {
        const needed = [...new Set(this.picks.flatMap((p) => ('book' in p ? [p.book] : [])))];
        await Promise.all(needed.map((b) => ((books.status[b] ?? 'idle') === 'idle' ? books.load(b).catch(() => {}) : Promise.resolve())));
        await new Promise<void>((r) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => r(), { timeout: 800 }) : setTimeout(r, 0)));
        const plan = prepare(this.picks, practice.mastery, practice.catalog(), practice.attempts, practice.shown, practice.settings, Date.now());
        this.count = plan.drawn.length + Object.values(plan.quotas).reduce((n, q) => n + q.gap, 0);
      } catch { /* a book that would not load counts nothing */ }
      finally { this.counting = false; if (this.again) { this.again = false; this.recount(); } }
    };
    void run();
  }
}
export const cart = new Cart();
