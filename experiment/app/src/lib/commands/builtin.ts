/* Every builtin command, composed from the stores it acts on. This module is
   pure: it receives the stores' surfaces as `deps` (setup.svelte.ts passes the
   real ones), so the command list can be checked in tests. Add a builtin here;
   give it a default chord in defaults.ts if it deserves one. */
import { type Command, type CommandId, commandId } from './command';
import type { Theme, ExerciseMode } from '../settings/store.svelte';

export type BuiltinDeps = {
  readonly settings: {
    readonly colorCoding: boolean; readonly theme: Theme; readonly animations: boolean; readonly exerciseMode: ExerciseMode; readonly voice: boolean;
    setColorCoding(on: boolean): void; setTheme(t: Theme): void; cycleTheme(): void; setAnimations(on: boolean): void; setExerciseMode(m: ExerciseMode): void; setVoice(on: boolean): void;
  };
  readonly layout: { reset(): void };
  readonly fold: { foldAll(): void; unfoldAll(): void; hideFigures(): void; showFigures(): void };
  readonly ui: {
    openPalette(): void; openSettings(): void; openBrowser(opts?: { group?: number }): void;
    readonly palette: { readonly open: boolean; readonly group: number | null }; readonly browser: { readonly open: boolean };
  };
  readonly reader: { readonly supported: boolean; readonly speaking: boolean; readFocused(): void; stop(): void };
};

/* Ids the defaults and the Rail refer to. */
export const BUILTIN = {
  palette: commandId('palette'), settings: commandId('settings'), open: commandId('open'),
  animations: commandId('animations'), colourCoding: commandId('colour-coding'),
  themeSystem: commandId('theme-system'), themeLight: commandId('theme-light'), themeDark: commandId('theme-dark'), themeCycle: commandId('theme-cycle'),
  resetLayout: commandId('reset-layout'),
  exerciseAll: commandId('exercise-all'), exerciseOne: commandId('exercise-one'),
  voice: commandId('voice'), readAloud: commandId('read-aloud'), stopReading: commandId('stop-reading'),
  foldAll: commandId('fold-all'), unfoldAll: commandId('unfold-all'), hideFigures: commandId('hide-figures'), showFigures: commandId('show-figures'),
} as const;

const onOff = (v: boolean): string => (v ? 'on' : 'off');
const themeCommand = (d: BuiltinDeps, id: CommandId, t: Theme): Command =>
  ({ id, label: `Theme: ${t}`, group: 'Appearance', run: () => d.settings.setTheme(t), detail: () => (d.settings.theme === t ? 'current' : '') });
const modeCommand = (d: BuiltinDeps, id: CommandId, m: ExerciseMode, label: string): Command =>
  ({ id, label: `Exercise mode: ${label}`, group: 'Reading', run: () => d.settings.setExerciseMode(m), detail: () => (d.settings.exerciseMode === m ? 'current' : '') });
export const builtinCommands = (d: BuiltinDeps): readonly Command[] => [
  { id: BUILTIN.palette, label: 'Open command palette', group: 'App', run: () => d.ui.openPalette(), when: () => !d.ui.palette.open },
  { id: BUILTIN.settings, label: 'Open settings', group: 'App', run: () => d.ui.openSettings() },
  { id: BUILTIN.open, label: 'Open…', group: 'App', run: () => d.ui.openBrowser({ group: d.ui.palette.group ?? undefined }), when: () => !d.ui.browser.open },
  { id: BUILTIN.colourCoding, label: 'Toggle colour coding', group: 'Appearance', run: () => d.settings.setColorCoding(!d.settings.colorCoding), detail: () => onOff(d.settings.colorCoding) },
  themeCommand(d, BUILTIN.themeSystem, 'system'), themeCommand(d, BUILTIN.themeLight, 'light'), themeCommand(d, BUILTIN.themeDark, 'dark'),
  { id: BUILTIN.themeCycle, label: 'Theme: cycle', group: 'Appearance', run: () => d.settings.cycleTheme(), detail: () => d.settings.theme },
  { id: BUILTIN.animations, label: 'Toggle animations', group: 'Reading', run: () => d.settings.setAnimations(!d.settings.animations), detail: () => onOff(d.settings.animations) },
  modeCommand(d, BUILTIN.exerciseAll, 'all', 'all'), modeCommand(d, BUILTIN.exerciseOne, 'one', 'one at a time'),
  { id: BUILTIN.voice, label: 'Toggle voice', group: 'Reading', run: () => d.settings.setVoice(!d.settings.voice), detail: () => (d.reader.supported ? onOff(d.settings.voice) : 'no speech in this browser') },
  { id: BUILTIN.readAloud, label: 'Read section aloud', group: 'Reading', run: () => d.reader.readFocused(), when: () => d.settings.voice && d.reader.supported && !d.reader.speaking },
  { id: BUILTIN.stopReading, label: 'Stop reading', group: 'Reading', run: () => d.reader.stop(), when: () => d.reader.speaking },
  { id: BUILTIN.foldAll, label: 'Fold all headings', group: 'Reading', run: () => d.fold.foldAll() },
  { id: BUILTIN.unfoldAll, label: 'Unfold all headings', group: 'Reading', run: () => d.fold.unfoldAll() },
  { id: BUILTIN.hideFigures, label: 'Hide all figures', group: 'Reading', run: () => d.fold.hideFigures() },
  { id: BUILTIN.showFigures, label: 'Show all figures', group: 'Reading', run: () => d.fold.showFigures() },
  { id: BUILTIN.resetLayout, label: 'Reset layout', group: 'Layout', run: () => d.layout.reset() },
];
