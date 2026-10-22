<script lang="ts">
  /* The settings dialog. The header filter narrows every section to the rows
     whose name, description or keywords mention what is typed. A setting off
     its default wears a ↺ that puts it back. The shortcuts carry a toolbar of
     their own: a filter by name or by pressed keys, and a reset. Clicking a
     shortcut records the next chord (Escape cancels, Backspace clears); a chord
     another command owns is shown as a conflict and taken only on Enter. */
  import { settings, THEMES, DEFAULTS, LOCK_GRACE, zoomLabel } from '../lib/settings/store.svelte';
  import { FONTS, fontStack, isFontId, type FontId } from '../lib/settings/fonts';
  import { commands } from '../lib/commands/registry.svelte';
  import { keys } from '../lib/commands/keys.svelte';
  import { chordOf, chordKeys, type Chord } from '../lib/commands/chord';
  import type { Command, CommandId } from '../lib/commands/command';
  import { ui } from '../lib/commands/ui.svelte';
  import { reader } from '../lib/voice.svelte';
  import { host, kept, BROWSER_NAMES } from '../lib/commands/host.svelte';
  import { practice } from '../lib/practice/store.svelte';
  import { DEFAULT_SETTINGS } from '../lib/practice/model';
  import Storage from './settings/Storage.svelte';
  import Ai, { aiWords } from './settings/Ai.svelte';
  import Fold from './settings/Fold.svelte';
  import { i18n } from '../lib/i18n/store.svelte';
  import type { MessageKey } from '../lib/i18n/index';
  import type { Theme } from '../lib/settings/store.svelte';

  type Recording = { readonly id: CommandId; readonly pending: { readonly chord: Chord; readonly other: Command } | null };
  let rec = $state<Recording | null>(null);
  let q = $state('');
  const hit = (text: string): boolean => { const needle = q.trim().toLowerCase(); return !needle || text.toLowerCase().includes(needle); };
  const t = i18n.t;
  /* A message cut at one of its placeholders, which the template fills with
     markup of its own; the placeholder is left in place by format. */
  const cut = (s: string, name: string): readonly [string, string] => {
    const at = s.indexOf(`{${name}}`);
    return at < 0 ? [s, ''] : [s.slice(0, at), s.slice(at + name.length + 2)];
  };
  const THEME_NAME: Readonly<Record<Theme, MessageKey>> = { system: 'settings.theme.system', light: 'settings.theme.light', dark: 'settings.theme.dark' };
  const CARD_OPEN_NAME = { hover: 'settings.cardOpen.hover', click: 'settings.cardOpen.click' } as const satisfies Readonly<Record<string, MessageKey>>;
  const resetTo = (value: string): string => t('settings.reset.to', { value });
  const onOff = (on: boolean): string => t(on ? 'commands.detail.on' : 'commands.detail.off');
  /* The chords this window never sees, because the browser keeps them. A
     browser the shell cannot name is named in the reader's language. */
  const browserName = $derived.by(() => { void i18n.locale; return BROWSER_NAMES[host.browser]; });
  /* What each row says, and extra words it should answer to. The filter reads
     both, in the reader's language, so the words follow a change of it. */
  const HINT = $derived({
    zoom: t('settings.zoom.hint'),
    zoomKeys: t('settings.zoomKeys.hint', { browser: browserName }),
    tips: t('settings.tips.hint'),
    cardOpen: t('settings.cardOpen.hint'),
    anim: t('settings.anim.hint'),
    voice: t('settings.voice.hint'),
    decay: t('settings.decay.hint'),
    lockGrace: t('settings.lockGrace.hint'),
  });
  const fontNames = FONTS.map((f) => f.label).join(' ');
  const ROWS = $derived({
    theme: `${t('settings.theme.name')} ${t('settings.theme.keywords')}`, figureFont: `${t('settings.figureFont.name')} ${t('settings.figureFont.keywords')} ${fontNames}`, bodyFont: `${t('settings.bodyFont.name')} ${t('settings.bodyFont.keywords')} ${fontNames}`,
    zoom: `${t('settings.zoom.name')} ${t('settings.zoom.keywords')} ${HINT.zoom}`, zoomKeys: `${t('settings.zoomKeys.name')} ${HINT.zoomKeys}`, tips: `${t('settings.tips.name')} ${t('settings.tips.keywords')} ${HINT.tips}`,
    anim: `${t('settings.anim.name')} ${t('settings.anim.keywords')} ${HINT.anim}`, voice: `${t('settings.voice.name')} ${t('settings.voice.keywords')} ${HINT.voice}`, cardOpen: `${t('settings.cardOpen.name')} ${t('settings.cardOpen.keywords')} ${HINT.cardOpen}`,
    lockGrace: `${t('settings.lockGrace.name')} ${t('settings.lockGrace.keywords')} ${HINT.lockGrace}`,
    masteryTarget: `${t('settings.masteryTarget.name')} ${t('settings.masteryTarget.keywords')}`, decay: `${t('settings.decay.name')} ${t('settings.decay.keywords')} ${HINT.decay}`,
    startingHalfLife: `${t('settings.startingHalfLife.name')} ${t('settings.startingHalfLife.keywords')}`, maxHalfLife: `${t('settings.maxHalfLife.name')} ${t('settings.maxHalfLife.keywords')}`,
    storage: `${t('settings.section.storage')} ${t('settings.storage.keywords')}`,
  });
  const APPEARANCE = $derived([ROWS.theme, ROWS.figureFont, ROWS.bodyFont, ROWS.zoom, ROWS.zoomKeys, ROWS.tips]), READING = $derived([ROWS.cardOpen, ROWS.anim, ROWS.voice]);
  const PRACTICE = $derived([ROWS.masteryTarget, ROWS.decay, ROWS.startingHalfLife, ROWS.maxHalfLife]);
  const SHORTCUT_WORDS = $derived(`${t('settings.section.shortcuts')} ${t('settings.shortcuts.keywords')}`);
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
    commands.all().filter((c) => shortcutHit(c) && (hit(`${c.group} ${c.label} ${keys.chordsFor(c.id).map(chordKeys).flat().join(' ')}`) || hit(SHORTCUT_WORDS))).forEach((c) => { const g = m.get(c.group); if (g) g.push(c); else m.set(c.group, [c]); });
    return Array.from(m.entries());
  });
  const shortcutsShown = $derived(hit(SHORTCUT_WORDS) || commands.all().some((c) => hit(`${c.group} ${c.label} ${keys.chordsFor(c.id).map(chordKeys).flat().join(' ')}`)));
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
  const days = (n: number): string => t('settings.days', { n });
  const MASTERY: NumRow = $derived({ key: 'masteryTarget', words: ROWS.masteryTarget, name: t('settings.masteryTarget.name'), hint: t('settings.masteryTarget.hint'), min: 1, max: 12, step: 1, scale: 1, restore: resetTo(String(DEFAULT_SETTINGS.masteryTarget)) });
  const HALF_LIVES: readonly NumRow[] = $derived([
    { key: 'startingHalfLife', words: ROWS.startingHalfLife, name: t('settings.startingHalfLife.name'), hint: t('settings.startingHalfLife.hint'), min: 1, max: 365, step: 1, scale: 1, unit: t('settings.unit.days'), restore: resetTo(days(DEFAULT_SETTINGS.startingHalfLife)) },
    { key: 'maxHalfLife', words: ROWS.maxHalfLife, name: t('settings.maxHalfLife.name'), hint: t('settings.maxHalfLife.hint'), min: 1, max: 3650, step: 1, scale: 1, unit: t('settings.unit.days'), restore: resetTo(days(DEFAULT_SETTINGS.maxHalfLife)) },
  ]);
  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
  const shown = (n: NumRow): number => Math.round(practice.settings[n.key] * n.scale);
  const commit = (n: NumRow, v: number): void => { if (Number.isFinite(v)) practice.setSetting(n.key, clamp(v, n.min, n.max) / n.scale); };
  const intervals = $derived.by(() => {
    const out: number[] = [], max = practice.settings.maxHalfLife;
    let value = practice.settings.startingHalfLife;
    while (value < max) { out.push(value); value *= 2; }
    out.push(max); return [...new Set(out)].join(' → ');
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

  const held = $derived(commands.all().filter((c) => keys.chordsFor(c.id).some((ch) => kept(host.info, ch))).length);
  const keptTitle = $derived(t('settings.shortcuts.reservedBy', { browser: browserName }));
  /* The line under the toolbar, cut where its mark and its install button stand. */
  const reserved = $derived(cut(t('settings.shortcuts.reserved', { browser: browserName, n: held }), 'mark'));
  const installLine = $derived(cut(t('settings.shortcuts.install', { n: held }), 'install'));
</script>

{#snippet back(on: boolean, title: string, fn: () => void)}
  {#if on}<button type="button" class="back" aria-label={title} onclick={(e) => { e.preventDefault(); fn(); }}>↺</button>{/if}
{/snippet}

{#snippet numRow(n: NumRow, sub = false)}
  {@const off = sub && !practice.settings.freshnessDecay}
  <div class="row num" class:sub class:off hidden={!hit(n.words)}>
    <span class="name">{n.name}{@render back(practice.settings[n.key] !== DEFAULT_SETTINGS[n.key], n.restore, () => practice.setSetting(n.key, DEFAULT_SETTINGS[n.key]))}</span>
    <span class="hint">{n.hint}</span>
    <div class="num">
      <button type="button" aria-label={t('settings.num.less')} disabled={off} onclick={() => commit(n, shown(n) - n.step)}>−</button>
      <input type="number" min={n.min} max={n.max} step={n.step} inputmode="numeric" aria-label={n.name} disabled={off} value={shown(n)} onchange={(e) => { commit(n, e.currentTarget.valueAsNumber); e.currentTarget.value = String(shown(n)); }}>
      {#if n.unit}<span class="unit">{n.unit}</span>{/if}
      <button type="button" aria-label={t('settings.num.more')} disabled={off} onclick={() => commit(n, shown(n) + n.step)}>+</button>
    </div>
  </div>
{/snippet}

{#snippet fontRow(name: string, key: 'figureFont' | 'bodyFont', value: FontId, fallback: FontId, set: (id: FontId) => void)}
  <div class="row" hidden={!hit(ROWS[key])}>
    <span class="name">{name}{@render back(value !== fallback, resetTo(FONTS.find((f) => f.id === fallback)?.label ?? fallback), () => set(fallback))}</span>
    <select class="font" aria-label={name} style:font-family={fontStack(value)} value={value} onchange={(e) => { const v = e.currentTarget.value; if (isFontId(v)) set(v); }}>
      {#each FONTS as f (f.id)}<option value={f.id} style:font-family={fontStack(f.id)}>{f.label}</option>{/each}
    </select>
  </div>
{/snippet}

{#if ui.settings}
  <div class="scrim">
    <div class="dialog" id="settings" onclick={(e) => e.stopPropagation()} onkeydown={onKey} role="dialog" tabindex="-1" lang={i18n.locale} aria-label={t('settings.title')}>
      <header>
        <div class="eyebrow">{t('settings.title')}</div>
        <input class="find" type="search" placeholder={t('settings.search.placeholder')} aria-label={t('settings.search.placeholder')} bind:value={q} use:focus>
        <button type="button" class="x" aria-label={t('shell.close')} onclick={() => (ui.settings = false)}>×</button>
      </header>

      <Fold id="Appearance" name={t('settings.section.appearance')} show={APPEARANCE.some(hit)} force={!!q}>
        <div class="row" hidden={!hit(ROWS.theme)}>
          <span class="name">{t('settings.theme.name')}{@render back(settings.theme !== DEFAULTS.theme, resetTo(t(THEME_NAME[DEFAULTS.theme])), () => settings.setTheme(DEFAULTS.theme))}</span>
          <div class="seg" role="radiogroup" aria-label={t('settings.theme.name')}>
            {#each THEMES as th (th)}
              <button type="button" class:on={settings.theme === th} id={th === 'dark' ? 'theme-toggle' : undefined} role="radio" aria-checked={settings.theme === th} onclick={() => settings.setTheme(th)}>{t(THEME_NAME[th])}</button>
            {/each}
          </div>
        </div>
        {@render fontRow(t('settings.figureFont.name'), 'figureFont', settings.figureFont, DEFAULTS.figureFont, (id) => settings.setFigureFont(id))}
        {@render fontRow(t('settings.bodyFont.name'), 'bodyFont', settings.bodyFont, DEFAULTS.bodyFont, (id) => settings.setBodyFont(id))}
        <div class="row" hidden={!hit(ROWS.zoom)}>
          <span class="name">{t('settings.zoom.name')}{@render back(settings.zoom !== DEFAULTS.zoom, resetTo(zoomLabel(DEFAULTS.zoom)), () => settings.resetZoom())}</span>
          <span class="hint">{HINT.zoom}</span>
          <div class="num">
            <button type="button" aria-label={t('commands.zoomOut')} onclick={() => settings.zoomOut()}>−</button>
            <span class="unit zoom">{zoomLabel(settings.zoom)}</span>
            <button type="button" aria-label={t('commands.zoomIn')} onclick={() => settings.zoomIn()}>+</button>
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.zoomKeys)}><span class="name">{t('settings.zoomKeys.name')}{@render back(settings.zoomKeys !== DEFAULTS.zoomKeys, resetTo(onOff(DEFAULTS.zoomKeys)), () => settings.setZoomKeys(DEFAULTS.zoomKeys))}</span><span class="hint">{HINT.zoomKeys}</span><input type="checkbox" id="zoom-keys-toggle" checked={settings.zoomKeys} onchange={(e) => settings.setZoomKeys(e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.tips)}><span class="name">{t('settings.tips.name')}{@render back(settings.tips !== DEFAULTS.tips, resetTo(onOff(DEFAULTS.tips)), () => settings.setTips(DEFAULTS.tips))}</span><span class="hint">{HINT.tips}</span><input type="checkbox" id="tips-toggle" checked={settings.tips} onchange={(e) => settings.setTips(e.currentTarget.checked)}></label>
      </Fold>

      <Fold id="Reading" name={t('settings.section.reading')} show={READING.some(hit)} force={!!q}>
        <div class="row" hidden={!hit(ROWS.cardOpen)}>
          <span class="name">{t('settings.cardOpen.name')}{@render back(settings.cardOpen !== DEFAULTS.cardOpen, resetTo(t(CARD_OPEN_NAME[DEFAULTS.cardOpen])), () => settings.setCardOpen(DEFAULTS.cardOpen))}</span>
          <span class="hint">{HINT.cardOpen}</span>
          <div class="seg" role="radiogroup" aria-label={t('settings.cardOpen.name')}>
            {#each ['hover', 'click'] as const as m (m)}
              <button type="button" class:on={settings.cardOpen === m} role="radio" aria-checked={settings.cardOpen === m} onclick={() => settings.setCardOpen(m)}>{t(CARD_OPEN_NAME[m])}</button>
            {/each}
          </div>
        </div>
        <label class="row switch" hidden={!hit(ROWS.anim)}><span class="name">{t('settings.anim.name')}{@render back(settings.animations !== DEFAULTS.animations, resetTo(onOff(DEFAULTS.animations)), () => settings.setAnimations(DEFAULTS.animations))}</span><span class="hint">{HINT.anim}</span><input type="checkbox" id="anim-toggle" checked={settings.animations} onchange={(e) => settings.setAnimations(e.currentTarget.checked)}></label>
        <label class="row switch" hidden={!hit(ROWS.voice)}><span class="name">{t('settings.voice.name')}{@render back(settings.voice !== DEFAULTS.voice, resetTo(onOff(DEFAULTS.voice)), () => settings.setVoice(DEFAULTS.voice))}</span><span class="hint">{reader.supported ? HINT.voice : t('settings.voice.unsupported')}</span><input type="checkbox" id="voice-toggle" disabled={!reader.supported} checked={settings.voice} onchange={(e) => settings.setVoice(e.currentTarget.checked)}></label>
      </Fold>

      <Fold id="Exercises" name={t('settings.section.exercises')} show={PRACTICE.some(hit)} force={!!q}>
        {@render numRow(MASTERY)}
        <label class="row switch" hidden={!hit(ROWS.decay)}><span class="name">{t('settings.decay.name')}{@render back(practice.settings.freshnessDecay !== DEFAULT_SETTINGS.freshnessDecay, resetTo(onOff(DEFAULT_SETTINGS.freshnessDecay)), () => practice.setSetting('freshnessDecay', DEFAULT_SETTINGS.freshnessDecay))}</span><span class="hint">{HINT.decay}</span><input type="checkbox" checked={practice.settings.freshnessDecay} onchange={(e) => practice.setSetting('freshnessDecay', e.currentTarget.checked)}></label>
        {#each HALF_LIVES as n (n.key)}{@render numRow(n, true)}{/each}
        <p class="hint sub" hidden={!practice.settings.freshnessDecay || !hit(`${ROWS.startingHalfLife} ${ROWS.maxHalfLife}`)}>{t('settings.intervals', { intervals })}</p>
      </Fold>

      <Fold id="Focus / Pomodoro" name={t('settings.section.focus')} show={hit(ROWS.lockGrace)} force={!!q}>
        <div class="row num">
          <span class="name">{t('settings.lockGrace.name')}{@render back(settings.lockGrace !== DEFAULTS.lockGrace, resetTo(t('settings.seconds', { n: DEFAULTS.lockGrace })), () => settings.setLockGrace(DEFAULTS.lockGrace))}</span>
          <span class="hint">{HINT.lockGrace}</span>
          <div class="num">
            <button type="button" aria-label={t('settings.num.less')} onclick={() => settings.setLockGrace(settings.lockGrace - 1)}>−</button>
            <input type="number" min={LOCK_GRACE.min} max={LOCK_GRACE.max} step="1" inputmode="numeric" aria-label={t('settings.lockGrace.name')} value={settings.lockGrace} onchange={(e) => { settings.setLockGrace(e.currentTarget.valueAsNumber); e.currentTarget.value = String(settings.lockGrace); }}>
            <span class="unit">s</span>
            <button type="button" aria-label={t('settings.num.more')} onclick={() => settings.setLockGrace(settings.lockGrace + 1)}>+</button>
          </div>
        </div>
      </Fold>

      <Fold id="AI" name={t('settings.section.ai')} show={hit(aiWords(t))} force={!!q}><Ai /></Fold>

      <Fold id="Storage" name={t('settings.section.storage')} show={hit(ROWS.storage)} force={!!q}><Storage /></Fold>

      <Fold id="Keyboard shortcuts" name={t('settings.section.shortcuts')} show={shortcutsShown} force={!!q}>
        <div class="toolbar">
          {#if byKeys}
            <input class="find keys-find" type="text" readonly placeholder={t('settings.shortcuts.press')} aria-label={t('settings.shortcuts.searchByKeys')} value={keyChord ? chordKeys(keyChord).join(' ') : ''} onkeydown={onKeyFilter} use:focus>
          {:else}
            <input class="find" type="search" placeholder={t('settings.shortcuts.search')} aria-label={t('settings.shortcuts.search')} bind:value={kq}>
          {/if}
          <button type="button" class="btn-sm" class:on={byKeys} aria-pressed={byKeys} onclick={toggleByKeys}>{t('settings.shortcuts.recordKeys')}</button>
          <button type="button" class="btn-sm" disabled={keys.isDefault} onclick={() => keys.restoreDefaults()}>{t('settings.shortcuts.resetAll')}</button>
        </div>
        {#if held}
          <p class="hint">{reserved[0]}<span class="kept" aria-hidden="true">⊘</span>{reserved[1]}{#if host.canInstall} {installLine[0]}<button class="link" type="button" onclick={() => host.install()}>{t('settings.shortcuts.installButton')}</button>{installLine[1]}{/if}</p>
        {/if}
        <table>
          <tbody>
            {#each groups as [group, cmds] (group)}
              <tr class="grp"><th colspan="2">{group}</th></tr>
              {#each cmds as c (c.id)}
                {@const on = rec?.id === c.id}
                <tr>
                  <td class="cmd">{c.label}{@render back(!keys.isDefaultFor(c.id), t('settings.reset.default'), () => keys.restoreDefault(c.id))}</td>
                  <td class="keys">
                    <button type="button" class="chord-cell" class:on onclick={() => record(c.id)} aria-label={t('settings.shortcuts.for', { command: c.label })} title={t('settings.shortcuts.change')}>
                      {#if on && rec?.pending}
                        {@const used = cut(t('settings.shortcuts.conflict'), 'keys')}
                        {@const by = cut(used[1], 'command')}
                        <span class="conflict">{used[0]}{#each chordKeys(rec.pending.chord) as k}<kbd class="kbd">{k}</kbd>{/each}{by[0]}<em>{rec.pending.other.label}</em>{by[1]}</span>
                      {:else if on}
                        <span class="recording">{t('settings.shortcuts.recording')}</span>
                      {:else}
                        {#each keys.chordsFor(c.id) as ch, i (ch)}{#if i}<span class="or">{t('settings.shortcuts.or')}</span>{/if}<span class="chord" class:held={kept(host.info, ch)}>{#each chordKeys(ch) as k}<kbd class="kbd">{k}</kbd>{/each}{#if kept(host.info, ch)}<span class="kept" title={keptTitle} aria-label={keptTitle} role="img">⊘</span>{/if}</span>{:else}<span class="none">—</span>{/each}
                      {/if}
                    </button>
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
        {#if !groups.length}<p class="hint">{t('settings.shortcuts.none')}</p>{/if}
      </Fold>

      <small>{t('settings.saved')}</small>
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
  .x{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;cursor:pointer;width:28px;height:28px;border-radius:6px;flex:none}
  .x:hover{background:var(--soft);color:var(--ink)}

  /* Every control in the dialog, the AI and Storage blocks included, is drawn
     from these rules: 0.82rem text, 4px 10px padding, a 6px radius. */
  .dialog :global(.btn-sm),.dialog :global(.seg),.dialog :global(.row>.num),.dialog :global(.font),.dialog :global(.find),.dialog :global(input[type="text"]),.dialog :global(input[type="url"]),.dialog :global(input[type="password"]),.dialog :global(input[type="search"]){font:inherit;font-size:0.82rem;line-height:1.25;border:1px solid var(--rule);border-radius:6px;background:var(--panel);color:var(--ink);box-sizing:border-box}
  .dialog :global(.btn-sm),.dialog :global(.font),.dialog :global(.find),.dialog :global(input[type="text"]),.dialog :global(input[type="url"]),.dialog :global(input[type="password"]),.dialog :global(input[type="search"]){padding:4px 10px}
  .dialog :global(.btn-sm){cursor:pointer;align-self:flex-start}
  .dialog :global(.btn-sm:hover:not(:disabled)){background:var(--soft)}
  .dialog :global(.btn-sm:disabled){opacity:.5;cursor:default}
  .dialog :global(:is(.btn-sm,.font,.find,input):focus-visible){outline:2px solid var(--accent);outline-offset:-1px}
  .find{flex:1;min-width:0}
  .seg,.row>.num{display:inline-flex;align-items:center;overflow:hidden;padding:0}
  .seg{grid-column:3}
  .seg button,.row>.num button{font:inherit;font-size:0.82rem;line-height:1.25;padding:4px 10px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button+button,.row>.num button:last-child,.row>.num input,.row>.num .unit.zoom{border-left:1px solid var(--rule)}
  .seg button:hover,.row>.num button:hover:not(:disabled){background:var(--soft);color:var(--ink)}
  .seg button.on{background:var(--soft);color:var(--ink);font-weight:600}
  .seg button:focus-visible,.row>.num button:focus-visible,.row>.num input:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .row>.num button:disabled{opacity:.5;cursor:default}
  .row>.num input{font:inherit;font-size:0.82rem;line-height:1.25;width:5.5ch;text-align:right;padding:4px 6px;border:0;border-left:1px solid var(--rule);background:var(--panel);color:var(--ink);appearance:textfield;-moz-appearance:textfield}
  .row>.num input::-webkit-outer-spin-button,.row>.num input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  .row>.num .unit{font-size:0.82rem;line-height:1.25;color:var(--muted);padding:4px 6px 4px 0;background:var(--panel)}
  .row>.num .unit.zoom{min-width:5ch;text-align:center;padding:4px 8px;color:var(--ink);font-variant-numeric:tabular-nums}

  .dialog :global(.row){display:grid;grid-template-columns:150px 1fr auto;align-items:center;gap:12px;padding:4px 0}
  .dialog :global(.name){font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .dialog :global(.hint){color:var(--muted);font-size:0.8rem;margin:0}
  .dialog :global(p.hint){margin:-4px 0 4px}
  .row.sub,p.hint.sub{margin-left:16px}
  .row.off{opacity:.6}
  .back{border:0;background:transparent;color:var(--muted);font:inherit;font-size:0.9rem;line-height:1;cursor:pointer;padding:1px 3px;border-radius:3px}
  .back:hover{background:var(--soft);color:var(--ink)}
  small{color:var(--muted);font-size:0.75rem}
  .dialog :global(.switch){cursor:pointer;user-select:none}
  .dialog :global(.switch>input){appearance:none;width:38px;height:22px;border-radius:11px;background:var(--soft2);position:relative;cursor:pointer;margin:0;transition:background .15s}
  .dialog :global(.switch>input::after){content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--panel);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:left .15s}
  .dialog :global(.switch>input:checked){background:var(--accent)}
  .dialog :global(.switch>input:checked::after){left:19px}
  .dialog :global(.switch>input:disabled){opacity:.4;cursor:default}
  .dialog :global(.switch>input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
  table{width:100%;border-collapse:collapse}
  tr.grp th{text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);padding:10px 0 3px}
  td{padding:2px 0;border-top:1px solid var(--rule);vertical-align:middle}
  td.cmd{width:50%}
  .chord-cell{font:inherit;width:100%;text-align:left;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--ink);padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:6px;min-height:28px;flex-wrap:wrap}
  .chord-cell:hover{background:var(--soft)}
  .chord-cell.on{border-color:var(--accent);background:var(--soft)}
  .chord{display:inline-flex;gap:2px;align-items:center}
  .chord.held .kbd{opacity:.55}
  .kept{color:var(--bad);font-size:0.85rem;line-height:1;margin-left:2px}
  .or,.none{color:var(--muted);font-size:0.78rem}
  .recording{color:var(--muted);font-style:italic}
  .conflict{color:var(--bad);font-size:0.8rem}
  .conflict em{font-style:normal;font-weight:600}
  @media (max-width:600px){ .dialog :global(.row){grid-template-columns:1fr auto} .dialog :global(.hint){grid-column:1 / -1} .seg{grid-column:auto} }
</style>
