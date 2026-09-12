<script lang="ts">
  /* A plain reference table, which the appendices will become. Until the pass
     that draws them properly, the page says what the table holds — its title,
     where its values came from, and the columns it is keyed by — and lists the
     rows it has, so that a sheet declared today is never a blank page. */
  import type { TableSheetDTO } from '../../lib/content/sheets';
  let { sheet }: { sheet: TableSheetDTO } = $props();
</script>

<div class="table-sheet">
  <header>
    <h1>{sheet.title}</h1>
    {#if sheet.source}<p class="lead">{sheet.source}</p>{/if}
  </header>
  <p class="cols"><span class="eyebrow">Columns</span> {sheet.columns.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label)).join(' · ')}</p>
  {#if sheet.rows.length}
    <div class="scroll">
      <table>
        <thead><tr>{#each sheet.columns as c (c.id)}<th>{c.label}{#if c.unit}<span class="unit"> {c.unit}</span>{/if}</th>{/each}</tr></thead>
        <tbody>{#each sheet.rows as row, i (i)}<tr>{#each sheet.columns as c (c.id)}<td>{row[c.id] ?? ''}</td>{/each}</tr>{/each}</tbody>
      </table>
    </div>
  {:else}
    <p class="none">The table has no rows yet.</p>
  {/if}
</div>

<style>
  .table-sheet{font-family:var(--sans)}
  h1{margin:0 0 2px;font-size:1.35rem}
  .lead,.cols,.none{color:var(--muted);font-size:0.85rem}
  .scroll{overflow-x:auto}
  table{border-collapse:collapse;font-size:0.85rem;width:100%}
  th,td{border-bottom:1px solid var(--rule);padding:4px 10px 4px 0;text-align:left}
  .unit{color:var(--muted);font-weight:400}
</style>
