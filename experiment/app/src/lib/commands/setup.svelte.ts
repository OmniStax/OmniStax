/* Registers the builtin commands against the real stores. The shell calls this
   once on mount; later modules add their own through commands.register(). */
import { commands } from './registry.svelte';
import { builtinCommands, type FocusDir, type ViewWhere } from './builtin';
import { commandId } from './command';
import type { Command } from './command';
import { ui } from './ui.svelte';
import { keys } from './keys.svelte';
import { settings } from '../settings/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { split, moveToNewGroup, closeOtherGroups, evenSizes, focusNext, activateNext, setFocus, openTab, openSide, homeSide, focusedGroup, type ItemKey } from '../layout/model';
import { groupToward, type GroupRect } from '../layout/spatial';
import { tabTitle } from '../layout/titles';
import { focusedArticle, openDoc, openItem } from '../sections/nav.svelte';
import { noteModes } from '../notes/modes.svelte';
import { explorer } from '../explorer/store.svelte';
import { createNote } from '../explorer/edits';
import { history } from '../history/store.svelte';
import { focus } from '../sections/focus.svelte';
import { scope } from '../sections/scope.svelte';
import { registry } from '../sections/registry.svelte';
import { itemKey, newViewItem, noteItem, parseItemKey, viewItem, type GroupKey, type NoteId, type ViewKind } from '../types/ids';
import type { Level, Target } from '../sections/scope';
import { foldAllIn, unfoldAllIn, hideFigsIn, showFigsIn } from '../sections/fold.svelte';
import { reader } from '../voice.svelte';

const GROUP_COMMANDS = 9;   /* the palette lists this many groups by number */

/* Where the groups are on the screen, read from the boxes the shell drew. */
const groupRects = (): readonly GroupRect[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.group[data-index]')).flatMap((el) => {
    const index = Number(el.dataset.index); if (!Number.isInteger(index)) return [];
    const r = el.getBoundingClientRect();
    return [{ index, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }];
  });
/* Focus the nearest group that way, and stay put when there is none. */
const focusToward = (dir: FocusDir): void => {
  const rects = groupRects(); const at = layoutStore.layout.focus;
  const from = rects.find((r) => r.index === at); if (!from) return;
  const to = groupToward(from.rect, rects.filter((r) => r.index !== at), dir);
  if (to !== null) layoutStore.apply((x) => setFocus(x, to));
};

/* The palette lists each group by its number, showing what is open there. */
const groupCommands = (): readonly Command[] =>
  Array.from({ length: GROUP_COMMANDS }, (_, n): Command => ({
    id: commandId(`focus-group-${n + 1}`),
    label: `Focus group ${n + 1}`,
    group: 'Layout',
    run: () => layoutStore.apply((x) => setFocus(x, n)),
    when: () => layoutStore.layout.groups.length > 1 && n < layoutStore.layout.groups.length,
    detail: () => { const active = layoutStore.layout.groups[n]?.active; return active ? tabTitle(active) : ''; },
  }));

/* The page of a view a scope command acts on, and nothing to do when the reader has touched none. */
const onView = (f: (key: ItemKey) => void): void => { const key = focus.activeView; if (key) f(key); };
/* Picking a place in the book pins the view there; the book is no pin, so it only sets the level. */
const pinTo = (key: ItemKey) => (target: Target): void => { if (target.level === 'book') scope.atLevel(key, 'book'); else scope.pin(key, target); };
const scopeDeps = {
  activeView: (): ItemKey | null => focus.activeView,
  level: (): Level | null => { const key = focus.activeView; return key ? scope.levelFor(key) : null; },
  pinned: (): boolean => { const key = focus.activeView; return key !== null && scope.isPinned(key); },
  widen: (): void => onView((k) => scope.widen(k)),
  narrow: (): void => onView((k) => scope.narrow(k)),
  atLevel: (l: Level): void => onView((k) => scope.atLevel(k, l)),
  previous: (): void => onView((k) => scope.previous(k)),
  next: (): void => onView((k) => scope.next(k)),
  togglePin: (): void => onView((k) => scope.togglePin(k)),
  pickTarget: (): void => onView((k) => ui.openBrowser({ pick: pinTo(k) })),
};
/* A view opens as a tab of the group in hand or in the sidebar it calls home —
   both of them the singleton a rail button toggles — and in a split as a page of
   its own, so asking twice gives two of them; the exercises are the focused section's. */
const docs = {
  openView: (kind: ViewKind, at: ViewWhere): void => {
    const key = itemKey(viewItem(kind));
    layoutStore.apply((x) => (at === 'group' ? openTab(x, key, ui.palette.group ?? x.focus) : at === 'split' ? split(x, x.focus, 'right', newViewItem(kind)) : openSide(x, key, homeSide(x, key))));
  },
  openExercises: (): void => { void openDoc(focus.section, 'exercises', ui.palette.group ?? undefined); },
  canOpenExercises: (): boolean => registry.isBuilt(focus.section),
};

/* The note the commands act on is the one in the tab the reader is in: the
   active tab of the focused group, when that tab holds a note at all. */
const activeNote = (): { readonly group: GroupKey; readonly note: NoteId } | null => {
  const g = focusedGroup(layoutStore.layout);
  const id = g?.active ? parseItemKey(g.active) : null;
  return g && id?.kind === 'note' ? { group: g.key, note: id.note } : null;
};

/* A new note is written under the reader's own root — one step of the shell's
   timeline, row and document together — and opened where the reader is
   standing, under the cursor: there is nothing yet to read. */
const notesDeps = {
  newNote: (): void => {
    const doc = createNote(null, explorer.uniqueName(null, 'Untitled'));
    const at = ui.palette.group ?? layoutStore.layout.focus;
    const group = layoutStore.layout.groups[at] ?? focusedGroup(layoutStore.layout);
    if (group) noteModes.setMode(group.key, doc.id, 'edit');
    void openItem(itemKey(noteItem(doc.id)), at);
  },
  toggleMode: (): void => { const t = activeNote(); if (t) noteModes.toggleMode(t.group, t.note); },
  canToggle: (): boolean => activeNote() !== null,
};

export const installCommands = (): void => {
  const fold = { foldAll: () => foldAllIn(focusedArticle()), unfoldAll: () => unfoldAllIn(focusedArticle()), hideFigures: () => hideFigsIn(focusedArticle()), showFigures: () => showFigsIn(focusedArticle()) };
  const layout = {
    reset: () => layoutStore.reset(),
    splitRight: () => layoutStore.apply((x) => split(x, x.focus, 'right')),
    splitDown: () => layoutStore.apply((x) => split(x, x.focus, 'down')),
    moveRight: () => layoutStore.apply((x) => moveToNewGroup(x, x.focus, 'right')),
    moveDown: () => layoutStore.apply((x) => moveToNewGroup(x, x.focus, 'down')),
    /* The active tab of the focused group; a group left with nothing goes with it. */
    closeTab: () => { const l = layoutStore.layout; const g = focusedGroup(l); if (g.active) layoutStore.closeTab(l.focus, g.active); },
    closeGroup: () => layoutStore.closeGroup(layoutStore.layout.focus),
    closeOtherGroups: () => layoutStore.apply((x) => closeOtherGroups(x, x.focus)),
    evenGroups: () => layoutStore.apply(evenSizes),
    focusNextGroup: () => layoutStore.apply((x) => focusNext(x, 1)),
    focusPreviousGroup: () => layoutStore.apply((x) => focusNext(x, -1)),
    focusGroup: (dir: FocusDir) => focusToward(dir),
    nextTab: () => layoutStore.apply((x) => activateNext(x, x.focus, 1)),
    previousTab: () => layoutStore.apply((x) => activateNext(x, x.focus, -1)),
    reopenClosedTab: () => layoutStore.reopenClosed(),
    get canReopenTab(): boolean { return layoutStore.canReopen; },
    get groupCount(): number { return layoutStore.layout.groups.length; },
  };
  /* The timeline reads as it stands at the moment the palette draws or a chord
     fires, so its four answers are getters rather than values. */
  const historyDeps = {
    undo: () => history.undo(), redo: () => history.redo(),
    get canUndo(): boolean { return history.canUndo; },
    get canRedo(): boolean { return history.canRedo; },
    get undoLabel(): string { return history.undoLabel; },
    get redoLabel(): string { return history.redoLabel; },
  };
  commands.register([...builtinCommands({ settings, layout, fold, ui, reader, scope: scopeDeps, docs, notes: notesDeps, history: historyDeps }), ...groupCommands()]);
};
export { commands, ui, keys };
