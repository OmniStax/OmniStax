<script lang="ts">
  /* What the clock has added up to. Two faces: the sittings one by one, which
     the reader can correct or strike out, and the categories they were filed
     under, with the last fortnight drawn as a bar a day. A category is a tag,
     so a sitting filed under two of them stands at its full length under each,
     and a day's stack can reach past the day's own total — which is why the
     true total is marked on every bar and quoted beside it. Nothing here draws
     a chart from a library: a bar is a row of divs whose widths are the shares
     they stand for, which is all a stacked bar has ever been. */
  import { CATEGORY_COLORS, type Pomodoro, categoryTotals, colorOf, dayBars, instant, nameOf, onlyUnder, ranMs, spanText, totalMs } from '../../lib/pomodoro/model';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import CategoryPicker from '../pomodoro/CategoryPicker.svelte';

  type Face = 'list' | 'category';
  /* The empty id stands for the sittings filed under nothing, so that they can
     be asked for and set aside like any other category. */
  const NONE = '';
  let face = $state<Face>('list');
  const log = $derived(pomodoro.log);
  const cats = $derived(pomodoro.categories);

  $effect(() => { pomodoro.init(); });

  /* The menu a row's three dots opens, the one row that is asking to be struck
     out, and the sitting being edited: one of each at a time. */
  let menu = $state<string | null>(null);
  let asking = $state<string | null>(null);
  let editing = $state<Pomodoro | null>(null);
  let editStart = $state('');
  let editEnd = $state('');
  let editSummary = $state('');
  let editCats = $state<readonly string[]>([]);

  /* A datetime-local field speaks the reader's own calendar, so an instant is
     written out in local parts rather than in UTC, and read back the same way. */
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
  const dayLabel = (key: string): string => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  /* The category tab starts with everything asked for, and takes on any
     category made after it was opened, so a new one is never quietly left out. */
  let dropped = $state<readonly string[]>([]);
  const picked = $derived([NONE, ...cats.map((c) => c.id)].filter((id) => !dropped.includes(id)));
  const toggle = (id: string): void => { dropped = dropped.includes(id) ? dropped.filter((d) => d !== id) : [...dropped, id]; };
  const shown = $derived(onlyUnder(log, picked));
  const bars = $derived(dayBars(log, picked, instant(Date.now())));
  /* Every bar is drawn to the tallest stack, so the widths stay comparable even where the tags overlap. */
  const peak = $derived(Math.max(1, ...bars.map((b) => b.stacked)));
  const totals = $derived(categoryTotals(log, picked));
  const most = $derived(Math.max(1, ...totals.map((t) => t.ms)));
  const hue = (id: string): string => (id === NONE ? 'var(--muted)' : colorOf(cats, id));
  const label = (id: string): string => (id === NONE ? 'Uncategorized' : nameOf(cats, id));

  /* Renaming, recolouring and striking out a category all happen here, which is
     the one place the reader sees them all at once. */
  let editCat = $state<string | null>(null);
  let catName = $state('');
  let askCat = $state<string | null>(null);
</script>

<div class="stats">
  <div class="tabs" role="tablist">
    <button type="button" role="tab" aria-selected={face === 'list'} class:on={face === 'list'} onclick={() => (face = 'list')}>List</button>
    <button type="button" role="tab" aria-selected={face === 'category'} class:on={face === 'category'} onclick={() => (face = 'category')}>Category</button>
  </div>

  {#if face === 'list'}
    {#if !log.length}
      <p class="empty">No sessions yet.</p>
    {:else}
      <ul class="rows">
        {#each log as p (p.id)}
          <li class:lost={!p.completed} oncontextmenu={(e) => { e.preventDefault(); menu = menu === p.id ? null : p.id; }}>
            <span class="when">{day(p.start)}</span>
            <span class="span">{at(p.start)}–{at(p.end)}</span>
            <span class="ran">{spanText(ranMs(p))}</span>
            <span class="what">{p.summary || '—'}</span>
            <span class="dots-row" aria-hidden={!p.categories.length}>
              {#each p.categories as id (id)}<span class="dot" style="--hue:{hue(id)}" title={label(id)}></span>{/each}
            </span>
            {#if !p.completed}<span class="tag">lost</span>{/if}
            <button type="button" class="more" aria-label="Actions for this session" onclick={() => (menu = menu === p.id ? null : p.id)}>⋯</button>
            {#if menu === p.id}
              <div class="menu">
                {#if asking === p.id}
                  <span class="ask">Delete?</span>
                  <button type="button" class="bad" onclick={() => { pomodoro.remove(p.id ?? ''); menu = null; asking = null; }}>Yes</button>
                  <button type="button" onclick={() => { asking = null; menu = null; }}>No</button>
                {:else}
                  <button type="button" onclick={() => openEdit(p)}>Edit</button>
                  <button type="button" onclick={() => (asking = p.id ?? null)}>Delete</button>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <div class="picks">
      {#each [{ id: NONE, name: 'Uncategorized' }, ...cats] as c (c.id)}
        <button type="button" class="pick" class:on={picked.includes(c.id)} style="--hue:{hue(c.id)}" onclick={() => toggle(c.id)}>
          <span class="dot" style="--hue:{hue(c.id)}"></span>{c.name}
        </button>
      {/each}
    </div>

    <p class="total"><strong>{spanText(totalMs(shown))}</strong> in all, over {shown.length} {shown.length === 1 ? 'session' : 'sessions'}</p>

    <h3 class="eyebrow">Last 14 days</h3>
    <p class="note">A session counts in full under every category it carries, so a bar can run past the day's own total; the notch marks what the day really held.</p>
    <div class="chart">
      {#each bars as b (b.day)}
        <div class="bar-row">
          <span class="bar-day">{dayLabel(b.day)}</span>
          <div class="bar" title="{b.stacked > b.total ? `${spanText(b.total)} in all, ${spanText(b.stacked)} across its categories` : spanText(b.total)}">
            {#each b.parts as part (part.id)}
              <div class="part" style="--hue:{hue(part.id)};width:{(part.ms / peak) * 100}%" title="{label(part.id)}: {spanText(part.ms)}"></div>
            {/each}
            {#if b.total}<div class="mark" style="left:{(b.total / peak) * 100}%" aria-hidden="true"></div>{/if}
          </div>
          <span class="bar-num">{b.total ? spanText(b.total) : ''}</span>
        </div>
      {/each}
    </div>

    <h3 class="eyebrow">By category</h3>
    {#if !totals.length}
      <p class="empty">Nothing recorded under these yet.</p>
    {:else}
      <ul class="cat-list">
        {#each totals as t (t.id)}
          <li>
            <span class="dot" style="--hue:{hue(t.id)}"></span>
            {#if editCat === t.id}
              <input class="rename" bind:value={catName} type="text" aria-label="Category name"
                onkeydown={(e) => { if (e.key === 'Enter') { pomodoro.renameCategory(t.id, catName); editCat = null; } if (e.key === 'Escape') editCat = null; }} />
            {:else}
              <span class="cat-name">{label(t.id)}</span>
            {/if}
            <span class="cat-ms">{spanText(t.ms)}</span>
            <div class="cat-bar"><div class="part" style="--hue:{hue(t.id)};width:{(t.ms / most) * 100}%"></div></div>
            {#if t.id !== NONE}
              <div class="cat-acts">
                <button type="button" onclick={() => { editCat = editCat === t.id ? null : t.id; catName = label(t.id); askCat = null; }}>Edit</button>
                {#if askCat === t.id}
                  <span class="ask">Delete?</span>
                  <button type="button" class="bad" onclick={() => { pomodoro.removeCategory(t.id); askCat = null; editCat = null; }}>Yes</button>
                  <button type="button" onclick={() => (askCat = null)}>No</button>
                {:else}
                  <button type="button" onclick={() => (askCat = t.id)}>Delete</button>
                {/if}
              </div>
            {/if}
            {#if editCat === t.id}
              <div class="grid">
                {#each CATEGORY_COLORS as c (c)}
                  <button type="button" class="swatch" class:on={hue(t.id) === c} style="--hue:{c}" aria-label="Colour {c}" onclick={() => pomodoro.recolourCategory(t.id, c)}></button>
                {/each}
              </div>
              <button type="button" class="done" onclick={() => { pomodoro.renameCategory(t.id, catName); editCat = null; }}>Done</button>
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
      <label>Start<input type="datetime-local" bind:value={editStart} /></label>
      <label>End<input type="datetime-local" bind:value={editEnd} /></label>
      <p class="ran-line">Duration: {editSpan}</p>
      <label>Summary<input type="text" bind:value={editSummary} autocomplete="off" /></label>
      <CategoryPicker picked={editCats} onpick={(ids) => (editCats = ids)} />
      <div class="acts">
        <button type="submit" class="go">Save</button>
        <button type="button" onclick={() => (editing = null)}>Cancel</button>
      </div>
    </form>
  </div>
{/if}

<style>
  .stats{display:flex;flex-direction:column;gap:10px;font-family:var(--sans);padding:14px 16px;min-width:0;overflow:auto;height:100%}
  .tabs{display:flex;gap:4px;border-bottom:1px solid var(--rule);padding-bottom:6px}
  .tabs button{font:inherit;font-size:0.82rem;padding:4px 12px;border:1px solid transparent;border-radius:6px;background:none;color:var(--muted);cursor:pointer}
  .tabs button.on{color:var(--accent);border-color:var(--rule);background:color-mix(in srgb,var(--accent) 10%,transparent);font-weight:600}
  .empty{margin:0;font-size:0.84rem;color:var(--muted)}
  .rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
  .rows li{position:relative;display:flex;align-items:baseline;gap:10px;font-size:0.84rem;padding:5px 30px 5px 6px;border-bottom:1px solid var(--rule)}
  .rows li:hover{background:var(--soft)}
  .rows li.lost{opacity:.72}
  .when{font-weight:600;min-width:5.2em}
  .span,.ran{color:var(--muted);font-size:0.78rem;font-variant-numeric:tabular-nums}
  .ran{min-width:3.6em}
  .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dots-row{display:flex;gap:3px}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--hue);flex:none;display:inline-block}
  .tag{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)}
  .more{position:absolute;right:4px;top:3px;opacity:0;font:inherit;line-height:1;padding:2px 6px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .rows li:hover .more,.more:focus-visible{opacity:1}
  .menu{position:absolute;right:4px;top:26px;z-index:30;display:flex;gap:4px;align-items:center;padding:4px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);box-shadow:0 6px 18px rgba(0,0,0,.18)}
  .menu button,.cat-acts button,.acts button,.done{font:inherit;font-size:0.78rem;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .menu button:hover,.cat-acts button:hover{background:var(--soft)}
  .bad{color:var(--bad);border-color:var(--bad)}
  .ask{font-size:0.78rem;color:var(--muted)}
  .picks{display:flex;flex-wrap:wrap;gap:5px}
  .pick{display:flex;align-items:center;gap:5px;font:inherit;font-size:0.78rem;padding:3px 10px;border:1px solid var(--rule);border-radius:999px;background:var(--panel);color:var(--muted);cursor:pointer}
  .pick.on{border-color:var(--hue);color:var(--hue);background:color-mix(in srgb,var(--hue) 12%,transparent)}
  .total{margin:0;font-size:0.9rem;color:var(--ink)}
  .note{margin:0;font-size:0.72rem;line-height:1.4;color:var(--muted)}
  .eyebrow{margin:6px 0 0;font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)}
  .chart{display:flex;flex-direction:column;gap:3px}
  .bar-row{display:flex;align-items:center;gap:8px;font-size:0.76rem}
  .bar-day{min-width:4.4em;color:var(--muted)}
  .bar{position:relative;flex:1;display:flex;height:12px;border-radius:3px;background:var(--soft);overflow:hidden}
  /* The notch stands where the day's real total falls, which is at the end of the stack unless the tags overlap. */
  .mark{position:absolute;top:-1px;bottom:-1px;width:2px;background:var(--ink);opacity:.65;transform:translateX(-1px)}
  .part{background:var(--hue);height:100%}
  .bar-num{min-width:3.4em;text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}
  .cat-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .cat-list li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.84rem}
  .cat-name{min-width:6em}
  .cat-ms{color:var(--muted);font-variant-numeric:tabular-nums;min-width:4em}
  .cat-bar{flex:1;min-width:80px;height:10px;border-radius:3px;background:var(--soft);overflow:hidden}
  .cat-acts{display:flex;gap:4px;align-items:center}
  .rename{font:inherit;font-size:0.82rem;padding:2px 6px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .grid{display:grid;grid-template-columns:repeat(5,22px);gap:4px;width:100%}
  .swatch{width:22px;height:22px;border-radius:5px;border:2px solid transparent;background:var(--hue);cursor:pointer;padding:0}
  .swatch.on{border-color:var(--ink)}
  .scrim{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.28)}
  .modal{position:fixed;z-index:61;top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,92vw);padding:14px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);box-shadow:0 10px 30px rgba(0,0,0,.28);font-family:var(--sans)}
  .modal form{display:flex;flex-direction:column;gap:8px}
  .modal label{display:flex;flex-direction:column;gap:3px;font-size:0.78rem;color:var(--muted)}
  .modal input{font:inherit;font-size:0.84rem;padding:4px 6px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink)}
  .ran-line{margin:0;font-size:0.78rem;color:var(--muted)}
  .acts{display:flex;gap:6px;margin-top:2px}
  .acts .go{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
  button:focus-visible{outline:2px solid var(--accent)}
</style>
