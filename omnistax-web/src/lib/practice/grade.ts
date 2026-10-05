/* AI grading of one answer: the exercise, its reference and the reader's
   words and drawing go out; a verdict and a few sentences come back. Pure but
   for the stream, which comes in as a port. */
import type { AnswerDTO } from '../content/schema';
import type { Access, ImagePart, ModelPick, Provider } from '../chat/providers/index';
import { fencedJson } from './generated';
import { GRADE, gradeAsk } from './prompt';
import { requestFor } from './generate';

export type GradeVerdict = 'right' | 'partial' | 'wrong';
export type Graded = { readonly verdict: GradeVerdict; readonly feedback: string };

const VERDICTS: readonly GradeVerdict[] = ['right', 'partial', 'wrong'];

/* The verdict a reply carries, or why it carries none. A bare object without a fence is read too. */
export const parseGrade = (text: string): Graded | { readonly error: string } => {
  const body = fencedJson(text) ?? (/^\s*\{[\s\S]*\}\s*$/.test(text) ? text.trim() : null);
  if (body === null) return { error: 'The grader wrote no json block.' };
  try {
    const o: unknown = JSON.parse(body);
    const r = (typeof o === 'object' && o !== null ? o : {}) as Record<string, unknown>;
    const said = typeof r.verdict === 'string' ? r.verdict.trim().toLowerCase() : '';
    const verdict = VERDICTS.find((v) => v === said);
    if (!verdict) return { error: 'The grader gave no verdict of right, partial or wrong.' };
    return { verdict, feedback: typeof r.feedback === 'string' ? r.feedback.trim() : '' };
  } catch { return { error: 'The grader’s json does not parse.' }; }
};

export type GradeAsk = { readonly prompt: string; readonly answer: AnswerDTO; readonly text: string; readonly image: ImagePart | null };

export const grade = async (provider: Provider, ask: GradeAsk, pick: ModelPick, access: Access, signal: AbortSignal): Promise<Graded> => {
  const request = requestFor(GRADE, [{ role: 'user', text: gradeAsk(ask.prompt, ask.answer, ask.text, !!ask.image), images: ask.image ? [ask.image] : [] }], pick, access, []);
  let text = '';
  for await (const event of provider.stream(request, signal)) if (event.kind === 'text') text += event.text;
  const parsed = parseGrade(text);
  if ('error' in parsed) throw new Error(parsed.error);
  return parsed;
};
