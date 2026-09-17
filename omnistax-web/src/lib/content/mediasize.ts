/* The sizes of one page's images, read off the book's media folder at build
   time. This is the one impure half of the pair: `imagesize.ts` reads bytes and
   knows nothing of disks, and this reads the first bytes of each file a page
   names and hands back the map that `sizedImages` looks things up in.

   Only the head of a file is read — every format this knows keeps its size in
   the first kilobytes — so a chapter of half-megabyte photographs costs a few
   pages of I/O rather than the whole folder. A file that is missing, that is an
   SVG, or that no format claims simply does not appear in the map, and its
   image is written as it always was. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Dimensions, type SizeLookup, dimensionsOf, imageSrcs } from './imagesize';

export type MediaRoot = string;   /* a book's `media` folder, the root of the `/media/…` address space */

/* Enough of a file to carry a PNG, GIF or WebP header and to walk a JPEG's
   markers past the colour profiles a scanner leaves in front of the frame. */
const HEAD = 64 * 1024;

/* `/media/ch01/Figure_01_01_03_aa.jpg` as a path under the root, or nothing
   where the address climbs out of it. The same rule the dev server serves by. */
export const mediaFile = (root: MediaRoot, url: string): string | null => {
  const rest = decodeURIComponent(url.split('?')[0]).replace(/^\/*media\/*/, '');
  const file = path.resolve(root, rest);
  return rest !== '' && file.startsWith(`${root}${path.sep}`) ? file : null;
};

const headOf = async (file: string): Promise<Uint8Array | null> => {
  const fh = await fs.open(file, 'r').catch(() => null);
  if (fh === null) return null;
  try {
    const buf = new Uint8Array(HEAD);
    const { bytesRead } = await fh.read(buf, 0, HEAD, 0);
    return buf.subarray(0, bytesRead);
  } catch { return null; } finally { await fh.close().catch(() => {}); }
};

/* One address looked up across the roots a build carries, first root wins, as
   the merged `/media/` address space has it. */
const sizeOf = async (roots: readonly MediaRoot[], url: string): Promise<Dimensions | null> => {
  for (const root of roots) {
    const file = mediaFile(root, url);
    const head = file === null ? null : await headOf(file);
    const d = head === null ? null : dimensionsOf(head);
    if (d !== null) return d;
  }
  return null;
};

/* The map `sizedImages` reads: every image this HTML names that could be
   measured, by the address it is written at. */
export const imageSizes = async (roots: readonly MediaRoot[], html: string): Promise<SizeLookup> => {
  const found = await Promise.all(imageSrcs(html).map(async (src) => [src, await sizeOf(roots, src)] as const));
  return new Map(found.flatMap(([src, d]) => (d === null ? [] : [[src, d] as const])));
};
