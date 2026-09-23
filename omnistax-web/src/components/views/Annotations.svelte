<script lang="ts">
  /* The reader's highlights for the place this view stands at, with whatever
     lies outside it folded away below. Each one shows its colour, its quote as
     a link back into the text, and the annotation beneath it, which saves as it
     is typed.

     A card is dragged onto a note to quote the highlight there: the drag leaves
     the card's surface and its quote, and the colours, the box being typed in
     and the × are left to the press, so nothing the card does is lost to it. */
  import { getContext, tick } from 'svelte';
  import { notes, HL_COLORS, type Note } from '../../lib/notes/store.svelte';
  import { history } from '../../lib/history/store.svelte';
  import { goNote } from '../../lib/notes/go';
  import { registry } from '../../lib/sections/registry.svelte';
  import { focus, assumedBook } from '../../lib/sections/focus.svelte';
  import { targetLabel, type Target } from '../../lib/sections/scope';
  import { countOf, groupBySection, label, outsideLabel, type ChapterGroup, type SectionGroup } from '../../lib/sections/grouping';
  import { dragout } from '../../lib/notes/md/dragout';
  import { files } from '../../lib/files/store.svelte';
  import { fileMarks } from '../../lib/files/marks.svelte';
  import { goMark } from '../../lib/files/resolver';
  import type { FileMark } from '../../lib/files/marks';
  const scoped = getContext<() => Target>('scope');
  const target = $derived(scoped());
  const grouped = $derived(groupBySection(notes.list, (n) => n.section, target, registry.manifest(assumedBook())));
  const inside = $derived(countOf(grouped.inside));
  const openChapter = $derived(registry.chapterOf(focus.section)?.id ?? '');
  const when = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const plural = (n: number) => `${n} ${n === 1 ? 'annotation' : 'annotations'}`;
  /* what to say where a place has nothing marked in it yet */
  const blank = $derived(
    target.level === 'section' ? 'Select some text in the section to highlight it or to annotate it.'
      : target.level === 'chapter' ? 'Nothing annotated in this chapter yet.'
      : 'Nothing annotated in this book yet.',
  );
  /* What the reader has written on their own files. It stands below the book's
     own annotations and outside its scope, since a file is no section: the
     scope bar says nothing about it, and every file with a mark on it is
     listed under its own heading, its marks in page order. */
  const fileGroups = $derived(
    files.list
      .map((f) => ({ file: f, marks: fileMarks.forFile(f.id) }))
      .filter((g) => g.marks.length),
  );
  const fileCount = $derived(fileGroups.reduce((n, g) => n + g.marks.length, 0));
  const plainWords = (body: string) => body.replace(/\s+/g, ' ').trim();

  /* the bar asks for an annotation to take focus */
  $effect(() => { const id = notes.editing; if (!id) return; tick().then(() => { const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-note="${id}"]`); if (ta) { ta.focus(); notes.editing = null; } }); });
  /* A mark on a file asks the same way, through its own store. */
  $effect(() => { const id = fileMarks.editing; if (!id) return; tick().then(() => { const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-note="${id}"]`); if (ta) { ta.focus(); fileMarks.editing = null; } }); });
</script>

{#snippet card(n: Note)}
  <div class="note" data-id={n.id} use:dragout={{ kind: 'highlight', id: n.id }}>
    <div class="head">
      <span class="dots" data-nodrag>{#each HL_COLORS as c (c)}<button type="button" class="dot {c}" class:on={n.color === c} title="Colour {c}" aria-label="Colour {c}" onclick={() => notes.setColor(n.id, c)}></button>{/each}</span>
      <span class="when">{when(n.updated)}</span>
      <button type="button" class="x" data-nodrag title="Remove this highlight" aria-label="Remove this highlight" onclick={() => notes.remove(n.id)}>×</button>
    </div>
    <button type="button" class="quote hl-{n.color}" title="Show it in the text" onclick={() => goNote(n)}>{n.anchor.quote}</button>
    {#if notes.unresolved.has(n.id)}<div class="lost" role="status">This highlight no longer matches the updated text. Its note is preserved.</div>{/if}
    <!-- A burst of typing is one step of the shell's timeline; leaving the box
         ends the burst, so the next one begins a step of its own. -->
    <textarea data-note={n.id} rows="2" placeholder="Add a note…" value={n.text}
      oninput={(e) => notes.setText(n.id, (e.currentTarget as HTMLTextAreaElement).value)}
      onblur={() => history.breakCoalescing()}></textarea>
  </div>
{/snippet}

<!-- A mark on a file wears the card a highlight wears, since it is the same
     thing in another place: the colours, the quote and the box to write in. A
     box has no quote and no colour, so it shows the words it holds instead. -->
{#snippet fileCard(m: FileMark)}
  <div class="note" data-id={m.id} use:dragout={{ kind: 'highlight', id: m.id }}>
    <div class="head">
      {#if m.kind === 'highlight'}
        <span class="dots" data-nodrag>{#each HL_COLORS as c (c)}<button type="button" class="dot {c}" class:on={m.color === c} title="Colour {c}" aria-label="Colour {c}" onclick={() => fileMarks.setColor(m.id, c)}></button>{/each}</span>
      {:else}
        <span class="kind">Text box</span>
      {/if}
      <span class="when">page {m.page} · {when(m.updated)}</span>
      <button type="button" class="x" data-nodrag title="Remove this mark" aria-label="Remove this mark" onclick={() => fileMarks.remove(m.id)}>×</button>
    </div>
    {#if m.kind === 'highlight'}
      <button type="button" class="quote hl-{m.color}" title="Show it in the file" onclick={() => goMark(m.id)}>{m.anchor.quote}</button>
      <textarea data-note={m.id} rows="2" placeholder="Add a note…" value={m.text}
        oninput={(e) => fileMarks.setText(m.id, (e.currentTarget as HTMLTextAreaElement).value)}
        onblur={() => history.breakCoalescing()}></textarea>
    {:else}
      <button type="button" class="boxed" title="Show it in the file" onclick={() => goMark(m.id)}>{plainWords(m.body) || 'An empty box'}</button>
    {/if}
  </div>
{/snippet}

{#snippet list(items: readonly Note[])}
  {#each items as n (n.id)}{@render card(n)}{/each}
{/snippet}

{#snippet sectionGroup(g: SectionGroup<Note>)}
  <div class="eyebrow">{label(g.section, g.title)} · {plural(g.items.length)}</div>
  {@render list(g.items)}
{/snippet}

{#snippet chapterGroup(g: ChapterGroup<Note>, open: boolean)}
  <details class="chapter" {open}>
    <summary>{label(g.chapter, g.title)}</summary>
    {#each g.sections as s (s.section)}{@render sectionGroup(s)}{/each}
  </details>
{/snippet}

<div class="eyebrow">{targetLabel(target, registry.manifest(assumedBook()))} · {plural(inside)}</div>
{#if inside === 0}
  <div class="blank">{blank}</div>
{:else if target.level === 'section'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render list(s.items)}{/each}{/each}
{:else if target.level === 'chapter'}
  {#each grouped.inside as c (c.chapter)}{#each c.sections as s (s.section)}{@render sectionGroup(s)}{/each}{/each}
{:else}
  {#each grouped.inside as c (c.chapter)}{@render chapterGroup(c, c.chapter === openChapter)}{/each}
{/if}
{#if fileCount}
  <details class="other" open>
    <summary>Your Files · {plural(fileCount)}</summary>
    {#each fileGroups as g (g.file.id)}
      <div class="eyebrow">{g.file.name} · {plural(g.marks.length)}</div>
      {#each g.marks as m (m.id)}{@render fileCard(m)}{/each}
    {/each}
  </details>
{/if}
{#if grouped.outside.length}
  <details class="other">
    <summary>{outsideLabel(target)} · {plural(countOf(grouped.outside))}</summary>
    {#each grouped.outside as c (c.chapter)}{@render chapterGroup(c, false)}{/each}
  </details>
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
  /* the quote is what the reader takes hold of to carry the highlight into a note */
  .quote{display:block;width:100%;text-align:left;font-family:var(--serif);font-size:0.9rem;line-height:1.35;color:var(--ink);border:0;border-radius:3px;padding:2px 4px;cursor:grab;background:var(--hl-yellow)}
  .quote:active{cursor:grabbing}
  .quote.hl-green{background:var(--hl-green)} .quote.hl-blue{background:var(--hl-blue)} .quote.hl-pink{background:var(--hl-pink)}
  .quote:hover{filter:brightness(.96)}
  .lost{margin-top:5px;color:var(--bad);font-size:.74rem}
  /* a box has no quote to show, so its own words stand where the quote would */
  .kind{flex:none;font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
  .boxed{display:block;width:100%;text-align:left;font-family:var(--sans);font-size:.85rem;line-height:1.4;color:var(--ink);border:1px dashed var(--rule);border-radius:4px;background:var(--soft);padding:4px 6px;cursor:pointer}
  .boxed:hover{border-color:var(--accent)}
  textarea{display:block;width:100%;margin-top:6px;font:inherit;font-size:0.84rem;line-height:1.4;color:var(--ink);background:var(--bg);border:1px solid var(--rule);border-radius:4px;padding:5px 7px;resize:vertical;box-sizing:border-box}
  textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
  :global(.view-pane) .note{font-size:1rem}
</style>
