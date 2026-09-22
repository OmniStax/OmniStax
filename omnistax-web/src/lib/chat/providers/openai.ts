/* OpenAI's chat completions, and with it every host that speaks the same
   shape: the system prompt is the first turn, the deltas arrive under
   `choices[0].delta.content`, and `GET /v1/models` names what the key can ask
   for. `compatible.ts` is this provider under another address. */
import { errorOf, json, sse, type ChatRequest, type Provider, type ProviderId } from './index';

export type OpenAiMessageDTO = { readonly role: 'system' | 'user' | 'assistant'; readonly content: string };
export type OpenAiBodyDTO = { readonly model: string; readonly stream: true; readonly messages: readonly OpenAiMessageDTO[] };

export const bodyOf = (r: ChatRequest): OpenAiBodyDTO => ({
  model: r.model, stream: true,
  messages: [{ role: 'system', content: r.system }, ...r.turns.map((t): OpenAiMessageDTO => ({ role: t.role, content: t.text }))],
});

const deltaOf = (event: Record<string, unknown>): string => {
  const choice = (event.choices as readonly { delta?: { content?: unknown } }[] | undefined)?.[0];
  return typeof choice?.delta?.content === 'string' ? choice.delta.content : '';
};

const auth = (r: ChatRequest): Record<string, string> =>
  ({ 'content-type': 'application/json', ...(r.key ? { authorization: `Bearer ${r.key}` } : {}) });

/* A local server may serve no key and no list; either way the reader still
   types a model name, so a list that cannot be had is simply empty. */
const listModels = async (r: ChatRequest): Promise<readonly string[]> => {
  const response = await fetch(`${r.baseUrl}/v1/models`, { headers: auth(r) });
  if (!response.ok) throw new Error(await errorOf(response));
  const body: unknown = await response.json();
  const data = (body as { data?: readonly { id?: unknown }[] } | null)?.data ?? [];
  return data.flatMap((m) => (typeof m.id === 'string' ? [m.id] : [])).sort();
};

async function* streamFrom(r: ChatRequest, signal: AbortSignal): AsyncIterable<string> {
  const response = await fetch(`${r.baseUrl}/v1/chat/completions`, { method: 'POST', signal, headers: auth(r), body: JSON.stringify(bodyOf(r)) });
  if (!response.ok) throw new Error(await errorOf(response));
  for await (const data of sse(response)) {
    const event = json(data); if (!event) continue;
    const text = deltaOf(event);
    if (text !== '') yield text;
  }
}

/* One implementation, worn under two names: the difference is only the address
   the settings hand it. */
export const openAiShaped = (id: ProviderId): Provider => ({ id, stream: streamFrom, models: listModels });

export const openai: Provider = openAiShaped('openai');
