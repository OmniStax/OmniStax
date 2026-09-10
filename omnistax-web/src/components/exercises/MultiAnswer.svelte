<script lang="ts">
  /* Several numeric parts on one card: the book's (a) (b) (c) problems. */
  import type { AnswerDTO } from '../../lib/content/schema';
  import { untrack } from 'svelte';
  import { checkNumber, type Verdict } from '../../lib/exercises/check';
  let { answer }: { answer: Extract<AnswerDTO, { type: 'multi' }> } = $props();
  const n = untrack(() => answer.parts.length);
  let raw = $state<string[]>(Array.from({ length: n }, () => ''));
  let verdicts = $state<Array<Verdict | null>>(Array.from({ length: n }, () => null));
  const check = (i: number) => { const p = answer.parts[i]; verdicts[i] = checkNumber(raw[i], p.value, p.unit, p.hint, true); };
</script>

{#each answer.parts as p, i (p.part)}
  <div class="row">
    <span class="part">{p.part}</span>
    <input type="text" inputmode="decimal" placeholder="answer" aria-label="answer to part {p.part}" bind:value={raw[i]} onkeydown={(e) => { if (e.key === 'Enter') check(i); }}>
    <span class="unit">{p.unit}</span>
    <button type="button" class="btn" onclick={() => check(i)}>Check</button>
    <span class="feedback" class:ok={verdicts[i]?.ok} class:bad={verdicts[i] && !verdicts[i]?.ok}>{verdicts[i]?.text ?? ''}</span>
  </div>
{/each}

<style>
  .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-family:var(--sans);font-size:0.88rem;margin-bottom:4px}
  input{font:inherit;font-family:var(--mono);font-size:0.85rem;padding:5px 8px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink);width:9em}
  input:focus-visible{outline:2px solid var(--accent)}
  .unit{font-family:var(--mono);font-size:0.8rem;color:var(--muted)}
  .part{font-weight:600;min-width:1.6em}
  .feedback{font-size:0.85rem;font-weight:600}
  .feedback.ok{color:var(--ok)} .feedback.bad{color:var(--bad)}
</style>
