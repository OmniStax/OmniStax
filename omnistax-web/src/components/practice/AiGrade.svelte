<script lang="ts">
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { gradeAnswer } from '../../lib/practice/ai.svelte';
  import type { Graded } from '../../lib/practice/grade';
  import { hasScratch, openScratch, type ScratchAt } from '../../lib/practice/scratch.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';

  let { ex, at, ongraded, onfail }: { ex: ExerciseDTO; at: ScratchAt; ongraded: (g: Graded) => void; onfail: (why: string) => void } = $props();

  let text = $state('');
  let attached = $state(false);
  let waiting = $state(false);
  const attach = (): void => { attached = true; openScratch(at, layoutStore.layout.focus); };
  const canSend = $derived(!waiting && (text.trim() !== '' || (attached && hasScratch(at))));

  const submit = async (): Promise<void> => {
    if (!canSend) return;
    waiting = true;
    try { ongraded(await gradeAnswer(ex, text, attached ? at : null, new AbortController().signal)); }
    catch (e) { onfail(e instanceof Error ? e.message : String(e)); }
    finally { waiting = false; }
  };
</script>

<div class="ai-grade">
  <textarea class="input" rows="3" placeholder="Your answer or working" aria-label="Your answer or working" bind:value={text} disabled={waiting}></textarea>
  <div class="row">
    {#if attached}
      <span class="attached">Scratchpad attached <button type="button" class="x" aria-label="Detach scratchpad" onclick={() => (attached = false)}>×</button></span>
    {:else}
      <button type="button" class="btn ghost sm" onclick={attach}>Attach scratchpad</button>
    {/if}
    <button type="button" class="btn primary" disabled={!canSend} aria-busy={waiting} onclick={submit}>{#if waiting}<span class="spin" aria-hidden="true"></span>Grading…{:else}Submit{/if}</button>
  </div>
</div>

<style>
  .ai-grade{display:flex;flex-direction:column;gap:8px;margin-top:12px;font-family:var(--sans)}
  textarea.input{height:auto;padding:8px 10px;font-family:var(--sans);resize:vertical}
  .row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
  .row>:last-child{margin-left:auto}
  .attached{font-size:0.78rem;color:var(--ink)}
  .x{font:inherit;min-width:24px;min-height:24px;border:0;border-radius:6px;background:none;color:var(--muted);cursor:pointer;padding:0 4px;transition:background 120ms}
  .x:hover{background:var(--soft);color:var(--ink)}
  .x:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .spin{display:inline-block;width:10px;height:10px;margin-right:6px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
