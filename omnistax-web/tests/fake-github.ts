/* A fake GitHub for the sync tests: a tree of files and the history of blobs
   it keeps (so a base can be fetched by its sha), answering the calls the sync
   makes and recording them. Not a test of its own. */
import { blobSha, type Fetch, type GitSha, type Remote } from '../src/lib/sync/github';
type Call = { readonly method: string; readonly path: string; readonly body: unknown };
export const github = (tree: Record<string, Uint8Array>, history: readonly Uint8Array[] = []) => {
  const calls: Call[] = [];
  const blobs = new Map<string, Uint8Array>();
  const ready = (async () => {
    for (const b of [...Object.values(tree), ...history]) blobs.set(await blobSha(b), b);
    return Object.fromEntries(await Promise.all(Object.entries(tree).map(async ([p, b]) => [p, await blobSha(b)] as const)));
  })();
  const written: Uint8Array[] = [];
  const f: Fetch = async (input, init) => {
    const shas = await ready;
    const path = new URL(String(input)).pathname.replace(/^\/repos\/chen\/notes/, '');
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    if (method === 'GET' && path.startsWith('/git/ref/heads/')) return ok({ object: { sha: 'c0' } });
    if (method === 'GET' && path.startsWith('/git/commits/')) return ok({ tree: { sha: 'tree0' } });
    if (method === 'GET' && path.startsWith('/git/trees/')) return ok({ truncated: false, tree: Object.entries(shas).map(([p, s]) => ({ path: p, type: 'blob', sha: s, size: tree[p].length })) });
    if (method === 'GET' && path.startsWith('/git/blobs/')) { const b = blobs.get(path.slice('/git/blobs/'.length)); return b ? new Response(new Blob([b as BlobPart])) : new Response('{}', { status: 404 }); }
    if (method === 'POST' && path === '/git/blobs') {
      const bytes = Uint8Array.from(atob((body as { content: string }).content), (c) => c.charCodeAt(0));
      written.push(bytes);
      const s = await blobSha(bytes); blobs.set(s, bytes); return ok({ sha: s });
    }
    if (method === 'POST' && path === '/git/trees') return ok({ sha: 'tree1' });
    if (method === 'POST' && path === '/git/commits') return ok({ sha: 'commit1' });
    if (path.startsWith('/git/refs')) return ok({});
    return new Response('{}', { status: 500 });
  };
  const committed = (): { path: string; sha: string | null }[] => (calls.find((c) => c.path === '/git/trees' && c.method === 'POST')?.body as { tree: { path: string; sha: string | null }[] } | undefined)?.tree ?? [];
  return { f, calls, committed, blobs, written };
};
export const remote: Remote = { repo: 'chen/notes' as Remote['repo'], branch: 'main', token: 't' };
export const shaOf = async (b: Uint8Array): Promise<GitSha> => blobSha(b);
export const blobFrom = (gh: ReturnType<typeof github>) => async (s: GitSha): Promise<Uint8Array> => { await gh.f('https://api.github.com/repos/chen/notes/git/ref/heads/main'); const b = gh.blobs.get(s); if (!b) throw new Error('no blob'); return b; };
