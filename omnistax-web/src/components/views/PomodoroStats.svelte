<script lang="ts">
  import { CATEGORY_COLORS, type DayKey, type Pomodoro, axisStep, colorOf, dayBefore, dayKey, monthBefore, nameOf, rangeBars, ranMs, spanText } from '../../lib/pomodoro/model';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import CategoryPicker from '../pomodoro/CategoryPicker.svelte';

  type Face = 'list' | 'category';
  /* The empty id is "uncategorized", so it filters like any category. */
  const NONE = '';
  let face = $state<Face>('list');
  const log = $derived(pomodoro.log);
  const cats = $derived(pomodoro.categories);

  $effect(() => { pomodoro.init(); });

  let menu = $state<string | null>(null);
  let asking = $state<string | null>(null);
  let editing = $state<Pomodoro | null>(null);
  let editStart = $state('');
  let editEnd = $state('');
  let editSummary = $state('');
  let editCats = $state<readonly string[]>([]);

  /* datetime-local is local time, not UTC. */
  const localValue = (ms: number): string => {
    const d = new Date(ms);
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const localMs = (v: string): number => { const n = new Date(v).getTime(); return Number.isFinite(n) ? n : 0; };

  const openEdit = (p: Pomodoro): void => {
    editing = p; menu = null; asking = null;
    editStart = localValue(p.start); editEnd = localValue(p.end);
    editSummary = p.summary; editCats = p.categories;
  };
  const saveEdit = (): void => {
    const p = editing;
    if (!p) return;
    const start = localMs(editStart);
    const end = Math.max(start, localMs(editEnd));
    pomodoro.amend({ ...p, start, end, minutes: Math.max(1, Math.round((end - start) / 60_000)), summary: editSummary.trim(), categories: [...editCats] });
    editing = null;
  };
  const editSpan = $derived(spanText(Math.max(0, localMs(editEnd) - localMs(editStart))));

  const day = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const at = (ms: number): string => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const today = dayKey(Date.now());
  let to = $state<string>(today);
  let from = $state<string>(dayBefore(monthBefore(today, 1), -1));
  const last = (f: (d: DayKey) => DayKey): void => { to = today; from = dayBefore(f(today), -1); };
  const valid = $derived(/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to);
  const chart = $derived(valid ? rangeBars(log, from as DayKey, to as DayKey) : { unit: 'day' as const, bars: [] });
  const peak = $derived(Math.max(1, ...chart.bars.map((b) => b.stacked)));
  const step = $derived(axisStep(peak));
  const top = $derived(Math.ceil(peak / step) * step);
  const ticks = $derived(Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step));
  const order = $derived([...cats.map((c) => c.id), NONE]);
  const ordered = (parts: readonly { id: string; ms: number }[]): readonly { id: string; ms: number }[] =>
    [...parts].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const inRange = $derived(chart.bars.reduce((n, b) => n + b.total, 0));
  const totals = $derived(order.map((id) => ({ id, ms: chart.bars.reduce((n, b) => n + (b.parts.find((q) => q.id === id)?.ms ?? 0), 0) })).filter((t) => t.ms > 0 || t.id !== NONE));
  const barLabel = (start: number): string => {
    const d = new Date(start);
    if (chart.unit === 'year') return String(d.getFullYear());
    if (chart.unit === 'month') return d.toLocaleDateString(undefined, { month: 'short' });
    if (chart.unit === 'day') return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  const axisText = (ms: number): string => (ms % 3_600_000 === 0 ? `${ms / 3_600_000}h` : spanText(ms).replace(' ', ''));
  const hue = (id: string): string => (id === NONE ? 'color-mix(in srgb,var(--muted) 45%,transparent)' : colorOf(cats, id));
  const label = (id: string): string => (id === NONE ? 'Uncategorized' : nameOf(cats, id));

  let editCat = $state<string | null>(null);
  let catName = $state('');
  let askCat = $state<string | null>(null);
</script>

<div class="stats">
  <div class="seg tabs" role="tablist">
    <button type="button" role="tab" aria-selected={face === 'list'} class:on={face === 'list'} onclick={() => (face = 'list')}>List</button>
    <button type="button" role="tab" aria-selected={face === 'category'} class:on={face === 'category'} onclick={() => (face = 'category')}>Category</button>
  </div>

  {#if face === 'list'}
    {#if !log.length}
      <p class="empty">No sessions yet.</p>
    {:else}
      <ul class="rows">
        {#each log as p (p.id)}
          <li class:open={menu === p.id} oncontextmenu={(e) => { e.preventDefault(); menu = menu === p.id ? null : p.id ?? null; }}>
            <span class="when">{day(p.start)}</span>
            <span class="span">{at(p.start)}–{at(p.end)}</span>
            <span class="ran">{spanText(ranMs(p))}</span>
            <span class="what">{p.summary || '—'}</span>
            <span class="dots-row" aria-hidden={!p.categories.length}>
              {#each p.categories as id (id)}<span class="dot" style="--hue:{hue(id)}" title={label(id)}></span>{/each}
            </span>
            <button type="button" class="btn ghost icon sm more" aria-label="Actions for this session" onclick={() => (menu = menu === p.id ? null : p.id ?? null)}>⋯</button>
            {#if menu === p.id}
              <div class="menu">
                {#if asking === p.id}
                  <span class="ask">Delete?</span>
                  <button type="button" class="btn sm danger" onclick={() => { pomodoro.remove(p.id ?? ''); menu = null; asking = null; }}>Yes</button>
                  <button type="button" class="btn ghost sm" onclick={() => { asking = null; menu = null; }}>No</button>
                {:else}
                  <button type="button" class="btn ghost sm" onclick={() => openEdit(p)}>Edit</button>
                  <button type="button" class="btn ghost sm danger" onclick={() => (asking = p.id ?? null)}>Delete</button>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <div class="range">
      <label>From<input class="input date" type="date" bind:value={from} max={to} /></label>
      <label>To<input class="input date" type="date" bind:value={to} min={from} /></label>
      <div class="helpers">
        <button type="button" class="chip" onclick={() => last((d) => dayBefore(d, 7))}>Last week</button>
        <button type="button" class="chip" onclick={() => last((d) => monthBefore(d, 1))}>Last month</button>
        <button type="button" class="chip" onclick={() => last((d) => monthBefore(d, 12))}>Last year</button>
      </div>
    </div>

    <p class="total"><strong>{spanText(inRange)}</strong> in all, by {chart.unit}</p>

    <div class="vchart" style="--n:{chart.bars.length}">
      <div class="axis" aria-hidden="true">
        {#each ticks as t (t)}<span style="bottom:{(t / top) * 100}%">{axisText(t)}</span>{/each}
      </div>
      <div class="plot">
        {#each ticks as t (t)}<div class="grid-line" style="bottom:{(t / top) * 100}%"></div>{/each}
        {#each chart.bars as b (b.start)}
          <div class="col" title="{barLabel(b.start)}: {spanText(b.total)}">
            <div class="stack">
              {#each ordered(b.parts) as part (part.id)}
                <div class="seg-part" style="--hue:{hue(part.id)};height:{(part.ms / top) * 100}%" title="{label(part.id)}: {spanText(part.ms)}"></div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="labels">
        {#each chart.bars as b (b.start)}<span>{barLabel(b.start)}</span>{/each}
      </div>
    </div>

    {#if !totals.length}
      <p class="empty">No categories yet.</p>
    {:else}
      <ul class="cat-list">
        {#each totals as t (t.id)}
          <li>
            <span class="dot" style="--hue:{hue(t.id)}"></span>
            {#if editCat === t.id}
              <input class="input rename" bind:value={catName} type="text" aria-label="Category name"
                onkeydown={(e) => { if (e.key === 'Enter') { pomodoro.renameCategory(t.id, catName); editCat = null; } if (e.key === 'Escape') editCat = null; }} />
            {:else}
              <span class="cat-name">{label(t.id)}</span>
            {/if}
            <span class="cat-ms">{spanText(t.ms)}</span>
            {#if t.id !== NONE}
              <div class="cat-acts">
                <button type="button" class="btn ghost sm" onclick={() => { editCat = editCat === t.id ? null : t.id; catName = label(t.id); askCat = null; }}>Edit</button>
                {#if askCat === t.id}
                  <span class="ask">Delete?</span>
                  <button type="button" class="btn sm danger" onclick={() => { pomodoro.removeCategory(t.id); askCat = null; editCat = null; }}>Yes</button>
                  <button type="button" class="btn ghost sm" onclick={() => (askCat = null)}>No</button>
                {:else}
                  <button type="button" class="btn ghost sm danger" onclick={() => (askCat = t.id)}>Delete</button>
                {/if}
              </div>
            {/if}
            {#if editCat === t.id}
              <div class="grid">
                {#each CATEGORY_COLORS as c (c)}
                  <button type="button" class="swatch" class:on={hue(t.id) === c} style="--hue:{c}" aria-label="Colour {c}" onclick={() => pomodoro.recolourCategory(t.id, c)}></button>
                {/each}
              </div>
              <button type="button" class="btn primary sm" onclick={() => { pomodoro.renameCategory(t.id, catName); editCat = null; }}>Done</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

{#if editing}
  <div class="scrim" role="presentation" onclick={() => (editing = null)}></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Edit session">
    <form onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
      <label>Start<input class="input" type="datetime-local" bind:value={editStart} /></label>
      <label>End<input class="input" type="datetime-local" bind:value={editEnd} /></label>
      <p class="ran-line">Duration: {editSpan}</p>
      <label>Summary<input class="input" type="text" bind:value={editSummary} autocomplete="off" /></label>
      <CategoryPicker picked={editCats} onpick={(ids) => (editCats = ids)} />
      <div class="acts">
        <button type="submit" class="btn primary">Save</button>
        <button type="button" class="btn ghost" onclick={() => (editing = null)}>Cancel</button>
      </div>
    </form>
  </div>
{/if}

<style>
  .stats{display:flex;flex-direction:column;gap:10px;font-family:var(--sans);padding:14px 16px;min-width:0;overflow:auto;height:100%}
  .tabs{align-self:flex-start;min-width:200px}
  .empty{margin:0;font-size:0.84rem;color:var(--muted)}
  .rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
  .rows li{position:relative;display:flex;align-items:baseline;gap:10px;font-size:0.84rem;padding:5px 30px 5px 6px;border-bottom:1px solid var(--rule)}
  .rows li:hover{background:var(--soft)}
  .when{font-weight:600;min-width:5.2em}
  .span,.ran{color:var(--muted);font-size:0.78rem;font-variant-numeric:tabular-nums}
  .ran{min-width:3.6em}
  .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dots-row{display:flex;gap:3px}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--hue);flex:none;display:inline-block}
  .more{position:absolute;right:4px;top:3px;opacity:0}
  .rows li:hover .more,.more:focus-visible{opacity:1}
  .rows li.open{z-index:30}
  .range{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px}
  .range label{display:flex;flex-direction:column;gap:3px;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
  .date{height:28px;font-size:0.8rem;text-transform:none;letter-spacing:0;font-weight:400}
  .helpers{display:flex;gap:4px;flex-wrap:wrap}
  .vchart{display:grid;grid-template-columns:auto 1fr;grid-template-rows:180px auto;column-gap:6px;row-gap:4px;font-size:0.7rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .axis{position:relative;min-width:2.6em}
  .axis span{position:absolute;right:0;transform:translateY(50%);line-height:1}
  .plot{position:relative;display:grid;grid-template-columns:repeat(var(--n),1fr);gap:max(2px,min(8px,calc(120px / var(--n))));border-bottom:1px solid var(--rule)}
  .grid-line{position:absolute;left:0;right:0;border-top:1px dashed color-mix(in srgb,var(--rule) 70%,transparent);pointer-events:none}
  .col{position:relative;display:flex;align-items:flex-end;min-width:0}
  .stack{display:flex;flex-direction:column-reverse;width:100%;height:100%;border-radius:3px 3px 0 0;overflow:hidden}
  .seg-part{background:var(--hue);flex:none}
  .labels{grid-column:2;display:grid;grid-template-columns:repeat(var(--n),1fr);gap:max(2px,min(8px,calc(120px / var(--n))))}
  .labels span{text-align:center;white-space:nowrap;overflow:hidden;text-overflow:clip}
  .menu{position:absolute;right:4px;top:28px;z-index:30;display:flex;gap:2px;align-items:center;padding:4px;border:1px solid var(--rule);border-radius:9px;background:var(--panel);box-shadow:0 6px 18px rgba(0,0,0,.16)}
  .ask{font-size:0.78rem;color:var(--muted);padding:0 4px}
  .total{margin:0;font-size:0.9rem;color:var(--ink)}
  .eyebrow{margin:6px 0 0}
  .cat-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .cat-list li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.84rem}
  .cat-name{min-width:6em}
  .cat-ms{color:var(--muted);font-variant-numeric:tabular-nums;min-width:4em}
  .cat-acts{display:flex;gap:4px;align-items:center}
  .rename{height:26px;font-size:0.82rem}
  .grid{display:grid;grid-template-columns:repeat(5,22px);gap:4px;width:100%}
  .swatch{width:22px;height:22px;border-radius:5px;border:2px solid transparent;background:var(--hue);cursor:pointer;padding:0}
  .swatch.on{border-color:var(--ink)}
  .scrim{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.28)}
  .modal{position:fixed;z-index:61;top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,92vw);padding:16px;border:1px solid var(--rule);border-radius:12px;background:var(--panel);box-shadow:0 10px 30px rgba(0,0,0,.28);font-family:var(--sans)}
  .modal form{display:flex;flex-direction:column;gap:10px}
  .modal label{display:flex;flex-direction:column;gap:4px;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted)}
  .modal .input{text-transform:none;letter-spacing:0;font-weight:400}
  .ran-line{margin:0;font-size:0.78rem;color:var(--muted)}
  .acts{display:flex;gap:6px;margin-top:2px}
  .swatch:focus-visible{outline:2px solid var(--accent)}
</style>
