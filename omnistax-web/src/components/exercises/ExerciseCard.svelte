<script lang="ts">
  /* One exercise: the prompt, an answer widget chosen by the answer's type, and
     the book's solution or an AI-marked approach. What the problem is — its kind,
     its level and the concepts it tests — is folded away behind the small button
     at the top right, which opens a panel of chips; each concept chip pins the
     concept when clicked and opens a goto card when hovered. Beside it a second
     button opens this one problem in a split of its own; a card that is already
     standing in such a tab is `standalone` and does not offer it again.

     Every answer is recorded into the reader's practice, wherever the card stands:
     a card inside a section's text counts as much as one drawn by a session, and
     under the book it belongs to, which is the book being read unless a session
     drew the problem out of another one. A
     multiple choice is the one kind the card can mark itself, so the card records
     the widget's verdict. Everything else — a number, a set of parts, an open
     question — the reader marks: open the solution and the card asks whether you
     got it, and your own verdict is the attempt. Either way the card then says
     once what the answer earned. */
  import { registry } from '../../lib/sections/registry.svelte';
  import { pin } from '../../lib/sections/concepts.svelte';
  import { cite } from '../../lib/sections/nav.svelte';
  import { conceptId, exerciseDomId, exItem, itemKey, type SectionId } from '../../lib/types/ids';
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { solutionText, type Verdict } from '../../lib/exercises/check';
  import { pointsOf, type Attempt } from '../../lib/practice/model';
  import { practice } from '../../lib/practice/store.svelte';
  import { ICON } from '../../lib/icons';
  import { math, mathHtml } from '../actions/math';
  import NumberAnswer from './NumberAnswer.svelte';
  import MultiAnswer from './MultiAnswer.svelte';
  import ChoiceAnswer from './ChoiceAnswer.svelte';
  let { section, ex, hidden = false, standalone = false, book = registry.manifest.id }: { section: SectionId; ex: ExerciseDTO; hidden?: boolean; standalone?: boolean; book?: string } = $props();
  const kinds = $derived(registry.manifest.exerciseKinds);
  const hot = $derived(pin.pinned !== null && ex.concepts.includes(pin.pinned));
  /* Concepts are canonical across the library, so a problem drawn out of another
     book names them from wherever they are known; the passage behind the problem
     is not, so it is offered only while the card stands in the book being read. */
  const concept = (id: string) => practice.conceptOf(id);
  const reading = $derived(book === registry.manifest.id);
  const a = $derived(ex.answer);
  const domId = $derived(exerciseDomId(section, ex.id));
  const sol = $derived(solutionText(a));
  const nameOf = (id: string): string => practice.conceptOf(id)?.name ?? id;
  /* An answer goes into the practice store the moment it is marked, and the card says
     what came of it. The store refuses an exercise already answered correctly today,
     which is what a null attempt means: nothing was lost, it was simply counted once. */
  let earned = $state<string | null>(null);
  let selfDone = $state(false);
  let solutionOpen = $state(false);
  const said = (att: Attempt | null, ok: boolean): string =>
    att === null ? 'Already counted today.'
      : ok ? Object.entries(pointsOf(ex)).map(([id, p]) => `+${p} ${nameOf(id)}`).join(' · ')
      : `No points this time. The concepts it tests: ${ex.concepts.map(nameOf).join(', ')}.`;
  const record = (ok: boolean, self: boolean): void => { earned = said(practice.record(book, section, ex, ok, self), ok); };
  const selfCheck = (ok: boolean): void => { selfDone = true; record(ok, true); };
  /* The panel closes on a click outside the card and on Escape — unless a goto card is
     open, whose own Escape closes it first (this listener captures, so it sees the card before it goes). */
  let open = $state(false);
  let root = $state<HTMLElement | null>(null);
  $effect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { const t = e.target; if (!(t instanceof Node)) return; if (!root?.contains(t) && !(t instanceof Element && t.closest('.hover-card'))) open = false; };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.hover-card')) open = false; };
    document.addEventListener('pointerdown', down, true); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true); };
  });
</script>

<div class="exercise" class:hot class:standalone id={domId} {hidden} bind:this={root}>
  <button type="button" class="ex-info" aria-expanded={open} aria-controls="{domId}-meta" title="What this problem tests" onclick={() => (open = !open)}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></button>
  {#if !standalone}<button type="button" class="ex-split" data-split-key={itemKey(exItem(section, ex.id))} title="Open in a split" aria-label="Open exercise {ex.id} in a split">{@html ICON.split}</button>{/if}
  {#if open}
    <div class="meta" id="{domId}-meta" role="group" aria-label="What this problem tests">
      <div class="row">
        <span class="chip">{kinds[ex.kind] ?? ex.kind}</span>
        {#if ex.tag}<span class="chip">{ex.tag}</span>{/if}
        <span class="chip bloom">{ex.bloom}</span>
      </div>
      {#if ex.concepts.length}
        <div class="row"><span class="lab">Tests</span>
          {#each ex.concepts as c (c)}
            {@const k = concept(c)}
            <button type="button" class="chip concept k-{k?.kind ?? 'idea'}" class:hot={pin.pinned === c} data-concept={c} onclick={() => pin.toggle(conceptId(c))}><span use:math={k?.name}>{@html k?.name ?? c}</span></button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  <div class="prompt" use:math={ex.prompt}><p>{@html ex.prompt}</p></div>
  {#if ex.figure}<figure class="photo"><img src={ex.figure.src} alt={ex.figure.alt}>{#if ex.figure.caption}<figcaption><span>{ex.figure.caption}</span></figcaption>{/if}</figure>{/if}
  {#if a.type === 'number'}<NumberAnswer answer={a} />
  {:else if a.type === 'multi'}<MultiAnswer answer={a} />
  {:else if a.type === 'choice'}<ChoiceAnswer answer={a} name="c-{section}-{ex.id}" oncheck={(v: Verdict) => record(v.ok, false)} />{/if}
  {#if earned}<div class="earned" use:mathHtml={earned}></div>{/if}
  {#if (ex.cite && reading) || a.solution}
    <div class="foot">
      {#if ex.cite && reading}<button type="button" class="cite" onclick={() => cite(`${section}-${ex.cite}`)}>Show me the passage</button>{/if}
    </div>
  {/if}
  {#if sol}
    <details class="solution" ontoggle={(e) => (solutionOpen = e.currentTarget.open)}><summary>{a.type === 'open' ? 'Suggested approach' : 'Solution'} ({a.generated_by === 'ai' ? 'AI' : 'book'})</summary><div use:math={sol}>{@html sol}</div></details>
    {#if solutionOpen && a.type !== 'choice'}
      <div class="selfcheck"><span class="lead">Did you get it?</span>
        <button type="button" disabled={selfDone} onclick={() => selfCheck(true)}>Got it</button>
        <button type="button" disabled={selfDone} onclick={() => selfCheck(false)}>Missed it</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .exercise{position:relative;border:1px solid var(--rule);border-left:3px solid var(--warm);border-radius:6px;background:var(--panel);padding:12px 16px;margin:0 0 12px;font-size:0.97rem}
  .exercise.hot{border-color:var(--accent)}
  .exercise[hidden]{display:none}
  .ex-info,.ex-split{position:absolute;top:8px;width:26px;height:24px;display:grid;place-items:center;padding:0;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--muted);cursor:pointer}
  .ex-info{right:8px}
  .ex-split{right:38px}
  .ex-info:hover,.ex-split:hover{color:var(--ink);background:var(--soft)}
  .ex-info:focus-visible,.ex-split:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .ex-info[aria-expanded="true"]{color:var(--accent)}
  .ex-info svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}
  .ex-split :global(svg){width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}
  .meta{position:absolute;top:36px;right:8px;z-index:5;max-width:calc(100% - 16px);padding:8px 10px;background:var(--panel);border:1px solid var(--rule);border-radius:6px;box-shadow:0 8px 28px rgba(0,0,0,0.14),0 1px 3px rgba(0,0,0,0.08);font-family:var(--sans);font-size:0.72rem;display:flex;flex-direction:column;gap:6px}
  .meta .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .meta .lab{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)}
  .chip.bloom{background:color-mix(in srgb,var(--warm) 14%,transparent);color:var(--warm)}
  .chip.concept{font:inherit;border:1px solid transparent;cursor:pointer}
  .chip.concept.k-idea{background:var(--soft2)}
  .chip.concept.k-skill{font-style:italic;background:transparent;border-color:var(--rule)}
  .chip.concept.hot{border-color:var(--accent);color:var(--ink)}
  .chip.concept:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .prompt{margin-bottom:8px;padding-right:64px}
  .exercise.standalone .prompt{padding-right:34px}
  .prompt :global(p){margin:0}
  .prompt :global(table.data){border-collapse:collapse;font-family:var(--sans);font-size:0.85rem;margin:8px 0;font-variant-numeric:tabular-nums}
  .prompt :global(table.data th),.prompt :global(table.data td){border:1px solid var(--rule);padding:2px 10px;text-align:right}
  .foot{display:flex;gap:8px;align-items:center;margin-top:6px;font-family:var(--sans);font-size:0.88rem}
  .cite{font-family:var(--sans);font-size:0.8rem;color:var(--muted);text-decoration:underline dotted;cursor:pointer;background:none;border:0;padding:0}
  details.solution{font-family:var(--sans);font-size:0.9rem;margin-top:8px}
  details.solution summary{cursor:pointer;color:var(--muted);font-weight:600;font-size:0.8rem}
  details.solution > div{padding:6px 0 2px;font-family:var(--serif);font-size:0.95rem}
  .selfcheck{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;font-family:var(--sans);font-size:0.8rem}
  .selfcheck .lead{color:var(--muted)}
  .selfcheck button{font:inherit;font-size:0.76rem;font-weight:600;padding:3px 9px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--accent);cursor:pointer}
  .selfcheck button:hover{background:var(--soft)}
  .selfcheck button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .selfcheck button:disabled{color:var(--muted);background:var(--panel);cursor:default}
  .earned{margin-top:4px;font-family:var(--sans);font-size:0.8rem;color:var(--muted)}
</style>
