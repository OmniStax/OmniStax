/* Where the picker's rows come from. Each category is read out of the store
   that already holds it — the notes from the note store, the sections from the
   registry, the chats from the chat index — so nothing is gathered twice and a
   category whose store holds nothing is simply empty.

   The rows say what a thing is called; what a chat would send the model is
   gathered only when a row is chosen, by `textOf`, because a section's whole
   text is far too much to hold for every row of a list nobody has scrolled. */
import { registry } from '../sections/registry.svelte';
import { label as sectionLabel } from '../sections/grouping';
import { noteDocs } from '../notes/docs.svelte';
import { explorer } from '../explorer/store.svelte';
import { books } from '../practice/books.svelte';
import { figureInfo } from '../notes/md/figinfo';
import { chats } from '../chat/store.svelte';
import { firstWords, spokenIn } from '../chat/model';
import { chip, type Chip } from '../chat/context';
import { sectionId, type ChatId, type SectionId } from '../types/ids';
import { linkInner } from '../notes/md/links';
import { CATEGORY_CHIP, type PickerCategory, type PickerRow } from './model';

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const plain = (s: string): string => s.replace(/\$[^$]*\$/g, '').replace(/\s+/g, ' ').trim();

/* ── the text of a section ─────────────────────────────────────────────── */

/* What the model is shown for a section: its words, with every figure replaced
   by what its caption says, since a picture of a pendulum is nothing to a
   model and "Figure 16.3: a pendulum of length L" is something. A section that
   has not been fetched has no text here, and the caller asks the registry for
   it first. */
export const sectionTextOf = (id: SectionId): string => {
  const doc = registry.state(id)?.docs.text;
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

/* ── the rows ──────────────────────────────────────────────────────────── */

const noteRows = (): readonly PickerRow[] =>
  noteDocs.list.map((d) => ({ category: 'notes' as const, key: d.id, label: d.name, detail: 'note', target: { kind: 'note' as const, name: d.name }, text: d.body }));

/* The files and the drawings are the reader's own rows of the explorer, which
   is where both of them are named; what is inside one belongs to the feature
   that owns it, so a chip of one carries its name until that lands. */
const ownRows = (kind: 'file' | 'drawing', category: PickerCategory): readonly PickerRow[] =>
  explorer.tree.entries.flatMap((e) => {
    if (e.kind !== kind) return [];
    const id = kind === 'file' ? e.fileId : e.drawingId;
    if (!id) return [];
    return [{ category, key: id, label: e.name, detail: kind, target: kind === 'file' ? { kind: 'file' as const, file: id } : { kind: 'drawing' as const, id } }];
  });

const sectionRows = (): readonly PickerRow[] =>
  registry.manifest.chapters.flatMap((c) => c.sections.filter((s) => s.built).map((s) => ({
    category: 'sections' as const, key: s.id, label: sectionLabel(s.id, s.title), detail: c.title, target: { kind: 'section' as const, section: s.id },
  })));

/* Only the sections that have been fetched hold figures, because a figure is in
   the section's own HTML; the others are reached by opening them.

   Reading them means walking the whole of a section's DOM, and with a chapter
   open that is the slowest thing the list does, so each section's rows are
   held against the document they were read from. The registry hands out a new
   element when a section is fetched again and never touches the old one, so
   the identity of that element is exactly the question "are these rows still
   the section's?", and a map that holds its keys weakly lets a section that is
   dropped take its rows with it. */
const figureCache = new WeakMap<HTMLElement, readonly PickerRow[]>();

const figuresOf = (id: string, doc: HTMLElement): readonly PickerRow[] => {
  const held = figureCache.get(doc);
  if (held) return held;
  const read = readFigures(id, doc);
  figureCache.set(doc, read);
  return read;
};

const figureRows = (): readonly PickerRow[] =>
  Object.entries(registry.sections).flatMap(([id, state]) => {
    const doc = state.docs.text; if (!doc) return [];
    return figuresOf(id, doc);
  });

const readFigures = (id: string, doc: HTMLElement): readonly PickerRow[] =>
  [...doc.querySelectorAll<HTMLElement>('figure[id]')].flatMap((fig): readonly PickerRow[] => {
    const local = fig.id.startsWith(`${id}-`) ? fig.id.slice(id.length + 1) : fig.id;
    const info = figureInfo(doc, sectionId(id), local);
    if (!info) return [];
    return [{
      category: 'figures' as const, key: `${id}:${local}`, label: cut(plain(`${info.eyebrow} ${info.title}`), 60), detail: `section ${id}`,
      target: { kind: 'figure' as const, section: id, id: local }, embed: true,
      text: [info.eyebrow, info.title, info.caption].filter((s) => s !== '').join('\n'),
    }];
  });

const chapterRows = (): readonly PickerRow[] => Object.values(registry.chapters).flatMap((ch) => [
  ...ch.concepts.concepts.filter((c) => c.status === 'built').map((c): PickerRow => ({
    category: 'concepts', key: c.id, label: plain(c.name), detail: `concept · ${c.section}`, target: { kind: 'concept', section: c.section, id: c.id }, embed: true,
    text: [plain(c.name), c.status === 'built' ? c.why ?? '' : ''].filter((s) => s !== '').join('\n'),
  })),
  ...ch.formulas.equations.map((e): PickerRow => ({
    category: 'equations', key: e.id, label: cut(e.latex || e.id, 60), detail: ['equation', e.section, e.condition].filter((s) => !!s).join(' · '), target: { kind: 'equation', section: e.section, id: e.id }, embed: true,
    text: [`$$${e.latex || e.tex}$$`, e.condition ? `Holds under: ${e.condition}` : ''].filter((s) => s !== '').join('\n'),
  })),
  ...ch.formulas.glossary.map((g): PickerRow => ({
    category: 'definitions', key: `term:${g.section}:${g.term}`, label: g.term, detail: `term · ${g.section}`, target: { kind: 'term', section: g.section, term: g.term }, embed: true,
    text: `${g.term}: ${g.definition}`,
  })),
  ...ch.formulas.variables.map((v): PickerRow => ({
    category: 'definitions', key: `sym:${v.section}:${v.sym}`, label: cut(`${v.sym} · ${v.meaning}`, 60), detail: `symbol · ${v.section}`, target: { kind: 'symbol', section: v.section, sym: v.sym }, embed: true,
    text: `${v.sym}: ${v.meaning}${v.unit ? ` (${v.unit})` : ''}`,
  })),
]);

/* The book's whole problem set, which is one file beside the book's pages;
   `warm` asks for it, and until it lands the category is empty. */
const exerciseRows = (): readonly PickerRow[] => {
  const book = registry.manifest.id;
  return registry.manifest.chapters.flatMap((c) => c.sections.filter((s) => s.built).flatMap((s) =>
    (books.exercises(book, sectionId(s.id)) ?? []).map((ex): PickerRow => ({
      category: 'exercises', key: `${s.id}:${ex.id}`, label: cut(plain(ex.prompt), 70), detail: `${registry.manifest.exerciseKinds[ex.kind] ?? ex.kind} · ${s.id}`,
      target: { kind: 'exercise', section: s.id, id: ex.id }, embed: true, text: plain(ex.prompt),
    }))));
};

/* Every message of every chat that has been opened in this session. A chat
   nobody has opened is one record in a database, and reading them all to fill
   a list would be a lot of reading for a row the reader may never look at. */
const messageRows = (): readonly PickerRow[] =>
  Object.values(chats.open).flatMap((chat) => spokenIn(chat).map((m): PickerRow => ({
    category: 'messages', key: `${chat.id}:${m.id}`, label: firstWords(m.text, 12), detail: `${m.role === 'user' ? 'you' : 'the model'} · ${chat.name || 'chat'}`,
    target: { kind: 'chat', chat: chat.id, message: m.id }, embed: true, text: m.text,
  })));

export const allRows = (): readonly PickerRow[] => [
  ...noteRows(), ...ownRows('drawing', 'drawings'), ...ownRows('file', 'files'),
  ...sectionRows(), ...figureRows(), ...chapterRows(), ...exerciseRows(), ...messageRows(),
];

/* What a category needs fetched before its rows mean anything: the exercises
   are one file, and the chapters' tables are what the companion views already
   ask for. Called when the reader opens the category, not before. It answers
   when what it asked for has landed, because the rows are gathered once when
   the picker opens and whoever opened it must gather them again after this. */
export const warm = async (category: PickerCategory | null): Promise<void> => {
  if (category === 'exercises') await books.load(registry.manifest.id).catch(() => {});
  if (category === 'concepts' || category === 'equations' || category === 'definitions') {
    const dirs = registry.manifest.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir);
    await registry.loadChapters(dirs).catch(() => {});
  }
};

/* The chip a row becomes. A section's text is read here rather than held on
   the row, and a section that has not been fetched is asked for, so the chip
   fills in as soon as it lands. */
export const chipOf = (row: PickerRow): Chip => {
  const kind = CATEGORY_CHIP[row.category];
  const key = linkInner(row.target);
  if (row.category === 'sections' && row.target.kind === 'section') {
    const id = sectionId(row.target.section);
    return chip(kind, key, row.label, sectionTextOf(id));
  }
  return chip(kind, key, row.label, row.text ?? row.label);
};

/* A chat's own opening, for the row that names a whole chat. */
export const chatOpening = (id: ChatId): string => {
  const chat = chats.get(id);
  return chat ? firstWords(spokenIn(chat)[0]?.text ?? '', 12) : '';
};
