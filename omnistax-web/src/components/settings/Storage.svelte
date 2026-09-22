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
  import { readHealth, SAFARI_WORDS, type Health } from '../../lib/storage/health';

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
    if (!e || e.usage === null) return 'Your browser does not say how much is in use.';
    return e.quota === null ? `Using ${sizeLabel(e.usage)}.` : `Using ${sizeLabel(e.usage)} of ${sizeLabel(e.quota)}.`;
  });
  const mine = $derived(files.list.reduce((n, f) => n + f.size, 0));

  /* What the export would weigh. It is worked out by building it, so it is
     asked for rather than shown unbidden: a profile with a few PDFs in it is
     not free to measure. */
  const weigh = async (): Promise<void> => {
    weighing = true; message = '';
    try { estimated = await backupSize(); }
    catch { message = 'The size of the backup could not be worked out.'; }
    finally { weighing = false; }
  };

  const save = async (): Promise<void> => {
    exporting = true; message = '';
    try { await downloadBackup(); void readHealth().then((h) => { health = h; }); }
    catch (error) { message = error instanceof Error ? error.message : 'The backup could not be exported.'; }
    finally { exporting = false; }
  };
</script>

<section hidden={!show}>
<h3>Storage</h3>
<div class="row">
  <span class="name">This browser's storage</span>
  <span class="hint">{used}{#if mine} Imported files account for {sizeLabel(mine)} of it.{/if}</span>
  <span></span>
</div>
{#if health?.fraction !== null && health?.fraction !== undefined}
  <div class="bar-row">
    <div class="bar"><div class="fill" style:width="{Math.round(health.fraction * 100)}%"></div></div>
  </div>
{/if}
<div class="row">
  <span class="name">Keeping your data</span>
  <span class="hint">{health ? health.words : 'Asking your browser…'}{#if health?.safari} {SAFARI_WORDS}{/if}</span>
  <span></span>
</div>
<div class="row">
  <span class="name">Back it up</span>
  <span class="hint">
    A backup carries your notes, highlights, imported files, practice and settings as one file.
    {#if estimated === null}Its size can be worked out before you write it.{:else}This one would be about {sizeLabel(estimated)}.{/if}
    {#if estimated !== null && estimated > WARN_BACKUP_BYTES}<strong class="warn">A backup this large may be refused by some browsers when you come to load it; keep it somewhere safe and consider removing large imported files.</strong>{/if}
  </span>
  <span class="acts">
    <button class="btn-sm" type="button" disabled={weighing} onclick={() => void weigh()}>{weighing ? 'Working it out…' : 'Estimate size'}</button>
    <button class="btn-sm" type="button" id="storage-export" disabled={exporting} onclick={() => void save()}>{exporting ? 'Exporting…' : 'Export a backup'}</button>
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
