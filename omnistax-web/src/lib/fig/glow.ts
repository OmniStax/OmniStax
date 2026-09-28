/* The glow under a value the reader is changing. A value shows its new reading at once; a faint
   bar beneath it, in its own colour, says it is moving, and fades soon after it stops. Only a
   change the reader's hand made glows: one that comes with no input since the last look is a
   clock's, and that value stays unlit while it keeps changing. The formula host and the canvas
   text both keep a Trace per value and ask `glowOf` how bright to draw it. */

export const INPUT_MS = 300, HOLD_MS = 150, FADE_MS = 600, CLOCK_MS = 1000, PEAK = 0.3;

/* ---------- the reader's hand ----------
   `seq` counts the inputs; `last` is when the latest was and `target` where. */
type Hand = { seq: number; last: number; target: EventTarget | null };
const hand: Hand = { seq: 0, last: -Infinity, target: null };
if (typeof addEventListener === 'function') {
  const mark = (e: Event): void => {
    if (e.type === 'pointermove' && !(e as PointerEvent).buttons) return;
    hand.seq++; hand.last = performance.now(); hand.target = e.target;
  };
  ['input', 'change', 'keydown', 'pointerdown', 'pointermove'].forEach((t) => addEventListener(t, mark, { capture: true, passive: true }));
}
export const inputSeq = (): number => hand.seq;
/* within the input window, and inside `within` when one is given */
export const byHand = (now: number, within?: Node): boolean =>
  now - hand.last < INPUT_MS && (!within || !(hand.target instanceof Node) || within.contains(hand.target));

/* ---------- numbers in a string ---------- */
const NUM = /[-−]?\d+(?:[.,]\d+)*(?:[eE][-+−]?\d+)?/g;
export type Token = { readonly s: string; readonly i: number; readonly j: number };
export const tokensOf = (s: string): Token[] => Array.from(s.matchAll(NUM), (m) => ({ s: m[0], i: m.index!, j: m.index! + m[0].length }));
/* the string with every number replaced by one placeholder: what stays the same while values move */
export const skeletonOf = (s: string): string => s.replace(NUM, '\u0000');

/* ---------- a value's trace ----------
   `vals` the readings last seen, `seq` the input count then, `lit` when each reading last
   changed by hand, `clocked` when one last changed with no input between. */
export type Trace = { readonly vals: readonly string[]; readonly seq: number; readonly lit: readonly number[]; readonly clocked: number };
export const changed = (a: readonly string[], b: readonly string[]): number[] =>
  b.flatMap((v, i) => (a[i] !== v ? [i] : []));
export function step(prev: Trace | undefined, vals: readonly string[], seq: number, now: number, byHandNow: boolean): Trace {
  if (!prev || prev.vals.length !== vals.length) return { vals, seq, lit: vals.map(() => -Infinity), clocked: -Infinity };
  const moved = changed(prev.vals, vals);
  if (!moved.length) return { ...prev, seq };
  const clock = seq === prev.seq || now - prev.clocked < CLOCK_MS;
  if (clock) return { vals, seq, lit: prev.lit, clocked: now };
  const lit = byHandNow ? prev.lit.map((t, i) => (moved.includes(i) ? now : t)) : prev.lit;
  return { vals, seq, lit, clocked: prev.clocked };
}
/* the glow's opacity at `now` for a reading last lit at `t`: held at its peak a moment, then faded */
export function glowOf(t: number, now: number, reduced = false): number {
  const age = now - t;
  if (!(age >= 0) || age >= HOLD_MS + FADE_MS) return 0;
  if (reduced || age <= HOLD_MS) return PEAK;
  const k = 1 - (age - HOLD_MS) / FADE_MS;
  return PEAK * k * k;
}
export const lit = (tr: Trace, now: number, reduced = false): boolean => tr.lit.some((t) => glowOf(t, now, reduced) > 0);
