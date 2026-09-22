<script lang="ts">
  /* A tab for something the shell can already name but cannot yet draw. The
     seams for files, drawings, chats and single exercises land before the
     features do, so a key that parses opens a pane rather than an empty one,
     and the pane says plainly what it is standing in for. Each feature
     replaces this mount with its own component as it arrives. */
  let { kind, id }: { kind: string; id: string } = $props();
</script>

<article class="stand-in" data-kind={kind} data-id={id}>
  <div class="eyebrow">{kind}</div>
  <p>This is a {kind}. Nothing draws one yet, so its tab stands empty until the feature that shows it arrives.</p>
  <p class="id">{id}</p>
</article>

<style>
  .stand-in{max-width:520px;margin:0 auto;padding:64px 40px;font-family:var(--sans);color:var(--muted);text-align:center}
  .eyebrow{font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase}
  .stand-in p{margin:10px 0 0;font-size:0.92rem;line-height:1.5}
  .id{font-family:var(--mono, ui-monospace, monospace);font-size:0.8rem;opacity:0.75}
</style>
