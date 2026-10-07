<script lang="ts" module>
  /* A public list is fetched once a page, however often the settings open. */
  const fetchedPublic = new Set<string>();
  export const AI_WORDS = 'AI assistant chat provider Anthropic OpenAI Gemini DeepSeek OpenRouter Mistral Local AI Ollama LM Studio endpoint base URL key model API inline HTML widget backup';
</script>

<script lang="ts">
  /* The AI block of the settings: a card per provider with its key, the
     models it lists and a field for one it does not, each ticked or not for
     the chat's model menu; the Local AI endpoints; and whether answers may
     render inline HTML. The key stays in this browser and out of backups, and
     the block says so, because a reader pasting a key deserves to know where
     it goes. */
  import { untrack } from 'svelte';
  import { ai } from '../../lib/chat/settings.svelte';
  import { MODEL_CAP, cardModels, isShown, visibleModels } from '../../lib/chat/settings';
  import { CLOUD_IDS, DEFAULT_BASE, KEY_URL, PROVIDER_LABEL, PUBLIC_LIST, failureOf, localPick, trimBase, type CloudId } from '../../lib/chat/providers/index';
  import { providerOf } from '../../lib/chat/providers/all';

  let busy = $state.raw<Readonly<Record<string, boolean>>>({});
  let trouble = $state.raw<Readonly<Record<string, string>>>({});
  const mark = (k: string, on: boolean, why = ''): void => { busy = { ...busy, [k]: on }; trouble = { ...trouble, [k]: why }; };

  const listCloud = async (id: CloudId): Promise<void> => {
    const key = ai.value.keys[id]; if (!key && !PUBLIC_LIST.has(id)) return;
    mark(id, true);
    try { ai.setListed(id, await providerOf(id).models({ provider: id, model: '', key, baseUrl: DEFAULT_BASE[id] })); mark(id, false); }
    catch (e) { mark(id, false, failureOf(e)); }
  };
  const setKey = (id: CloudId, key: string): void => { ai.setKey(id, key); void listCloud(id); };
  $effect(() => untrack(() => {
    for (const id of PUBLIC_LIST) if (!fetchedPublic.has(id)) { fetchedPublic.add(id); void listCloud(id); }
  }));

  const listLocal = async (endpoint: string): Promise<void> => {
    const e = ai.value.endpoints.find((x) => x.id === endpoint); if (!e) return;
    mark(endpoint, true);
    try {
      const found = await providerOf('local').models({ provider: 'local', model: '', key: '', baseUrl: trimBase(e.baseUrl) });
      ai.editEndpoint(endpoint, { models: [...new Set([...e.models, ...found])] });
      mark(endpoint, false);
    } catch (err) { mark(endpoint, false, failureOf(err)); }
  };
  const addLocalModel = (endpoint: string, model: string): void => {
    const e = ai.value.endpoints.find((x) => x.id === endpoint); const m = model.trim(); if (!e || !m) return;
    if (!e.models.includes(m)) ai.editEndpoint(endpoint, { models: [...e.models, m] });
    if (!isShown(ai.value, { provider: 'local', model: localPick(endpoint, m) })) ai.toggle({ provider: 'local', model: localPick(endpoint, m) });
  };

  let filters = $state.raw<Readonly<Record<string, string>>>({});
  let expanded = $state.raw<ReadonlySet<string>>(new Set());

  let newName = $state('');
  let newUrl = $state('');
  const addEndpoint = (): void => {
    if (!newUrl.trim()) return;
    const id = ai.addEndpoint(newName, newUrl);
    newName = ''; newUrl = '';
    void listLocal(id);
  };

  const onEnter = (f: (v: string) => void) => (e: KeyboardEvent): void => {
    if (e.key !== 'Enter') return;
    const input = e.currentTarget as HTMLInputElement;
    f(input.value); input.value = '';
  };
</script>

<p class="hint">Use your own API keys. Requests go straight from this browser to the provider. OmniStax never sees your keys, and backups leave them out. Tick the models to offer in chat.</p>

  <label class="row switch">
    <span class="name">Inline HTML rendering</span>
    <span class="hint">Answers can include a small interactive page, run in a sandbox.</span>
    <input type="checkbox" checked={ai.inlineHtml} onchange={(e) => ai.setInlineHtml(e.currentTarget.checked)}>
  </label>

  {#each CLOUD_IDS as id (id)}
    {@const models = cardModels(ai.value, id)}
    {@const ticked = (m: string) => isShown(ai.value, { provider: id, model: m })}
    {@const capped = visibleModels(models, ticked, filters[id] ?? '', false)}
    {@const all = expanded.has(id)}
    {@const shown = all ? visibleModels(models, ticked, filters[id] ?? '', true) : capped}
    <div class="card" data-ai-card={id}>
      <div class="head">
        <span class="name">{PROVIDER_LABEL[id]}</span>
        <a href={KEY_URL[id]} target="_blank" rel="noopener noreferrer">Get a key</a>
      </div>
      <input type="password" autocomplete="off" aria-label="{PROVIDER_LABEL[id]} key" placeholder="Paste your key"
        value={ai.value.keys[id]} onchange={(e) => setKey(id, e.currentTarget.value.trim())}>
      {#if models.length > MODEL_CAP}
        <input type="search" class="filter" aria-label="Filter {PROVIDER_LABEL[id]} models" placeholder="Filter models"
          value={filters[id] ?? ''} oninput={(e) => (filters = { ...filters, [id]: e.currentTarget.value })}>
      {/if}
      <ul class="models">
        {#each shown.rows as m (m)}
          <li><label><input type="checkbox" checked={isShown(ai.value, { provider: id, model: m })} onchange={() => ai.toggle({ provider: id, model: m })}> {m}</label></li>
        {/each}
        {#if capped.rows.length < capped.found}
          <li>
            {#if all}<button type="button" class="all" onclick={() => (expanded = new Set([...expanded].filter((x) => x !== id)))}>Show fewer</button>
            {:else}<button type="button" class="all" onclick={() => (expanded = new Set([...expanded, id]))}>Show all {shown.found}</button>{/if}
          </li>
        {/if}
      </ul>
      <div class="tail">
        <input type="text" aria-label="Add a {PROVIDER_LABEL[id]} model" placeholder="Add a model" onkeydown={onEnter((v) => ai.addModel(id, v))}>
        {#if ai.value.keys[id] || PUBLIC_LIST.has(id)}
          <button type="button" class="btn-sm" disabled={busy[id]} onclick={() => void listCloud(id)}>{busy[id] ? 'Loading…' : 'Refresh list'}</button>
        {/if}
      </div>
      {#if trouble[id]}<p class="bad" role="alert">Couldn’t list models: {trouble[id]}.</p>{/if}
    </div>
  {/each}

  <div class="card" data-ai-card="local">
    <div class="head"><span class="name">Local AI</span></div>
    <p class="hint">Any server that answers <code>POST /v1/chat/completions</code> with streamed events and allows browser requests: Ollama with <code>OLLAMA_ORIGINS</code>, LM Studio with CORS on, llama.cpp or vLLM with their CORS flags. Chrome and Firefox reach <code>http://localhost</code> from this site; Safari does not.</p>
    {#each ai.value.endpoints as e (e.id)}
      <div class="endpoint">
        <div class="tail">
          <input type="text" aria-label="Endpoint name" value={e.name} onchange={(v) => ai.editEndpoint(e.id, { name: v.currentTarget.value.trim() || 'Local' })}>
          <input type="url" aria-label="Endpoint URL" value={e.baseUrl} onchange={(v) => ai.editEndpoint(e.id, { baseUrl: v.currentTarget.value.trim() })}>
          <button type="button" class="btn-sm" disabled={busy[e.id]} onclick={() => void listLocal(e.id)}>{busy[e.id] ? 'Loading…' : 'Fetch models'}</button>
          <button type="button" class="btn-sm" onclick={() => ai.removeEndpoint(e.id)}>Remove</button>
        </div>
        <ul class="models">
          {#each e.models as m (m)}
            <li><label><input type="checkbox" checked={isShown(ai.value, { provider: 'local', model: localPick(e.id, m) })} onchange={() => ai.toggle({ provider: 'local', model: localPick(e.id, m) })}> {m}</label></li>
          {/each}
        </ul>
        <input type="text" aria-label="Add a model to {e.name}" placeholder="Add a model" onkeydown={onEnter((v) => addLocalModel(e.id, v))}>
        {#if trouble[e.id]}<p class="bad" role="alert">Couldn’t list models: {trouble[e.id]}.</p>{/if}
      </div>
    {/each}
    <div class="tail">
      <input type="text" aria-label="New endpoint name" placeholder="Name" bind:value={newName}>
      <input type="url" aria-label="New endpoint URL" placeholder="http://localhost:11434" bind:value={newUrl}>
      <button type="button" class="btn-sm" disabled={!newUrl.trim()} onclick={addEndpoint}>Add endpoint</button>
    </div>
  </div>

<style>
  .card{padding:10px 0;border-top:1px solid var(--rule);display:flex;flex-direction:column;gap:6px}
  .head{display:flex;align-items:baseline;gap:10px}
  .head a{font-size:0.78rem;color:var(--accent)}
  .models{display:flex;flex-wrap:wrap;gap:2px 14px;margin:0;padding:0;list-style:none;font-size:0.82rem}
  .models label{display:inline-flex;align-items:center;gap:5px;cursor:pointer}
  .tail{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .endpoint{display:flex;flex-direction:column;gap:6px;padding:6px 0 8px;border-bottom:1px dashed var(--rule)}
  input[type="text"],input[type="url"],input[type="password"]{min-width:10rem}
  input[type="password"]{max-width:24rem}
  .filter{max-width:16rem}
  .all{font:inherit;font-size:0.82rem;color:var(--accent);background:none;border:0;padding:0;cursor:pointer}
  code{font-size:0.95em}
  .bad{color:var(--bad, #b42318);font-size:0.8rem;margin:0}
</style>
