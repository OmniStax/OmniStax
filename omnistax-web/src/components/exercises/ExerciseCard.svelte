<script lang="ts">
  /* One exercise. Multiple choice keeps its native radio choices and can be
     marked by the app; every other answer is self-checked after the solution is
     revealed. Provenance, Bloom level and concepts live below the question. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { pin } from '../../lib/sections/concepts.svelte';
  import { conceptId, exerciseDomId, type SectionId } from '../../lib/types/ids';
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { solutionText, type Verdict } from '../../lib/exercises/check';
  import { pointsOf, type Attempt } from '../../lib/practice/model';
  import { practice } from '../../lib/practice/store.svelte';
  import { math, mathHtml } from '../actions/math';
  import ChoiceAnswer from './ChoiceAnswer.svelte';

  let {
    section, ex, hidden = false, book = registry.manifest.id,
    outcome = null, onanswer,
  }: {
    section: SectionId; ex: ExerciseDTO; hidden?: boolean; book?: string;
    outcome?: boolean | null; onanswer?: (ok: boolean) => void;
  } = $props();

  const hot = $derived(pin.pinned !== null && ex.concepts.includes(pin.pinned));
  const concept = (id: string) => practice.conceptOf(id);
  const a = $derived(ex.answer);
  const domId = $derived(exerciseDomId(section, ex.id));
  const sol = $derived(solutionText(a));
  const nameOf = (id: string): string => practice.conceptOf(id)?.name ?? id;
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

  /* The source schema keeps the publisher's opaque id and original section. Most
     conventional local ids also retain the printed ordinal (p17, cq3, ap2), so
     show it where it is genuinely present and never manufacture a book number. */
  const sourceSection = $derived(ex.sourceSection ?? section);
  const kindName = $derived(
    book === registry.manifest.id
      ? registry.manifest.exerciseKinds[ex.kind] ?? titled(ex.kind.replace(/-/g, ' '))
      : titled(ex.kind.replace(/-/g, ' ')),
  );
  const sourceExercise = $derived.by(() => {
    if (ex.sourceNumber) return `Exercise ${ex.sourceNumber}`;
    const m = /^(?:p|cq|ap|cyu|cyl|ct|e)(\d+)$/i.exec(ex.id);
    return m ? `${kindName} ${Number(m[1])}` : kindName;
  });
  const sourceBook = $derived(book === registry.manifest.id ? registry.manifest.title : practice.bookTitle(book));

  let earned = $state<string | null>(null);
  let localDone = $state(false);
  let localOutcome = $state<boolean | null>(null);
  let solutionOpen = $state(false);
  const completed = $derived(outcome !== null || localDone);
  const recorded = $derived(outcome ?? localOutcome);
  const said = (att: Attempt | null, ok: boolean): string =>
    att === null ? 'Already counted today.'
      : ok ? Object.entries(pointsOf(ex)).map(([id, p]) => `+${p} ${nameOf(id)}`).join(' · ')
      : 'No points this time.';
  const record = (ok: boolean, self: boolean): void => {
    if (completed) return;
    earned = said(practice.record(book, section, ex, ok, self), ok);
    localOutcome = ok;
    localDone = true;
    onanswer?.(ok);
  };
</script>

<div class="exercise" class:hot id={domId} {hidden}>

  <div class="prompt" use:math={ex.prompt}><p>{@html ex.prompt}</p></div>
  {#if ex.figure}<figure class="photo"><img src={ex.figure.src} alt={ex.figure.alt}>{#if ex.figure.caption}<figcaption><span>{ex.figure.caption}</span></figcaption>{/if}</figure>{/if}

  <details class="meta">
    <summary>Exercise meta</summary>
    <div class="meta-body">
      <div class="meta-row"><span class="lab">Bloom level</span><span class="chip bloom" title={bloomHelp}>{titled(ex.bloom)} <span aria-hidden="true">ⓘ</span></span></div>
      {#if ex.concepts.length}
        <div class="meta-row"><span class="lab">Concepts tested</span><span class="chips">
          {#each ex.concepts as c (c)}
            {@const k = concept(c)}
            <button type="button" class="chip concept k-{k?.kind ?? 'idea'}" class:hot={pin.pinned === c} data-concept={c} onclick={() => pin.toggle(conceptId(c))}><span use:math={k?.name}>{@html k?.name ?? c}</span></button>
          {/each}
        </span></div>
      {/if}
      <div class="meta-row"><span class="lab">Source</span><span class="source" title="Publisher source id: {ex.sourceId}">{sourceBook} · Section {sourceSection} · {sourceExercise}</span></div>
    </div>
  </details>

  {#if a.type === 'choice'}
    <ChoiceAnswer answer={a} name="c-{section}-{ex.id}" locked={outcome} oncheck={(v: Verdict) => record(v.ok, false)} />
    {#if completed && sol}
      <div class="solution-block"><div class="solution-head">Solution ({a.generated_by === 'ai' ? 'AI' : 'book'})</div><div use:math={sol}>{@html sol}</div></div>
    {/if}
  {:else if sol}
    {#if solutionOpen || completed}
      <div class="solution-block">
        <div class="solution-head">{a.type === 'open' ? 'Suggested approach' : 'Solution'} ({a.generated_by === 'ai' ? 'AI' : 'book'})</div>
        <div use:math={sol}>{@html sol}</div>
      </div>
      {#if !completed}
        <div class="selfcheck" aria-label="Mark your answer">
          <button type="button" class="right" onclick={() => record(true, true)}>I got it right</button>
          <button type="button" class="wrong" onclick={() => record(false, true)}>I got it wrong</button>
        </div>
      {/if}
    {:else}
      <div class="reveal"><button type="button" class="btn reveal-btn" onclick={() => (solutionOpen = true)}>Reveal and check</button></div>
    {/if}
  {:else}
    <p class="no-solution">No answer was supplied for this exercise, so it cannot be self-checked.</p>
  {/if}

  {#if earned}<div class="earned" use:mathHtml={earned}></div>{/if}
  {#if recorded !== null}<div class:answer-right={recorded} class:answer-wrong={!recorded} class="recorded">{recorded ? 'Answered correctly' : 'Answered incorrectly'}</div>{/if}
</div>

<style>
  .exercise{position:relative;border:1px solid var(--rule);border-left:3px solid var(--warm);border-radius:8px;background:var(--panel);padding:14px 16px;margin:0 0 12px;font-size:0.97rem}
  .exercise.hot{border-color:var(--accent)}
  .exercise[hidden]{display:none}
  .prompt{margin-bottom:8px}
  .prompt :global(p){margin:0}
  .prompt :global(table.data){border-collapse:collapse;font-family:var(--sans);font-size:0.85rem;margin:8px 0;font-variant-numeric:tabular-nums}
  .prompt :global(table.data th),.prompt :global(table.data td){border:1px solid var(--rule);padding:2px 10px;text-align:right}
  .meta{font-family:var(--sans);font-size:0.78rem;margin:10px 0}
  .meta summary{width:max-content;color:var(--muted);font-weight:600;cursor:pointer}
  .meta-body{display:flex;flex-direction:column;gap:7px;margin-top:7px;padding:9px 10px;border:1px solid var(--rule);border-radius:7px;background:var(--soft)}
  .meta-row{display:grid;grid-template-columns:minmax(92px,auto) 1fr;gap:10px;align-items:start}
  .meta .lab{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);padding-top:2px}
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .chip{display:inline-flex;align-items:center;width:max-content;font:inherit;font-size:0.72rem;padding:2px 7px;border-radius:10px}
  .chip.bloom{background:color-mix(in srgb,var(--warm) 14%,transparent);color:var(--warm);cursor:help}
  .chip.concept{border:1px solid transparent;cursor:pointer;color:var(--ink)}
  .chip.concept.k-idea{background:var(--soft2)}
  .chip.concept.k-skill{font-style:italic;background:transparent;border-color:var(--rule)}
  .chip.concept.hot{border-color:var(--accent)}
  .chip.concept:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .source{color:var(--ink);line-height:1.35}
  .solution-block{font-family:var(--serif);font-size:0.95rem;margin-top:10px;padding:10px 12px;border-left:3px solid var(--rule);background:var(--soft)}
  .solution-head{font-family:var(--sans);font-size:0.76rem;font-weight:700;color:var(--muted);margin-bottom:5px}
  .reveal,.selfcheck{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:10px;font-family:var(--sans)}
  .btn,.selfcheck button{font:inherit;font-size:0.78rem;font-weight:650;padding:6px 11px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink);cursor:pointer}
  .btn:hover,.selfcheck button:hover{background:var(--soft)}
  .btn:focus-visible,.selfcheck button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .selfcheck .right{border-color:var(--ok);color:var(--ok);background:color-mix(in srgb,var(--ok) 8%,var(--panel))}
  .selfcheck .wrong{border-color:var(--bad);color:var(--bad);background:color-mix(in srgb,var(--bad) 8%,var(--panel))}
  .earned,.recorded,.no-solution{margin:7px 0 0;font-family:var(--sans);font-size:0.8rem;color:var(--muted)}
  .recorded.answer-right{color:var(--ok)}
  .recorded.answer-wrong{color:var(--bad)}
  @media (max-width:520px){.meta-row{grid-template-columns:1fr;gap:3px}}
</style>
