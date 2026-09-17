/* The page's boot data: the book's manifest and, on a page of the book, the
   concepts and formulas of the chapter it stands in. It is far the largest
   thing the shell needs and none of it is the reader's, so the page carries it
   as one JSON script rather than as island props, which Astro would have to
   wrap and escape value by value into an attribute. The shell reads it at
   setup, synchronously, the way the registry reads a section's own data out of
   the pool — see `sectionDataOf` in registry.svelte.ts and the script
   `fragment.ts` writes beside every article. */
import type { BookManifest, ConceptsDTO, FormulasDTO } from '../content/schema';

export type BootId = 'omnistax-boot';
export const BOOT_ID: BootId = 'omnistax-boot';

/* What the page carries and the shell parses. The chapter pair is absent on the
   two standing pages, which stand in no chapter. */
export type BootDTO = {
  readonly manifest: BookManifest;
  readonly chapterDir?: string;
  readonly chapterData?: { readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO };
};

/* The body of the script element. A `<` anywhere in the data — a title, a bit of
   prose in a concept — would otherwise be free to close the element early, so
   every one of them goes in escaped; JSON reads `<` back as `<`. */
export const bootJson = (boot: BootDTO): string => JSON.stringify(boot).replace(/</g, '\\u003c');

/* The other end, in the browser. A page without the script is a build that did
   not write one, which is a bug to hear about rather than a state to run in. */
export const parseBoot = (doc: ParentNode): BootDTO => {
  const el = doc.querySelector(`script#${BOOT_ID}`);
  if (!el) throw new Error(`no #${BOOT_ID} script on this page`);
  return JSON.parse(el.textContent ?? '') as BootDTO;
};
