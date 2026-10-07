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

/* Per session, what each concept's slots are doing: the line while they are
   written, the reason when they were not. */
type Job = { readonly writing: Readonly<Record<string, string>>; readonly failed: Readonly<Record<string, string>> };
export const generation: Record<SessionId, Job> = $state({});
export const isGenerating = (id: SessionId, concept?: string): boolean => {
  const writing = generation[id]?.writing ?? {};
  return concept === undefined ? Object.keys(writing).length > 0 : concept in writing;
};
const mark = (id: SessionId, part: keyof Job, concept: string, value: string | null): void => {
  const job = generation[id] ?? { writing: {}, failed: {} }, { [concept]: _, ...rest } = job[part];
  generation[id] = { ...job, [part]: value === null ? rest : { ...rest, [concept]: value } };
};
const controllers = new Map<string, AbortController>();
const jobKey = (id: SessionId, concept: string): string => `${id}/${concept}`;
const NO_MODEL = 'Configure a model under Settings → AI.';

/* A live session's open slots filled, or only those of the concepts named:
   stored items first, least used, unless the reader asked for fresh ones; the
   rest written now, three concepts at a time, each batch placed as it lands.
   A concept that cannot be written for keeps its slots and the reason. */
export const fillLive = async (sessionId: SessionId, only?: readonly string[]): Promise<void> => {
  const session = practice.sessions[sessionId]; if (!session) return;
  const s = practice.settings, toWrite: string[] = [];
  new Set(session.drawn.flatMap((d) => isPending(d.ex) && d.concept && (!only || only.includes(d.concept)) && !isGenerating(sessionId, d.concept) ? [d.concept] : [])).forEach((id) => {
    mark(sessionId, 'failed', id, null);
    const need = practice.pendingOf(sessionId, id);
    if (!s.fresh) practice.fill(sessionId, id, pickStored(generated.forConcept(id), id, need, practice.attempts).map(catalogOf));
    if (practice.pendingOf(sessionId, id) > 0) toWrite.push(id);
  });
  if (!toWrite.length) return;
  const model = ready();
  if (!model) { toWrite.forEach((id) => mark(sessionId, 'failed', id, NO_MODEL)); return; }
  const nameOf = (id: string): string => { const c = practice.conceptOf(id); return c ? plain(c.name) : id; };
  toWrite.forEach((id) => mark(sessionId, 'writing', id, `Waiting to write for ${nameOf(id)}…`));
  const cat = practice.catalog();
  await pool(toWrite, PARALLEL, async (id) => {
    const c = practice.conceptOf(id), book = books.bookOf(id), control = new AbortController();
    controllers.set(jobKey(sessionId, id), control);
    try {
      if (!c || c.status !== 'built' || !book) throw new Error('This concept’s book is not loaded.');
      const existing = cat.exercises.filter((e) => e.ex.place.at === 'end' && e.ex.concepts.includes(c.id)).map((e) => e.ex.prompt);
      for (let left = practice.pendingOf(sessionId, id); left > 0 && !control.signal.aborted; left = practice.pendingOf(sessionId, id)) {
        mark(sessionId, 'writing', id, `Generating ${left} for ${plain(c.name)}…`);
        const items = await generate({ provider: providerOf(model.pick.provider), library: liveLibrary }, {
          book, bookTitle: books.title(book), section: c.section, count: Math.min(MAX_PER_REQUEST, left),
          concept: { id: c.id, name: c.name, kind: c.kind, statement: c.statement ?? '' },
          note: s.promptNote.trim() || undefined, existing, facets: generated.forConcept(id).map((g) => g.facet),
        }, model.pick, model.access, control.signal);
        if (!items.length) throw new Error('The model wrote none.');
        const records = items.map((item) => recordOf(item, { book, section: c.section, concept: c.id, model: model.pick, note: s.promptNote.trim() || undefined }));
        generated.add(records); practice.fill(sessionId, id, records.map(catalogOf));
      }
    } catch (e) {
      if (!control.signal.aborted) mark(sessionId, 'failed', id, e instanceof Error ? e.message : String(e));
    } finally { controllers.delete(jobKey(sessionId, id)); mark(sessionId, 'writing', id, null); }
  });
};

/* An exercise out of a live session. The last open slot of a concept takes
   the request still writing for it along. */
export const removeExercise = (sessionId: SessionId, at: number): void => {
  const d = practice.sessions[sessionId]?.drawn[at]; if (!d) return;
  practice.remove(sessionId, at);
  if (!d.concept || !isPending(d.ex) || practice.pendingOf(sessionId, d.concept) > 0) return;
  controllers.get(jobKey(sessionId, d.concept))?.abort();
  mark(sessionId, 'failed', d.concept, null);
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
