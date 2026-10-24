<script lang="ts">
  import AiMark from '../ui/AiMark.svelte';
  import { modelName, type ModelPick } from '../../lib/chat/providers/index';
  import { i18n } from '../../lib/i18n/store.svelte';

  let { model, text = false }: { model?: ModelPick; text?: boolean } = $props();
</script>

<span class="ai-tag"><AiMark byline={model ? i18n.t('practice.ai.generatedBy', { model: modelName(model) }) : undefined} />{#if text}<span class="words">{i18n.t('practice.ai.generated')}</span>{/if}</span>

<style>
  .ai-tag{display:inline-flex;align-items:baseline;gap:4px;vertical-align:baseline}
  .words{font-family:var(--sans);font-size:0.72rem;color:var(--muted)}
</style>
