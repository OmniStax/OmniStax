<script lang="ts">
  /* Sync and Update. A GitHub repo of the reader's own, set up once; then only
     what differs between it and this device, in three lists — changed here,
     changed in the repo, changed in both — and one button that moves them.
     Replacing either side whole stands apart under Overwrite. Below, the
     backup file. */
  import { untrack } from 'svelte';
  import { createBackup, importBackup } from '../../lib/backup/adapters';
  import { sizeLabel } from '../../lib/files/model';
  import { repoName, type Remote } from '../../lib/sync/github';
  import { GROUP_LABEL, toRepo } from '../../lib/sync/layout';
  import { changesOf, overwrite, planOf, rebase, tooLarge, type Change, type Letter, type Pick, type Plan, type Side, type Status } from '../../lib/sync/plan';
  import { carry, hashed, survey, type HashedFile, type Survey } from '../../lib/sync/run';
  import { sync } from '../../lib/sync/store.svelte';
  import SyncBackup from './SyncBackup.svelte';

  const remote = $derived(sync.remote);
  const key = $derived(remote ? `${remote.repo}\n${remote.branch}\n${remote.token}` : '');
  const badRepo = $derived(sync.saved.repo !== '' && repoName(sync.saved.repo) === null);

  type Phase = 'idle' | 'reading' | 'ready' | 'moving';
  let phase = $state<Phase>('idle');
  let problem = $state('');
  let seen = $state.raw<Survey | null>(null);
  let local = $state.raw<readonly HashedFile[]>([]);
  let changes = $state.raw<readonly Change[]>([]);
  let picks = $state.raw<ReadonlyMap<string, Pick>>(new Map());
  let status = $state.raw<ReadonlyMap<string, Status>>(new Map());
  let editing = $state(false);
  const failure = (e: unknown): string => e instanceof Error ? e.message : 'Couldn’t reach GitHub.';

  let ticket = 0;
  const read = async (r: Remote): Promise<void> => {
    const mine = ++ticket;
    phase = 'reading'; problem = '';
    try {
      const [s, files] = await Promise.all([survey(r, fetch.bind(globalThis)), createBackup().then(toRepo).then(hashed)]);
      if (mine !== ticket) return;
      const base = rebase(sync.last?.base ?? {}, new Map(files.map((f) => [f.path, f.sha] as const)), new Map(s.remote.map((e) => [e.path, e.sha] as const)));
      sync.agreed(base, false);
      seen = s; local = files; changes = changesOf(files, s.remote, base, s.manifest);
      picks = new Map(); status = new Map(); phase = 'ready';
    } catch (e) { if (mine === ticket) { phase = 'idle'; problem = failure(e); } }
  };
  $effect(() => { if (key) untrack(() => { if (remote) void read(remote); }); else { ticket++; phase = 'idle'; seen = null; changes = []; } });

  const bySide = (side: Side): readonly Change[] => changes.filter((c) => c.side === side);
  const both = $derived(bySide('both'));
  const up = $derived(bySide('up'));
  const down = $derived(bySide('down'));
  const plan = $derived(planOf(changes, picks));
  const open = $derived(both.filter((c) => !picks.has(c.path)).length);
  const stuck = (c: Change): boolean => c.local !== null && tooLarge(c.size) && (c.side === 'up' || picks.get(c.path) === 'mine');
  const count = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

  const action = $derived(plan.down.length && plan.up.length ? `Pull ${plan.down.length} and push ${plan.up.length}` : plan.down.length ? `Pull ${plan.down.length}` : plan.up.length ? `Push ${plan.up.length}` : '');
  const summary = $derived.by(() => {
    if (phase === 'reading') return `Checking ${remote?.repo ?? 'the repo'}…`;
    if (phase === 'moving') return 'Syncing…';
    if (!seen) return '';
    if (seen.head.kind !== 'at' && !changes.length) return 'The branch is empty.';
    if (!changes.length) return 'Up to date.';
    return [up.length && `${up.length} to push`, down.length && `${down.length} to pull`, both.length && `${both.length} changed in both`].filter(Boolean).join(' · ');
  });
  const lastSynced = $derived(sync.last?.at ? `Last synced ${new Date(sync.last.at).toLocaleString()}.` : 'Not synced yet.');

  const report = (path: string, s: Status): void => { status = new Map(status).set(path, s); };
  const go = async (p: Plan): Promise<void> => {
    if (!seen || !remote || phase !== 'ready') return;
    phase = 'moving'; problem = ''; status = new Map();
    try {
      const out = await carry(remote, fetch.bind(globalThis), seen, local, p, sync.last?.base ?? {}, report);
      if (out.backup) {
        try { await importBackup(out.backup); sync.agreed(out.base, true); }
        catch (e) { alert(e instanceof Error ? e.message : 'Couldn’t update your data. Your previous data was restored.'); }
        location.reload();
        return;
      }
      sync.agreed(out.base, true);
      await read(remote);
    } catch (e) { phase = 'ready'; problem = failure(e); }
  };

  /* Replacing a side is the one way to lose work, so each says how much it
     discards and asks first when that is anything at all. */
  const lostHere = $derived(changes.filter((c) => c.side !== 'down').length);
  const lostThere = $derived(changes.filter((c) => c.side !== 'up').length);
  const replaceDevice = (): void => {
    if (lostHere && !confirm(`Discard ${count(lostHere, 'change')} on this device that the repo doesn’t have, and reload?`)) return;
    void go(overwrite(changes, 'device'));
  };
  const replaceRepo = (): void => {
    if (lostThere && !confirm(`Discard ${count(lostThere, 'change')} in ${remote?.repo} that this device doesn’t have?`)) return;
    void go(overwrite(changes, 'repo'));
  };

  const pickAll = (p: Pick): void => { picks = new Map([...picks, ...both.map((c) => [c.path, p] as const)]); };
  const pickOne = (c: Change, p: Pick): void => { const next = new Map(picks); if (next.get(c.path) === p) next.delete(c.path); else next.set(c.path, p); picks = next; };
  const LETTER: Readonly<Record<Letter, string>> = { A: 'Added', M: 'Modified', D: 'Deleted', '!': 'Changed in both' };
  const stateText = (s: Status | undefined, c: Change): string => {
    if (!s) return stuck(c) ? 'over 100 MB' : c.letter === 'D' ? '' : sizeLabel(c.size);
    return s.kind === 'waiting' ? 'waiting' : s.kind === 'moving' ? 'moving…' : s.kind === 'done' ? '✓' : s.why;
  };
  const busy = $derived(phase === 'reading' || phase === 'moving');
</script>

{#snippet field(name: string, value: string, set: (v: string) => void, placeholder: string, type = 'text')}
  <label class="field">
    <span class="name">{name}</span>
    <input {type} spellcheck="false" autocomplete="off" {placeholder} {value} onchange={(e) => set(e.currentTarget.value)}>
  </label>
{/snippet}

{#snippet list(title: string, rows: readonly Change[], choose = false)}
  {#if rows.length}
    <details open class="sec">
      <summary><span class="sec-name">{title}</span><span class="badge">{rows.length}</span></summary>
      {#if choose}
        <div class="bulk">
          <span class="hint">Keep one version of each.</span>
          <button type="button" class="link" disabled={phase !== 'ready'} onclick={() => pickAll('mine')}>All this device’s</button>
          <button type="button" class="link" disabled={phase !== 'ready'} onclick={() => pickAll('theirs')}>All the repo’s</button>
        </div>
      {/if}
      <ul>
        {#each rows as c (c.path)}
          {@const s = status.get(c.path)}
          <li class="file" title={c.path}>
            <span class="label">{c.label}<span class="group">{GROUP_LABEL[c.group]}</span></span>
            <span class="state" class:bad={s?.kind === 'failed' || (!s && stuck(c))} class:ok={s?.kind === 'done'}>{stateText(s, c)}</span>
            <span class="letter l{c.letter === '!' ? 'C' : c.letter}" title={LETTER[c.letter]} aria-label={LETTER[c.letter]}>{c.letter}</span>
            {#if c.side === 'both'}
              <span class="choose" role="group" aria-label="Keep which version of {c.label}">
                <button type="button" aria-pressed={picks.get(c.path) === 'mine'} disabled={phase !== 'ready'} onclick={() => pickOne(c, 'mine')}>This device’s</button>
                <button type="button" aria-pressed={picks.get(c.path) === 'theirs'} disabled={phase !== 'ready'} onclick={() => pickOne(c, 'theirs')}>The repo’s</button>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
{/snippet}

<div class="sync">
  {#if !remote || editing}
    <section class="setup">
      {#if !remote}<p class="hint">Keep your notes, practice and settings in a GitHub repo of your own, private is fine, and bring them to any device. Requests go straight from this browser to GitHub.</p>{/if}
      {@render field('Repo', sync.saved.repo, (v) => sync.setRepo(v), 'owner/name')}
      {#if badRepo}<p class="hint bad">Write it as owner/name.</p>{/if}
      {@render field('Branch', sync.saved.branch, (v) => sync.setBranch(v), 'main')}
      {@render field('Token', sync.token, (v) => sync.setToken(v), 'github_pat_…', 'password')}
      <p class="hint">A fine-grained token for this repo only, with Contents read and write. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Make one</a>. It stays in this browser and out of backups.</p>
      {#if remote}<button type="button" class="btn" onclick={() => (editing = false)}>Done</button>{/if}
    </section>
  {:else}
    <div class="where">
      <span class="repo" title="{remote.repo} · {remote.branch}">{remote.repo}<span class="branch">{remote.branch}</span></span>
      <button type="button" class="link" disabled={busy} onclick={() => void read(remote)}>Refresh</button>
      <button type="button" class="link" onclick={() => (editing = true)}>Edit</button>
    </div>
    <p class="status" role="status">{summary}{#if phase === 'ready' && !changes.length} {lastSynced}{/if}</p>

    {#if action || open}
      <button type="button" class="btn go" disabled={phase !== 'ready' || open > 0 || !action} onclick={() => void go(plan)}>
        {open ? `Choose a version for ${count(open, 'file')}` : phase === 'moving' ? 'Syncing…' : action}
      </button>
      {#if plan.down.length && !open}<p class="hint">Pulling reloads OmniStax. Changes on this device stay.</p>{/if}
    {/if}
    {#if problem}<p class="hint bad" role="alert">{problem}</p>{/if}

    {@render list('Changed in both', both, true)}
    {@render list('Push', up)}
    {@render list('Pull', down)}

    {#if seen && phase !== 'reading'}
      <details class="sec danger-zone">
        <summary><span class="sec-name">Overwrite</span></summary>
        <div class="over">
          <button type="button" class="btn danger" disabled={phase !== 'ready' || !seen.manifest} onclick={replaceDevice}>Replace this device with the repo</button>
          <p class="hint">{seen.manifest ? `Everything here becomes the repo’s, then OmniStax reloads.${lostHere ? ` Discards ${count(lostHere, 'change')} made on this device.` : ''}` : 'The repo holds no OmniStax data yet.'}</p>
          <button type="button" class="btn danger" disabled={phase !== 'ready'} onclick={replaceRepo}>Replace the repo with this device</button>
          <p class="hint">The repo becomes this device’s copy.{lostThere ? ` Discards ${count(lostThere, 'change')} made in the repo.` : ''}</p>
        </div>
      </details>
    {/if}
  {/if}

  <SyncBackup />
</div>

<style>
  .sync{display:flex;flex-direction:column;gap:8px;font-size:.84rem}
  .hint{color:var(--muted);font-size:.78rem;margin:0;line-height:1.4}
  .hint a{color:var(--accent)}
  .bad{color:var(--bad)}
  .setup{display:flex;flex-direction:column;gap:6px}
  .field{display:flex;flex-direction:column;gap:2px}
  .name{font-weight:600;font-size:.8rem}
  input{font:inherit;font-size:.82rem;padding:4px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);width:100%;box-sizing:border-box}
  input:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  .where{display:flex;align-items:baseline;gap:8px}
  .repo{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .branch{font-weight:400;color:var(--muted);margin-left:6px;font-family:var(--mono);font-size:.74rem}
  .status{margin:0;color:var(--ink);font-size:.8rem}
  .link{border:0;background:transparent;padding:0;font:inherit;font-size:.78rem;color:var(--accent);cursor:pointer}
  .link:hover:not(:disabled){text-decoration:underline}
  .link:disabled{color:var(--muted);cursor:default}
  .btn{font:inherit;font-size:.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:5px;cursor:pointer;align-self:flex-start}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn:disabled{opacity:.55;cursor:default}
  .btn:focus-visible,.link:focus-visible,.choose button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .go{align-self:stretch;font-weight:600;background:var(--ink);color:var(--panel);border-color:var(--ink)}
  .go:hover:not(:disabled){background:var(--ink);opacity:.88}
  .go:disabled{background:var(--soft);color:var(--muted);border-color:var(--rule);opacity:1}
  .danger{color:var(--bad)}
  .sec{border-top:1px solid var(--rule);padding-top:4px}
  summary{display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none;padding:3px 0;font-size:.74rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸";width:1em;font-size:.7rem}
  details[open]>summary::before{content:"▾"}
  .sec-name{flex:1}
  .badge{font-variant-numeric:tabular-nums;background:var(--soft2);color:var(--ink);border-radius:999px;padding:0 6px;font-size:.72rem;letter-spacing:0}
  .bulk{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;padding:2px 0 4px}
  .bulk .hint{flex-basis:100%}
  ul{list-style:none;margin:0;padding:0}
  .file{display:grid;grid-template-columns:minmax(0,1fr) auto 1.1em;align-items:baseline;gap:2px 8px;padding:3px 2px;border-radius:4px}
  .file:hover{background:var(--soft)}
  .label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .group{color:var(--muted);font-size:.74rem;margin-left:6px}
  .state{font-size:.74rem;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .state.ok{color:var(--ok)}
  .state.bad{color:var(--bad);white-space:normal}
  .letter{font-family:var(--mono);font-size:.74rem;font-weight:600;text-align:center}
  .lA{color:var(--ok)} .lM{color:var(--warm)} .lD,.lC{color:var(--bad)}
  .choose{grid-column:1 / -1;display:flex;gap:4px}
  .choose button{font:inherit;font-size:.74rem;padding:2px 8px;border:1px solid var(--rule);background:var(--panel);color:var(--muted);border-radius:999px;cursor:pointer}
  .choose button:hover:not(:disabled){color:var(--ink)}
  .choose button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--panel)}
  .over{display:flex;flex-direction:column;gap:4px;padding:4px 0}
  .over .hint{margin-bottom:6px}
  .danger-zone summary{color:var(--bad)}
</style>
