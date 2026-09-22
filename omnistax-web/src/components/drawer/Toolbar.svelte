<script lang="ts">
  /* The bar across the top of a drawing tab: what the pointer does, what
     colour it does it in, and how wide. The tools are a row of buttons, each
     under the letter it answers to inside the tab, so a reader who has learnt
     P and E never comes back up here.

     The colours are the app's ink tokens and, while a book is open, the
     colours that book's quantities wear, so a force can be drawn in the force
     colour and the drawing reads like the page beside it. They are read off
     the root at the moment the bar is drawn, since the reader may have chosen
     them in the colour menu, and the scheme is the page's own. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { ICON } from '../../lib/icons';
  import { TOOL_KEY, type Tool } from '../../lib/drawer/tools';
  import { SHAPE_KINDS, type ShapeKind } from '../../lib/drawer/model';

  let {
    tool, color, size, fill, shape, canUndo, canRedo, canFit = false, scratch = false, busy = false,
    ontool, oncolor, onsize, onfill, onshape, onundo, onredo, onfit, onreset, onsave, onimage,
  }: {
    tool: Tool; color: string; size: number; fill: boolean; shape: ShapeKind;
    canUndo: boolean; canRedo: boolean;
    /* There is nothing to frame on a plane with nothing on it. */
    canFit?: boolean;
    /* A scratch page carries one button a drawing does not: the way to make it
       a drawing of the reader's own. */
    scratch?: boolean; busy?: boolean;
    ontool: (t: Tool) => void; oncolor: (c: string) => void; onsize: (n: number) => void;
    onfill: (on: boolean) => void; onshape: (s: ShapeKind) => void;
    onundo: () => void; onredo: () => void;
    /* The two ways back to the ink on an unbounded plane. */
    onfit: () => void; onreset: () => void;
    onsave?: () => void; onimage?: (file: File) => void;
  } = $props();

  /* The tools in the order the hand reaches for them: what lays ink down,
     what takes it away, what picks it up, what stands on the page, and the
     hand that moves the page itself. */
  const TOOLS: readonly { readonly id: Tool; readonly label: string; readonly glyph: string }[] = [
    { id: 'pen', label: 'Pen', glyph: ICON.exercises },
    { id: 'highlighter', label: 'Highlighter', glyph: ICON.highlighter },
    { id: 'eraser', label: 'Eraser', glyph: ERASER_GLYPH() },
    { id: 'lasso', label: 'Lasso', glyph: LASSO_GLYPH() },
    { id: 'text', label: 'Text box', glyph: ICON.note },
    { id: 'shape', label: 'Shapes', glyph: SHAPE_GLYPH() },
    { id: 'pan', label: 'Pan', glyph: HAND_GLYPH() },
  ];
  /* Four glyphs the rail has no use for, so they live here rather than in the
     shared set: a rubber, a loop, a square with a circle, and an open hand. */
  function ERASER_GLYPH(): string { return '<svg viewBox="0 0 24 24"><path d="M8 20h12"/><path d="M15.5 4.5 20 9l-8.5 8.5H7L3.5 14z"/><path d="M9 9l6 6"/></svg>'; }
  function LASSO_GLYPH(): string { return '<svg viewBox="0 0 24 24"><path d="M12 4c4.4 0 8 2.5 8 5.5S16.4 15 12 15 4 12.5 4 9.5 7.6 4 12 4Z" stroke-dasharray="3 2.5"/><path d="M8.5 14.6c-.6 1.6-.3 3 .9 3.9"/><circle cx="10" cy="19.6" r="1.6"/></svg>'; }
  function SHAPE_GLYPH(): string { return '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="10" height="10" rx="1.5"/><circle cx="15.5" cy="15.5" r="5"/></svg>'; }
  function HAND_GLYPH(): string { return '<svg viewBox="0 0 24 24"><path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M8 11V9a1.5 1.5 0 0 0-3 0v5.5c0 3.6 2.6 6 6 6h1.5c3 0 5.5-2.4 5.5-5.5V13"/></svg>'; }

  /* The ink the app itself offers, as tokens rather than as literals, so a
     drawing follows the theme the reader is in. */
  const INK: readonly { readonly name: string; readonly token: string }[] = [
    { name: 'Ink', token: '--ink' },
    { name: 'Accent', token: '--accent' },
    { name: 'Warm', token: '--warm' },
    { name: 'Correct', token: '--ok' },
    { name: 'Wrong', token: '--bad' },
    { name: 'Muted', token: '--muted' },
  ];

  /* A token read off the root as the colour it currently stands for: the
     canvas is painted with literal colours, since a stroke keeps the colour it
     was drawn in even after the reader changes the theme. */
  const resolved = (token: string): string => {
    if (typeof getComputedStyle === 'undefined') return '#111111';
    const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return v || '#111111';
  };

  /* The book's own quantities, in the order the book declares them, each in
     the colour that quantity wears on this page. A book with no types — or no
     book at all — leaves the row out. */
  const quantities = $derived.by(() =>
    Object.entries(registry.manifest.types ?? {}).map(([id, t]) => ({ id, label: (t as { label?: string }).label ?? id, token: `--c-${id}` })));

  const SIZES: readonly number[] = [1, 2, 4, 8, 16];

  let fileInput = $state<HTMLInputElement | null>(null);
  const pickImage = (): void => fileInput?.click();
  const took = (e: Event): void => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) onimage?.(file);
    input.value = '';
  };
</script>

<div class="toolbar" role="toolbar" aria-label="Drawing tools">
  <div class="group tools">
    {#each TOOLS as t (t.id)}
      <button type="button" class="tool" class:on={tool === t.id} title="{t.label} ({TOOL_KEY[t.id].toUpperCase()})"
        aria-pressed={tool === t.id} aria-label={t.label} onclick={() => ontool(t.id)}>{@html t.glyph}</button>
    {/each}
    {#if onimage}
      <button type="button" class="tool" title="Place an image" aria-label="Place an image" onclick={pickImage}>{@html ICON.plus}</button>
      <input class="hidden-file" type="file" accept="image/*" bind:this={fileInput} onchange={took} tabindex="-1" aria-hidden="true" />
    {/if}
  </div>

  {#if tool === 'shape'}
    <div class="group">
      {#each SHAPE_KINDS as s (s)}
        <button type="button" class="chip" class:on={shape === s} onclick={() => onshape(s)}>{s}</button>
      {/each}
      <label class="fill"><input type="checkbox" checked={fill} onchange={(e) => onfill((e.currentTarget as HTMLInputElement).checked)} /> Fill</label>
    </div>
  {/if}

  <div class="group swatches">
    {#each INK as c (c.token)}
      <button type="button" class="swatch" class:on={color === resolved(c.token)} title={c.name} aria-label={c.name}
        style:background="var({c.token})" onclick={() => oncolor(resolved(c.token))}></button>
    {/each}
    {#if quantities.length}
      <span class="rule"></span>
      {#each quantities as q (q.id)}
        <button type="button" class="swatch" class:on={color === resolved(q.token)} title={q.label} aria-label={q.label}
          style:background="var({q.token}, var(--muted))" onclick={() => oncolor(resolved(q.token))}></button>
      {/each}
    {/if}
  </div>

  <div class="group sizes">
    {#each SIZES as s (s)}
      <button type="button" class="size" class:on={size === s} title="{s} across" aria-label="Size {s}" onclick={() => onsize(s)}>
        <span class="dot" style:width="{Math.min(14, 3 + s)}px" style:height="{Math.min(14, 3 + s)}px"></span>
      </button>
    {/each}
  </div>

  <div class="group view">
    <button type="button" class="chip" disabled={!canFit} onclick={onfit} title="Frame everything on the canvas (0)">Fit</button>
    <button type="button" class="chip" onclick={onreset} title="Back to the origin at full size (Shift+0)">Reset view</button>
  </div>

  <div class="group right">
    <button type="button" class="chip" disabled={!canUndo} onclick={onundo} title="Undo (Ctrl+Z)">Undo</button>
    <button type="button" class="chip" disabled={!canRedo} onclick={onredo} title="Redo (Ctrl+Shift+Z)">Redo</button>
    {#if scratch && onsave}
      <button type="button" class="chip save" disabled={busy} onclick={onsave} title="Keep this work as a drawing under Your Files">Save as drawing</button>
    {/if}
  </div>
</div>

<style>
  .toolbar{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:6px 12px;border-bottom:1px solid var(--rule);background:var(--bg);font-family:var(--sans)}
  .group{display:flex;align-items:center;gap:3px}
  .group.right{margin-left:auto;gap:6px}
  .group.view{gap:6px}
  .tool{display:grid;place-items:center;width:28px;height:28px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer;padding:0}
  .tool:hover{background:var(--soft);color:var(--ink)}
  .tool.on{background:var(--soft2);color:var(--accent);border-color:var(--accent)}
  .tool:focus-visible,.chip:focus-visible,.swatch:focus-visible,.size:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .tool :global(svg){width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  .hidden-file{display:none}
  .swatch{width:18px;height:18px;border:1px solid var(--rule);border-radius:50%;cursor:pointer;padding:0}
  .swatch.on{box-shadow:0 0 0 2px var(--panel),0 0 0 3.5px var(--accent)}
  .rule{width:1px;height:16px;background:var(--rule);margin:0 4px}
  .size{display:grid;place-items:center;width:22px;height:22px;border:1px solid transparent;border-radius:5px;background:transparent;cursor:pointer;padding:0}
  .size.on{border-color:var(--accent);background:var(--soft2)}
  .size .dot{display:block;border-radius:50%;background:var(--ink)}
  .chip{font:inherit;font-size:0.74rem;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:3px 9px;cursor:pointer;text-transform:capitalize}
  .chip:hover:not(:disabled){background:var(--soft)}
  .chip:disabled{opacity:.45;cursor:default}
  .chip.on{border-color:var(--accent);color:var(--accent);background:var(--soft2)}
  .chip.save{border-color:var(--accent);color:var(--accent)}
  .fill{display:flex;align-items:center;gap:4px;font-size:0.74rem;color:var(--muted);cursor:pointer}
</style>
