/* Which section the companion views describe: the focused group's active document. */
import { layoutStore } from '../layout/store.svelte';
import { focusedSection } from '../layout/model';
import type { SectionId } from '../types/ids';
class Focus {
  page: SectionId = '0.0' as SectionId;
  get section(): SectionId { return focusedSection(layoutStore.layout, this.page); }
}
export const focus = new Focus();
