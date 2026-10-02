/* The few calls of GitHub's REST API a sync needs, straight from the browser
   with the reader's own token: the branch head, its tree, a blob each way,
   and one commit built from blobs, a tree and a ref, so a push is one commit. */
import { base64OfBytes, type RepoPath } from './layout';

export type GitSha = string & { readonly __brand: 'GitSha' };
export const gitSha = (s: string): GitSha => s as GitSha;
/* "owner/name". */
export type RepoName = string & { readonly __brand: 'RepoName' };
export const repoName = (s: string): RepoName | null => {
  const t = s.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
  return /^[\w.-]+\/[\w.-]+$/.test(t) ? t as RepoName : null;
};
export type Remote = { readonly repo: RepoName; readonly branch: string; readonly token: string };
export type Fetch = typeof fetch;

export type Head =
  | { readonly kind: 'at'; readonly commit: GitSha; readonly tree: GitSha }
  | { readonly kind: 'missing' }
  | { readonly kind: 'empty' };
export type RemoteEntry = { readonly path: RepoPath; readonly sha: GitSha; readonly size: number };

/* GitHub refuses a blob over 100 MB. */
export const GITHUB_MAX_BYTES = 100 * 1024 * 1024;

export class GitHubError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const API = 'https://api.github.com';

const why = (status: number, body: string): string => {
  if (status === 401) return 'GitHub refused the token.';
  if (status === 403) return /rate limit/i.test(body) ? 'GitHub’s rate limit was reached. Try again later.' : 'The token can’t write to this repo. It needs Contents read and write.';
  if (status === 404) return 'Repo not found, or the token can’t see it.';
  if (status === 409) return 'The repo is empty.';
  if (status === 413) return 'Too large for GitHub.';
  if (status === 422) return 'The branch moved on while pushing. Try again.';
  const message = (() => { try { return String((JSON.parse(body) as { message?: unknown }).message ?? ''); } catch { return ''; } })();
  return message ? `GitHub said: ${message}` : `GitHub answered ${status}.`;
};

const call = async (remote: Remote, f: Fetch, method: string, path: string, body?: unknown, accept = 'application/vnd.github+json'): Promise<Response> => {
  const res = await f(`${API}/repos/${remote.repo}${path}`, {
    method,
    headers: { Accept: accept, Authorization: `Bearer ${remote.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new GitHubError(res.status, why(res.status, await res.text().catch(() => '')));
  return res;
};
const json = async <T>(remote: Remote, f: Fetch, method: string, path: string, body?: unknown): Promise<T> =>
  (await call(remote, f, method, path, body)).json() as Promise<T>;

const refPath = (branch: string): string => `heads/${branch.split('/').map(encodeURIComponent).join('/')}`;

export const readHead = async (remote: Remote, f: Fetch): Promise<Head> => {
  try {
    const ref = await json<{ object: { sha: string } }>(remote, f, 'GET', `/git/ref/${refPath(remote.branch)}`);
    const commit = await json<{ tree: { sha: string } }>(remote, f, 'GET', `/git/commits/${ref.object.sha}`);
    return { kind: 'at', commit: gitSha(ref.object.sha), tree: gitSha(commit.tree.sha) };
  } catch (e) {
    if (!(e instanceof GitHubError)) throw e;
    if (e.status === 409) return { kind: 'empty' };
    if (e.status !== 404) throw e;
    await json(remote, f, 'GET', '');
    return { kind: 'missing' };
  }
};

export const readTree = async (remote: Remote, f: Fetch, tree: GitSha): Promise<readonly RemoteEntry[]> => {
  const out = await json<{ tree: { path: string; type: string; sha: string; size?: number }[]; truncated: boolean }>(remote, f, 'GET', `/git/trees/${tree}?recursive=1`);
  if (out.truncated) throw new Error('The repo has too many files for GitHub to list at once.');
  return out.tree.filter((e) => e.type === 'blob').map((e) => ({ path: e.path, sha: gitSha(e.sha), size: e.size ?? 0 }));
};

export const readBlob = async (remote: Remote, f: Fetch, sha: GitSha): Promise<Uint8Array> =>
  new Uint8Array(await (await call(remote, f, 'GET', `/git/blobs/${sha}`, undefined, 'application/vnd.github.raw+json')).arrayBuffer());

export const writeBlob = async (remote: Remote, f: Fetch, bytes: Uint8Array): Promise<GitSha> => {
  if (bytes.length > GITHUB_MAX_BYTES) throw new GitHubError(413, 'Over GitHub’s 100 MB limit.');
  return gitSha((await json<{ sha: string }>(remote, f, 'POST', '/git/blobs', { content: base64OfBytes(bytes), encoding: 'base64' })).sha);
};

/* An empty repo has no history for the Git Data API to build on, so its first
   file goes in through the Contents API, which makes the branch. */
export const seedEmpty = async (remote: Remote, f: Fetch, path: RepoPath, bytes: Uint8Array): Promise<Head> => {
  const out = await json<{ commit: { sha: string; tree: { sha: string } } }>(remote, f, 'PUT', `/contents/${path}`, { message: 'Start OmniStax sync', content: base64OfBytes(bytes), branch: remote.branch });
  return { kind: 'at', commit: gitSha(out.commit.sha), tree: gitSha(out.commit.tree.sha) };
};

/* A path to point at a blob, or to drop. */
export type TreeChange = { readonly path: RepoPath; readonly sha: GitSha | null };

export const commitChanges = async (remote: Remote, f: Fetch, head: Head, changes: readonly TreeChange[], message: string): Promise<GitSha> => {
  const base = head.kind === 'at' ? head : null;
  const tree = await json<{ sha: string }>(remote, f, 'POST', '/git/trees', {
    ...(base ? { base_tree: base.tree } : {}),
    tree: changes.map((c) => ({ path: c.path, mode: '100644', type: 'blob', sha: c.sha })),
  });
  const commit = await json<{ sha: string }>(remote, f, 'POST', '/git/commits', { message, tree: tree.sha, parents: base ? [base.commit] : [] });
  if (base) await json(remote, f, 'PATCH', `/git/refs/${refPath(remote.branch)}`, { sha: commit.sha, force: false });
  else await json(remote, f, 'POST', '/git/refs', { ref: `refs/heads/${remote.branch}`, sha: commit.sha });
  return gitSha(commit.sha);
};

/* The id git gives these bytes as a blob, to tell an unchanged file from one
   that must be sent. */
export const blobSha = async (bytes: Uint8Array): Promise<GitSha> => {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const whole = new Uint8Array(header.length + bytes.length);
  whole.set(header); whole.set(bytes, header.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', whole));
  return gitSha([...digest].map((b) => b.toString(16).padStart(2, '0')).join(''));
};
