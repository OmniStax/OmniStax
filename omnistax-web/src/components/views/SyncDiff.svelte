<script lang="ts">
  /* One file's sync changes, read as a diff: removed lines are the side being
     replaced, added lines the side arriving. A picture shows both versions;
     any other file that is not text says only how large each is. Where both
     sides changed the file, the version to keep is chosen here too. */
  import { sizeLabel } from '../../lib/files/model';
  import { hunksOf, lineDiff } from '../../lib/sync/diff';
  import { GROUP_LABEL } from '../../lib/sync/layout';
  import type { Change } from '../../lib/sync/plan';
  import { session } from '../../lib/sync/session.svelte';

  const change = $derived(session.changes.find((c) => c.path === session.selected) ?? null);
  const kind = (path: string): 'text' | 'image' | 'binary' => (path.endsWith('.json') ? 'text' : /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(path) ? 'image' : 'binary');
  const MIME: Readonly<Record<string, string>> = { svg: 'image/svg+xml', jpg: 'image/jpeg' };

  /* The old side is the one the sync writes over: the repo for a push, this
     device for a pull. A file changed in both reads repo to device. */
  const sides = (c: Change): { readonly from: string; readonly to: string; readonly pull: boolean } =>
    (c.side === 'down' ? { from: 'This device', to: 'The repo', pull: true } : { from: 'The repo', to: 'This device', pull: false });
  const about = (c: Change): string =>
    c.side === 'up' ? 'Pushing makes these changes in the repo.' : c.side === 'down' ? 'Pulling makes these changes on this device.' : 'Both sides changed this file since the last sync. Keep one version.';

  type Versions = { readonly mine: Uint8Array | null; readonly theirs: Uint8Array | null };
  const versions = async (c: Change): Promise<Versions> => ({
    mine: c.local ? session.local.find((f) => f.path === c.path)?.bytes ?? null : null,
    theirs: c.remote ? await session.remoteBytes(c.remote) : null,
  });
  const loading = $derived(change ? versions(change) : null);

  const MAX_LINES = 3000;
  const textOf = (b: Uint8Array | null): string[] => (b ? new TextDecoder().decode(b).replace(/\n$/, '').split('\n') : []);
  const diffOf = (c: Change, v: Versions) => {
    const [a, b] = sides(c).pull ? [v.mine, v.theirs] : [v.theirs, v.mine];
    const lines = lineDiff(textOf(a), textOf(b));
    return { ...hunksOf(lines), added: lines.filter((l) => l.kind === 'add').length, removed: lines.filter((l) => l.kind === 'del').length };
  };
  const url = (node: HTMLImageElement, of: { bytes: Uint8Array; path: string }) => {
    const ext = of.path.split('.').pop() ?? '';
    const u = URL.createObjectURL(new Blob([of.bytes as BlobPart], { type: MIME[ext] ?? `image/${ext}` }));
    node.src = u;
    return { destroy: () => URL.revokeObjectURL(u) };
  };
  const SIGN = { same: ' ', del: '−', add: '+' } as const;
</script>

{#snippet skipped(n: number)}
  {#if n}<div class="skip">{n} unchanged {n === 1 ? 'line' : 'lines'}</div>{/if}
{/snippet}

{#snippet version(name: string, bytes: Uint8Array | null, path: string, image: boolean)}
  <figure>
    <figcaption>{name}</figcaption>
    {#if !bytes}<p class="none">Not there</p>
    {:else if image}<img alt="{name} version" use:url={{ bytes, path }}>
    {:else}<p class="none">{sizeLabel(bytes.length)}</p>{/if}
  </figure>
{/snippet}

<div class="diff">
  {#if !change}
    <p class="empty">Choose a changed file in Sync to see what differs.</p>
  {:else}
    {@const s = sides(change)}
    <header>
      <h2>{change.label}</h2>
      <p class="path">{GROUP_LABEL[change.group]} · {change.path}</p>
      <p class="about">{about(change)}</p>
      {#if change.side === 'both'}
        <span class="choose" role="group" aria-label="Keep which version">
          <button type="button" aria-pressed={session.picks.get(change.path) === 'mine'} disabled={session.phase !== 'ready'} onclick={() => session.pick(change.path, 'mine')}>Keep this device’s</button>
          <button type="button" aria-pressed={session.picks.get(change.path) === 'theirs'} disabled={session.phase !== 'ready'} onclick={() => session.pick(change.path, 'theirs')}>Keep the repo’s</button>
        </span>
      {/if}
    </header>
    {#await loading}
      <p class="empty">Reading…</p>
    {:then v}
      {#if v && kind(change.path) === 'text'}
        {@const d = diffOf(change, v)}
        {@const total = d.hunks.reduce((n, h) => n + h.lines.length, 0)}
        <p class="legend"><span class="del">− {s.from}</span><span class="add">+ {s.to}</span><span class="counts">{d.removed} removed · {d.added} added</span></p>
        {#if !d.hunks.length}
          <p class="empty">The same text on both sides.</p>
        {:else if total > MAX_LINES}
          <p class="empty">{total} changed lines: too many to show.</p>
        {:else}
          <div class="code" role="table" aria-label="Changes">
            {#each d.hunks as h, i (i)}
              {@render skipped(h.skipped)}
              {#each h.lines as l, j (j)}
                <div class="line {l.kind}" role="row"><span class="no">{l.a ?? ''}</span><span class="no">{l.b ?? ''}</span><span class="sign">{SIGN[l.kind]}</span><span class="text">{l.text}</span></div>
              {/each}
            {/each}
            {@render skipped(d.tail)}
          </div>
        {/if}
      {:else if v}
        {@const image = kind(change.path) === 'image'}
        <div class="pair">
          {@render version(s.pull ? 'This device' : 'The repo', s.pull ? v.mine : v.theirs, change.path, image)}
          {@render version(s.pull ? 'The repo' : 'This device', s.pull ? v.theirs : v.mine, change.path, image)}
        </div>
      {/if}
    {:catch e}
      <p class="empty bad" role="alert">{e instanceof Error ? e.message : 'Couldn’t read the repo’s copy.'}</p>
    {/await}
  {/if}
</div>

<style>
  .diff{font-family:var(--sans);font-size:.88rem;line-height:1.45;padding:16px 8px;display:flex;flex-direction:column;gap:12px;max-width:1100px}
  header{display:flex;flex-direction:column;gap:2px}
  h2{margin:0;font-size:1.15rem;font-weight:600;line-height:1.2}
  .path{margin:0;color:var(--muted);font-family:var(--mono);font-size:.74rem}
  .about{margin:8px 0 0}
  .empty{color:var(--muted);margin:0}
  .bad{color:var(--bad)}
  .choose{display:flex;gap:6px;margin-top:8px}
  .choose button{font:inherit;font-size:.82rem;padding:4px 12px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:999px;cursor:pointer}
  .choose button:hover:not(:disabled){background:var(--soft)}
  .choose button:disabled{opacity:.55;cursor:default}
  .choose button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--panel)}
  .choose button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .legend{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0;font-size:.8rem;font-weight:600}
  .legend .del{color:var(--bad)} .legend .add{color:var(--ok)}
  .counts{margin-left:auto;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}
  .code{border:1px solid var(--rule);border-radius:6px;background:var(--panel);font-family:var(--mono);font-size:.76rem;line-height:1.55;overflow:hidden}
  .line{display:grid;grid-template-columns:3.5em 3.5em 1.5em minmax(0,1fr)}
  .no{text-align:right;padding-right:8px;color:var(--muted);font-variant-numeric:tabular-nums;user-select:none}
  .sign{text-align:center;user-select:none}
  .text{white-space:pre-wrap;overflow-wrap:anywhere;padding-right:8px}
  .line.del{background:color-mix(in srgb,var(--bad) 12%,transparent)}
  .line.add{background:color-mix(in srgb,var(--ok) 14%,transparent)}
  .line.del .sign{color:var(--bad)} .line.add .sign{color:var(--ok)}
  .skip{padding:2px 12px;background:var(--soft);color:var(--muted);font-family:var(--sans);font-size:.74rem}
  .pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  figure{margin:0;border:1px solid var(--rule);border-radius:6px;background:var(--panel);padding:12px;display:flex;flex-direction:column;gap:8px}
  figcaption{font-size:.8rem;font-weight:600}
  img{max-width:100%;max-height:60vh;object-fit:contain;align-self:flex-start}
  .none{margin:0;color:var(--muted)}
</style>
