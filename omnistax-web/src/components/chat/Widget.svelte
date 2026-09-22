<script lang="ts">
  /* Scripts only: no same-origin, forms or navigation. The one message read is `{ height }`
     from this frame's own window; a still-open fence is not mounted, so no half script runs. */
  import { heightOf, WIDGET_HEIGHT } from '../../lib/chat/widget';

  let { html, open }: { html: string; open: boolean } = $props();

  let frame = $state<HTMLIFrameElement | null>(null);
  let height = $state(WIDGET_HEIGHT);

  const listen = (node: HTMLIFrameElement) => {
    const onmessage = (e: MessageEvent): void => {
      if (e.source !== node.contentWindow) return;
      const h = heightOf(e.data);
      if (h !== null) height = h;
    };
    window.addEventListener('message', onmessage);
    return { destroy: () => window.removeEventListener('message', onmessage) };
  };
</script>

{#if open}
  <div class="widget waiting">Building widget…</div>
{:else}
  <div class="widget">
    <iframe bind:this={frame} use:listen title="A widget written by the model" sandbox="allow-scripts" srcdoc={html} style:height="{height}px"></iframe>
  </div>
{/if}

<style>
  .widget{margin:10px 0;border:1px solid var(--rule);border-radius:10px;overflow:hidden;background:var(--panel)}
  .widget.waiting{padding:14px 16px;color:var(--muted);font-size:0.85rem}
  iframe{display:block;width:100%;border:0;background:#fff}
</style>
