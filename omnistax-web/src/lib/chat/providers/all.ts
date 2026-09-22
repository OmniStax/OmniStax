/* The four providers by name. It stands apart from `index.ts` so that each
   provider can import the shared shapes without the shapes importing them
   back. */
import { anthropic, MODELS as ANTHROPIC_MODELS } from './anthropic';
import { openai } from './openai';
import { gemini, MODELS as GEMINI_MODELS } from './gemini';
import { compatible } from './compatible';
import type { Provider, ProviderId } from './index';

export const PROVIDERS: Readonly<Record<ProviderId, Provider>> = { anthropic, openai, gemini, compatible };
export const providerOf = (id: ProviderId): Provider => PROVIDERS[id];

/* The models a provider names without being asked. OpenAI and a host speaking
   its shape are asked instead, so they offer nothing until the key is there. */
export const FIXED_MODELS: Readonly<Record<ProviderId, readonly string[]>> =
  { anthropic: ANTHROPIC_MODELS, gemini: GEMINI_MODELS, openai: [], compatible: [] };
/* What a provider is set to before the reader chooses. */
export const DEFAULT_MODEL: Readonly<Record<ProviderId, string>> =
  { anthropic: 'claude-sonnet-5', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash', compatible: '' };
