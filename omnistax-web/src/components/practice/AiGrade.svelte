<script lang="ts">
  /* The reader's answer, in words and on the scratchpad, sent to the model
     that grades it. The card hears the verdict, or the failure that hands the
     item back to Reveal and check. */
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
  <textarea rows="3" placeholder="Your answer or working" aria-label="Your answer or working" bind:value={text} disabled={waiting}></textarea>
  <div class="row">
    {#if attached}
      <span class="attached">Scratchpad attached <button type="button" class="x" aria-label="Detach scratchpad" onclick={() => (attached = false)}>×</button></span>
    {:else}
      <button type="button" class="tool" onclick={attach}>Attach scratchpad</button>
    {/if}
    <button type="button" class="btn" disabled={!canSend} aria-busy={waiting} onclick={submit}>{#if waiting}<span class="spin" aria-hidden="true"></span>Grading…{:else}Submit{/if}</button>
  </div>
</div>

<style>
  .ai-grade{display:flex;flex-direction:column;gap:8px;margin-top:10px;font-family:var(--sans)}
  textarea{font:inherit;font-size:0.85rem;padding:7px 9px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink);resize:vertical}
  textarea:focus-visible{outline:2px solid var(--accent);outline-offset:-1px}
  .row{display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap}
  .tool{font:inherit;font-size:0.74rem;color:var(--muted);background:transparent;border:1px solid var(--rule);border-radius:6px;padding:3px 9px;cursor:pointer}
  .tool:hover{color:var(--ink);background:var(--soft)}
  .attached{font-size:0.74rem;color:var(--ink)}
  .x{font:inherit;border:0;background:none;color:var(--muted);cursor:pointer;padding:0 2px}
  .btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:0.78rem;font-weight:650;padding:6px 11px;border:1px solid var(--rule);border-radius:7px;background:var(--panel);color:var(--ink);cursor:pointer}
  .btn:disabled{color:var(--muted);cursor:default}
  .btn:focus-visible,.tool:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
  .spin{width:10px;height:10px;border:2px solid var(--rule);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
