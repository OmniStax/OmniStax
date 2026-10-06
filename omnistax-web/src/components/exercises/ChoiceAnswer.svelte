<script lang="ts">
  /* Once the reader has it right the answer stands: the options and the button close,
     so a second click cannot turn one correct answer into several. */
  import type { Snippet } from 'svelte';
  import type { AnswerDTO } from '../../lib/content/schema';
  import { checkChoice, type Verdict } from '../../lib/exercises/check';
  let { answer, name, oncheck, locked = null, tools }: { answer: Extract<AnswerDTO, { type: 'choice' }>; name: string; oncheck?: (v: Verdict) => void; locked?: boolean | null; tools?: Snippet } = $props();
  let picked = $state<number | null>(null); let verdict = $state<Verdict | null>(null);
  const done = $derived(locked !== null || verdict !== null);
  const check = () => { if (done) return; const v = checkChoice(picked, answer.correct, answer.hint); verdict = v; if (picked !== null) oncheck?.(v); };
  const ok = $derived(verdict ? verdict.ok : locked);
</script>

<div class="choices">
  {#each answer.options as o, i}<label><input type="radio" {name} value={i} disabled={done} onchange={() => (picked = i)}><span>{o}</span></label>{/each}
</div>
<div class="actions">{@render tools?.()}<button type="button" class="btn primary check" disabled={done || picked === null} onclick={check}>Check</button></div>
<div class="feedback" role="status" class:ok={ok === true} class:bad={ok === false}>
  {#if ok !== null}<span aria-hidden="true">{ok ? '✓' : '✗'}</span><span>{verdict?.text ?? (ok ? 'Correct' : 'Incorrect')}</span>{/if}
</div>

<style>
  .choices{display:flex;flex-direction:column;font-family:var(--sans);font-size:0.84rem;margin-top:8px}
  label{display:flex;gap:8px;align-items:center;padding:6px 0;cursor:pointer}
  label:has(input:disabled){cursor:default}
  input{accent-color:var(--ink);margin:0}
  .actions{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-top:12px}
  .check{margin-left:auto}
  .feedback{display:flex;align-items:baseline;gap:6px;font-family:var(--sans);font-size:0.84rem;font-weight:600;min-height:1.2em;margin-top:8px}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
