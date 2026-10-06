<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { focus } from '../../lib/sections/focus.svelte';
  import { count } from '../../lib/practice/labels';
  import { type Pick, samePick } from '../../lib/practice/model';
  import { conceptId } from '../../lib/types/ids';
  let { item, mode = 'seed', label }: { item: string; mode?: 'seed' | 'add'; label?: string } = $props();

  type Chip = { readonly label: string; readonly picks: readonly Pick[] };
  const concepts = (ids: readonly string[]): readonly Pick[] => ids.map((id) => ({ concept: conceptId(id) }));
  const sectionTitle = (book: string, id: string): string =>
    books.manifest(book)?.chapters.flatMap((c) => c.sections).find((s) => s.id === id)?.title ?? '';

  $effect(() => { const s = focus.section; if (s && !books.manifest(s.book) && !books.status[s.book]) books.load(s.book).catch(() => {}); });

  const chips = $derived.by((): readonly Chip[] => {
    const due = practice.due(), started = practice.started(), s = focus.section;
    return [
      ...(due.length ? [{ label: `Add the ${count(due.length, 'concept')} due for review`, picks: concepts(due) }] : []),
      ...(started.length ? [{ label: `Add the ${count(started.length, 'concept')} in progress`, picks: concepts(started) }] : []),
      ...(s ? [{ label: [`Add section ${s.section}`, sectionTitle(s.book, s.section)].filter(Boolean).join(' · '), picks: [{ book: s.book, section: s.section }] }] : []),
    ];
  });

  const choose = (picks: readonly Pick[]): void => {
    if (mode === 'seed') { practice.seed(item, picks); return; }
    const current = practice.page(item).curriculum;
    practice.replace(item, [...current, ...picks.filter((p) => !current.some((q) => samePick(p, q)))]);
  };
</script>

{#if chips.length}
  {#if label}<p class="eyebrow label">{label}</p>{/if}
  <div class="up-next">
    {#each chips as c (c.label)}<button type="button" class="chip" onclick={() => choose(c.picks)}>{c.label}</button>{/each}
  </div>
{/if}

<style>
  .up-next{display:flex;flex-wrap:wrap;gap:8px}
  .label{margin:0 0 -4px;color:var(--muted)}
</style>
