<script lang="ts">
  /* The elements page: the periodic table as the book draws it, eighteen
     columns with the lanthanides and the actinides set below, and the controls
     that say what the cells are filled with and which of them are shown.

     Everything that decides is in lib/sheets/elements.ts — where a cell stands,
     what fills it, what a filter lets through — so this file only draws and
     listens. Hovering a cell opens a compact card just below it; clicking pins
     the full card there with every field the sheet carries, the element's own
     colour from the drawing palette, and a link to each section of the book
     that names it. In a narrow pane the card is a sheet along the bottom. The
     arrows walk the table and Enter pins. */
  import { tick } from 'svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import type { MessageKey } from '../../lib/i18n';
  import { settings } from '../../lib/settings/store.svelte';
  import { sheets } from '../../lib/sheets/store.svelte';
  import { onMiddle, openDoc, openingOf, type Opening } from '../../lib/sections/nav.svelte';
  import { registry } from '../../lib/sections/registry.svelte';
  import { type BookId, sectionId, sectionRef } from '../../lib/types/ids';
  import { elementColor } from '../../lib/fig/elements';
  import {
    type Cell, type Colouring, type Filters, type Trend, COLUMNS, PERIODS, TRENDS, TREND_META, NO_FILTERS,
    cellsOf, fillOf, legendOf, neighbour, passes, placeholders, rangeOf, trendValue,
  } from '../../lib/sheets/elements';
  import type { ElementsSheetDTO } from '../../lib/content/sheets';
  import { ELEMENT_BLOCKS, ELEMENT_CATEGORIES, ELEMENT_STATES } from '../../lib/content/sheets';

  let { book, sheet }: { book: BookId; sheet: ElementsSheetDTO } = $props();

  const GROUPS = Array.from({ length: COLUMNS }, (_, i) => i + 1);
  const ROWS = Array.from({ length: PERIODS }, (_, i) => i + 1);
  /* The colouring as one control: the three flat ones and the four trends in one list. */
  type Choice = { readonly key: string; readonly label: MessageKey; readonly colouring: Colouring };
  const CHOICES: readonly Choice[] = [
    { key: 'classification', label: 'sheets.elements.classification', colouring: { by: 'classification' } },
    { key: 'category', label: 'sheets.elements.family', colouring: { by: 'category' } },
    { key: 'block', label: 'sheets.elements.block', colouring: { by: 'block' } },
    ...TRENDS.map((t): Choice => ({ key: t, label: TREND_META[t].label, colouring: { by: 'trend', trend: t } })),
  ];

  let choice = $state('classification');
  let filters = $state<Filters>(NO_FILTERS);
  let pinned = $state<string | null>(null);
  let hovered = $state<string | null>(null);
  let grid = $state<HTMLElement | null>(null);
  let pop = $state<HTMLElement | null>(null);
  let boardW = $state(0);
  let boardH = $state(0);
  let popW = $state(0);
  let popH = $state(0);
  let scrollX = $state(0);

  const colouring = $derived(CHOICES.find((c) => c.key === choice)?.colouring ?? CHOICES[0].colouring);
  const cells = $derived(cellsOf(sheet.elements));
  const range = $derived(colouring.by === 'trend' ? rangeOf(sheet.elements, colouring.trend) : null);
  const legend = $derived(legendOf(colouring, sheet.elements, range, settings.dark, settings.shown.concepts));
  const trend = $derived<Trend | null>(colouring.by === 'trend' ? colouring.trend : null);
  const shown = $derived(new Set(sheet.elements.filter((e) => passes(e, filters)).map((e) => e.symbol)));
  const element = (symbol: string | null) => (symbol === null ? null : sheet.elements.find((e) => e.symbol === symbol) ?? null);
  const card = $derived(element(pinned));
  const peek = $derived(pinned === null ? element(hovered) : null);
  const narrow = $derived(boardW > 0 && boardW < 520);

  type Place = { readonly left: number; readonly top: number };
  const GAP = 4;
  const EDGE = 8;
  const cellOf = (symbol: string | null): HTMLElement | null =>
    symbol === null ? null : grid?.querySelector<HTMLElement>(`[data-el="${symbol}"]`) ?? null;
  const place = $derived.by((): Place | null => {
    const at = cellOf(pinned ?? (peek ? hovered : null));
    if (!at || narrow) return null;
    const x = at.offsetLeft - scrollX + at.offsetWidth / 2 - popW / 2;
    const left = Math.max(EDGE, Math.min(x, boardW - popW - EDGE));
    const below = at.offsetTop + at.offsetHeight + GAP;
    const above = at.offsetTop - popH - GAP;
    return { left, top: below + popH > boardH && above >= 0 ? above : below };
  });

  let grace: ReturnType<typeof setTimeout> | undefined;
  const hold = (): void => clearTimeout(grace);
  const enter = (symbol: string): void => { hold(); hovered = symbol; };
  const leave = (): void => { hold(); grace = setTimeout(() => (hovered = null), 120); };
  const close = (): void => { const at = cellOf(pinned); pinned = null; at?.focus(); };

  $effect(() => {
    if (pinned === null) return;
    const down = (e: PointerEvent): void => {
      const t = e.target as Element | null;
      if (pop?.contains(t) || t?.closest('[data-el]')) return;
      pinned = null;
    };
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  });

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
  const goSection = (id: string, how: Opening): void => { void openDoc(sectionRef(book, sectionId(id)), 'text', undefined, how); };
  const titleOf = (id: string): string => registry.entry(sectionRef(book, sectionId(id)))?.title ?? '';

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
    <p class="lead">{i18n.t('sheets.elements.lead')}</p>
  </header>

  <div class="controls">
    <label class="control wide">
      <span>{i18n.t('sheets.elements.colorBy')}</span>
      <select bind:value={choice}>{#each CHOICES as c (c.key)}<option value={c.key}>{i18n.t(c.label)}</option>{/each}</select>
    </label>
    <label class="control"><span>{i18n.t('sheets.elements.group')}</span>
      <select value={[...filters.groups][0] ?? ''} onchange={(e) => setFilter('groups', one(filters.groups, num(e.currentTarget.value)))}>
        <option value="">{i18n.t('sheets.elements.any')}</option>{#each GROUPS as g (g)}<option value={g}>{g}</option>{/each}
      </select>
    </label>
    <label class="control"><span>{i18n.t('sheets.elements.period')}</span>
      <select value={[...filters.periods][0] ?? ''} onchange={(e) => setFilter('periods', one(filters.periods, num(e.currentTarget.value)))}>
        <option value="">{i18n.t('sheets.elements.any')}</option>{#each ROWS as p (p)}<option value={p}>{p}</option>{/each}
      </select>
    </label>
    <label class="control"><span>{i18n.t('sheets.elements.block')}</span>
      <select value={[...filters.blocks][0] ?? ''} onchange={(e) => setFilter('blocks', one(filters.blocks, str(e.currentTarget.value)))}>
        <option value="">{i18n.t('sheets.elements.any')}</option>{#each ELEMENT_BLOCKS as b (b)}<option value={b}>{b}</option>{/each}
      </select>
    </label>
    <label class="control"><span>{i18n.t('sheets.elements.state')}</span>
      <select value={[...filters.states][0] ?? ''} onchange={(e) => setFilter('states', one(filters.states, str(e.currentTarget.value)))}>
        <option value="">{i18n.t('sheets.elements.any')}</option>{#each ELEMENT_STATES as s (s)}<option value={s}>{s}</option>{/each}
      </select>
    </label>
    <label class="control wide"><span>{i18n.t('sheets.elements.family')}</span>
      <select value={[...filters.categories][0] ?? ''} onchange={(e) => setFilter('categories', one(filters.categories, str(e.currentTarget.value)))}>
        <option value="">{i18n.t('sheets.elements.any')}</option>{#each ELEMENT_CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
      </select>
    </label>
    <label class="control wide"><span>{i18n.t('sheets.elements.searchLabel')}</span>
      <input type="search" placeholder={i18n.t('sheets.elements.search')} value={filters.query} oninput={(e) => setFilter('query', e.currentTarget.value)} />
    </label>
    <button type="button" class="clear" onclick={clear}>{i18n.t('sheets.elements.clear')}</button>
  </div>

  {#if legend.length}
    <div class="legend" class:ramp={colouring.by === 'trend'}>
      {#each legend as s, i (i)}<span class="swatch" style:background={s.fill}></span>{#if s.label}<span class="lab">{s.label}</span>{/if}{/each}
      {#if trend}<span class="unit">{TREND_META[trend].unit}</span>{/if}
    </div>
  {/if}

  <div class="board" bind:clientWidth={boardW} bind:clientHeight={boardH}>
    <div class="grid" bind:this={grid} role="grid" aria-label={i18n.t('sheets.elements.table')} onscroll={(e) => (scrollX = e.currentTarget.scrollLeft)}>
      {#each placeholders() as p (p.from)}
        <div class="cell strip" style:grid-column={p.column} style:grid-row={p.row} aria-hidden="true"><span class="sym">{p.label}</span></div>
      {/each}
      {#each cells as c (c.element.symbol)}
        <button
          type="button" class="cell" class:out={!shown.has(c.element.symbol)} class:on={pinned === c.element.symbol} class:below={c.row > 7}
          data-el={c.element.symbol} style:grid-column={c.column} style:grid-row={c.row}
          style:background={fillOf(colouring, c.element, range, settings.dark, settings.shown.concepts)}
          aria-label={i18n.t('sheets.elements.cell', { name: c.element.name, number: c.element.number })} aria-pressed={pinned === c.element.symbol}
          onmouseenter={() => enter(c.element.symbol)} onmouseleave={leave}
          onfocus={() => enter(c.element.symbol)} onblur={leave}
          onclick={() => pick(c.element.symbol)} onkeydown={(e) => onKey(e, c)}>
          <span class="z">{c.element.number}</span>
          <span class="sym">{c.element.symbol}</span>
          <span class="w">{trend ? valueOf(c.element.symbol) : c.element.weight_label}</span>
        </button>
      {/each}
    </div>

    {#if card || peek}
      <div
        class="pop" class:sheet={narrow} bind:this={pop} bind:offsetWidth={popW} bind:offsetHeight={popH}
        role={card ? 'dialog' : 'tooltip'} aria-label={(card ?? peek)?.name}
        style:left={place ? `${place.left}px` : null} style:top={place ? `${place.top}px` : null}
        onmouseenter={hold} onmouseleave={leave}>
      {#if card}
        {@const e = card}
        <div class="full">
          <div class="head">
            <span class="swatch big" style:background={settings.shown.facts ? elementColor(e.symbol, settings.dark) : 'var(--ink)'}></span>
            <div>
              <div class="eyebrow">{e.number} · {e.category}</div>
              <h2>{e.name} <span class="symbol">{e.symbol}</span></h2>
            </div>
            <button type="button" class="x" aria-label={i18n.t('sheets.elements.close')} onclick={close}>×</button>
          </div>
          <dl class="fields">
            <dt>{i18n.t('sheets.elements.weight')}</dt><dd>{e.weight_label}</dd>
            <dt>{i18n.t('sheets.elements.groupPeriod')}</dt><dd>{e.group ?? '—'}, {e.period}</dd>
            <dt>{i18n.t('sheets.elements.block')}</dt><dd>{e.block}</dd>
            <dt>{i18n.t('sheets.elements.stateAt')}</dt><dd>{e.state}</dd>
            <dt>{i18n.t('sheets.elements.shading')}</dt><dd>{e.classification}</dd>
            <dt>{i18n.t('sheets.elements.electronegativity')}</dt><dd>{e.electronegativity ?? '—'}</dd>
            <dt>{i18n.t('sheets.elements.ionization')}</dt><dd>{e.ionization === null ? '—' : `${e.ionization} kJ/mol`}</dd>
            <dt>{i18n.t('sheets.elements.radius')}</dt><dd>{e.radius === null ? '—' : `${e.radius} pm`}</dd>
            <dt>{i18n.t('sheets.elements.discovered')}</dt><dd>{e.discovered ?? i18n.t('sheets.elements.antiquity')}</dd>
            <dt>{i18n.t('sheets.elements.configuration')}</dt><dd class="config">{#each configParts(e.configuration) as p, i (i)}{p.text}{#if p.sup}<sup>{p.sup}</sup>{/if}{' '}{/each}</dd>
          </dl>
          {#if e.sections.length}
            <div class="where">
              <div class="eyebrow">{i18n.t('sheets.elements.namedIn')}</div>
              <div class="links">{#each e.sections as s (s)}<button type="button" class="ref" onclick={(ev) => goSection(s, openingOf(ev))} onauxclick={onMiddle((ev) => goSection(s, openingOf(ev)))} title={titleOf(s)}>{s}</button>{/each}</div>
            </div>
          {:else}
            <p class="none">{i18n.t('sheets.elements.namedNowhere')}</p>
          {/if}
        </div>
      {:else if peek}
        {@const e = peek}
        <div class="peekcard">
          <div class="eyebrow">{e.number} · {e.category}</div>
          <h2>{e.name} <span class="symbol">{e.symbol}</span></h2>
          <p>{e.weight_label} · {e.state} · {i18n.t('sheets.elements.blockOf', { block: e.block })}{#if trend}<br />{i18n.t(TREND_META[trend].label)}: {valueOf(e.symbol)}{/if}</p>
          <p class="hint">{i18n.t('sheets.elements.keepOpen')}</p>
        </div>
      {/if}
      </div>
    {/if}
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

  .board{position:relative;isolation:isolate}
  .grid{display:grid;grid-template-columns:repeat(18,minmax(34px,1fr));grid-auto-rows:minmax(38px,auto);gap:2px;min-width:0;overflow-x:auto}
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

  .pop{position:absolute;z-index:2;width:300px;max-width:calc(100% - 16px);border:1px solid var(--rule);border-radius:8px;background:var(--panel);box-shadow:0 8px 24px rgba(0,0,0,.14),0 1px 3px rgba(0,0,0,.08)}
  .pop.sheet{position:fixed;left:8px;right:8px;bottom:8px;top:auto;width:auto;max-width:none;max-height:70vh;overflow-y:auto}
  .full,.peekcard{padding:10px 12px}
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
</style>
