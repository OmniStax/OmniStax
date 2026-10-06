<script lang="ts">
  /* The backup file: everything the reader owns saved to one file, or put back
     from one. Putting one back replaces this device's data, so the file is
     read and summed up first and replaced only on a second click. */
  import { downloadBackup, importBackup, readBackupFile } from '../../lib/backup/adapters';
  import { summarizeBackup, type ReaderBackup } from '../../lib/backup/schema';

  // IndexedDB journals require cloneable plain records, not reactive proxies.
  let backup = $state.raw<ReaderBackup | null>(null);
  let message = $state('');
  let exporting = $state(false);
  let importing = $state(false);

  const save = async (): Promise<void> => {
    exporting = true; message = '';
    try { await downloadBackup(); }
    catch (e) { message = e instanceof Error ? e.message : 'Couldn’t export your data.'; }
    finally { exporting = false; }
  };
  const choose = async (input: HTMLInputElement): Promise<void> => {
    const file = input.files?.[0];
    input.value = '';
    backup = null; message = '';
    if (!file) return;
    try { backup = await readBackupFile(file); } catch (e) { message = e instanceof Error ? e.message : 'Couldn’t read this backup.'; }
  };
  const restore = async (): Promise<void> => {
    if (!backup || importing) return;
    importing = true; message = '';
    try { await importBackup(backup); }
    catch (e) { alert(e instanceof Error ? e.message : 'Couldn’t import the backup. Your previous data was restored.'); }
    location.reload();
  };
</script>

<section class="backup">
  <h4>Backup file</h4>
  <p class="hint">Notes and pasted images, imported files, drawings, chats, colors, practice, focus sessions, library, layout, shortcuts and preferences. AI keys, the sync token and textbooks aren’t included.</p>
  <div class="acts">
    <button class="btn" type="button" disabled={exporting} onclick={() => void save()}>{exporting ? 'Exporting…' : 'Export'}</button>
    <label class="btn">Import…<input type="file" accept="application/json,.json" onchange={(e) => void choose(e.currentTarget)}></label>
  </div>
  {#if backup}
    {@const s = summarizeBackup(backup)}
    <div class="review" role="status">
      <strong>Replace this device’s data?</strong>
      <span>Exported {new Date(s.exportedAt).toLocaleString()} · {s.records} records · {s.assets} note images</span>
      <span>Nothing is merged. A recovery copy is kept until the import finishes.</span>
      <span class="acts">
        <button class="btn danger" type="button" disabled={importing} onclick={() => void restore()}>{importing ? 'Importing…' : 'Replace and reload'}</button>
        <button class="btn" type="button" disabled={importing} onclick={() => (backup = null)}>Cancel</button>
      </span>
    </div>
  {/if}
  {#if message}<p class="hint bad" role="alert">{message}</p>{/if}
</section>

<style>
  .backup{display:flex;flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--rule)}
  h4{margin:0;font-size:.74rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
  .hint{color:var(--muted);font-size:.78rem;margin:0;line-height:1.4}
  .bad{color:var(--bad)}
  .acts{display:flex;gap:6px;flex-wrap:wrap}
  .btn{font:inherit;font-size:.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:5px;cursor:pointer}
  .btn:hover:not(:disabled){background:var(--soft)}
  .btn:disabled{opacity:.55;cursor:default}
  .btn:focus-visible,label.btn:focus-within{outline:2px solid var(--accent);outline-offset:1px}
  label.btn input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  label.btn{position:relative}
  .danger{color:var(--bad)}
  .review{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--soft);color:var(--muted);font-size:.78rem}
  .review strong{color:var(--ink)}
</style>
