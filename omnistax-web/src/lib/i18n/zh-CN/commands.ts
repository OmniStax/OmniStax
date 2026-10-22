/* Simplified Chinese for en/commands.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { commands as source } from '../en/commands';

export const commands: Readonly<Record<keyof typeof source, string>> = {
  'commands.focusGroup': 'Focus group {direction}',
  'commands.group.layout': 'Layout',
};
