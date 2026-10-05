<script lang="ts">
  /* The rail's sync dialog: a GitHub repo of the reader's own, with a token they paste. */
  import { repoName } from '../lib/sync/github';
  import type { Direction } from '../lib/sync/plan';
  import { sync } from '../lib/sync/store.svelte';
  import { ui, keys } from '../lib/commands/setup.svelte';
  import SyncPanel from './settings/SyncPanel.svelte';

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') ui.sync = false;
    else if (e.ctrlKey || e.metaKey || e.altKey) keys.dispatch(e);
  };
  let panel = $state<Direction | null>(null);
  const badRepo = $derived(sync.saved.repo !== '' && repoName(sync.saved.repo) === null);
  const remote = $derived(sync.remote);
</script>

<div class="scrim">
  <div class="dialog" id="sync" onclick={(e) => e.stopPropagation()} onkeydown={onKey} role="dialog" tabindex="-1" aria-label="GitHub sync">
    <header>
      <div class="eyebrow">GitHub sync</div>
      <button type="button" class="x" aria-label="Close" onclick={() => (ui.sync = false)}>×</button>
    </header>
    <p class="hint">Push and pull everything to a GitHub repo of your own; private is fine. Requests go straight from this browser to GitHub.</p>
    <label class="row">
      <span class="name">Repo</span>
      <span class="hint" class:bad={badRepo}>{badRepo ? 'Write it as owner/name.' : ''}</span>
      <input type="text" spellcheck="false" autocomplete="off" placeholder="owner/name" value={sync.saved.repo} onchange={(e) => sync.setRepo(e.currentTarget.value)}>
    </label>
    <label class="row">
      <span class="name">Branch</span>
      <span></span>
      <input type="text" spellcheck="false" autocomplete="off" placeholder="main" value={sync.saved.branch} onchange={(e) => sync.setBranch(e.currentTarget.value)}>
    </label>
    <label class="row">
      <span class="name">Token</span>
      <span class="hint">A fine-grained token for this repo only, with Contents read and write. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Make one</a>. It stays in this browser and out of backups.</span>
      <input type="password" autocomplete="off" placeholder="github_pat_…" value={sync.token} onchange={(e) => sync.setToken(e.currentTarget.value)}>
    </label>
    <div class="row">
      <span class="name">Push and pull</span>
      <span class="hint">{sync.last ? `Last synced ${new Date(sync.last.at).toLocaleString()}.` : 'Not synced yet.'}</span>
      <span class="acts">
        <button class="btn-sm" type="button" disabled={!remote} onclick={() => (panel = 'push')}>Push</button>
        <button class="btn-sm" type="button" disabled={!remote} onclick={() => (panel = 'pull')}>Pull</button>
      </span>
    </div>
  {#if panel && remote}<SyncPanel direction={panel} {remote} onclose={() => (panel = null)} />{/if}
  </div>
</div>

<style>
  .scrim{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:rgba(0,0,0,.18);padding:16px}
  .dialog{width:min(620px,100%);max-height:88vh;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:18px 24px 20px;font-family:var(--sans);font-size:0.88rem;box-shadow:0 12px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:8px;box-sizing:border-box}
  header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .x{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:4px;flex:none}
  .x:hover{background:var(--soft);color:var(--ink)}
  .row{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:4px 0}
  .name{font-weight:600}
  .hint{color:var(--muted);font-size:0.8rem;margin:0}
  .hint a{color:var(--accent)}
  .bad{color:var(--bad)}
  input{font:inherit;font-size:0.82rem;padding:3px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);width:14rem;box-sizing:border-box}
  .acts{display:flex;gap:6px}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer}
  .btn-sm:hover:not(:disabled){background:var(--soft)}
  .btn-sm:disabled{opacity:.5;cursor:default}
  @media (max-width:600px){ .row{grid-template-columns:1fr auto} .hint{grid-column:1 / -1} }
</style>
