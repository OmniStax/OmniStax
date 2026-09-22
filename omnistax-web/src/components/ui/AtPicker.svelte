<script lang="ts">
  /* The list of everything that can be pointed at, opened by `@` in a chat
     composer and by `[[` in the note editor. The model in `lib/picker/model.ts`
     says what is shown and where the cursor is; this draws it and hands the
     keys to it. Left, Right, Up, Down, Enter and Escape drive it, and a click
     does the same thing as Enter on the row it lands on.

     The component owns no rows of its own: whoever opens it hands them over,
     so the same picker serves a chat, a note, and whatever asks next. */
  import { atCursor, faceOf, into, move, open as openState, out, typed, CATEGORY_LABEL, type Face, type PickerCategory, type PickerRow, type PickerState } from '../../lib/picker/model';
  import { warm } from '../../lib/picker/sources';

  let { rows, query, onchoose, onclose, oncategory }: {
    rows: readonly PickerRow[];
    query: string;
    onchoose: (row: PickerRow) => void;
    onclose: () => void;
    oncategory?: (category: PickerCategory | null) => void;
  } = $props();

  let state = $state<PickerState>(openState(query));
  /* What is typed after the `@` belongs to the field, not to the list, so the
     query follows it while the reader is in a category too. */
  $effect(() => { state = typed(state, query); });
  const face = $derived<Face>(faceOf(state, rows));
  const count = $derived(face.rows.length);
  const cursor = $derived(atCursor(state, face));

  const enter = (category: PickerCategory): void => { state = into(state, category); warm(category); oncategory?.(category); };
  const leave = (): void => { state = out(state); oncategory?.(null); };

  const take = (row: PickerCategory | PickerRow | null): void => {
    if (row === null) return;
    if (typeof row === 'string') { enter(row); return; }
    onchoose(row);
  };

  /* The keys the list claims while it is open; everything else belongs to
     whatever opened it. The answer says whether the key was taken. */
  export function handleKey(e: KeyboardEvent): boolean {
    if (e.key === 'ArrowDown') { state = move(state, 1, count); return true; }
    if (e.key === 'ArrowUp') { state = move(state, -1, count); return true; }
    if (e.key === 'ArrowRight' && face.kind === 'categories') { take(cursor); return true; }
    if (e.key === 'ArrowLeft' && state.category !== null) { leave(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { take(cursor); return true; }
    if (e.key === 'Escape') { onclose(); return true; }
    return false;
  }

  const label = (row: PickerCategory | PickerRow): string => (typeof row === 'string' ? CATEGORY_LABEL[row] : row.label);
  const detail = (row: PickerCategory | PickerRow): string => (typeof row === 'string' ? 'category' : row.detail);
  const keyOf = (row: PickerCategory | PickerRow): string => (typeof row === 'string' ? row : `${row.category}:${row.key}`);
</script>

<div class="picker" role="listbox" aria-label="Insert something">
  {#if state.category !== null}
    <div class="crumb"><button type="button" onclick={leave} title="Back to the categories (Left)">‹ {CATEGORY_LABEL[state.category]}</button></div>
  {/if}
  {#if count === 0}
    <p class="empty">Nothing here yet.</p>
  {:else}
    <ul>
      {#each face.rows as row, i (keyOf(row))}
        <li>
          <button type="button" role="option" aria-selected={i === state.index} class:on={i === state.index}
            onmouseenter={() => (state = { ...state, index: i })} onclick={() => take(row)}>
            <span class="label">{label(row)}</span><span class="detail">{detail(row)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker{position:absolute;bottom:100%;left:0;right:0;margin-bottom:6px;max-height:16rem;overflow:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.22);font-family:var(--sans);z-index:30}
  ul{list-style:none;margin:0;padding:4px}
  .crumb{padding:6px 8px 2px;border-bottom:1px solid var(--rule)}
  .crumb button{font:inherit;font-size:0.76rem;color:var(--muted);background:transparent;border:0;cursor:pointer;padding:0}
  li button{display:block;width:100%;text-align:left;font:inherit;background:transparent;border:0;border-radius:5px;padding:5px 9px;cursor:pointer;color:var(--ink)}
  li button.on{background:var(--soft)}
  .label{display:block;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .detail{display:block;font-size:0.72rem;color:var(--muted)}
  .empty{margin:0;padding:10px 12px;color:var(--muted);font-size:0.82rem}
</style>
