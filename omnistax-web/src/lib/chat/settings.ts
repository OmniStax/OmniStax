/* What the reader has settled under "AI": a key per provider, the models each
   card lists and which of them the chat's menu shows, the Local AI endpoints,
   the model last chosen, and whether answers may render inline HTML. It is
   all kept in this browser under `omnistax-ai-v1`; the keys are excluded from
   the backup.

   The reading and the writing are apart: this module is pure, so the backup
   adapter can strip the keys out of a stored record without pulling a live
   store in with it, and `settings.svelte.ts` beside it is the store. */
import { DEFAULT_MODEL, FIXED_MODELS } from './providers/all';
import {
  CLOUD_IDS, DEFAULT_BASE, PROVIDER_IDS, PROVIDER_LABEL, localPick, samePick, splitLocal,
  type Access, type CloudId, type ModelPick, type ProviderId,
} from './providers/index';

export const AI_KEY = 'omnistax-ai-v1';

export type EndpointId = string;
export type Endpoint = { readonly id: EndpointId; readonly name: string; readonly baseUrl: string; readonly models: readonly string[] };

export type AiSettings = {
  readonly keys: Readonly<Record<CloudId, string>>;
  readonly listed: Readonly<Record<CloudId, readonly string[]>>;   /* what the provider's models endpoint named */
  readonly added: Readonly<Record<CloudId, readonly string[]>>;    /* what the reader typed */
  readonly shown: readonly ModelPick[];                             /* ticked: what the chat's menu lists */
  readonly endpoints: readonly Endpoint[];
  readonly last: ModelPick | null;
  readonly inlineHtml: boolean;
};

const perCloud = <T>(f: (id: CloudId) => T): Record<CloudId, T> => Object.fromEntries(CLOUD_IDS.map((id) => [id, f(id)])) as Record<CloudId, T>;
const emptyKeys = (): Record<CloudId, string> => perCloud(() => '');
const defaultShown = (): readonly ModelPick[] => CLOUD_IDS.flatMap((provider) => (DEFAULT_MODEL[provider] ? [{ provider, model: DEFAULT_MODEL[provider] }] : []));

export const defaultAi = (): AiSettings => ({
  keys: emptyKeys(), listed: perCloud(() => []), added: perCloud(() => []), shown: defaultShown(), endpoints: [],
  last: { provider: 'anthropic', model: DEFAULT_MODEL.anthropic }, inlineHtml: true,
});

const obj = (raw: unknown): Record<string, unknown> => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strs = (v: unknown): readonly string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x !== ''))] : []);
const isProvider = (v: unknown): v is ProviderId => (PROVIDER_IDS as readonly unknown[]).includes(v);
const pickOf = (raw: unknown): ModelPick | null => {
  const o = obj(raw);
  const provider = o.provider === 'compatible' ? 'local' : o.provider;
  return isProvider(provider) && str(o.model) ? { provider, model: str(o.model) } : null;
};
const parseEndpoint = (raw: unknown): Endpoint | null => {
  const o = obj(raw);
  return str(o.id) && str(o.baseUrl) ? { id: str(o.id), name: str(o.name) || 'Local', baseUrl: str(o.baseUrl), models: strs(o.models) } : null;
};

/* The first shape kept one provider, one model each and one address; it is
   read as that provider's model ticked and chosen, and the address as an
   endpoint. */
const LEGACY_ENDPOINT = 'local';
const fromLegacy = (o: Record<string, unknown>): AiSettings => {
  const base = defaultAi();
  const models = obj(o.models);
  const keys = obj(o.keys);
  const baseUrl = str(o.baseUrl);
  const localModel = str(models.compatible);
  const endpoints: readonly Endpoint[] = baseUrl ? [{ id: LEGACY_ENDPOINT, name: 'Local', baseUrl, models: localModel ? [localModel] : [] }] : [];
  const provider = o.provider === 'compatible' ? 'local' : isProvider(o.provider) ? o.provider : 'anthropic';
  const chosen = provider === 'local' ? (baseUrl && localModel ? { provider, model: localPick(LEGACY_ENDPOINT, localModel) } : null) : str(models[provider]) ? { provider, model: str(models[provider]) } : null;
  const added = perCloud((id) => { const m = str(models[id]); return m && !FIXED_MODELS[id].includes(m) ? [m] : []; });
  return {
    ...base, keys: perCloud((id) => str(keys[id])), added, endpoints,
    shown: chosen && !base.shown.some((p) => samePick(p, chosen)) ? [...base.shown, chosen] : base.shown,
    last: chosen ?? base.last,
  };
};

/* The stored shape, leniently: anything missing takes its default, and a
   provider this version does not know is forgotten. */
export const parseAi = (raw: unknown): AiSettings => {
  const o = obj(raw);
  if ('provider' in o || 'models' in o) return fromLegacy(o);
  const base = defaultAi();
  if (!('shown' in o)) return { ...base, keys: perCloud((id) => str(obj(o.keys)[id])) };
  return {
    keys: perCloud((id) => str(obj(o.keys)[id])),
    listed: perCloud((id) => strs(obj(o.listed)[id])),
    added: perCloud((id) => strs(obj(o.added)[id])),
    shown: Array.isArray(o.shown) ? o.shown.flatMap((p) => { const x = pickOf(p); return x ? [x] : []; }) : base.shown,
    endpoints: Array.isArray(o.endpoints) ? o.endpoints.flatMap((e) => { const x = parseEndpoint(e); return x ? [x] : []; }) : [],
    last: 'last' in o ? pickOf(o.last) : base.last,
    inlineHtml: typeof o.inlineHtml === 'boolean' ? o.inlineHtml : true,
  };
};

/* What the backup carries: the same record with every key emptied. */
export const withoutKeys = (s: AiSettings): AiSettings => ({ ...s, keys: emptyKeys() });

/* ── reading it ─────────────────────────────────────────────────────────── */

/* Every model a card offers, in code first, then listed, then typed. */
export const cardModels = (s: AiSettings, id: CloudId): readonly string[] =>
  [...new Set([...FIXED_MODELS[id], ...s.listed[id], ...s.added[id]])];

export const endpointById = (s: AiSettings, id: EndpointId): Endpoint | undefined => s.endpoints.find((e) => e.id === id);

/* Where a pick is asked and with what key: nothing when the provider has no
   key yet or the endpoint has gone. */
export const accessOf = (s: AiSettings, pick: ModelPick): Access | null => {
  if (pick.provider === 'local') {
    const e = endpointById(s, splitLocal(pick.model).endpoint);
    return e ? { key: '', baseUrl: e.baseUrl } : null;
  }
  const key = s.keys[pick.provider].trim();
  return key ? { key, baseUrl: DEFAULT_BASE[pick.provider] } : null;
};

export const isShown = (s: AiSettings, pick: ModelPick): boolean => s.shown.some((p) => samePick(p, pick));
export const toggleShown = (s: AiSettings, pick: ModelPick): AiSettings =>
  ({ ...s, shown: isShown(s, pick) ? s.shown.filter((p) => !samePick(p, pick)) : [...s.shown, pick] });

/* The chat's model menu: the ticked models, grouped by provider in the
   order the cards stand. */
export type MenuEntry = { readonly pick: ModelPick; readonly name: string; readonly ready: boolean };
export type MenuGroup = { readonly provider: ProviderId; readonly label: string; readonly entries: readonly MenuEntry[] };
export const menuOf = (s: AiSettings): readonly MenuGroup[] =>
  PROVIDER_IDS.flatMap((provider) => {
    const entries = s.shown.filter((p) => p.provider === provider).flatMap((pick): MenuEntry[] => {
      if (provider !== 'local') return [{ pick, name: pick.model, ready: accessOf(s, pick) !== null }];
      const { endpoint, model } = splitLocal(pick.model);
      const e = endpointById(s, endpoint);
      return e ? [{ pick, name: `${model} · ${e.name}`, ready: true }] : [];
    });
    return entries.length ? [{ provider, label: PROVIDER_LABEL[provider], entries }] : [];
  });

/* A long list as a card shows it: ticked models first, narrowed by the
   filter, and cut to `cap` rows until the reader asks for all. `found` is
   how many the filter matched. */
export const MODEL_CAP = 15;
export const visibleModels = (models: readonly string[], ticked: (m: string) => boolean, query: string, all: boolean, cap = MODEL_CAP): { readonly rows: readonly string[]; readonly found: number } => {
  const q = query.trim().toLowerCase();
  const found = models.filter((m) => q === '' || m.toLowerCase().includes(q));
  const ordered = [...found.filter(ticked), ...found.filter((m) => !ticked(m))];
  return { rows: all ? ordered : ordered.slice(0, Math.max(cap, found.filter(ticked).length)), found: found.length };
};
