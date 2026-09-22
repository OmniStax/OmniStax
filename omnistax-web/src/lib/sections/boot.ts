/* The page's boot data: the book's manifest and, on a page of the book, the
   concepts and formulas of the chapter it stands in. It is far the largest
   thing the shell needs and none of it is the page's own, so the page carries
   only where it lives — the book's book.json and the chapter's two files, the
   same addresses the registry fetches for any other chapter — and every page
   of a book shares one copy of each. The loader fetches them beside the shell's
   own module and hands the shell the result, so the shell still reads them at
   setup, before `registry.init` in `onMount`. */
import type { BookManifest, ConceptsDTO, FormulasDTO } from '../content/schema';

export type BootUrls = {
  readonly manifest: string;
  readonly chapter?: { readonly dir: string; readonly concepts: string; readonly formulas: string };
};

/* What the shell boots from. The chapter pair is absent on the two standing
   pages, which stand in no chapter. */
export type BootDTO = {
  readonly manifest: BookManifest;
  readonly chapterDir?: string;
  readonly chapterData?: { readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO };
};

const getJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
};

export const loadBoot = async (urls: BootUrls): Promise<BootDTO> => {
  const ch = urls.chapter;
  const [manifest, concepts, formulas] = await Promise.all([
    getJson<BookManifest>(urls.manifest),
    ch ? getJson<ConceptsDTO>(ch.concepts).catch(() => undefined) : undefined,
    ch ? getJson<FormulasDTO>(ch.formulas).catch(() => undefined) : undefined,
  ]);
  return ch && concepts && formulas ? { manifest, chapterDir: ch.dir, chapterData: { concepts, formulas } } : { manifest };
};
