/* Anthropic's messages API. The system prompt is a field of its own rather
   than a turn, and the text of an answer arrives as `content_block_delta`
   events. The browser header is the one Anthropic asks for before it will
   answer a page at all. */
import { errorOf, json, sse, type ChatRequest, type Provider } from './index';

export const ANTHROPIC_VERSION = '2023-06-01';
export const MAX_TOKENS = 4096;

/* The models worth naming, newest first; the reader may type any other name
   into the field beside the list, since a model list is not worth a key. */
export const MODELS: readonly string[] = ['claude-fable-5-1', 'claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'];

export type AnthropicBodyDTO = {
  readonly model: string; readonly max_tokens: number; readonly stream: true;
  readonly system: string; readonly messages: readonly { readonly role: 'user' | 'assistant'; readonly content: string }[];
};

export const bodyOf = (r: ChatRequest): AnthropicBodyDTO => ({
  model: r.model, max_tokens: MAX_TOKENS, stream: true, system: r.system,
  messages: r.turns.map((t) => ({ role: t.role, content: t.text })),
});

const textOf = (event: Record<string, unknown>): string => {
  if (event.type !== 'content_block_delta') return '';
  const delta = event.delta as { type?: string; text?: string } | undefined;
  return delta?.type === 'text_delta' && typeof delta.text === 'string' ? delta.text : '';
};

export const anthropic: Provider = {
  id: 'anthropic',
  async *stream(r: ChatRequest, signal: AbortSignal): AsyncIterable<string> {
    const response = await fetch(`${r.baseUrl}/v1/messages`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': r.key, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify(bodyOf(r)),
    });
    if (!response.ok) throw new Error(await errorOf(response));
    for await (const data of sse(response)) {
      const event = json(data); if (!event) continue;
      if (event.type === 'error') throw new Error(String((event.error as { message?: string } | undefined)?.message ?? 'the provider reported an error'));
      const text = textOf(event);
      if (text !== '') yield text;
    }
  },
  /* Anthropic's list needs the key and adds nothing the fixed list does not
     already say, so the picker stands on the list in code. */
  models: async (): Promise<readonly string[]> => MODELS,
};
