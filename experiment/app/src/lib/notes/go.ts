/* Jump to a note's highlight: the copy in the focused group first, then any
   visible one; open the document if it is not open. */
import { layoutStore } from '../layout/store.svelte';
import { activePane, jump, openDoc } from '../sections/nav.svelte';
import type { Note } from './store.svelte';

const marksOf = (id: string): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(`mark.hl[data-note="${id}"]`));
export const goNote = (n: Note, tries = 3): void => {
  const marks = marksOf(n.id);
  const ap = activePane(layoutStore.layout.focus);
  const m = marks.find((e) => ap?.contains(e)) ?? marks.find((e) => { const p = e.closest<HTMLElement>('.pane'); return p !== null && !p.hidden; }) ?? marks[0];
  if (m) { jump(m, 'center'); m.classList.add('flash'); setTimeout(() => m.classList.remove('flash'), 1600); return; }
  if (tries <= 0) return;
  openDoc(n.section, n.doc).then(() => setTimeout(() => goNote(n, tries - 1), 350));
};
