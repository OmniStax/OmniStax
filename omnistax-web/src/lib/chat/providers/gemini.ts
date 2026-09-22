/* Google's Gemini. The turns are `contents` with the assistant called
   "model", the system prompt is a `systemInstruction` of the same shape, and
   the stream is asked for with `alt=sse` so the deltas arrive as events rather
   than as one long JSON array. */
import { errorOf, json, sse, type ChatRequest, type Provider } from './index';

export const MODELS: readonly string[] = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];

export type GeminiContentDTO = { readonly role: 'user' | 'model'; readonly parts: readonly { readonly text: string }[] };
export type GeminiBodyDTO = { readonly contents: readonly GeminiContentDTO[]; readonly systemInstruction: { readonly parts: readonly { readonly text: string }[] } };

export const bodyOf = (r: ChatRequest): GeminiBodyDTO => ({
  contents: r.turns.map((t): GeminiContentDTO => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
  systemInstruction: { parts: [{ text: r.system }] },
});

const textOf = (event: Record<string, unknown>): string => {
  const candidate = (event.candidates as readonly { content?: { parts?: readonly { text?: unknown }[] } }[] | undefined)?.[0];
  return (candidate?.content?.parts ?? []).map((p) => (typeof p.text === 'string' ? p.text : '')).join('');
};

const version = 'v1beta';

export const gemini: Provider = {
  id: 'gemini',
  async *stream(r: ChatRequest, signal: AbortSignal): AsyncIterable<string> {
    const response = await fetch(`${r.baseUrl}/${version}/models/${encodeURIComponent(r.model)}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': r.key },
      body: JSON.stringify(bodyOf(r)),
    });
    if (!response.ok) throw new Error(await errorOf(response));
    for await (const data of sse(response)) {
      const event = json(data); if (!event) continue;
      const text = textOf(event);
      if (text !== '') yield text;
    }
  },
  /* The list names every model the key reaches, with the prefix the request
     does not want; a list that cannot be had leaves the ones in code. */
  async models(r: ChatRequest): Promise<readonly string[]> {
    const response = await fetch(`${r.baseUrl}/${version}/models`, { headers: { 'x-goog-api-key': r.key } });
    if (!response.ok) throw new Error(await errorOf(response));
    const body: unknown = await response.json();
    const models = (body as { models?: readonly { name?: unknown }[] } | null)?.models ?? [];
    return models.flatMap((m) => (typeof m.name === 'string' ? [m.name.replace(/^models\//, '')] : [])).sort();
  },
};
