/* Opening a practice view on something in particular: the button at the end of
   a section's problems, and whatever else comes to want one. The page is made
   before it is seated, so that it arrives with its curriculum already chosen
   and on the face that shows it — a fresh page of its own each time, split to
   the right of the group the reader asked from, which is where a companion to
   what they are reading belongs. */
import { itemKey, newViewItem } from '../types/ids';
import { split } from '../layout/model';
import { layoutStore } from '../layout/store.svelte';
import type { Pick, SessionId } from './model';
import { practice, type Face } from './store.svelte';

export const openPractice = (picks: readonly Pick[], group: number, face: Face = 'choose'): void => {
  const item = newViewItem('exercises');
  practice.seed(itemKey(item), picks, face);
  layoutStore.apply((l) => split(l, group, 'right', item));
};
/* A session already running, taken up in a page of its own. This is what the
   dashboard does with a card whose tab was closed when the page reading that
   card is busy with a round of its own: neither session is disturbed and both
   stand open side by side. */
export const openSession = (id: SessionId, group: number): void => {
  const item = newViewItem('exercises');
  practice.seedSession(itemKey(item), id);
  layoutStore.apply((l) => split(l, group, 'right', item));
};
