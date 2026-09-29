<script lang="ts">
  /* The AI mark as a component. Its markup is the one the build writes into the
     static pages, so the reader meets the same glyph wherever a thing was generated. */
  import { aiMarkHtml } from './aimark';

  let { byline }: { byline?: string } = $props();
</script>

{@html aiMarkHtml(byline)}
