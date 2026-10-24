<script lang="ts">
  /* A concept's kind as the small coloured bubble every list uses. */
  import { KIND_LABEL } from '../../lib/sections/reference';
  import type { ConceptKind } from '../../lib/content/schema';
  let { kind }: { kind: string } = $props();
  const label = $derived(KIND_LABEL[kind as ConceptKind] ?? kind);
</script>

<i class="kb k-{kind}">{label}</i>
