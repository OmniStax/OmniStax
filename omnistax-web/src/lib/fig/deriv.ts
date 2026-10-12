/* Calculus Chapter 3, with no canvas: the stretch of x a derivative tracer has covered, and the
   slopes of the two secants from (a, f(a)) to the points h to its left and right. figlib draws them. */
export type Span = readonly [number, number];

/* the span widened to take in x; none yet is the point x */
export const widen = (s: Span | null, x: number): Span => (s ? [Math.min(s[0], x), Math.max(s[1], x)] : [x, x]);

/* the slopes of the secants from (a, f(a)) through (a − h, f(a − h)) and (a + h, f(a + h)) */
export function sides(f: (x: number) => number, a: number, h: number): { left: number; right: number } {
  const fa = f(a);
  return { left: (fa - f(a - h)) / h, right: (f(a + h) - fa) / h };
}
