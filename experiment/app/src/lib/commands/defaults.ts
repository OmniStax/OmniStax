/* The default chords. Pure, so tests can check every chord names a real
   command. keys.svelte.ts reads them and remembers the reader's changes. */
import { type Bindings, chord } from './chord';
import { commandId } from './command';

const bind = (pairs: readonly (readonly [string, string])[]): Bindings =>
  Object.fromEntries(pairs.flatMap(([c, id]) => { const k = chord(c); return k ? [[k, commandId(id)]] : []; })) as Bindings;

export const DEFAULT_PAIRS: readonly (readonly [string, string])[] = [
  ['Ctrl+K', 'palette'], ['Ctrl+Shift+P', 'palette'],
  ['Ctrl+,', 'settings'],
  ['Ctrl+O', 'open'],
  ['Ctrl+Shift+A', 'animations'],
  ['Ctrl+Shift+C', 'colour-coding'],
  ['Ctrl+Shift+D', 'theme-cycle'],
  ['Ctrl+Shift+[', 'fold-all'], ['Ctrl+Shift+]', 'unfold-all'],
  ['Ctrl+Shift+H', 'hide-figures'], ['Ctrl+Shift+J', 'show-figures'],
];
export const DEFAULT_BINDINGS: Bindings = bind(DEFAULT_PAIRS);
