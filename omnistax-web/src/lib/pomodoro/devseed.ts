/* Fake history for working on the stats: on this machine only, ?seed=pomodoro
   writes about three months of sittings under a handful of made-up categories,
   and ?seed=clear takes back exactly those and nothing the reader recorded.
   Everything it writes carries the FAKE prefix on its id, which is the tag. */
import { type Category, type Pomodoro, CATEGORY_COLORS } from './model';

type Rewrite = (log: (l: readonly Pomodoro[]) => readonly Pomodoro[], cats: (c: readonly Category[]) => readonly Category[]) => void;

const FAKE = 'fake-';
const isFake = (x: { readonly id?: string }): boolean => (x.id ?? '').startsWith(FAKE);
const NAMES = ['Mechanics', 'Chemistry', 'Calculus', 'Essay', 'Reading'];
const SUMMARIES = ['problem set', 'read the section', 'worked examples', 'review', 'notes', ''];
const DAY = 86_400_000;
const MIN = 60_000;

/* A seeded generator, so two runs write the same history. */
const rng = (seed: number): (() => number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
  return seed / 2_147_483_648;
};

const fakeCategories = (): readonly Category[] =>
  NAMES.map((name, i) => ({ id: `${FAKE}c${i}`, name, color: CATEGORY_COLORS[(i * 3) % CATEGORY_COLORS.length] }));

const fakeLog = (now: number): readonly Pomodoro[] => {
  const r = rng(7);
  const out: Pomodoro[] = [];
  for (let back = 92; back >= 0; back--) {
    const day = new Date(now - back * DAY);
    const count = r() < 0.2 ? 0 : 1 + Math.floor(r() * 4);
    let at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8 + Math.floor(r() * 3)).getTime();
    for (let k = 0; k < count; k++) {
      const stopwatch = r() < 0.3;
      const mins = stopwatch ? 10 + Math.floor(r() * 80) : [25, 25, 45, 50][Math.floor(r() * 4)];
      const roll = r();
      const cats = roll < 0.15 ? [] : roll < 0.35
        ? [`${FAKE}c${Math.floor(r() * 5)}`, `${FAKE}c${Math.floor(r() * 5)}`].filter((c, i, a) => a.indexOf(c) === i)
        : [`${FAKE}c${Math.floor(r() * 5)}`];
      const end = at + mins * MIN;
      if (end > now) break;
      out.push({ id: `${FAKE}${at}`, start: at, end, minutes: mins, summary: SUMMARIES[Math.floor(r() * SUMMARIES.length)], completed: true, mode: stopwatch ? 'stopwatch' : 'pomodoro', categories: cats });
      at = end + (10 + Math.floor(r() * 90)) * MIN;
    }
  }
  return out.reverse();
};

/* The query is read by the store before the shell rewrites the address. */
export const runSeed = (what: string, rewrite: Rewrite): void => {
  if (what !== 'pomodoro' && what !== 'clear') return;
  const url = new URL(location.href);
  const clear = (l: readonly Pomodoro[]): readonly Pomodoro[] => l.filter((p) => !isFake(p));
  const clearCats = (c: readonly Category[]): readonly Category[] => c.filter((k) => !isFake(k));
  if (what === 'clear') rewrite(clear, clearCats);
  else rewrite(
    (l) => [...clear(l), ...fakeLog(Date.now())].sort((a, b) => b.start - a.start),
    (c) => [...clearCats(c), ...fakeCategories()],
  );
  url.searchParams.delete('seed');
  history.replaceState(history.state, '', url.toString());
};
