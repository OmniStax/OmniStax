<script lang="ts">
  /* Why a file or a record was held back, in one line, the check's own words
     beneath it in small type, and what the reader's choice will do. The Sync
     view's queue, the changes tab and the backup preview all say it the same
     way. */
  import { takeable, type Hold } from '../../lib/sync/held';
  import { i18n } from '../../lib/i18n/store.svelte';

  let { h }: { h: Hold & { readonly pick?: 'mine' | 'theirs' | null } } = $props();
  const REASON = { newer: 'views.sync.held.newer', unreadable: 'views.sync.held.unreadable', older: 'views.sync.held.older' } as const;
  const outcome = $derived(
    h.pick === 'theirs' ? i18n.t('views.sync.held.comesDown')
      : h.pick === 'mine' ? (takeable(h) ? i18n.t('views.sync.held.goesUp') : i18n.t('views.sync.held.repoKeeps'))
        : null,
  );
</script>

<p class="why">{i18n.t(REASON[h.reason])}{#if h.why}<span class="detail">{h.why}</span>{/if}</p>
{#if outcome}<p class="outcome">{outcome}</p>{/if}

<style>
  .why{margin:0;padding:0 6px;font-size:.76rem;color:var(--warm);line-height:1.4}
  .detail{display:block;font-family:var(--mono);font-size:.7rem;color:var(--muted);overflow-wrap:anywhere}
  .outcome{margin:2px 0 0;padding:0 6px;font-size:.72rem;color:var(--muted)}
</style>
