/* The pure parts of controls that change with a story: which sliders stay, enter or leave a row,
   and a slider's range carried from one quantity's to the next. */
import { ease, lerp } from './motion';

export type LayoutPlan<T> = { readonly stay: readonly T[]; readonly enter: readonly T[]; readonly leave: readonly T[] };
export const layoutPlan = <T>(before: readonly T[], after: readonly T[]): LayoutPlan<T> => ({
  stay: after.filter((x) => before.includes(x)),
  enter: after.filter((x) => !before.includes(x)),
  leave: before.filter((x) => !after.includes(x)),
});

export type SliderRange = { readonly min: number; readonly max: number; readonly step: number; readonly value?: number; readonly unit?: string; readonly dec?: number };
/* A frame of the range at k: its ends and the thumb's place along the track ease together; the
   value it reads, its unit and its decimals are the nearer end's, so the text never shows a blend. */
export type RangeFrame = { readonly min: number; readonly max: number; readonly frac: number; readonly near: SliderRange; readonly done: boolean };
const fracOf = (r: SliderRange, v: number): number => (r.max > r.min ? Math.min(1, Math.max(0, (v - r.min) / (r.max - r.min))) : 0);
export const rangeAt = (a: SliderRange, b: SliderRange, va: number, vb: number, k: number): RangeFrame => {
  const e = ease.smooth(Math.min(1, Math.max(0, k)));
  return { min: lerp(a.min, b.min, e), max: lerp(a.max, b.max, e), frac: lerp(fracOf(a, va), fracOf(b, vb), e), near: k < 0.5 ? a : b, done: k <= 0 || k >= 1 };
};
