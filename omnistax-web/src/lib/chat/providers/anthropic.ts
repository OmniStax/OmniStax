/* Anthropic's messages API. The system prompt is a field of its own rather
   than a turn, the text of an answer arrives as `content_block_delta` events,
   and a tool call as a `tool_use` block whose input arrives in pieces. The
   browser header is the one Anthropic asks for before it will answer a page
   at all.

   The system prompt and the last reader turn carry `cache_control`, so two
   branches of one chat read their shared beginning from the cache. */
import { errorOf, json, parseArgs, resultOf, roundsOf, sse, type ChatRequest, type Provider, type StreamEvent, type Turn } from './index';

export const ANTHROPIC_VERSION = '2023-06-01';
export const MAX_TOKENS = 8192;

export const MODELS: readonly string[] = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-4-5'];

type Cache = { readonly cache_control?: { readonly type: 'ephemeral' } };
export type AnthropicBlockDTO = Cache & (
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image'; readonly source: { readonly type: 'base64'; readonly media_type: string; readonly data: string } }
  | { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: unknown }
  | { readonly type: 'tool_result'; readonly tool_use_id: string; readonly content: string; readonly is_error?: boolean });
export type AnthropicMessageDTO = { readonly role: 'user' | 'assistant'; readonly content: readonly AnthropicBlockDTO[] };
export type AnthropicBodyDTO = {
  readonly model: string; readonly max_tokens: number; readonly stream: true;
  readonly system: readonly AnthropicBlockDTO[]; readonly messages: readonly AnthropicMessageDTO[];
  readonly tools?: readonly { readonly name: string; readonly description: string; readonly input_schema: unknown }[];
};

const EPHEMERAL = { cache_control: { type: 'ephemeral' } } as const;

const messagesOf = (t: Turn): readonly AnthropicMessageDTO[] => {
  if (t.role === 'user') {
    return [{ role: 'user', content: [
      ...t.images.map((i): AnthropicBlockDTO => ({ type: 'image', source: { type: 'base64', media_type: i.mime, data: i.data } })),
      { type: 'text', text: t.text },
    ] }];
  }
  return roundsOf(t.steps).flatMap((r): AnthropicMessageDTO[] => {
    const said: AnthropicBlockDTO[] = [
      ...(r.text.trim() ? [{ type: 'text', text: r.text } as const] : []),
      ...r.calls.map((c): AnthropicBlockDTO => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input ?? {} })),
    ];
    const results: AnthropicBlockDTO[] = r.calls.map((c) => ({ type: 'tool_result', tool_use_id: c.id, content: resultOf(c), ...(c.error ? { is_error: true } : {}) }));
    return [...(said.length ? [{ role: 'assistant' as const, content: said }] : []), ...(results.length ? [{ role: 'user' as const, content: results }] : [])];
  });
};

/* Consecutive messages of one role are one message to Anthropic. */
const merged = (ms: readonly AnthropicMessageDTO[]): readonly AnthropicMessageDTO[] =>
  ms.reduce<AnthropicMessageDTO[]>((out, m) => {
    const last = out[out.length - 1];
    return last?.role === m.role ? [...out.slice(0, -1), { role: m.role, content: [...last.content, ...m.content] }] : [...out, m];
  }, []);

const cachedLastAsk = (ms: readonly AnthropicMessageDTO[]): readonly AnthropicMessageDTO[] => {
  const at = ms.map((m) => m.role).lastIndexOf('user');
  if (at < 0) return ms;
  const m = ms[at];
  const content = m.content.map((b, i) => (i === m.content.length - 1 ? { ...b, ...EPHEMERAL } : b));
  return ms.map((x, i) => (i === at ? { ...m, content } : x));
};

export const bodyOf = (r: ChatRequest): AnthropicBodyDTO => ({
  model: r.model, max_tokens: MAX_TOKENS, stream: true,
  system: [{ type: 'text', text: r.system, ...EPHEMERAL }],
  messages: cachedLastAsk(merged(r.turns.flatMap(messagesOf))),
  ...(r.tools.length ? { tools: r.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}),
});

const headers = (key: string): Record<string, string> =>
  ({ 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' });

type Open = { readonly id: string; readonly name: string; readonly json: string };

export const anthropic: Provider = {
  id: 'anthropic',
  async *stream(r: ChatRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
    const response = await fetch(`${r.baseUrl}/v1/messages`, { method: 'POST', signal, headers: headers(r.key), body: JSON.stringify(bodyOf(r)) });
    if (!response.ok) throw new Error(await errorOf(response));
    const open = new Map<number, Open>();
    for await (const data of sse(response)) {
      const event = json(data); if (!event) continue;
      if (event.type === 'error') throw new Error(String((event.error as { message?: string } | undefined)?.message ?? 'the provider reported an error'));
      const index = Number(event.index);
      if (event.type === 'content_block_start') {
        const block = event.content_block as { type?: string; id?: string; name?: string } | undefined;
        if (block?.type === 'tool_use') open.set(index, { id: String(block.id), name: String(block.name), json: '' });
        continue;
      }
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type?: string; text?: string; partial_json?: string } | undefined;
        if (delta?.type === 'text_delta' && delta.text) yield { kind: 'text', text: delta.text };
        const tool = open.get(index);
        if (delta?.type === 'input_json_delta' && tool) open.set(index, { ...tool, json: tool.json + (delta.partial_json ?? '') });
        continue;
      }
      if (event.type === 'content_block_stop') {
        const tool = open.get(index); if (!tool) continue;
        open.delete(index);
        yield { kind: 'call', id: tool.id, name: tool.name, input: parseArgs(tool.json) };
      }
    }
  },
  async models(r): Promise<readonly string[]> {
    const response = await fetch(`${r.baseUrl}/v1/models?limit=100`, { headers: headers(r.key) });
    if (!response.ok) throw new Error(await errorOf(response));
    const body: unknown = await response.json();
    const data = (body as { data?: readonly { id?: unknown }[] } | null)?.data ?? [];
    return data.flatMap((m) => (typeof m.id === 'string' ? [m.id] : []));
  },
};
