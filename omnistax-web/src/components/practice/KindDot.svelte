<script lang="ts">
  let { kind }: { kind: string } = $props();
</script>

<i class="dot k-{kind}" aria-hidden="true"></i>

<style>
  .dot{flex:none;display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted)}
  .dot.k-definition{background:var(--cm-definition)}
  .dot.k-axiom{background:var(--cm-axiom)}
  .dot.k-idea{background:var(--cm-idea)}
  .dot.k-result{background:var(--cm-result)}
  .dot.k-skill{background:var(--cm-skill)}
</style>
