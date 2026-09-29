<script lang="ts">
  /* The one place the reader learns whether their data is safe. Everything
     they own lives in this browser, and a browser may throw it away when space
     runs short; the rest of the app says nothing about that, so this block
     says all of it: how much is in use, whether the browser has promised to
     keep it, what to do where it has not, and the way out — a backup, written
     from here.

     The numbers are read when the block is first shown and after an export,
     not on a timer: nothing here changes while the reader is looking at it. */
  import { backupSize, downloadBackup } from '../../lib/backup/adapters';
  import { WARN_BACKUP_BYTES } from '../../lib/backup/schema';
  import { sizeLabel } from '../../lib/files/model';
  import { files } from '../../lib/files/store.svelte';
  import { quotaWords, readHealth, requestPersist, SAFARI_WORDS, type Health } from '../../lib/storage/health';

  /* Whether the dialog's filter has left this block standing. The block draws
     its own section so that mounting it in Settings is one line. */
  let { show = true }: { show?: boolean } = $props();

  let health = $state.raw<Health | null>(null);
  let estimated = $state<number | null>(null);
  let weighing = $state(false);
  let exporting = $state(false);
  let message = $state('');

  /* Read once, as the dialog opens. */
  $effect(() => { if (health === null) void readHealth().then((h) => { health = h; }); });

  const used = $derived.by(() => {
    const e = health?.estimate;
    if (!e || e.usage === null) return 'Your browser doesn’t report how much space is used.';
    return [`${sizeLabel(e.usage)} used.`, quotaWords(e, sizeLabel)].filter(Boolean).join(' ');
  });
  const askable = $derived(health !== null && (health.persistence === 'denied' || health.persistence === 'unasked'));
  let asking = $state(false);
  const ask = async (): Promise<void> => {
    asking = true;
    await requestPersist();
    health = await readHealth();
    asking = false;
  };
  const mine = $derived(files.list.reduce((n, f) => n + f.size, 0));

  /* What the export would weigh. It is worked out by building it, so it is
     asked for rather than shown unbidden: a profile with a few PDFs in it is
     not free to measure. */
  const weigh = async (): Promise<void> => {
    weighing = true; message = '';
    try { estimated = await backupSize(); }
    catch { message = 'Couldn’t estimate the backup size.'; }
    finally { weighing = false; }
  };

  const save = async (): Promise<void> => {
    exporting = true; message = '';
    try { await downloadBackup(); void readHealth().then((h) => { health = h; }); }
    catch (error) { message = error instanceof Error ? error.message : 'Couldn’t export the backup.'; }
    finally { exporting = false; }
  };
</script>

<section hidden={!show}>
<h3>Storage</h3>
<div class="row">
  <span class="name">Space used</span>
  <span class="hint">{used}{#if mine} Imported files: {sizeLabel(mine)}.{/if}</span>
  <span></span>
</div>
{#if health?.fraction !== null && health?.fraction !== undefined}
  <div class="bar-row">
    <div class="bar"><div class="fill" style:width="{Math.round(health.fraction * 100)}%"></div></div>
  </div>
{/if}
<div class="row">
  <span class="name">Data retention</span>
  <span class="hint">{health ? health.words : 'Checking…'}{#if health?.safari} {SAFARI_WORDS}{/if}</span>
  {#if askable}<button class="btn-sm" type="button" id="storage-persist" disabled={asking} onclick={() => void ask()}>Keep my data</button>{:else}<span></span>{/if}
</div>
<div class="row">
  <span class="name">Backup</span>
  <span class="hint">
    Save your notes, highlights, imported files, practice, and settings to one file.
    {#if estimated !== null}Estimated size: {sizeLabel(estimated)}.{/if}
    {#if estimated !== null && estimated > WARN_BACKUP_BYTES}<strong class="warn">Some browsers fail to import a backup this large. Remove large imported files to shrink it.</strong>{/if}
  </span>
  <span class="acts">
    <button class="btn-sm" type="button" disabled={weighing} onclick={() => void weigh()}>{weighing ? 'Estimating…' : 'Estimate size'}</button>
    <button class="btn-sm" type="button" id="storage-export" disabled={exporting} onclick={() => void save()}>{exporting ? 'Exporting…' : 'Export backup'}</button>
  </span>
</div>
{#if message}<p class="bad-line" role="alert">{message}</p>{/if}
</section>

<style>
  /* The dialog's rules are scoped to the dialog, so the few this block stands
     on are said again here: a section, a heading, and the three-column row
     every setting is drawn in. */
  section{display:flex;flex-direction:column;gap:8px}
  h3{font-size:0.95rem;font-weight:600;margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
  .row{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:4px 0}
  .name{font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .hint{color:var(--muted);font-size:0.8rem;margin:0}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer;align-self:flex-start}
  .btn-sm:hover:not(:disabled){background:var(--soft)}
  .btn-sm:disabled{opacity:.5;cursor:default}
  @media (max-width:600px){ .row{grid-template-columns:1fr auto} .hint{grid-column:1 / -1} }

  .bar-row{margin:0 0 8px 162px}
  .bar{height:6px;border-radius:999px;background:var(--soft2);overflow:hidden}
  .fill{height:100%;background:var(--accent)}
  .acts{display:flex;gap:6px;align-items:center}
  .warn{display:block;margin-top:4px;color:var(--bad);font-weight:500}
  .bad-line{margin:0 0 0 162px;color:var(--bad);font-size:.8rem}
  @media (max-width:600px){ .bar-row,.bad-line{margin-left:0} }
</style>
