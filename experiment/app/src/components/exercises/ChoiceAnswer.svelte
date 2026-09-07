<script lang="ts">
  import type { AnswerDTO } from '../../lib/content/schema';
  import { checkChoice, type Verdict } from '../../lib/exercises/check';
  let { answer, name }: { answer: Extract<AnswerDTO, { type: 'choice' }>; name: string } = $props();
  let picked = $state<number | null>(null); let verdict = $state<Verdict | null>(null);
</script>

<div class="choices">
  {#each answer.options as o, i}<label><input type="radio" {name} value={i} onchange={() => (picked = i)}><span>{o}</span></label>{/each}
</div>
<button type="button" class="btn" onclick={() => (verdict = checkChoice(picked, answer.correct, answer.hint))}>Check</button>
<div class="feedback" class:ok={verdict?.ok} class:bad={verdict && !verdict.ok}>{verdict?.text ?? ''}</div>

<style>
  .choices{display:flex;flex-direction:column;gap:4px;font-family:var(--sans);font-size:0.92rem;margin-bottom:8px}
  label{display:flex;gap:8px;align-items:center;cursor:pointer}
  .feedback{font-family:var(--sans);font-size:0.85rem;font-weight:600;min-height:1.2em}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
