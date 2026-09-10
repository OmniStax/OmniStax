/* Which section the companion views describe: the focused group's active
   document. A tab that belongs to no section — a standing page, a note, a view
   — leaves that question to the page's own item, and on a page that is itself
   no section, to the first section the book has built, so a view always has
   somewhere to stand. Beside it, which view the reader last touched, so a
   command aimed at "this view" knows what it means: the page of a view the pointer
   or the keyboard went into — named by its item key, since a view may be open in
   several pages at once — and failing that the one a focused tab is showing. */
import { layoutStore } from '../layout/store.svelte';
import { focusedGroup, focusedSection } from '../layout/model';
import { registry } from './registry.svelte';
import { parseItemKey, pageItem, sectionId, sectionOfItem, type ItemId, type SectionId } from '../types/ids';
import type { ItemKey } from '../layout/model';

const NO_SECTION = sectionId('0.0');
const firstBuilt = (): SectionId => {
  const s = registry.manifest.chapters.flatMap((c) => c.sections).find((x) => x.built);
  return s ? sectionId(s.id) : NO_SECTION;
};

class Focus {
  own: ItemId = pageItem('about');
  view = $state<ItemKey | null>(null);
  get section(): SectionId { return focusedSection(layoutStore.layout, sectionOfItem(this.own) ?? firstBuilt()); }
  get activeView(): ItemKey | null {
    if (this.view) return this.view;
    const active = focusedGroup(layoutStore.layout).active; const id = active ? parseItemKey(active) : null;
    return id !== null && id.kind === 'view' ? active : null;
  }
}
export const focus = new Focus();
