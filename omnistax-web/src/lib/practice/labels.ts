import type { ExerciseDTO } from '../content/schema';
import type { ExerciseRef, Pick, Standing, State } from './model';
import { t, type TFn } from '../i18n/index';

export const plain = (s: string): string =>
  s.replace(/\$\$?([^$]*)\$\$?/g, '$1').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* Getters: each read is in the current language. */
export const STATE_WORD: Readonly<Record<State, string>> = {
  get untouched() { return t('practice.state.untouched'); }, get practised() { return t('practice.state.practised'); }, get mastered() { return t('practice.state.mastered'); },
};

/* English only (callers outside practice still use it); UI text in a catalog uses a plural template instead. */
export const count = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const exerciseName = (ex: ExerciseDTO, kindName?: string, tr: TFn = t): string => {
  if (ex.id.startsWith('ai:')) return tr('practice.labels.aiExercise');
  if (ex.credit) return [ex.credit.short ?? ex.credit.title, ex.sourceNumber].filter(Boolean).join(' · ');
  if (ex.sourceNumber) return tr('practice.labels.exercise', { n: ex.sourceNumber });
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

export const durationText = (ms: number, tr: TFn = t): string => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return tr('practice.labels.underMinute');
  if (minutes < 60) return tr('practice.labels.minutes', { m: minutes });
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m === 0 ? tr('practice.labels.hours', { h }) : tr('practice.labels.hoursMinutes', { h, m });
};

export const standingLine = (s: Standing, tr: TFn = t): string => {
  const total = s.untouched + s.practised + s.mastered;
  return total === 0 ? tr('practice.labels.noConcepts') : tr('practice.labels.standing', { mastered: s.mastered, total, practised: s.practised });
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
