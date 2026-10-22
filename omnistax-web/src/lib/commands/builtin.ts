/* Every builtin command, composed from the stores it acts on. This module is
   pure: it receives the stores' surfaces as `deps` (setup.svelte.ts passes the
   real ones), so the command list can be checked in tests. Add a builtin here;
   give it a default chord in defaults.ts if it deserves one. */
import { type Command, type CommandId, commandId } from './command';
import type { Theme, ZoomStep } from '../settings/store.svelte';
import { FONTS, type FontId } from '../settings/fonts';
import type { ChoiceList } from './choice';
import { zoomLabel } from '../settings/zoom';
import { VIEW_KINDS, isSidebarKind, isPaletteOnlyKind, type ViewKind } from '../types/ids';
import type { ItemKey } from '../layout/model';
import type { Level } from '../sections/scope';
import { viewTitle } from '../icons';
import { LOCALES, LOCALE_NAMES, type Locale, type MessageKey, type TFn } from '../i18n/index';
import type { LocaleChoice } from '../i18n/store.svelte';

export type FocusDir = 'left' | 'right' | 'up' | 'down';

export type BuiltinDeps = {
  /* The words every label and group is written in: the shell passes i18n.t and
     registers the commands again when the language changes, so the palette
     searches the text the reader sees. */
  readonly t: TFn;
  readonly settings: {
    readonly theme: Theme; readonly animations: boolean; readonly voice: boolean; readonly zoom: ZoomStep;
    readonly figureFont: FontId; readonly bodyFont: FontId;
    setFigureFont(id: FontId): void; setBodyFont(id: FontId): void;
    setPreview(p: { figureFont?: FontId; bodyFont?: FontId; theme?: Theme }): void; clearPreview(): void;
    zoomIn(): void; zoomOut(): void; resetZoom(): void;
    setTheme(t: Theme): void; cycleTheme(): void; setAnimations(on: boolean): void; setVoice(on: boolean): void;
  };
  readonly layout: {
    reset(): void;
    splitRight(): void; splitDown(): void; moveRight(): void; moveDown(): void;
    closeTab(): void; closeGroup(): void; newGroup(): void; closeOtherGroups(): void; evenGroups(): void;
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
  readonly docs: { openView(kind: ViewKind, where: ViewWhere): void; openAbout(): void };
  /* The reader's own notes: a new one, and the mode of the note tab in the focused group. */
  readonly notes: { newNote(): void; toggleMode(): void; canToggle(): boolean };
  /* The reader's own drawings. Only the making of one is a command: everything
     else a drawing does is done inside its own tab, under the bare letters its
     toolbar names, which never reach the shell. */
  readonly drawings: { newDrawing(): void };
  /* A chat of the reader's own with the model they brought a key for. */
  readonly chat: { newChat(): void };
  /* One timeline of the reader's own edits: what the next step back or forward
     would undo or redo, and whether there is one at all. */
  readonly history: { undo(): void; redo(): void; readonly canUndo: boolean; readonly canRedo: boolean; readonly undoLabel: string; readonly redoLabel: string };
  /* The colours the reader has chosen keep a timeline of their own, so that taking
     back a colour never takes back a highlight. */
  readonly colours: { undo(): void; redo(): void; readonly canUndo: boolean; readonly canRedo: boolean; readonly undoLabel: string; readonly redoLabel: string };
  /* The reader's UI language (i18n/store.svelte.ts): their choice, what the browser asks for, and the change. */
  readonly language: { readonly choice: LocaleChoice; readonly system: Locale; setChoice(c: LocaleChoice): void };
  /* The other editions of the book the focused page belongs to (editions.svelte.ts), and the switch to one. */
  readonly editions: {
    current(): { readonly from: string; readonly to: readonly { readonly id: string; readonly label: string; readonly detail?: string }[] } | null;
    switchTo(from: string, to: string): void;
  };
};

/* Where a view is asked for: a tab of the group in hand, the sidebar it calls
   home, or a split to the right of the group being read. */
export type ViewWhere = 'group' | 'side' | 'split';

/* Ids the defaults and the Rail refer to. */
export const BUILTIN = {
  palette: commandId('palette'), settings: commandId('settings'), open: commandId('open'),
  animations: commandId('animations'),
  zoomIn: commandId('zoom-in'), zoomOut: commandId('zoom-out'), zoomReset: commandId('zoom-reset'),
  theme: commandId('theme'), themeCycle: commandId('theme-cycle'),
  figureFont: commandId('figure-font'), bodyFont: commandId('body-font'),
  resetLayout: commandId('reset-layout'),
  splitRight: commandId('split-right'), splitDown: commandId('split-down'),
  moveRight: commandId('move-right'), moveDown: commandId('move-down'),
  closeTab: commandId('close-tab'), closeGroup: commandId('close-group'), closeOtherGroups: commandId('close-other-groups'), evenGroups: commandId('even-groups'),
  reopenClosedTab: commandId('reopen-closed-tab'), newGroup: commandId('new-group'),
  undo: commandId('undo'), redo: commandId('redo'),
  focusNextGroup: commandId('focus-next-group'), focusPreviousGroup: commandId('focus-previous-group'),
  focusGroupLeft: commandId('focus-group-left'), focusGroupRight: commandId('focus-group-right'),
  focusGroupUp: commandId('focus-group-up'), focusGroupDown: commandId('focus-group-down'),
  nextTab: commandId('next-tab'), previousTab: commandId('previous-tab'),
  voice: commandId('voice'), readAloud: commandId('read-aloud'), stopReading: commandId('stop-reading'),
  foldAll: commandId('fold-all'), unfoldAll: commandId('unfold-all'), hideFigures: commandId('hide-figures'), showFigures: commandId('show-figures'),
  scopeWiden: commandId('scope-widen'), scopeNarrow: commandId('scope-narrow'),
  scopePrevious: commandId('scope-previous'), scopeNext: commandId('scope-next'),
  scopeBook: commandId('scope-book'), scopeChapter: commandId('scope-chapter'), scopeSection: commandId('scope-section'),
  scopePin: commandId('scope-pin'), scopeUnpin: commandId('scope-unpin'), scopePick: commandId('scope-pick'),
  reopenAbout: commandId('reopen-about'),
  noteNew: commandId('note-new'), noteToggleMode: commandId('note-toggle-mode'),
  drawingNew: commandId('drawing-new'),
  chatNew: commandId('chat-new'),
  findTextbook: commandId('explorer-find-textbook'),
  coloursUndo: commandId('colours-undo'), coloursRedo: commandId('colours-redo'),
  language: commandId('language'), switchLanguage: commandId('book-switch-language'),
} as const;
/* One id per view for opening it, and a second for the two that a sidebar holds. */
export const openViewId = (kind: ViewKind): CommandId => commandId(`open-view-${kind}`);
export const showViewId = (kind: ViewKind): CommandId => commandId(`show-view-${kind}`);

const onOff = (d: BuiltinDeps, v: boolean): string => d.t(v ? 'commands.detail.on' : 'commands.detail.off');
/* A setting chosen from a list: moving through it previews, Enter keeps, Escape puts back. */
const settingChoices = <T extends string>(d: BuiltinDeps, options: readonly { value: T; label: string }[], current: T, preview: (v: T) => void, save: (v: T) => void): ChoiceList => ({
  options, current,
  preview: (v) => preview(v as T),
  commit: (v) => { save(v as T); d.settings.clearPreview(); },
  cancel: () => d.settings.clearPreview(),
});
const FONT_OPTIONS = FONTS.map((f) => ({ value: f.id, label: f.label }));
const THEME_KEY: Readonly<Record<Theme, MessageKey>> = { system: 'settings.theme.system', light: 'settings.theme.light', dark: 'settings.theme.dark' };
const themeOptions = (d: BuiltinDeps) => (['system', 'light', 'dark'] as const satisfies readonly Theme[]).map((t) => ({ value: t, label: d.t(THEME_KEY[t]) }));
const themeName = (d: BuiltinDeps): string => d.t(THEME_KEY[d.settings.theme]);
const fontLabel = (id: FontId): string => FONTS.find((f) => f.id === id)?.label ?? id;
/* The UI language: System (whatever the browser asks for) or a catalog by its own name. */
const languageOptions = (d: BuiltinDeps) => [
  { value: 'system', label: d.t('language.setting.system'), detail: LOCALE_NAMES[d.language.system] },
  ...LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] })),
];
const languageDetail = (d: BuiltinDeps): string => {
  const c = d.language.choice;
  return c === 'system' ? d.t('language.command.detail.system', { language: LOCALE_NAMES[d.language.system] }) : LOCALE_NAMES[c];
};
const isChoice = (v: string): v is LocaleChoice => v === 'system' || (LOCALES as readonly string[]).includes(v);
/* Moving the focus between groups only means anything once there are several. */
const focusGroupCommand = (d: BuiltinDeps, id: CommandId, dir: FocusDir, label: MessageKey): Command =>
  ({ id, label: d.t(label), group: d.t('commands.group.layout'), run: () => d.layout.focusGroup(dir), when: () => d.layout.groupCount > 1 });
/* Sending a view straight to a level, which says which one it stands at now. */
const SCOPE_KEY: Readonly<Record<Level, MessageKey>> = { book: 'commands.scope.book', chapter: 'commands.scope.chapter', section: 'commands.scope.section' };
const scopeCommand = (d: BuiltinDeps, id: CommandId, level: Level): Command =>
  ({ id, label: d.t(SCOPE_KEY[level]), group: d.t('commands.group.view'), run: () => d.scope.atLevel(level), when: () => d.scope.activeView() !== null, detail: () => (d.scope.level() === level ? d.t('commands.detail.current') : '') });
/* The two views a sidebar holds can be opened as a tab of their own or shown in
   the sidebar; the ones the rail keeps open in a split beside what is being read,
   and every asking opens another page of one; and the colour menu, which the
   reader asks for by name and reads as a tab of the group they asked from. */
const viewCommands = (d: BuiltinDeps): readonly Command[] => VIEW_KINDS.flatMap((kind): readonly Command[] => { const view = viewTitle(kind, d.t), group = d.t('commands.group.view'); return isSidebarKind(kind)
  ? [
    { id: openViewId(kind), label: d.t('commands.view.openInGroup', { view }), group, run: () => d.docs.openView(kind, 'group') },
    { id: showViewId(kind), label: d.t('commands.view.showInSidebar', { view }), group, run: () => d.docs.openView(kind, 'side') },
  ]
  : kind === 'colours' ? []   /* a book's theme opens from its Explorer row alone */
  : isPaletteOnlyKind(kind)
    ? [{ id: openViewId(kind), label: d.t('commands.view.open', { view }), group, run: () => d.docs.openView(kind, 'group') }]
    : [{ id: openViewId(kind), label: d.t('commands.view.openInSplit', { view }), group, run: () => d.docs.openView(kind, 'split') }]; });
export const builtinCommands = (d: BuiltinDeps): readonly Command[] => { const g = { app: d.t('commands.group.app'), appearance: d.t('commands.group.appearance'), reading: d.t('commands.group.reading'), layout: d.t('commands.group.layout'), view: d.t('commands.group.view') }; return [
  { id: BUILTIN.palette, label: d.t('commands.palette'), group: g.app, run: () => d.ui.openPalette(), when: () => !d.ui.palette.open },
  { id: BUILTIN.settings, label: d.t('commands.settings'), group: g.app, run: () => d.ui.openSettings() },
  /* The detail says what the step would take back, so the palette reads
     "Undo — highlight in yellow" rather than asking the reader to remember. */
  { id: BUILTIN.undo, label: d.t('commands.undo'), group: g.app, run: () => d.history.undo(), when: () => d.history.canUndo, detail: () => d.history.undoLabel },
  { id: BUILTIN.redo, label: d.t('commands.redo'), group: g.app, run: () => d.history.redo(), when: () => d.history.canRedo, detail: () => d.history.redoLabel },
  { id: BUILTIN.open, label: d.t('commands.open'), group: g.app, run: () => d.ui.openBrowser({ group: d.ui.palette.group ?? undefined }), when: () => !d.ui.browser.open },
  { id: BUILTIN.theme, label: d.t('commands.theme'), group: g.appearance, run: () => {}, detail: () => themeName(d),
    choices: () => settingChoices(d, themeOptions(d), d.settings.theme, (theme) => d.settings.setPreview({ theme }), (t) => d.settings.setTheme(t)) },
  { id: BUILTIN.language, label: d.t('language.command'), group: g.appearance, run: () => {}, detail: () => languageDetail(d),
    choices: () => ({ options: languageOptions(d), current: d.language.choice, commit: (v) => { if (isChoice(v)) d.language.setChoice(v); } }) },
  { id: BUILTIN.themeCycle, label: d.t('commands.themeCycle'), group: g.appearance, run: () => d.settings.cycleTheme(), detail: () => themeName(d) },
  { id: BUILTIN.figureFont, label: d.t('commands.figureFont'), group: g.appearance, run: () => {}, detail: () => fontLabel(d.settings.figureFont),
    choices: () => settingChoices(d, FONT_OPTIONS, d.settings.figureFont, (figureFont) => d.settings.setPreview({ figureFont }), (f) => d.settings.setFigureFont(f)) },
  { id: BUILTIN.bodyFont, label: d.t('commands.bodyFont'), group: g.appearance, run: () => {}, detail: () => fontLabel(d.settings.bodyFont),
    choices: () => settingChoices(d, FONT_OPTIONS, d.settings.bodyFont, (bodyFont) => d.settings.setPreview({ bodyFont }), (f) => d.settings.setBodyFont(f)) },
  /* The app's own text size, a step at a time. The chords are the browser's
     zoom chords, which the shell takes for itself while "Zoom keys" is on. */
  { id: BUILTIN.zoomIn, label: d.t('commands.zoomIn'), group: g.appearance, run: () => d.settings.zoomIn(), detail: () => zoomLabel(d.settings.zoom) },
  { id: BUILTIN.zoomOut, label: d.t('commands.zoomOut'), group: g.appearance, run: () => d.settings.zoomOut(), detail: () => zoomLabel(d.settings.zoom) },
  { id: BUILTIN.zoomReset, label: d.t('commands.zoomReset'), group: g.appearance, run: () => d.settings.resetZoom(), detail: () => zoomLabel(d.settings.zoom) },
  { id: BUILTIN.animations, label: d.t('commands.animations'), group: g.reading, run: () => d.settings.setAnimations(!d.settings.animations), detail: () => onOff(d, d.settings.animations) },
  { id: BUILTIN.voice, label: d.t('commands.voice'), group: g.reading, run: () => d.settings.setVoice(!d.settings.voice), detail: () => (d.reader.supported ? onOff(d, d.settings.voice) : d.t('commands.voice.unsupported')) },
  { id: BUILTIN.readAloud, label: d.t('commands.readAloud'), group: g.reading, run: () => d.reader.readFocused(), when: () => d.settings.voice && d.reader.supported && !d.reader.speaking },
  { id: BUILTIN.stopReading, label: d.t('commands.stopReading'), group: g.reading, run: () => d.reader.stop(), when: () => d.reader.speaking },
  { id: BUILTIN.foldAll, label: d.t('commands.foldAll'), group: g.reading, run: () => d.fold.foldAll() },
  { id: BUILTIN.unfoldAll, label: d.t('commands.unfoldAll'), group: g.reading, run: () => d.fold.unfoldAll() },
  { id: BUILTIN.hideFigures, label: d.t('commands.hideFigures'), group: g.reading, run: () => d.fold.hideFigures() },
  { id: BUILTIN.showFigures, label: d.t('commands.showFigures'), group: g.reading, run: () => d.fold.showFigures() },
  { id: BUILTIN.resetLayout, label: d.t('commands.resetLayout'), group: g.layout, run: () => d.layout.reset() },
  { id: BUILTIN.splitRight, label: d.t('commands.splitRight'), group: g.layout, run: () => d.layout.splitRight() },
  { id: BUILTIN.splitDown, label: d.t('commands.splitDown'), group: g.layout, run: () => d.layout.splitDown() },
  { id: BUILTIN.moveRight, label: d.t('commands.moveRight'), group: g.layout, run: () => d.layout.moveRight() },
  { id: BUILTIN.moveDown, label: d.t('commands.moveDown'), group: g.layout, run: () => d.layout.moveDown() },
  { id: BUILTIN.closeTab, label: d.t('commands.closeTab'), group: g.layout, run: () => d.layout.closeTab() },
  { id: BUILTIN.closeGroup, label: d.t('commands.closeGroup'), group: g.layout, run: () => d.layout.closeGroup() },
  { id: BUILTIN.closeOtherGroups, label: d.t('commands.closeOtherGroups'), group: g.layout, run: () => d.layout.closeOtherGroups(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.evenGroups, label: d.t('commands.evenGroups'), group: g.layout, run: () => d.layout.evenGroups(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.newGroup, label: d.t('commands.newGroup'), group: g.layout, run: () => d.layout.newGroup() },
  { id: BUILTIN.reopenClosedTab, label: d.t('commands.reopenClosedTab'), group: g.layout, run: () => d.layout.reopenClosedTab(), when: () => d.layout.canReopenTab },
  { id: BUILTIN.focusNextGroup, label: d.t('commands.focusNextGroup'), group: g.layout, run: () => d.layout.focusNextGroup(), when: () => d.layout.groupCount > 1 },
  { id: BUILTIN.focusPreviousGroup, label: d.t('commands.focusPreviousGroup'), group: g.layout, run: () => d.layout.focusPreviousGroup(), when: () => d.layout.groupCount > 1 },
  focusGroupCommand(d, BUILTIN.focusGroupLeft, 'left', 'commands.focusGroupLeft'), focusGroupCommand(d, BUILTIN.focusGroupRight, 'right', 'commands.focusGroupRight'),
  focusGroupCommand(d, BUILTIN.focusGroupUp, 'up', 'commands.focusGroupUp'), focusGroupCommand(d, BUILTIN.focusGroupDown, 'down', 'commands.focusGroupDown'),
  { id: BUILTIN.nextTab, label: d.t('commands.nextTab'), group: g.layout, run: () => d.layout.nextTab() },
  { id: BUILTIN.previousTab, label: d.t('commands.previousTab'), group: g.layout, run: () => d.layout.previousTab() },
  { id: BUILTIN.scopeWiden, label: d.t('commands.scope.wider'), group: g.view, run: () => d.scope.widen(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  { id: BUILTIN.scopeNarrow, label: d.t('commands.scope.narrower'), group: g.view, run: () => d.scope.narrow(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'section' },
  { id: BUILTIN.scopePrevious, label: d.t('commands.scope.previous'), group: g.view, run: () => d.scope.previous(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  { id: BUILTIN.scopeNext, label: d.t('commands.scope.next'), group: g.view, run: () => d.scope.next(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' },
  /* The same page in another edition of its book. With one other edition the
     palette's list holds just it; with none the command is not offered. */
  { id: BUILTIN.switchLanguage, label: d.t('language.switchBook'), group: g.view,
    run: () => { const c = d.editions.current(); if (c && c.to.length === 1) d.editions.switchTo(c.from, c.to[0].id); },
    when: () => d.editions.current() !== null,
    choices: () => {
      const c = d.editions.current();
      return { options: (c?.to ?? []).map((b) => ({ value: b.id, label: b.label, ...(b.detail ? { detail: b.detail } : {}) })), current: '', commit: (to) => { if (c) d.editions.switchTo(c.from, to); } };
    } },
  scopeCommand(d, BUILTIN.scopeBook, 'book'), scopeCommand(d, BUILTIN.scopeChapter, 'chapter'), scopeCommand(d, BUILTIN.scopeSection, 'section'),
  { id: BUILTIN.scopePin, label: d.t('commands.scope.pin'), group: g.view, run: () => d.scope.togglePin(), when: () => d.scope.activeView() !== null && d.scope.level() !== 'book' && !d.scope.pinned() },
  { id: BUILTIN.scopeUnpin, label: d.t('commands.scope.unpin'), group: g.view, run: () => d.scope.togglePin(), when: () => d.scope.activeView() !== null && d.scope.pinned() },
  { id: BUILTIN.scopePick, label: d.t('commands.scope.pick'), group: g.view, run: () => d.scope.pickTarget(), when: () => d.scope.activeView() !== null },
  ...viewCommands(d),
  /* The front of OmniStax is a standing page like any other, and a reader who
     closed its tab has nothing in the book's own tree that leads back to it.
     This is that way back, and it opens the page wherever a tab opens. */
  { id: BUILTIN.reopenAbout, label: d.t('commands.about'), group: g.app, run: () => d.docs.openAbout() },
  { id: BUILTIN.noteNew, label: d.t('commands.noteNew'), group: g.app, run: () => d.notes.newNote() },
  { id: BUILTIN.noteToggleMode, label: d.t('commands.noteToggleMode'), group: g.app, run: () => d.notes.toggleMode(), when: () => d.notes.canToggle() },
  { id: BUILTIN.drawingNew, label: d.t('commands.drawingNew'), group: g.app, run: () => d.drawings.newDrawing() },
  { id: BUILTIN.chatNew, label: d.t('commands.chatNew'), group: g.app, run: () => d.chat.newChat() },
  { id: BUILTIN.findTextbook, label: d.t('commands.findTextbook'), group: g.app, run: () => d.ui.openFindTextbook() },
  /* The colour timeline is the colour menu's own, so these two say so by name and
     the detail says which colour would come back. */
  { id: BUILTIN.coloursUndo, label: d.t('commands.coloursUndo'), group: g.appearance, run: () => d.colours.undo(), when: () => d.colours.canUndo, detail: () => d.colours.undoLabel },
  { id: BUILTIN.coloursRedo, label: d.t('commands.coloursRedo'), group: g.appearance, run: () => d.colours.redo(), when: () => d.colours.canRedo, detail: () => d.colours.redoLabel },
]; };
