/* OpenAI's chat completions, and with it every host that speaks the same
   shape — DeepSeek, OpenRouter, Mistral and a Local AI endpoint: the system
   prompt is the first turn, the deltas arrive under `choices[0].delta`, a
   tool call arrives in pieces keyed by its index, and `GET /v1/models` names
   what the key can ask for. */
import { dataUrlOf, errorOf, json, parseArgs, resultOf, roundsOf, sse, type ChatRequest, type Provider, type ProviderId, type StreamEvent, type Turn } from './index';

type Part = { readonly type: 'text'; readonly text: string } | { readonly type: 'image_url'; readonly image_url: { readonly url: string } };
type CallDTO = { readonly id: string; readonly type: 'function'; readonly function: { readonly name: string; readonly arguments: string } };
export type OpenAiMessageDTO =
  | { readonly role: 'system'; readonly content: string }
  | { readonly role: 'user'; readonly content: string | readonly Part[] }
  | { readonly role: 'assistant'; readonly content: string | null; readonly tool_calls?: readonly CallDTO[] }
  | { readonly role: 'tool'; readonly tool_call_id: string; readonly content: string };
export type OpenAiBodyDTO = {
  readonly model: string; readonly stream: true; readonly messages: readonly OpenAiMessageDTO[];
  readonly tools?: readonly { readonly type: 'function'; readonly function: { readonly name: string; readonly description: string; readonly parameters: unknown } }[];
};

const messagesOf = (t: Turn): readonly OpenAiMessageDTO[] => {
  if (t.role === 'user') {
    return [t.images.length
      ? { role: 'user', content: [...t.images.map((i): Part => ({ type: 'image_url', image_url: { url: dataUrlOf(i) } })), { type: 'text', text: t.text }] }
      : { role: 'user', content: t.text }];
  }
  return roundsOf(t.steps).flatMap((r): OpenAiMessageDTO[] => [
    r.calls.length
      ? { role: 'assistant', content: r.text.trim() ? r.text : null, tool_calls: r.calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) } })) }
      : { role: 'assistant', content: r.text },
    ...r.calls.map((c): OpenAiMessageDTO => ({ role: 'tool', tool_call_id: c.id, content: resultOf(c) })),
  ]);
};

export const bodyOf = (r: ChatRequest): OpenAiBodyDTO => ({
  model: r.model, stream: true,
  messages: [{ role: 'system', content: r.system }, ...r.turns.flatMap(messagesOf)],
  ...(r.tools.length ? { tools: r.tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
});

type DeltaDTO = { content?: unknown; tool_calls?: readonly { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] };
type Pending = { readonly id: string; readonly name: string; readonly args: string };

const auth = (key: string): Record<string, string> =>
  ({ 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) });

/* A local server may serve no key and no list; either way the reader can
   still type a model name. */
const listModels = async (r: { readonly key: string; readonly baseUrl: string }): Promise<readonly string[]> => {
  const response = await fetch(`${r.baseUrl}/v1/models`, { headers: auth(r.key) });
  if (!response.ok) throw new Error(await errorOf(response));
  const body: unknown = await response.json();
  const data = (body as { data?: readonly { id?: unknown }[] } | null)?.data ?? [];
  return data.flatMap((m) => (typeof m.id === 'string' ? [m.id] : [])).sort();
};

/* The pieces of the calls, folded by index as they arrive. */
export const foldCalls = (calls: ReadonlyMap<number, Pending>, delta: DeltaDTO): ReadonlyMap<number, Pending> =>
  (delta.tool_calls ?? []).reduce((acc, c) => {
    const at = c.index ?? 0;
    const was = acc.get(at) ?? { id: '', name: '', args: '' };
    return new Map(acc).set(at, { id: c.id || was.id, name: was.name + (c.function?.name ?? ''), args: was.args + (c.function?.arguments ?? '') });
  }, calls);

async function* streamFrom(r: ChatRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
  const response = await fetch(`${r.baseUrl}/v1/chat/completions`, { method: 'POST', signal, headers: auth(r.key), body: JSON.stringify(bodyOf(r)) });
  if (!response.ok) throw new Error(await errorOf(response));
  let calls: ReadonlyMap<number, Pending> = new Map();
  for await (const data of sse(response)) {
    const event = json(data); if (!event) continue;
    if (event.error) throw new Error(String((event.error as { message?: string }).message ?? 'the provider reported an error'));
    const delta = (event.choices as readonly { delta?: DeltaDTO }[] | undefined)?.[0]?.delta;
    if (!delta) continue;
    if (typeof delta.content === 'string' && delta.content !== '') yield { kind: 'text', text: delta.content };
    calls = foldCalls(calls, delta);
  }
  for (const [at, c] of [...calls].sort((a, b) => a[0] - b[0])) yield { kind: 'call', id: c.id || `call_${at}`, name: c.name, input: parseArgs(c.args) };
}

/* One implementation, worn under several names: the difference is only the
   address the settings hand it. */
export const openAiShaped = (id: ProviderId): Provider => ({ id, stream: streamFrom, models: listModels });

export const openai: Provider = openAiShaped('openai');
