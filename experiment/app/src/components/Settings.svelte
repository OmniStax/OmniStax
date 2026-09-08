<script lang="ts">
  /* The settings page: appearance, reading, keyboard shortcuts, layout. A
     centred dialog; everything is saved in this browser. Clicking a shortcut
     cell records the next chord (Escape cancels, Backspace clears); a chord
     another command owns is shown as a conflict and taken only on Enter. */
  import { settings, THEMES } from '../lib/settings/store.svelte';
  import { layoutStore } from '../lib/layout/store.svelte';
  import { commands } from '../lib/commands/registry.svelte';
  import { keys } from '../lib/commands/keys.svelte';
  import { chordOf, chordKeys, type Chord } from '../lib/commands/chord';
  import type { Command, CommandId } from '../lib/commands/command';
  import { ui } from '../lib/commands/ui.svelte';
  import { reader } from '../lib/voice.svelte';

  type Recording = { readonly id: CommandId; readonly pending: { readonly chord: Chord; readonly other: Command } | null };
  let rec = $state<Recording | null>(null);
  const groups = $derived.by(() => {
    const m = new Map<string, Command[]>();
    commands.all().forEach((c) => { const g = m.get(c.group); if (g) g.push(c); else m.set(c.group, [c]); });
    return Array.from(m.entries());
  });
  $effect(() => { if (!ui.settings) rec = null; });

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
</script>

{#if ui.settings}
  <div class="scrim">
    <div class="dialog" id="settings" onclick={(e) => e.stopPropagation()} onkeydown={onKey} role="dialog" tabindex="-1" aria-label="Settings">
      <header><div class="eyebrow">Settings</div><button type="button" class="x" title="Close" aria-label="Close settings" onclick={() => (ui.settings = false)}>×</button></header>

      <section>
        <h3>Appearance</h3>
        <div class="row">
          <span class="name">Theme</span>
          <div class="seg" role="radiogroup" aria-label="Theme">
            {#each THEMES as t (t)}
              <button type="button" class:on={settings.theme === t} id={t === 'dark' ? 'theme-toggle' : undefined} role="radio" aria-checked={settings.theme === t} onclick={() => settings.setTheme(t)}>{t}</button>
            {/each}
          </div>
        </div>
        <label class="row switch"><span class="name">Colour coding</span><span class="hint">Each physical type keeps its own hue in text, formulas and figures.</span><input type="checkbox" id="cc-toggle" checked={settings.colorCoding} onchange={(e) => settings.setColorCoding(e.currentTarget.checked)}></label>
      </section>

      <section>
        <h3>Reading</h3>
        <label class="row switch"><span class="name">Play animations</span><span class="hint">Off pauses every demo; the transport controls stay put.</span><input type="checkbox" id="anim-toggle" checked={settings.animations} onchange={(e) => settings.setAnimations(e.currentTarget.checked)}></label>
        <div class="row">
          <span class="name">Exercises</span>
          <div class="seg" role="radiogroup" aria-label="Exercise mode">
            <button type="button" class:on={settings.exerciseMode === 'all'} role="radio" aria-checked={settings.exerciseMode === 'all'} onclick={() => settings.setExerciseMode('all')}>all</button>
            <button type="button" class:on={settings.exerciseMode === 'one'} role="radio" aria-checked={settings.exerciseMode === 'one'} onclick={() => settings.setExerciseMode('one')}>one at a time</button>
          </div>
        </div>
        <label class="row switch"><span class="name">Voice</span><span class="hint">{reader.supported ? 'Adds a read-aloud button to the rail and the "Read section aloud" command.' : 'This browser has no speech synthesis.'}</span><input type="checkbox" id="voice-toggle" disabled={!reader.supported} checked={settings.voice} onchange={(e) => settings.setVoice(e.currentTarget.checked)}></label>
      </section>

      <section>
        <h3>Keyboard shortcuts</h3>
        <p class="hint">Click a shortcut to record a new one. Escape cancels, Backspace clears. Ctrl also answers to Cmd.</p>
        <table>
          <tbody>
            {#each groups as [group, cmds] (group)}
              <tr class="grp"><th colspan="2">{group}</th></tr>
              {#each cmds as c (c.id)}
                {@const on = rec?.id === c.id}
                <tr>
                  <td class="cmd">{c.label}</td>
                  <td class="keys">
                    <button type="button" class="chord-cell" class:on onclick={() => record(c.id)} aria-label="Shortcut for {c.label}">
                      {#if on && rec?.pending}
                        <span class="conflict">{#each chordKeys(rec.pending.chord) as k}<kbd class="kbd">{k}</kbd>{/each} is bound to <em>{rec.pending.other.label}</em> — Enter to take it</span>
                      {:else if on}
                        <span class="recording">Press a chord…</span>
                      {:else}
                        {#each keys.chordsFor(c.id) as ch, i (ch)}{#if i}<span class="or">or</span>{/if}<span class="chord">{#each chordKeys(ch) as k}<kbd class="kbd">{k}</kbd>{/each}</span>{:else}<span class="none">—</span>{/each}
                      {/if}
                    </button>
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
        <button class="btn-sm" type="button" disabled={keys.isDefault} onclick={() => keys.restoreDefaults()}>Restore defaults</button>
      </section>

      <section>
        <h3>Layout</h3>
        <div class="row"><span class="name">Panes and tabs</span><span class="hint">Back to the section's text and exercises, views in their home sidebars.</span><button class="btn-sm" id="reset-layout" type="button" onclick={() => layoutStore.reset()}>Reset layout</button></div>
      </section>

      <small>Layout, shortcuts and settings are saved in this browser.</small>
    </div>
  </div>
{/if}

<style>
  .scrim{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:rgba(0,0,0,.18);padding:16px}
  .dialog{width:min(760px,100%);max-height:88vh;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:18px 24px 20px;font-family:var(--sans);font-size:0.88rem;box-shadow:0 12px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
  header{display:flex;align-items:center;justify-content:space-between}
  .x{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:4px}
  .x:hover{background:var(--soft);color:var(--ink)}
  h3{font-size:0.95rem;font-weight:600;margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--rule)}
  section{display:flex;flex-direction:column;gap:8px}
  .row{display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:4px 0}
  .name{font-weight:600}
  .hint{color:var(--muted);font-size:0.8rem;margin:0}
  p.hint{margin:-4px 0 4px}
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;grid-column:3}
  .seg button{font:inherit;font-size:0.8rem;padding:4px 12px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button+button{border-left:1px solid var(--rule)}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:600}
  .seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
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
  .chord{display:inline-flex;gap:2px}
  .or,.none{color:var(--muted);font-size:0.78rem}
  .recording{color:var(--muted);font-style:italic}
  .conflict{color:var(--bad);font-size:0.8rem}
  .conflict em{font-style:normal;font-weight:600}
  @media (max-width:600px){ .row{grid-template-columns:1fr auto} .hint{grid-column:1 / -1} .seg{grid-column:auto} }
</style>
