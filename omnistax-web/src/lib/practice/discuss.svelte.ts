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
import { excerpt, exerciseName } from './labels';
import { links } from './links.svelte';
import type { ExerciseRef } from './model';
import { t } from '../i18n/index';

export type Outcome = boolean | null;

/* The opening line of a discussion. After a self-graded wrong answer it is a
   sentence the reader finishes with their own reasoning; after an AI-graded
   one the model already has the answer and the verdict, so the line is theirs
   to write. */
export const firstLine = (outcome: Outcome, answer = '', aiGraded = false): string => {
  if (aiGraded) return '';
  const ask = outcome === true ? t('practice.discuss.right') : outcome === false ? t('practice.discuss.wrong') : t('practice.discuss.walk');
  return answer.trim() ? t('practice.discuss.withAnswer', { ask, answer: answer.trim() }) : ask;
};

/* The exercise as a chip that says which one it is, its name and the opening
   of its prompt, so the reader can see it is there; what the model is given
   is the whole brief. A model's own exercise is read off the exercise itself
   the same way, prompt, options and solution. */
const exerciseChip = (ref: ExerciseRef, ex: ExerciseDTO): Chip =>
  chip('exercise', linkInner({ kind: 'exercise', book: bookId(ref.book), section: ref.section, id: ref.ex }), `${exerciseName(ex)} · ${excerpt(ex.prompt.replace(/\$\$?[^$]*\$\$?/g, '…'), 48)}`,
    exerciseBrief(ref, ex, ['The answer has already been checked; do not grade it again.']), true);

const sectionChip = async (ref: ExerciseRef): Promise<Chip | null> => {
  const at = sectionRef(bookId(ref.book), ref.section);
  await registry.load(at).catch(() => undefined);
  const entry = registry.entry(at);
  return entry?.built ? chip('section', secKey(at), sectionLabel(at.section, entry.title), sectionTextOf(at), true) : null;
};

/* The chat opens at once, holding the exercise and the first line. The
   section's text follows when it has been fetched, which for a section no tab
   holds is a request away; the chat stood waiting on it before, with nothing
   on screen, and a second click made a second chat. */
export const discussExercise = async (ref: ExerciseRef, ex: ExerciseDTO, how: Opening, outcome: Outcome, answer?: string, aiGraded = false): Promise<void> => {
  const name = links.fileName(ref, 'chats', ex);
  const chat = chats.create();
  chats.rename(chat.id, name);
  createChatEntry(links.folder('chats'), chat.id, name);
  links.add(ref, chatTabKey(chat.id));
  pending.give(chat.id, [exerciseChip(ref, ex)]);
  const line = firstLine(outcome, answer, aiGraded); if (line) pending.put(chat.id, line);
  const opened = openFromView(chatTabKey(chat.id), how);
  void sectionChip(ref).then((section) => { if (section) pending.give(chat.id, [section]); });
  await opened;
};
