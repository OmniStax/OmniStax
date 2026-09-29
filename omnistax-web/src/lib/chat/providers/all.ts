/* The providers by name. It stands apart from `index.ts` so that each
   provider can import the shared shapes without the shapes importing them
   back. DeepSeek, OpenRouter, Mistral and Local AI speak OpenAI's shape at
   their own address. */
import { anthropic, MODELS as ANTHROPIC_MODELS } from './anthropic';
import { openai, openAiShaped } from './openai';
import { gemini, MODELS as GEMINI_MODELS } from './gemini';
import type { CloudId, Provider, ProviderId } from './index';

export const PROVIDERS: Readonly<Record<ProviderId, Provider>> = {
  anthropic, openai, gemini,
  deepseek: openAiShaped('deepseek'), openrouter: openAiShaped('openrouter'), mistral: openAiShaped('mistral'), local: openAiShaped('local'),
};
export const providerOf = (id: ProviderId): Provider => PROVIDERS[id];

/* The models a card offers before its list is fetched. */
export const FIXED_MODELS: Readonly<Record<CloudId, readonly string[]>> = {
  anthropic: ANTHROPIC_MODELS, openai: ['gpt-5', 'gpt-5-mini'], gemini: GEMINI_MODELS,
  deepseek: ['deepseek-chat', 'deepseek-reasoner'], openrouter: [], mistral: ['mistral-large-latest', 'mistral-small-latest'],
};
/* The model each provider shows in the menu before the reader ticks any. */
export const DEFAULT_MODEL: Readonly<Record<CloudId, string>> = {
  anthropic: 'claude-sonnet-5-5', openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash', deepseek: 'deepseek-chat', openrouter: '', mistral: 'mistral-large-latest',
};
