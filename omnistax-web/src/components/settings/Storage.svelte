<script lang="ts">
  /* The one place the reader learns whether their data is safe. Everything
     they own lives in this browser, and a browser may throw it away when space
     runs short; the rest of the app says nothing about that, so this block
     says all of it: how much is in use, whether the browser has promised to
     keep it, and what to do where it has not. The way out, a backup file or a
     GitHub repo, is in the Sync sidebar.

     The numbers are read when the block is first shown, not on a timer:
     nothing here changes while the reader is looking at it. */
  import { sizeLabel } from '../../lib/files/model';
  import { files } from '../../lib/files/store.svelte';
  import { quotaWords, readHealth, requestPersist, SAFARI_WORDS, type Health } from '../../lib/storage/health';

  let health = $state.raw<Health | null>(null);

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

</script>

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

<style>
  .bar-row{margin:0 0 8px 162px}
  .bar{height:6px;border-radius:999px;background:var(--soft2);overflow:hidden}
  .fill{height:100%;background:var(--accent)}
  @media (max-width:600px){ .bar-row{margin-left:0} }
</style>
