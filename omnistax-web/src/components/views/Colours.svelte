<script lang="ts">
  /* The colour menu: one page where the reader chooses the colour of every
     quantity the book draws, and the order the quantities stand in. The book
     declares its types and says nothing about their hues; the app dresses them
     from its scheme, and everything here stands over that. The bar above says
     where the page stands, and that place is the tier being edited — a colour
     set at the book reaches every chapter and section that has not chosen its
     own, a colour set at a chapter reaches its sections the same way, and a
     colour set at a section stops there. Clearing a colour hands the quantity
     back to the tier above it. Every colour is a pair, one for the light ground
     and one for the dark; the reader edits the one they are looking at and the
     other follows unless they have chosen it too. The order is one list for the
     whole book, and it is what every palette lays its hues along, so dragging a
     quantity upwards recolours whatever still follows the scheme. The edits keep
     a timeline of their own, so taking a colour back never takes back a
     highlight. */
  import { getContext } from 'svelte';
  import type { Target } from '../../lib/sections/scope';
  import { registry } from '../../lib/sections/registry.svelte';
  import { settings } from '../../lib/settings/store.svelte';
  import { colours } from '../../lib/colours/store.svelte';
  import { placeKey, placeOf, symbolsOf, typesAt, isEmpty, isHex, normHex, type Hue, type Source, type TypeKey } from '../../lib/colours/model';
  import { PALETTES, SWATCHES, huesOf, type Palette } from '../../lib/colours/palettes';
  import { ICON } from '../../lib/icons';
  import { FIG } from '../../lib/fig/figlib';

  const scoped = getContext<() => Target>('scope');
  const target = $derived(scoped());
  const place = $derived(placeOf(target));
  const manifest = $derived(registry.manifest);
  const types = $derived(typesAt(manifest, colours.choices, place));
  /* The chapter the page stands in, which a badge names when a colour comes from there. */
  const chapter = $derived(place.level === 'book' ? '' : place.chapter);
  const labelOf = (k: TypeKey): string => manifest.types[k]?.label ?? k;

  const lead = $derived(
    place.level === 'book'
      ? `A colour set here is the colour of that quantity everywhere in the book, except where a chapter or a section has chosen its own. Until you choose otherwise, the book takes its colours from ${colours.scheme.palette.name}.`
      : place.level === 'chapter'
        ? `A colour set here is the colour of that quantity in every section of chapter ${chapter} that has not chosen its own.`
        : `A colour set here is the colour of that quantity in section ${place.section} only.`,
  );
  /* The reader edits the ground they are looking at; the other one is derived for them. */
  const themeNote = $derived(settings.dark ? 'You are choosing the dark colours.' : 'You are choosing the light colours.');
  const shown = (h: Hue | null): string | null => (h ? (settings.dark ? h.dark : h.light) : null);
  const spare = (h: Hue | null): string | null => (h ? (settings.dark ? h.light : h.dark) : null);
  const hueOf = (k: TypeKey) => colours.hueAt(k, place);
  /* What the reader set at this very place, which is what the clear button hands back. */
  const ownOf = (k: TypeKey): Hue | null => colours.own(k, place);
  /* Whether anything at all has been set at this place, read from the overrides themselves
     so that a type this level does not list still counts. */
  const setHere = $derived.by(() => {
    const o = colours.choices.overrides;
    const at = place.level === 'book' ? o.book : place.level === 'chapter' ? o.chapters[place.chapter] : o.sections[place.section];
    return Object.keys(at ?? {}).length > 0;
  });
  const nothingSet = $derived(isEmpty(colours.choices));

  /* Where the colour on a row came from, said the way the reader would say it. */
  const source = (from: Source): string => {
    switch (from.kind) {
      case 'section': return 'set here';
      case 'chapter': return `from chapter ${from.chapter}`;
      case 'book': return 'from the book';
      case 'scheme': return `from ${colours.scheme.palette.name}`;
      case 'none': return 'not a quantity of this book';
    }
  };

  /* One picker stands open at a time, under the row it belongs to. */
  let open = $state<TypeKey | null>(null);
  let draft = $state('');
  const openPicker = (k: TypeKey): void => {
    trouble = '';
    if (open === k) { open = null; return; }
    open = k;
    draft = shown(hueOf(k).hue) ?? '';
    colours.breakCoalescing();
  };
  const closePicker = (): void => { open = null; colours.breakCoalescing(); };
  /* A picker belongs to the place it was opened at; walking the bar to another tier closes it. */
  $effect(() => { placeKey(place); open = null; });
  /* Dragging the input is one step: every message of the drag joins the one before it. */
  const drag = (k: TypeKey, hex: string): void => colours.pick(place, k, hex, `${placeKey(place)}/${k}`);
  const settle = (): void => colours.breakCoalescing();
  const commitHex = (k: TypeKey): void => {
    if (!isHex(draft)) { draft = shown(hueOf(k).hue) ?? ''; return; }
    colours.breakCoalescing();
    colours.pick(place, k, normHex(draft));
    colours.breakCoalescing();
  };
  const sameHex = (a: string | null, b: string): boolean => a !== null && isHex(a) && normHex(a) === normHex(b);

  /* One line under the toolbar when a file could not be read, cleared as soon as
     the reader does anything that works. */
  let trouble = $state('');

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
    trouble = '';
    const below = over?.type === k ? over.below : false;
    const moved = carried;
    clearDrag();
    colours.move(moved, beforeOf(k, below));
  };
  /* The keyboard says the same thing one step at a time: up is before the row
     above, down is after the row below, which is before the one after that. */
  const step = (k: TypeKey, way: -1 | 1): void => {
    trouble = '';
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

  /* ---------- the file the colours are kept in ---------- */

  let picker = $state<HTMLInputElement | null>(null);
  const exportFile = (): void => {
    trouble = '';
    const url = URL.createObjectURL(new Blob([JSON.stringify(colours.exportFile(), null, 1)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `omnistax-colours-${manifest.id}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const loadFile = async (file: File): Promise<void> => {
    const raw = await file.text();
    const parsed = ((): unknown => { try { return JSON.parse(raw); } catch { return null; } })();
    const got = colours.load(parsed);
    trouble = got.ok ? '' : got.reason === 'other-book' ? 'That file holds the colours of another book.' : 'That file does not hold colours.';
  };
  const onFile = (e: Event): void => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';   /* so that the same file chosen twice is read twice */
    if (file) void loadFile(file);
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

  const tex = (node: HTMLElement, s: string) => { FIG.tex(node, s); return { update(n: string) { FIG.tex(node, n); } }; };
  /* Only the palettes that can dress this level, each already cut to the number
     of quantities here, so that the strip the reader sees is the very set the
     button would apply and a palette that cannot answer is simply not offered. */
  const shownPalettes = $derived(PALETTES.flatMap((p) => {
    const hues = huesOf(p, types.length);
    return hues ? [{ palette: p, hues }] : [];
  }));
  const use = (p: Palette): void => { trouble = ''; colours.usePalette(place, types, p); };
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="colours" tabindex="-1" bind:this={root}>
  <p class="lead">{lead}</p>
  {#if !settings.colorCoding}
    <p class="off">Colour coding is off; the colours you choose show when it is on.</p>
  {/if}

  <div class="bar">
    <button type="button" disabled={!colours.canUndo} title={colours.canUndo ? `Undo ${colours.undoLabel}` : 'There is nothing to take back yet.'} onclick={() => colours.undo()}>Undo</button>
    <button type="button" disabled={!colours.canRedo} title={colours.canRedo ? `Redo ${colours.redoLabel}` : 'There is nothing to do again yet.'} onclick={() => colours.redo()}>Redo</button>
    <button type="button" disabled={!setHere} title="Hand every colour set here back to the tier above." onclick={() => { trouble = ''; colours.clearPlace(place); }}>Clear this level</button>
    {#if place.level === 'book'}
      <button type="button" disabled={nothingSet} title="Take the book back to the scheme, with the quantities in the order the book declares them." onclick={() => { trouble = ''; colours.resetAll(); }}>Reset every colour</button>
    {/if}
    <button type="button" title="Save these colours to a file you can keep or pass on." onclick={exportFile}>Export…</button>
    <button type="button" title="Take the colours in a file you have saved." onclick={() => picker?.click()}>Load…</button>
    <input type="file" accept="application/json,.json" bind:this={picker} onchange={onFile} hidden />
    <span class="theme">{themeNote}</span>
  </div>
  {#if trouble}<p class="trouble">{trouble}</p>{/if}

  {#if types.length > 8}
    <!-- the whole set at a glance, in the order the rows below take -->
    <div class="strip" aria-hidden="true">
      {#each types as k (k)}
        {@const hex = shown(hueOf(k).hue)}
        <i style:background-color={hex ?? 'var(--soft2)'} title={labelOf(k)}></i>
      {/each}
    </div>
  {/if}

  <ul class="rows">
    {#each types as k (k)}
      {@const eff = hueOf(k)}
      {@const hex = shown(eff.hue)}
      {@const alt = spare(eff.hue)}
      {@const own = ownOf(k)}
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
          <button type="button" class="grip" aria-label={`Move ${name}; press the arrow keys to move it up or down`}
            title="Drag to move this quantity, or press the arrow keys" onkeydown={(e) => onGripKey(e, k)}>{@html ICON.grip}</button>
          <button type="button" class="swatch" class:none={hex === null} style:background-color={hex ?? 'transparent'} aria-expanded={open === k}
            title={hex ? `Choose another colour for ${name}` : `Choose a colour for ${name}`}
            onclick={() => openPicker(k)}></button>
          {#if alt}<i class="chip" style:background-color={alt} title={settings.dark ? 'The light colour of this quantity' : 'The dark colour of this quantity'}></i>{/if}
          <span class="name">{name}{#if dim}<small>{dim}</small>{/if}</span>
          <span class="syms">{#each symbolsOf(manifest, k) as macro (macro)}<span use:tex={macro}></span>{/each}</span>
          <span class="from" class:own={own !== null}>{source(eff.from)}</span>
          {#if own}
            <button type="button" class="clear" title="Back to the colour above" aria-label={`Back to the colour above for ${name}`} onclick={() => colours.clear(place, k)}>×</button>
          {/if}
        </div>
        {#if open === k}
          <div class="picker">
            <div class="grid">
              {#each SWATCHES as s (s.hex)}
                <button type="button" class="cell" class:on={sameHex(hex, s.hex)} style:background-color={s.hex} title={s.name} aria-label={s.name}
                  onclick={() => { colours.breakCoalescing(); colours.pick(place, k, s.hex); draft = s.hex; }}></button>
              {/each}
            </div>
            <div class="fine">
              <input type="color" value={hex ?? '#000000'} aria-label={`The ${settings.dark ? 'dark' : 'light'} colour of ${name}`}
                oninput={(e) => { draft = e.currentTarget.value; drag(k, e.currentTarget.value); }} onchange={settle} />
              <input type="text" class="hex" spellcheck="false" bind:value={draft} aria-label="The colour as a hex code"
                onkeydown={(e) => { if (e.key === 'Enter') { commitHex(k); e.preventDefault(); } }} onblur={() => commitHex(k)} />
              <span class="hint">Type a hex code, or drag the colour to hunt for one.</span>
            </div>
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <div class="eyebrow">Recommended palettes</div>
  {#if shownPalettes.length === 0}
    <p class="note">There is nothing to colour at this level.</p>
  {/if}
  <ul class="pals">
    {#each shownPalettes as { palette: p, hues } (p.id)}
      <li>
        <div class="phead"><span class="pname">{p.name}</span>
          <button type="button" title={`Give the quantities of this level the colours of ${p.name}.`} onclick={() => use(p)}>Use</button>
        </div>
        <div class="strip pstrip" aria-hidden="true">{#each hues as h, i (i)}<i style:background-color={h}></i>{/each}</div>
        <p class="note">{p.note}</p>
      </li>
    {/each}
  </ul>
</div>

<style>
  /* Focusable so that a click on the page's prose brings Ctrl+Z here; the ring would say nothing, so it is off. */
  .colours{font-size:0.82rem;outline:none}
  .lead{margin:0 0 8px;color:var(--muted);line-height:1.45}
  .off{margin:0 0 8px;color:var(--muted);font-size:0.78rem}
  .bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:10px}
  .bar button{font:inherit;font-size:0.78rem;padding:3px 8px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .bar button:hover:not(:disabled){background:var(--soft)}
  .bar button:disabled{opacity:.45;cursor:default}
  .bar button:focus-visible{outline:2px solid var(--accent)}
  .theme{color:var(--muted);font-size:0.76rem;margin-left:auto}
  .trouble{margin:-4px 0 10px;color:var(--ink);font-size:0.78rem}
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
  .name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name small{color:var(--muted);font-family:var(--mono);font-size:0.7rem;margin-left:5px}
  .syms{flex:none;display:flex;gap:6px;align-items:baseline}
  .syms :global(.katex){font-size:1em}
  .from{flex:none;color:var(--muted);font-size:0.72rem}
  .from.own{color:var(--ink)}
  .clear{flex:none;width:20px;height:20px;line-height:1;border:0;border-radius:4px;background:transparent;color:var(--muted);font:inherit;font-size:0.95rem;cursor:pointer}
  .clear:hover{background:var(--soft2);color:var(--ink)}
  .clear:focus-visible{outline:2px solid var(--accent)}
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
  .pals{list-style:none;padding:0;margin:0}
  .pals > li{padding:8px 0;border-bottom:1px solid var(--rule)}
  .phead{display:flex;align-items:center;gap:8px;margin-bottom:5px}
  .pname{flex:1;font-weight:600}
  .phead button{font:inherit;font-size:0.76rem;padding:2px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);cursor:pointer}
  .phead button:hover{background:var(--soft)}
  .phead button:focus-visible{outline:2px solid var(--accent)}
  .pstrip{margin-bottom:5px}
  .note{margin:0;color:var(--muted);font-size:0.76rem;line-height:1.4}
  :global(.view-pane) .colours{font-size:0.9rem}
</style>
