/* The providers the reader may bring a key for, behind one interface. Each of
   them streams server-sent events and each of them shapes its body differently,
   so the differences live one to a file and everything they share lives here:
   what a request is, how the turns of a chat become one, how an SSE body is
   read line by line, and what is said when a host will not answer a browser.

   The key never leaves this module's callers: the request goes straight from
   the reader's browser to the provider they chose, and OmniStax's own server is
   not in it. */
import { askText, type Chip } from '../context';
import { systemPrompt } from '../prompt';
import { transcript, type Chat, type Role } from '../model';

export const PROVIDER_IDS = ['anthropic', 'openai', 'gemini', 'compatible'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
export const PROVIDER_LABEL: Readonly<Record<ProviderId, string>> = {
  anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini', compatible: 'OpenAI-compatible',
};

/* What the reader has settled in Settings. The keys are kept apart from the
   choice so that the backup can carry the choice and leave the keys behind. */
export type AiChoice = { readonly provider: ProviderId; readonly models: Readonly<Record<ProviderId, string>>; readonly baseUrl: string };
export type AiSettings = AiChoice & { readonly keys: Readonly<Record<ProviderId, string>> };

/* One turn as every provider means it, before each shapes it its own way. */
export type Turn = { readonly role: Role; readonly text: string };

/* Everything one request needs and nothing of the app: a provider is handed
   this and can be run from a test with a fetch of its own. */
export type ChatRequest = {
  readonly provider: ProviderId;
  readonly model: string;
  readonly key: string;
  readonly baseUrl: string;
  readonly system: string;
  readonly turns: readonly Turn[];
};

/* Where each provider lives when the reader has not said otherwise. The
   OpenAI-compatible one has no default: it is the field the reader fills in. */
export const DEFAULT_BASE: Readonly<Record<ProviderId, string>> = {
  anthropic: 'https://api.anthropic.com', openai: 'https://api.openai.com', gemini: 'https://generativelanguage.googleapis.com', compatible: '',
};

export const baseOf = (s: AiChoice, id: ProviderId): string =>
  (id === 'compatible' ? s.baseUrl : DEFAULT_BASE[id]).replace(/\/+$/, '');

/* The body of a request, worked out from the chat alone: the turns are the
   transcript the reader is reading, each reader turn carrying the chips that
   were on it, and `chips` are the ones standing above the composer that the
   last reader turn has not been given yet. Pure, so what is sent can be
   checked without a network. */
export const requestOf = (chat: Chat, chips: readonly Chip[], s: AiSettings, widgets = false): ChatRequest => {
  const path = transcript(chat);
  const lastAsk = [...path].reverse().find((m) => m.role === 'user');
  const turns = path
    .filter((m) => m.role === 'assistant' ? m.text.trim() !== '' : true)
    .map((m): Turn => ({
      role: m.role,
      text: m.role === 'user' ? askText(m.text, m.id === lastAsk?.id ? [...m.chips, ...chips.filter((c) => !m.chips.some((x) => x.kind === c.kind && x.key === c.key))] : m.chips) : m.text,
    }));
  return { provider: s.provider, model: s.models[s.provider] ?? '', key: s.keys[s.provider] ?? '', baseUrl: baseOf(s, s.provider), system: systemPrompt(widgets), turns };
};

/* A provider: how it streams an answer, and what models it can name. A
   provider that cannot be asked for a list says so with an empty one and the
   reader types the name themselves. */
export type Provider = {
  readonly id: ProviderId;
  stream(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>;
  models(request: ChatRequest): Promise<readonly string[]>;
};

/* A host that answers no browser fails the fetch itself rather than answering
   with a status, so a TypeError from fetch is that and is said in these words. */
export const CORS_MESSAGE = 'this host does not allow requests from a browser; run a local proxy or choose another';

export const failureOf = (e: unknown): string => {
  if (e instanceof TypeError) return CORS_MESSAGE;
  if (e instanceof DOMException && e.name === 'AbortError') throw e;
  return e instanceof Error ? e.message : String(e);
};

/* The body of a bad answer, cut short: a provider says why in its own shape,
   and the reader is better served by its words than by a status number alone. */
export const errorOf = async (r: Response): Promise<string> => {
  const text = await r.text().catch(() => '');
  const message = ((): string => {
    try {
      const body: unknown = JSON.parse(text);
      const e = (body as { error?: { message?: string } } | null)?.error;
      return typeof e?.message === 'string' ? e.message : '';
    } catch { return ''; }
  })();
  return message || `${r.status} ${r.statusText}`.trim() || 'the request was refused';
};

/* Every `data:` line of an SSE body, in order. A line of `[DONE]` ends it,
   which is OpenAI's way of saying so and harmless to the others. */
export async function* sse(response: Response): AsyncIterable<string> {
  const body = response.body;
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        if (data !== '') yield data;
      }
    }
  } finally { reader.cancel().catch(() => {}); }
}

/* One event as JSON, or nothing when a provider sends a keep-alive or a shape
   this version does not know. */
export const json = (data: string): Record<string, unknown> | null => {
  try { const v: unknown = JSON.parse(data); return typeof v === 'object' && v !== null ? v as Record<string, unknown> : null; }
  catch { return null; }
};
