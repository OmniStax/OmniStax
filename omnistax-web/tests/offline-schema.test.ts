import test from 'node:test';
import assert from 'node:assert/strict';
import { BookReleaseManifestSchema, OfflineCatalogSchema, OfflineResourceSchema } from '../src/lib/offline/schema';

const hash = 'a'.repeat(64);
const prefix = `/offline/releases/book/${hash}/${hash}/`;
const resource = { logicalUrl: '/book/index.html', downloadUrl: `${prefix}book/index.html`, sha256: hash, bytes: 1, mime: 'text/html', role: 'page' as const };
const manifest = { schemaVersion: 1, contentFormat: 1, book: { id: 'book', title: 'Book' }, releaseId: hash, publishedAt: '2026-09-18T00:00:00.000Z', runtime: { artifactId: hash, compatibleReaderFormat: 1 }, resources: [resource], sections: [{ id: '1.1', fingerprint: hash }], totalBytes: 1 };
const entry = { id: 'book', title: 'Book', releaseId: hash, artifactId: hash, publishedAt: manifest.publishedAt, manifestUrl: `${prefix}manifest.json`, totalBytes: 1 };

test('resource paths reject traversal before URL normalization and URL aliases', () => {
  for (const url of ['//evil.test/x', '/x/../y', '/x/%2e%2e/y', '/x/%2E/y', '/x/%2f/y', '/x/%5c/y', '/x\\y', '/x?y', '/x#y', '/x/%00', '/x/%invalid']) {
    assert.equal(OfflineResourceSchema.safeParse({ ...resource, logicalUrl: url }).success, false, url);
    assert.equal(BookReleaseManifestSchema.safeParse({ ...manifest, resources: [{ ...resource, downloadUrl: `${prefix}${url.slice(1)}` }] }).success, false, url);
  }
  assert.equal(OfflineResourceSchema.safeParse({ ...resource, logicalUrl: '/media/a%20b.png' }).success, true);
});

test('manifests reject duplicate resolved URLs and section IDs', () => {
  assert.equal(BookReleaseManifestSchema.safeParse(manifest).success, true);
  assert.equal(BookReleaseManifestSchema.safeParse({ ...manifest, resources: [{ ...resource, logicalUrl: '/media/a b.png' }, { ...resource, logicalUrl: '/media/a%20b.png' }], totalBytes: 2 }).success, false);
  assert.equal(BookReleaseManifestSchema.safeParse({ ...manifest, sections: [...manifest.sections, ...manifest.sections] }).success, false);
  assert.equal(BookReleaseManifestSchema.safeParse({ ...manifest, resources: [], totalBytes: 0 }).success, false);
});

test('catalog identities and immutable manifest locations agree', () => {
  const catalog = { schemaVersion: 1, generatedAt: manifest.publishedAt, books: [entry] };
  assert.equal(OfflineCatalogSchema.safeParse(catalog).success, true);
  assert.equal(OfflineCatalogSchema.safeParse({ ...catalog, books: [entry, entry] }).success, false);
  assert.equal(OfflineCatalogSchema.safeParse({ ...catalog, books: [{ ...entry, manifestUrl: '/book.json' }] }).success, false);
});
