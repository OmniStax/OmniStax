import type { BookReleaseManifest, OfflineResource } from './schema';

export type ReleaseChanges = {
  readonly sections: { readonly added: readonly string[]; readonly changed: readonly string[]; readonly removed: readonly string[] };
  readonly resources: { readonly added: readonly string[]; readonly changed: readonly string[]; readonly removed: readonly string[] };
};

const changed = <T>(before: ReadonlyMap<string, T>, after: ReadonlyMap<string, T>, same: (a: T, b: T) => boolean) => ({
  added: [...after.keys()].filter((key) => !before.has(key)).sort(),
  changed: [...after.keys()].filter((key) => before.has(key) && !same(before.get(key)!, after.get(key)!)).sort(),
  removed: [...before.keys()].filter((key) => !after.has(key)).sort(),
});

export const releaseChanges = (before: BookReleaseManifest, after: BookReleaseManifest): ReleaseChanges => ({
  sections: changed(new Map(before.sections.map((section) => [section.id, section.fingerprint])), new Map(after.sections.map((section) => [section.id, section.fingerprint])), (a, b) => a === b),
  resources: changed(new Map(before.resources.map((resource) => [resource.logicalUrl, resource])), new Map(after.resources.map((resource) => [resource.logicalUrl, resource])), (a: OfflineResource, b: OfflineResource) => a.sha256 === b.sha256),
});

export type InstallPhase = 'absent' | 'downloading' | 'failed' | 'ready';
export type InstallState = { readonly phase: InstallPhase; readonly installedRelease?: string; readonly availableRelease?: string; readonly stagingRelease?: string; readonly error?: string };

export const beginInstall = (state: InstallState, release: string): InstallState => ({ ...state, phase: state.installedRelease ? 'ready' : 'downloading', stagingRelease: release, error: undefined });
export const failInstall = (state: InstallState, error: string): InstallState => state.installedRelease
  ? { ...state, phase: 'ready', stagingRelease: undefined, error }
  : { ...state, phase: 'failed', stagingRelease: undefined, error };
export const commitInstall = (state: InstallState, release: string): InstallState => ({ phase: 'ready', installedRelease: release, availableRelease: state.availableRelease });
export const removeInstall = (state: InstallState): InstallState => ({ phase: 'absent', availableRelease: state.availableRelease });

