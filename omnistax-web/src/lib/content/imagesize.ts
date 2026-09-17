/* What size an image file says it is, read from its own first bytes. The build
   writes those numbers onto the <img> so the browser can keep the space before
   the picture arrives, and nothing on the page moves as they land. Pure: bytes
   in, a pair of numbers or nothing out, no filesystem and no dependency. A
   format not named here — SVG, which has no pixel size of its own, or a file
   too short or too damaged to read — answers nothing, and such an image is
   left as it was. */

export type Pixels = number;                                            /* one dimension of an image, in its own pixels */
export type Dimensions = { readonly width: Pixels; readonly height: Pixels };
/* One page's images by the address they are written at ("/media/ch01/x.jpg"). */
export type SizeLookup = ReadonlyMap<string, Dimensions>;

const u16 = (b: Uint8Array, i: number): number => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32le = (b: Uint8Array, i: number): number => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u32 = (b: Uint8Array, i: number): number => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const ascii = (b: Uint8Array, i: number, n: number): string => String.fromCharCode(...b.subarray(i, i + n));
const size = (width: number, height: number): Dimensions | null =>
  (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null);

/* PNG: the IHDR chunk is first and fixed, so the two numbers sit at 16 and 20. */
const PNG_SIG = '\x89PNG\r\n\x1a\n';
const png = (b: Uint8Array): Dimensions | null =>
  (b.length >= 24 && ascii(b, 12, 4) === 'IHDR' ? size(u32(b, 16), u32(b, 20)) : null);

/* GIF: the logical screen descriptor follows the six-byte header, little-endian. */
const gif = (b: Uint8Array): Dimensions | null => (b.length >= 10 ? size(u16le(b, 6), u16le(b, 8)) : null);

/* JPEG: walk the markers from the start until a frame header (SOF) says how
   big the frame is. DHT (C4), JPG (C8) and DAC (CC) share the C0–CF range and
   are not frames; a marker with no payload (D0–D9, 01) carries no length. */
const SOF = (m: number): boolean => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
const STANDALONE = (m: number): boolean => (m >= 0xd0 && m <= 0xd9) || m === 0x01;
const jpeg = (b: Uint8Array): Dimensions | null => {
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }                 /* fill bytes between segments */
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (STANDALONE(marker)) { i += 2; continue; }
    const length = u16(b, i + 2);
    if (length < 2) return null;
    if (SOF(marker)) return i + 9 <= b.length ? size(u16(b, i + 7), u16(b, i + 5)) : null;
    i += 2 + length;
  }
  return null;
};

/* WebP: a RIFF container whose first chunk says which of the three encodings
   it is, and each keeps its size in a place of its own. */
const webp = (b: Uint8Array): Dimensions | null => {
  const chunk = b.length >= 16 ? ascii(b, 12, 4) : '';
  if (chunk === 'VP8X' && b.length >= 30) return size(u24le(b, 24) + 1, u24le(b, 27) + 1);
  if (chunk === 'VP8L' && b.length >= 25 && b[20] === 0x2f) {
    const bits = u32le(b, 21);   /* fourteen bits of width then fourteen of height, each one less than it is */
    return size((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === 'VP8 ' && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a)
    return size(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  return null;
};

export const dimensionsOf = (buffer: Uint8Array): Dimensions | null => {
  if (buffer.length < 10) return null;
  if (ascii(buffer, 0, 8) === PNG_SIG) return png(buffer);
  if (ascii(buffer, 0, 4) === 'GIF8') return gif(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpeg(buffer);
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 4) === 'WEBP') return webp(buffer);
  return null;
};

/* Every address a page's images are written at, once each and in the order the
   page draws them: what the caller has to look up on disk. */
const SRC = /<img\b[^>]*\bsrc="([^"]*)"/g;
export const imageSrcs = (html: string): readonly string[] =>
  [...new Set([...html.matchAll(SRC)].map(([, src]) => src))];
