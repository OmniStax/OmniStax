/* three.js on demand. Only a handful of the book's figure scripts draw in three
   dimensions, so the 600KB vendor script is no longer a tag on every page: the
   registry asks here before it boots a section, and the script is fetched the
   first time a figure reaches for it.

   What a script can reach through `F` that needs the global is `F.view3d`, the
   viewer, and `F.mesh`, the bundle every mesh helper hangs off (`F.mesh.sphere`
   and the rest), so those two words in the script's source are the whole test.
   It is a text test, and so generous by design: a figure that names one of them
   and never calls it costs one fetch, and one that calls neither costs none. */
export type ThreeUrl = string;

/* the two names of the library that read `window.THREE` */
const THREE_WORDS = /\b(?:view3d|mesh)\b/;

/* Whether this section's script draws in three dimensions. Pure: the source text is the evidence. */
export const needsThree = (f: Function): boolean => THREE_WORDS.test(String(f));

/* Whether the global is already there — the script loaded, or a page that carries its own tag. */
export const hasThree = (): boolean => (window as unknown as { THREE?: unknown }).THREE !== undefined;

/* one fetch however many askers, kept for the life of the page */
let pending: Promise<void> | null = null;

/* Insert the classic script once and resolve when `window.THREE` stands; a
   script that will not load rejects, and every asker waiting on it rejects with it. */
export function ensureThree(url: ThreeUrl): Promise<void> {
  if (hasThree()) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => (hasThree() ? res() : rej(new Error(`three.js loaded without THREE: ${url}`)));
    s.onerror = () => rej(new Error(`three.js failed to load: ${url}`));
    document.head.appendChild(s);
  });
  return pending;
}
