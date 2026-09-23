/* The name a tab carries. A view is named by what it is and where it stands,
   since two tabs of the same view can describe different places; a document or a
   figure takes the title its section registered. Shared, because the tab strip
   and the command palette must call the same thing by the same name. */
import { parseItemKey, viewKindOf } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { scope } from '../sections/scope.svelte';
import { focus } from '../sections/focus.svelte';
import { targetLabel } from '../sections/scope';
import { VIEW_TITLE } from '../icons';
import type { ItemKey } from './model';

/* The three views that stand nowhere in particular and so wear no scope bar:
   the explorer is the whole tree, the search reads every book of the library,
   and the exercises view draws its curriculum across books. A place none of
   them stands at is no part of their name either, so their tabs are named by
   what they are and nothing more. View.svelte draws the bar by the same rule. */
const PLACELESS: readonly string[] = ['explorer', 'search', 'exercises'];

export const tabTitle = (k: ItemKey): string => {
  const id = parseItemKey(k);
  if (!id) return k;
  const kind = viewKindOf(k);
  if (!kind) return registry.title(id);
  return PLACELESS.includes(kind) ? VIEW_TITLE[kind] : `${VIEW_TITLE[kind]} · ${targetLabel(scope.targetFor(k), registry.manifest(focus.section.book))}`;
};
