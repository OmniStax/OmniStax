/* The size of the app's own text. The book is laid out in rem throughout, so
   one root font size scales the reading column, the rails, the tabs and the
   views together — the browser's page zoom scales the window instead, and with
   it the width the reading column has to work in. The size is a step on a
   ladder rather than a free number, so a press of the zoom key lands somewhere
   the page was designed for. Pure, so the ladder can be walked in a test. */

/* A rung of the ladder, as a multiple of the root size the browser gives us. */
export type ZoomStep = number & { readonly __brand: 'ZoomStep' };

const step = (n: number): ZoomStep => n as ZoomStep;
export const ZOOM_STEPS: readonly ZoomStep[] = [0.75, 0.85, 0.9, 1, 1.1, 1.2, 1.35, 1.5, 1.75, 2].map(step);
export const ZOOM_DEFAULT: ZoomStep = step(1);
/* What one rung means in pixels; the browser's own default, which a reader who
   has set a larger one in their browser keeps, is 16. */
export const ZOOM_BASE_PX = 16;

/* The nearest rung to a number, so a value read back out of this browser — or
   written by an older version of the app — always names a rung. */
export const nearestZoom = (v: number): ZoomStep =>
  ZOOM_STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), ZOOM_DEFAULT);

/* One rung up or down, stopping at either end of the ladder. */
export const zoomBy = (z: ZoomStep, by: 1 | -1): ZoomStep => {
  const at = ZOOM_STEPS.indexOf(nearestZoom(z));
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + by))];
};
/* The root font size a rung asks for, which is what the shell writes onto <html>. */
export const zoomPx = (z: ZoomStep): number => Math.round(ZOOM_BASE_PX * z * 100) / 100;
/* How a rung reads in the settings page: "110%". */
export const zoomLabel = (z: ZoomStep): string => `${Math.round(z * 100)}%`;
