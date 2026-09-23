/* Opening a practice view on something in particular: the button at the end of
   a section's problems, and whatever else comes to want one. It lands in the
   group asked from, or the focused one, on the practice tab already there when
   there is one, and on the choose face with the curriculum already picked. */
import { itemKey, newViewItem, viewKindOf } from '../types/ids';
import { openTab, type ItemKey } from '../layout/model';
import { layoutStore } from '../layout/store.svelte';
import type { Pick } from './model';
import { practice } from './store.svelte';

const practiceTab = (group: number): ItemKey => {
  const g = layoutStore.layout.groups[group];
  const own = (k: ItemKey | null | undefined): k is ItemKey => !!k && viewKindOf(k) === 'exercises';
  return own(g?.active) ? g.active : g?.tabs.find(own) ?? itemKey(newViewItem('exercises'));
};

export const openPractice = (picks: readonly Pick[], group = layoutStore.layout.focus): void => {
  const key = practiceTab(group);
  practice.seed(key, picks, 'choose');
  layoutStore.apply((l) => openTab(l, key, group));
};
