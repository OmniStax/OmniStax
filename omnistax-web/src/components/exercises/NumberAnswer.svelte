<script lang="ts">
  import type { AnswerDTO } from '../../lib/content/schema';
  import { checkNumber, type Verdict } from '../../lib/exercises/check';
  let { answer }: { answer: Extract<AnswerDTO, { type: 'number' }> } = $props();
  let raw = $state(''); let verdict = $state<Verdict | null>(null);
  const check = () => { verdict = checkNumber(raw, answer.value, answer.unit, answer.hint); };
</script>

<div class="row">
  {#if answer.part}<span class="part">{answer.part}</span>{/if}
  <input type="text" inputmode="decimal" placeholder="answer" aria-label="your answer" bind:value={raw} onkeydown={(e) => { if (e.key === 'Enter') check(); }}>
  <span class="unit">{answer.unit}</span>
  <button type="button" class="btn" onclick={check}>Check</button>
</div>
<div class="feedback" class:ok={verdict?.ok} class:bad={verdict && !verdict.ok}>{verdict?.text ?? ''}</div>

<style>
  .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:var(--sans);font-size:0.88rem}
  input{font:inherit;font-family:var(--mono);font-size:0.85rem;padding:5px 8px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink);width:9em}
  input:focus-visible{outline:2px solid var(--accent)}
  .unit{font-family:var(--mono);font-size:0.8rem;color:var(--muted)}
  .part{font-weight:600;min-width:1.6em}
  .feedback{font-family:var(--sans);font-size:0.85rem;font-weight:600;min-height:1.2em}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
