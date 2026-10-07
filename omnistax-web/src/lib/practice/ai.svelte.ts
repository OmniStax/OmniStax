/* Practice's two calls on the reader's model, with the app around them: the
   open slots of a live session written, and one answer graded. The work
   itself is in generate.ts and grade.ts, which know nothing of the stores. */
import type { ExerciseDTO } from '../content/schema';
import { ai } from '../chat/settings.svelte';
import { readyPick } from '../chat/settings';
import { providerOf } from '../chat/providers/all';
import { imagePartOf, type ImagePart, type ModelPick } from '../chat/providers/index';
import { liveLibrary } from '../chat/library';
import { drawings } from '../drawer/store.svelte';
import { getScratchRecord } from '../drawer/db';
import { thumbnailOf } from '../drawer/thumb';
import { books } from './books.svelte';
import { practice } from './store.svelte';
import { generated } from './generated.svelte';
import { catalogOf, pickStored, recordOf } from './generated';
import { generate, MAX_PER_REQUEST } from './generate';
import { grade, type Graded } from './grade';
import { keyOf, type ScratchAt } from './scratch.svelte';
import { isPending, type SessionId } from './model';

export const PARALLEL = 3;
export const GRADE_WIDTH = 1000;

export const practicePick = (): ModelPick | null => readyPick(ai.value, practice.settings.model) ?? ai.ready;
const ready = (): { pick: ModelPick; access: NonNullable<ReturnType<typeof ai.access>> } | null => {
  const pick = practicePick(), access = pick ? ai.access(pick) : null;
  return pick && access ? { pick, access } : null;
};

const plain = (s: string): string => s.replace(/\$[^$]*\$/g, '…').replace(/<[^>]*>/g, '').trim();
const pool = async <T>(items: readonly T[], n: number, f: (t: T) => Promise<void>): Promise<void> => {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) await f(items[next++]); }));
};

type Job = { readonly line: string; readonly running: boolean; readonly notice: string };
export const generation: Record<SessionId, Job> = $state({});
export const isGenerating = (id: SessionId): boolean => generation[id]?.running === true;
const NO_MODEL = 'Choose a model with a key under Settings → AI to generate exercises; this session uses the book’s.';

/* A live session's open slots filled: stored items first, least used, unless
   the reader asked for fresh ones; the rest written now, three concepts at a
   time, each batch placed as it lands. A concept that cannot be written for
   loses its slots, and the notice says so in one line. */
export const fillLive = async (sessionId: SessionId, onLine?: (line: string) => void): Promise<void> => {
  const session = practice.sessions[sessionId]; if (!session || isGenerating(sessionId)) return;
  const set = (job: Partial<Job>): void => { generation[sessionId] = { ...(generation[sessionId] ?? { line: '', running: false, notice: '' }), ...job }; };
  const s = practice.settings, toWrite: string[] = [];
  new Set(session.drawn.flatMap((d) => isPending(d.ex) && d.concept ? [d.concept] : [])).forEach((id) => {
    const need = practice.pendingOf(sessionId, id);
    if (!s.fresh) practice.fill(sessionId, id, pickStored(generated.forConcept(id), id, need, practice.attempts).map(catalogOf));
    if (practice.pendingOf(sessionId, id) > 0) toWrite.push(id);
  });
  if (!toWrite.length) return;
  const model = ready();
  if (!model) { practice.dropPending(sessionId); set({ notice: NO_MODEL }); return; }
  const running = new Map<string, string>(), failed: string[] = [];
  const say = (): void => { const line = [...running.values()].join(' · '); set({ line }); onLine?.(line); };
  const cat = practice.catalog(), signal = new AbortController().signal;
  set({ running: true, line: '', notice: '' });
  try {
    await pool(toWrite, PARALLEL, async (id) => {
      const c = practice.conceptOf(id), book = books.bookOf(id);
      if (!c || c.status !== 'built' || !book) { failed.push(c ? plain(c.name) : id); practice.dropPending(sessionId, id); return; }
      const existing = cat.exercises.filter((e) => e.ex.place.at === 'end' && e.ex.concepts.includes(c.id)).map((e) => e.ex.prompt);
      try {
        for (let left = practice.pendingOf(sessionId, id); left > 0; left = practice.pendingOf(sessionId, id)) {
          running.set(id, `Generating ${left} for ${plain(c.name)}…`); say();
          const items = await generate({ provider: providerOf(model.pick.provider), library: liveLibrary }, {
            book, bookTitle: books.title(book), section: c.section, count: Math.min(MAX_PER_REQUEST, left),
            concept: { id: c.id, name: c.name, kind: c.kind, statement: c.statement ?? '' },
            note: s.promptNote.trim() || undefined, existing, facets: generated.forConcept(id).map((g) => g.facet),
          }, model.pick, model.access, signal);
          if (!items.length) throw new Error('the model wrote none');
          const records = items.map((item) => recordOf(item, { book, section: c.section, concept: c.id, model: model.pick, note: s.promptNote.trim() || undefined }));
          generated.add(records); practice.fill(sessionId, id, records.map(catalogOf));
        }
      } catch (e) {
        failed.push(`${plain(c.name)} (${e instanceof Error ? e.message : String(e)})`); practice.dropPending(sessionId, id);
      } finally { running.delete(id); say(); }
    });
  } finally {
    set({ running: false, line: '', notice: failed.length ? `Could not generate for ${failed.join(', ')}; the session goes on without those.` : '' });
  }
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
