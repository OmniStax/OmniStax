/* The pages of the reader's own files, as the search reads them. The text was
   pulled out at import and kept in the `text` store, so this only fetches what
   is already there — once for the session, and again whenever a file is
   imported or deleted.

   A file with no text stored is not always a file with no text: a profile
   restored from a backup carries the bytes and not the pages, since the pages
   are derived from the bytes. Such a file is read once, here, and its pages
   are written where the import would have written them. */
import { files } from '../files/store.svelte';
import { getText, getBlob, putText } from '../files/blobs';
import { extractText } from '../files/text';
import type { FileId } from '../types/ids';
import { fileEntries, type FileEntry } from './files';

class FileCorpus {
  /* The pages of each file, by id; a file that has been looked at and has no
     text stands here as an empty list, so it is not looked at again. */
  private pages = $state.raw<Readonly<Record<string, readonly string[]>>>({});
  private asked = new Set<string>();
  entries = $state.raw<readonly FileEntry[]>([]);
  busy = $state(false);

  /* Every PDF the reader has, read from the text store. Images have no text. */
  async load(): Promise<void> {
    const wanted = files.list.filter((f) => f.type === 'pdf');
    const missing = wanted.filter((f) => !this.asked.has(f.id));
    if (!missing.length) { this.rebuild(); return; }
    this.busy = true;
    try {
      await Promise.all(missing.map(async (f) => {
        this.asked.add(f.id);
        this.pages = { ...this.pages, [f.id]: await this.pagesOf(f.id) };
      }));
    } finally { this.busy = false; this.rebuild(); }
  }

  /* What the store has, or — for a file restored from a backup — what the
     bytes say, extracted once and written down. */
  private async pagesOf(id: FileId): Promise<readonly string[]> {
    const stored = await getText(id);
    if (stored) return stored;
    const blob = await getBlob(id);
    if (!blob) return [];
    try {
      const pages = await extractText(await blob.arrayBuffer());
      await putText(id, pages);
      return pages;
    } catch { return []; }
  }

  private rebuild(): void {
    this.entries = fileEntries(files.list.filter((f) => f.type === 'pdf'), (id) => this.pages[id] ?? null);
  }
}
export const fileCorpus = new FileCorpus();
