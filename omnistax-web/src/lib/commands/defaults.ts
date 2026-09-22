/* The default chords. Pure, so tests can check every chord names a real
   command. keys.svelte.ts reads them and remembers the reader's changes.

   The pairs below are the book's own vocabulary, written as they arrive in the
   installed app, where the window is the book's and every Ctrl chord reaches
   it. A browser tab is not: Ctrl+W closes the tab, Ctrl+T opens one, Ctrl+Tab
   steps between them, and the page never sees any of it. So in a tab the
   defaults hand those commands the same chord with Alt in place of Ctrl —
   Alt+W closes a tab of the book — and the Ctrl chord goes on meaning what the
   browser means by it. Which chords a host keeps is host.ts's list, so the
   swap follows the browser the reader is in and the window they are in it. */
import { type Bindings, type Chord, chord, parseChord, formatChord } from './chord';
import { commandId } from './command';
import { type Host, kept } from './host';

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
  /* The browser's own zoom chords, taken for the book's text while the "Zoom
     keys" setting is on; off, the shell never dispatches them and the browser
     zooms the page as it always did. Ctrl++ arrives as Ctrl+Shift+= on most
     keyboards, and the numeric keypad sends its own keys. */
  ['Ctrl+=', 'zoom-in'], ['Ctrl+Shift+=', 'zoom-in'], ['Ctrl++', 'zoom-in'],
  ['Ctrl+-', 'zoom-out'], ['Ctrl+0', 'zoom-reset'],
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
  /* The search in the sidebar, under the chord every editor finds across files with. */
  ['Ctrl+Shift+F', 'show-view-search'],
  ['Ctrl+E', 'note-toggle-mode'],
  ['Ctrl+Alt+N', 'note-new'],   /* Ctrl+N opens a window of the browser's own, so the note takes Alt as well */
  /* A chat of the reader's own; Ctrl+L is the browser's address bar in a tab,
     so the chat ships with Alt in a tab and with Ctrl installed as an app. */
  ['Ctrl+Shift+L', 'chat-new'],
  /* A drawing of the reader's own. Ctrl+D is the browser's bookmark in a tab,
     so the drawing ships with Alt as well, and Ctrl+Shift+D is already the
     theme's; the tool keys inside a drawing tab are bare letters the tab keeps
     to itself and are not bindings at all. */
  ['Ctrl+Alt+D', 'drawing-new'],
];
/* The same chord with Alt in place of Ctrl, and nothing when there is no Ctrl
   to swap or the binding is a sequence, which stays as it is. */
const altOf = (c: Chord): Chord | null => {
  if (c.includes(' ')) return null;
  const p = parseChord(c);
  return p && p.ctrl && !p.alt ? formatChord({ ...p, ctrl: false, alt: true }) : null;
};
/* The defaults as they stand on one host: a chord the host keeps for itself is
   swapped for its Alt twin, unless that twin is spoken for or is kept too, in
   which case the command ships with no chord at all rather than a dead one. */
export const defaultBindings = (h: Host): Bindings => {
  const pairs = DEFAULT_PAIRS.flatMap(([c, id]) => { const k = chord(c); return k ? [[k, commandId(id)] as const] : []; });
  const free = new Set(pairs.filter(([c]) => !kept(h, c)).map(([c]) => c));
  return Object.fromEntries(pairs.flatMap(([c, id]) => {
    if (!kept(h, c)) return [[c, id] as const];
    const alt = altOf(c);
    return alt && !free.has(alt) && !kept(h, alt) ? (free.add(alt), [[alt, id] as const]) : [];
  })) as Bindings;
};
/* The pairs as written, with nothing swapped: what a host that keeps no chord
   for itself gets, and what the tests read. */
export const DEFAULT_BINDINGS: Bindings = bind(DEFAULT_PAIRS);
