/* "Discuss with AI" after an exercise is checked: a chat filed beside the
   exercise, opening on the exercise with its reference solution and the
   section it comes from, and a first line that says how the answer went. */
import type { ExerciseDTO } from '../content/schema';
import { solutionText } from '../exercises/check';
import { chats } from '../chat/store.svelte';
import { chatTabKey, pending } from '../chat/open.svelte';
import { chip, type Chip } from '../chat/context';
import { createChatEntry } from '../explorer/edits';
import { linkInner } from '../notes/md/links';
import { sectionTextOf } from '../picker/sources';
import { registry } from '../sections/registry.svelte';
import { label as sectionLabel } from '../sections/grouping';
import { openFromView, type Opening } from '../sections/nav.svelte';
import { bookId, secKey, sectionRef } from '../types/ids';
import { exerciseName } from './labels';
import { links } from './links.svelte';
import type { ExerciseRef } from './model';
import { t } from '../i18n/index';

export type Outcome = boolean | null;

export const firstLine = (outcome: Outcome, answer = ''): string => {
  const ask = outcome === true ? t('practice.discuss.right') : outcome === false ? t('practice.discuss.wrong') : t('practice.discuss.walk');
  return answer.trim() ? t('practice.discuss.withAnswer', { ask, answer: answer.trim() }) : ask;
};

const exerciseChip = (ref: ExerciseRef, ex: ExerciseDTO): Chip => {
  const sol = solutionText(ex.answer);
  const text = [ex.prompt, sol && `Reference solution:\n${sol}`, 'The answer has already been checked; do not grade it again.'].filter(Boolean).join('\n\n');
  return chip('exercise', linkInner({ kind: 'exercise', book: bookId(ref.book), section: ref.section, id: ref.ex }), exerciseName(ex), text, true);
};

const sectionChip = async (ref: ExerciseRef): Promise<Chip | null> => {
  const at = sectionRef(bookId(ref.book), ref.section);
  await registry.load(at).catch(() => undefined);
  const entry = registry.entry(at);
  return entry?.built ? chip('section', secKey(at), sectionLabel(at.section, entry.title), sectionTextOf(at), true) : null;
};

export const discussExercise = async (ref: ExerciseRef, ex: ExerciseDTO, how: Opening, outcome: Outcome, answer?: string): Promise<void> => {
  const name = links.fileName(ref, ex);
  const chat = chats.create();
  chats.rename(chat.id, name);
  createChatEntry(links.folder(), chat.id, name);
  links.add(ref, chatTabKey(chat.id));
  const section = await sectionChip(ref);
  pending.chips = { ...pending.chips, [chat.id]: [exerciseChip(ref, ex), ...(section ? [section] : [])] };
  pending.put(chat.id, firstLine(outcome, answer));
  await openFromView(chatTabKey(chat.id), how);
};
