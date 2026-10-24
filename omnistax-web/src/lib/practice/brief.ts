/* What a chat is told about an exercise when it is handed one: the prompt, the
   concepts it tests and its level, the reference solution, and every attempt
   the reader has made at it, so a model asked about it knows the whole story. */
import type { ExerciseDTO } from '../content/schema';
import { solutionText } from '../exercises/check';
import { practice } from './store.svelte';
import { plain } from './labels';
import type { ExerciseRef } from './model';

const when = (at: number): string => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const exerciseBrief = (ref: ExerciseRef, ex: ExerciseDTO, extra: readonly string[] = []): string => {
  const concepts = ex.concepts.map((id) => { const c = practice.conceptOf(id, ref.book); return c ? plain(c.name) : id; });
  const sol = solutionText(ex.answer);
  const tries = practice.attempts.filter((a) => a.book === ref.book && a.section === ref.section && a.ex === ref.ex).sort((a, b) => a.at - b.at);
  const history = tries.length ? tries.map((a) => `- ${when(a.at)}: ${a.ok ? 'correct' : 'incorrect'}`).join('\n') : '- none yet';
  return [
    ex.prompt,
    concepts.length ? `Concepts tested: ${concepts.join(', ')}. Level: ${ex.bloom}.` : `Level: ${ex.bloom}.`,
    sol ? `Reference solution:\n${sol}` : 'No reference solution.',
    `The reader's attempts:\n${history}`,
    ...extra,
  ].join('\n\n');
};
