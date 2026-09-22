<script lang="ts">
  /* A page the model wrote, shown in a sandbox. The iframe is given the
     document itself rather than an address, and the only thing it is allowed to
     do is run scripts: no same-origin, so it cannot read this page, no forms
     and no navigation. It stands at a fixed height and may ask for more by
     posting `{ height }` to its parent, which is the one message it can send
     and the only one read.

     A widget still arriving is not mounted: a half-written document would run
     half a script, so the fence must close first. */
  import { heightOf, WIDGET_HEIGHT } from '../../lib/chat/widget';

  let { html, open }: { html: string; open: boolean } = $props();

  let frame = $state<HTMLIFrameElement | null>(null);
  let height = $state(WIDGET_HEIGHT);

  /* A message is this widget's only when it came from this frame's own window. */
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
  <div class="widget waiting">Writing a widget…</div>
{:else}
  <div class="widget">
    <iframe bind:this={frame} use:listen title="A widget written by the model" sandbox="allow-scripts" srcdoc={html} style:height="{height}px"></iframe>
  </div>
{/if}

<style>
  .widget{margin:10px 0;border:1px solid var(--rule);border-radius:8px;overflow:hidden;background:var(--panel)}
  .widget.waiting{padding:14px 16px;color:var(--muted);font-size:0.85rem}
  iframe{display:block;width:100%;border:0;background:#fff}
</style>
