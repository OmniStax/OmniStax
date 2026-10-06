import type { ExerciseDTO } from '../content/schema';
import type { ExerciseRef, Pick, Standing, State } from './model';

export const plain = (s: string): string =>
  s.replace(/\$\$?([^$]*)\$\$?/g, '$1').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export const STATE_WORD: Readonly<Record<State, string>> = { untouched: 'unpracticed', practised: 'practiced', mastered: 'mastered' };

export const count = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const exerciseName = (ex: ExerciseDTO, kindName?: string): string => {
  if (ex.id.startsWith('ai:')) return 'AI-generated exercise';
  if (ex.sourceNumber) return `Exercise ${ex.sourceNumber}`;
  const kind = kindName ?? titled(ex.kind.replace(/-/g, ' '));
  const m = /^(?:p|cq|ap|cyu|cyl|ct|e)(\d+)$/i.exec(ex.id);
  return m ? `${kind} ${Number(m[1])}` : kind;
};

export const excerpt = (prompt: string, max = 110): string => {
  const text = plain(prompt);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

export const durationText = (ms: number): string => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const standingLine = (s: Standing): string => {
  const total = s.untouched + s.practised + s.mastered;
  return total === 0 ? 'No concepts yet' : `${s.mastered}/${total} mastered · ${s.practised} practiced`;
};

export type PickNames = {
  book: (id: string) => string;
  chapter: (book: string, chapter: string) => string;
  section: (book: string, section: string) => string;
  concept: (id: string) => string;
  exercise: (ref: ExerciseRef) => string;
};

export const pickLabel = (p: Pick, names: PickNames): string => {
  if ('concept' in p) return names.concept(p.concept);
  if ('exercise' in p) return names.exercise(p.exercise);
  if (p.section) return names.section(p.book, p.section);
  if (p.chapter) return names.chapter(p.book, p.chapter);
  return names.book(p.book);
};
