/* Practice's two calls on the reader's model, with the app around them: the
   gaps of a round filled before it starts, and one answer graded. The work
   itself is in generate.ts and grade.ts, which know nothing of the stores. */
import type { ExerciseDTO } from '../content/schema';
import { ai } from '../chat/settings.svelte';
import { providerOf } from '../chat/providers/all';
import { imagePartOf, type ImagePart, type ModelPick } from '../chat/providers/index';
import { liveLibrary } from '../chat/library';
import { drawings } from '../drawer/store.svelte';
import { getScratchRecord } from '../drawer/db';
import { thumbnailOf } from '../drawer/thumb';
import type { ItemKey } from '../layout/model';
import { books } from './books.svelte';
import { practice } from './store.svelte';
import { generated } from './generated.svelte';
import { catalogOf, pickStored, recordOf } from './generated';
import { generate, MAX_PER_REQUEST } from './generate';
import { grade, type Graded } from './grade';
import { keyOf, type ScratchAt } from './scratch.svelte';
import type { CatalogExercise } from './model';

export const PARALLEL = 3;
export const GRADE_WIDTH = 1000;

export const practicePick = (): ModelPick | null => practice.settings.model ?? ai.last;
const ready = (): { pick: ModelPick; access: NonNullable<ReturnType<typeof ai.access>> } | null => {
  const pick = practicePick(), access = pick ? ai.access(pick) : null;
  return pick && access ? { pick, access } : null;
};

const plain = (s: string): string => s.replace(/\$[^$]*\$/g, '…').replace(/<[^>]*>/g, '').trim();
const pool = async <T>(items: readonly T[], n: number, f: (t: T) => Promise<void>): Promise<void> => {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) await f(items[next++]); }));
};

/* Stored items first, least used, unless the reader asked for fresh ones;
   the rest written now, three concepts at a time. A concept that cannot be
   written for keeps its book items, and the notice says so in one line. */
export const fillGaps = async (key: ItemKey, onLine: (line: string) => void, signal: AbortSignal): Promise<{ extra: readonly CatalogExercise[]; notice: string }> => {
  const plan = practice.plan(key), s = practice.settings, extra: CatalogExercise[] = [];
  const toWrite: { id: string; need: number }[] = [];
  plan.concepts.forEach((id) => {
    const gap = plan.quotas[id]?.gap ?? 0; if (gap <= 0) return;
    const stored = s.fresh ? [] : pickStored(generated.forConcept(id), id, gap, practice.attempts);
    extra.push(...stored.map(catalogOf));
    if (stored.length < gap) toWrite.push({ id, need: gap - stored.length });
  });
  if (!toWrite.length) return { extra, notice: '' };
  const model = ready();
  if (!model) return { extra, notice: 'Choose a model with a key to generate exercises; this round uses the stored and book ones.' };
  const running = new Map<string, string>(), failed: string[] = [];
  const say = (): void => onLine([...running.values()].join(' · '));
  const cat = practice.catalog();
  await pool(toWrite, PARALLEL, async ({ id, need }) => {
    const c = practice.conceptOf(id), book = books.bookOf(id);
    if (!c || c.status !== 'built' || !book) { failed.push(c ? plain(c.name) : id); return; }
    const existing = cat.exercises.filter((e) => e.ex.place.at === 'end' && e.ex.concepts.includes(c.id)).map((e) => e.ex.prompt);
    let left = need;
    try {
      while (left > 0) {
        running.set(id, `Generating ${left} for ${plain(c.name)}…`); say();
        const items = await generate({ provider: providerOf(model.pick.provider), library: liveLibrary }, {
          book, bookTitle: books.title(book), section: c.section, count: Math.min(MAX_PER_REQUEST, left),
          concept: { id: c.id, name: c.name, kind: c.kind, statement: c.statement ?? '' },
          note: s.promptNote.trim() || undefined, existing, facets: generated.forConcept(id).map((g) => g.facet),
        }, model.pick, model.access, signal);
        const records = items.map((item) => recordOf(item, { book, section: c.section, concept: c.id, model: model.pick, note: s.promptNote.trim() || undefined }));
        generated.add(records); extra.push(...records.map(catalogOf));
        left -= records.length;
      }
    } catch (e) {
      if (signal.aborted) throw e;
      failed.push(`${plain(c.name)} (${e instanceof Error ? e.message : String(e)})`);
    } finally { running.delete(id); say(); }
  });
  return { extra, notice: failed.length ? `Could not generate for ${failed.join(', ')}; the round uses the book’s exercises there.` : '' };
};

const scratchImage = async (at: ScratchAt): Promise<ImagePart | null> => {
  const key = keyOf(at), d = drawings.getScratch(key) ?? await getScratchRecord(key);
  if (!d || !d.items.length) return null;
  const url = await thumbnailOf(d.id, d, { width: GRADE_WIDTH });
  return url ? imagePartOf(url) : null;
};

export const gradeAnswer = async (ex: ExerciseDTO, text: string, scratch: ScratchAt | null, signal: AbortSignal): Promise<Graded> => {
  const model = ready();
  if (!model) throw new Error('Choose a model with a key under Settings → AI first.');
  const image = scratch ? await scratchImage(scratch) : null;
  return grade(providerOf(model.pick.provider), { prompt: ex.prompt, answer: ex.answer, text, image }, model.pick, model.access, signal);
};
