/* Exercises a model wrote for a concept, kept beside the book's own. A record
   is what the generator produced and what it was asked; the runner sees it as
   an ordinary end-of-section exercise whose id says where it came from. Pure. */
import { z } from 'zod';
import { AnswerSchema, BLOOM_LEVELS, type AnswerDTO, type Bloom, type ExerciseDTO } from '../content/schema';
import { conceptId, type SectionId } from '../types/ids';
import type { ModelPick } from '../chat/providers/index';
import type { Attempt, CatalogExercise } from './model';

export type GeneratedId = string & { readonly __brand: 'GeneratedId' };
export const newGeneratedId = (): GeneratedId => Math.random().toString(36).slice(2, 12).padEnd(10, '0') as GeneratedId;

export type GeneratedExercise = {
  readonly id: GeneratedId;
  readonly book: string;
  /* The section that introduces the first concept, which is where its attempts and scratch are filed. */
  readonly section: string;
  readonly concepts: readonly string[];
  readonly prompt: string;
  readonly answer: AnswerDTO;
  readonly bloom: Bloom;
  readonly facet: string;
  readonly model: ModelPick;
  readonly created: number;
  readonly uses: number;
  readonly request: { readonly standard: boolean; readonly note?: string };
};

export const AI_PREFIX = 'ai:';
export const isGenerated = (ex: string): boolean => ex.startsWith(AI_PREFIX);
export const generatedIdOf = (ex: string): GeneratedId => ex.slice(AI_PREFIX.length) as GeneratedId;

export const exerciseOf = (g: GeneratedExercise): ExerciseDTO => ({
  id: AI_PREFIX + g.id, sourceId: AI_PREFIX + g.id, kind: 'generated', bloom: g.bloom, place: { at: 'end' },
  prompt: g.prompt, answer: g.answer, concepts: g.concepts.map(conceptId),
});
export const catalogOf = (g: GeneratedExercise): CatalogExercise => ({ book: g.book, section: g.section as SectionId, ex: exerciseOf(g) });

/* Stored items for one concept, least used first. Items the reader has already
   answered right wait behind the rest and are taken only when nothing else is left. */
export const pickStored = (stored: readonly GeneratedExercise[], concept: string, n: number, attempts: readonly Attempt[]): readonly GeneratedExercise[] => {
  if (n <= 0) return [];
  const right = new Set(attempts.filter((a) => a.ok && isGenerated(a.ex)).map((a) => a.ex));
  const own = stored.filter((g) => g.concepts.includes(concept)).sort((a, b) => a.uses - b.uses || a.created - b.created);
  const open = own.filter((g) => !right.has(AI_PREFIX + g.id)), done = own.filter((g) => right.has(AI_PREFIX + g.id));
  return [...open, ...done].slice(0, n);
};

/* ---------- the model's answer ---------- */

const bloomOf = (v: unknown): unknown => typeof v === 'string' ? BLOOM_LEVELS.find((b) => b.toLowerCase() === v.trim().toLowerCase()) ?? v : v;
export const GeneratedItemSchema = z.object({
  prompt: z.string().min(1),
  answer: z.preprocess((v) => (typeof v === 'object' && v !== null ? { ...v, generated_by: 'ai' } : v), AnswerSchema),
  bloom: z.preprocess(bloomOf, z.enum(BLOOM_LEVELS)),
  facet: z.string().min(1),
}).strip();
export type GeneratedItem = z.infer<typeof GeneratedItemSchema>;

/* The body of the one fenced json block an answer holds, or of the last one where it holds several. */
export const fencedJson = (text: string): string | null => {
  const blocks = [...text.matchAll(/```(?:json)?[ \t]*\n([\s\S]*?)```/gi)];
  return blocks.length ? blocks[blocks.length - 1][1].trim() : null;
};

export type Parsed<T> = { readonly items: readonly T[]; readonly errors: readonly string[] };
/* Every item that reads, and a line for each that does not. No item at all is
   a failure the caller may send back to the model with the errors. */
export const parseGenerated = (text: string): Parsed<GeneratedItem> => {
  const body = fencedJson(text);
  if (body === null) return { items: [], errors: ['No fenced ```json block was found.'] };
  let raw: unknown;
  try { raw = JSON.parse(body); } catch (e) { return { items: [], errors: [`The json block does not parse: ${e instanceof Error ? e.message : String(e)}`] }; }
  if (!Array.isArray(raw)) return { items: [], errors: ['The json block must hold an array.'] };
  const read = raw.map((item, i) => { const p = GeneratedItemSchema.safeParse(item); return p.success ? { item: p.data } : { error: `Item ${i + 1}: ${p.error.issues.map((x) => `${x.path.join('.') || 'item'} ${x.message}`).join('; ')}` }; });
  return {
    items: read.flatMap((r) => ('item' in r && r.item ? [r.item] : [])),
    errors: read.flatMap((r) => ('error' in r && r.error ? [r.error] : [])),
  };
};

export const recordOf = (item: GeneratedItem, at: { book: string; section: string; concept: string; model: ModelPick; note?: string }, now = Date.now()): GeneratedExercise => ({
  id: newGeneratedId(), book: at.book, section: at.section, concepts: [at.concept],
  prompt: item.prompt, answer: item.answer, bloom: item.bloom, facet: item.facet,
  model: at.model, created: now, uses: 0, request: at.note ? { standard: false, note: at.note } : { standard: true },
});
