<script lang="ts">
  /* The reader's highlights and notes: the scoped section first, the rest of
     the book folded below. Each note shows its colour, its quote as a link back
     into the text, and an annotation that saves as it is typed. */
  import { getContext, tick } from 'svelte';
  import { notes, HL_COLORS, type Note } from '../../lib/notes/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { registry } from '../../lib/sections/registry.svelte';
  import { sectionId, type SectionId } from '../../lib/types/ids';
  const scoped = getContext<() => SectionId>('scope');
  const sec = $derived(scoped());
  const all = $derived(notes.list);
  const mine = $derived(all.filter((n) => n.section === sec));
  const others = $derived([...new Set(all.map((n) => n.section))].filter((s) => s !== sec).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  let expandAll = $state(false);
  const titleOf = (s: string) => registry.entry(sectionId(s))?.title ?? '';
  const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const plural = (n: number) => `${n} ${n === 1 ? 'note' : 'notes'}`;
  /* the bar asks for an annotation to take focus */
  $effect(() => { const id = notes.editing; if (!id) return; tick().then(() => { const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-note="${id}"]`); if (ta) { ta.focus(); notes.editing = null; } }); });
</script>

{#snippet card(n: Note)}
  <div class="note" data-id={n.id}>
    <div class="head">
      <span class="dots">{#each HL_COLORS as c (c)}<button type="button" class="dot {c}" class:on={n.color === c} title="Colour {c}" aria-label="Colour {c}" onclick={() => notes.setColor(n.id, c)}></button>{/each}</span>
      <span class="when">{n.doc === 'exercises' ? 'exercises · ' : ''}{when(n.updated)}</span>
      <button type="button" class="x" title="Remove this highlight" aria-label="Remove this highlight" onclick={() => notes.remove(n.id)}>×</button>
    </div>
    <button type="button" class="quote hl-{n.color}" title="Show it in the text" onclick={() => goNote(n)}>{n.anchor.quote}</button>
    <textarea data-note={n.id} rows="2" placeholder="Add a note…" value={n.text} oninput={(e) => notes.setText(n.id, (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
  </div>
{/snippet}

<div class="eyebrow">{sec} · {titleOf(sec)} · {plural(mine.length)}</div>
{#if mine.length}
  {#each mine as n (n.id)}{@render card(n)}{/each}
{:else}
  <div class="blank">Select some text in the section to highlight it or to add a note.</div>
{/if}
{#if others.length}
  <div class="all">
    <span class="eyebrow">Elsewhere in this book · {plural(all.length - mine.length)}</span>
    <button type="button" class="link" onclick={() => (expandAll = !expandAll)}>{expandAll ? 'Collapse all' : 'Expand all'}</button>
  </div>
  {#each others as s (s)}
    <details class="other" open={expandAll}>
      <summary>{s} · {titleOf(s)} · {all.filter((n) => n.section === s).length}</summary>
      {#each all.filter((n) => n.section === s) as n (n.id)}{@render card(n)}{/each}
    </details>
  {/each}
{/if}

<style>
  .blank{color:var(--muted);font-size:0.82rem;padding:6px 0 10px}
  .note{border:1px solid var(--rule);border-radius:6px;background:var(--panel);padding:8px 10px;margin:0 0 8px}
  .head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .dots{display:inline-flex;gap:5px}
  .dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0}
  .dot.yellow{background:var(--hl-yellow)} .dot.green{background:var(--hl-green)} .dot.blue{background:var(--hl-blue)} .dot.pink{background:var(--hl-pink)}
  .dot.on{box-shadow:0 0 0 2px var(--panel),0 0 0 3px var(--ink)}
  .when{flex:1;font-size:0.72rem;color:var(--muted);text-align:right}
  .x{width:20px;height:20px;border:0;border-radius:4px;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;line-height:1;padding:0}
  .x:hover{background:var(--soft2);color:var(--ink)}
  .quote{display:block;width:100%;text-align:left;font-family:var(--serif);font-size:0.9rem;line-height:1.35;color:var(--ink);border:0;border-radius:3px;padding:2px 4px;cursor:pointer;background:var(--hl-yellow)}
  .quote.hl-green{background:var(--hl-green)} .quote.hl-blue{background:var(--hl-blue)} .quote.hl-pink{background:var(--hl-pink)}
  .quote:hover{filter:brightness(.96)}
  textarea{display:block;width:100%;margin-top:6px;font:inherit;font-size:0.84rem;line-height:1.4;color:var(--ink);background:var(--bg);border:1px solid var(--rule);border-radius:4px;padding:5px 7px;resize:vertical;box-sizing:border-box}
  textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
  .all{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:8px;border-top:1px solid var(--rule)}
  .all .eyebrow{margin:0}
  .link{font:inherit;font-size:0.74rem;color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline dotted}
  .link:hover{color:var(--ink)}
  :global(.view-pane) .note{font-size:1rem}
</style>
