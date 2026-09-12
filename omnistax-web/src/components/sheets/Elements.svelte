<script lang="ts">
  /* The elements page: the periodic table as the book draws it, eighteen
     columns with the lanthanides and the actinides set below, and the controls
     that say what the cells are filled with and which of them are shown.

     Everything that decides is in lib/sheets/elements.ts — where a cell stands,
     what fills it, what a filter lets through — so this file only draws and
     listens. Hovering a cell opens a compact card beside it; clicking pins the
     card to the right of the table with every field the sheet carries, the
     element's own colour from the drawing palette, and a link to each section
     of the book that names it. The arrows walk the table and Enter pins. */
  import { tick } from 'svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { sheets } from '../../lib/sheets/store.svelte';
  import { openDoc } from '../../lib/sections/nav.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { sectionId } from '../../lib/types/ids';
  import { elementColor } from '../../lib/fig/elements';
  import {
    type Cell, type Colouring, type Filters, type Trend, COLUMNS, PERIODS, TRENDS, TREND_META, NO_FILTERS,
    cellsOf, fillOf, legendOf, neighbour, passes, placeholders, rangeOf, trendValue,
  } from '../../lib/sheets/elements';
  import type { ElementsSheetDTO } from '../../lib/content/sheets';
  import { ELEMENT_BLOCKS, ELEMENT_CATEGORIES, ELEMENT_STATES } from '../../lib/content/sheets';

  let { sheet }: { sheet: ElementsSheetDTO } = $props();

  const GROUPS = Array.from({ length: COLUMNS }, (_, i) => i + 1);
  const ROWS = Array.from({ length: PERIODS }, (_, i) => i + 1);
  /* The colouring as one control: the three flat ones and the four trends in one list. */
  type Choice = { readonly key: string; readonly label: string; readonly colouring: Colouring };
  const CHOICES: readonly Choice[] = [
    { key: 'classification', label: 'Metals, metalloids, nonmetals', colouring: { by: 'classification' } },
    { key: 'category', label: 'Family', colouring: { by: 'category' } },
    { key: 'block', label: 'Block', colouring: { by: 'block' } },
    ...TRENDS.map((t): Choice => ({ key: t, label: TREND_META[t].label, colouring: { by: 'trend', trend: t } })),
  ];

  let choice = $state('classification');
  let filters = $state<Filters>(NO_FILTERS);
  let pinned = $state<string | null>(null);
  let hovered = $state<string | null>(null);
  let grid = $state<HTMLElement | null>(null);

  const colouring = $derived(CHOICES.find((c) => c.key === choice)?.colouring ?? CHOICES[0].colouring);
  const cells = $derived(cellsOf(sheet.elements));
  const range = $derived(colouring.by === 'trend' ? rangeOf(sheet.elements, colouring.trend) : null);
  const legend = $derived(legendOf(colouring, sheet.elements, range, settings.dark, settings.colorCoding));
  const trend = $derived<Trend | null>(colouring.by === 'trend' ? colouring.trend : null);
  const shown = $derived(new Set(sheet.elements.filter((e) => passes(e, filters)).map((e) => e.symbol)));
  const element = (symbol: string | null) => (symbol === null ? null : sheet.elements.find((e) => e.symbol === symbol) ?? null);
  const card = $derived(element(pinned));
  const peek = $derived(pinned === null ? element(hovered) : null);

  /* A card's "Go to" sets the element before the page opens, so the page reads it once and lets go. */
  $effect(() => { const s = sheets.pinned; if (s) { pinned = s; sheets.pin(null); void reveal(s); } });
  const reveal = async (symbol: string): Promise<void> => {
    await tick();
    grid?.querySelector<HTMLElement>(`[data-el="${symbol}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const one = <T,>(set: ReadonlySet<T>, v: T | null): ReadonlySet<T> => (v === null ? new Set<T>() : new Set([v]));
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]): void => { filters = { ...filters, [key]: value }; };
  const num = (v: string): number | null => (v === '' ? null : Number(v));
  const str = (v: string): string | null => (v === '' ? null : v);
  const clear = (): void => { filters = NO_FILTERS; };

  const valueOf = (symbol: string): string => {
    const e = element(symbol); if (!e || !trend) return '';
    const v = trendValue(e, trend);
    return v === null ? '—' : `${v} ${TREND_META[trend].unit}`;
  };
  const configParts = (config: string): { readonly text: string; readonly sup: string }[] =>
    config.split(' ').map((part) => { const m = /^(.*?)(\d+)$/.exec(part); return m ? { text: m[1], sup: m[2] } : { text: part, sup: '' }; });

  const pick = (symbol: string): void => { pinned = pinned === symbol ? null : symbol; };
  const goSection = (id: string): void => { void openDoc(sectionId(id), 'text'); };
  const titleOf = (id: string): string => registry.entry(sectionId(id))?.title ?? '';

  /* The arrows walk the grid, Enter pins what they stand on, Escape lets it go. */
  const onKey = (e: KeyboardEvent, cell: Cell): void => {
    const step: Readonly<Record<string, readonly [number, number]>> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(cell.element.symbol); return; }
    if (e.key === 'Escape') { pinned = null; return; }
    const move = step[e.key]; if (!move) return;
    e.preventDefault();
    const next = neighbour(cells, cell, move[0], move[1]); if (!next) return;
    grid?.querySelector<HTMLElement>(`[data-el="${next.element.symbol}"]`)?.focus();
  };
</script>

<div class="elements" data-sheet="elements">
  <header>
    <h1>{sheet.title}</h1>
    <p class="lead">Every element the table holds. Hover a cell to see it, click to keep it open.</p>
  </header>

  <div class="controls">
    <label class="control wide">
      <span>Colour by</span>
      <select bind:value={choice}>{#each CHOICES as c (c.key)}<option value={c.key}>{c.label}</option>{/each}</select>
    </label>
    <label class="control"><span>Group</span>
      <select value={[...filters.groups][0] ?? ''} onchange={(e) => setFilter('groups', one(filters.groups, num(e.currentTarget.value)))}>
        <option value="">any</option>{#each GROUPS as g (g)}<option value={g}>{g}</option>{/each}
      </select>
    </label>
    <label class="control"><span>Period</span>
      <select value={[...filters.periods][0] ?? ''} onchange={(e) => setFilter('periods', one(filters.periods, num(e.currentTarget.value)))}>
        <option value="">any</option>{#each ROWS as p (p)}<option value={p}>{p}</option>{/each}
      </select>
    </label>
    <label class="control"><span>Block</span>
      <select value={[...filters.blocks][0] ?? ''} onchange={(e) => setFilter('blocks', one(filters.blocks, str(e.currentTarget.value)))}>
        <option value="">any</option>{#each ELEMENT_BLOCKS as b (b)}<option value={b}>{b}</option>{/each}
      </select>
    </label>
    <label class="control"><span>State</span>
      <select value={[...filters.states][0] ?? ''} onchange={(e) => setFilter('states', one(filters.states, str(e.currentTarget.value)))}>
        <option value="">any</option>{#each ELEMENT_STATES as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </label>
    <label class="control wide"><span>Family</span>
      <select value={[...filters.categories][0] ?? ''} onchange={(e) => setFilter('categories', one(filters.categories, str(e.currentTarget.value)))}>
        <option value="">any</option>{#each ELEMENT_CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
      </select>
    </label>
    <label class="control wide"><span>Search</span>
      <input type="search" placeholder="name or symbol" value={filters.query} oninput={(e) => setFilter('query', e.currentTarget.value)} />
    </label>
    <button type="button" class="clear" onclick={clear}>Clear</button>
  </div>

  {#if legend.length}
    <div class="legend" class:ramp={colouring.by === 'trend'}>
      {#each legend as s, i (i)}<span class="swatch" style:background={s.fill}></span>{#if s.label}<span class="lab">{s.label}</span>{/if}{/each}
      {#if trend}<span class="unit">{TREND_META[trend].unit}</span>{/if}
    </div>
  {/if}

  <div class="board">
    <div class="grid" bind:this={grid} role="grid" aria-label="The periodic table">
      {#each placeholders() as p (p.from)}
        <div class="cell strip" style:grid-column={p.column} style:grid-row={p.row} aria-hidden="true"><span class="sym">{p.label}</span></div>
      {/each}
      {#each cells as c (c.element.symbol)}
        <button
          type="button" class="cell" class:out={!shown.has(c.element.symbol)} class:on={pinned === c.element.symbol} class:below={c.row > 7}
          data-el={c.element.symbol} style:grid-column={c.column} style:grid-row={c.row}
          style:background={fillOf(colouring, c.element, range, settings.dark, settings.colorCoding)}
          aria-label="{c.element.name}, number {c.element.number}" aria-pressed={pinned === c.element.symbol}
          onmouseenter={() => (hovered = c.element.symbol)} onmouseleave={() => (hovered = null)}
          onfocus={() => (hovered = c.element.symbol)} onblur={() => (hovered = null)}
          onclick={() => pick(c.element.symbol)} onkeydown={(e) => onKey(e, c)}>
          <span class="z">{c.element.number}</span>
          <span class="sym">{c.element.symbol}</span>
          <span class="w">{trend ? valueOf(c.element.symbol) : c.element.weight_label}</span>
        </button>
      {/each}
    </div>

    <aside class="side">
      {#if card}
        {@const e = card}
        <div class="full">
          <div class="head">
            <span class="swatch big" style:background={elementColor(e.symbol, settings.dark)}></span>
            <div>
              <div class="eyebrow">{e.number} · {e.category}</div>
              <h2>{e.name} <span class="symbol">{e.symbol}</span></h2>
            </div>
            <button type="button" class="x" title="Close" onclick={() => (pinned = null)}>×</button>
          </div>
          <dl class="fields">
            <dt>Atomic weight</dt><dd>{e.weight_label}</dd>
            <dt>Group, period</dt><dd>{e.group ?? '—'}, {e.period}</dd>
            <dt>Block</dt><dd>{e.block}</dd>
            <dt>State at 25 °C</dt><dd>{e.state}</dd>
            <dt>Shading</dt><dd>{e.classification}</dd>
            <dt>Electronegativity</dt><dd>{e.electronegativity ?? '—'}</dd>
            <dt>First ionization</dt><dd>{e.ionization === null ? '—' : `${e.ionization} kJ/mol`}</dd>
            <dt>Covalent radius</dt><dd>{e.radius === null ? '—' : `${e.radius} pm`}</dd>
            <dt>Discovered</dt><dd>{e.discovered ?? 'known since antiquity'}</dd>
            <dt>Configuration</dt><dd class="config">{#each configParts(e.configuration) as p, i (i)}{p.text}{#if p.sup}<sup>{p.sup}</sup>{/if}{' '}{/each}</dd>
          </dl>
          {#if e.sections.length}
            <div class="where">
              <div class="eyebrow">Named in</div>
              <div class="links">{#each e.sections as s (s)}<button type="button" class="ref" onclick={() => goSection(s)} title={titleOf(s)}>{s}</button>{/each}</div>
            </div>
          {:else}
            <p class="none">No section of this book names it yet.</p>
          {/if}
        </div>
      {:else if peek}
        {@const e = peek}
        <div class="peekcard">
          <div class="eyebrow">{e.number} · {e.category}</div>
          <h2>{e.name} <span class="symbol">{e.symbol}</span></h2>
          <p>{e.weight_label} · {e.state} · block {e.block}{#if trend}<br />{TREND_META[trend].label}: {valueOf(e.symbol)}{/if}</p>
          <p class="hint">Click to keep it open.</p>
        </div>
      {:else}
        <div class="peekcard empty"><p>Hover an element to see it; click to keep the card open.</p></div>
      {/if}
    </aside>
  </div>
</div>

<style>
  .elements{font-family:var(--sans)}
  header h1{margin:0 0 2px;font-size:1.35rem}
  .lead{margin:0 0 14px;color:var(--muted);font-size:0.85rem}
  .controls{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:end;margin-bottom:10px}
  .control{display:flex;flex-direction:column;gap:2px;font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em}
  .control select,.control input{font:inherit;font-size:0.82rem;text-transform:none;letter-spacing:normal;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:5px;padding:3px 6px}
  .control.wide select,.control.wide input{min-width:150px}
  .clear{font:inherit;font-size:0.78rem;padding:4px 10px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .clear:hover{background:var(--soft)}
  .legend{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:0.72rem;color:var(--muted)}
  .legend .swatch{width:14px;height:14px;border-radius:3px;border:1px solid var(--rule);display:inline-block}
  .legend.ramp .swatch{border-radius:0;border-left:0;border-right:0;width:26px}
  .legend .lab{margin-right:8px}
  .legend .unit{margin-left:4px;font-style:italic}

  .board{display:flex;gap:16px;align-items:flex-start}
  .grid{display:grid;grid-template-columns:repeat(18,minmax(34px,1fr));grid-auto-rows:minmax(38px,auto);gap:2px;flex:1;min-width:0;overflow-x:auto}
  .cell{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:2px 1px;border:1px solid var(--rule);border-radius:4px;background:transparent;color:var(--ink);font:inherit;line-height:1.1;cursor:pointer;min-width:0}
  .cell .z{font-size:0.52rem;color:var(--muted)}
  .cell .sym{font-size:0.85rem;font-weight:700}
  .cell .w{font-size:0.5rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .cell:hover{outline:2px solid var(--accent);outline-offset:-1px}
  .cell:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .cell.on{outline:2px solid var(--accent);outline-offset:-1px}
  .cell.out{opacity:0.2}
  .cell.below{margin-top:8px}
  .cell.strip{cursor:default;border-style:dashed;color:var(--muted)}
  .cell.strip .sym{font-size:0.6rem;font-weight:500}

  .side{width:250px;flex:none;position:sticky;top:8px}
  .full,.peekcard{border:1px solid var(--rule);border-radius:8px;background:var(--panel);padding:10px 12px}
  .peekcard.empty{color:var(--muted);font-size:0.8rem}
  .peekcard h2,.full h2{margin:1px 0 4px;font-size:1rem}
  .peekcard p{margin:0;font-size:0.8rem;color:var(--muted)}
  .peekcard .hint{margin-top:6px;font-style:italic;opacity:.8}
  .symbol{color:var(--muted);font-weight:500}
  .head{display:flex;gap:9px;align-items:flex-start}
  .head h2{flex:1}
  .swatch.big{width:22px;height:22px;border-radius:50%;border:1px solid var(--rule);flex:none;margin-top:4px}
  .x{width:22px;height:22px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;line-height:1}
  .x:hover{background:var(--soft2);color:var(--ink)}
  .fields{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0 0;font-size:0.78rem}
  .fields dt{color:var(--muted)}
  .fields dd{margin:0}
  .fields dd.config{font-family:var(--mono,monospace);font-size:0.74rem}
  .where{margin-top:10px;border-top:1px solid var(--rule);padding-top:8px}
  .links{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:3px}
  .ref{font:inherit;font-size:0.78rem;padding:0;border:0;background:none;color:var(--ink);cursor:pointer;text-decoration:underline dotted;text-decoration-color:var(--muted);text-underline-offset:3px}
  .ref:hover{color:var(--accent)}
  .none{margin:10px 0 0;font-size:0.78rem;color:var(--muted)}
  @media (max-width:900px){ .board{flex-direction:column} .side{width:100%;position:static} }
</style>
