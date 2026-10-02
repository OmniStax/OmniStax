<script lang="ts">
  /* A named rectangle beneath everything on the plane. Its inside lets every
     press through to the canvas, so drawing within a group is drawing, and the
     lasso there takes the group (the parent's to decide). Its border, its label
     and its corner are its own: the border and the label move the group, and
     the parent carries along whatever lies inside it; a double-click on the
     label renames it in place. */
  let {
    x, y, w, h, label, tint = null, selected = false, scale = 1,
    ongrab, onmove, onresize, onend, onlabel, onselect,
  }: {
    x: number; y: number; w: number; h: number; label: string;
    tint?: string | null; selected?: boolean; scale?: number;
    ongrab: () => void;
    onmove: (dx: number, dy: number) => void;
    onresize: (w: number, h: number) => void;
    onend: () => void;
    onlabel: (label: string) => void;
    onselect: () => void;
  } = $props();

  let naming = $state(false);

  const drag = (e: PointerEvent, f: (dx: number, dy: number) => void): void => {
    if (naming) return;
    e.preventDefault(); e.stopPropagation();
    onselect();
    ongrab();
    const grip = e.currentTarget as HTMLElement;
    const x0 = e.clientX, y0 = e.clientY, k = scale === 0 ? 1 : 1 / scale;
    grip.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent): void => f((m.clientX - x0) * k, (m.clientY - y0) * k);
    const up = (): void => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      onend();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  };
  const w0 = (): number => w, h0 = (): number => h;
  const onCorner = (e: PointerEvent): void => { const bw = w0(), bh = h0(); drag(e, (dx, dy) => onresize(Math.max(60, bw + dx), Math.max(40, bh + dy))); };

  const takeFocus = (node: HTMLInputElement) => { node.focus(); node.select(); };
  const done = (e: Event): void => { naming = false; onlabel((e.currentTarget as HTMLInputElement).value.trim()); };
</script>

<div class="group" class:selected class:tinted={tint !== null} style:--tint={tint}
  style:left="{x}px" style:top="{y}px" style:width="{w}px" style:height="{h}px">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="label" onpointerdown={(e) => drag(e, onmove)}
    ondblclick={(e) => { e.stopPropagation(); naming = true; }}>
    {#if naming}
      <input value={label} aria-label="Group name" use:takeFocus onblur={done}
        onpointerdown={(e) => e.stopPropagation()}
        onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur(); }} />
    {:else}
      {label || 'Group'}
    {/if}
  </div>
  {#each ['top', 'right', 'bottom', 'left'] as side (side)}
    <span class="edge {side}" role="presentation" style:--reach="{8 / (scale || 1)}px" onpointerdown={(e) => drag(e, onmove)}></span>
  {/each}
  <span class="corner" role="presentation" onpointerdown={onCorner}></span>
</div>

<style>
  .group{--tint:var(--muted);position:absolute;box-sizing:border-box;border:1.5px solid color-mix(in srgb,var(--tint) 55%,transparent);border-radius:10px;background:color-mix(in srgb,var(--tint) 6%,transparent);pointer-events:none}
  .group.tinted{border-color:var(--tint)}
  .group.selected{border-color:var(--accent);border-style:dashed}
  .label{position:absolute;left:10px;top:6px;pointer-events:auto;cursor:move;font-family:var(--sans);font-size:14px;font-weight:600;color:color-mix(in srgb,var(--tint) 80%,var(--ink));touch-action:none;user-select:none;white-space:nowrap}
  .label input{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--accent);border-radius:4px;padding:0 4px;width:14em}
  .edge{position:absolute;pointer-events:auto;cursor:move;touch-action:none}
  .edge.top,.edge.bottom{left:0;right:0;height:var(--reach)}
  .edge.left,.edge.right{top:0;bottom:0;width:var(--reach)}
  .edge.top{top:calc(var(--reach) / -2)} .edge.bottom{bottom:calc(var(--reach) / -2)}
  .edge.left{left:calc(var(--reach) / -2)} .edge.right{right:calc(var(--reach) / -2)}
  .corner{z-index:1;position:absolute;right:0;bottom:0;width:14px;height:14px;pointer-events:auto;cursor:nwse-resize;touch-action:none;opacity:.35;background:linear-gradient(135deg,transparent 50%,var(--tint) 50%);border-radius:0 0 9px 0}
  .group:hover .corner,.group.selected .corner{opacity:.8}
</style>
