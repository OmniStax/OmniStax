<script lang="ts">
  /* Sync. What it carries, said once; then a GitHub repo of the reader's own,
     set up once, and only what differs between it and this device, in three
     lists — changed in both, to push, to pull. One button moves them; the menu
     beside it pulls or pushes alone, or forces either way after a dialog that
     names what would be lost. A file's row opens its changes as a tab. Below,
     the manual way: a file. */
  import { untrack } from 'svelte';
  import { sizeLabel } from '../../lib/files/model';
  import { ICON } from '../../lib/icons';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { openInFocus } from '../../lib/layout/model';
  import { repoName } from '../../lib/sync/github';
  import { GROUP_LABEL } from '../../lib/sync/layout';
  import { tooLarge, type Change, type Letter, type Side, type Status } from '../../lib/sync/plan';
  import { session } from '../../lib/sync/session.svelte';
  import { sync } from '../../lib/sync/store.svelte';
  import SyncBackup from './SyncBackup.svelte';

  const remote = $derived(sync.remote);
  const key = $derived(remote ? `${remote.repo}\n${remote.branch}\n${remote.token}` : '');
  const badRepo = $derived(sync.saved.repo !== '' && repoName(sync.saved.repo) === null);
  let editing = $state(false);
  $effect(() => { if (key) untrack(() => void session.read()); else untrack(() => session.clear()); });

  const phase = $derived(session.phase);
  const changes = $derived(session.changes);
  const bySide = (side: Side): readonly Change[] => changes.filter((c) => c.side === side);
  const both = $derived(bySide('both'));
  const up = $derived(bySide('up'));
  const down = $derived(bySide('down'));
  const plan = $derived(session.plan);
  const unchosen = $derived(session.unchosen);
  const stuck = (c: Change): boolean => c.local !== null && tooLarge(c.size) && (c.side === 'up' || session.picks.get(c.path) === 'mine');
  const count = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

  const action = $derived(plan.down.length && plan.up.length ? `Pull ${plan.down.length} and push ${plan.up.length}` : plan.down.length ? `Pull ${plan.down.length}` : plan.up.length ? `Push ${plan.up.length}` : '');
  const summary = $derived.by(() => {
    if (phase === 'reading') return 'Checking…';
    if (phase === 'moving') return 'Syncing…';
    if (!session.seen) return '';
    if (session.seen.head.kind !== 'at' && !changes.length) return 'The branch is empty.';
    if (!changes.length) return 'Up to date';
    return [up.length && `${up.length} to push`, down.length && `${down.length} to pull`, both.length && `${both.length} changed in both`].filter(Boolean).join(' · ');
  });
  const lastSynced = $derived(sync.last?.at ? `Last synced ${new Date(sync.last.at).toLocaleString()}` : 'Not synced yet');
  const busy = $derived(phase === 'reading' || phase === 'moving');

  let menu = $state(false);
  const choose = (run: () => void): void => { menu = false; run(); };

  /* A force makes one side an exact copy of the other. The dialog names what
     that side would lose before anything moves. */
  type Force = 'device' | 'repo';
  let forcing = $state<Force | null>(null);
  let dialog = $state<HTMLDialogElement | null>(null);
  const lost = $derived(forcing ? changes.filter((c) => c.side !== (forcing === 'device' ? 'down' : 'up')) : []);
  const ask = (to: Force): void => { forcing = to; dialog?.showModal(); };
  const confirmForce = (): void => { const to = forcing; dialog?.close(); if (to) void session.force(to); };

  const show = (c: Change): void => {
    session.selected = c.path;
    layoutStore.apply((x) => openInFocus(x, 'view:sync-diff'));
    layoutStore.overlay = null;
  };

  const LETTER: Readonly<Record<Letter, string>> = { A: 'Added', M: 'Modified', D: 'Deleted', '!': 'Changed in both' };
  const stateText = (s: Status | undefined, c: Change): string => {
    if (!s) return stuck(c) ? 'over 100 MB' : c.letter === 'D' ? '' : sizeLabel(c.size);
    return s.kind === 'waiting' ? 'waiting' : s.kind === 'moving' ? 'moving…' : s.kind === 'done' ? '✓' : s.why;
  };
</script>

<svelte:window onclick={() => (menu = false)} onkeydown={(e) => { if (e.key === 'Escape') menu = false; }} />

{#snippet field(name: string, value: string, set: (v: string) => void, placeholder: string, type = 'text')}
  <label class="field">
    <span class="name">{name}</span>
    <input {type} spellcheck="false" autocomplete="off" {placeholder} {value} onchange={(e) => set(e.currentTarget.value)}>
  </label>
{/snippet}

{#snippet list(title: string, rows: readonly Change[], choosing = false)}
  {#if rows.length}
    <details open class="sec">
      <summary><span class="sec-name">{title}</span><span class="badge">{rows.length}</span></summary>
      {#if choosing}
        <div class="bulk">
          <span class="hint">Keep one version of each.</span>
          <button type="button" class="link" disabled={phase !== 'ready'} onclick={() => session.pickAll('mine')}>All this device’s</button>
          <button type="button" class="link" disabled={phase !== 'ready'} onclick={() => session.pickAll('theirs')}>All the repo’s</button>
        </div>
      {/if}
      <ul>
        {#each rows as c (c.path)}
          {@const s = session.status.get(c.path)}
          <li class:selected={session.selected === c.path}>
            <button type="button" class="file" title="Show changes · {c.path}" onclick={() => show(c)}>
              <span class="label">{c.label}</span>
              <span class="state" class:bad={s?.kind === 'failed' || (!s && stuck(c))} class:ok={s?.kind === 'done'}>{stateText(s, c)}</span>
              <span class="letter l{c.letter === '!' ? 'C' : c.letter}" title={LETTER[c.letter]} aria-label={LETTER[c.letter]}>{c.letter}</span>
              <span class="group">{GROUP_LABEL[c.group]}</span>
            </button>
            {#if choosing}
              <span class="choose" role="group" aria-label="Keep which version of {c.label}">
                <button type="button" aria-pressed={session.picks.get(c.path) === 'mine'} disabled={phase !== 'ready'} onclick={() => session.pick(c.path, 'mine')}>This device’s</button>
                <button type="button" aria-pressed={session.picks.get(c.path) === 'theirs'} disabled={phase !== 'ready'} onclick={() => session.pick(c.path, 'theirs')}>The repo’s</button>
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
{/snippet}

{#snippet item(label: string, note: string, run: () => void, disabled = false, danger = false)}
  <button type="button" role="menuitem" class:danger {disabled} onclick={() => choose(run)}>
    <span class="mi-label">{label}</span>
    <span class="mi-note">{note}</span>
  </button>
{/snippet}

<div class="sync">
  <p class="lede">Sync carries your notes and pasted images, imported files, drawings, chats, colors, practice, focus sessions, library, layout, shortcuts and preferences. AI keys, the sync token and textbooks stay on each device.</p>

  <section>
    <h4 class="eyebrow">GitHub</h4>
    {#if !remote || editing}
      <div class="setup">
        {#if !remote}<p class="hint">A repo of your own, private is fine. Requests go straight from this browser to GitHub.</p>{/if}
        {@render field('Repo', sync.saved.repo, (v) => sync.setRepo(v), 'owner/name')}
        {#if badRepo}<p class="hint bad">Write it as owner/name.</p>{/if}
        {@render field('Branch', sync.saved.branch, (v) => sync.setBranch(v), 'main')}
        {@render field('Token', sync.token, (v) => sync.setToken(v), 'github_pat_…', 'password')}
        <p class="hint">A fine-grained token for this repo only, with Contents read and write. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Make one</a>.</p>
        {#if remote}<button type="button" class="btn" onclick={() => (editing = false)}>Done</button>{/if}
      </div>
    {:else}
      <div class="where">
        <span class="repo" title="{remote.repo} · {remote.branch}">{remote.repo}</span>
        <button type="button" class="icon" title="Check for changes" aria-label="Check for changes" disabled={busy} onclick={() => void session.read()}>{@html ICON.refresh}</button>
        <button type="button" class="icon" title="Edit repo, branch and token" aria-label="Edit repo, branch and token" onclick={() => (editing = true)}>{@html ICON.pen}</button>
      </div>
      <p class="meta"><span class="branch">{remote.branch}</span>{#if phase === 'ready' && !changes.length}<span>{lastSynced}</span>{/if}</p>
      <p class="status" class:calm={!changes.length} role="status">{summary}</p>

      {#if changes.length}
        <div class="act">
          <button type="button" class="go" disabled={phase !== 'ready' || unchosen > 0 || !action} onclick={() => void session.go(plan)}>
            {unchosen ? `Choose a version for ${count(unchosen, 'file')}` : phase === 'moving' ? 'Syncing…' : action}
          </button>
          <button type="button" class="go more" aria-label="More sync actions" aria-haspopup="menu" aria-expanded={menu} disabled={phase !== 'ready'} onclick={(e) => { e.stopPropagation(); menu = !menu; }}>▾</button>
          {#if menu}
            <div class="menu" role="menu">
              {@render item(`Pull ${plan.down.length}`, 'Bring the repo’s changes here. Yours stay.', () => void session.go({ up: [], down: plan.down }), !plan.down.length)}
              {@render item(`Push ${plan.up.length}`, 'Send this device’s changes. The repo’s stay.', () => void session.go({ up: plan.up, down: [] }), !plan.up.length)}
              <hr>
              {@render item('Force pull…', 'Make this device an exact copy of the repo.', () => ask('device'), !session.seen?.manifest, true)}
              {@render item('Force push…', 'Make the repo an exact copy of this device.', () => ask('repo'), false, true)}
            </div>
          {/if}
        </div>
        {#if plan.down.length && !unchosen}<p class="hint">Pulling reloads OmniStax.</p>{/if}
      {/if}
      {#if session.problem}<p class="hint bad" role="alert">{session.problem}</p>{/if}

      {@render list('Changed in both', both, true)}
      {@render list('Push', up)}
      {@render list('Pull', down)}
    {/if}
  </section>

  <SyncBackup />
</div>

<dialog bind:this={dialog} onclose={() => (forcing = null)} aria-labelledby="force-title">
  {#if forcing}
    {@const pull = forcing === 'device'}
    <h3 id="force-title">{pull ? 'Force pull' : 'Force push'}?</h3>
    <p>{pull
      ? `This device becomes an exact copy of ${remote?.repo}. Nothing is merged, and OmniStax reloads.`
      : `${remote?.repo} becomes an exact copy of this device. Nothing is merged.`}</p>
    {#if lost.length}
      <p class="loss">{count(lost.length, 'change')} made {pull ? 'on this device' : 'in the repo'} will be discarded:</p>
      <ul class="lost">
        {#each lost.slice(0, 8) as c (c.path)}<li>{c.label} <span>{GROUP_LABEL[c.group]}</span></li>{/each}
        {#if lost.length > 8}<li class="rest">and {lost.length - 8} more</li>{/if}
      </ul>
    {:else}
      <p>Nothing {pull ? 'on this device' : 'in the repo'} would be lost: this does what a plain {pull ? 'pull' : 'push'} does.</p>
    {/if}
    {#if !pull}<p class="hint">The repo’s history keeps the old versions; other devices see these as changes to pull.</p>{/if}
    <div class="dlg-acts">
      <!-- svelte-ignore a11y_autofocus -->
      <button type="button" class="btn" autofocus onclick={() => dialog?.close()}>Cancel</button>
      <button type="button" class="btn danger" onclick={confirmForce}>{pull ? 'Force pull' : 'Force push'}</button>
    </div>
  {/if}
</dialog>

<style>
  /* Four sizes: .72 eyebrow, .76 secondary, .84 body, .95 the repo's name. */
  .sync{display:flex;flex-direction:column;gap:20px;font-size:.84rem;line-height:1.4}
  section{display:flex;flex-direction:column;gap:8px}
  h4{margin:0}
  .lede,.hint{color:var(--muted);font-size:.76rem;margin:0;line-height:1.45}
  .hint a{color:var(--accent)}
  .bad{color:var(--bad)}
  .setup{display:flex;flex-direction:column;gap:8px}
  .field{display:flex;flex-direction:column;gap:2px}
  .name{font-weight:600;font-size:.76rem}
  input{font:inherit;font-size:.84rem;padding:4px 8px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);width:100%;box-sizing:border-box}
  input:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}

  .where{display:flex;align-items:center;gap:2px}
  .repo{flex:1;min-width:0;font-size:.95rem;font-weight:600;letter-spacing:-.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .icon{width:26px;height:26px;flex:none;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .icon:hover:not(:disabled){background:var(--soft2);color:var(--ink)}
  .icon:active:not(:disabled){background:var(--rule)}
  .icon:disabled{opacity:.45;cursor:default}
  .icon :global(svg){width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .meta{display:flex;flex-wrap:wrap;gap:2px 8px;margin:-6px 0 0;font-size:.76rem;color:var(--muted)}
  .branch{font-family:var(--mono);font-size:.72rem}
  .status{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
  .status.calm{font-weight:400;color:var(--muted)}

  .link{border:0;background:transparent;padding:0;font:inherit;font-size:.76rem;color:var(--accent);cursor:pointer}
  .link:hover:not(:disabled){text-decoration:underline}
  .link:disabled{color:var(--muted);cursor:default}
  .btn{font:inherit;font-size:.84rem;padding:5px 12px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:5px;cursor:pointer;align-self:flex-start}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn.danger{color:var(--bad)}
  .btn:focus-visible,.link:focus-visible,.choose button:focus-visible,summary:focus-visible,.icon:focus-visible,.go:focus-visible,.file:focus-visible,.menu button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

  .act{position:relative;display:flex;gap:1px;isolation:isolate}
  .go{font:inherit;font-size:.84rem;font-weight:600;padding:6px 12px;border:0;background:var(--ink);color:var(--panel);cursor:pointer;flex:1;min-width:0;border-radius:5px 0 0 5px}
  .go.more{flex:none;width:30px;padding:0;border-radius:0 5px 5px 0}
  .go:hover:not(:disabled){opacity:.86}
  .go:disabled{background:var(--soft2);color:var(--muted);cursor:default}
  .menu{position:absolute;z-index:1;top:calc(100% + 4px);left:0;right:0;display:flex;flex-direction:column;padding:4px;background:var(--panel);border:1px solid var(--rule);border-radius:7px;box-shadow:0 6px 20px rgba(0,0,0,.14)}
  .menu button{display:flex;flex-direction:column;gap:1px;text-align:left;font:inherit;border:0;background:transparent;color:var(--ink);padding:5px 8px;border-radius:4px;cursor:pointer}
  .menu button:hover:not(:disabled){background:var(--soft)}
  .menu button:disabled{opacity:.45;cursor:default}
  .mi-label{font-weight:600}
  .menu .danger .mi-label{color:var(--bad)}
  .mi-note{font-size:.76rem;color:var(--muted)}
  .menu hr{border:0;border-top:1px solid var(--rule);margin:4px 0;width:100%}

  .sec{margin-top:4px}
  summary{display:flex;align-items:center;gap:6px;cursor:pointer;list-style:none;padding:4px 0;font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-radius:4px}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸";width:1em;font-size:.7rem}
  details[open]>summary::before{content:"▾"}
  .sec-name{flex:1}
  .badge{font-variant-numeric:tabular-nums;background:var(--soft2);color:var(--ink);border-radius:999px;padding:0 6px;letter-spacing:0}
  .bulk{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:0 0 4px}
  .bulk .hint{flex-basis:100%}
  ul{list-style:none;margin:0;padding:0}
  li{border-radius:5px;margin:0 -6px}
  li.selected{background:var(--soft2)}
  .file{display:grid;grid-template-columns:minmax(0,1fr) auto 1.1em;align-items:baseline;gap:0 8px;width:100%;padding:4px 6px;border:0;border-radius:5px;background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
  .file:hover{background:var(--soft)}
  li.selected .file:hover{background:transparent}
  .label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .group{grid-column:1 / -1;color:var(--muted);font-size:.72rem}
  .state{font-size:.72rem;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .state.ok{color:var(--ok)}
  .state.bad{color:var(--bad);white-space:normal}
  .letter{font-family:var(--mono);font-size:.76rem;font-weight:600;text-align:center}
  .lA{color:var(--ok)} .lM{color:var(--warm)} .lD,.lC{color:var(--bad)}
  .choose{display:flex;gap:4px;padding:0 6px 6px}
  .choose button{font:inherit;font-size:.72rem;padding:2px 8px;border:1px solid var(--rule);background:var(--panel);color:var(--muted);border-radius:999px;cursor:pointer}
  .choose button:hover:not(:disabled){color:var(--ink)}
  .choose button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--panel)}

  dialog{width:min(420px,calc(100vw - 32px));box-sizing:border-box;padding:20px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);color:var(--ink);font-family:var(--sans);font-size:.88rem;line-height:1.45;box-shadow:0 12px 40px rgba(0,0,0,.22)}
  dialog::backdrop{background:rgba(0,0,0,.25)}
  dialog h3{margin:0 0 8px;font-size:1rem}
  dialog p{margin:0 0 8px}
  .loss{font-weight:600;color:var(--bad)}
  .lost{margin:0 0 12px;max-height:40vh;overflow:auto}
  .lost li{margin:0;padding:2px 0}
  .lost span,.rest{color:var(--muted);font-size:.76rem}
  .lost span{margin-left:6px}
  .dlg-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
</style>
