import { z } from 'zod';

export const OFFLINE_MANIFEST_VERSION = 1 as const;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const safeUrl = z.string().startsWith('/').refine((value) => {
  try { const url = new URL(value, 'https://omnistax.invalid'); return url.origin === 'https://omnistax.invalid' && !url.pathname.split('/').includes('..'); } catch { return false; }
}, 'unsafe resource URL');

export const OfflineResourceSchema = z.object({
  logicalUrl: safeUrl, downloadUrl: safeUrl, sha256: digest,
  bytes: z.number().int().nonnegative(), mime: z.string().min(1),
  role: z.enum(['page', 'data', 'media', 'script', 'style', 'font', 'app']),
}).strict();

export const BookReleaseManifestSchema = z.object({
  schemaVersion: z.literal(OFFLINE_MANIFEST_VERSION), contentFormat: z.literal(1),
  book: z.object({ id: z.string().min(1), title: z.string().min(1) }).strict(),
  releaseId: digest, publishedAt: z.string().datetime(), releaseNotes: z.string().optional(),
  runtime: z.object({ artifactId: digest, compatibleReaderFormat: z.literal(1) }).strict(),
  resources: z.array(OfflineResourceSchema),
  sections: z.array(z.object({ id: z.string().min(1), fingerprint: digest }).strict()),
  totalBytes: z.number().int().nonnegative(),
}).strict().superRefine((manifest, ctx) => {
  const logical = new Set<string>();
  manifest.resources.forEach((resource, index) => {
    if (logical.has(resource.logicalUrl)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resources', index, 'logicalUrl'], message: 'conflicting logical URL' });
    logical.add(resource.logicalUrl);
    const prefix = `/offline/releases/${encodeURIComponent(manifest.book.id)}/${manifest.releaseId}/${manifest.runtime.artifactId}/`;
    if (!resource.downloadUrl.startsWith(prefix)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resources', index, 'downloadUrl'], message: 'resource is outside its immutable release' });
  });
  if (manifest.totalBytes !== manifest.resources.reduce((sum, resource) => sum + resource.bytes, 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['totalBytes'], message: 'incorrect total byte count' });
});

export const OfflineCatalogSchema = z.object({
  schemaVersion: z.literal(1), generatedAt: z.string().datetime(),
  books: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), releaseId: digest, artifactId: digest, publishedAt: z.string().datetime(), manifestUrl: safeUrl, totalBytes: z.number().int().nonnegative() }).strict()),
}).strict();

export type OfflineResource = z.infer<typeof OfflineResourceSchema>;
export type BookReleaseManifest = z.infer<typeof BookReleaseManifestSchema>;
export type OfflineCatalog = z.infer<typeof OfflineCatalogSchema>;
