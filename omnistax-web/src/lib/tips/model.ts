/* One tip a day for a reader who has been here before: the first visit is
   stamped, a day later tips begin, and they are taken in turn so that none
   comes round again until every other has had its day. Pure. */
import { z } from 'zod';

export type Millis = number;
/* A calendar day in the reader's own time zone, as YYYY-MM-DD. */
export type DayKey = string;
export type TipAction = 'new-drawing' | 'colours' | 'import';
export type Tip = { readonly text: string; readonly action?: { readonly kind: TipAction; readonly label: string } };

export const TipStateSchema = z.object({ first: z.number(), day: z.string().nullable(), next: z.number().int().nonnegative() });
export type TipState = z.infer<typeof TipStateSchema>;

export const RETURNING_AFTER: Millis = 24 * 60 * 60 * 1000;

export const TIPS: readonly Tip[] = [
  { text: 'Work notes and exercises by hand in the drawing view, with a tablet and pen.', action: { kind: 'new-drawing', label: 'New drawing' } },
  { text: 'Change the color of any quantity, for the whole book or one chapter or section.', action: { kind: 'colours', label: 'Open the color menu' } },
  { text: 'Drag a concept, formula, definition, figure or sim straight into a note.' },
  { text: 'Import your own PDFs, annotate them, and link their highlights into your notes.', action: { kind: 'import', label: 'Import files' } },
  { text: 'Ctrl-click or double-click a section, note or drawing to open it in a new tab.' },
  { text: 'Ctrl+Alt-click a section, view or link to open it in a new group beside this one.' },
  { text: 'Click a formula, definition or concept in its list to open it in a new tab; Ctrl-click to open it in a new group beside.' },
];

/* The tip a step forward or back from this one, wrapping at either end. */
export const stepTip = (at: number, delta: 1 | -1, count: number = TIPS.length): number => (at + delta + count) % count;

export const dayOf = (at: Millis): DayKey => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type Visit = { readonly state: TipState; readonly tip: number | null };

/* What a page load makes of the stored state: a first visit is stamped and
   shows nothing; a returning reader's first load of a day takes the next tip. */
export const visit = (stored: TipState | null, now: Millis, enabled: boolean, count: number = TIPS.length): Visit => {
  if (!stored) return { state: { first: now, day: null, next: 0 }, tip: null };
  const today = dayOf(now);
  if (!enabled || count === 0 || stored.day === today || now - stored.first < RETURNING_AFTER) return { state: stored, tip: null };
  const tip = stored.next % count;
  return { state: { ...stored, day: today, next: (tip + 1) % count }, tip };
};
