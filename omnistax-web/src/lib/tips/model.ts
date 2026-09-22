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
  { text: 'The drawing view takes a tablet and pen, for notes and exercises worked by hand.', action: { kind: 'new-drawing', label: 'New drawing' } },
  { text: 'The colors each quantity wears can be changed, for the whole book or one chapter or section.', action: { kind: 'colours', label: 'Open the color menu' } },
  { text: 'A concept, formula or definition, and even a figure or sim, can be dragged straight into a note.' },
  { text: 'Your own PDFs can be imported and annotated, and their highlights linked into your notes.', action: { kind: 'import', label: 'Import files' } },
];

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
