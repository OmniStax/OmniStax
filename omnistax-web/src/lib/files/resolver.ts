/* What the markdown in a text box on a file page can point at, and where a
   link in one goes. A note's own view builds a richer resolver, because a note
   may hold a card of the book and set it in the book's own maths; a box on a
   page is a margin note, so it is given the things a reader writes in a margin
   — their notes, the sections of the book, their highlights, and their other
   files — and nothing that has to be typeset.

   It lives beside the file store rather than in the renderer because the
   renderer is pure: every lookup arrives from here. */
import { files } from './store.svelte';
import { fileMarks } from './marks.svelte';
import { isMarkId } from './marks';
import { noteDocs } from '../notes/docs.svelte';
import { notes } from '../notes/store.svelte';
import { registry } from '../sections/registry.svelte';
import { label } from '../sections/grouping';
import { openItem, openFile } from '../sections/nav.svelte';
import { fileOpens } from './open.svelte';
import { itemKey, noteId as asNoteId, noteItem, sectionId, fileId as asFileId } from '../types/ids';
import { goNote } from '../notes/go';
import type { HighlightInfo, Resolver, StubInfo } from '../notes/md/render';
import { openDoc } from '../sections/nav.svelte';

/* A highlight named in a note or a box may be the book's or a file's. The two
   stores keep ids of different lengths for exactly this: ten of base 36 is a
   file mark, eight is a book highlight, so the resolver knows which to ask
   without asking both. */
export const fileHighlight = (id: string): HighlightInfo | null => {
  const m = fileMarks.get(id);
  if (!m || m.kind !== 'highlight') return null;
  const doc = files.get(m.file);
  return { quote: m.anchor.quote, color: m.color, text: m.text, section: `${doc?.name ?? 'File'} · page ${m.page}` };
};

/* The book's highlights first and the file marks after, as the grammar says. */
export const anyHighlight = (id: string): HighlightInfo | null => {
  if (!isMarkId(id)) {
    const n = notes.get(id);
    if (n) return { quote: n.anchor.quote, color: n.color, text: n.text, section: label(n.section, registry.entry(n.section)?.title ?? '') };
  }
  return fileHighlight(id);
};

export const fileStub = (id: string): StubInfo | null => {
  const doc = files.get(asFileId(id));
  return doc ? { name: doc.name } : null;
};

/* The resolver a box on a page is rendered with. */
export const fileResolver = (): Resolver => ({
  note: (name) => noteDocs.byName(name)?.id ?? null,
  section: (id) => { const e = registry.entry(sectionId(id)); return e?.built ? { title: e.title } : null; },
  highlight: anyHighlight,
  asset: () => null,
  equation: () => null,
  term: () => null,
  symbol: () => null,
  concept: () => null,
  figure: () => null,
  file: fileStub,
});

/* Following a link out of a box: a note opens in a tab, a section opens in the
   book, a file opens at the page it named, and a highlight jumps to the words
   it marks — in the book, or in the file that holds it. */
export const followLink = (link: string): void => {
  const note = /^note:(.+)$/.exec(link);
  if (note) { void openItem(itemKey(noteItem(asNoteId(note[1])))); return; }
  const sec = /^section:(.+)$/.exec(link);
  if (sec) { void openDoc(sectionId(sec[1]), 'text'); return; }
  const file = /^file:([^:]+)(?::p(\d+))?$/.exec(link);
  if (file) { void openFile(asFileId(file[1]), file[2] ? Number(file[2]) : undefined); return; }
  const hl = /^hl:(.+)$/.exec(link);
  if (hl) goMark(hl[1]);
};

/* A highlight or a box, wherever it lives: the book's text, or a page of a
   file, which is opened and asked to land on it. */
export const goMark = (id: string): void => {
  const mark = fileMarks.get(id);
  if (mark) { fileOpens.askMark(mark.file, mark.id); void openFile(mark.file, mark.page); return; }
  const n = notes.get(id);
  if (n) goNote(n);
};
