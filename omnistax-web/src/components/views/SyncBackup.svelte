<script lang="ts">
  /* Manual sync: everything the reader owns saved to one file, or put back
     from one, carried between devices by hand. Putting one back replaces this device's data, so the file is
     read and summed up first and replaced only on a second click. */
  import { downloadBackup, importBackup, readBackupFile } from '../../lib/backup/adapters';
  import { summarizeBackup, type ReaderBackup } from '../../lib/backup/schema';
  import { i18n } from '../../lib/i18n/store.svelte';

  // IndexedDB journals require cloneable plain records, not reactive proxies.
  let backup = $state.raw<ReaderBackup | null>(null);
  let message = $state('');
  let exporting = $state(false);
  let importing = $state(false);

  const save = async (): Promise<void> => {
    exporting = true; message = '';
    try { await downloadBackup(); }
    catch (e) { message = e instanceof Error ? e.message : i18n.t('views.backup.exportFailed'); }
    finally { exporting = false; }
  };
  const choose = async (input: HTMLInputElement): Promise<void> => {
    const file = input.files?.[0];
    input.value = '';
    backup = null; message = '';
    if (!file) return;
    try { backup = await readBackupFile(file); } catch (e) { message = e instanceof Error ? e.message : i18n.t('views.backup.readFailed'); }
  };
  const restore = async (): Promise<void> => {
    if (!backup || importing) return;
    importing = true; message = '';
    try { await importBackup(backup); }
    catch (e) { alert(e instanceof Error ? e.message : i18n.t('views.backup.importFailed')); }
    location.reload();
  };
</script>

<section class="backup">
  <h4 class="eyebrow">{i18n.t('views.backup.title')}</h4>
  <p class="hint">{i18n.t('views.backup.hint')}</p>
  <div class="acts">
    <button class="btn" type="button" disabled={exporting} onclick={() => void save()}>{exporting ? i18n.t('views.backup.exporting') : i18n.t('views.backup.export')}</button>
    <label class="btn">{i18n.t('views.backup.import')}<input type="file" accept="application/json,.json" onchange={(e) => void choose(e.currentTarget)}></label>
  </div>
  {#if backup}
    {@const s = summarizeBackup(backup)}
    <div class="review" role="status">
      <strong>{i18n.t('views.backup.replaceAsk')}</strong>
      <span>{i18n.t('views.backup.summary', { when: new Date(s.exportedAt).toLocaleString(i18n.locale), records: s.records, assets: s.assets })}</span>
      <span>{i18n.t('views.backup.noMerge')}</span>
      <span class="acts">
        <button class="btn danger" type="button" disabled={importing} onclick={() => void restore()}>{importing ? i18n.t('views.backup.importing') : i18n.t('views.backup.replace')}</button>
        <button class="btn" type="button" disabled={importing} onclick={() => (backup = null)}>{i18n.t('views.sync.cancel')}</button>
      </span>
    </div>
  {/if}
  {#if message}<p class="hint bad" role="alert">{message}</p>{/if}
</section>

<style>
  .backup{display:flex;flex-direction:column;gap:8px}
  h4{margin:0}
  .hint{color:var(--muted);font-size:.76rem;margin:0;line-height:1.45}
  .bad{color:var(--bad)}
  .acts{display:flex;gap:6px;flex-wrap:wrap}
  .btn{font:inherit;font-size:.84rem;padding:5px 12px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:5px;cursor:pointer}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn:disabled{opacity:.55;cursor:default}
  .btn:focus-visible,label.btn:focus-within{outline:2px solid var(--accent);outline-offset:1px}
  label.btn input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  label.btn{position:relative}
  .danger{color:var(--bad)}
  .review{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--soft);color:var(--muted);font-size:.76rem}
  .review strong{color:var(--ink)}
</style>
