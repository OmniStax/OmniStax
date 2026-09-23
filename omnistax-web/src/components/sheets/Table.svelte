<script lang="ts">
  /* A table sheet: one data appendix of the book, drawn as the tables it prints.

     The page adds the three things a reader wants of a reference table and a
     printed page cannot give: one search box over every table of the appendix,
     a numeric column that sorts when its heading is clicked, and a formula in a
     cell that opens the same card a formula in the prose does. Everything that
     decides — what a search keeps, what a sort orders, which row is a heading
     over the rows below it — is in lib/sheets/table.ts, so this file draws and
     listens and nothing else. The header stays put while the rows scroll, and
     each table scrolls in its own box — sideways when it is wide, downwards
     when it is long — so a wide table never pushes the page wider than the
     reader's screen and a long one keeps its heading row in view. */
  import { sheets } from '../../lib/sheets/store.svelte';
  import { isGroup, marked, nextSort, rowCount, sortable, viewRows, type Sort } from '../../lib/sheets/table';
  import type { TableBlockDTO, TableSheetDTO } from '../../lib/content/sheets';

  import type { BookId } from '../../lib/types/ids';

  let { book, sheet }: { book: BookId; sheet: TableSheetDTO } = $props();

  let query = $state('');
  /* One sort at a time, and it belongs to the table it was set on. */
  let sort = $state<{ readonly table: string; readonly sort: Sort } | null>(null);

  /* The formula hover reads the elements sheet; a cell is drawn unmarked until it arrives. */
  $effect(() => { const e = sheets.elementsEntry(book); if (e) void sheets.load(book, e.id); });
  const table = $derived(sheets.table(book));

  const sortOf = (block: TableBlockDTO): Sort | null => (sort && sort.table === block.id ? sort.sort : null);
  const rowsOf = (block: TableBlockDTO): readonly (readonly string[])[] => viewRows(block.rows, query, sortOf(block));
  const onHeading = (block: TableBlockDTO, column: number): void => {
    const next = nextSort(sortOf(block), column);
    sort = next === null ? null : { table: block.id, sort: next };
  };
  const shown = $derived(sheet.tables.map((t) => ({ block: t, rows: rowsOf(t) })));
  const found = $derived(shown.reduce((n, t) => n + t.rows.length, 0));
</script>

<div class="table-sheet">
  <header>
    <h1>{sheet.title}</h1>
    <p class="lead">Appendix {sheet.source.appendix} of the book, as data.</p>
    <label class="search">
      <span class="vh">Search this sheet</span>
      <input type="search" bind:value={query} placeholder="Search {sheet.title.toLowerCase()}…" />
    </label>
    {#if query.trim() !== ''}<p class="count">{found} matching {found === 1 ? 'row' : 'rows'}</p>{/if}
  </header>

  {#each shown as { block, rows } (block.id)}
    <section class="block" data-table={block.id}>
      <h2>{block.title}</h2>
      {#if rows.length === 0}
        <p class="count">No row of this table matches.</p>
      {:else}
        <div class="book-table">
          <table>
            {#if block.columns.some((c) => c.label !== '')}
              <thead>
                <tr>
                  {#each block.columns as c, i (c.id)}
                    <th class:num={c.kind === 'number'} aria-sort={sortOf(block)?.column === i ? (sortOf(block)?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      {#if sortable(c)}
                        <button type="button" onclick={() => onHeading(block, i)}>
                          {@html c.label}{#if c.unit}<span class="unit"> ({@html c.unit})</span>{/if}
                          <span class="arrow" aria-hidden="true">{sortOf(block)?.column === i ? (sortOf(block)?.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      {:else}
                        {@html c.label}{#if c.unit}<span class="unit"> ({@html c.unit})</span>{/if}
                      {/if}
                    </th>
                  {/each}
                </tr>
              </thead>
            {/if}
            <tbody>
              {#each rows as row, r (r)}
                <tr class:group={isGroup(row)}>
                  {#each block.columns as c, i (c.id)}
                    {#if isGroup(row) && i === 0}
                      <th scope="rowgroup" colspan={block.columns.length}>{@html row[0] ?? ''}</th>
                    {:else if !isGroup(row)}
                      <td class:num={c.kind === 'number'}>{@html marked(row[i] ?? '', table)}</td>
                    {/if}
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="count">{rowCount(block, rows.length)}</p>
      {/if}
      {#if block.notes.length}
        <ol class="notes">
          {#each block.notes as note, i (i)}<li>{@html note}</li>{/each}
        </ol>
      {/if}
    </section>
  {/each}
</div>

<style>
  .table-sheet{font-family:var(--sans);max-width:100%}
  h1{margin:0 0 2px;font-size:1.35rem}
  h2{margin:0 0 6px;font-size:1rem;font-weight:600}
  .lead,.count{color:var(--muted);font-size:0.8rem;margin:0}
  .search{display:block;margin:10px 0 4px}
  .search input{width:min(100%,22rem);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:inherit;font:inherit;font-size:0.85rem}
  .search input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  .block{margin:1.6rem 0}
  /* the table scrolls in its own box, sideways when it is wide and downwards
     when it is long, which is what keeps the heading row in view */
  .block .book-table{margin:0;max-height:min(70vh,720px);overflow:auto}
  .book-table table{font-size:0.82rem}
  .book-table thead th{position:sticky;top:0;z-index:1}
  .book-table th button{all:unset;cursor:pointer;display:inline-flex;gap:4px;align-items:baseline}
  .book-table th button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .arrow{color:var(--muted);font-size:0.7em}
  .unit{color:var(--muted);font-weight:400}
  .book-table td.num{font-variant-numeric:tabular-nums}
  tr.group th{background:var(--soft);font-weight:600;text-transform:none}
  .notes{margin:8px 0 0;padding-left:1.2rem;color:var(--muted);font-size:0.78rem;line-height:1.5}
  @media (max-width:520px){
    .book-table table{font-size:0.78rem}
    .book-table :global(th),.book-table :global(td){padding:5px 8px}
  }
</style>
