<script lang="ts">
  import { stepLabel } from '../../lib/chat/tools';
  import type { Step, ToolStep } from '../../lib/chat/model';

  let { steps }: { steps: readonly Step[] } = $props();

  const tools = $derived(steps.filter((s): s is ToolStep => s.kind === 'tool'));
  const inputOf = (s: ToolStep): string => JSON.stringify(s.input ?? {}, null, 2);
</script>

{#if tools.length}
  <ul class="steps">
    {#each tools as s (s.id)}
      <li class:bad={!!s.error} class:running={s.output === undefined && !s.error}>
        <details>
          <summary>{stepLabel(s)}</summary>
          <pre class="io">{inputOf(s)}</pre>
          {#if s.error}<pre class="io">{s.error}</pre>{:else if s.output !== undefined}<pre class="io">{s.output}</pre>{/if}
        </details>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .steps{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:2px;font-family:var(--sans)}
  summary{cursor:pointer;font-size:0.8rem;color:var(--muted);padding:2px 0;list-style-position:inside}
  summary:hover{color:var(--ink)}
  .running summary{font-style:italic}
  .bad summary{color:var(--bad, #b42318)}
  .io{margin:4px 0 6px;max-height:16rem;overflow:auto;padding:8px 10px;background:var(--soft);border-radius:6px;font-size:0.76rem;white-space:pre-wrap;word-break:break-word}
</style>
