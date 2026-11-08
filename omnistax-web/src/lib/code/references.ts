/* The build's check of a code answer by running it: every reference passes
   every test, and where the answer names a bound, the reference's steps grow
   in exactly that class. A reference that grows slower is a warning, since the
   bound is then looser than the exercise needs; one that grows faster, or
   fails a test, is an error, since a reader could never pass. The runner and
   the grow evaluator are handed in, so the tests can call this on a fixture. */
import { CODE_LANGS, type CodeAnswerDTO, type SectionDTO } from '../content/schema';
import type { Finding } from '../content/check';
import { GROWTH_TEXT, errorText, firstFailure, runTestOf, whyText, worse } from './check';
import type { Grow, Lang, Runner } from './types';

export type CodePage = { readonly dto: SectionDTO };
export type GrowFor = (src: string, stdin: boolean) => Grow;

export const checkReference = async (where: string, a: CodeAnswerDTO, lang: Lang, runner: Runner, growFor: GrowFor): Promise<readonly Finding[]> => {
  const spec = a[lang]; if (!spec) return [];
  const at = `${where} answer.${lang}`;
  const r = await runner.run(spec.reference, spec, a.tests.map(runTestOf));
  if (!r.ok) return [{ level: 'error', where: at, what: `reference does not run: ${r.killed ? 'it ran past the time limit' : errorText(r.error)}` }];
  const fail = firstFailure(a, a.tests, r.results);
  if (fail) return [{ level: 'error', where: at, what: `reference fails test ${fail.index + 1}: ${whyText(fail.test, fail.run, fail.why)}${fail.run.skipped ? '' : ` (got ${JSON.stringify(fail.run.value ?? fail.run.stdout)})`}` }];
  if (a.bound === undefined || a.grow === undefined) return [];
  const stdin = a.tests[0]?.stdin !== undefined;
  let count;
  try { count = await runner.count(spec.reference, spec, growFor(a.grow, stdin)); } catch (e) { return [{ level: 'error', where: at, what: `grow fails: ${e instanceof Error ? e.message : String(e)}` }]; }
  if (!count.ok) return [{ level: 'error', where: at, what: `reference stops on the grown input n = ${count.n}: ${count.killed ? 'it ran past the time limit' : errorText(count.error)}` }];
  const steps = count.points.map((p) => `${p.n}: ${p.steps}`).join(', ');
  if (count.growth === null) return [{ level: 'error', where: at, what: `reference runs out of steps at every size, and the bound is ${GROWTH_TEXT[a.bound]}` }];
  if (worse(count.growth, a.bound)) return [{ level: 'error', where: at, what: `reference grows as ${GROWTH_TEXT[count.growth]}, past the bound ${GROWTH_TEXT[a.bound]} (steps ${steps}); is grow building the worst case it means to?` }];
  if (worse(a.bound, count.growth)) return [{ level: 'warning', where: at, what: `reference grows as ${GROWTH_TEXT[count.growth]}, below the bound ${GROWTH_TEXT[a.bound]}: the bound is loose, or grow does not build the worst case (steps ${steps})` }];
  return [];
};

/* Every code answer of the pages, every language a runner is given for. */
export const checkReferences = async (pages: readonly CodePage[], runners: Partial<Record<Lang, Runner>>, growFor: GrowFor): Promise<readonly Finding[]> => {
  const out: Finding[] = [];
  for (const s of pages) {
    for (const e of s.dto.exercises) {
      const a = e.answer; if (a.type !== 'code') continue;
      for (const lang of CODE_LANGS) {
        const runner = runners[lang];
        if (runner && a[lang]) out.push(...await checkReference(`${s.dto.id}/section.json exercises[${e.id}]`, a, lang, runner, growFor));
      }
    }
  }
  return out;
};
/* How many references there are to run, for the tally. */
export const referenceCount = (pages: readonly CodePage[], langs: readonly Lang[]): number =>
  pages.reduce((n, s) => n + s.dto.exercises.reduce((m, e) => m + (e.answer.type === 'code' ? langs.filter((l) => e.answer.type === 'code' && e.answer[l] !== undefined).length : 0), 0), 0);
