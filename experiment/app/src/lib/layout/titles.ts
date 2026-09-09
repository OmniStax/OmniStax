/* The name a tab carries. A view has a fixed one; a document or a figure takes
   the title its section registered. Shared, because the tab strip and the
   command palette must call the same thing by the same name. */
import { parseItemKey } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { VIEW_TITLE } from '../icons';
import type { ItemKey } from './model';

export const tabTitle = (k: ItemKey): string => { const id = parseItemKey(k); return !id ? k : id.kind === 'view' ? VIEW_TITLE[id.view] : registry.title(id); };
