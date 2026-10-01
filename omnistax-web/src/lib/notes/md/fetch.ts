/* A card that resolved to nothing may only be waiting on what holds it: a
   thing of the book on its chapter, a figure on its section. Each is asked for
   once per pass, and the promise settles when all of them have landed, so a
   host that does not render reactively knows when to render again. */
import { registry } from '../../sections/registry.svelte';
import { secKey } from '../../types/ids';
import type { BookResolver } from '../resolve';
import { isBook, parseLink } from './links';

export const fetchMissing = (el: HTMLElement, books: BookResolver): Promise<unknown> => {
  const asked = new Map<string, Promise<unknown>>();
  for (const d of el.querySelectorAll<HTMLElement>('.wiki.dead[data-embed]')) {
    const t = parseLink(d.dataset.embed ?? '');
    if (t.kind === 'figure') {
      const ref = books.ref(t.section, t.book), key = secKey(ref);
      if (!asked.has(key)) asked.set(key, Promise.resolve(registry.load(ref)).catch(() => {}));
      continue;
    }
    if (!isBook(t)) continue;
    const ref = books.ref(t.section, t.book), dir = books.chapterDir(t.section, t.book);
    const key = `${ref.book}/${dir}`;
    if (dir && !asked.has(key)) asked.set(key, registry.loadChapter(ref.book, dir).catch(() => {}));
  }
  return Promise.all(asked.values());
};
