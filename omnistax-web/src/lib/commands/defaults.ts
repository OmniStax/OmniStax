/* The default chords. Pure, so tests can check every chord names a real
   command. keys.svelte.ts reads them and remembers the reader's changes.

   The pairs below are the book's own vocabulary, written as they arrive in the
   installed app, where the window is the book's and every Ctrl chord reaches
   it. A browser tab is not: Ctrl+W closes the tab, Ctrl+T opens one, Ctrl+Tab
   steps between them, and the page never sees any of it. So in a tab the
   defaults hand those commands the same chord with Alt in place of Ctrl —
   Ctrl+PageDown becomes Alt+PageDown — and the Ctrl chord goes on meaning what the
   browser means by it. Which chords a host keeps is host.ts's list, so the
   swap follows the browser the reader is in and the window they are in it. */
import { type Bindings, type Chord, chord, chordsFor, parseChord, formatChord, rebind, withoutCommand } from './chord';
import { commandId, type CommandId } from './command';
import { type Host, kept } from './host';

const bind = (pairs: readonly (readonly [string, string])[]): Bindings =>
  Object.fromEntries(pairs.flatMap(([c, id]) => { const k = chord(c); return k ? [[k, commandId(id)]] : []; })) as Bindings;

export const DEFAULT_PAIRS: readonly (readonly [string, string])[] = [
  ['Ctrl+Shift+P', 'palette'],
  /* Ctrl+K begins a sequence, as it does in VS Code: nothing is bound to it alone. */
  ['Ctrl+,', 'settings'], ['Ctrl+K Ctrl+S', 'settings'],
  ['Ctrl+P', 'open'],   /* the editors' quick open; Ctrl+P is the browser's print, which the shell already swallows */
  ['Ctrl+Shift+A', 'animations'],
  /* The browser's own zoom chords, taken for the book's text. Any key that
     types + reads as Ctrl++ (chord.ts), and Ctrl+= spares the Shift. */
  ['Ctrl++', 'zoom-in'], ['Ctrl+=', 'zoom-in'],
  ['Ctrl+-', 'zoom-out'], ['Ctrl+0', 'zoom-reset'],
  ['Ctrl+Shift+[', 'fold-all'], ['Ctrl+Shift+]', 'unfold-all'],
  ['Ctrl+Shift+H', 'hide-figures'],
  ['Ctrl+\\', 'split-right'], ['Ctrl+Shift+\\', 'split-down'],
  ['Ctrl+Alt+ArrowLeft', 'focus-group-left'], ['Ctrl+Alt+ArrowRight', 'focus-group-right'],
  ['Ctrl+Alt+ArrowUp', 'focus-group-up'], ['Ctrl+Alt+ArrowDown', 'focus-group-down'],
  ['Ctrl+PageDown', 'next-tab'], ['Ctrl+PageUp', 'previous-tab'],
  /* Alt on every host: a browser tab keeps Ctrl+W and Ctrl+T for itself, and
     the same chords in a tab and in the app are easier to learn. */
  ['Alt+W', 'close-tab'], ['Ctrl+Alt+W', 'close-group'],
  ['Alt+T', 'new-group'], ['Ctrl+Alt+T', 'reopen-closed-tab'],
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
     so the drawing ships with Alt as well; the tool keys inside a drawing tab are bare letters the tab keeps
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

/* What the reader changed: for each command they rebound, the chords they gave
   it, none when they cleared it. Only this is stored, so each host keeps its own
   defaults and an install pulling the changes gets the reader's intent. */
export type Changes = Readonly<Record<CommandId, readonly Chord[]>>;
const sameChords = (a: readonly Chord[], b: readonly Chord[]): boolean => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const idsOf = (...all: Bindings[]): CommandId[] => [...new Set(all.flatMap((b) => Object.values(b)))];

/* This host's bindings: its defaults with the changes on top. A changed chord
   the host keeps takes its Alt twin when nobody else holds that, as the
   defaults do; failing that the command keeps its default here. */
export const applyChanges = (h: Host, changes: Changes): Bindings => {
  const defaults = defaultBindings(h);
  return (Object.entries(changes) as [CommandId, readonly Chord[]][]).reduce<Bindings>((b, [id, chords]) => {
    const rest = withoutCommand(b, id);
    const twin = (c: Chord): Chord | null => { const alt = altOf(c); return alt && !kept(h, alt) && !rest[alt] ? alt : null; };
    const wanted = chords.map((c) => (kept(h, c) ? twin(c) : c));
    const own = wanted.every((c) => c !== null) ? wanted as Chord[] : chordsFor(defaults, id).filter((c) => !rest[c]);
    return own.reduce<Bindings>((acc, c) => rebind(acc, id, c, true), rest);
  }, defaults);
};

/* The changes after an edit took the bindings from `before` to `after`: every
   command the edit moved is recorded as it now stands, or dropped when that is
   its default here; the rest are kept as they were, wherever they were made. */
export const changesAfter = (h: Host, changes: Changes, before: Bindings, after: Bindings): Changes => {
  const defaults = defaultBindings(h);
  const out: Record<CommandId, readonly Chord[]> = { ...changes };
  for (const id of idsOf(before, after, defaults)) {
    const now = chordsFor(after, id);
    if (sameChords(chordsFor(before, id), now)) continue;
    if (sameChords(now, chordsFor(defaults, id))) delete out[id]; else out[id] = now;
  }
  return out;
};

/* A whole map saved before changes were kept apart, as its changes from this host's defaults. */
export const changesFrom = (h: Host, saved: Bindings): Changes => {
  const defaults = defaultBindings(h);
  return Object.fromEntries(idsOf(saved, defaults).flatMap((id) => sameChords(chordsFor(saved, id), chordsFor(defaults, id)) ? [] : [[id, chordsFor(saved, id)]])) as Changes;
};

/* Changes as they are stored: command id -> chords, only valid chords kept. */
export const parseChanges = (raw: unknown): Changes | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).flatMap(([id, list]) =>
    id && Array.isArray(list) ? [[id, list.flatMap((s) => (typeof s === 'string' ? [chord(s)] : [])).filter((c): c is Chord => c !== null)]] : [])) as Changes;
};
