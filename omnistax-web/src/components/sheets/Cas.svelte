<script lang="ts">
  /* The calculator sheet: an integrand or a function typed as the book writes
     one, its antiderivative or derivative, and the working that reaches it.
     SymPy does the mathematics in a worker (lib/cas), loaded the first time the
     sheet opens; this file asks, draws the answer and nothing else. The address
     may hand it an expression (?expr=…), which is worked out on arrival. */
  import katex from 'katex';
  import { onMount } from 'svelte';
  import { sheets } from '../../lib/sheets/store.svelte';
  import { ask, exprOf, graphHref, pieces, type CasAnswer, type CasOp, type CasRequest, type CasStep } from '../../lib/cas/client';
  import type { CasSheetDTO } from '../../lib/content/sheets';
  import type { BookId } from '../../lib/types/ids';

  let { book, sheet }: { book: BookId; sheet: CasSheetDTO } = $props();

  let op = $state<CasOp>('integral');
  let text = $state('');
  let lower = $state('');
  let upper = $state('');
  let engine = $state<'loading' | 'ready' | 'failed'>('loading');
  let preview = $state('');
  let unread = $state('');
  let answer = $state<CasAnswer | null>(null);
  let failure = $state('');
  let working = $state(false);

  const tex = (s: string, display = false): string => katex.renderToString(s, { displayMode: display, throwOnError: false, strict: false, output: 'htmlAndMathml' });
  const request = (): CasRequest => ({ op, text, ...(op === 'integral' ? { lower, upper } : {}) });
  const grapher = $derived(sheets.entry(book, 'grapher'));

  /* Only the latest preview is drawn; an older one arriving late is dropped. */
  let asked = 0;
  $effect(() => {
    const q = request(), n = ++asked;
    if (q.text.trim() === '') { preview = ''; unread = ''; return; }
    const t = setTimeout(() => {
      ask({ ...q, preview: true }).then((r) => {
        if (n !== asked) return;
        engine = 'ready';
        if (r.ok) { preview = r.input; unread = ''; } else unread = r.error;
      }, () => { if (n === asked) engine = 'failed'; });
    }, 200);
    return () => clearTimeout(t);
  });

  const solve = (e?: SubmitEvent): void => {
    e?.preventDefault();
    if (text.trim() === '' || working) return;
    working = true; failure = '';
    ask(request()).then((r) => {
      engine = 'ready';
      if (r.ok && 'result' in r) answer = r; else { answer = null; failure = r.ok ? '' : r.error; }
    }, (err: Error) => { answer = null; failure = err.message; }).finally(() => { working = false; });
  };

  onMount(() => {
    const own = sheets.entry(book, sheet.id)?.url === location.pathname;
    const given = own ? exprOf(location.search) : null;
    if (given) { text = given; solve(); }
    else ask({ op, text: 'x', preview: true }).then(() => { engine = 'ready'; }, () => { engine = 'failed'; });
  });
</script>

{#snippet steps(list: readonly CasStep[])}
  <ol>
    {#each list as s, i (i)}
      <li>
        <p class="say">{#each pieces(s.say) as p, j (j)}{#if p.tex}{@html tex(p.s)}{:else}{p.s}{/if}{/each}</p>
        {#if s.math}<div class="math">{@html tex(s.math, true)}</div>{/if}
        {#if s.sub.length}{@render steps(s.sub)}{/if}
      </li>
    {/each}
  </ol>
{/snippet}

<div class="cas">
  <header><h1>{sheet.title}</h1></header>

  <form onsubmit={solve}>
    <div class="ops" role="group" aria-label="Operation">
      <button type="button" aria-pressed={op === 'integral'} onclick={() => (op = 'integral')}>Integral</button>
      <button type="button" aria-pressed={op === 'derivative'} onclick={() => (op = 'derivative')}>Derivative</button>
    </div>
    <div class="row">
      <label class="field expr"><span class="vh">{op === 'integral' ? 'Integrand' : 'Function'}</span>
        <input type="text" bind:value={text} placeholder="x e^x" autocomplete="off" spellcheck="false" autocapitalize="off" />
      </label>
      {#if op === 'integral'}
        <label class="field bound"><span>From</span><input type="text" bind:value={lower} autocomplete="off" spellcheck="false" /></label>
        <label class="field bound"><span>To</span><input type="text" bind:value={upper} autocomplete="off" spellcheck="false" /></label>
      {/if}
      <button type="submit" class="go" disabled={working || engine === 'failed' || text.trim() === ''}>{op === 'integral' ? 'Integrate' : 'Differentiate'}</button>
    </div>
    <div class="preview" aria-live="polite">
      {#if unread}<p class="note bad">{unread}</p>
      {:else if preview}{@html tex(preview, true)}
      {/if}
    </div>
  </form>

  {#if engine === 'loading'}<p class="note">Loading SymPy…</p>
  {:else if engine === 'failed'}<p class="note bad">Could not load SymPy.</p>
  {/if}
  {#if working && engine === 'ready'}<p class="note">Working…</p>{/if}
  {#if failure}<p class="note bad">{failure}</p>{/if}

  {#if answer && !working}
    <section class="answer">
      {#if answer.result}
        <div class="math result">{@html tex(answer.result, true)}</div>
      {:else}
        <p class="note">No closed form found.</p>
      {/if}
      {#if grapher && answer.graph.length}<p class="graph"><a href={graphHref(grapher.url, answer.graph)}>Graph</a></p>{/if}
      {#if answer.steps}
        <h2>Steps</h2>
        {@render steps(answer.steps)}
      {:else if answer.result}
        <p class="note">No step-by-step working available.</p>
      {/if}
    </section>
  {/if}
</div>

<style>
  .cas{font-family:var(--sans);max-width:52rem}
  h1{margin:0 0 10px;font-size:1.35rem}
  h2{margin:1.2rem 0 4px;font-size:1rem;font-weight:600}
  .ops{display:inline-flex;border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin-bottom:8px}
  .ops button{font:inherit;font-size:0.82rem;padding:4px 12px;border:0;background:var(--panel);color:var(--muted);cursor:pointer}
  .ops button + button{border-left:1px solid var(--rule)}
  .ops button[aria-pressed='true']{background:var(--soft2);color:var(--ink);font-weight:600}
  .ops button:focus-visible,.go:focus-visible,.field input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .row{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
  .field{display:flex;flex-direction:column;gap:2px;font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em}
  .field input{font:inherit;font-size:0.95rem;text-transform:none;letter-spacing:normal;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:6px 10px}
  .field.expr{flex:1 1 16rem}
  .field.expr input{font-family:var(--mono);font-size:0.9rem}
  .field.bound input{width:5.5rem;font-family:var(--mono);font-size:0.85rem}
  .go{font:inherit;font-size:0.85rem;font-weight:600;padding:7px 14px;border:0;border-radius:6px;background:var(--ink);color:var(--panel);cursor:pointer}
  .go:disabled{opacity:0.5;cursor:default}
  .preview{min-height:3.2rem;overflow-x:auto}
  .note{color:var(--muted);font-size:0.85rem;margin:6px 0}
  .note.bad{color:var(--bad)}
  .answer{border-top:1px solid var(--rule);margin-top:8px;padding-top:4px}
  .math{overflow-x:auto;overflow-y:hidden}
  .result{font-size:1.1em}
  .graph{margin:0;font-size:0.85rem}
  .graph a{color:var(--accent)}
  ol{margin:4px 0;padding-left:1.4rem}
  ol ol{padding-left:1.2rem;border-left:1px solid var(--rule);margin-left:0.2rem}
  li{margin:6px 0}
  .say{margin:0;font-size:0.9rem}
  .math :global(.katex-display){margin:0.4em 0}
  .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  @media (max-width:520px){
    .field.bound input{width:4.5rem}
  }
</style>
