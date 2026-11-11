/* Splitting a group from its tab strip or by command. A document is shown a
   second time; a view gains another page of itself, opened on what the first
   was showing: the same chat, the same practice round, the same place in the
   book. Only what the page shows is copied. What it shows of — the chat's
   messages, the round's answers — is the one thing both pages read, so a
   message sent in either is in both, and from the split on each page is
   walked on its own. */
import { anotherPageOf, split, type ItemKey, type SplitSide } from './model';
import { layoutStore } from './store.svelte';
import { handOver, letGo } from './handoff';
import { chatPages } from '../chat/pages.svelte';
import { practice } from '../practice/store.svelte';
import { scope } from '../sections/scope.svelte';
import { mapKinds, mapViews } from '../sections/mapview';

const copyPage = (from: ItemKey, to: ItemKey): void => {
  chatPages.copy(from, to); practice.copy(from, to); scope.copy(from, to);
  mapViews.copy(from, to); mapKinds.copy(from, to);
  handOver(from, to);
};

export const splitGroup = (index: number, side: SplitSide): void => {
  const active = layoutStore.layout.groups[index]?.active ?? null;
  const page = active ? anotherPageOf(active) : null;
  if (active && page) copyPage(active, page);
  layoutStore.apply((x) => split(x, index, side, page ?? undefined));
  /* the pages are drawn before this runs; what they left untaken was not wanted */
  if (page) setTimeout(() => letGo(page));
};
