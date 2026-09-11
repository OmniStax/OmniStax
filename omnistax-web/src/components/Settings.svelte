<script lang="ts">
  /* The settings page: appearance, reading, exercises, layout, keyboard
     shortcuts. A
     centred dialog; everything is saved in this browser. A filter in the header
     narrows the rows to those that mention what is typed. Each setting that is
     not at its default wears a small return arrow that puts it back. Clicking a
     shortcut cell records the next chord (Escape cancels, Backspace clears); a
     chord another command owns is shown as a conflict and taken only on Enter.
     Chords the browser keeps for itself on this surface are marked. */
  import { settings, THEMES, DEFAULTS } from '../lib/settings/store.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { commands } from '../lib/commands/registry.svelte';
  import { keys } from '../lib/commands/keys.svelte';
  import { chordOf, chordKeys, type Chord } from '../lib/commands/chord';
  import type { Command, CommandId } from '../lib/commands/command';
  import { ui } from '../lib/commands/ui.svelte';
  import { reader } from '../lib/voice.svelte';
  import { host, kept, BROWSER_NAMES } from '../lib/commands/host.svelte';
  import { practice } from '../lib/practice/store.svelte';
  import { DEFAULT_SETTINGS } from '../lib/practice/model';

  type Recording = { readonly id: CommandId; readonly pending: { readonly chord: Chord; readonly other: Command } | null };
  let rec = $state<Recording | null>(null);
  let q = $state('');
  const hit = (text: string): boolean => { const needle = q.trim().toLowerCase(); return !needle || text.toLowerCase().includes(needle); };
  /* Every row's words, so a section can tell whether any of its rows survive the filter. */
  const ROWS = {
    theme: 'Theme system light dark', cc: 'Colour coding hue text formulas figures', underlines: 'Underlines dotted rule symbols glossary terms example references',
    anim: 'Play animations sim figure transport', ex: 'Exercises all one at a time', voice: 'Voice read aloud speech',
    threshold: 'Mastery threshold score concept fading points mastered', days: 'Days in a row distinct correct streak mastered',
    halfLife: 'Half-life in days fading decay unpractised score halved', session: 'Exercises in a session how many a session draws',
    reviewShare: 'Share given to review due percentage session new work', spaced: 'Spaced review scores fade with time mastered come due again',
    selfChecked: 'Count self-checked answers solution multiple choice points', record: 'Practice record forget my practice recorded answers points mastery',
    mapProgress: 'Progress on the concept map mastery bars nodes practice',
    layout: 'Panes and tabs reset layout views sidebars',
  } as const;
  const APPEARANCE = [ROWS.theme, ROWS.cc, ROWS.underlines], READING = [ROWS.anim, ROWS.ex, ROWS.voice];
  const PRACTICE = [ROWS.threshold, ROWS.days, ROWS.halfLife, ROWS.session, ROWS.reviewShare, ROWS.spaced, ROWS.selfChecked, ROWS.mapProgress, ROWS.record];
  const groups = $derived.by(() => {
    const m = new Map<string, Command[]>();
    commands.all().filter((c) => hit(`${c.group} ${c.label} ${keys.chordsFor(c.id).map(chordKeys).flat().join(' ')}`)).forEach((c) => { const g = m.get(c.group); if (g) g.push(c); else m.set(c.group, [c]); });
    return Array.from(m.entries());
  });
  $effect(() => { if (!ui.settings) { rec = null; q = ''; } });

  /* The five numbers under Exercises. `scale` turns what the store keeps into
     what the reader sees: the review share is held as a fraction and shown as
     a percentage. A value commits on change or on a stepper click, clamped. */
  type NumKey = 'threshold' | 'days' | 'halfLife' | 'session' | 'reviewShare';
  type NumRow = { readonly key: NumKey; readonly words: string; readonly name: string; readonly hint: string; readonly min: number; readonly max: number; readonly step: number; readonly scale: number; readonly unit?: string; readonly restore: string };
  const NUMS: readonly NumRow[] = [
    { key: 'threshold', words: ROWS.threshold, name: 'Mastery threshold', hint: 'The score a concept must reach, after fading, to count as mastered.', min: 1, max: 100, step: 1, scale: 1, restore: 'Back to a threshold of ten points' },
    { key: 'days', words: ROWS.days, name: 'Days in a row', hint: 'How many different days in a row you must answer a concept correctly before it is mastered.', min: 1, max: 14, step: 1, scale: 1, restore: 'Back to three days in a row' },
    { key: 'halfLife', words: ROWS.halfLife, name: 'Half-life in days', hint: 'How quickly an unpractised concept fades: after this many days its score is halved. Each day in a row you keep a concept doubles its half-life.', min: 1, max: 90, step: 1, scale: 1, restore: 'Back to a half-life of seven days' },
    { key: 'session', words: ROWS.session, name: 'Exercises in a session', hint: 'How many exercises a session draws.', min: 1, max: 50, step: 1, scale: 1, restore: 'Back to eight exercises in a session' },
    { key: 'reviewShare', words: ROWS.reviewShare, name: 'Share given to review', hint: 'When something is due, this much of a session goes to reviewing it before new work.', min: 0, max: 100, step: 5, scale: 100, unit: '%', restore: 'Back to a third of a session' },
  ];
  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
  const shown = (n: NumRow): number => Math.round(practice.settings[n.key] * n.scale);
  const commit = (n: NumRow, v: number): void => { if (Number.isFinite(v)) practice.setSetting(n.key, clamp(v, n.min, n.max) / n.scale); };
  const forget = () => { if (confirm('Forget every recorded answer? Points and mastery start again from nothing.')) practice.wipe(); };

  const plain = (e: KeyboardEvent): boolean => !(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey);
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (!rec) { if (e.key === 'Escape') { ui.settings = false; return; } if (e.ctrlKey || e.metaKey || e.altKey) keys.dispatch(e); return; }
    e.preventDefault();
    if (e.key === 'Escape') { rec = null; return; }
    if (e.key === 'Backspace' && plain(e)) { keys.clear(rec.id); rec = null; return; }
    if (e.key === 'Enter' && plain(e) && rec.pending) { keys.set(rec.id, rec.pending.chord); rec = null; return; }
    const c = chordOf(e); if (!c) return;
    const otherId = keys.commandFor(c); const other = otherId && otherId !== rec.id ? commands.get(otherId) : undefined;
    if (other) { rec = { id: rec.id, pending: { chord: c, other } }; return; }
    keys.set(rec.id, c); rec = null;
  };
  const record = (id: CommandId) => { rec = rec?.id === id ? null : { id, pending: null }; };
  const focus = (el: HTMLElement) => { el.focus(); };

  /* The chords this window never sees: the browser keeps them. The bindings
     are the same in a tab and in the installed app; only what arrives differs. */
  const browserName = $derived(BROWSER_NAMES[host.browser]);
  const tabHeld = $derived(commands.all().filter((c) => keys.chordsFor(c.id).some((ch) => kept({ browser: host.browser, surface: 'tab' }, ch))).length);
  const keptTitle = $derived(`${browserName} keeps this chord for itself in a browser tab; the book never sees it`);
</script>

{#snippet back(on: boolean, title: string, fn: () => void)}
  {#if on}<button type="button" class="back" {title} aria-label={title} onclick={(e) => { e.preventDefault(); fn(); }}>↺</button>{/if}
{/snippet}

{#snippet numRow(n: NumRow)}
  <div class="row num" hidden={!hit(n.words)}>
    <span class="name">{n.name}{@render back(practice.settings[n.key] !== DEFAULT_SETTINGS[n.key], n.restore, () => practice.setSetting(n.key, DEFAULT_SETTINGS[n.key]))}</span>
    <span class="hint">{n.hint}</span>
    <div class="num">
      <button type="button" aria-label="Less" onclick={() => commit(n, shown(n) - n.step)}>−</button>
      <input type="number" min={n.min} max={n.max} step={n.step} inputmode="numeric" aria-label={n.name} value={shown(n)} onchange={(e) => { commit(n, e.currentTarget.valueAsNumber); e.currentTarget.value = String(shown(n)); }}>
      {#if n.unit}<span class="unit">{n.unit}</span>{/if}
      <button type="button" aria-label="More" onclick={() => commit(n, shown(n) + n.step)}>+</button>
    </div>
  </div>
{/snippet}

{#if ui.settings}
  <div class="scrim">
    <div class="dialog" id="settings" onclick={(e) => e.stopPropagation()} onkeydown={onKey} role="dialog" tabindex="-1" aria-label="Settings">
      <header>
        <div class="eyebrow">Settings</div>
        <input class="find" type="search" placeholder="Filter settings…" aria-label="Filter settings" bind:value={q} use:focus>
        <button type="button" class="x" title="Close" aria-label="Close settings" onclick={() => (ui.settings = false)}>×</button>
      </header>

      <section hidden={!APPEARANCE.some(hit)}>
        <h3>Appearance</h3>
        <div class="row" hidden={!hit(ROWS.theme)}>
          <span class="name">Theme{@render back(settings.theme !== DEFAULTS.theme, 'Back to the system theme', () => settings.setTheme(DEFAULTS.theme))}</span>
          <div class="seg" role="radiogroup" aria-label="Theme">
            {#each THEMES as t (t)}
              <button type="button" class:on={settings.theme === t} id={t === 'dark' ? 'theme-toggle' : undefined} role="radio" aria-checked={settings.theme === t} onclick={() => settings.setTheme(t)}>{t}</button>
            {/each}
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.cc)}><span class="name">Colour coding{@render back(settings.colorCoding !== DEFAULTS.colorCoding, 'Back to colour coding on', () => settings.setColorCoding(DEFAULTS.colorCoding))}</span><span class="hint">Each physical type keeps its own hue in text, formulas and figures.</span><input type="checkbox" id="cc-toggle" checked={settings.colorCoding} onchange={(e) => settings.setColorCoding(e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.underlines)}><span class="name">Underlines{@render back(settings.underlines !== DEFAULTS.underlines, 'Back to underlines on', () => settings.setUnderlines(DEFAULTS.underlines))}</span><span class="hint">The dotted rule under symbols, glossary terms and example references. Off leaves the page clean; the card still opens on hover.</span><input type="checkbox" id="underline-toggle" checked={settings.underlines} onchange={(e) => settings.setUnderlines(e.currentTarget.checked)}></label>
      </section>

      <section hidden={!READING.some(hit)}>
        <h3>Reading</h3>
        <label class="row switch" hidden={!hit(ROWS.anim)}><span class="name">Play animations{@render back(settings.animations !== DEFAULTS.animations, 'Back to animations on', () => settings.setAnimations(DEFAULTS.animations))}</span><span class="hint">Off pauses every interactive figure; the transport controls stay put.</span><input type="checkbox" id="anim-toggle" checked={settings.animations} onchange={(e) => settings.setAnimations(e.currentTarget.checked)}></label>
        <div class="row" hidden={!hit(ROWS.ex)}>
          <span class="name">Exercises{@render back(settings.exerciseMode !== DEFAULTS.exerciseMode, 'Back to all exercises at once', () => settings.setExerciseMode(DEFAULTS.exerciseMode))}</span>
          <div class="seg" role="radiogroup" aria-label="Exercise mode">
            <button type="button" class:on={settings.exerciseMode === 'all'} role="radio" aria-checked={settings.exerciseMode === 'all'} onclick={() => settings.setExerciseMode('all')}>all</button>
            <button type="button" class:on={settings.exerciseMode === 'one'} role="radio" aria-checked={settings.exerciseMode === 'one'} onclick={() => settings.setExerciseMode('one')}>one at a time</button>
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.voice)}><span class="name">Voice{@render back(settings.voice !== DEFAULTS.voice, 'Back to voice off', () => settings.setVoice(DEFAULTS.voice))}</span><span class="hint">{reader.supported ? 'Adds a read-aloud button to the rail and the "Read section aloud" command.' : 'This browser has no speech synthesis.'}</span><input type="checkbox" id="voice-toggle" disabled={!reader.supported} checked={settings.voice} onchange={(e) => settings.setVoice(e.currentTarget.checked)}></label>
      </section>

      <section hidden={!PRACTICE.some(hit)}>
        <h3>Exercises</h3>
        {#each NUMS as n (n.key)}{@render numRow(n)}{/each}
        <label class="row switch" hidden={!hit(ROWS.spaced)}><span class="name">Spaced review{@render back(practice.settings.spaced !== DEFAULT_SETTINGS.spaced, 'Back to spaced review on', () => practice.setSetting('spaced', DEFAULT_SETTINGS.spaced))}</span><span class="hint">Scores fade with time and mastered concepts come due again. Off keeps every score as it is.</span><input type="checkbox" checked={practice.settings.spaced} onchange={(e) => practice.setSetting('spaced', e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.selfChecked)}><span class="name">Count self-checked answers{@render back(practice.settings.selfChecked !== DEFAULT_SETTINGS.selfChecked, 'Back to counting self-checked answers', () => practice.setSetting('selfChecked', DEFAULT_SETTINGS.selfChecked))}</span><span class="hint">A problem you check against the book’s solution yourself earns points when you say you got it. Off makes only multiple-choice answers count.</span><input type="checkbox" checked={practice.settings.selfChecked} onchange={(e) => practice.setSetting('selfChecked', e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.mapProgress)}><span class="name">Progress on the concept map{@render back(settings.mapProgress !== DEFAULTS.mapProgress, 'Back to the bars drawn on the map', () => settings.setMapProgress(DEFAULTS.mapProgress))}</span><span class="hint">Every concept map opens with the mastery bars drawn on its nodes. The map's own switch hides them for that map.</span><input type="checkbox" checked={settings.mapProgress} onchange={(e) => settings.setMapProgress(e.currentTarget.checked)}></label>
        <div class="row" hidden={!hit(ROWS.record)}>
          <span class="name">Practice record</span>
          <span class="hint">Every answer you have recorded, and the points and mastery that come from it.{#if practice.attempts.length} {practice.attempts.length === 1 ? 'One answer' : `${practice.attempts.length} answers`} so far.{/if}</span>
          <button class="btn-sm" type="button" onclick={forget}>Forget my practice</button>
        </div>
      </section>

      <section hidden={!hit(ROWS.layout)}>
        <h3>Layout</h3>
        <div class="row"><span class="name">Panes and tabs</span><span class="hint">Back to the section's text and exercises, views in their home sidebars.</span><button class="btn-sm" id="reset-layout" type="button" onclick={() => layoutStore.reset()}>Reset layout</button></div>
      </section>

      <section hidden={!groups.length}>
        <h3>Keyboard shortcuts</h3>
        <p class="hint">Click a shortcut to record a new one. Ctrl also answers to Cmd.</p>
        {#if tabHeld}
          <p class="hint">
            {#if host.surface === 'app'}You are in the installed app, where every shortcut reaches the book. In a browser tab, {browserName} would keep {tabHeld} of them for itself.
            {:else if host.surface === 'fullscreen'}You are in full screen, where every shortcut reaches the book. In a browser tab, {browserName} would keep {tabHeld} of them for itself.
            {:else}You are in a browser tab, so {browserName} keeps {tabHeld} of these shortcuts for itself, marked <span class="kept" aria-hidden="true">⊘</span>.{/if}
            {#if host.canInstall}<button class="link" type="button" onclick={() => host.install()}>Install as app</button>{/if}
          </p>
        {/if}
        <table>
          <tbody>
            {#each groups as [group, cmds] (group)}
              <tr class="grp"><th colspan="2">{group}</th></tr>
              {#each cmds as c (c.id)}
                {@const on = rec?.id === c.id}
                <tr>
                  <td class="cmd">{c.label}{@render back(!keys.isDefaultFor(c.id), 'Back to the default shortcut', () => keys.restoreDefault(c.id))}</td>
                  <td class="keys">
                    <button type="button" class="chord-cell" class:on onclick={() => record(c.id)} aria-label="Shortcut for {c.label}">
                      {#if on && rec?.pending}
                        <span class="conflict">{#each chordKeys(rec.pending.chord) as k}<kbd class="kbd">{k}</kbd>{/each} is bound to <em>{rec.pending.other.label}</em> — Enter to take it</span>
                      {:else if on}
                        <span class="recording">Press a chord…</span>
                      {:else}
                        {#each keys.chordsFor(c.id) as ch, i (ch)}{#if i}<span class="or">or</span>{/if}<span class="chord" class:held={kept(host.info, ch)}>{#each chordKeys(ch) as k}<kbd class="kbd">{k}</kbd>{/each}{#if kept(host.info, ch)}<span class="kept" title={keptTitle} aria-label={keptTitle} role="img">⊘</span>{/if}</span>{:else}<span class="none">—</span>{/each}
                      {/if}
                    </button>
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
        <button class="btn-sm" type="button" disabled={keys.isDefault} onclick={() => keys.restoreDefaults()}>Restore all defaults</button>
      </section>

      <small>Layout, shortcuts and settings are saved in this browser.</small>
    </div>
  </div>
{/if}

<style>
  .scrim{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:rgba(0,0,0,.18);padding:16px}
  .dialog{width:min(760px,100%);max-height:88vh;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:18px 24px 20px;font-family:var(--sans);font-size:0.88rem;box-shadow:0 12px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
  header{display:flex;align-items:center;gap:12px}
  .find{flex:1;font:inherit;font-size:0.82rem;padding:4px 8px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink);min-width:0}
  .find:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  .x{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:4px;flex:none}
  .x:hover{background:var(--soft);color:var(--ink)}
  h3{font-size:0.95rem;font-weight:600;margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
  section{display:flex;flex-direction:column;gap:8px}
  .row{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:4px 0}
  .name{font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .back{border:0;background:transparent;color:var(--muted);font:inherit;font-size:0.9rem;line-height:1;cursor:pointer;padding:1px 3px;border-radius:3px}
  .back:hover{background:var(--soft);color:var(--ink)}
  .hint{color:var(--muted);font-size:0.8rem;margin:0}
  p.hint{margin:-4px 0 4px}
  .link{border:0;background:transparent;color:var(--accent);font:inherit;font-size:0.8rem;padding:0;cursor:pointer;text-decoration:underline}
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;grid-column:3}
  .seg button{font:inherit;font-size:0.8rem;padding:4px 12px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button+button{border-left:1px solid var(--rule)}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:600}
  .seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row>.num{display:inline-flex;align-items:center;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .row>.num button{font:inherit;font-size:0.8rem;line-height:1.25;padding:4px 10px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .row>.num button:hover{background:var(--soft);color:var(--ink)}
  .row>.num button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row>.num button:last-child{border-left:1px solid var(--rule)}
  .row>.num input{font:inherit;font-size:0.8rem;line-height:1.25;width:5.5ch;text-align:right;padding:4px 6px;border:0;border-left:1px solid var(--rule);background:var(--panel);color:var(--ink);appearance:textfield;-moz-appearance:textfield}
  .row>.num input::-webkit-outer-spin-button,.row>.num input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .row>.num input:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row>.num .unit{font-size:0.8rem;line-height:1.25;color:var(--muted);padding:4px 6px 4px 0;background:var(--panel)}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer;align-self:flex-start}
  .btn-sm:hover:not(:disabled){background:var(--soft)}
  .btn-sm:disabled{opacity:.5;cursor:default}
  small{color:var(--muted);font-size:0.75rem}
  .switch{cursor:pointer;user-select:none}
  .switch input{appearance:none;width:38px;height:22px;border-radius:11px;background:var(--soft2);position:relative;cursor:pointer;margin:0;transition:background .15s}
  .switch input::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--panel);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:left .15s}
  .switch input:checked{background:var(--accent)}
  .switch input:checked::after{left:19px}
  .switch input:disabled{opacity:.4;cursor:default}
  .switch input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  table{width:100%;border-collapse:collapse}
  tr.grp th{text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);padding:10px 0 3px}
  td{padding:2px 0;border-top:1px solid var(--rule);vertical-align:middle}
  td.cmd{width:50%}
  .chord-cell{font:inherit;width:100%;text-align:left;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--ink);padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:28px;flex-wrap:wrap}
  .chord-cell:hover{background:var(--soft)}
  .chord-cell.on{border-color:var(--accent);background:var(--soft)}
  .chord{display:inline-flex;gap:2px;align-items:center}
  .chord.held .kbd{opacity:.55}
  .kept{color:var(--bad);font-size:0.85rem;line-height:1;margin-left:2px}
  .or,.none{color:var(--muted);font-size:0.78rem}
  .recording{color:var(--muted);font-style:italic}
  .conflict{color:var(--bad);font-size:0.8rem}
  .conflict em{font-style:normal;font-weight:600}
  @media (max-width:600px){ .row{grid-template-columns:1fr auto} .hint{grid-column:1 / -1} .seg{grid-column:auto} }
</style>
