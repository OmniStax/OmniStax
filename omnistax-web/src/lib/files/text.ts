/* The words of a PDF, page by page. They are pulled out once, at import, and
   kept in the `text` store beside the blob, so the search never parses a
   document again and a reader who imports a long book waits once.

   The parsing itself is pdf.js's worker, so the main thread only joins the
   strings up. `joinItems` is pure and is what the test reads. */
import type { FileId } from '../types/ids';
import { putText } from './blobs';
import { openPdf, type TextItem } from './pdfjs';

/* pdf.js hands back one item per run of glyphs, with the run's position in the
   transform. A new line is a new vertical position, so a break between two
   items at different heights is a space and nothing more: the search wants the
   words, not the typesetting. */
export const joinItems = (items: readonly TextItem[]): string =>
  items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();

export type Progress = (done: number, total: number) => void;

/* Every page's text, in order. A page that will not parse contributes nothing
   rather than failing the file: the rest of it is still worth searching. */
export const extractText = async (bytes: ArrayBuffer, onProgress?: Progress): Promise<readonly string[]> => {
  const doc = await openPdf(bytes);
  try {
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      try { pages.push(joinItems((await (await doc.getPage(n)).getTextContent()).items)); }
      catch { pages.push(''); }
      onProgress?.(n, doc.numPages);
    }
    return pages;
  } finally { await doc.destroy().catch(() => {}); }
};

/* What the import does: extract and store, and say how many pages there were
   so the file record can carry the count. A PDF that will not open at all is
   simply not searchable; the tab says so when the reader opens it. */
export const indexPdf = async (id: FileId, bytes: ArrayBuffer, onProgress?: Progress): Promise<number> => {
  try {
    const pages = await extractText(bytes, onProgress);
    await putText(id, pages);
    return pages.length;
  } catch { return 0; }
};
