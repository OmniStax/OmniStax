/* The name a tab carries. A view is named by what it is and where it stands,
   since two tabs of the same view can describe different places; a document or a
   figure takes the title its section registered. Shared, because the tab strip
   and the command palette must call the same thing by the same name. */
import { parseItemKey, viewKindOf } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { scope } from '../sections/scope.svelte';
import { targetLabel, type Target } from '../sections/scope';
import { VIEW_TITLE } from '../icons';
import type { ItemKey } from './model';

/* The views that stand nowhere in particular and so wear no scope bar: the
   explorer is the whole tree, the search reads every book of the library, the
   exercises view draws its curriculum across books, and sync and a file's
   sync changes are about the reader's data, not a place in a book. A place none of
   them stands at is no part of their name either, so their tabs are named by
   what they are and nothing more. View.svelte draws the bar by the same rule. */
const PLACELESS: readonly string[] = ['explorer', 'search', 'exercises', 'sync', 'sync-diff'];

const placeOf = (t: Target): string => targetLabel(t, registry.manifest(t.book));
export const tabTitle = (k: ItemKey): string => {
  const id = parseItemKey(k);
  if (!id) return k;
  const kind = viewKindOf(k);
  if (!kind) return registry.title(id);
  const t = PLACELESS.includes(kind) ? null : scope.targetFor(k);
  return t ? `${VIEW_TITLE[kind]} · ${placeOf(t)}` : VIEW_TITLE[kind];
};
