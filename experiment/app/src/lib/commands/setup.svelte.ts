/* Registers the builtin commands against the real stores. The shell calls this
   once on mount; later modules add their own through commands.register(). */
import { commands } from './registry.svelte';
import { builtinCommands } from './builtin';
import { ui } from './ui.svelte';
import { keys } from './keys.svelte';
import { settings } from '../settings/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { openDoc, focusedArticle } from '../sections/nav.svelte';
import { foldAllIn, unfoldAllIn, hideFigsIn, showFigsIn } from '../sections/fold.svelte';
import { reader } from '../voice.svelte';
import type { BookManifest } from '../content/schema';

export const installCommands = (manifest: BookManifest): void => {
  const fold = { foldAll: () => foldAllIn(focusedArticle()), unfoldAll: () => unfoldAllIn(focusedArticle()), hideFigures: () => hideFigsIn(focusedArticle()), showFigures: () => showFigsIn(focusedArticle()) };
  commands.register(builtinCommands({ settings, layout: layoutStore, fold, openDoc, ui, reader, manifest }));
};
export { commands, ui, keys };
