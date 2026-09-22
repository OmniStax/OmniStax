/* The chime a finished pomodoro rings: three notes of a rising triad, drawn by
   WebAudio rather than fetched, so the app carries no audio file. A browser
   will not make a sound until the reader has done something on the page, so the
   context is only ever built from a gesture — pressing Start is that gesture —
   and a ring before then simply does nothing. */

type Ctx = AudioContext | null;
let ctx: Ctx = null;

const Ctor = (): typeof AudioContext | null =>
  typeof window === 'undefined' ? null : window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;

/* Called from the reader's own gesture: builds the context the chime will use
   later, or wakes one the browser has suspended. */
export const armSound = (): void => {
  const C = Ctor();
  if (!C) return;
  try {
    ctx ??= new C();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
};

/* One note: a sine with a soft attack and a long decay, so the three together
   read as a chime rather than three beeps. */
const note = (at: number, freq: number, seconds: number): void => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.05);
};

export const chime = (): void => {
  if (!ctx || ctx.state === 'closed') return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime;
  [880, 1108.73, 1318.51].forEach((f, i) => note(t + i * 0.16, f, 0.9 - i * 0.15));
};
