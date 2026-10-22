/* The English catalog, the source of truth for every UI text: one module per
   area, merged flat. Extraction agents add keys to their area file and never
   touch this one. AREAS is kept so a test can check no key is in two files (a
   duplicate would silently override). */
import { shell } from './shell';
import { settings } from './settings';
import { commands } from './commands';
import { explorer } from './explorer';
import { views } from './views';
import { exercises } from './exercises';
import { practice } from './practice';
import { notes } from './notes';
import { files } from './files';
import { drawer } from './drawer';
import { chat } from './chat';
import { pomodoro } from './pomodoro';
import { sheets } from './sheets';
import { offline } from './offline';
import { tips } from './tips';
import { content } from './content';
import { about } from './about';

export const AREAS = { shell, settings, commands, explorer, views, exercises, practice, notes, files, drawer, chat, pomodoro, sheets, offline, tips, content, about } as const;
export const en = { ...shell, ...settings, ...commands, ...explorer, ...views, ...exercises, ...practice, ...notes, ...files, ...drawer, ...chat, ...pomodoro, ...sheets, ...offline, ...tips, ...content, ...about } as const;
export type MessageKey = keyof typeof en;
export type Catalog = Readonly<Record<MessageKey, string>>;
