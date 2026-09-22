/* What the reader has settled under "AI": which provider they bring a key for,
   which model of it they want, the address of a host that speaks OpenAI's shape,
   and the keys themselves. It is all kept in this browser under
   `omnistax-ai-v1`; the keys are excluded from the backup, which carries the
   provider and the model and nothing that could be spent.

   The reading and the writing are apart: this module is pure, so the backup
   adapter can strip the keys out of a stored record without pulling a live
   store in with it, and `settings.svelte.ts` beside it is the store. */
import { DEFAULT_MODEL } from './providers/all';
import { PROVIDER_IDS, type AiSettings, type ProviderId } from './providers/index';

export const AI_KEY = 'omnistax-ai-v1';

const emptyKeys = (): Record<ProviderId, string> => ({ anthropic: '', openai: '', gemini: '', compatible: '' });
export const defaultAi = (): AiSettings => ({ provider: 'anthropic', models: { ...DEFAULT_MODEL }, baseUrl: '', keys: emptyKeys() });

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const byProvider = (raw: unknown, fallback: Readonly<Record<ProviderId, string>>): Record<ProviderId, string> => {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, str(o[id]) || fallback[id]])) as Record<ProviderId, string>;
};

/* The stored shape, leniently: anything missing takes its default, and a
   provider this version does not know is forgotten. */
export const parseAi = (raw: unknown): AiSettings => {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const provider = (PROVIDER_IDS as readonly string[]).includes(str(o.provider)) ? (o.provider as ProviderId) : 'anthropic';
  return { provider, models: byProvider(o.models, DEFAULT_MODEL), baseUrl: str(o.baseUrl), keys: byProvider(o.keys, emptyKeys()) };
};

/* What the backup carries: the same record with every key emptied. */
export const withoutKeys = (s: AiSettings): AiSettings => ({ ...s, keys: emptyKeys() });
