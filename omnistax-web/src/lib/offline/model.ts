import type { BookReleaseManifest, OfflineResource } from './schema';
import { plainText } from '../content/plain';

export type ReleaseChanges = {
  readonly sections: { readonly added: readonly string[]; readonly changed: readonly string[]; readonly removed: readonly string[] };
  readonly resources: { readonly added: readonly string[]; readonly changed: readonly string[]; readonly removed: readonly string[] };
};

const changed = <T>(before: ReadonlyMap<string, T>, after: ReadonlyMap<string, T>, same: (a: T, b: T) => boolean) => ({
  added: [...after.keys()].filter((key) => !before.has(key)).sort(),
  changed: [...after.keys()].filter((key) => before.has(key) && !same(before.get(key)!, after.get(key)!)).sort(),
  removed: [...before.keys()].filter((key) => !after.has(key)).sort(),
});

type Section = BookReleaseManifest['sections'][number];
export const sectionChanges = (before: readonly Section[], after: readonly Section[]): ReleaseChanges['sections'] =>
  changed(new Map(before.map((section) => [section.id, section.fingerprint])), new Map(after.map((section) => [section.id, section.fingerprint])), (a, b) => a === b);
export const releaseChanges = (before: BookReleaseManifest, after: BookReleaseManifest): ReleaseChanges => ({
  sections: sectionChanges(before.sections, after.sections),
  resources: changed(new Map(before.resources.map((resource) => [resource.logicalUrl, resource])), new Map(after.resources.map((resource) => [resource.logicalUrl, resource])), (a: OfflineResource, b: OfflineResource) => a.sha256 === b.sha256),
});

/* The release a reader last looked at, with its section fingerprints, so the
   changes since can be named after the server has dropped it. */
export type SeenRelease = { readonly release: string; readonly artifact: string; readonly sections: readonly Section[] };
/* A book row's two marks: changed since the reader looked, and a newer release
   waiting to install. The release a reader has is the download's, else the catalog's. */
export const bookMarks = (seen: SeenRelease | undefined, installed: string | undefined, available: string | undefined): { readonly updated: boolean; readonly update: boolean } => {
  const current = installed ?? available;
  return { updated: !!seen && !!current && seen.release !== current, update: !!installed && !!available && installed !== available };
};

/* A section's text one block to a line, maths as its TeX. */
const UNREAD = /<span\b[^>]*\bclass="ai-mark"[^>]*>[\s\S]*?<\/span>|<(script|style|svg|button|nav|template)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/g;
const BLOCK = /<\/?(?:h[1-6]|p|li|figcaption|figure|div|section|article|blockquote|table|tr|td|th|dt|dd|ul|ol|br|hr)\b[^>]*>|<span\b[^>]*\bclass="katex-display"[^>]*>/g;
const EYEBROW = /<span\b[^>]*\bclass="eyebrow"[^>]*>([^<]*)<\/span>/g;
export const readableLines = (html: string): string[] => html.replace(UNREAD, '').replace(EYEBROW, '<br>$1<br>').split(BLOCK).map(plainText).filter((line) => line !== '');

export type InstallPhase = 'absent' | 'downloading' | 'failed' | 'ready';
export type InstallState = { readonly phase: InstallPhase; readonly installedRelease?: string; readonly availableRelease?: string; readonly stagingRelease?: string; readonly error?: string };

export const beginInstall = (state: InstallState, release: string): InstallState => ({ ...state, phase: state.installedRelease ? 'ready' : 'downloading', stagingRelease: release, error: undefined });
export const failInstall = (state: InstallState, error: string): InstallState => state.installedRelease
  ? { ...state, phase: 'ready', stagingRelease: undefined, error }
  : { ...state, phase: 'failed', stagingRelease: undefined, error };
export const commitInstall = (state: InstallState, release: string): InstallState => ({ phase: 'ready', installedRelease: release, availableRelease: state.availableRelease });
export const removeInstall = (state: InstallState): InstallState => ({ phase: 'absent', availableRelease: state.availableRelease });

export type ReleaseReference = { readonly bookId: string; readonly release: string };
export const savedSessionReleaseReferences = (raw: unknown): readonly ReleaseReference[] => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return [];
  const found = new Map<string, ReleaseReference>();
  for (const session of Object.values(raw as Record<string, unknown>)) {
    if (typeof session !== 'object' || session === null || !Array.isArray((session as { drawn?: unknown }).drawn)) continue;
    for (const value of (session as { drawn: unknown[] }).drawn) {
      if (typeof value !== 'object' || value === null) continue;
      const { book, release } = value as { book?: unknown; release?: unknown };
      if (typeof book === 'string' && book && typeof release === 'string' && release) found.set(`${book}\0${release}`, { bookId: book, release });
    }
  }
  return [...found.values()];
};

export const releaseForBook = (
  bookId: string,
  clientPins: Readonly<Record<string, string>>,
  installed: Readonly<Record<string, string | undefined>>,
  available: Readonly<Record<string, string | undefined>>,
): string | undefined => clientPins[bookId] ?? installed[bookId] ?? available[bookId];

/* Whether a family of editions updates itself: the setting is one for the
   family (the finder shows one box for a book and its translations), kept per
   book id, on unless some edition of the family was turned off. Reading it
   over the family is what keeps a translation downloaded later in step. */
export const sharedAutoUpdate = (auto: Readonly<Record<string, boolean>>, ids: readonly string[]): boolean => ids.every((id) => auto[id] !== false);
