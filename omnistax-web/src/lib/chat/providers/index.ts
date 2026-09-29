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
import { transcript, type Chat, type Step, type ToolStep } from '../model';

export const PROVIDER_IDS = ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'mistral', 'local'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
/* The providers a key is pasted for; Local AI holds endpoints instead. */
export type CloudId = Exclude<ProviderId, 'local'>;
export const CLOUD_IDS: readonly CloudId[] = PROVIDER_IDS.filter((p): p is CloudId => p !== 'local');

export const PROVIDER_LABEL: Readonly<Record<ProviderId, string>> = {
  anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Google Gemini', deepseek: 'DeepSeek', openrouter: 'OpenRouter', mistral: 'Mistral', local: 'Local AI',
};

export const KEY_URL: Readonly<Record<CloudId, string>> = {
  anthropic: 'https://console.anthropic.com/settings/keys', openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://aistudio.google.com/apikey', deepseek: 'https://platform.deepseek.com/api_keys',
  openrouter: 'https://openrouter.ai/keys', mistral: 'https://console.mistral.ai/api-keys',
};

export const DEFAULT_BASE: Readonly<Record<CloudId, string>> = {
  anthropic: 'https://api.anthropic.com', openai: 'https://api.openai.com', gemini: 'https://generativelanguage.googleapis.com',
  deepseek: 'https://api.deepseek.com', openrouter: 'https://openrouter.ai/api', mistral: 'https://api.mistral.ai',
};

export const trimBase = (url: string): string => url.trim().replace(/\/+$/, '').replace(/\/v1$/, '');

/* A model as the menu and a chat name it. A Local AI model is written
   `<endpoint id>/<model>`, since two endpoints may serve the same name. */
export type ModelPick = { readonly provider: ProviderId; readonly model: string };
export const samePick = (a: ModelPick | null | undefined, b: ModelPick | null | undefined): boolean =>
  !!a && !!b && a.provider === b.provider && a.model === b.model;
export const localPick = (endpoint: string, model: string): string => `${endpoint}/${model}`;
export const splitLocal = (model: string): { readonly endpoint: string; readonly model: string } => {
  const cut = model.indexOf('/');
  return cut < 0 ? { endpoint: '', model } : { endpoint: model.slice(0, cut), model: model.slice(cut + 1) };
};
/* The name the provider is asked for, and the one a bubble shows. */
export const modelName = (p: ModelPick): string => (p.provider === 'local' ? splitLocal(p.model).model : p.model);

/* Where and with what a pick is asked: settled from the settings, so a
   request carries nothing of them. */
export type Access = { readonly key: string; readonly baseUrl: string };

/* An image as a provider takes it: the bytes in base64 and their type. */
export type ImagePart = { readonly mime: string; readonly data: string };
export const imagePartOf = (dataUrl: string): ImagePart | null => {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  return m ? { mime: m[1], data: m[2] } : null;
};
export const dataUrlOf = (i: ImagePart): string => `data:${i.mime};base64,${i.data}`;

/* One turn as every provider means it, before each shapes it its own way. An
   answer keeps its steps, so a turn that called tools is sent back as the
   calls and their results. */
export type Turn =
  | { readonly role: 'user'; readonly text: string; readonly images: readonly ImagePart[] }
  | { readonly role: 'assistant'; readonly steps: readonly Step[] };

/* A tool as the model is told of it: a JSON Schema for its input. */
export type ToolSpec = { readonly name: string; readonly description: string; readonly parameters: Readonly<Record<string, unknown>> };

/* Everything one request needs and nothing of the app: a provider is handed
   this and can be run from a test with a fetch of its own. */
export type ChatRequest = {
  readonly provider: ProviderId;
  readonly model: string;
  readonly key: string;
  readonly baseUrl: string;
  readonly system: string;
  readonly turns: readonly Turn[];
  readonly tools: readonly ToolSpec[];
};

/* An answer's steps as rounds: the prose of one round and the calls it made.
   Each round but the last is followed by the results of its calls. */
export type Round = { readonly text: string; readonly calls: readonly ToolStep[] };
export const roundsOf = (steps: readonly Step[]): readonly Round[] =>
  steps.reduce<Round[]>((out, s) => {
    const last = out[out.length - 1];
    if (s.kind === 'tool') return last ? [...out.slice(0, -1), { ...last, calls: [...last.calls, s] }] : [{ text: '', calls: [s] }];
    return !last || last.calls.length ? [...out, { text: s.text, calls: [] }] : [...out.slice(0, -1), { ...last, text: last.text + s.text }];
  }, []);

/* What a tool call answered, as the model is shown it. */
export const resultOf = (s: ToolStep): string => s.error ? `Error: ${s.error}` : s.output ?? '';

/* Images keyed by the `asset:<id>` a chip holds, read before the request. */
export type Images = Readonly<Record<string, string>>;

export type RequestOptions = { readonly widgets: boolean; readonly tools: readonly ToolSpec[]; readonly images?: Images };

const chipImages = (chips: readonly Chip[], images: Images): readonly ImagePart[] =>
  chips.flatMap((c) => { const url = c.image ? images[c.image] : undefined; const part = url ? imagePartOf(url) : null; return part ? [part] : []; });

/* The body of a request, worked out from the chat alone: the turns are the
   transcript the reader is reading, each reader turn carrying the chips that
   were on it, and `chips` are the ones standing above the composer that the
   last reader turn has not been given yet. Pure, so what is sent can be
   checked without a network. */
export const requestOf = (chat: Chat, chips: readonly Chip[], pick: ModelPick, access: Access, o: RequestOptions): ChatRequest => {
  const path = transcript(chat);
  const lastAsk = [...path].reverse().find((m) => m.role === 'user');
  const images = o.images ?? {};
  const turns = path
    .filter((m) => (m.role === 'assistant' ? m.text.trim() !== '' || (m.steps?.length ?? 0) > 0 : true))
    .map((m): Turn => {
      if (m.role === 'assistant') return { role: 'assistant', steps: m.steps?.length ? m.steps : [{ kind: 'text', text: m.text }] };
      const all = m.id === lastAsk?.id ? [...m.chips, ...chips.filter((c) => !m.chips.some((x) => x.kind === c.kind && x.key === c.key))] : m.chips;
      return { role: 'user', text: askText(m.text, all), images: chipImages(all, images) };
    });
  return {
    provider: pick.provider, model: modelName(pick), key: access.key, baseUrl: trimBase(access.baseUrl),
    system: systemPrompt(o.widgets, o.tools.length > 0), turns, tools: o.tools,
  };
};

/* What a stream says: words of the answer, or a tool call whole. */
export type StreamEvent =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'call'; readonly id: string; readonly name: string; readonly input: unknown };

/* A provider: how it streams an answer, and what models it can name. */
export type Provider = {
  readonly id: ProviderId;
  stream(request: ChatRequest, signal: AbortSignal): AsyncIterable<StreamEvent>;
  models(request: ModelPick & Access): Promise<readonly string[]>;
};

/* A host that answers no browser fails the fetch itself rather than answering
   with a status, so a TypeError from fetch is that and is said in these words. */
export const CORS_MESSAGE = 'this host does not allow requests from a browser; run a local proxy or choose another';

export const failureOf = (e: unknown): string => {
  if (e instanceof TypeError) return CORS_MESSAGE;
  if (e instanceof DOMException && e.name === 'AbortError') throw e;
  return e instanceof Error ? e.message : String(e);
};

/* A refusal that names tools: the model takes none, and is asked again
   without them. */
export const rejectsTools = (message: string): boolean => /\btool|function[ _]?call/i.test(message);

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

/* A tool call's arguments as the stream spelled them; a model that wrote
   something unreadable is answered with an empty input and says so itself. */
export const parseArgs = (raw: string): unknown => {
  if (raw.trim() === '') return {};
  try { return JSON.parse(raw); } catch { return {}; }
};
