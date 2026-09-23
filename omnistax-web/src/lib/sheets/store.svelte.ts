/* The book's sheets as the shell holds them: what has been fetched, which
   element the elements page is pinned on, and the roots still waiting for the
   table before their formulas can be marked.

   A sheet is data rather than a document, so nothing here adopts any DOM: the
   page component reads the sheet out of this store and draws it, and the hover
   layer reads the same table to decide what in the prose is a formula. The
   elements sheet is fetched the first time anything asks for it, which is
   whichever comes first of the page opening and a document being prepared. */
import { registry } from '../sections/registry.svelte';
import { assumedBook } from '../sections/focus.svelte';
import { SheetDataSchema } from '../content/sheets';
import type { ElementsSheetDTO, SheetDataDTO } from '../content/sheets';
import type { SheetEntry } from '../content/schema';
import { type ElementSymbol, type ElementTable, elementSymbol } from './formula';
import { tableOf } from './elements';

export type SheetStatus = 'loaded' | 'loading' | 'failed';
const EMPTY: ElementTable = new Map();

class Sheets {
  data = $state.raw<Readonly<Record<string, SheetDataDTO>>>({});
  status = $state.raw<Readonly<Record<string, SheetStatus>>>({});
  /* The element the elements page stands on, which a formula card's "Go to" sets before the page opens. */
  pinned = $state.raw<ElementSymbol | null>(null);
  private waiting: HTMLElement[] = [];
  private mark: (root: HTMLElement) => void = () => {};

  /* The formula layer hands in the pass that marks one document, so this file
     needs to know nothing about the prose. */
  init(mark: (root: HTMLElement) => void): void { this.mark = mark; }

  entry(id: string): SheetEntry | undefined { return registry.manifest(assumedBook()).sheets.find((s) => s.id === id); }
  /* The one elements sheet a book may declare; nothing for a book that declares none, and physics declares none. */
  get elementsEntry(): SheetEntry | undefined { return registry.manifest(assumedBook()).sheets.find((s) => s.kind === 'elements'); }
  get elements(): ElementsSheetDTO | null {
    const e = this.elementsEntry; const d = e ? this.data[e.id] : undefined;
    return d && d.kind === 'elements' ? d : null;
  }
  get table(): ElementTable { const s = this.elements; return s ? tableOf(s) : EMPTY; }

  load(id: string): Promise<void> {
    const entry = this.entry(id);
    if (!entry || this.data[id] || this.status[id] === 'loading') return Promise.resolve();
    this.status = { ...this.status, [id]: 'loading' };
    return fetch(entry.data)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((raw: unknown) => {
        this.data = { ...this.data, [id]: SheetDataSchema.parse(raw) };
        this.status = { ...this.status, [id]: 'loaded' };
        const roots = this.waiting; this.waiting = [];
        roots.forEach((root) => { if (root.isConnected) this.mark(root); });
      })
      .catch(() => { this.status = { ...this.status, [id]: 'failed' }; });
  }
  /* A document prepared before the table arrived: fetch it, and mark that document once it has. */
  wantElements(root: HTMLElement): void {
    const entry = this.elementsEntry; if (!entry) return;
    if (!this.waiting.includes(root)) this.waiting.push(root);
    void this.load(entry.id);
  }
  pin(symbol: string | null): void { this.pinned = symbol === null ? null : elementSymbol(symbol); }
}
export const sheets = new Sheets();
