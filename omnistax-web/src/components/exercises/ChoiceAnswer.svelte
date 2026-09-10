<script lang="ts">
  /* The one answer the app can mark on its own. Whoever holds the card hears every
     check through `oncheck`, which is how an answer becomes a recorded attempt. Once
     the reader has it right the answer stands: the options and the button close, so a
     second click cannot turn one correct answer into several. */
  import type { AnswerDTO } from '../../lib/content/schema';
  import { checkChoice, type Verdict } from '../../lib/exercises/check';
  let { answer, name, oncheck }: { answer: Extract<AnswerDTO, { type: 'choice' }>; name: string; oncheck?: (v: Verdict) => void } = $props();
  let picked = $state<number | null>(null); let verdict = $state<Verdict | null>(null);
  const done = $derived(verdict?.ok === true);
  const check = () => { const v = checkChoice(picked, answer.correct, answer.hint); verdict = v; oncheck?.(v); };
</script>

<div class="choices">
  {#each answer.options as o, i}<label><input type="radio" {name} value={i} disabled={done} onchange={() => (picked = i)}><span>{o}</span></label>{/each}
</div>
<button type="button" class="btn" disabled={done} onclick={check}>Check</button>
<div class="feedback" class:ok={verdict?.ok} class:bad={verdict && !verdict.ok}>{verdict?.text ?? ''}</div>

<style>
  .choices{display:flex;flex-direction:column;gap:4px;font-family:var(--sans);font-size:0.92rem;margin-bottom:8px}
  label{display:flex;gap:8px;align-items:center;cursor:pointer}
  label:has(input:disabled){cursor:default}
  .btn:disabled{color:var(--muted);cursor:default;background:var(--panel)}
  .feedback{font-family:var(--sans);font-size:0.85rem;font-weight:600;min-height:1.2em}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
