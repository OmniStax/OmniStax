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
  import { PERSIST_WORDS_KEY, quotaWords, readHealth, requestPersist, SAFARI_WORDS_KEY, type Health } from '../../lib/storage/health';
  import { i18n } from '../../lib/i18n/store.svelte';

  let health = $state.raw<Health | null>(null);

  /* Read once, as the dialog opens. */
  $effect(() => { if (health === null) void readHealth().then((h) => { health = h; }); });

  const used = $derived.by(() => {
    const e = health?.estimate;
    if (!e || e.usage === null) return i18n.t('settings.storage.unknown');
    return [i18n.t('settings.storage.used', { size: sizeLabel(e.usage) }), quotaWords(e, sizeLabel, i18n.t)].filter(Boolean).join(' ');
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
  <span class="name">{i18n.t('settings.storage.space')}</span>
  <span class="hint">{used}{#if mine} {i18n.t('settings.storage.imported', { size: sizeLabel(mine) })}{/if}</span>
  <span></span>
</div>
{#if health?.fraction !== null && health?.fraction !== undefined}
  <div class="bar-row">
    <div class="bar"><div class="fill" style:width="{Math.round(health.fraction * 100)}%"></div></div>
  </div>
{/if}
<div class="row">
  <span class="name">{i18n.t('settings.storage.retention')}</span>
  <span class="hint">{health ? i18n.t(PERSIST_WORDS_KEY[health.persistence]) : i18n.t('settings.storage.checking')}{#if health?.safari} {i18n.t(SAFARI_WORDS_KEY)}{/if}</span>
  {#if askable}<button class="btn-sm" type="button" id="storage-persist" disabled={asking} onclick={() => void ask()}>{i18n.t('settings.storage.keep')}</button>{:else}<span></span>{/if}
</div>

<style>
  .bar-row{margin:0 0 8px 162px}
  .bar{height:6px;border-radius:999px;background:var(--soft2);overflow:hidden}
  .fill{height:100%;background:var(--accent)}
  @media (max-width:600px){ .bar-row{margin-left:0} }
</style>
