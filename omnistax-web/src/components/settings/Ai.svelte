<script lang="ts">
  /* The AI block of the settings: which provider the reader brings a key for,
     the key itself, and the model to ask. Everything here stays in this
     browser, and the key is the one thing a backup leaves behind — it is said
     plainly in the block, because a reader pasting a key deserves to be told
     where it goes.

     The model is a list and a field: the list is what the provider names, asked
     for with the key where a provider will answer, and the field takes any name
     at all, since a model released this morning is in no list. */
  import { ai } from '../../lib/chat/settings.svelte';
  import { PROVIDER_IDS, PROVIDER_LABEL, baseOf, failureOf, type ProviderId } from '../../lib/chat/providers/index';
  import { FIXED_MODELS, providerOf } from '../../lib/chat/providers/all';

  let { hit }: { hit: (text: string) => boolean } = $props();

  const WORDS = 'AI assistant chat provider Anthropic OpenAI Gemini key model API bring your own';

  const id = $derived(ai.provider);
  let listed = $state.raw<Readonly<Record<string, readonly string[]>>>({});
  let asking = $state(false);
  let trouble = $state('');

  const models = $derived([...new Set([...FIXED_MODELS[id], ...(listed[id] ?? [])])]);

  /* The list a provider will give, which needs the key and the address it is
     asked at; a provider with a list of its own in code is never asked. */
  const askModels = async (): Promise<void> => {
    asking = true; trouble = '';
    try {
      const request = { provider: id, model: ai.model, key: ai.value.keys[id] ?? '', baseUrl: baseOf(ai.value, id), system: '', turns: [] };
      listed = { ...listed, [id]: await providerOf(id).models(request) };
    } catch (e) { trouble = failureOf(e); }
    finally { asking = false; }
  };
</script>

<section hidden={!hit(WORDS)}>
  <h3>AI</h3>
  <p class="hint">Bring your own key. Nothing leaves this browser but the request to the provider you choose, and no key ever reaches OmniStax. A backup carries the provider and the model you picked and not the keys.</p>

  <div class="row">
    <span class="name">Provider</span>
    <span class="hint">Which host answers your questions. “OpenAI-compatible” is for a server you run yourself or another host that speaks the same API.</span>
    <select aria-label="Provider" value={id} onchange={(e) => ai.setProvider(e.currentTarget.value as ProviderId)}>
      {#each PROVIDER_IDS as p (p)}<option value={p}>{PROVIDER_LABEL[p]}</option>{/each}
    </select>
  </div>

  {#if id === 'compatible'}
    <label class="row">
      <span class="name">Base URL</span>
      <span class="hint">Where that server stands, without a path: http://localhost:11434/v1 becomes http://localhost:11434.</span>
      <input type="url" placeholder="http://localhost:1234" value={ai.value.baseUrl} onchange={(e) => ai.setBaseUrl(e.currentTarget.value.trim())}>
    </label>
  {/if}

  <label class="row">
    <span class="name">{PROVIDER_LABEL[id]} key</span>
    <span class="hint">Kept in this browser only. A server of your own may need none.</span>
    <input type="password" autocomplete="off" placeholder="paste your key" value={ai.value.keys[id] ?? ''} onchange={(e) => ai.setKey(id, e.currentTarget.value.trim())}>
  </label>

  <div class="row">
    <span class="name">Model</span>
    <span class="hint">Choose one, or type the name of any other the key can reach.</span>
    <div class="model">
      {#if models.length}
        <select aria-label="Model" value={models.includes(ai.model) ? ai.model : ''} onchange={(e) => { if (e.currentTarget.value) ai.setModel(id, e.currentTarget.value); }}>
          <option value="">Another…</option>
          {#each models as m (m)}<option value={m}>{m}</option>{/each}
        </select>
      {/if}
      <input type="text" aria-label="Model name" placeholder="model name" value={ai.model} onchange={(e) => ai.setModel(id, e.currentTarget.value.trim())}>
      <button class="btn-sm" type="button" disabled={asking} onclick={() => void askModels()}>{asking ? 'Asking…' : 'List models'}</button>
    </div>
  </div>

  {#if trouble}<p class="bad" role="alert">The models could not be listed: {trouble}.</p>{/if}
</section>

<style>
  section{margin-top:18px}
  h3{margin:0 0 6px;font-size:0.95rem}
  .hint{color:var(--muted);font-size:0.8rem;margin:0 0 8px}
  .row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:4px 12px;padding:8px 0;border-top:1px solid var(--rule)}
  .row .name{font-size:0.9rem}
  .row .hint{grid-column:1;margin:0;font-size:0.78rem}
  .row select,.row input,.model{grid-column:2;grid-row:1 / span 2}
  .model{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  input,select{font:inherit;font-size:0.85rem;padding:3px 7px;border:1px solid var(--rule);border-radius:5px;background:var(--panel);color:var(--ink);min-width:12rem}
  .bad{color:var(--bad, #b42318);font-size:0.8rem;margin:6px 0 0}
</style>
