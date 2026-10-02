<script lang="ts">
  /* The files a push or a pull will move, grouped, each with its size and a
     tick; then each one's progress as it goes. */
  import { onMount, untrack } from 'svelte';
  import { createBackup, importBackup } from '../../lib/backup/adapters';
  import { sizeLabel } from '../../lib/files/model';
  import type { Remote } from '../../lib/sync/github';
  import { GROUPS, GROUP_LABEL, toRepo, type RepoPath } from '../../lib/sync/layout';
  import { bytesOf, groupMark, pullRows, pushRows, remoteNewer, selectAll, selectNone, setFile, setGroup, tooLarge, type Direction, type Row, type Selection, type Status } from '../../lib/sync/plan';
  import { hashed, pull, push, survey, type HashedFile, type Survey } from '../../lib/sync/run';
  import { sync } from '../../lib/sync/store.svelte';

  let { direction, remote, onclose }: { direction: Direction; remote: Remote; onclose: () => void } = $props();

  type Phase = 'reading' | 'ready' | 'moving' | 'finished' | 'failed';
  let phase = $state<Phase>('reading');
  let message = $state('');
  let seen = $state.raw<Survey | null>(null);
  let local = $state.raw<readonly HashedFile[]>([]);
  let rows = $state.raw<readonly Row[]>([]);
  let sel = $state.raw<Selection>(new Set());
  let status = $state.raw<ReadonlyMap<RepoPath, Status>>(new Map());

  const verb = direction === 'push' ? 'Push' : 'Pull';
  const failure = (e: unknown): string => e instanceof Error ? e.message : `Couldn’t ${direction}.`;

  onMount(() => untrack(() => void (async () => {
    try {
      const [s, mine] = await Promise.all([survey(remote, fetch.bind(globalThis)), createBackup().then(toRepo).then(hashed)]);
      seen = s; local = mine;
      rows = direction === 'push' ? pushRows(mine, s.remote) : pullRows(s.remote, s.manifest, new Map(mine.map((f) => [f.path, f.sha] as const)));
      sel = selectAll(rows);
      if (direction === 'pull' && !s.manifest) { phase = 'failed'; message = 'The repo holds no OmniStax data yet.'; return; }
      phase = 'ready';
    } catch (e) { phase = 'failed'; message = failure(e); }
  })()));

  const newer = $derived(direction === 'push' && seen !== null && remoteNewer(seen.head, sync.last?.sha ?? null));
  const report = (path: RepoPath, s: Status): void => { status = new Map(status).set(path, s); };

  const run = async (): Promise<void> => {
    if (!seen) return;
    phase = 'moving'; message = ''; status = new Map();
    try {
      if (direction === 'push') {
        sync.synced(await push(remote, fetch.bind(globalThis), seen, local, rows, sel, report));
        phase = 'finished';
        message = [...status.values()].some((s) => s.kind === 'failed') ? 'Pushed, except the files marked failed.' : 'Pushed.';
        return;
      }
      const backup = await pull(remote, fetch.bind(globalThis), rows, sel, new Map(local.map((f) => [f.path, f.bytes] as const)), report);
      const head = seen.head.kind === 'at' ? seen.head.commit : null;
      try { await importBackup(backup); if (head) sync.synced(head); }
      catch (e) { alert(e instanceof Error ? e.message : 'Couldn’t replace your data. Your previous data was restored.'); }
      location.reload();
    } catch (e) { phase = 'failed'; message = failure(e); }
  };

  const busy = $derived(phase === 'reading' || phase === 'moving');
  const close = (): void => { if (!busy) onclose(); };
  const onKey = (e: KeyboardEvent): void => { e.stopPropagation(); if (e.key === 'Escape') close(); };
  const tri = (node: HTMLInputElement, on: boolean) => { node.indeterminate = on; return { update(v: boolean) { node.indeterminate = v; } }; };
  const open = $state<Record<string, boolean>>({});

  const statusText = (s: Status | undefined, row: Row): string => {
    if (!s) return row.same ? 'unchanged' : direction === 'push' && tooLarge(row.size) ? 'over 100 MB' : '';
    if (s.kind === 'same') return 'unchanged';
    if (s.kind === 'waiting') return 'waiting';
    if (s.kind === 'moving') return direction === 'push' ? 'sending…' : 'fetching…';
    if (s.kind === 'done') return '✓';
    return s.why;
  };
</script>

<div class="scrim">
  <div class="panel" role="dialog" aria-modal="true" aria-label={verb} tabindex="-1" onkeydown={onKey}>
    <header>
      <strong>{verb}</strong>
      <span class="where">{direction === 'push' ? 'to' : 'from'} {remote.repo} · {remote.branch}</span>
      <button type="button" class="x" aria-label="Close" title="Close" disabled={busy} onclick={close}>×</button>
    </header>

    {#if phase === 'reading'}
      <p class="hint">Reading…</p>
    {:else}
      {#if newer && phase === 'ready'}<p class="warn" role="alert">The repo has changes this device hasn’t pulled. Pushing replaces them.</p>{/if}
      {#if direction === 'pull' && phase === 'ready'}<p class="hint">Pulling replaces what’s on this device. Unticked files keep this device’s copy.</p>{/if}
      {#if rows.length}
        <div class="bar">
          <button type="button" class="btn-sm" disabled={phase !== 'ready'} onclick={() => (sel = selectAll(rows))}>All</button>
          <button type="button" class="btn-sm" disabled={phase !== 'ready'} onclick={() => (sel = selectNone(rows))}>None</button>
          <span class="total">{sel.size} of {rows.length} files · {sizeLabel(bytesOf(rows, sel))}</span>
        </div>
        <div class="list">
          {#each GROUPS as g (g)}
            {@const inGroup = rows.filter((r) => r.group === g)}
            {#if inGroup.length}
              {@const mark = groupMark(sel, rows, g)}
              <div class="group">
                <div class="ghead">
                  <input type="checkbox" aria-label="All {GROUP_LABEL[g]}" disabled={phase !== 'ready'} checked={mark === 'all'} use:tri={mark === 'some'} onchange={(e) => (sel = setGroup(sel, rows, g, e.currentTarget.checked))}>
                  <button type="button" class="gname" aria-expanded={open[g] ?? false} onclick={() => (open[g] = !(open[g] ?? false))}>
                    <span class="caret">{open[g] ? '▾' : '▸'}</span> {GROUP_LABEL[g]}
                  </button>
                  <span class="count">{inGroup.length} · {sizeLabel(inGroup.reduce((n, r) => n + r.size, 0))}</span>
                </div>
                {#if open[g] || inGroup.some((r) => status.get(r.path)?.kind === 'failed')}
                  {#each inGroup as r (r.path)}
                    {@const s = status.get(r.path)}
                    <label class="file" class:off={!sel.has(r.path)}>
                      <input type="checkbox" disabled={r.required || phase !== 'ready'} checked={sel.has(r.path)} onchange={(e) => (sel = setFile(sel, r, e.currentTarget.checked))}>
                      <span class="label" title={r.path}>{r.label}</span>
                      <span class="size">{sizeLabel(r.size)}</span>
                      <span class="state" class:bad={s?.kind === 'failed' || (!s && direction === 'push' && tooLarge(r.size))} class:ok={s?.kind === 'done'}>{statusText(s, r)}</span>
                    </label>
                  {/each}
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
      {#if message}<p class:bad={phase === 'failed'} class="hint" role="status">{message}</p>{/if}
    {/if}

    <footer>
      {#if phase === 'finished' || phase === 'failed'}
        <button type="button" class="btn-sm" onclick={close}>Close</button>
      {:else}
        <button type="button" class="btn-sm" disabled={busy} onclick={close}>Cancel</button>
        <button type="button" class="btn-sm go" class:danger={newer || direction === 'pull'} disabled={phase !== 'ready'} onclick={() => void run()}>{phase === 'moving' ? `${verb}ing…` : direction === 'pull' ? 'Pull and reload' : 'Push'}</button>
      {/if}
    </footer>
  </div>
</div>

<style>
  .scrim{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(0,0,0,.18);padding:16px}
  .panel{width:min(620px,100%);max-height:82vh;display:flex;flex-direction:column;gap:10px;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:14px 18px 16px;box-shadow:0 12px 40px rgba(0,0,0,.22);box-sizing:border-box;font-family:var(--sans);font-size:.86rem}
  header{display:flex;align-items:baseline;gap:10px}
  .where{color:var(--muted);font-size:.8rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .x{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:4px}
  .x:hover:not(:disabled){background:var(--soft);color:var(--ink)}
  .hint{color:var(--muted);font-size:.8rem;margin:0}
  .warn,.bad{color:var(--bad)}
  .warn{margin:0;font-size:.82rem}
  .bar{display:flex;align-items:center;gap:6px}
  .total{margin-left:auto;color:var(--muted);font-size:.8rem;font-variant-numeric:tabular-nums}
  .list{overflow:auto;min-height:0;border:1px solid var(--rule);border-radius:6px}
  .group+.group{border-top:1px solid var(--rule)}
  .ghead{display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--soft)}
  .gname{flex:1;text-align:left;font:inherit;font-weight:600;border:0;background:transparent;color:var(--ink);cursor:pointer;padding:0}
  .caret{display:inline-block;width:1em;color:var(--muted)}
  .count{color:var(--muted);font-size:.78rem;font-variant-numeric:tabular-nums}
  .file{display:grid;grid-template-columns:auto 1fr auto 7.5em;align-items:center;gap:8px;padding:2px 8px 2px 30px;cursor:pointer}
  .file.off .label,.file.off .size{color:var(--muted)}
  .label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .size{color:var(--muted);font-size:.78rem;font-variant-numeric:tabular-nums;text-align:right}
  .state{font-size:.78rem;color:var(--muted);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .state.ok{color:var(--good, var(--accent))}
  .state.bad{white-space:normal}
  footer{display:flex;justify-content:flex-end;gap:6px}
  .btn-sm{font:inherit;font-size:.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer}
  .btn-sm:hover:not(:disabled){background:var(--soft)}
  .btn-sm:disabled{opacity:.5;cursor:default}
  .go{font-weight:600}
  .danger{color:var(--bad)}
</style>
