<script lang="ts">
  /* A fold whose contents are drawn the first time it opens and kept after:
     a book's worth of rows folded away costs nothing until it is read. */
  import type { Snippet } from 'svelte';
  type Props = { open?: boolean; class?: string; summary: Snippet; children: Snippet };
  let { open = false, class: cls = '', summary, children }: Props = $props();
  let opened = $state(false);
  const drawn = $derived(open || opened);
</script>

<details class={cls} {open} ontoggle={(e) => { if (e.currentTarget.open) opened = true; }}>
  <summary>{@render summary()}</summary>
  {#if drawn}{@render children()}{/if}
</details>
