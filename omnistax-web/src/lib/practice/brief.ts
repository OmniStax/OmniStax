/* What a chat is told about an exercise when it is handed one: the prompt, the
   concepts it tests and its level, the reference solution, and every attempt
   the reader has made at it, so a model asked about it knows the whole story. */
import type { ExerciseDTO } from '../content/schema';
import { solutionText } from '../exercises/check';
import { GROWTH_TEXT, inputText, shown, visibleTests } from '../code/check';
import { practice } from './store.svelte';
import { plain } from './labels';
import type { ExerciseRef } from './model';

const when = (at: number): string => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const exerciseBrief = (ref: ExerciseRef, ex: ExerciseDTO, extra: readonly string[] = []): string => {
  const concepts = ex.concepts.map((id) => { const c = practice.conceptOf(id, ref.book); return c ? plain(c.name) : id; });
  const sol = solutionText(ex.answer);
  const tries = practice.attempts.filter((a) => a.book === ref.book && a.section === ref.section && a.ex === ref.ex).sort((a, b) => a.at - b.at);
  const history = tries.length ? tries.map((a) => `- ${when(a.at)}: ${a.ok ? 'correct' : 'incorrect'}`).join('\n') : '- none yet';
  /* a choice is nothing without its options, and the right one is its answer */
  const a = ex.answer;
  const options = a.type === 'choice' ? a.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}${i === a.correct ? ' (the right answer)' : ''}`).join('\n') : '';
  /* a code card is its tests: the visible ones as the reader sees them, and how many more it hides */
  const entry = a.type === 'code' ? (a.python ?? a.javascript)?.entry : undefined;
  const tests = a.type === 'code'
    ? [...visibleTests(a).map((x) => `- ${x.stdin !== undefined ? `stdin ${JSON.stringify(x.stdin)}` : inputText(x, entry)} → ${x.stdin !== undefined ? `stdout ${JSON.stringify(x.stdout)}` : x.raises ? `raises ${x.raises}` : shown(x.expect)}`),
      `- and ${a.tests.length - visibleTests(a).length} hidden tests${a.bound ? `, in at most ~${GROWTH_TEXT[a.bound]} steps` : ''}`].join('\n')
    : '';
  return [
    ex.prompt,
    ...(options ? [`Options:\n${options}`] : []),
    ...(tests ? [`Tests:\n${tests}`] : []),
    concepts.length ? `Concepts tested: ${concepts.join(', ')}. Level: ${ex.bloom}.` : `Level: ${ex.bloom}.`,
    sol ? `Reference solution:\n${sol}` : 'No reference solution.',
    `The reader's attempts:\n${history}`,
    ...extra,
  ].join('\n\n');
};
