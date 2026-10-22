/* The Simplified Chinese catalog: the same area files as en/, each typed by its
   English counterpart, so a missing or extra key is a type error. */
import type { Catalog } from '../en';
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
export const zhCN: Catalog = { ...shell, ...settings, ...commands, ...explorer, ...views, ...exercises, ...practice, ...notes, ...files, ...drawer, ...chat, ...pomodoro, ...sheets, ...offline, ...tips, ...content, ...about };
