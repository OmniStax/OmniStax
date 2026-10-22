<script lang="ts">
  /* One sheet as a tab: the data is fetched once and drawn by whichever
     component the sheet's kind names. The kind is an ADT tag, so the dispatch
     is exhaustive and a sheet of a kind this build does not draw says so rather
     than showing an empty page. */
  import { sheets } from '../../lib/sheets/store.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import Elements from './Elements.svelte';
  import Table from './Table.svelte';
  import Grapher from './Grapher.svelte';
  import UnitCircle from './UnitCircle.svelte';
  import Cas from './Cas.svelte';
  import type { BookId } from '../../lib/types/ids';
  let { book, id }: { book: BookId; id: string } = $props();
  const entry = $derived(sheets.entry(book, id));
  const data = $derived(sheets.dataOf(book, id));
  const status = $derived(sheets.statusOf(book, id));
  $effect(() => { if (entry && !data) void sheets.load(book, id); });
</script>

<div class="sheet" data-book={book} data-sheet={id}>
  {#if !entry}
    <p class="note">{i18n.t('sheets.sheet.missing', { id })}</p>
  {:else if data && data.kind === 'elements'}
    <Elements {book} sheet={data} />
  {:else if data && data.kind === 'table'}
    <Table {book} sheet={data} />
  {:else if data && data.kind === 'grapher'}
    <Grapher {book} sheet={data} />
  {:else if data && data.kind === 'unit-circle'}
    <UnitCircle {book} sheet={data} />
  {:else if data && data.kind === 'cas'}
    <Cas {book} sheet={data} />
  {:else if status === 'failed'}
    <p class="note bad">{i18n.t('sheets.sheet.failed', { title: entry.title })}</p>
  {:else}
    <p class="note">{i18n.t('sheets.sheet.reading', { title: entry.title })}</p>
  {/if}
</div>

<style>
  .sheet{font-family:var(--sans)}
  .note{color:var(--muted);font-size:0.85rem}
  .note.bad{color:var(--bad)}
</style>
