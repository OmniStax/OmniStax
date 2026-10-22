/* Simplified Chinese for en/offline.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { offline as source } from '../en/offline';

export const offline: Readonly<Record<keyof typeof source, string>> = {
  'offline.available': 'Available offline',
  'offline.checkUpdates': 'Check for updates',
  'offline.lastCheck': 'Last successful check: {when}',
};
