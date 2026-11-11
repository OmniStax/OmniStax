/* Opening a practice view on something in particular: the button at the end of
   a section's problems, and whatever else comes to want one. It lands beside
   the group asked from, so the section stays in view: in the neighbouring
   group, or in a new group to the right when there is none. With Ctrl it opens
   as a tab of the group asked from, as it always did. Either way it lands on
   the practice tab already there when there is one, and on the choose face
   with the curriculum already picked. */
import { itemKey, newViewItem, viewKindOf } from '../types/ids';
import { besideOf, openTab, split, type ItemKey } from '../layout/model';
import { layoutStore } from '../layout/store.svelte';
import type { Pick } from './model';
import { practice } from './store.svelte';

const practiceTab = (group: number): ItemKey => {
  const g = layoutStore.layout.groups[group];
  const own = (k: ItemKey | null | undefined): k is ItemKey => !!k && viewKindOf(k) === 'exercises';
  return own(g?.active) ? g.active : g?.tabs.find(own) ?? itemKey(newViewItem('exercises'));
};

export const openPractice = (picks: readonly Pick[], group = layoutStore.layout.focus, beside = false): void => {
  const to = beside ? besideOf(layoutStore.layout, group) : group;
  const key = to === null ? itemKey(newViewItem('exercises')) : practiceTab(to);
  practice.seed(key, picks, 'choose');
  layoutStore.apply((l) => (to === null ? split(l, group, 'right', key) : openTab(l, key, to)));
};
