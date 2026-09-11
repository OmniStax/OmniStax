/* The default chords. Pure, so tests can check every chord names a real
   command. keys.svelte.ts reads them and remembers the reader's changes. */
import { type Bindings, chord } from './chord';
import { commandId } from './command';

const bind = (pairs: readonly (readonly [string, string])[]): Bindings =>
  Object.fromEntries(pairs.flatMap(([c, id]) => { const k = chord(c); return k ? [[k, commandId(id)]] : []; })) as Bindings;

export const DEFAULT_PAIRS: readonly (readonly [string, string])[] = [
  ['Ctrl+Shift+P', 'palette'],
  /* Ctrl+K begins a sequence, as it does in VS Code: nothing is bound to it alone. */
  ['Ctrl+,', 'settings'], ['Ctrl+K Ctrl+S', 'settings'],
  ['Ctrl+O', 'open'],
  ['Ctrl+Shift+A', 'animations'],
  ['Ctrl+Shift+C', 'colour-coding'],
  ['Ctrl+Shift+D', 'theme-cycle'],
  ['Ctrl+Shift+[', 'fold-all'], ['Ctrl+Shift+]', 'unfold-all'],
  ['Ctrl+Shift+H', 'hide-figures'], ['Ctrl+Shift+J', 'show-figures'],
  ['Ctrl+\\', 'split-right'], ['Ctrl+Shift+\\', 'split-down'],
  ['Ctrl+Alt+ArrowLeft', 'focus-group-left'], ['Ctrl+Alt+ArrowRight', 'focus-group-right'],
  ['Ctrl+Alt+ArrowUp', 'focus-group-up'], ['Ctrl+Alt+ArrowDown', 'focus-group-down'],
  ['Ctrl+PageDown', 'next-tab'], ['Ctrl+PageUp', 'previous-tab'],
  /* A browser tab keeps Ctrl+W for closing itself and a page cannot take it back;
     installed as an app (the manifest makes the book installable) the shell is
     handed the chord and closes the active tab instead, and the group with it
     when that was its last. Ctrl+Shift+W closes the whole group. */
  ['Ctrl+W', 'close-tab'], ['Ctrl+Shift+W', 'close-group'],
  ['Ctrl+Shift+T', 'reopen-closed-tab'],
  /* The reader's own edits, in the chords every editor uses. Inside a field or
     the note editor these never reach the shell: the browser and CodeMirror
     keep their own undo there, which is what the reader means by them. */
  ['Ctrl+Z', 'undo'], ['Ctrl+Shift+Z', 'redo'], ['Ctrl+Y', 'redo'],
  ['ArrowLeft', 'scope-widen'], ['ArrowRight', 'scope-narrow'],
  ['Ctrl+Shift+E', 'open-exercises'],
  /* The search in the sidebar, under the chord every editor finds across files with. */
  ['Ctrl+Shift+F', 'show-view-search'],
  ['Ctrl+E', 'note-toggle-mode'],
  ['Ctrl+Alt+N', 'note-new'],   /* Ctrl+N opens a window of the browser's own, so the note takes Alt as well */
];
export const DEFAULT_BINDINGS: Bindings = bind(DEFAULT_PAIRS);
