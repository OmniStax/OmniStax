<script lang="ts">
  import { registry } from '../../lib/sections/registry.svelte';
  import { conceptId, exerciseDomId, type SectionId } from '../../lib/types/ids';
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { hintText, solutionText, type Verdict } from '../../lib/exercises/check';
  import { practice } from '../../lib/practice/store.svelte';
  import type { SessionId } from '../../lib/practice/model';
  import { mathHtml } from '../actions/math';
  import ChoiceAnswer from './ChoiceAnswer.svelte';
  import AiTag from '../practice/AiTag.svelte';
  import { exerciseName } from '../../lib/practice/labels';
  import { hasScratch, linkedDrawing, openScratch } from '../../lib/practice/scratch.svelte';
  import { drawings } from '../../lib/drawer/store.svelte';
  import { openFromView, openItem, openingInView, openingOf, onMiddle } from '../../lib/sections/nav.svelte';
  import { ICON } from '../../lib/icons';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { bookId, drawingItem, itemKey, noteItem } from '../../lib/types/ids';
  import { generated } from '../../lib/practice/generated.svelte';
  import { isGenerated } from '../../lib/practice/generated';
  import type { Graded } from '../../lib/practice/grade';
  import AiGrade from '../practice/AiGrade.svelte';
  import { links, entryOfKey } from '../../lib/practice/links.svelte';
  import { discussExercise } from '../../lib/practice/discuss.svelte';
  import { createNote } from '../../lib/explorer/edits';
  import { explorer } from '../../lib/explorer/store.svelte';

  let {
    book, section, ex, hidden = false,
    outcome = null, onanswer, inline = false, session, number, review = false,
  }: {
    book: string; section: SectionId; ex: ExerciseDTO; hidden?: boolean;
    outcome?: boolean | null; onanswer?: (ok: boolean, self: boolean) => void; inline?: boolean; session?: SessionId;
    number?: string; review?: boolean;
  } = $props();

  const concept = (id: string) => practice.conceptOf(id, book);
  const a = $derived(ex.answer);
  const domId = $derived(exerciseDomId(section, ex.id));
  const sol = $derived(solutionText(a));
  const hint = $derived(hintText(a));
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
  const credit = $derived(ex.credit);
  const creditLine = $derived(credit ? [credit.title, credit.author, credit.license].filter(Boolean).join(', ') : sourceBook);

  let localDone = $state(false);
  let localOutcome = $state<boolean | null>(null);
  let solutionOpen = $state(false);
  let hintOpen = $state(false);
  let foldOpen = $state(false);
  const completed = $derived(outcome !== null || localDone);
  const recorded = $derived(outcome ?? localOutcome);
  /* a correction of the solution waits for the solution, as a review's waits for its fold */
  const solutionShown = $derived(review ? foldOpen : solutionOpen || completed);
  const hintShown = $derived(!!hint && (hintOpen || solutionShown));
  const noteShown = (c: { solution?: boolean; hint?: boolean }): boolean => (c.solution ? solutionShown : c.hint ? hintShown : true);
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
  const scratch = (e?: MouseEvent): void => { void openScratch(at, layoutStore.layout.focus, openingOf(e)); };
  let gradeFailed = $state<string | null>(null);
  let graded = $state<Graded | null>(null);
  const aiGrading = $derived(!inline && !review && !!session && practice.settings.grading === 'ai' && a.type !== 'choice' && !!sol && gradeFailed === null);
  let answered = $state('');
  const onGraded = (g: Graded, answer: string): void => { graded = g; answered = answer; solutionOpen = true; record(g.verdict === 'right', false); };
  const revealable = $derived(a.type !== 'choice' && !!sol && !solutionOpen && !completed && !aiGrading);
  const hintable = $derived(!review && !!hint && !hintShown && !completed);
  /* The files beside this exercise, under _practice: its scratch drawing, and its notes and chats. */
  const KIND_ICON: Readonly<Record<string, string>> = { note: ICON.note, drawing: ICON.drawing, chat: ICON.chat };
  const linkedItems = $derived(links.of(at).flatMap((key) => {
    const e = entryOfKey(key); const row = e ? explorer.entry(e) : undefined;
    return row && key !== (linked ? itemKey(drawingItem(linked)) : '') ? [{ key, name: row.name, icon: KIND_ICON[row.kind] ?? '' }] : [];
  }));
  const openLink = (key: string, e: MouseEvent): void => { void openFromView(key, openingInView(e)); };
  const discuss = (e: MouseEvent): void => { void discussExercise(at, ex, openingInView(e), recorded, answered, graded !== null); };
  /* One note per exercise: made under _practice/notes the first time, opened after. */
  const noteKey = $derived(links.of(at).find((k) => k.startsWith('note:')) ?? null);
  const addNote = (e: MouseEvent): void => {
    if (noteKey) { openLink(noteKey, e); return; }
    const doc = createNote(links.folder('notes'), links.fileName(at, 'notes', ex));
    const key = itemKey(noteItem(doc.id));
    links.add(at, key);
    openLink(key, e);
  };
  const GRADED: Readonly<Record<Graded['verdict'], string>> = { right: '✓ Correct', partial: '~ Partly right', wrong: '✗ Incorrect' };
</script>

{#snippet scratchpad()}
  <span class="tools">
    <button type="button" class="btn ghost sm" onclick={scratch} onauxclick={onMiddle(scratch)}>
      {@html ICON.drawing}Scratchpad{#if scratched || linked}<span class="mark" aria-label="You have scratch work here">•</span>{/if}
    </button>
    <button type="button" class="btn ghost sm" onclick={addNote} onauxclick={onMiddle(addNote)}>
      {@html ICON.note}Note{#if noteKey}<span class="mark" aria-label="You have a note here">•</span>{/if}
    </button>
  </span>
{/snippet}

{#snippet solution()}
  <div class="solution-block">
    <div class="eyebrow">Solution · {#if a.generated_by === 'ai'}<AiTag model={gen?.model} text />{:else}from the book{/if}</div>
    <div class="body" use:mathHtml={sol}></div>
  </div>
{/snippet}

{#snippet hintBlock()}
  <div class="solution-block">
    <div class="eyebrow">Hint</div>
    <div class="body" use:mathHtml={hint}></div>
  </div>
{/snippet}

{#snippet hintButton()}
  <button type="button" class="btn reveal-btn" onclick={() => (hintOpen = true)}>Show hint</button>
{/snippet}

{#snippet verdict(ok: boolean | null)}
  {#if ok === null}<p class="verdict skipped">Skipped</p>
  {:else}<p class="verdict" class:ok class:bad={!ok}><span aria-hidden="true">{ok ? '✓' : '✗'}</span><span>{ok ? 'Correct' : 'Incorrect'}</span></p>{/if}
{/snippet}

<div class="exercise" class:inline id={domId} data-book={book} {hidden}>
  <div class="eyebrow head">
    {#if number}<span>{number}</span>{/if}
    <span>{exerciseName(ex, kindName)}</span>
  </div>

  <div class="prompt"><p use:mathHtml={ex.prompt}></p></div>
  {#if credit}
    <p class="credit">From {#if credit.url}<a href={credit.url} target="_blank" rel="noopener">{credit.title}</a>{:else}{credit.title}{/if}{#if credit.author}, {credit.author}{/if}{#if credit.license}, {#if credit.license_url}<a href={credit.license_url} target="_blank" rel="noopener">{credit.license}</a>{:else}{credit.license}{/if}{/if}.{#if ex.changes} <AiTag /> Changed: <span use:mathHtml={ex.changes}></span>{/if}</p>
  {/if}
  {#if ex.figure}<figure class="photo"><img src={ex.figure.src} alt={ex.figure.alt}>{#if ex.figure.caption}<figcaption><span>{ex.figure.caption}</span></figcaption>{/if}</figure>{/if}

  {#if review}
    {#if a.type === 'choice'}
      <ol class="options">{#each a.options as o, i}<li class:right={i === a.correct}><span class="tick">{i === a.correct ? '✓' : ''}</span><span use:mathHtml={o}></span></li>{/each}</ol>
    {/if}
    {@render verdict(outcome)}
  {:else if a.type === 'choice'}
    <ChoiceAnswer answer={a} name="c-{section}-{ex.id}" locked={outcome} oncheck={(v: Verdict) => record(v.ok, false)} tools={inline ? undefined : scratchpad} />
    {#if completed && sol}{@render solution()}{/if}
  {:else if sol}
    {#if hintShown}{@render hintBlock()}{/if}
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
    {#if hintable}<div class="actions">{@render hintButton()}</div>{/if}
    <AiGrade {ex} {at} ongraded={onGraded} onfail={(why) => (gradeFailed = why)} />
  {:else if !review && ((!inline && a.type !== 'choice') || revealable || hintable)}
    <div class="actions">
      {#if !inline}{@render scratchpad()}{/if}
      {#if hintable}{@render hintButton()}{/if}
      {#if revealable}<button type="button" class="btn primary reveal-btn" onclick={() => (solutionOpen = true)}>Show solution</button>{/if}
    </div>
  {/if}

  {#if gradeFailed}<p class="note" role="status">Grading failed: {gradeFailed}</p>{/if}
  {#if !review && a.type !== 'choice' && !graded && recorded !== null}{@render verdict(recorded)}{/if}

  {#if !inline && !review && completed}
    <div class="follow">
      <button type="button" class="btn sm" onclick={discuss} onauxclick={onMiddle(discuss)}>{@html ICON.chat}Discuss with AI</button>
    </div>
  {/if}
  {#if !inline && linkedItems.length}
    <div class="linked">
      {#each linkedItems as l (l.key)}
        <span class="chip link-chip">
          <button type="button" class="open" onclick={(e) => openLink(l.key, e)} onauxclick={onMiddle((e) => openLink(l.key, e))}>{@html l.icon}<span>{l.name}</span></button>
        </span>
      {/each}
    </div>
  {/if}

  {#if ex.corrections?.some(noteShown)}
    <ol class="corrections" aria-label="Corrections">{#each ex.corrections as c, i}{#if noteShown(c)}<li><span class="n">[{i + 1}]</span><span use:mathHtml={c.html}></span></li>{/if}{/each}</ol>
  {/if}

  <details class="concepts" open={completed || solutionOpen}>
    <summary>Meta</summary>
    <!-- the concepts first, as bubbles in their kind's colour that open their card on hover; then where the exercise is from and what it asks for -->
    {#if ex.concepts.length}
      <div class="pills">
        {#each ex.concepts as c (c)}
          {@const k = concept(c)}
          <span class="pill kb k-{k?.kind ?? 'idea'}" data-book={book} data-concept={c}><span use:mathHtml={k?.name ?? c}></span></span>
        {/each}
      </div>
    {/if}
    <div class="meta eyebrow" title={creditLine}>
      <span>§ {sourceSection}</span>
      <span class="bloom" title={bloomHelp}>{titled(ex.bloom)}</span>
      {#if gen}<span><AiTag model={gen.model} text /></span>{:else}<span>from the book</span>{/if}
    </div>
    </details>
  {/if}

  {#if review}
    {#if sol}<details class="solution-fold" ontoggle={(e) => (foldOpen = e.currentTarget.open)}><summary>Solution</summary>{#if hint}{@render hintBlock()}{/if}{@render solution()}</details>{/if}
    {#if scratched || linked}
      <div class="actions"><button type="button" class="btn ghost sm" onclick={scratch} onauxclick={onMiddle(scratch)}>{@html ICON.drawing}Scratch work</button></div>
    {/if}
  {/if}
</div>

<style>
  .exercise{margin:0 0 12px;font-family:var(--sans);font-size:0.84rem;transition:box-shadow 120ms,padding-left 120ms}
  .exercise.inline{border:1px solid var(--rule);border-radius:6px;background:var(--panel);padding:14px 18px}
  .exercise[hidden]{display:none}
  .head{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px;margin-bottom:8px}
  .head>span+span::before{content:'·';margin-right:8px}
  .bloom{cursor:help}
  .prompt,.solution-block .body{font-family:var(--serif);font-size:1rem;line-height:1.6;max-width:68ch}
  .prompt :global(p){margin:0}
  .credit{margin:6px 0 0;font-size:0.74rem;color:var(--muted);max-width:68ch}
  .credit a{color:inherit}
  .prompt :global(table.data){border-collapse:collapse;font-family:var(--sans);font-size:0.84rem;margin:8px 0;font-variant-numeric:tabular-nums}
  .prompt :global(table.data th),.prompt :global(table.data td){border:1px solid var(--rule);padding:2px 10px;text-align:right}
  .actions{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px}
  .reveal-btn{margin-left:auto}
  .reveal-btn+.reveal-btn{margin-left:0}
  .tools{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px}
  .follow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}
  .linked{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
  .link-chip{gap:2px;padding:0 4px 0 8px;color:var(--ink)}
  .link-chip button{display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:0}
  .link-chip .x{width:18px;justify-content:center;color:var(--muted);border-radius:999px;transition:color 120ms}
  .link-chip .x:hover{color:var(--ink)}
  .link-chip button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .link-pick{position:relative;display:inline-flex;min-width:16rem}
  .link-pick .input{width:100%}
  .link-chip :global(svg),.follow :global(svg){width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
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
  /* a concept as a bubble in its kind's colour, in the words' own case; it opens its card on hover */
  .pill.kb{text-transform:none;letter-spacing:0;font-size:0.74rem;font-weight:500;line-height:1.5;padding:2px 10px;border-radius:999px;cursor:default}
  .pill :global(.katex){font-size:1em}
  .meta{display:flex;flex-wrap:wrap;gap:0 8px;margin-top:8px}
  .k-definition{--dot:var(--cm-definition)} .k-axiom{--dot:var(--cm-axiom)} .k-idea{--dot:var(--cm-idea)}
  .k-result{--dot:var(--cm-result)} .k-skill{--dot:var(--cm-skill)}
  .solution-fold>summary{font-weight:600}
  .corrections{list-style:none;margin:12px 0 0;padding:8px 0 0;border-top:1px solid var(--rule);font-size:0.78rem;color:var(--muted);max-width:68ch}
  .corrections li{display:flex;align-items:baseline;gap:0.45em}
  .corrections .n{flex:none;min-width:1.7em;color:var(--accent)}
</style>
