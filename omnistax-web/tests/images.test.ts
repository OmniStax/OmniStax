import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensionsOf, imageSrcs, type Dimensions, type SizeLookup } from '../src/lib/content/imagesize';
import { lazyImages, sizedImages } from '../src/lib/content/fragment';

/* ---------- the header reader ---------- */

/* Each of these is the smallest file of its format that still says how big it
   is: the bytes a real file opens with, and nothing after them. */

const bytes = (...xs: readonly number[]): Uint8Array => new Uint8Array(xs);
const concat = (...parts: readonly Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const chars = (s: string): Uint8Array => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
const be16 = (n: number): Uint8Array => bytes(n >> 8, n & 0xff);
const be32 = (n: number): Uint8Array => bytes((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
const le16 = (n: number): Uint8Array => bytes(n & 0xff, n >> 8);

const png = (w: number, h: number): Uint8Array =>
  concat(chars('\x89PNG\r\n\x1a\n'), be32(13), chars('IHDR'), be32(w), be32(h), bytes(8, 2, 0, 0, 0));

const gif = (w: number, h: number): Uint8Array => concat(chars('GIF89a'), le16(w), le16(h), bytes(0x70, 0, 0));

/* A JPEG with a fat APP1 in front of the frame, the shape a scanned photograph takes. */
const jpeg = (w: number, h: number, pad = 200): Uint8Array =>
  concat(bytes(0xff, 0xd8), bytes(0xff, 0xe1), be16(pad + 2), new Uint8Array(pad),
    bytes(0xff, 0xc0), be16(11), bytes(8), be16(h), be16(w), bytes(3));

const webpLossy = (w: number, h: number): Uint8Array =>
  concat(chars('RIFF'), be32(0), chars('WEBP'), chars('VP8 '), be32(0), new Uint8Array(3),
    bytes(0x9d, 0x01, 0x2a), le16(w), le16(h), new Uint8Array(4));

const webpLossless = (w: number, h: number): Uint8Array => {
  const bits = (w - 1) | ((h - 1) << 14);
  return concat(chars('RIFF'), be32(0), chars('WEBP'), chars('VP8L'), be32(0), bytes(0x2f),
    bytes(bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, (bits >>> 24) & 0xff), new Uint8Array(4));
};

const webpExtended = (w: number, h: number): Uint8Array =>
  concat(chars('RIFF'), be32(0), chars('WEBP'), chars('VP8X'), be32(10), new Uint8Array(4),
    bytes((w - 1) & 0xff, ((w - 1) >>> 8) & 0xff, ((w - 1) >>> 16) & 0xff),
    bytes((h - 1) & 0xff, ((h - 1) >>> 8) & 0xff, ((h - 1) >>> 16) & 0xff));

const size = (w: number, h: number): Dimensions => ({ width: w, height: h });

test('a PNG says its size in the IHDR chunk', () => {
  assert.deepEqual(dimensionsOf(png(1200, 675)), size(1200, 675));
});

test('a GIF says its size little-endian, right after the header', () => {
  assert.deepEqual(dimensionsOf(gif(640, 480)), size(640, 480));
});

test('a JPEG says its size in the frame header, however much sits in front of it', () => {
  assert.deepEqual(dimensionsOf(jpeg(1600, 900)), size(1600, 900));
  assert.deepEqual(dimensionsOf(jpeg(320, 240, 4000)), size(320, 240));
});

test('a JPEG whose markers say nothing about a frame answers nothing', () => {
  const noFrame = concat(bytes(0xff, 0xd8), bytes(0xff, 0xc4), be16(6), new Uint8Array(4), bytes(0xff, 0xd9));
  assert.equal(dimensionsOf(noFrame), null);
});

test('the three WebP encodings each say their size in a place of their own', () => {
  assert.deepEqual(dimensionsOf(webpLossy(800, 600)), size(800, 600));
  assert.deepEqual(dimensionsOf(webpLossless(801, 601)), size(801, 601));
  assert.deepEqual(dimensionsOf(webpExtended(4000, 3000)), size(4000, 3000));
});

test('an SVG, a truncated file and a format nobody claims all answer nothing', () => {
  assert.equal(dimensionsOf(chars('<svg width="10" height="10"></svg>')), null);
  assert.equal(dimensionsOf(png(10, 10).subarray(0, 8)), null);
  assert.equal(dimensionsOf(chars('not an image at all')), null);
});

test('a file that claims a size of nothing is refused', () => {
  assert.equal(dimensionsOf(png(0, 100)), null);
});

/* ---------- the addresses a page names ---------- */

test('the images of a page are listed once each, in the order it draws them', () => {
  const html = '<img src="/media/a.jpg"><p>x</p><img alt="b" src="/media/b.png" data-width="250"><img src="/media/a.jpg">';
  assert.deepEqual(imageSrcs(html), ['/media/a.jpg', '/media/b.png']);
});

/* ---------- the two rewrites ---------- */

test('every image but the first waits for the reader, and all of them decode off the main thread', () => {
  const out = lazyImages('<img src="a.jpg"><img src="b.jpg"><img src="c.jpg">');
  const tags = out.match(/<img[^>]*>/g)!;
  assert.equal(tags.length, 3);
  assert.equal(/loading=/.test(tags[0]), false);
  assert.match(tags[1], /loading="lazy"/);
  assert.match(tags[2], /loading="lazy"/);
  tags.forEach((t) => assert.match(t, /decoding="async"/));
});

test('an image that already says how it loads keeps what it says', () => {
  const out = lazyImages('<img src="a.jpg"><img src="b.jpg" loading="eager" decoding="sync">');
  assert.match(out, /<img src="b\.jpg" loading="eager" decoding="sync">/);
});

test('a page with no images is left exactly as it was', () => {
  const html = '<p>Nothing to see.</p>';
  assert.equal(lazyImages(html), html);
  assert.equal(sizedImages(html, new Map()), html);
});

const sizes: SizeLookup = new Map([['/media/ch01/a.jpg', size(1600, 900)]]);

test('an image the caller could measure carries its own pixel size', () => {
  assert.equal(
    sizedImages('<img src="/media/ch01/a.jpg" alt="A">', sizes),
    '<img src="/media/ch01/a.jpg" alt="A" width="1600" height="900">',
  );
});

test('an image the caller knows nothing about is left as it was', () => {
  const html = '<img src="/media/ch01/z.svg" alt="Z">';
  assert.equal(sizedImages(html, sizes), html);
});

test('the book\u2019s printed width is not a pixel size, so such an image is still measured', () => {
  assert.match(
    sizedImages('<img src="/media/ch01/a.jpg" data-width="250" style="--book-w:250">', sizes),
    /data-width="250" style="--book-w:250" width="1600" height="900"/,
  );
});

test('an image that already carries a size keeps it', () => {
  const html = '<img src="/media/ch01/a.jpg" width="40" height="30">';
  assert.equal(sizedImages(html, sizes), html);
});

test('the two rewrites compose, in either order, to the same tag', () => {
  const html = '<img src="/media/ch01/a.jpg"><img src="/media/ch01/a.jpg">';
  const one = lazyImages(sizedImages(html, sizes));
  const other = sizedImages(lazyImages(html), sizes);
  assert.match(one, /width="1600" height="900"/);
  assert.match(one, /loading="lazy"/);
  assert.equal(new Set([...one.matchAll(/<img[^>]*>/g)].map((m) => m[0])).size, 2);
  assert.deepEqual(imageSrcs(one), imageSrcs(other));
});
