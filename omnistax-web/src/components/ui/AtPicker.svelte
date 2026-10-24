<script lang="ts">
  /* The tree of everything that can be pointed at, opened by `@` in a chat
     composer and by `[[` in the note editor. The model in `lib/picker/model.ts`
     says what is shown and where the cursor is; this draws it and hands the
     keys to it. Up and Down walk the list; Right or Tab goes into the row under
     the cursor; Enter picks it, a book, a chapter, a section or a folder whole;
     Left or Backspace on an empty query comes back up; Escape closes. A click
     goes into a row that holds more and picks one that does not. The press is
     taken rather than the release, and refused its default, because letting it
     through would take the focus out of the field the picker was opened from;
     `field`, where given, is focused again in case it had lost it.

     The component owns no nodes of its own: whoever opens it hands the root
     over, so the same picker serves a chat, a note, and whatever asks next. */
  import { untrack } from 'svelte';
  import { atCursor, faceOf, into, nextIndex, open as openState, pickable, queryIn, trailOf, up, type Listed, type PickerNode, type PickerRow, type PickerState } from '../../lib/picker/model';
  import { linkInner } from '../../lib/notes/md/links';
  import { FigureMounts } from '../../lib/notes/md/figlive';
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { bookId, sectionId, sectionRef } from '../../lib/types/ids';

  let { root, query, onchoose, onclose, needsTarget = false, field = null, previews = false }: {
    root: readonly PickerNode[];
    query: string;
    onchoose: (row: PickerRow) => void;
    onclose: () => void;
    needsTarget?: boolean;
    field?: HTMLElement | null;
    /* Whether a row pointed at shows what it is, beside the list: a concept's card, a figure alive. */
    previews?: boolean;
  } = $props();

  /* The figure under the pointer, drawn live in a panel to the right of the list. */
  let hovered = $state<PickerRow | null>(null);
  const figure = $derived(previews && hovered?.target?.kind === 'figure' ? hovered.target : null);
  let panel = $state<HTMLElement | null>(null);
  const mounts = new FigureMounts(() => bookId(focus.book ?? ''));
  $effect(() => {
    const f = figure, el = panel;
    if (!f || !el) { mounts.releaseAll(); return; }
    const ref = sectionRef(bookId(f.book ?? focus.book ?? ''), sectionId(f.section));
    let gone = false;
    const fill = (): void => { if (!gone && el.isConnected) mounts.fill(el); };
    fill();
    void registry.load(ref).then(fill).catch(() => {});
    return () => { gone = true; mounts.releaseAll(); };
  });
  $effect(() => () => mounts.releaseAll());

  /* What is typed after the `@` belongs to the field, so it is read from the
     prop wherever it is wanted and never copied into this component's state.
     The cursor is kept beside the list it was counted in: when the level or the
     words change, the key changes, and the cursor is back at the top. */
  let where = $state<{ readonly path: PickerState['path']; readonly key: string; readonly index: number }>({ ...openState(), key: '' });
  const keyFor = (s: Pick<PickerState, 'path'>): string => `${s.path.map((p) => p.key).join('/')}\u0000${queryIn({ path: s.path, index: 0 }, query)}`;
  const key = $derived(keyFor(where));
  const here = $derived<PickerState>({ path: where.path, index: where.key === key ? where.index : 0 });
  const trail = $derived(trailOf(root, here.path.map((p) => p.key)));
  /* The list is gathered again only when the level or the words change: the
     cursor moving down the list is not a reason to walk the shelf once more. */
  let lastFace: { readonly path: PickerState['path']; readonly query: string; readonly face: readonly Listed[] } | null = null;
  const face = $derived.by((): readonly Listed[] => {
    const path = here.path, q = queryIn(here, query);
    if (lastFace && lastFace.path === path && lastFace.query === q) return lastFace.face;
    const next = faceOf(here, root, query);
    lastFace = { path, query: q, face: next };
    return next;
  });
  const count = $derived(face.length);
  const cursor = $derived(atCursor(here, face));
  const searching = $derived(queryIn(here, query).trim() !== '');

  /* What the level standing open needs is fetched as soon as it opens or is searched. */
  $effect(() => {
    const at = trail.at(-1);
    if (at) untrack(() => void at.load?.());
    else if (searching) untrack(() => root.forEach((n) => void n.load?.()));
  });

  const put = (index: number): void => { where = { ...where, key, index }; };
  const settle = (next: PickerState): void => { where = { path: next.path, key: keyFor(next), index: next.index }; };

  const descend = (l: Listed): void => { if (l.node.children) settle(into(here, l.path, query)); };
  const back = (depth?: number): void => settle(up(here, depth));
  const pick = (node: PickerNode): void => { if (pickable(node, needsTarget)) onchoose(node.row); };
  const take = (l: Listed | null, whole: boolean): void => {
    if (!l) return;
    if (whole && pickable(l.node, needsTarget)) { pick(l.node); return; }
    descend(l);
  };

  /* The keys the list claims while it is open; everything else belongs to
     whatever opened it. The answer says whether the key was taken. */
  export function handleKey(e: KeyboardEvent): boolean {
    const empty = queryIn(here, query) === '';
    if (e.key === 'ArrowDown') { put(nextIndex(here.index, 1, count)); return true; }
    if (e.key === 'ArrowUp') { put(nextIndex(here.index, -1, count)); return true; }
    if (e.key === 'ArrowRight' && cursor?.node.children) { descend(cursor); return true; }
    if (e.key === 'Tab') { if (cursor?.node.children) descend(cursor); else take(cursor, true); return true; }
    if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && empty && here.path.length > 0) { back(); return true; }
    if (e.key === 'Enter') { take(cursor, true); return true; }
    if (e.key === 'Escape') { onclose(); return true; }
    return false;
  }

  /* A tap elsewhere on a tablet finishes what was begun rather than dropping
     it: the level walked into, whole, or else the row a search stands on. */
  export function complete(): void {
    const container = trail.findLast((n) => pickable(n, needsTarget));
    const chosen = container ?? (searching && cursor && pickable(cursor.node, needsTarget) ? cursor.node : null);
    if (chosen) pick(chosen); else onclose();
  }

  const press = (e: MouseEvent, f: () => void): void => { e.preventDefault(); field?.focus({ preventScroll: true }); f(); };

  /* The pointer takes the cursor only when it moves: a row slid under a still
     pointer by the list scrolling or changing does not. */
  let pointer = { x: NaN, y: NaN };
  const hover = (e: MouseEvent, i: number): void => {
    hovered = face[i]?.node.row ?? null;
    if (e.screenX === pointer.x && e.screenY === pointer.y) return;
    pointer = { x: e.screenX, y: e.screenY };
    put(i);
  };
  /* The attributes a concept's row wears so the hover card opens on it, at its right. */
  const cardAttrs = (row: PickerRow | undefined): Record<string, string> =>
    previews && row?.target?.kind === 'concept' ? { 'data-book': row.target.book ?? focus.book ?? '', 'data-concept': row.target.id, 'data-card-side': 'right' } : {};

  let box = $state<HTMLElement | null>(null);
  $effect(() => {
    const index = here.index; void face;
    const row = box?.querySelector<HTMLElement>('li.on');
    if (!box || !row) return;
    if (index === 0) { box.scrollTop = 0; return; }
    const outer = box.getBoundingClientRect(), inner = row.getBoundingClientRect();
    if (inner.top < outer.top) box.scrollTop -= outer.top - inner.top;
    else if (inner.bottom > outer.bottom) box.scrollTop += inner.bottom - outer.bottom;
  });
</script>

<div class="at">
{#if figure}
  <!-- the figure itself, booted from its section, in a panel beside the list -->
  <div class="preview" data-still bind:this={panel} onpointerdown={(e) => e.preventDefault()}>
    {#key linkInner(figure)}<div class="fig-embed" data-embed={linkInner(figure)}></div>{/key}
  </div>
{/if}
<div class="picker" role="listbox" aria-label="Insert something" bind:this={box} onmouseleave={() => (hovered = null)}>
  {#if trail.length}
    <nav class="crumb">
      <button type="button" onmousedown={(e) => press(e, () => back(0))}>@</button>
      {#each trail as n, i (n.key)}
        <span class="sep">›</span>
        {#if i < trail.length - 1}<button type="button" onmousedown={(e) => press(e, () => back(i + 1))}>{n.label}</button>
        {:else}<span class="here">{n.label}</span>{/if}
      {/each}
    </nav>
  {/if}
  {#if count === 0}
    <p class="empty">Nothing here yet.</p>
  {:else}
    <ul>
      {#each face as l, i (l.path.join('/'))}
        <li class:on={i === here.index}>
          <button type="button" role="option" aria-selected={i === here.index} class="row" onmousemove={(e) => hover(e, i)} {...cardAttrs(l.node.row)}
            onmousedown={(e) => press(e, () => (l.node.children ? descend(l) : pick(l.node)))}>
            <span class="label">{l.node.label}</span>{#if l.where}<span class="detail">{l.where}</span>{/if}
          </button>
          {#if l.node.children}<span class="more" aria-hidden="true">›</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
</div>

<style>
  /* the list hugs its words, up to the field's width; the preview stands at its right, rising from its foot */
  .at{position:absolute;bottom:100%;left:0;right:0;margin-bottom:6px;z-index:20;pointer-events:none}
  .at > *{pointer-events:auto}
  .preview{position:absolute;left:min(100%, 26rem);bottom:0;margin-left:8px;width:min(380px,40vw);max-height:70vh;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.22)}
  .preview :global(.fig-embed){margin:0;max-width:none;width:100%}
  /* the preview is a still of the figure as it ends: no head, controls, readouts, transport or caption text */
  .preview :global(.sim-head),.preview :global(.controls),.preview :global(.readout),.preview :global(.transport),.preview :global(.fig-original),.preview :global(.dv-bar),.preview :global(figcaption),.preview :global(.fig-head),.preview :global(.caption){display:none}
  .picker{position:relative;width:max-content;min-width:min(100%,22rem);max-width:min(100%,26rem);max-height:16rem;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.22);font-family:var(--sans);z-index:30}
  ul{list-style:none;margin:0;padding:4px}
  .crumb{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;padding:6px 8px 4px;border-bottom:1px solid var(--rule);font-size:0.76rem;color:var(--muted)}
  .crumb button{font:inherit;color:var(--muted);background:transparent;border:0;cursor:pointer;padding:0}
  .crumb button:hover{color:var(--ink)}
  .crumb .here{color:var(--ink);font-weight:600}
  .sep{color:var(--muted)}
  li{display:flex;align-items:center;gap:4px;border-radius:5px;padding-right:6px}
  li.on{background:var(--soft)}
  .row{flex:1;min-width:0;display:block;text-align:left;font:inherit;background:transparent;border:0;padding:5px 9px;cursor:pointer;color:var(--ink)}
  .more{color:var(--muted);font-size:0.9rem}
  .label{display:block;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .detail{display:block;font-size:0.72rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .empty{margin:0;padding:10px 12px;color:var(--muted);font-size:0.82rem}
</style>
