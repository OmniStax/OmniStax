/* Every builtin command, composed from the stores it acts on. This module is
   pure: it receives the stores' surfaces as `deps` (setup.svelte.ts passes the
   real ones), so the command list can be checked in tests. Add a builtin here;
   give it a default chord in defaults.ts if it deserves one. */
import { type Command, type CommandId, commandId } from './command';
import type { Theme, ExerciseMode } from '../settings/store.svelte';
import { VIEW_KINDS, isSidebarKind, type ViewKind } from '../types/ids';
import type { ItemKey } from '../layout/model';
import type { Level } from '../sections/scope';
import { VIEW_TITLE } from '../icons';

export type FocusDir = 'left' | 'right' | 'up' | 'down';

export type BuiltinDeps = {
  readonly settings: {
    readonly colorCoding: boolean; readonly theme: Theme; readonly animations: boolean; readonly exerciseMode: ExerciseMode; readonly voice: boolean;
    setColorCoding(on: boolean): void; setTheme(t: Theme): void; cycleTheme(): void; setAnimations(on: boolean): void; setExerciseMode(m: ExerciseMode): void; setVoice(on: boolean): void;
  };
  readonly layout: {
    reset(): void;
    splitRight(): void; splitDown(): void; moveRight(): void; moveDown(): void;
    closeGroup(): void; closeOtherGroups(): void; evenGroups(): void;
    reopenClosedTab(): void; readonly canReopenTab: boolean;
    focusNextGroup(): void; focusPreviousGroup(): void; focusGroup(dir: FocusDir): void;
    nextTab(): void; previousTab(): void;
    readonly groupCount: number;
  };
  readonly fold: { foldAll(): void; unfoldAll(): void; hideFigures(): void; showFigures(): void };
  readonly ui: {
    openPalette(): void; openSettings(): void; openBrowser(opts?: { group?: number }): void; openFindTextbook(): void;
    readonly palette: { readonly open: boolean; readonly group: number | null }; readonly browser: { readonly open: boolean };
  };
  readonly reader: { readonly supported: boolean; readonly speaking: boolean; readFocused(): void; stop(): void };
  /* The view the commands act on is whichever page the reader last touched, named by
     its item key, since a kind may be open in several; with none there is nothing to scope. */
  readonly scope: { activeView(): ItemKey | null; level(): Level | null; pinned(): boolean; widen(): void; narrow(): void; atLevel(l: Level): void; previous(): void; next(): void; togglePin(): void; pickTarget(): void };
  readonly docs: { openView(kind: ViewKind, where: ViewWhere): void; openExercises(): void; canOpenExercises(): boolean };
  /* The reader's own notes: a new one, and the mode of the note tab in the focused group. */
  readonly notes: { newNote(): void; toggleMode(): void; canToggle(): boolean };
  /* One timeline of the reader's own edits: what the next step back or forward
     would undo or redo, and whether there is one at all. */
  readonly history: { undo(): void; redo(): void; readonly canUndo: boolean; readonly canRedo: boolean; readonly undoLabel: string; readonly redoLabel: string };
};

/* Where a view is asked for: a tab of the group in hand, the sidebar it calls
   home, or a split to the right of the group being read. */
export type ViewWhere = 'group' | 'side' | 'split';

/* Ids the defaults and the Rail refer to. */
export const BUILTIN = {
  palette: commandId('palette'), settings: commandId('settings'), open: commandId('open'),
  animations: commandId('animations'), colourCoding: commandId('colour-coding'),
  themeSystem: commandId('theme-system'), themeLight: commandId('theme-light'), themeDark: commandId('theme-dark'), themeCycle: commandId('theme-cycle'),
  resetLayout: commandId('reset-layout'),
  splitRight: commandId('split-right'), splitDown: commandId('split-down'),
  moveRight: commandId('move-right'), moveDown: commandId('move-down'),
  closeGroup: commandId('close-group'), closeOtherGroups: commandId('close-other-groups'), evenGroups: commandId('even-groups'),
  reopenClosedTab: commandId('reopen-closed-tab'),
  undo: commandId('undo'), redo: commandId('redo'),
  focusNextGroup: commandId('focus-next-group'), focusPreviousGroup: commandId('focus-previous-group'),
  focusGroupLeft: commandId('focus-group-left'), focusGroupRight: commandId('focus-group-right'),
  focusGroupUp: commandId('focus-group-up'), focusGroupDown: commandId('focus-group-down'),
  nextTab: commandId('next-tab'), previousTab: commandId('previous-tab'),
  exerciseAll: commandId('exercise-all'), exerciseOne: commandId('exercise-one'),
  voice: commandId('voice'), readAloud: commandId('read-aloud'), stopReading: commandId('stop-reading'),
  foldAll: commandId('fold-all'), unfoldAll: commandId('unfold-all'), hideFigures: commandId('hide-figures'), showFigures: commandId('show-figures'),
  scopeWiden: commandId('scope-widen'), scopeNarrow: commandId('scope-narrow'),
  scopePrevious: commandId('scope-previous'), scopeNext: commandId('scope-next'),
  scopeBook: commandId('scope-book'), scopeChapter: commandId('scope-chapter'), scopeSection: commandId('scope-section'),
  scopePin: commandId('scope-pin'), scopeUnpin: commandId('scope-unpin'), scopePick: commandId('scope-pick'),
  openExercises: commandId('open-exercises'),
  noteNew: commandId('note-new'), noteToggleMode: commandId('note-toggle-mode'),
  findTextbook: commandId('explorer-find-textbook'),
} as const;
/* One id per view for opening it, and a second for the two that a sidebar holds. */
export const openViewId = (kind: ViewKind): CommandId => commandId(`open-view-${kind}`);
export const showViewId = (kind: ViewKind): CommandId => commandId(`show-view-${kind}`);

const onOff = (v: boolean): string => (v ? 'on' : 'off');
const themeCommand = (d: BuiltinDeps, id: CommandId, t: Theme): Command =>
  ({ id, label: `Theme: ${t}`, group: 'Appearance', run: () => d.settings.setTheme(t), detail: () => (d.settings.theme === t ? 'current' : '') });
const modeCommand = (d: BuiltinDeps, id: CommandId, m: ExerciseMode, label: string): Command =>
  ({ id, label: `Exercise mode: ${label}`, group: 'Reading', run: () => d.settings.setExerciseMode(m), detail: () => (d.settings.exerciseMode === m ? 'current' : '') });
/* Moving the focus between groups only means anything once there are several. */
const focusGroupCommand = (d: BuiltinDeps, id: CommandId, dir: FocusDir, label: string): Command =>
  ({ id, label: `Focus group ${label}`, group: 'Layout', run: () => d.layout.focusGroup(dir), when: () => d.layout.groupCount > 1 });
/* Sending a view straight to a level, which says which one it stands at now. */
const scopeCommand = (d: BuiltinDeps, id: CommandId, level: Level): Command =>
  ({ id, label: `View scope: ${level}`, group: 'View', run: () => d.scope.atLevel(level), when: () => d.scope.activeView() !== null, detail: () => (d.scope.level() === level ? 'current' : '') });
/* The two views a sidebar holds can be opened as a tab of their own or shown in
   the sidebar; the other three are only ever tabs, and every asking opens another
   page of one in a split beside what is being read. */
const viewCommands = (d: BuiltinDeps): readonly Command[] => VIEW_KINDS.flatMap((kind): readonly Command[] => (isSidebarKind(kind)
  ? [
    { id: openViewId(kind), label: `Open ${VIEW_TITLE[kind]} in a group`, group: 'View', run: () => d.docs.openView(kind, 'group') },
    { id: showViewId(kind), label: `Show ${VIEW_TITLE[kind]} in the sidebar`, group: 'View', run: () => d.docs.openView(kind, 'side') },
  ]
  : [{ id: openViewId(kind), label: `Open ${VIEW_TITLE[kind]} in a split`, group: 'View', run: () => d.docs.openView(kind, 'split') }]));
export const builtinCommands = (d: BuiltinDeps): readonly Command[] => [
  { id: BUILTIN.palette, label: 'Open command palette', group: 'App', run: () => d.ui.openPalette(), when: () => !d.ui.palette.open },
  { id: BUILTIN.settings, label: 'Open settings', group: 'App', run: () => d.ui.openSettings() },
  /* The detail says what the step would take back, so the palette reads
     "Undo — highlight in yellow" rather than asking the reader to remember. */
  { id: BUILTIN.undo, label: 'Undo', group: 'App', run: () => d.history.undo(), when: () => d.history.canUndo, detail: () => d.history.undoLabel },
  { id: BUILTIN.redo, label: 'Redo', group: 'App', run: () => d.history.redo(), when: () => d.history.canRedo, detail: () => d.history.redoLabel },
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
  { id: BUILTIN.splitRight, label: 'Split right', group: 'Layout', run: () => d.layout.splitRight() },
  { id: BUILTIN.splitDown, label: 'Split down', group: 'Layout', run: () => d.layout.splitDown() },
  { id: BUILTIN.moveRight, label: 'Move tab to a new group right', group: 'Layout', run: () => d.layout.moveRight() },
  { id: BUILTIN.moveDown, label: 'Move tab to a new group below', group: 'Layout', run: () => d.layout.moveDown() },
  { id: BUILTIN.closeGroup, label: 'Close group', group: 'Layout', run: () => d.layout.closeGroup(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.closeOtherGroups, label: 'Close other groups', group: 'Layout', run: () => d.layout.closeOtherGroups(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.evenGroups, label: 'Even out group sizes', group: 'Layout', run: () => d.layout.evenGroups(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.reopenClosedTab, label: 'Reopen closed tab', group: 'Layout', run: () => d.layout.reopenClosedTab(), when: () => d.layout.canReopenTab },
  { id: BUILTIN.focusNextGroup, label: 'Focus next group', group: 'Layout', run: () => d.layout.focusNextGroup(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.focusPreviousGroup, label: 'Focus previous group', group: 'Layout', run: () => d.layout.focusPreviousGroup(), when: () => d.layout.groupCount > 1 },
  focusGroupCommand(d, BUILTIN.focusGroupLeft, 'left', 'to the left'), focusGroupCommand(d, BUILTIN.focusGroupRight, 'right', 'to the right'),
  focusGroupCommand(d, BUILTIN.focusGroupUp, 'up', 'above'), focusGroupCommand(d, BUILTIN.focusGroupDown, 'down', 'below'),
  { id: BUILTIN.nextTab, label: 'Next tab', group: 'Layout', run: () => d.layout.nextTab() },
  { id: BUILTIN.previousTab, label: 'Previous tab', group: 'Layout', run: () => d.layout.previousTab() },
  { id: BUILTIN.scopeWiden, label: 'View scope: wider', group: 'View', run: () => d.scope.widen(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  { id: BUILTIN.scopeNarrow, label: 'View scope: narrower', group: 'View', run: () => d.scope.narrow(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'section' },
  { id: BUILTIN.scopePrevious, label: 'View scope: previous chapter or section', group: 'View', run: () => d.scope.previous(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  { id: BUILTIN.scopeNext, label: 'View scope: next chapter or section', group: 'View', run: () => d.scope.next(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  scopeCommand(d, BUILTIN.scopeBook, 'book'), scopeCommand(d, BUILTIN.scopeChapter, 'chapter'), scopeCommand(d, BUILTIN.scopeSection, 'section'),
  { id: BUILTIN.scopePin, label: 'Pin view here', group: 'View', run: () => d.scope.togglePin(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' && !d.scope.pinned() },
  { id: BUILTIN.scopeUnpin, label: 'Unpin view: follow the page', group: 'View', run: () => d.scope.togglePin(), when: () => d.scope.activeView() !== null && d.scope.pinned() },
  { id: BUILTIN.scopePick, label: 'Pin view to…', group: 'View', run: () => d.scope.pickTarget(), when: () => d.scope.activeView() !== null },
  ...viewCommands(d),
  { id: BUILTIN.openExercises, label: "Open this section's exercises", group: 'App', run: () => d.docs.openExercises(), when: () => d.docs.canOpenExercises() },
  { id: BUILTIN.noteNew, label: 'New note', group: 'App', run: () => d.notes.newNote() },
  { id: BUILTIN.noteToggleMode, label: 'Note: edit or read', group: 'App', run: () => d.notes.toggleMode(), when: () => d.notes.canToggle() },
  { id: BUILTIN.findTextbook, label: 'Find a textbook', group: 'App', run: () => d.ui.openFindTextbook() },
];
