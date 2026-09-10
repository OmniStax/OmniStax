/* Answer checking without a grader: numbers within 2 percent, choices by index. Pure. */
import type { AnswerDTO } from '../content/schema';
export type Verdict = { readonly ok: boolean; readonly text: string };
export const nearly = (input: number, value: number): boolean => Math.abs(input - value) <= Math.max(Math.abs(value) * 0.02, 0.005);
export const parseNumber = (s: string): number | null => { const v = parseFloat(s.replace(/,/g, '')); return Number.isNaN(v) ? null : v; };
export const checkNumber = (raw: string, value: number, unit: string, hint?: string, terse = false): Verdict => {
  const v = parseNumber(raw);
  if (v === null) return { ok: false, text: 'Enter a number.' };
  if (nearly(v, value)) return { ok: true, text: terse ? 'Correct' : `Correct: ${value} ${unit}` };
  if (nearly(-v, value)) return { ok: false, text: terse ? 'Wrong sign' : 'Right magnitude, wrong sign. Which direction is positive?' };
  return { ok: false, text: hint ?? (terse ? 'Not quite' : 'Not quite. Check units and which quantity the question asks for.') };
};
export const checkChoice = (picked: number | null, correct: number, hint?: string): Verdict =>
  picked === null ? { ok: false, text: 'Pick one.' } : picked === correct ? { ok: true, text: 'Correct.' } : { ok: false, text: hint ?? 'Not that one.' };

/* The line a reader checks their own work against. A book usually writes a solution
   out; where it has not, a numeric answer is its own solution, so compose one from
   the value the answer already carries. An open answer with no solution has nothing
   to compare against, and gets none. */
export const solutionText = (a: AnswerDTO): string | undefined =>
  a.solution ?? (a.type === 'number' ? `${a.value} ${a.unit}`.trim() : a.type === 'multi' ? a.parts.map((p) => `${p.part}: ${p.value} ${p.unit}`.trim()).join(' · ') : undefined);
