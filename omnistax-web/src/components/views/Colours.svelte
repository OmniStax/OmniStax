<script lang="ts">
  /* A book's theme: what it highlights, the colour of every quantity it draws
     and the order they stand in, the palette laid over them, and the palette its
     referents are dealt from. The book declares its types and says nothing about
     their hues; the app dresses them from its scheme, and everything here stands
     over that, for the whole book. Every colour is a pair, one for the light
     ground and one for the dark; the reader edits the one they are looking at and
     the other follows unless they have chosen it too. The order is what every
     palette lays its hues along, so dragging a quantity upwards recolours whatever
     still follows the scheme. The edits keep a timeline of their own, so taking a
     colour back never takes back a highlight. */
  import { getContext } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { registry } from '../../lib/sections/registry.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { colours } from '../../lib/colours/store.svelte';
  import { symbolsOf, isEmpty, isHex, normHex, type Hue, type Source, type TypeKey } from '../../lib/colours/model';
  import { SWATCHES, palettesFor, paletteName, swatchName, type Palette, type PaletteId } from '../../lib/colours/palettes';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { VISIONS, type Vision } from '../../lib/colours/oklab';
  import type { DealtMode, RefMode } from '../../lib/colours/referents';
  import { ICON } from '../../lib/icons';
  import { HIGHLIGHT_KEYS, HIGHLIGHT_LABELS, HIGHLIGHT_PARENT, heldOffBy, type HighlightKey } from '../../lib/settings/highlights';
  import { highlights } from '../../lib/settings/highlights.svelte';
  import SymbolList from './SymbolList.svelte';

  const scoped = getContext<() => Target>('scope');
  const book = $derived(scoped()?.book ?? null);
  $effect.pre(() => { if (book) colours.select(book); });
  const manifest = $derived(book ? registry.manifest(book) : null);
  const types = $derived(colours.order);
  /* The switches' names and reasons are read in the current language; reading
     i18n.locale here makes the row say them anew when the reader changes it. */
  const hlLabel = (k: HighlightKey): string => { void i18n.locale; return HIGHLIGHT_LABELS[k]; };
  const heldOf = (v: Parameters<typeof heldOffBy>[0], k: HighlightKey): string | null => { void i18n.locale; return heldOffBy(v, k); };
  const labelOf = (k: TypeKey): string => manifest?.types[k]?.label ?? k;
  const hlBook = $derived(book ? highlights.bookOf(book) : null);
  const hlValues = $derived(book ? highlights.valuesOf(book) : null);

  /* The reader edits the ground they are looking at; the other one is derived for them. */
  const themeNote = $derived(settings.dark ? i18n.t('views.colours.darkColors') : i18n.t('views.colours.lightColors'));
  const shown = (h: Hue | null): string | null => (h ? (settings.dark ? h.dark : h.light) : null);
  const spare = (h: Hue | null): string | null => (h ? (settings.dark ? h.light : h.dark) : null);
  const nothingSet = $derived(isEmpty(colours.choices));
  const source = (from: Source): string => (from.kind === 'own' ? i18n.t('views.colours.yours') : from.kind === 'scheme' ? i18n.t('views.colours.default') : '');

  /* One picker stands open at a time, under the row it belongs to. */
  let open = $state<TypeKey | null>(null);
  let draft = $state('');
  const openPicker = (k: TypeKey): void => {
    if (open === k) { open = null; return; }
    open = k;
    draft = shown(colours.hueOf(k).hue) ?? '';
    colours.breakCoalescing();
  };
  const closePicker = (): void => { open = null; colours.breakCoalescing(); };
  /* Dragging the input is one step: every message of the drag joins the one before it. */
  const drag = (k: TypeKey, hex: string): void => colours.pick(k, hex, k);
  const settle = (): void => colours.breakCoalescing();
  const commitHex = (k: TypeKey): void => {
    if (!isHex(draft)) { draft = shown(colours.hueOf(k).hue) ?? ''; return; }
    colours.breakCoalescing();
    colours.pick(k, normHex(draft));
    colours.breakCoalescing();
  };
  const sameHex = (a: string | null, b: string): boolean => a !== null && isHex(a) && normHex(a) === normHex(b);

  /* ---------- rearranging the quantities ---------- */

  /* The row being carried and the row it is over, with which half of that row
     the pointer is in, which is the line the reader sees. The HTML drag events
     are used directly here: the actions in layout/drag.svelte.ts carry a layout
     item's key, and a quantity is not one of those. */
  let carried = $state<TypeKey | null>(null);
  let over = $state<{ readonly type: TypeKey; readonly below: boolean } | null>(null);
  const clearDrag = (): void => { carried = null; over = null; };
  /* The quantity a dropped row lands before: the row it is over, or the one
     after it when the pointer is in its lower half, and the end of the list when
     there is nothing after it. */
  const beforeOf = (onto: TypeKey, below: boolean): TypeKey | null => {
    if (!below) return onto;
    const next = types[types.indexOf(onto) + 1];
    return next ?? null;
  };
  const onDragOver = (e: DragEvent, k: TypeKey): void => {
    if (carried === null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    over = { type: k, below: e.clientY > box.top + box.height / 2 };
  };
  const onDrop = (e: DragEvent, k: TypeKey): void => {
    if (carried === null) return;
    e.preventDefault();
    const below = over?.type === k ? over.below : false;
    const moved = carried;
    clearDrag();
    colours.move(moved, beforeOf(k, below));
  };
  /* The keyboard says the same thing one step at a time: up is before the row
     above, down is after the row below, which is before the one after that. */
  const step = (k: TypeKey, way: -1 | 1): void => {
    const i = types.indexOf(k);
    if (i < 0) return;
    if (way === -1 && i > 0) colours.move(k, types[i - 1]);
    if (way === 1 && i < types.length - 1) colours.move(k, types[i + 2] ?? null);
  };
  const onGripKey = (e: KeyboardEvent, k: TypeKey): void => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    step(k, e.key === 'ArrowUp' ? -1 : 1);
    e.preventDefault();
  };

  /* Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y belong to the colour timeline while the reader
     is on this page, and preventing the default is what keeps the shell's own out of
     it. Where the reader is typing, the field keeps the browser's history. */
  const typing = (t: EventTarget | null): boolean => {
    const el = t as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true);
  };
  const onkeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && open !== null) { closePicker(); e.preventDefault(); return; }
    if (!(e.ctrlKey || e.metaKey) || e.altKey || typing(e.target)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { colours.undo(); e.preventDefault(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { colours.redo(); e.preventDefault(); }
  };
  /* The page listens on its own root rather than through an attribute, since the
     page is a page and not a control: nothing here is clicked by pressing a key.
     The root takes focus (tabindex -1) so that a click on its prose lands the
     keyboard here rather than on the body, where the shell's own undo would hear it. */
  let root = $state<HTMLElement | null>(null);
  $effect(() => {
    const el = root; if (!el) return;
    el.addEventListener('keydown', onkeydown);
    return () => el.removeEventListener('keydown', onkeydown);
  });

  /* The palettes are worked out for the vision the reader states here, and the page
     takes that vision on only when one of them is applied. */
  const VISION_NAMES = $derived<Readonly<Record<Vision, string>>>({ normal: i18n.t('views.colours.vision.normal'), protan: i18n.t('views.colours.vision.protan'), deutan: i18n.t('views.colours.vision.deutan'), tritan: i18n.t('views.colours.vision.tritan') });
  const vision = $derived(colours.statedVision);
  const visionPending = $derived(vision !== colours.vision);
  /* Only the palettes that can dress every quantity of the book, each already cut
     to that many, so that the strip the reader sees is the very set the buttons
     deal and a palette that cannot answer is simply not offered. */
  const shownPalettes = $derived(palettesFor(types.length, vision));
  const referentOffers = $derived(colours.referentPalettes(vision));
  const cats = $derived(colours.categories);
  const refNow = $derived(colours.referents);
  /* A button is in use when the book wears that palette in that mode, worked out for the vision shown. */
  const catsInUse = (p: PaletteId, mode: RefMode): boolean => !visionPending && cats.palette === p && cats.mode === mode;
  const refsInUse = (p: PaletteId, mode: RefMode): boolean => !visionPending && refNow.palette === p && refNow.mode === mode;
  const apply = (p: Palette, mode: RefMode): void => { colours.applyCategories(p, mode, vision); };
  const TIPS = $derived({
    categoryOrder: i18n.t('views.colours.tip.categoryOrder'),
    categorySmart: i18n.t('views.colours.tip.categorySmart'),
    referentOrder: i18n.t('views.colours.tip.referentOrder'),
    referentSmart: i18n.t('views.colours.tip.referentSmart'),
  });
  const MODE_NAMES = $derived<Readonly<Record<DealtMode, string>>>({ order: i18n.t('views.colours.mode.order'), smart: i18n.t('views.colours.mode.smart'), farthest: i18n.t('views.colours.mode.farthest') });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="colours" tabindex="-1" bind:this={root} data-book={book}>
  {#if manifest && hlBook && hlValues}
    <h2 class="title">{manifest.title || manifest.id}</h2>

    <div class="eyebrow">{i18n.t('views.colours.colorCode')}</div>
    <ul class="rows hl">
      {#each HIGHLIGHT_KEYS as k (k)}
        {@const held = heldOf(hlValues, k)}
        {@const value = hlValues[k]}
        {@const def = hlBook.defaults[k]}
        <li class="row" class:sub={HIGHLIGHT_PARENT[k] !== undefined} class:held={held !== null} title={held}>
          <span class="name">{hlLabel(k)}</span><button type="button" class="toggle hl-{k}" class:on={value} aria-pressed={value} disabled={held !== null} aria-label={hlLabel(k)} onclick={() => highlights.set(k, !value, book)}></button>
          {#if value !== def}
            <button type="button" class="clear" title={i18n.t(def ? 'views.colours.backToDefaultOn' : 'views.colours.backToDefaultOff')} aria-label={i18n.t(def ? 'views.colours.resetToDefaultOn' : 'views.colours.resetToDefaultOff', { name: hlLabel(k) })} onclick={() => highlights.reset(k, book)}>×</button>
          {:else}<span class="clear-room" aria-hidden="true"></span>{/if}
        </li>
      {/each}
    </ul>

    <div class="eyebrow">{i18n.t('views.colours.quantities')}</div>
    <p class="note explain">{i18n.t('views.colours.quantitiesExplain')}</p>
    {#if !hlValues.concepts}
      <p class="note explain">{i18n.t('views.colours.conceptsOff')}</p>
    {/if}
    <div class="bar">
      <button type="button" disabled={!colours.canUndo} title={colours.canUndo ? colours.undoLabel : ''} onclick={() => colours.undo()}>{i18n.t('views.colours.undo')}</button>
      <button type="button" disabled={!colours.canRedo} title={colours.canRedo ? colours.redoLabel : ''} onclick={() => colours.redo()}>{i18n.t('views.colours.redo')}</button>
      <button type="button" disabled={nothingSet} onclick={() => colours.resetAll()}>{i18n.t('views.colours.resetAll')}</button>
      <span class="theme">{themeNote}</span>
    </div>
    {#if types.length > 8}
      <!-- the whole set at a glance, in the order the rows below take -->
      <div class="strip" aria-hidden="true">
        {#each types as k (k)}
          {@const hex = shown(colours.hueOf(k).hue)}
          <i style:background-color={hex ?? 'var(--soft2)'} title={labelOf(k)}></i>
        {/each}
      </div>
    {/if}

    <ul class="rows">
      {#each types as k (k)}
        {@const eff = colours.hueOf(k)}
        {@const hex = shown(eff.hue)}
        {@const alt = spare(eff.hue)}
        {@const own = colours.own(k)}
        {@const name = labelOf(k)}
        {@const dim = manifest.types[k]?.dimension ?? ''}
        <li class:open={open === k}>
          <div class="row" class:carried={carried === k} class:over-up={over?.type === k && !over.below} class:over-down={over?.type === k && over.below}
            draggable="true"
            ondragstart={(e) => { carried = k; e.dataTransfer?.setData('text/plain', k); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
            ondragend={clearDrag}
            ondragover={(e) => onDragOver(e, k)}
            ondragleave={() => { if (over?.type === k) over = null; }}
            ondrop={(e) => onDrop(e, k)}>
            <button type="button" class="grip" aria-label={i18n.t('views.colours.move', { name })}
              title={i18n.t('views.colours.reorder')} onkeydown={(e) => onGripKey(e, k)}>{@html ICON.grip}</button>
            <button type="button" class="swatch" class:none={hex === null} style:background-color={hex ?? 'transparent'} aria-expanded={open === k}
              aria-label={i18n.t('views.colours.colorOf', { name })}
              onclick={() => openPicker(k)}></button>
            {#if alt}<i class="chip" style:background-color={alt} title={settings.dark ? i18n.t('views.colours.lightColor') : i18n.t('views.colours.darkColor')}></i>{/if}
            <span class="name">{name}{#if dim}<small>{dim}</small>{/if}</span>
            <SymbolList macros={symbolsOf(manifest, k)} label={name} />
            <span class="from" class:own={own !== null}>{source(eff.from)}</span>
            {#if own}
              <button type="button" class="clear" title={i18n.t('views.colours.backToBook')} aria-label={i18n.t('views.colours.backToBookFor', { name })} onclick={() => colours.clear(k)}>×</button>
            {:else}<span class="clear-room" aria-hidden="true"></span>{/if}
          </div>
          {#if open === k}
            <div class="picker">
              <div class="grid">
                {#each SWATCHES as s (s.hex)}
                  <button type="button" class="cell" class:on={sameHex(hex, s.hex)} style:background-color={s.hex} aria-label={swatchName(s, i18n.t)}
                    onclick={() => { colours.breakCoalescing(); colours.pick(k, s.hex); draft = s.hex; }}></button>
                {/each}
              </div>
              <div class="fine">
                <input type="color" value={hex ?? '#000000'} aria-label={i18n.t(settings.dark ? 'views.colours.darkColorOf' : 'views.colours.lightColorOf', { name })}
                  oninput={(e) => { draft = e.currentTarget.value; drag(k, e.currentTarget.value); }} onchange={settle} />
                <input type="text" class="hex" spellcheck="false" bind:value={draft} aria-label={i18n.t('views.colours.hex')}
                  onkeydown={(e) => { if (e.key === 'Enter') { commitHex(k); e.preventDefault(); } }} onblur={() => commitHex(k)} />
                <span class="hint">{i18n.t('views.colours.hexHint')}</span>
              </div>
            </div>
          {/if}
        </li>
      {/each}
    </ul>

    <div class="eyebrow">{i18n.t('views.colours.palettes')}</div>
    <div class="vision">
      <span class="vlabel">{i18n.t('views.colours.vision')}</span>
      <div class="seg" role="radiogroup" aria-label={i18n.t('views.colours.vision')}>
        {#each VISIONS as v (v)}
          <button type="button" class:on={vision === v} role="radio" aria-checked={vision === v} onclick={() => colours.stateVision(v)}>{VISION_NAMES[v]}</button>
        {/each}
      </div>
    </div>
    {#if visionPending}
      <p class="note explain">{i18n.t('views.colours.visionPending', { vision: VISION_NAMES[vision].toLowerCase() })}</p>
    {/if}
    {#if shownPalettes.length === 0}
      <p class="note">{i18n.t('views.colours.nothing')}</p>
    {/if}
    <ul class="pals">
      {#each shownPalettes as { palette: p, hues } (p.id)}
        <li>
          <div class="phead"><span class="pname">{paletteName(p, i18n.t)}</span>
            {#each ['order', 'smart'] as const as mode (mode)}
              {@const now = catsInUse(p.id, mode)}
              <button type="button" class:on={now} disabled={now} title={now ? i18n.t('views.colours.inUse') : mode === 'order' ? TIPS.categoryOrder : TIPS.categorySmart} onclick={() => apply(p, mode)}>{now ? i18n.t('views.colours.inUse') : mode === 'order' ? i18n.t('views.colours.applyOrder') : i18n.t('views.colours.applySmart')}</button>
            {/each}
          </div>
          <div class="strip pstrip" aria-hidden="true">{#each hues as h, i (i)}<i style:background-color={settings.dark ? h.dark : h.light}></i>{/each}</div>
        </li>
      {/each}
    </ul>

    <div class="eyebrow refs">{i18n.t('views.colours.referentPalettes')}</div>
    <p class="note explain">{i18n.t('views.colours.referentsExplain')}</p>
    <ul class="pals">
      {#each referentOffers as { palette: p, hues } (p.id)}
        <li>
          <div class="phead"><span class="pname">{paletteName(p, i18n.t)}</span>
            {#each ['order', 'smart'] as const as mode (mode)}
              {@const now = refsInUse(p.id, mode)}
              <button type="button" class:on={now} disabled={now} title={now ? i18n.t('views.colours.inUseMode', { mode: MODE_NAMES[mode] }) : mode === 'order' ? TIPS.referentOrder : TIPS.referentSmart} onclick={() => colours.applyReferents(p.id, mode, vision)}>{now ? i18n.t('views.colours.inUse') : mode === 'order' ? i18n.t('views.colours.applyOrder') : i18n.t('views.colours.applySmart')}</button>
            {/each}
          </div>
          <div class="refgrid" aria-hidden="true">{#each hues as h, i (i)}<i style:background-color={settings.dark ? h.dark : h.light}></i>{/each}</div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Focusable so that a click on the page's prose brings Ctrl+Z here; the ring would say nothing, so it is off. */
  .colours{font-size:0.82rem;outline:none}
  .title{margin:0 0 12px;font-size:1rem;font-weight:600}
  .bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:10px}
  .bar button{font:inherit;font-size:0.78rem;padding:3px 8px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .bar button:hover:not(:disabled){background:var(--soft)}
  .bar button:disabled{opacity:.45;cursor:default}
  .bar button:focus-visible{outline:2px solid var(--accent)}
  .theme{color:var(--muted);font-size:0.76rem;margin-left:auto}
  /* the whole set read at a glance: cells that touch, so the run of hues is one band */
  .strip{display:flex;height:14px;border-radius:4px;overflow:hidden;margin-bottom:10px}
  .strip i{flex:1;display:block}
  .rows{list-style:none;padding:0;margin:0 0 14px}
  .rows > li{border-bottom:1px solid var(--rule)}
  .row{display:flex;align-items:center;gap:8px;padding:6px 0}
  /* the row being carried, and the line that says where it would land */
  .row.carried{opacity:.45}
  .row.over-up{box-shadow:inset 0 2px 0 var(--accent)}
  .row.over-down{box-shadow:inset 0 -2px 0 var(--accent)}
  .grip{flex:none;width:18px;height:22px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:grab;display:flex;align-items:center;justify-content:center}
  .grip:hover{color:var(--ink);background:var(--soft2)}
  .grip:focus-visible{outline:2px solid var(--accent)}
  .grip :global(svg){width:16px;height:16px;fill:currentColor;stroke:none}
  .swatch{width:22px;height:22px;flex:none;border:1px solid var(--rule);border-radius:5px;padding:0;cursor:pointer}
  .swatch:hover{border-color:var(--accent)}
  .swatch:focus-visible{outline:2px solid var(--accent)}
  /* no colour here: a plain hatched square, so an empty slot never reads as black */
  .swatch.none{background-image:repeating-linear-gradient(45deg,var(--soft2) 0 4px,transparent 4px 8px)}
  .chip{width:8px;height:16px;flex:none;border-radius:2px;margin-left:-4px}
  /* the name takes twice the room the symbols do, and both from a basis of zero, so
     that neither column is sized by what happens to be in it */
  .name{flex:2 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name small{color:var(--muted);font-family:var(--mono);font-size:0.7rem;margin-left:5px}
  .from{flex:none;color:var(--muted);font-size:0.72rem}
  .from.own{color:var(--ink)}
  .clear{flex:none;width:20px;height:20px;line-height:1;border:0;border-radius:4px;background:transparent;color:var(--muted);font:inherit;font-size:0.95rem;cursor:pointer}
  .clear:hover{background:var(--soft2);color:var(--ink)}
  .clear:focus-visible{outline:2px solid var(--accent)}
  .clear-room{flex:none;width:20px}
  .picker{padding:2px 0 10px;display:grid;gap:8px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(20px,1fr));gap:4px}
  .cell{height:20px;border:1px solid var(--rule);border-radius:4px;padding:0;cursor:pointer}
  .cell.on{outline:2px solid var(--ink);outline-offset:1px}
  .cell:focus-visible{outline:2px solid var(--accent)}
  .fine{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .fine input[type="color"]{width:34px;height:24px;padding:0;border:1px solid var(--rule);border-radius:4px;background:var(--panel);cursor:pointer}
  .hex{width:8.5em;font-family:var(--mono);font-size:0.76rem;padding:3px 6px;border:1px solid var(--rule);border-radius:4px;background:var(--panel);color:var(--ink)}
  .hex:focus-visible{outline:2px solid var(--accent)}
  .hint{color:var(--muted);font-size:0.72rem}
  .eyebrow{color:var(--muted);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
  /* the vision as a row of choices, one of them on */
  .vision{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}
  .vlabel{color:var(--muted);font-size:0.78rem}
  .seg{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
  .seg button{font:inherit;font-size:0.76rem;padding:3px 9px;border:0;border-left:1px solid var(--rule);background:var(--panel);color:var(--muted);cursor:pointer}
  .seg button:first-child{border-left:0}
  .seg button:hover{color:var(--ink)}
  .seg button.on{background:var(--soft2);color:var(--ink)}
  .seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
  .pals{list-style:none;padding:0;margin:0}
  .pals > li{padding:8px 0;border-bottom:1px solid var(--rule)}
  .phead{display:flex;align-items:center;gap:8px;margin-bottom:5px}
  .pname{flex:1;font-weight:600}
  .phead button{font:inherit;font-size:0.76rem;padding:2px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .phead button:hover:not(:disabled){background:var(--soft)}
  .phead button:focus-visible{outline:2px solid var(--accent)}
  /* the palette the book wears: greyed, since there is nothing to apply */
  .phead button.on{border-color:var(--accent);color:var(--muted);cursor:default}
  .pstrip{margin-bottom:5px}
  .refs{margin-top:16px}
  .refgrid{display:grid;grid-template-columns:repeat(18,1fr);gap:2px;margin-bottom:5px}
  .refgrid i{display:block;height:12px;border-radius:2px}
  .note{margin:0;color:var(--muted);font-size:0.76rem;line-height:1.4}
  .explain{margin-bottom:8px}
  /* the book's own switches: a name and its box, the reset beside it, and room kept for it */
  .hl{margin-bottom:14px}
  .hl .row{padding:4px 0}
  .hl .row.sub{padding-left:16px}
  .hl .row.held{opacity:.55}
  .hl .row{display:flex;align-items:center;gap:8px}
  .hl .toggle{padding:0 6px}
  .hl .toggle:disabled{cursor:default}
  :global(.view-pane) .colours{font-size:0.9rem}
</style>
