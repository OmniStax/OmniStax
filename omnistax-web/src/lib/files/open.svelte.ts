/* Where a file tab should land. A tab is named by its file alone — `file:<id>`
   — because a file open twice is one document and not two, so the page a link
   asked for cannot ride in the key. It is asked for here instead: the link
   sets it, the reader picks it up as it mounts or as it is activated again,
   and clears it, so a page is landed on once and scrolling afterwards is the
   reader's own.

   A mark works the same way: a row of the Annotations view asks for the mark
   and the reader flashes it once it has drawn the page it lies on. */
import type { FileId } from '../types/ids';

class FileOpens {
  /* The page each file has been asked to land on, by file id. */
  pages = $state.raw<Readonly<Record<string, number>>>({});
  /* The mark each file has been asked to land on. */
  marks = $state.raw<Readonly<Record<string, string>>>({});

  askPage(file: FileId, page: number): void { this.pages = { ...this.pages, [file]: page }; }
  askMark(file: FileId, mark: string): void { this.marks = { ...this.marks, [file]: mark }; }

  takePage(file: FileId): number | null {
    const page = this.pages[file];
    if (page === undefined) return null;
    const { [file as string]: _gone, ...rest } = this.pages;
    this.pages = rest;
    return page;
  }
  takeMark(file: FileId): string | null {
    const mark = this.marks[file];
    if (mark === undefined) return null;
    const { [file as string]: _gone, ...rest } = this.marks;
    this.marks = rest;
    return mark;
  }
}
export const fileOpens = new FileOpens();
