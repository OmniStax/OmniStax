<script lang="ts">
  import { practice } from '../../lib/practice/store.svelte';
  import { plain } from '../../lib/practice/labels';

  type Props = { id: string; ondone: () => void };
  let { id, ondone }: Props = $props();

  const own = $derived(practice.self[id]);
  const target = $derived(practice.settings.masteryTarget);
  const levels = $derived(Array.from({ length: Math.max(0, target - 1) }, (_, i) => i + 1));
  const value = $derived(own ? (own.mastered ? 'mastered' : String(own.level)) : 'none');
  const name = $derived(plain(practice.conceptOf(id)?.name ?? id));
  const stale = $derived(!!own?.mastered && practice.available(id) === 0 && practice.freshness(id).due);

  const setValue = (v: string): void => {
    if (v === 'none') { practice.clearSelf(id); return; }
    const mastered = v === 'mastered';
    practice.setSelf(id, mastered ? target : Number(v), mastered, mastered && !!own?.noDecay);
  };
</script>

<div class="override">
  <select class="input" aria-label={`Progress for ${name}`} {value} onchange={(e) => setValue(e.currentTarget.value)}>
    <option value="none">Use exercise history</option>
    <option value="0">Unpracticed</option>
    {#each levels as level (level)}<option value={String(level)}>{level}/{target}</option>{/each}
    <option value="mastered">Mastered</option>
  </select>
  <label class="decay" title="Only for overridden mastery">
    <input type="checkbox" disabled={!own?.mastered} checked={!!own?.mastered && !!own.noDecay} onchange={(e) => practice.setSelf(id, target, true, e.currentTarget.checked)}>
    No decay
  </label>
  {#if stale}
    <button type="button" class="btn sm" onclick={() => practice.manualReview(id, true)}>Still mastered</button>
    <button type="button" class="btn sm" onclick={() => practice.manualReview(id, false)}>Needs review</button>
  {/if}
  <button type="button" class="btn ghost sm done" onclick={ondone}>Done</button>
</div>

<style>
  .override { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: var(--soft); }
  .override select { width: auto; }
  .decay { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; color: var(--ink); }
  .decay input { accent-color: var(--ink); }
  .decay:has(input:disabled) { color: var(--muted); }
  .done { margin-left: auto; }
</style>
