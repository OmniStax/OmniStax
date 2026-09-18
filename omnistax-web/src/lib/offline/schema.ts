import { z } from 'zod';

export const OFFLINE_MANIFEST_VERSION = 1 as const;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const bookId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const safeUrl = z.string().startsWith('/').refine((value) => {
  // Check the original segments before URL normalization erases traversal.
  // Queries/fragments would also alias different inventory entries in the
  // worker, which deliberately resolves resources by pathname.
  if (value.includes('//') || /[\\?#\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    if (value.split('/').some((part) => {
      const decoded = decodeURIComponent(part);
      return decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded);
    })) return false;
    return new URL(value, 'https://omnistax.invalid').origin === 'https://omnistax.invalid';
  } catch { return false; }
}, 'unsafe resource URL');

export const OfflineResourceSchema = z.object({
  logicalUrl: safeUrl, downloadUrl: safeUrl, sha256: digest,
  bytes: z.number().int().nonnegative(), mime: z.string().min(1),
  role: z.enum(['page', 'data', 'media', 'script', 'style', 'font', 'app']),
}).strict();

export const BookReleaseManifestSchema = z.object({
  schemaVersion: z.literal(OFFLINE_MANIFEST_VERSION), contentFormat: z.literal(1),
  book: z.object({ id: bookId, title: z.string().min(1) }).strict(),
  releaseId: digest, publishedAt: z.string().datetime(), releaseNotes: z.string().optional(),
  runtime: z.object({ artifactId: digest, compatibleReaderFormat: z.literal(1) }).strict(),
  resources: z.array(OfflineResourceSchema).min(1),
  sections: z.array(z.object({ id: z.string().min(1), fingerprint: digest }).strict()),
  totalBytes: z.number().int().nonnegative(),
}).strict().superRefine((manifest, ctx) => {
  const logical = new Set<string>();
  manifest.resources.forEach((resource, index) => {
    let pathname = resource.logicalUrl;
    try { pathname = new URL(resource.logicalUrl, 'https://omnistax.invalid').pathname; } catch { /* safeUrl reports invalid input */ }
    if (logical.has(pathname)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resources', index, 'logicalUrl'], message: 'conflicting logical URL' });
    logical.add(pathname);
    const prefix = `/offline/releases/${encodeURIComponent(manifest.book.id)}/${manifest.releaseId}/${manifest.runtime.artifactId}/`;
    if (!resource.downloadUrl.startsWith(prefix)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resources', index, 'downloadUrl'], message: 'resource is outside its immutable release' });
  });
  const sections = new Set<string>();
  manifest.sections.forEach((section, index) => {
    if (sections.has(section.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index, 'id'], message: 'duplicate section ID' });
    sections.add(section.id);
  });
  if (manifest.totalBytes !== manifest.resources.reduce((sum, resource) => sum + resource.bytes, 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['totalBytes'], message: 'incorrect total byte count' });
});

export const OfflineCatalogSchema = z.object({
  schemaVersion: z.literal(1), generatedAt: z.string().datetime(),
  books: z.array(z.object({ id: bookId, title: z.string().min(1), releaseId: digest, artifactId: digest, publishedAt: z.string().datetime(), manifestUrl: safeUrl, totalBytes: z.number().int().nonnegative() }).strict()),
}).strict().superRefine((catalog, ctx) => {
  const books = new Set<string>();
  catalog.books.forEach((book, index) => {
    if (books.has(book.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['books', index, 'id'], message: 'duplicate book ID' });
    books.add(book.id);
    if (book.manifestUrl !== `/offline/releases/${book.id}/${book.releaseId}/${book.artifactId}/manifest.json`) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['books', index, 'manifestUrl'], message: 'manifest is outside its immutable release' });
    }
  });
});

export type OfflineResource = z.infer<typeof OfflineResourceSchema>;
export type BookReleaseManifest = z.infer<typeof BookReleaseManifestSchema>;
export type OfflineCatalog = z.infer<typeof OfflineCatalogSchema>;
