<script lang="ts">
  /* The settings dialog. The header filter narrows every section to the rows
     whose name, description or keywords mention what is typed. A setting off
     its default wears a ↺ that puts it back. The shortcuts carry a toolbar of
     their own: a filter by name or by pressed keys, and a reset. Clicking a
     shortcut records the next chord (Escape cancels, Backspace clears); a chord
     another command owns is shown as a conflict and taken only on Enter. */
  import { settings, THEMES, DEFAULTS, LOCK_GRACE, zoomLabel } from '../lib/settings/store.svelte';
  import { FONTS, fontStack, isFontId, type FontId } from '../lib/settings/fonts';
  import { COLOUR_SWITCHES, COLOUR_LABELS, COLOUR_PARENT, COLOUR_TIPS } from '../lib/colours/switches';
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
  import { openSide } from '../lib/layout/model';
  import Storage from './settings/Storage.svelte';
  import Ai from './settings/Ai.svelte';

  type Recording = { readonly id: CommandId; readonly pending: { readonly chord: Chord; readonly other: Command } | null };
  let rec = $state<Recording | null>(null);
  let q = $state('');
  const hit = (text: string): boolean => { const needle = q.trim().toLowerCase(); return !needle || text.toLowerCase().includes(needle); };
  /* What each row says, and extra words it should answer to. The filter reads both. */
  const HINT = {
    zoom: 'Change the size of the text without resizing the window.',
    zoomKeys: 'Ctrl +, Ctrl − and Ctrl 0 change the text size. Turn off to let the browser zoom the whole page instead.',
    underlines: 'Underline symbols, glossary terms and example references. Cards still open when this is off.',
    tips: 'Show a tip each day in the bottom-right corner.',
    cardOpen: 'Hover opens a card as you point at it. Click keeps it open until you click elsewhere; on the concept map, where a click selects, a double-click opens it.',
    anim: 'Turn off to pause every interactive figure.',
    voice: 'Add a Read aloud button to the rail and a Read section aloud command.',
    decay: 'Mastered concepts come due for review as they fade. Turn off to keep them fresh.',
    order: 'Mixed interleaves concepts. Grouped keeps each concept’s exercises together.',
    includeFresh: 'Let mastered concepts that aren’t due yet into new sessions.',
    mapProgress: 'Show mastery bars on concept map nodes. Each map can also hide them.',
    record: 'Every completed exercise and self-assessment, and the mastery built from them.',
    lockGrace: 'Seconds before a focus lock starts.',
    layout: 'Put tabs, groups and sidebars back to how they started.',
    backup: 'Export and import a backup file, and push and pull with a GitHub repo, from the Sync and Update sidebar.',
  } as const;
  const ROWS = {
    theme: 'Theme system light dark', figureFont: `Figure font typeface ${FONTS.map((f) => f.label).join(' ')}`, bodyFont: `Body font typeface text prose ${FONTS.map((f) => f.label).join(' ')}`, zoom: `Text size zoom larger smaller ${HINT.zoom}`, zoomKeys: `Zoom keys ${HINT.zoomKeys}`, cc: `Color coding colour hue ${Object.values(COLOUR_LABELS).join(' ')}`, underlines: `Underlines dotted ${HINT.underlines}`, tips: `Tips tip of the day ${HINT.tips}`,
    anim: `Play animations sim ${HINT.anim}`, voice: `Voice speech ${HINT.voice}`, cardOpen: `Cards open on hover click concept glossary symbol equation ${HINT.cardOpen}`,
    lockGrace: `Focus pomodoro lock grace ${HINT.lockGrace}`,
    masteryTarget: 'Mastery target correct answers exercises concept mastered', decay: `Freshness decay review half-life ${HINT.decay}`,
    startingHalfLife: 'Starting half-life first review interval days', maxHalfLife: 'Maximum half-life review interval days',
    order: `Exercise order ${HINT.order}`, includeFresh: `Include fresh concepts ${HINT.includeFresh}`,
    record: `Practice history clear forget answers ${HINT.record}`,
    mapProgress: `Progress on the concept map ${HINT.mapProgress}`,
    layout: `Layout panes tabs reset views ${HINT.layout}`,
    backup: `Backup export import restore data sync GitHub push pull update ${HINT.backup}`,
    storage: 'Storage space used quota persist retention browser clear data imported files Safari',
  } as const;
  const APPEARANCE = [ROWS.theme, ROWS.figureFont, ROWS.bodyFont, ROWS.zoom, ROWS.zoomKeys, ROWS.cc, ROWS.underlines, ROWS.tips], READING = [ROWS.cardOpen, ROWS.anim, ROWS.voice];
  const PRACTICE = [ROWS.masteryTarget, ROWS.decay, ROWS.startingHalfLife, ROWS.maxHalfLife, ROWS.order, ROWS.includeFresh, ROWS.mapProgress, ROWS.record];
  const openSync = (): void => { ui.settings = false; layoutStore.apply((x) => openSide(x, 'view:sync', 'left')); layoutStore.overlay = 'left'; };
  /* The toolbar's own filter: words, or with Record keys on, the chord pressed. */
  let kq = $state('');
  let byKeys = $state(false);
  let keyChord = $state<Chord | null>(null);
  const shortcutHit = (c: Command): boolean => {
    const chords = keys.chordsFor(c.id);
    if (byKeys) return !keyChord || chords.some((ch) => ch === keyChord || ch.startsWith(`${keyChord} `));
    const needle = kq.trim().toLowerCase();
    return !needle || `${c.group} ${c.label} ${chords.map(chordKeys).flat().join(' ')}`.toLowerCase().includes(needle);
  };
  const groups = $derived.by(() => {
    const m = new Map<string, Command[]>();
    commands.all().filter((c) => shortcutHit(c) && (hit(`${c.group} ${c.label} ${keys.chordsFor(c.id).map(chordKeys).flat().join(' ')}`) || hit('Keyboard shortcuts keys chords bindings'))).forEach((c) => { const g = m.get(c.group); if (g) g.push(c); else m.set(c.group, [c]); });
    return Array.from(m.entries());
  });
  const shortcutsShown = $derived(hit('Keyboard shortcuts keys chords bindings') || commands.all().some((c) => hit(`${c.group} ${c.label} ${keys.chordsFor(c.id).map(chordKeys).flat().join(' ')}`)));
  const toggleByKeys = () => { byKeys = !byKeys; keyChord = null; kq = ''; };
  const onKeyFilter = (e: KeyboardEvent) => {
    if (!byKeys) return;
    e.stopPropagation(); if (e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Escape') { byKeys = false; keyChord = null; return; }
    if (e.key === 'Backspace' && plain(e)) { keyChord = null; return; }
    const c = chordOf(e); if (c) keyChord = c;
  };
  $effect(() => { if (!ui.settings) { rec = null; q = ''; kq = ''; byKeys = false; keyChord = null; } });

  /* The numbers under Exercises commit on change or on a stepper click, clamped. */
  type NumKey = 'masteryTarget' | 'startingHalfLife' | 'maxHalfLife';
  type NumRow = { readonly key: NumKey; readonly words: string; readonly name: string; readonly hint: string; readonly min: number; readonly max: number; readonly step: number; readonly scale: number; readonly unit?: string; readonly restore: string };
  const NUMS: readonly NumRow[] = [
    { key: 'masteryTarget', words: ROWS.masteryTarget, name: 'Mastery target', hint: 'Correct answers needed to master a concept, capped at its exercise count.', min: 1, max: 12, step: 1, scale: 1, restore: 'Reset to 3' },
    { key: 'startingHalfLife', words: ROWS.startingHalfLife, name: 'Starting half-life', hint: 'Days until a newly mastered concept is first due for review.', min: 1, max: 365, step: 1, scale: 1, unit: 'days', restore: 'Reset to 3 days' },
    { key: 'maxHalfLife', words: ROWS.maxHalfLife, name: 'Maximum half-life', hint: 'The longest gap between reviews.', min: 1, max: 3650, step: 1, scale: 1, unit: 'days', restore: 'Reset to 240 days' },
  ];
  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
  const shown = (n: NumRow): number => Math.round(practice.settings[n.key] * n.scale);
  const commit = (n: NumRow, v: number): void => { if (Number.isFinite(v)) practice.setSetting(n.key, clamp(v, n.min, n.max) / n.scale); };
  const forget = () => { if (confirm('Clear your practice history? This deletes every completed exercise, self-assessment and mastery record, and can’t be undone.')) practice.wipe(); };
  const intervals = $derived.by(() => {
    const out: number[] = [], max = practice.settings.maxHalfLife;
    let value = practice.settings.startingHalfLife;
    while (value < max) { out.push(value); value *= 2; }
    out.push(max); return [...new Set(out)].join(' → ') + ' days';
  });

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

  /* The chords this window never sees, because the browser keeps them. */
  const browserName = $derived(BROWSER_NAMES[host.browser]);
  const held = $derived(commands.all().filter((c) => keys.chordsFor(c.id).some((ch) => kept(host.info, ch))).length);
  const keptTitle = $derived(`Reserved by ${browserName}`);
</script>

{#snippet back(on: boolean, title: string, fn: () => void)}
  {#if on}<button type="button" class="back" aria-label={title} onclick={(e) => { e.preventDefault(); fn(); }}>↺</button>{/if}
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
        <input class="find" type="search" placeholder="Search settings" aria-label="Search settings" bind:value={q} use:focus>
        <button type="button" class="x" aria-label="Close" onclick={() => (ui.settings = false)}>×</button>
      </header>

      <section hidden={!APPEARANCE.some(hit)}>
        <h3>Appearance</h3>
        <div class="row" hidden={!hit(ROWS.theme)}>
          <span class="name">Theme{@render back(settings.theme !== DEFAULTS.theme, 'Reset to system', () => settings.setTheme(DEFAULTS.theme))}</span>
          <div class="seg" role="radiogroup" aria-label="Theme">
            {#each THEMES as t (t)}
              <button type="button" class:on={settings.theme === t} id={t === 'dark' ? 'theme-toggle' : undefined} role="radio" aria-checked={settings.theme === t} onclick={() => settings.setTheme(t)}>{t}</button>
            {/each}
          </div>
        </div>
        {#snippet fontRow(name: string, key: 'figureFont' | 'bodyFont', value: FontId, fallback: FontId, set: (id: FontId) => void)}
          <div class="row" hidden={!hit(ROWS[key])}>
            <span class="name">{name}{@render back(value !== fallback, `Reset to ${FONTS.find((f) => f.id === fallback)?.label}`, () => set(fallback))}</span>
            <select class="font" aria-label={name} style:font-family={fontStack(value)} value={value} onchange={(e) => { const v = e.currentTarget.value; if (isFontId(v)) set(v); }}>
              {#each FONTS as f (f.id)}<option value={f.id} style:font-family={fontStack(f.id)}>{f.label}</option>{/each}
            </select>
          </div>
        {/snippet}
        {@render fontRow('Figure font', 'figureFont', settings.figureFont, DEFAULTS.figureFont, (id) => settings.setFigureFont(id))}
        {@render fontRow('Body font', 'bodyFont', settings.bodyFont, DEFAULTS.bodyFont, (id) => settings.setBodyFont(id))}
        <div class="row" hidden={!hit(ROWS.zoom)}>
          <span class="name">Text size{@render back(settings.zoom !== DEFAULTS.zoom, 'Reset to 100%', () => settings.resetZoom())}</span>
          <span class="hint">{HINT.zoom}</span>
          <div class="num">
            <button type="button" aria-label="Smaller text" onclick={() => settings.zoomOut()}>−</button>
            <span class="unit zoom">{zoomLabel(settings.zoom)}</span>
            <button type="button" aria-label="Larger text" onclick={() => settings.zoomIn()}>+</button>
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.zoomKeys)}><span class="name">Zoom keys{@render back(settings.zoomKeys !== DEFAULTS.zoomKeys, 'Reset to on', () => settings.setZoomKeys(DEFAULTS.zoomKeys))}</span><span class="hint">Ctrl +, Ctrl − and Ctrl 0 change the text size. Turn off to let {browserName} zoom the whole page instead.</span><input type="checkbox" id="zoom-keys-toggle" checked={settings.zoomKeys} onchange={(e) => settings.setZoomKeys(e.currentTarget.checked)}></label>
        <div class="row colours" role="group" aria-labelledby="cc-name" hidden={!hit(ROWS.cc)}>
          <span class="name" id="cc-name">Color coding</span>
          <div class="switches">
            {#each COLOUR_SWITCHES as k (k)}
              {@const parent = COLOUR_PARENT[k]}
              <label class="switch" class:sub={parent !== undefined} title={COLOUR_TIPS[k] ?? null}><span class="name">{COLOUR_LABELS[k]}{@render back(settings.colours[k] !== DEFAULTS.colours[k], 'Reset to on', () => settings.setColour(k, DEFAULTS.colours[k]))}</span><input type="checkbox" id="cc-{k}-toggle" disabled={k !== 'all' && (!settings.colours.all || (parent !== undefined && !settings.colours[parent]))} checked={settings.colours[k]} onchange={(e) => settings.setColour(k, e.currentTarget.checked)}></label>
            {/each}
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.underlines)}><span class="name">Underlines{@render back(settings.underlines !== DEFAULTS.underlines, 'Reset to on', () => settings.setUnderlines(DEFAULTS.underlines))}</span><span class="hint">{HINT.underlines}</span><input type="checkbox" id="underline-toggle" checked={settings.underlines} onchange={(e) => settings.setUnderlines(e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.tips)}><span class="name">Tips{@render back(settings.tips !== DEFAULTS.tips, 'Reset to on', () => settings.setTips(DEFAULTS.tips))}</span><span class="hint">{HINT.tips}</span><input type="checkbox" id="tips-toggle" checked={settings.tips} onchange={(e) => settings.setTips(e.currentTarget.checked)}></label>
      </section>

      <section hidden={!READING.some(hit)}>
        <h3>Reading</h3>
        <div class="row" hidden={!hit(ROWS.cardOpen)}>
          <span class="name">Cards open on{@render back(settings.cardOpen !== DEFAULTS.cardOpen, 'Reset to hover', () => settings.setCardOpen(DEFAULTS.cardOpen))}</span>
          <span class="hint">{HINT.cardOpen}</span>
          <div class="seg" role="radiogroup" aria-label="Cards open on">
            {#each ['hover', 'click'] as const as m (m)}
              <button type="button" class:on={settings.cardOpen === m} role="radio" aria-checked={settings.cardOpen === m} onclick={() => settings.setCardOpen(m)}>{m}</button>
            {/each}
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.anim)}><span class="name">Play animations{@render back(settings.animations !== DEFAULTS.animations, 'Reset to on', () => settings.setAnimations(DEFAULTS.animations))}</span><span class="hint">{HINT.anim}</span><input type="checkbox" id="anim-toggle" checked={settings.animations} onchange={(e) => settings.setAnimations(e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.voice)}><span class="name">Voice{@render back(settings.voice !== DEFAULTS.voice, 'Reset to off', () => settings.setVoice(DEFAULTS.voice))}</span><span class="hint">{reader.supported ? HINT.voice : 'This browser doesn’t support speech.'}</span><input type="checkbox" id="voice-toggle" disabled={!reader.supported} checked={settings.voice} onchange={(e) => settings.setVoice(e.currentTarget.checked)}></label>
      </section>

      <section hidden={!PRACTICE.some(hit)}>
        <h3>Exercises</h3>
        {#each NUMS as n (n.key)}{@render numRow(n)}{/each}
        <label class="row switch" hidden={!hit(ROWS.decay)}><span class="name">Freshness decay{@render back(practice.settings.freshnessDecay !== DEFAULT_SETTINGS.freshnessDecay, 'Reset to on', () => practice.setSetting('freshnessDecay', DEFAULT_SETTINGS.freshnessDecay))}</span><span class="hint">{HINT.decay}</span><input type="checkbox" checked={practice.settings.freshnessDecay} onchange={(e) => practice.setSetting('freshnessDecay', e.currentTarget.checked)}></label>
        <div class="row" hidden={!hit(`${ROWS.startingHalfLife} ${ROWS.maxHalfLife}`)}><span class="name">Review intervals</span><span class="hint">{intervals}</span><span></span></div>
        <div class="row" hidden={!hit(ROWS.order)}>
          <span class="name">Exercise order{@render back(practice.settings.order !== DEFAULT_SETTINGS.order, 'Reset to mixed', () => practice.setSetting('order', DEFAULT_SETTINGS.order))}</span>
          <span class="hint">{HINT.order}</span>
          <div class="seg" role="radiogroup" aria-label="Exercise order"><button type="button" class:on={practice.settings.order === 'mixed'} role="radio" aria-checked={practice.settings.order === 'mixed'} onclick={() => practice.setSetting('order', 'mixed')}>Mixed</button><button type="button" class:on={practice.settings.order === 'grouped'} role="radio" aria-checked={practice.settings.order === 'grouped'} onclick={() => practice.setSetting('order', 'grouped')}>Grouped</button></div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.includeFresh)}><span class="name">Include fresh concepts{@render back(practice.settings.includeFresh !== DEFAULT_SETTINGS.includeFresh, 'Reset to off', () => practice.setSetting('includeFresh', DEFAULT_SETTINGS.includeFresh))}</span><span class="hint">{HINT.includeFresh}</span><input type="checkbox" checked={practice.settings.includeFresh} onchange={(e) => practice.setSetting('includeFresh', e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.mapProgress)}><span class="name">Progress on the concept map{@render back(settings.mapProgress !== DEFAULTS.mapProgress, 'Reset to on', () => settings.setMapProgress(DEFAULTS.mapProgress))}</span><span class="hint">{HINT.mapProgress}</span><input type="checkbox" checked={settings.mapProgress} onchange={(e) => settings.setMapProgress(e.currentTarget.checked)}></label>
        <div class="row" hidden={!hit(ROWS.record)}>
          <span class="name">Practice history</span>
          <span class="hint">{HINT.record}{#if practice.attempts.length} {practice.attempts.length === 1 ? '1 exercise completed' : `${practice.attempts.length} exercises completed`}.{/if}</span>
          <button class="btn-sm" type="button" onclick={forget}>Clear history</button>
        </div>
      </section>

      <section hidden={!hit(ROWS.lockGrace)}>
        <h3>Focus / Pomodoro</h3>
        <div class="row num">
          <span class="name">Lock grace{@render back(settings.lockGrace !== DEFAULTS.lockGrace, 'Reset to 10 seconds', () => settings.setLockGrace(DEFAULTS.lockGrace))}</span>
          <span class="hint">{HINT.lockGrace}</span>
          <div class="num">
            <button type="button" aria-label="Less" onclick={() => settings.setLockGrace(settings.lockGrace - 1)}>−</button>
            <input type="number" min={LOCK_GRACE.min} max={LOCK_GRACE.max} step="1" inputmode="numeric" aria-label="Lock grace" value={settings.lockGrace} onchange={(e) => { settings.setLockGrace(e.currentTarget.valueAsNumber); e.currentTarget.value = String(settings.lockGrace); }}>
            <span class="unit">s</span>
            <button type="button" aria-label="More" onclick={() => settings.setLockGrace(settings.lockGrace + 1)}>+</button>
          </div>
        </div>
      </section>

      <Ai {hit} />

      <section hidden={!hit(ROWS.layout)}>
        <h3>Layout</h3>
        <div class="row"><span class="name">Tabs and groups</span><span class="hint">{HINT.layout}</span><button class="btn-sm" id="reset-layout" type="button" onclick={() => layoutStore.reset()}>Reset layout</button></div>
      </section>

      <Storage show={hit(ROWS.storage)} />

      <section hidden={!hit(ROWS.backup)}>
        <h3>Backup and sync</h3>
        <div class="row"><span class="name">Backup and GitHub sync</span><span class="hint">{HINT.backup}</span><button class="btn-sm" type="button" onclick={openSync}>Open Sync and Update</button></div>
      </section>


      <section hidden={!shortcutsShown}>
        <h3>Keyboard shortcuts</h3>
        <div class="toolbar">
          {#if byKeys}
            <input class="find keys-find" type="text" readonly placeholder="Press a shortcut" aria-label="Search by pressing a shortcut" value={keyChord ? chordKeys(keyChord).join(' ') : ''} onkeydown={onKeyFilter} use:focus>
          {:else}
            <input class="find" type="search" placeholder="Search shortcuts" aria-label="Search shortcuts" bind:value={kq}>
          {/if}
          <button type="button" class="btn-sm" class:on={byKeys} aria-pressed={byKeys} onclick={toggleByKeys}>Record keys</button>
          <button type="button" class="btn-sm" disabled={keys.isDefault} onclick={() => keys.restoreDefaults()}>Reset all</button>
        </div>
        {#if held}
          <p class="hint">{browserName} reserves {held === 1 ? '1 shortcut' : `${held} shortcuts`} in a browser tab, marked <span class="kept" aria-hidden="true">⊘</span>.{#if host.canInstall} <button class="link" type="button" onclick={() => host.install()}>Install as app</button> to use {held === 1 ? 'it' : 'them'}.{/if}</p>
        {/if}
        <table>
          <tbody>
            {#each groups as [group, cmds] (group)}
              <tr class="grp"><th colspan="2">{group}</th></tr>
              {#each cmds as c (c.id)}
                {@const on = rec?.id === c.id}
                <tr>
                  <td class="cmd">{c.label}{@render back(!keys.isDefaultFor(c.id), 'Reset to default', () => keys.restoreDefault(c.id))}</td>
                  <td class="keys">
                    <button type="button" class="chord-cell" class:on onclick={() => record(c.id)} aria-label="Shortcut for {c.label}" title="Click to change">
                      {#if on && rec?.pending}
                        <span class="conflict">{#each chordKeys(rec.pending.chord) as k}<kbd class="kbd">{k}</kbd>{/each} is used by <em>{rec.pending.other.label}</em>. Press Enter to reassign.</span>
                      {:else if on}
                        <span class="recording">Press a shortcut…</span>
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
        {#if !groups.length}<p class="hint">No matching shortcuts.</p>{/if}
      </section>

      <small>Settings are saved in this browser.</small>
    </div>
  </div>
{/if}

<style>
  .dialog :global([hidden]){display:none !important}
  .toolbar{display:flex;gap:6px;align-items:center}
  .toolbar .btn-sm{align-self:auto}
  .btn-sm.on{border-color:var(--accent);background:var(--soft)}
  .keys-find{caret-color:transparent}
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
  .colours{align-items:start}
  .switches{grid-column:2 / -1;display:flex;flex-direction:column;gap:6px}
  .switches label{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .switches .name{font-weight:400}
  .switches .sub{padding-left:16px}
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
  .row>.num .unit.zoom{min-width:4.5ch;text-align:center;border-left:1px solid var(--rule);color:var(--ink);font-variant-numeric:tabular-nums}
  .row>.num .unit{font-size:0.8rem;line-height:1.25;color:var(--muted);padding:4px 6px 4px 0;background:var(--panel)}
  .btn-sm{font:inherit;font-size:0.82rem;padding:5px 10px;border:1px solid var(--rule);background:var(--panel);color:var(--ink);border-radius:4px;cursor:pointer;align-self:flex-start}
  .btn-sm:hover:not(:disabled){background:var(--soft)}
  .btn-sm:disabled{opacity:.5;cursor:default}
  small{color:var(--muted);font-size:0.75rem}
  .font{font-size:0.9rem;padding:3px 6px;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink)}
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
  @media (max-width:600px){ .row{grid-template-columns:1fr auto} .hint{grid-column:1 / -1} .switches{grid-column:1 / -1} .seg{grid-column:auto} }
</style>
