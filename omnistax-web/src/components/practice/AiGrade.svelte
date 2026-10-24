<script lang="ts">
  import type { ExerciseDTO } from '../../lib/content/schema';
  import { gradeAnswer } from '../../lib/practice/ai.svelte';
  import type { Graded } from '../../lib/practice/grade';
  import { hasScratch, openScratch, type ScratchAt } from '../../lib/practice/scratch.svelte';
  import { layoutStore } from '../../lib/layout/store.svelte';
  import { openingOf } from '../../lib/sections/nav.svelte';
  import { i18n } from '../../lib/i18n/store.svelte';
  import { ICON } from '../../lib/icons';

  let { ex, at, ongraded, onfail }: { ex: ExerciseDTO; at: ScratchAt; ongraded: (g: Graded, answer: string) => void; onfail: (why: string) => void } = $props();

  let text = $state('');
  let attached = $state(false);
  let waiting = $state(false);
  const attach = (e: MouseEvent): void => { attached = true; void openScratch(at, layoutStore.layout.focus, openingOf(e)); };
  const canSend = $derived(!waiting && (text.trim() !== '' || (attached && hasScratch(at))));

  const submit = async (): Promise<void> => {
    if (!canSend) return;
    waiting = true;
    try { ongraded(await gradeAnswer(ex, text, attached ? at : null, new AbortController().signal), text.trim()); }
    catch (e) { onfail(e instanceof Error ? e.message : String(e)); }
    finally { waiting = false; }
  };
</script>

<div class="ai-grade">
  <textarea class="input" rows="3" placeholder={i18n.t('practice.grade.placeholder')} aria-label={i18n.t('practice.grade.placeholder')} bind:value={text} disabled={waiting}></textarea>
  <div class="row">
    {#if attached}
      <span class="attached">{i18n.t('practice.grade.attached')} <button type="button" class="x" aria-label={i18n.t('practice.grade.detach')} onclick={() => (attached = false)}>×</button></span>
    {:else}
      <button type="button" class="btn ghost sm" onclick={attach}>{@html ICON.drawing}{i18n.t('practice.grade.attach')}</button>
    {/if}
    <button type="button" class="btn primary" disabled={!canSend} aria-busy={waiting} onclick={submit}>{#if waiting}<span class="spin" aria-hidden="true"></span>{i18n.t('practice.grade.grading')}{:else}{i18n.t('practice.grade.submit')}{/if}</button>
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
