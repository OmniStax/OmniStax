<script lang="ts">
  import { practice, type Session } from '../../lib/practice/store.svelte';
  import { books } from '../../lib/practice/books.svelte';
  import { durationText, exerciseName, pickLabel, type PickNames } from '../../lib/practice/labels';
  import type { SessionId } from '../../lib/practice/model';
  import { pageCount, pageOf } from '../../lib/pomodoro/model';
  import RowMenu from '../explorer/RowMenu.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  let { item, limit }: { item: string; limit?: number } = $props();

  const running = $derived(practice.liveSessions());
  const past = $derived(practice.past());
  let page = $state(0);
  const pages = $derived(limit ? 1 : pageCount(past.length));
  const shown = $derived(limit ? past.slice(0, limit) : pageOf(past, Math.min(page, pages - 1)));

  const chapterOf = (book: string, id: string) => books.manifest(book)?.chapters.find((c) => c.id === id);
  const sectionTitle = (book: string, id: string): string =>
    books.manifest(book)?.chapters.flatMap((c) => c.sections).find((s) => s.id === id)?.title ?? '';
  const names: PickNames = {
    book: (id) => practice.bookTitle(id),
    chapter: (book, id) => `${i18n.t('practice.rows.chapter', { id })}${chapterOf(book, id) ? ` ${chapterOf(book, id)?.title}` : ''}`,
    section: (book, id) => `${id} ${sectionTitle(book, id)}`.trim(),
    concept: (id) => practice.conceptOf(id)?.name ?? id,
    exercise: (ref) => { const ex = practice.exerciseOf(ref); return ex ? i18n.t('practice.rows.exerciseIn', { name: exerciseName(ex, undefined, i18n.t), section: ref.section }) : i18n.t('practice.rows.anExerciseIn', { section: ref.section }); },
  };
  const covers = (s: Session): string => {
    const words = s.curriculum.map((p) => pickLabel(p, names));
    if (!words.length) return '—';
    return words.length > 3 ? i18n.t('practice.rows.andMore', { words: words.slice(0, 3).join(', '), n: words.length - 3 }) : words.join(', ');
  };
  const bookOfPick = (p: Session['curriculum'][number]): string | null => ('concept' in p ? null : 'exercise' in p ? p.exercise.book : p.book);
  $effect(() => {
    const wanted = new Set([...running.map((r) => r.session), ...shown].flatMap((s) => s.curriculum.flatMap((p) => bookOfPick(p) ?? [])));
    wanted.forEach((b) => { if (!books.manifest(b) && !books.status[b]) books.load(b).catch(() => {}); });
  });

  const when = $derived(new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }));
  const answered = (s: Session): number => s.outcomes.filter((o) => o !== null).length;
  const correct = (s: Session): number => s.outcomes.filter((o) => o === true).length;

  const reopenRelease = (release: string): void => {
    const url = new URL(location.href); url.searchParams.set('_omnistax_release', release); location.assign(url);
  };
  const takeUp = (id: SessionId): void => {
    const required = practice.releaseFor(id);
    if (required) reopenRelease(required.release); else practice.take(item, id);
  };
  const needs = (id: SessionId): string => { const r = practice.releaseFor(id); return r ? i18n.t('practice.rows.needsRelease', { release: r.release.slice(0, 10) }) : ''; };

  type Menu = { readonly id: SessionId; readonly label: string; readonly x: number; readonly y: number };
  let menu = $state<Menu | null>(null);
  let asking = $state<{ readonly id: SessionId; readonly label: string } | null>(null);
  const openAt = (id: SessionId, label: string) => (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    menu = menu ? null : { id, label, x: e.clientX, y: e.clientY };
  };
  const items = $derived(menu ? [{ label: menu.label, run: () => { if (menu) asking = { id: menu.id, label: menu.label }; }, danger: true }] : []);
</script>

{#snippet more(id: SessionId, label: string)}
  {#if asking?.id === id}
    <span class="ask">
      {i18n.t('practice.rows.confirm', { label: asking.label })}
      <button type="button" class="btn sm danger" onclick={() => { practice.discard(id); asking = null; }}>{i18n.t('practice.yes')}</button>
      <button type="button" class="btn ghost sm" onclick={() => (asking = null)}>{i18n.t('practice.no')}</button>
    </span>
  {:else}
    <button type="button" class="btn ghost icon sm more" aria-label={i18n.t('practice.rows.actions')} onclick={openAt(id, label)}>⋯</button>
  {/if}
{/snippet}

{#if !running.length && !past.length}
  <p class="meta">{i18n.t('practice.rows.empty')}</p>
{:else}
  <ul class="rows">
    {#each running as { session: s, key } (s.id)}
      <li class="row" class:open={menu?.id === s.id} oncontextmenu={openAt(s.id, i18n.t('practice.rows.discard'))}>
        <button type="button" class="btn sm primary" title={needs(s.id)} onclick={() => takeUp(s.id)}>{i18n.t('practice.rows.continue')}</button>
        <span class="when">{when.format(s.started)}</span>
        <span class="what">{covers(s)}</span>
        <span class="num">{i18n.t('practice.rows.answered', { n: answered(s), total: s.outcomes.length })}</span>
        {#if key !== null && key !== item}<span class="held meta">{i18n.t('practice.rows.elsewhere')}</span>{/if}
        {@render more(s.id, i18n.t('practice.rows.discard'))}
      </li>
    {/each}
    {#each shown as s (s.id)}
      <li class="row past" class:open={menu?.id === s.id} oncontextmenu={openAt(s.id, i18n.t('practice.rows.delete'))}>
        <button type="button" class="line" onclick={() => practice.review(item, s.id)}>
          <span class="when">{when.format(s.started)}</span>
          <span class="dur meta">{durationText((s.ended ?? s.started) - s.started, i18n.t)}</span>
          <span class="what">{covers(s)}</span>
          <span class="num">{i18n.t('practice.rows.correct', { n: correct(s), total: s.outcomes.length })}</span>
        </button>
        {@render more(s.id, i18n.t('practice.rows.delete'))}
      </li>
    {/each}
  </ul>
  {#if pages > 1}
    <nav class="pager" aria-label={i18n.t('practice.pages')}>
      <button type="button" class="btn ghost sm" disabled={page <= 0} onclick={() => (page = Math.max(0, page - 1))}>{i18n.t('practice.newer')}</button>
      <span>{i18n.t('practice.page', { n: Math.min(page, pages - 1) + 1, total: pages })}</span>
      <button type="button" class="btn ghost sm" disabled={page >= pages - 1} onclick={() => (page = Math.min(pages - 1, page + 1))}>{i18n.t('practice.older')}</button>
    </nav>
  {/if}
{/if}
{#if menu}<RowMenu x={menu.x} y={menu.y} {items} onclose={() => (menu = null)} />{/if}

<style>
  .rows{list-style:none;margin:0;padding:0}
  .row{position:relative;display:flex;align-items:baseline;gap:10px;min-height:28px;padding:6px 30px 6px 6px;border-bottom:1px solid var(--rule);border-radius:6px;transition:background-color 120ms}
  .row.past{padding:0 30px 0 0}
  .row:hover,.row.open{background:var(--soft)}
  .line{all:unset;box-sizing:border-box;flex:1;min-width:0;display:flex;align-items:baseline;gap:10px;padding:6px;cursor:pointer;border-radius:6px}
  .line:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .when,.dur,.num{font-variant-numeric:tabular-nums;white-space:nowrap}
  .held{white-space:nowrap}
  .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .more{position:absolute;right:4px;top:3px;opacity:0}
  .row:hover .more,.row.open .more,.more:focus-visible{opacity:1}
  @media (hover: none){ .more{opacity:.55} }
  .ask{position:absolute;right:4px;top:2px;display:flex;align-items:center;gap:3px;padding:1px 2px 1px 6px;border-radius:7px;background:var(--panel);font-size:0.78rem;color:var(--bad)}
  .pager{display:flex;align-items:center;justify-content:center;gap:10px;padding-top:8px;font-size:0.8rem;color:var(--muted);font-variant-numeric:tabular-nums}
  @container (max-width: 420px){
    .row,.line{flex-wrap:wrap;row-gap:2px}
    .what{order:5;flex-basis:100%}
  }
</style>
