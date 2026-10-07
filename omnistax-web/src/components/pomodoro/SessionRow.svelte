<script lang="ts">
  import { type Pomodoro, colorOf, nameOf, ranMs, spanText } from '../../lib/pomodoro/model';
  import { pomodoro } from '../../lib/pomodoro/store.svelte';
  import RowMenu from '../explorer/RowMenu.svelte';
  import SessionEditor from './SessionEditor.svelte';
  let { p, compact = false }: { p: Pomodoro; compact?: boolean } = $props();
  const cats = $derived(pomodoro.categories);

  let menu = $state<{ x: number; y: number } | null>(null);
  let editing = $state(false);
  let asking = $state(false);
  const items = [
    { label: 'Edit', run: () => { editing = true; } },
    { label: 'Delete', run: () => { asking = true; }, danger: true },
  ];
  const openAt = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    menu = menu ? null : { x: e.clientX, y: e.clientY };
  };

  const day = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const at = (ms: number): string => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
</script>

{#if editing}
  <li class="editing"><SessionEditor entry={p} ondone={() => (editing = false)} /></li>
{:else}
  <li class="row" class:compact class:open={menu !== null} oncontextmenu={openAt}>
    {#if !compact}<span class="when">{day(p.start)}</span>{/if}
    <span class="span">{at(p.start)}–{at(p.end)}</span>
    <span class="ran">{spanText(ranMs(p))}</span>
    <span class="what">{p.summary || '—'}</span>
    <span class="dots" aria-hidden={!p.categories.length}>
      {#each p.categories as id (id)}<span class="dot" style="--hue:{colorOf(cats, id)}" title={nameOf(cats, id)}></span>{/each}
    </span>
    {#if asking}
      <span class="ask">
        Delete?
        <button type="button" class="btn sm danger" onclick={() => pomodoro.remove(p.id ?? '')}>Yes</button>
        <button type="button" class="btn ghost sm" onclick={() => (asking = false)}>No</button>
      </span>
    {:else}
      <button type="button" class="btn ghost icon sm more" aria-label="Actions for this session" onclick={openAt}>⋯</button>
    {/if}
  </li>
{/if}
{#if menu}<RowMenu x={menu.x} y={menu.y} {items} onclose={() => (menu = null)} />{/if}

<style>
  .row{position:relative;display:flex;align-items:baseline;gap:10px;font-size:0.84rem;padding:5px 30px 5px 6px;border-bottom:1px solid var(--rule)}
  .row:hover,.row.open{background:var(--soft)}
  .row.compact{gap:8px;font-size:0.8rem}
  .editing{padding:4px 0;border-bottom:1px solid var(--rule)}
  .when{font-weight:600;min-width:5.2em}
  .span,.ran{font-variant-numeric:tabular-nums;white-space:nowrap}
  .span{color:var(--ink)}
  .ran{color:var(--muted);font-size:0.78rem;min-width:3.6em}
  .compact .ran{min-width:0}
  .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dots{display:flex;gap:3px}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--hue);flex:none;display:inline-block}
  .more{position:absolute;right:4px;top:3px;opacity:0}
  .row:hover .more,.row.open .more,.more:focus-visible{opacity:1}
  @media (hover: none){ .more{opacity:.55} }
  .ask{position:absolute;right:4px;top:2px;display:flex;align-items:center;gap:3px;padding:1px 2px 1px 6px;border-radius:7px;background:var(--panel);font-size:0.78rem;color:var(--bad)}
</style>
