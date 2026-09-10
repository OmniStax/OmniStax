/* The name a tab carries. A view is named by what it is and where it stands,
   since two tabs of the same view can describe different places; a document or a
   figure takes the title its section registered. Shared, because the tab strip
   and the command palette must call the same thing by the same name. */
import { parseItemKey, viewKindOf } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { scope } from '../sections/scope.svelte';
import { targetLabel } from '../sections/scope';
import { VIEW_TITLE } from '../icons';
import type { ItemKey } from './model';

export const tabTitle = (k: ItemKey): string => {
  const id = parseItemKey(k);
  if (!id) return k;
  const kind = viewKindOf(k);
  return kind ? `${VIEW_TITLE[kind]} · ${targetLabel(scope.targetFor(k), registry.manifest)}` : registry.title(id);
};
