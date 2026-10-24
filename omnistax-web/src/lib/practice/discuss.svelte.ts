/* "Discuss with AI" after an exercise is checked: a chat filed beside the
   exercise, opening on the exercise with its reference solution and the
   section it comes from, and a first line that says how the answer went. */
import type { ExerciseDTO } from '../content/schema';
import { exerciseBrief } from './brief';
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

export type Outcome = boolean | null;

/* The opening line of a discussion. After a self-graded wrong answer it is a
   sentence the reader finishes with their own reasoning; after an AI-graded
   one the model already has the answer and the verdict, so the line is theirs
   to write. */
export const firstLine = (outcome: Outcome, answer = '', aiGraded = false): string => {
  if (aiGraded) return '';
  const ask = outcome === true ? 'I got this right. What else should I check my understanding against?'
    : outcome === false ? 'I got this wrong, where does my reasoning go off. I was thinking that [replace with your reasoning]'
      : 'Walk me through this one.';
  return answer.trim() ? `${ask}\n\nMy answer: ${answer.trim()}` : ask;
};

const exerciseChip = (ref: ExerciseRef, ex: ExerciseDTO): Chip =>
  chip('exercise', linkInner({ kind: 'exercise', book: bookId(ref.book), section: ref.section, id: ref.ex }), exerciseName(ex), exerciseBrief(ref, ex, ['The answer has already been checked; do not grade it again.']), true);

const sectionChip = async (ref: ExerciseRef): Promise<Chip | null> => {
  const at = sectionRef(bookId(ref.book), ref.section);
  await registry.load(at).catch(() => undefined);
  const entry = registry.entry(at);
  return entry?.built ? chip('section', secKey(at), sectionLabel(at.section, entry.title), sectionTextOf(at), true) : null;
};

export const discussExercise = async (ref: ExerciseRef, ex: ExerciseDTO, how: Opening, outcome: Outcome, answer?: string, aiGraded = false): Promise<void> => {
  const name = links.fileName(ref, 'chats', ex);
  const chat = chats.create();
  chats.rename(chat.id, name);
  createChatEntry(links.folder('chats'), chat.id, name);
  links.add(ref, chatTabKey(chat.id));
  const section = await sectionChip(ref);
  pending.chips = { ...pending.chips, [chat.id]: [exerciseChip(ref, ex), ...(section ? [section] : [])] };
  const line = firstLine(outcome, answer, aiGraded); if (line) pending.put(chat.id, line);
  await openFromView(chatTabKey(chat.id), how);
};
