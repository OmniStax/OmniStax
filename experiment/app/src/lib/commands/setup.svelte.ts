/* Registers the builtin commands against the real stores. The shell calls this
   once on mount; later modules add their own through commands.register(). */
import { commands } from './registry.svelte';
import { builtinCommands, type FocusDir } from './builtin';
import { commandId } from './command';
import type { Command } from './command';
import { ui } from './ui.svelte';
import { keys } from './keys.svelte';
import { settings } from '../settings/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { split, moveToNewGroup, closeGroup, closeOtherGroups, evenSizes, focusNext, activateNext, setFocus } from '../layout/model';
import { groupToward, type GroupRect } from '../layout/spatial';
import { tabTitle } from '../layout/titles';
import { focusedArticle } from '../sections/nav.svelte';
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

export const installCommands = (): void => {
  const fold = { foldAll: () => foldAllIn(focusedArticle()), unfoldAll: () => unfoldAllIn(focusedArticle()), hideFigures: () => hideFigsIn(focusedArticle()), showFigures: () => showFigsIn(focusedArticle()) };
  const layout = {
    reset: () => layoutStore.reset(),
    splitRight: () => layoutStore.apply((x) => split(x, x.focus, 'right')),
    splitDown: () => layoutStore.apply((x) => split(x, x.focus, 'down')),
    moveRight: () => layoutStore.apply((x) => moveToNewGroup(x, x.focus, 'right')),
    moveDown: () => layoutStore.apply((x) => moveToNewGroup(x, x.focus, 'down')),
    closeGroup: () => layoutStore.apply((x) => closeGroup(x, x.focus)),
    closeOtherGroups: () => layoutStore.apply((x) => closeOtherGroups(x, x.focus)),
    evenGroups: () => layoutStore.apply(evenSizes),
    focusNextGroup: () => layoutStore.apply((x) => focusNext(x, 1)),
    focusPreviousGroup: () => layoutStore.apply((x) => focusNext(x, -1)),
    focusGroup: (dir: FocusDir) => focusToward(dir),
    nextTab: () => layoutStore.apply((x) => activateNext(x, x.focus, 1)),
    previousTab: () => layoutStore.apply((x) => activateNext(x, x.focus, -1)),
    get groupCount(): number { return layoutStore.layout.groups.length; },
  };
  commands.register([...builtinCommands({ settings, layout, fold, ui, reader }), ...groupCommands()]);
};
export { commands, ui, keys };
