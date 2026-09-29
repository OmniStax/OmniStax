/* Google's Gemini. The turns are `contents` with the assistant called
   "model", the system prompt is a `systemInstruction` of the same shape, a
   tool call is a `functionCall` part that arrives whole, and the stream is
   asked for with `alt=sse` so the deltas arrive as events rather than as one
   long JSON array. */
import { errorOf, json, resultOf, roundsOf, sse, type ChatRequest, type Provider, type StreamEvent, type Turn } from './index';

export const MODELS: readonly string[] = ['gemini-2.5-pro', 'gemini-2.5-flash'];

type PartDTO =
  | { readonly text: string }
  | { readonly inlineData: { readonly mimeType: string; readonly data: string } }
  | { readonly functionCall: { readonly id?: string; readonly name: string; readonly args: unknown } }
  | { readonly functionResponse: { readonly id?: string; readonly name: string; readonly response: { readonly content: string } } };
export type GeminiContentDTO = { readonly role: 'user' | 'model'; readonly parts: readonly PartDTO[] };
export type GeminiBodyDTO = {
  readonly contents: readonly GeminiContentDTO[];
  readonly systemInstruction: { readonly parts: readonly { readonly text: string }[] };
  readonly tools?: readonly { readonly functionDeclarations: readonly { readonly name: string; readonly description: string; readonly parameters: unknown }[] }[];
};

const contentsOf = (t: Turn): readonly GeminiContentDTO[] => {
  if (t.role === 'user') return [{ role: 'user', parts: [...t.images.map((i): PartDTO => ({ inlineData: { mimeType: i.mime, data: i.data } })), { text: t.text }] }];
  return roundsOf(t.steps).flatMap((r): GeminiContentDTO[] => {
    const said: PartDTO[] = [...(r.text.trim() ? [{ text: r.text }] : []), ...r.calls.map((c): PartDTO => ({ functionCall: { id: c.id, name: c.name, args: c.input ?? {} } }))];
    const answered = r.calls.map((c): PartDTO => ({ functionResponse: { id: c.id, name: c.name, response: { content: resultOf(c) } } }));
    return [...(said.length ? [{ role: 'model' as const, parts: said }] : []), ...(answered.length ? [{ role: 'user' as const, parts: answered }] : [])];
  });
};

export const bodyOf = (r: ChatRequest): GeminiBodyDTO => ({
  contents: r.turns.flatMap(contentsOf),
  systemInstruction: { parts: [{ text: r.system }] },
  ...(r.tools.length ? { tools: [{ functionDeclarations: r.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }] } : {}),
});

type EventPartDTO = { text?: unknown; functionCall?: { id?: string; name?: string; args?: unknown } };
const partsOf = (event: Record<string, unknown>): readonly EventPartDTO[] =>
  (event.candidates as readonly { content?: { parts?: readonly EventPartDTO[] } }[] | undefined)?.[0]?.content?.parts ?? [];

const version = 'v1beta';

export const gemini: Provider = {
  id: 'gemini',
  async *stream(r: ChatRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
    const response = await fetch(`${r.baseUrl}/${version}/models/${encodeURIComponent(r.model)}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': r.key },
      body: JSON.stringify(bodyOf(r)),
    });
    if (!response.ok) throw new Error(await errorOf(response));
    let n = 0;
    for await (const data of sse(response)) {
      const event = json(data); if (!event) continue;
      for (const p of partsOf(event)) {
        if (typeof p.text === 'string' && p.text !== '') yield { kind: 'text', text: p.text };
        if (p.functionCall?.name) yield { kind: 'call', id: p.functionCall.id || `call_${n++}`, name: p.functionCall.name, input: p.functionCall.args ?? {} };
      }
    }
  },
  /* The list names every model the key reaches, with the prefix the request
     does not want. */
  async models(r): Promise<readonly string[]> {
    const response = await fetch(`${r.baseUrl}/${version}/models`, { headers: { 'x-goog-api-key': r.key } });
    if (!response.ok) throw new Error(await errorOf(response));
    const body: unknown = await response.json();
    const models = (body as { models?: readonly { name?: unknown }[] } | null)?.models ?? [];
    return models.flatMap((m) => (typeof m.name === 'string' ? [m.name.replace(/^models\//, '')] : [])).sort();
  },
};
