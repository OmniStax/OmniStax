<script lang="ts">
  import { registry } from '../../lib/sections/registry.svelte';
  import { pin } from '../../lib/sections/concepts.svelte';
  import { conceptId, exerciseDomId, type SectionId } from '../../lib/types/ids';
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { solutionText, type Verdict } from '../../lib/exercises/check';
  import { practice } from '../../lib/practice/store.svelte';
  import type { SessionId } from '../../lib/practice/model';
  import { mathHtml } from '../actions/math';
  import ChoiceAnswer from './ChoiceAnswer.svelte';
  import AiTag from '../practice/AiTag.svelte';
  import { exerciseName } from '../../lib/practice/labels';
  import { hasScratch, linkedDrawing, openScratch } from '../../lib/practice/scratch.svelte';
  import { detachScratch } from '../../lib/drawer/edits';
  import { drawings } from '../../lib/drawer/store.svelte';
  import { openItem, openFromView, openingInView } from '../../lib/sections/nav.svelte';
  import { ICON } from '../../lib/icons';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { bookId, drawingItem, itemKey } from '../../lib/types/ids';
  import { generated } from '../../lib/practice/generated.svelte';
  import { isGenerated } from '../../lib/practice/generated';
  import type { Graded } from '../../lib/practice/grade';
  import AiGrade from '../practice/AiGrade.svelte';

  let {
    book, section, ex, hidden = false,
    outcome = null, onanswer, inline = false, session, number, review = false,
  }: {
    book: string; section: SectionId; ex: ExerciseDTO; hidden?: boolean;
    outcome?: boolean | null; onanswer?: (ok: boolean, self: boolean) => void; inline?: boolean; session?: SessionId;
    number?: string; review?: boolean;
  } = $props();

  const hot = $derived(pin.pinned !== null && ex.concepts.includes(pin.pinned));
  const concept = (id: string) => practice.conceptOf(id, book);
  const a = $derived(ex.answer);
  const domId = $derived(exerciseDomId(section, ex.id));
  const sol = $derived(solutionText(a));
  const gen = $derived(isGenerated(ex.id) ? generated.get(ex.id) : undefined);
  const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

  const BLOOM_HELP: Readonly<Record<string, string>> = {
    remember: 'Remember: recall a fact, term, definition or procedure.',
    understand: 'Understand: explain an idea or interpret it in your own words.',
    apply: 'Apply: use a known method in a problem.',
    analyze: 'Analyze: break a problem apart and relate its pieces.',
    analyse: 'Analyze: break a problem apart and relate its pieces.',
    evaluate: 'Evaluate: judge a result or method using evidence.',
    create: 'Create: produce and justify a new solution or design.',
  };
  const bloomHelp = $derived(BLOOM_HELP[ex.bloom.trim().toLowerCase()] ?? `${titled(ex.bloom)} is the kind of thinking this exercise asks for.`);

  const sourceSection = $derived(ex.sourceSection ?? section);
  const kindName = $derived(
    registry.hasBook(bookId(book))
      ? registry.manifest(bookId(book)).exerciseKinds[ex.kind] ?? titled(ex.kind.replace(/-/g, ' '))
      : titled(ex.kind.replace(/-/g, ' ')),
  );
  const sourceBook = $derived(registry.hasBook(bookId(book)) ? registry.manifest(bookId(book)).title : practice.bookTitle(book));

  let localDone = $state(false);
  let localOutcome = $state<boolean | null>(null);
  let solutionOpen = $state(false);
  const completed = $derived(outcome !== null || localDone);
  const recorded = $derived(outcome ?? localOutcome);
  const record = (ok: boolean, self: boolean): void => {
    if (completed || review) return;
    if (!inline) practice.record(book, section, ex, ok, self, Date.now(), session);
    localOutcome = ok;
    localDone = true;
    onanswer?.(ok, self);
  };

  const at = $derived({ book, section, ex: ex.id });
  const scratched = $derived(hasScratch(at));
  const linked = $derived(linkedDrawing(at));
  const linkedName = $derived(linked ? drawings.row(linked)?.name ?? 'drawing' : null);
  const scratch = (): void => openScratch(at, layoutStore.layout.focus);
  let gradeFailed = $state<string | null>(null);
  let graded = $state<Graded | null>(null);
  const aiGrading = $derived(!inline && !review && !!session && practice.settings.grading === 'ai' && a.type !== 'choice' && !!sol && gradeFailed === null);
  const onGraded = (g: Graded): void => { graded = g; solutionOpen = true; record(g.verdict === 'right', false); };
  const revealable = $derived(a.type !== 'choice' && !!sol && !solutionOpen && !completed && !aiGrading);
  /* In a reference view the drawing opens the way that view opens things. */
  const openLinked = (e: MouseEvent): void => {
    if (!linked) return;
    const key = itemKey(drawingItem(linked));
    void ((e.currentTarget as Element).closest('[data-view]') ? openFromView(key, openingInView(e)) : openItem(key));
  };
  const GRADED: Readonly<Record<Graded['verdict'], string>> = { right: '✓ Correct', partial: '~ Partly right', wrong: '✗ Incorrect' };
</script>

{#snippet scratchpad()}
  <span class="tools">
    <button type="button" class="btn ghost sm" onclick={scratch}>
      {@html ICON.drawing}Scratchpad{#if scratched && !linked}<span class="mark" aria-label="You have scratch work here">•</span>{/if}
    </button>
    {#if linked && linkedName}
      <button type="button" class="btn ghost sm link" onclick={openLinked} onauxclick={(e) => { if (e.button === 1) openLinked(e); }}>{linkedName}</button>
      <button type="button" class="btn ghost sm" onclick={() => detachScratch(book, section, ex.id)} title="Back to scratch work">Detach</button>
    {/if}
  </span>
{/snippet}

{#snippet solution()}
  <div class="solution-block">
    <div class="eyebrow">{a.type === 'open' ? 'Suggested approach' : 'Solution'} · {#if a.generated_by === 'ai'}<AiTag model={gen?.model} text />{:else}from the book{/if}</div>
    <div class="body" use:mathHtml={sol}></div>
  </div>
{/snippet}

{#snippet verdict(ok: boolean | null)}
  {#if ok === null}<p class="verdict skipped">Skipped</p>
  {:else}<p class="verdict" class:ok class:bad={!ok}><span aria-hidden="true">{ok ? '✓' : '✗'}</span><span>{ok ? 'Correct' : 'Incorrect'}</span></p>{/if}
{/snippet}

<div class="exercise" class:inline class:hot id={domId} data-book={book} {hidden}>
  <div class="eyebrow head" title={sourceBook}>
    {#if number}<span>{number}</span>{/if}
    <span>{exerciseName(ex, kindName)}</span>
    <span>§ {sourceSection}</span>
    <span class="bloom" title={bloomHelp}>{titled(ex.bloom)}</span>
    {#if gen}<span><AiTag model={gen.model} text /></span>{/if}
  </div>

  <div class="prompt"><p use:mathHtml={ex.prompt}></p></div>
  {#if ex.figure}<figure class="photo"><img src={ex.figure.src} alt={ex.figure.alt}>{#if ex.figure.caption}<figcaption><span>{ex.figure.caption}</span></figcaption>{/if}</figure>{/if}

  {#if review}
    {#if a.type === 'choice'}
      <ol class="options">{#each a.options as o, i}<li class:right={i === a.correct}><span class="tick">{i === a.correct ? '✓' : ''}</span><span>{o}</span></li>{/each}</ol>
    {/if}
    {@render verdict(outcome)}
  {:else if a.type === 'choice'}
    <ChoiceAnswer answer={a} name="c-{section}-{ex.id}" locked={outcome} oncheck={(v: Verdict) => record(v.ok, false)} tools={inline ? undefined : scratchpad} />
    {#if completed && sol}{@render solution()}{/if}
  {:else if sol}
    {#if solutionOpen || completed}
      {#if graded}<div class="graded" role="status"><b class="v-{graded.verdict}">{GRADED[graded.verdict]}</b>{#if graded.feedback} <span use:mathHtml={graded.feedback}></span>{/if}</div>{/if}
      {@render solution()}
      {#if !completed && !inline}
        <div class="selfcheck" aria-label="Mark your answer">
          <span class="ask">Did you get it?</span>
          <button type="button" class="btn" onclick={() => record(true, true)}><span class="g ok" aria-hidden="true">✓</span>I got it right</button>
          <button type="button" class="btn" onclick={() => record(false, true)}><span class="g bad" aria-hidden="true">✗</span>I got it wrong</button>
        </div>
      {/if}
    {/if}
  {:else}
    <p class="note">This exercise has no answer to check against.</p>
  {/if}

  {#if !review && aiGrading && !completed}
    <AiGrade {ex} {at} ongraded={onGraded} onfail={(why) => (gradeFailed = why)} />
  {:else if !review && ((!inline && a.type !== 'choice') || revealable)}
    <div class="actions">
      {#if !inline}{@render scratchpad()}{/if}
      {#if revealable}<button type="button" class="btn primary reveal-btn" onclick={() => (solutionOpen = true)}>Show solution</button>{/if}
    </div>
  {/if}

  {#if gradeFailed}<p class="note" role="status">Grading failed: {gradeFailed}</p>{/if}
  {#if !review && a.type !== 'choice' && !graded && recorded !== null}{@render verdict(recorded)}{/if}

  {#if ex.concepts.length}
    <details class="concepts" open={completed || solutionOpen}>
      <summary>Concepts</summary>
      <div class="pills">
        {#each ex.concepts as c (c)}
          {@const k = concept(c)}
          <button type="button" class="pill k-{k?.kind ?? 'idea'}" class:hot={pin.pinned === c} data-book={book} data-concept={c} onclick={() => pin.toggle(conceptId(c))}><span class="dot" aria-hidden="true"></span><span use:mathHtml={k?.name ?? c}></span></button>
        {/each}
      </div>
    </details>
  {/if}

  {#if review}
    {#if sol}<details class="solution-fold"><summary>Solution</summary>{@render solution()}</details>{/if}
    {#if scratched || linked}
      <div class="actions"><button type="button" class="btn ghost sm" onclick={(e) => (linked ? openLinked(e) : scratch())}>{@html ICON.drawing}Scratch work</button></div>
    {/if}
  {/if}
</div>

<style>
  .exercise{margin:0 0 12px;font-family:var(--sans);font-size:0.84rem;transition:box-shadow 120ms,padding-left 120ms}
  .exercise.inline{border:1px solid var(--rule);border-radius:6px;background:var(--panel);padding:14px 18px}
  .exercise.hot:not(.inline){border-left:2px solid var(--ink);padding-left:12px}
  .exercise.inline.hot{box-shadow:inset 2px 0 0 var(--ink)}
  .exercise[hidden]{display:none}
  .head{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px;margin-bottom:8px}
  .head>span+span::before{content:'·';margin-right:8px}
  .bloom{cursor:help}
  .prompt,.solution-block .body{font-family:var(--serif);font-size:1rem;line-height:1.6;max-width:68ch}
  .prompt :global(p){margin:0}
  .prompt :global(table.data){border-collapse:collapse;font-family:var(--sans);font-size:0.84rem;margin:8px 0;font-variant-numeric:tabular-nums}
  .prompt :global(table.data th),.prompt :global(table.data td){border:1px solid var(--rule);padding:2px 10px;text-align:right}
  .actions{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px}
  .reveal-btn{margin-left:auto}
  .tools{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px}
  .tools :global(svg),.actions :global(svg){width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .mark{color:var(--ink);font-size:1rem;line-height:0;margin-left:2px}
  .link{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink)}
  .solution-block{border-top:1px solid var(--rule);margin-top:16px;padding-top:12px}
  .solution-block .eyebrow{display:flex;align-items:center;gap:4px;margin-bottom:4px}
  .selfcheck{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
  .selfcheck .ask{color:var(--muted);margin-right:4px}
  .g{margin-right:4px}
  .g.ok,.verdict.ok,.v-right{color:var(--ok)}
  .g.bad,.verdict.bad,.v-wrong{color:var(--bad)}
  .v-partial{color:var(--ink)}
  .verdict{display:flex;align-items:baseline;gap:6px;margin:12px 0 0;font-weight:600}
  .verdict.skipped{color:var(--muted)}
  .graded{margin-top:12px;padding:8px 12px;border-radius:6px;background:var(--soft)}
  .graded b{font-weight:600}
  .note{margin:8px 0 0;font-size:0.78rem;color:var(--muted)}
  .options{list-style:none;margin:8px 0 0;padding:0;font-size:0.84rem}
  .options li{display:flex;gap:8px;padding:4px 0}
  .options .tick{width:1em;color:var(--ok)}
  .options .right{font-weight:600}
  details{margin-top:12px}
  summary{width:max-content;font-size:0.78rem;color:var(--muted);cursor:pointer;border-radius:4px}
  summary:hover{color:var(--ink)}
  summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
  .pill{display:inline-flex;align-items:center;gap:6px;min-height:24px;padding:2px 10px;border:0;border-radius:999px;background:var(--soft);color:var(--ink);font:inherit;font-size:0.74rem;cursor:pointer;transition:box-shadow 120ms,background 120ms}
  .pill:hover{background:var(--soft2)}
  .pill.hot{box-shadow:inset 0 0 0 1px var(--ink)}
  .pill:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dot,var(--cm-idea))}
  .k-definition{--dot:var(--cm-definition)} .k-axiom{--dot:var(--cm-axiom)} .k-idea{--dot:var(--cm-idea)}
  .k-result{--dot:var(--cm-result)} .k-skill{--dot:var(--cm-skill)}
  .solution-fold>summary{font-weight:600}
</style>
