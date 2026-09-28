<script lang="ts">
  /* The command palette: a query box near the top, the commands that match it
     ranked best-first, the chord bound to each on the right. Arrow keys move,
     Enter runs, Escape closes. A command with choices opens its list in place
     (lib/commands/choice.ts) and Backspace on an empty filter comes back. Opened from a chord or the Rail's search button;
     documents are opened from the browser (Browser.svelte), not from here. */
  import { tick } from 'svelte';
  import { commands } from '../lib/commands/registry.svelte';
  import { available, type Command } from '../lib/commands/command';
  import { keys } from '../lib/commands/keys.svelte';
  import { chordKeys } from '../lib/commands/chord';
  import { ui } from '../lib/commands/ui.svelte';
  import { rank } from '../lib/commands/fuzzy';
  import { pieces } from '../lib/commands/pieces';
  import { openChoice, filter, key, perform, shown, type ChoiceStage, type ChoiceKey, type ChoiceOption } from '../lib/commands/choice';

  let query = $state('');
  let sel = $state(0);
  let input = $state<HTMLInputElement | null>(null);
  let list = $state<HTMLElement | null>(null);

  const text = (c: Command): string => `${c.group} ${c.label}`;
  const items = $derived(rank(query, commands.all().filter(available), text));
  let choice = $state.raw<ChoiceStage | null>(null);
  const options = $derived(choice ? shown(choice) : []);
  const focusInput = () => tick().then(() => input?.focus());
  $effect(() => {
    if (!ui.palette.open) { if (choice) { perform(choice.list, { kind: 'cancel' }); choice = null; } return; }
    query = ui.palette.query; sel = 0;
    tick().then(() => { if (!input) return; input.focus(); input.setSelectionRange(input.value.length, input.value.length); });
  });
  $effect(() => { query; sel = 0; });
  $effect(() => { const row = list?.children[choice ? choice.sel : sel] as HTMLElement | undefined; row?.scrollIntoView({ block: 'nearest' }); });

  const run = (c: Command) => {
    if (c.choices) { choice = openChoice(c.label, c.choices()); focusInput(); return; }
    c.run(); ui.closePalette();
  };
  const commit = (o: ChoiceOption) => { if (!choice) return; const l = choice.list; choice = null; perform(l, { kind: 'commit', value: o.value }); ui.closePalette(); };
  const CHOICE_KEYS: Record<string, ChoiceKey> = { ArrowUp: 'up', ArrowDown: 'down', Enter: 'enter', Escape: 'escape', Backspace: 'backspace' };
  const onChoiceKey = (e: KeyboardEvent, c: ChoiceStage) => {
    const k = CHOICE_KEYS[e.key]; if (!k) return;
    const step = key(c, k);
    if (step.effect.kind === 'none' && k === 'backspace') return;
    e.preventDefault();
    if (step.effect.kind === 'commit') { const it = options[c.sel]; if (it) commit(it.item); return; }
    perform(c.list, step.effect);
    if (step.effect.kind === 'cancel') { choice = null; ui.closePalette(); return; }
    if (step.effect.kind === 'back') { choice = null; focusInput(); return; }
    choice = step.stage;
  };
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (choice) { onChoiceKey(e, choice); return; }
    if (e.key === 'Escape') { e.preventDefault(); ui.closePalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = items.length ? (sel + 1) % items.length : 0; return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = items.length ? (sel - 1 + items.length) % items.length : 0; return; }
    if (e.key === 'Home' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = 0; return; }
    if (e.key === 'End' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sel = Math.max(0, items.length - 1); return; }
    if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; if (it) run(it.item); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) keys.dispatch(e);
  };
</script>

{#if ui.palette.open}
  <div class="palette" role="dialog" aria-label="Command palette" onclick={(e) => e.stopPropagation()} onkeydown={onKey}>
    {#if choice}
      <div class="crumb">{choice.title}</div>
      <input bind:this={input} value={choice.query} oninput={(e) => { if (choice) choice = filter(choice, e.currentTarget.value); }} type="text" spellcheck="false" autocomplete="off" aria-label={choice.title} />
    {:else}
      <input bind:this={input} bind:value={query} type="text" spellcheck="false" autocomplete="off" aria-label="Command" placeholder="Type a command…" />
    {/if}
    <div class="list" bind:this={list} role="listbox">
    {#if choice}
      {#each options as { item, match }, i (item.value)}
        <div class="row" class:sel={i === choice.sel} role="option" aria-selected={i === choice.sel} onclick={() => commit(item)}>
          <span class="lbl">{#each pieces(item.label, 0, match.indices) as p}{#if p.hit}<b>{p.t}</b>{:else}{p.t}{/if}{/each}</span>
          {#if item.detail}<span class="detail">{item.detail}</span>{/if}
          {#if item.value === choice.list.current}<span class="detail">current</span>{/if}
        </div>
      {:else}
        <div class="none">No matches</div>
      {/each}
    {:else}
      {#each items as { item, match }, i (item.id)}
        {@const detail = item.detail?.() ?? ''}
        <div class="row" class:sel={i === sel} role="option" aria-selected={i === sel} onmousemove={() => (sel = i)} onclick={() => run(item)}>
          <span class="grp">{#each pieces(item.group, 0, match.indices) as p}{#if p.hit}<b>{p.t}</b>{:else}{p.t}{/if}{/each}</span>
          <span class="lbl">{#each pieces(item.label, item.group.length + 1, match.indices) as p}{#if p.hit}<b>{p.t}</b>{:else}{p.t}{/if}{/each}</span>
          {#if detail}<span class="detail">{detail}</span>{/if}
          <span class="keys">{#each keys.chordsFor(item.id) as c (c)}<span class="chord">{#each chordKeys(c) as k}<kbd class="kbd">{k}</kbd>{/each}</span>{/each}</span>
        </div>
      {:else}
        <div class="none">No matching commands</div>
      {/each}
    {/if}
    </div>
  </div>
{/if}

<style>
  .palette{position:fixed;top:10vh;left:50%;transform:translateX(-50%);width:min(640px,92vw);z-index:50;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.22);font-family:var(--sans);font-size:0.9rem;display:flex;flex-direction:column;overflow:hidden}
  input{border:0;border-bottom:1px solid var(--rule);padding:12px 16px;font:inherit;font-size:1rem;background:transparent;color:var(--ink);outline:none;width:100%;box-sizing:border-box}
  .crumb{padding:8px 16px 0;font-size:0.76rem;color:var(--muted)}
  input::placeholder{color:var(--muted)}
  .list{max-height:min(50vh,420px);overflow:auto;padding:6px 0}
  .row{display:flex;align-items:center;gap:8px;padding:6px 16px;cursor:pointer;line-height:1.4}
  .row.sel{background:var(--soft)}
  .grp{color:var(--muted);white-space:nowrap}
  .grp::after{content:":"}
  .lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  b{font-weight:600;color:var(--accent)}
  .detail{color:var(--muted);font-size:0.78rem;white-space:nowrap}
  .keys{display:flex;gap:8px}
  .chord{display:inline-flex;gap:2px}
  .none{padding:14px 16px;color:var(--muted)}
</style>
