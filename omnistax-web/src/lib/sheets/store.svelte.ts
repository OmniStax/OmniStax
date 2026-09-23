/* The book's sheets as the shell holds them: what has been fetched, which
   element the elements page is pinned on, and the roots still waiting for the
   table before their formulas can be marked.

   A sheet is data rather than a document, so nothing here adopts any DOM: the
   page component reads the sheet out of this store and draws it, and the hover
   layer reads the same table to decide what in the prose is a formula. The
   elements sheet is fetched the first time anything asks for it, which is
   whichever comes first of the page opening and a document being prepared. */
import { registry } from '../sections/registry.svelte';
import { SheetDataSchema } from '../content/sheets';
import type { ElementsSheetDTO, SheetDataDTO } from '../content/sheets';
import type { SheetEntry } from '../content/schema';
import { type BookId, bookId } from '../types/ids';
import { type ElementSymbol, type ElementTable, elementSymbol } from './formula';
import { tableOf } from './elements';

export type SheetStatus = 'loaded' | 'loading' | 'failed';
const EMPTY: ElementTable = new Map();
/* A sheet's key across books: `<book>/<sheet>`. */
export type SheetKey = string & { readonly __brand: 'SheetKey' };
/* The book a document root belongs to, read here rather than from nav, which imports the hover layer through the registry. */
export const bookOfRoot = (root: HTMLElement): BookId | null => { const b = root.closest<HTMLElement>('[data-book]')?.dataset.book; return b ? bookId(b) : null; };
export const sheetKey = (book: BookId, id: string): SheetKey => `${book}/${id}` as SheetKey;

class Sheets {
  data = $state.raw<Readonly<Record<SheetKey, SheetDataDTO>>>({});
  status = $state.raw<Readonly<Record<SheetKey, SheetStatus>>>({});
  /* The element the elements page stands on, which a formula card's "Go to" sets before the page opens. */
  pinned = $state.raw<ElementSymbol | null>(null);
  private waiting: HTMLElement[] = [];
  private mark: (root: HTMLElement) => void = () => {};

  /* The formula layer hands in the pass that marks one document, so this file
     needs to know nothing about the prose. */
  init(mark: (root: HTMLElement) => void): void { this.mark = mark; }

  entry(book: BookId, id: string): SheetEntry | undefined { return registry.manifest(book).sheets.find((s) => s.id === id); }
  /* The one elements sheet a book may declare; nothing for a book that declares none, and physics declares none. */
  elementsEntry(book: BookId): SheetEntry | undefined { return registry.manifest(book).sheets.find((s) => s.kind === 'elements'); }
  dataOf(book: BookId, id: string): SheetDataDTO | undefined { return this.data[sheetKey(book, id)]; }
  statusOf(book: BookId, id: string): SheetStatus | undefined { return this.status[sheetKey(book, id)]; }
  elements(book: BookId): ElementsSheetDTO | null {
    const e = this.elementsEntry(book); const d = e ? this.dataOf(book, e.id) : undefined;
    return d && d.kind === 'elements' ? d : null;
  }
  table(book: BookId): ElementTable { const s = this.elements(book); return s ? tableOf(s) : EMPTY; }

  load(book: BookId, id: string): Promise<void> {
    const entry = this.entry(book, id); const k = sheetKey(book, id);
    if (!entry || this.data[k] || this.status[k] === 'loading') return Promise.resolve();
    this.status = { ...this.status, [k]: 'loading' };
    return fetch(entry.data)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((raw: unknown) => {
        this.data = { ...this.data, [k]: SheetDataSchema.parse(raw) };
        this.status = { ...this.status, [k]: 'loaded' };
        const roots = this.waiting.filter((r) => bookOfRoot(r) === book); this.waiting = this.waiting.filter((r) => !roots.includes(r));
        roots.forEach((root) => { if (root.isConnected) this.mark(root); });
      })
      .catch(() => { this.status = { ...this.status, [k]: 'failed' }; });
  }
  /* A document prepared before its book's table arrived: fetch it, and mark that document once it has. */
  wantElements(book: BookId, root: HTMLElement): void {
    const entry = this.elementsEntry(book); if (!entry) return;
    if (!this.waiting.includes(root)) this.waiting.push(root);
    void this.load(book, entry.id);
  }
  pin(symbol: string | null): void { this.pinned = symbol === null ? null : elementSymbol(symbol); }
}
export const sheets = new Sheets();
