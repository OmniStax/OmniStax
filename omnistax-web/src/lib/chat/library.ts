/* The live `Library` the chat's tools read: the reader's shelf, the registry's
   manifests and sections, the search corpora and the figures as they stand.
   And the chips the composer puts up, with what each sends read in. */
import { registry } from '../sections/registry.svelte';
import { library as shelf } from '../explorer/library.svelte';
import { focus } from '../sections/focus.svelte';
import { searchStore } from '../search/store.svelte';
import { chipOf, sectionTextOf } from '../picker/sources';
import type { PickerRow } from '../picker/model';
import { getDrawing } from '../drawer/db';
import { getText } from '../files/blobs';
import { assetEmbed, snapshotFigure } from '../drawer/snapshot';
import { figureInfo, findFigure } from '../notes/md/figinfo';
import { paramsOf } from '../fig/params';
import { bookId, fileId, sectionId, sectionRef } from '../types/ids';
import { chip, type Chip } from './context';
import { figureSource, paramLines, type FigureFacts, type Library, type TocChapter } from './tools';

const refOf = (book: string, section: string) => sectionRef(bookId(book), sectionId(section));

const loadedSection = async (book: string, section: string): Promise<HTMLElement | null> => {
  const ref = refOf(book, section);
  await registry.load(ref).catch(() => {});
  return registry.state(ref)?.docs.text ?? null;
};

/* The figure's controls as they read now, from the copy of it the reader
   sees. */
const figureParams = (fig: Element): FigureFacts['params'] =>
  paramsOf(fig).map((p) => ({ label: p.label, value: p.value, ...(p.unit ? { unit: p.unit } : {}) }));

const altOf = (fig: Element): string => fig.getAttribute('aria-label') ?? fig.querySelector('img')?.getAttribute('alt') ?? '';

export const liveLibrary: Library = {
  async books() {
    await shelf.load().catch(() => {});
    return shelf.shelf(focus.book).map((id) => ({ id, title: shelf.book(id)?.title || registry.manifest(bookId(id)).title || id }));
  },
  async chapters(book) {
    const m = await registry.ensureBook(bookId(book)); if (!m) return null;
    return m.chapters.map((c): TocChapter => ({ id: c.id, title: c.title, sections: c.sections.map((s) => ({ id: s.id, title: s.title, built: s.built })) }));
  },
  async section(book, section) {
    const doc = await loadedSection(book, section); if (!doc) return null;
    return { title: registry.entry(refOf(book, section))?.title ?? '', text: sectionTextOf(refOf(book, section)) };
  },
  async corpus(book) {
    await searchStore.load(book);
    return registry.hasBook(bookId(book)) ? searchStore.corpora[book] ?? null : null;
  },
  symbolTex: (book, sym) => (registry.hasBook(bookId(book)) ? registry.manifest(bookId(book)).symbols[sym] ?? null : null),
  async figure(book, section, id, source) {
    const doc = await loadedSection(book, section); if (!doc) return null;
    const fig = findFigure(doc, sectionId(section), id);
    const info = figureInfo(doc, sectionId(section), id);
    if (!fig || !info) return null;
    const url = registry.entry(refOf(book, section))?.figuresJs ?? '';
    const js = source && url ? await fetch(url).then((r) => (r.ok ? r.text() : '')).catch(() => '') : '';
    return {
      caption: [info.eyebrow, info.title, info.caption].filter(Boolean).join(' — '),
      alt: altOf(fig),
      params: figureParams(fig),
      ...(js ? { source: figureSource(js, id) } : {}),
    };
  },
};

/* A picker row as the chip the model is shown, with everything it needs read
   in: a section fetched for its text, a drawing's words, a file's pages, and
   a figure's caption, alt text, parameter values and a snapshot. */
export const chipOfRow = async (row: PickerRow): Promise<Chip> => {
  const t = row.target;
  const base = chipOf(row);
  if (t?.kind === 'section') {
    const book = t.book ?? focus.book; if (!book) return base;
    await loadedSection(book, t.section);
    return { ...base, text: sectionTextOf(refOf(book, t.section)) };
  }
  if (t?.kind === 'drawing') {
    const d = await getDrawing(t.id).catch(() => null);
    const words = (d?.items ?? []).flatMap((i) => (i.kind === 'box' && i.body.trim() ? [i.body.trim()] : i.kind === 'frame' ? [`[${i.embed}]`] : []));
    return { ...base, text: [`Drawing "${row.label}"`, ...words].join('\n\n') };
  }
  if (t?.kind === 'file') {
    const pages = await getText(fileId(t.file)).catch(() => null);
    return { ...base, text: pages?.length ? pages.map((p, i) => `[page ${i + 1}]\n${p}`).join('\n\n') : row.label };
  }
  if (t?.kind === 'figure') {
    const book = t.book ?? focus.book; if (!book) return base;
    const doc = await loadedSection(book, t.section);
    const fig = doc ? findFigure(doc, sectionId(t.section), t.id) : null;
    if (!fig) return base;
    const shot = await snapshotFigure(fig).catch(() => null);
    const alt = altOf(fig);
    const text = [base.text, alt && `Alt text: ${alt}`, paramLines(figureParams(fig))].filter(Boolean).join('\n\n');
    return chip(base.kind, base.key, base.label, text, false, shot ? assetEmbed(shot.asset) : undefined);
  }
  return base;
};
