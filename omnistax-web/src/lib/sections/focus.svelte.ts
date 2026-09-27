/* Which section the companion views describe: the focused group's active
   section, else the last one that was, else the page served, else none — focus
   never invents a place. Beside it, which view the reader last touched, so a
   command aimed at "this view" knows what it means: the page of a view the pointer
   or the keyboard went into — named by its item key, since a view may be open in
   several pages at once — and failing that the one a focused tab is showing.
   Which book is focused is only a default, for what opens on a book; nothing
   resolves a reference against it. */
import { layoutStore } from '../layout/store.svelte';
import { focusedGroup } from '../layout/model';
import { aboutItem, bookId, bookOfItem, parseItemKey, sectionOfItem, type BookId, type ItemId, type SectionRef } from '../types/ids';
import type { ItemKey } from '../layout/model';

const activeItem = (): ItemId | null => { const active = focusedGroup(layoutStore.layout).active; return active ? parseItemKey(active) : null; };

class Focus {
  own: ItemId = aboutItem();
  /* The book the page was served for; the 404 page has none of its own. */
  boot: BookId = bookId('');
  view = $state<ItemKey | null>(null);
  last = $state.raw<SectionRef | null>(null);
  /* Called from an effect, so the last section read outlives a chat or view tab taking focus. */
  track(): void { const id = activeItem(); const s = id && sectionOfItem(id); if (s) this.last = s; }
  get section(): SectionRef | null { const id = activeItem(); return (id && sectionOfItem(id)) ?? this.last ?? sectionOfItem(this.own) ?? null; }
  get book(): BookId | null { const id = activeItem(); return (id && bookOfItem(id)) ?? this.section?.book ?? null; }
  get activeView(): ItemKey | null {
    if (this.view) return this.view;
    const active = focusedGroup(layoutStore.layout).active; const id = active ? parseItemKey(active) : null;
    return id !== null && id.kind === 'view' ? active : null;
  }
}
export const focus = new Focus();
