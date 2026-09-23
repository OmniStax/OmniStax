/* Where the picker's tree comes from. Each level is read out of the store that
   already holds it — the books from the registry and the practice cache, the
   reader's own things from the explorer and the note store — so nothing is
   gathered twice, and a level is read only when it is walked into or searched.

   The rows say what a thing is called; what a chat would send the model for a
   section is gathered only when the row is chosen, by `chipOf`, because a
   section's whole text is far too much to hold for every row of a list nobody
   has scrolled. */
import { registry } from '../sections/registry.svelte';
import { label as sectionLabel } from '../sections/grouping';
import { noteDocs } from '../notes/docs.svelte';
import { explorer } from '../explorer/store.svelte';
import { childrenOf, pathOf, type Entry, type EntryId } from '../explorer/model';
import { books } from '../practice/books.svelte';
import { figureInfo } from '../notes/md/figinfo';
import { chats } from '../chat/store.svelte';
import { firstWords, spokenIn } from '../chat/model';
import { chip, type Chip } from '../chat/context';
import { bookId, noteId, sectionId, sectionRef, type BookId, type ChatId, type SectionRef } from '../types/ids';
import { focus } from '../sections/focus.svelte';
import { linkInner } from '../notes/md/links';
import type { ChapterEntry, SectionEntry } from '../content/schema';
import { CATEGORY_CHIP, type PickerNode, type PickerRow } from './model';

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const plain = (s: string): string => s.replace(/\$[^$]*\$/g, '').replace(/\s+/g, ' ').trim();
const count = (n: number, one: string, many: string): string => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/* ── the text of a section ─────────────────────────────────────────────── */

/* What the model is shown for a section: its words, with every figure replaced
   by what its caption says, since a picture of a pendulum is nothing to a
   model and "Figure 16.3: a pendulum of length L" is something. A section that
   has not been fetched has no text here, and the caller asks the registry for
   it first. */
export const sectionTextOf = (ref: SectionRef): string => {
  const doc = registry.state(ref)?.docs.text;
  if (!doc) return '';
  const copy = doc.cloneNode(true) as HTMLElement;
  for (const fig of copy.querySelectorAll('figure')) {
    const caption = (fig.querySelector('figcaption')?.textContent ?? fig.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim();
    const stand = copy.ownerDocument.createElement('p');
    stand.textContent = caption ? `[${caption}]` : '[a figure]';
    fig.replaceWith(stand);
  }
  for (const el of copy.querySelectorAll('script, style')) el.remove();
  return (copy.textContent ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
};

/* Every book standing loaded, the focused one first; a row of another book says which book it is. */
export const loadedBooks = (): readonly BookId[] => {
  const here = focus.book;
  return [here, ...Object.keys(registry.books).map(bookId).filter((b) => b !== here)].filter((b) => registry.hasBook(b));
};
export const inBook = (book: BookId, detail: string): string => (book === focus.book ? detail : `${registry.manifest(book).title} · ${detail}`);

/* ── a section's things ────────────────────────────────────────────────── */

/* Only a section that has been fetched holds its figures, because a figure is
   in the section's own HTML; walking into the section fetches it.

   Reading them means walking the whole of a section's DOM, so each section's
   rows are held against the document they were read from. The registry hands
   out a new element when a section is fetched again and never touches the old
   one, so the identity of that element is exactly the question "are these rows
   still the section's?", and a map that holds its keys weakly lets a section
   that is dropped take its rows with it. */
const figureCache = new WeakMap<HTMLElement, readonly PickerRow[]>();
const readFigures = (book: BookId, id: string, doc: HTMLElement): readonly PickerRow[] =>
  [...doc.querySelectorAll<HTMLElement>('figure[id]')].flatMap((fig): readonly PickerRow[] => {
    const local = fig.id.startsWith(`${id}-`) ? fig.id.slice(id.length + 1) : fig.id;
    const info = figureInfo(doc, sectionId(id), local);
    if (!info) return [];
    return [{
      category: 'figures', key: `${book}/${id}:${local}`, label: cut(plain(`${info.eyebrow} ${info.title}`), 60), detail: '',
      target: { kind: 'figure', book, section: id, id: local }, embed: true,
      text: [info.eyebrow, info.title, info.caption].filter((s) => s !== '').join('\n'),
    }];
  });
const figuresOf = (book: BookId, id: string): readonly PickerRow[] => {
  const doc = registry.state(sectionRef(book, sectionId(id)))?.docs.text; if (!doc) return [];
  const held = figureCache.get(doc); if (held) return held;
  const read = readFigures(book, id, doc); figureCache.set(doc, read); return read;
};

const dataOf = (book: BookId, ch: ChapterEntry) => registry.chapter(book, ch.dir);

const conceptsOf = (book: BookId, ch: ChapterEntry, sec: string): readonly PickerRow[] =>
  (dataOf(book, ch)?.concepts.concepts ?? []).filter((c) => c.status === 'built' && c.section === sec).map((c): PickerRow => ({
    category: 'concepts', key: `${book}/${c.id}`, label: plain(c.name), detail: '', target: { kind: 'concept', book, section: c.section, id: c.id }, embed: true,
    text: [plain(c.name), c.status === 'built' ? c.why ?? '' : ''].filter((s) => s !== '').join('\n'),
  }));
const equationsOf = (book: BookId, ch: ChapterEntry, sec: string): readonly PickerRow[] =>
  (dataOf(book, ch)?.formulas.equations ?? []).filter((e) => e.section === sec).map((e): PickerRow => ({
    category: 'equations', key: `${book}/${e.id}`, label: cut(e.latex || e.id, 60), detail: e.condition ?? '', target: { kind: 'equation', book, section: e.section, id: e.id }, embed: true,
    text: [`$$${e.latex || e.tex}$$`, e.condition ? `Holds under: ${e.condition}` : ''].filter((s) => s !== '').join('\n'),
  }));
const definitionsOf = (book: BookId, ch: ChapterEntry, sec: string): readonly PickerRow[] => {
  const f = dataOf(book, ch)?.formulas; if (!f) return [];
  return [
    ...f.glossary.filter((g) => g.section === sec).map((g): PickerRow => ({
      category: 'definitions', key: `term:${book}/${g.section}:${g.term}`, label: g.term, detail: 'term', target: { kind: 'term', book, section: g.section, term: g.term }, embed: true,
      text: `${g.term}: ${g.definition}`,
    })),
    ...f.variables.filter((v) => v.section === sec).map((v): PickerRow => ({
      category: 'definitions', key: `sym:${book}/${v.section}:${v.sym}`, label: cut(`${v.sym} · ${v.meaning}`, 60), detail: 'symbol', target: { kind: 'symbol', book, section: v.section, sym: v.sym }, embed: true,
      text: `${v.sym}: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`,
    })),
  ];
};
const exercisesOf = (book: BookId, sec: string): readonly PickerRow[] =>
  (books.exercises(book, sectionId(sec)) ?? []).map((ex): PickerRow => ({
    category: 'exercises', key: `${book}/${sec}:${ex.id}`, label: cut(plain(ex.prompt), 70), detail: registry.manifest(book).exerciseKinds[ex.kind] ?? ex.kind,
    target: { kind: 'exercise', book, section: sec, id: ex.id }, embed: true, text: plain(ex.prompt),
  }));

const leaf = (row: PickerRow): PickerNode => ({ key: row.key, label: row.label, detail: row.detail, row });
/* A kind under a section: a folder of rows, shown only when it holds any. */
const kind = (key: string, label: string, rows: readonly PickerRow[]): readonly PickerNode[] =>
  rows.length ? [{ key, label, detail: String(rows.length), children: () => rows.map(leaf) }] : [];

/* ── the books ─────────────────────────────────────────────────────────── */

const sectionNode = (book: BookId, ch: ChapterEntry, s: SectionEntry): PickerNode => {
  const row: PickerRow = { category: 'sections', key: `${book}/${s.id}`, label: sectionLabel(s.id, s.title), detail: '', target: { kind: 'section', book, section: s.id } };
  return {
    key: s.id, label: row.label, detail: '', row,
    children: () => [
      ...kind('figures', 'Figures', figuresOf(book, s.id)),
      ...kind('concepts', 'Concepts', conceptsOf(book, ch, s.id)),
      ...kind('equations', 'Equations', equationsOf(book, ch, s.id)),
      ...kind('definitions', 'Definitions', definitionsOf(book, ch, s.id)),
      ...kind('exercises', 'Exercises', exercisesOf(book, s.id)),
    ],
    load: () => registry.load(sectionRef(book, sectionId(s.id))),
  };
};

const builtOf = (ch: ChapterEntry): readonly SectionEntry[] => [...(ch.intro ? [ch.intro] : []), ...ch.sections, ...(ch.summary ? [ch.summary] : [])].filter((s) => s.built);

const chapterNode = (book: BookId, ch: ChapterEntry): PickerNode => {
  const secs = builtOf(ch);
  const row: PickerRow = {
    category: 'chapters', key: `${book}/${ch.id}`, label: ch.title, detail: '',
    text: [ch.title, ...secs.map((s) => sectionLabel(s.id, s.title))].join('\n'),
  };
  return { key: ch.id, label: ch.title, detail: count(secs.length, 'section', 'sections'), row, children: () => secs.map((s) => sectionNode(book, ch, s)) };
};

/* A book's chapters come with its manifest; its concepts, tables and problem
   sets are fetched when the reader walks into it. */
const loadBook = async (book: BookId): Promise<void> => {
  const m = await registry.ensureBook(book).catch(() => null); if (!m) return;
  const dirs = m.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir);
  await Promise.all([registry.loadChapters(book, dirs), books.load(book)]).catch(() => {});
};

const bookNode = (book: BookId): PickerNode => {
  const m = registry.hasBook(book) ? registry.manifest(book) : undefined;
  const chapters = (m?.chapters ?? []).filter((c) => builtOf(c).length > 0);
  const title = books.title(book);
  const row: PickerRow = { category: 'books', key: book, label: title, detail: '', text: [title, ...chapters.map((c) => c.title)].join('\n') };
  return { key: book, label: title, detail: m ? count(chapters.length, 'chapter', 'chapters') : '', row, children: () => chapters.map((c) => chapterNode(book, c)), load: () => loadBook(book) };
};

/* The reader's books: those in the explorer, and any other the registry holds, the focused one first. */
const readerBooks = (): readonly BookId[] => {
  const listed = explorer.tree.entries.flatMap((e) => (e.kind === 'book' && e.bookId ? [bookId(e.bookId)] : []));
  const all = [focus.book, ...listed, ...Object.keys(registry.books).map(bookId)].filter((b) => !!b);
  return [...new Set(all)];
};

/* ── the reader's files ────────────────────────────────────────────────── */

const entryRow = (e: Entry, where: string): PickerRow | undefined => {
  if (e.kind === 'note') { const d = noteDocs.get(noteId(e.id)); return { category: 'notes', key: e.id, label: e.name, detail: where, target: { kind: 'note', name: e.name }, text: d?.body ?? '' }; }
  if (e.kind === 'drawing' && e.drawingId) return { category: 'drawings', key: e.drawingId, label: e.name, detail: where, target: { kind: 'drawing', id: e.drawingId } };
  if (e.kind === 'file' && e.fileId) return { category: 'files', key: e.fileId, label: e.name, detail: where, target: { kind: 'file', file: e.fileId } };
  return undefined;
};

const entryNodes = (parent: EntryId | null): readonly PickerNode[] =>
  childrenOf(explorer.tree, parent).flatMap((e): readonly PickerNode[] => {
    if (e.kind === 'book') return [];
    if (e.kind === 'folder') {
      const inside = childrenOf(explorer.tree, e.id).filter((c) => c.kind !== 'book');
      const row: PickerRow = { category: 'folders', key: e.id, label: e.name, detail: '', text: [pathOf(explorer.tree, e.id), ...inside.map((c) => c.name)].join('\n') };
      return [{ key: e.id, label: e.name, detail: count(inside.length, 'item', 'items'), row, children: () => entryNodes(e.id) }];
    }
    const row = entryRow(e, e.kind); return row ? [leaf(row)] : [];
  });

/* ── the root ──────────────────────────────────────────────────────────── */

/* The two places the picker opens on. Opening OmniBooks, or searching from the
   top, fetches the focused book's tables, so its things are found at once. */
export const pickerRoot = (): readonly PickerNode[] => [
  { key: 'books', label: 'OmniBooks', detail: '', children: () => readerBooks().map(bookNode), load: () => Promise.all(readerBooks().map((b) => registry.ensureBook(b).catch(() => null))).then(() => loadBook(focus.book)) },
  { key: 'files', label: 'Files', detail: '', children: () => entryNodes(null) },
];

/* The chip a row becomes. A section's text is read here rather than held on
   the row, and a section that has not been fetched is asked for, so the chip
   fills in as soon as it lands. */
export const chipOf = (row: PickerRow): Chip => {
  const kind = CATEGORY_CHIP[row.category];
  const key = row.target ? linkInner(row.target) : `${kind}:${row.key}`;
  if (row.target?.kind === 'section') {
    const ref = sectionRef(row.target.book ?? focus.book, sectionId(row.target.section));
    return chip(kind, key, row.label, sectionTextOf(ref));
  }
  return chip(kind, key, row.label, row.text ?? row.label);
};

/* A chat's own opening, for the row that names a whole chat. */
export const chatOpening = (id: ChatId): string => {
  const chat = chats.get(id);
  return chat ? firstWords(spokenIn(chat)[0]?.text ?? '', 12) : '';
};
