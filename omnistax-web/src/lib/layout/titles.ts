/* The name a tab carries. A view is named by what it is: where it stands is
   the scope bar's to say, not the tab's. A document or a figure takes the
   title its section registered, a chat the chat's name. Shared, because the
   tab strip and the command palette must call the same thing by the same name. */
import { parseItemKey, viewKindOf } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { scope } from '../sections/scope.svelte';
import { VIEW_TITLE } from '../icons';
import { chats } from '../chat/store.svelte';
import type { ItemKey } from './model';

export const tabTitle = (k: ItemKey): string => {
  const id = parseItemKey(k);
  if (!id) return k;
  const kind = viewKindOf(k);
  /* A chat's tab carries the chat's name: the one the reader gave it, else its
     first words, else the bare words until a word is said. */
  if (id.kind === 'chat') return chats.get(id.chat)?.name || chats.entry(id.chat)?.name || registry.title(id);
  if (!kind) return registry.title(id);
  /* A book's theme is the book's, whatever page the reader opened it from. */
  if (kind === 'colours') { const t = scope.targetFor(k); return t ? `${VIEW_TITLE[kind]} · ${registry.manifest(t.book).title || t.book}` : VIEW_TITLE[kind]; }
  return VIEW_TITLE[kind];
};
