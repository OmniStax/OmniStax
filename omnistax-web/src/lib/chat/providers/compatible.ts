/* Anything that speaks OpenAI's shape at an address of its own: a server on
   the reader's own machine, or another host that offers the same API. It is
   the OpenAI provider with the base URL the reader typed, which the settings
   already hand every request, so there is nothing else to say. */
import { openAiShaped } from './openai';
import type { Provider } from './index';

export const compatible: Provider = openAiShaped('compatible');
