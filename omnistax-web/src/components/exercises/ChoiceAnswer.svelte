<script lang="ts">
  /* The one answer the app can mark on its own. Whoever holds the card hears every
     check through `oncheck`, which is how an answer becomes a recorded attempt. Once
     the reader has it right the answer stands: the options and the button close, so a
     second click cannot turn one correct answer into several. */
  import type { Snippet } from 'svelte';
  import type { AnswerDTO } from '../../lib/content/schema';
  import { checkChoice, type Verdict } from '../../lib/exercises/check';
  let { answer, name, oncheck, locked = null, tools }: { answer: Extract<AnswerDTO, { type: 'choice' }>; name: string; oncheck?: (v: Verdict) => void; locked?: boolean | null; tools?: Snippet } = $props();
  let picked = $state<number | null>(null); let verdict = $state<Verdict | null>(null);
  const done = $derived(locked !== null || verdict !== null);
  const check = () => { if (done) return; const v = checkChoice(picked, answer.correct, answer.hint); verdict = v; if (picked !== null) oncheck?.(v); };
</script>

<div class="choices">
  {#each answer.options as o, i}<label><input type="radio" {name} value={i} disabled={done} onchange={() => (picked = i)}><span>{o}</span></label>{/each}
</div>
<div class="actions">{@render tools?.()}<button type="button" class="btn" disabled={done || picked === null} onclick={check}>Check</button></div>
<div class="feedback" class:ok={verdict?.ok || locked === true} class:bad={(verdict && !verdict.ok) || locked === false}>{verdict?.text ?? (locked === true ? 'Correct' : locked === false ? 'Incorrect' : '')}</div>

<style>
  .choices{display:flex;flex-direction:column;gap:4px;font-family:var(--sans);font-size:0.92rem;margin-bottom:8px}
  label{display:flex;gap:8px;align-items:center;cursor:pointer}
  label:has(input:disabled){cursor:default}
  .btn:disabled{color:var(--muted);cursor:default;background:var(--panel)}
  .actions{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px}
  .feedback{font-family:var(--sans);font-size:0.85rem;font-weight:600;min-height:1.2em}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
