/* Keybindings: chord -> command id, remembered in this browser. A command may
   own several chords, and a binding may be a sequence of two presses — Ctrl+K
   Ctrl+S — of which the first is held here for a moment while the second is
   waited for. The dispatcher runs from the document's keydown; chords without
   Ctrl or Alt are left to inputs so typing keeps working. Only the reader's
   changes are kept (omnistax-keys-v2), each host laying them over its own
   defaults, so a change made on the desktop and pulled into a tab still leaves
   the tab with chords it can use. */
import { commands } from './registry.svelte';
import { type Bindings, type Chord, chordOf, chordsFor, isEditable, parseBindings, rebind, resolveChord, startsSequence, withoutCommand } from './chord';
import { type Changes, applyChanges, changesAfter, changesFrom, defaultBindings, parseChanges } from './defaults';
import { host } from './host.svelte';
import type { CommandId } from './command';
import { readerWritesAllowed } from '../backup/guard';
import { retiredViewKeys } from '../types/ids';
export type { Bindings, Chord, ParsedChord, KeyLike } from './chord';
export { parseChord, formatChord, chord, chordOf, chordKeys, resolveChord, startsSequence } from './chord';

const KEY = 'omnistax-keys-v2', OLD_KEY = 'omnistax-keys';
const WAIT = 1500;   /* how long the first press of a sequence is held, in milliseconds */
export { DEFAULT_BINDINGS } from './defaults';

/* What the reader changed, or nothing at all when they never changed a chord.
   A whole map saved before changes were kept apart is read as its changes from
   this host's defaults and left where it is, for an older build still open. */
const read = (key: string): unknown => JSON.parse(retiredViewKeys(localStorage.getItem(key) ?? 'null'));
const load = (): Changes => {
  try {
    const changes = parseChanges(read(KEY)); if (changes) return changes;
    const old = parseBindings(read(OLD_KEY)); return old ? changesFrom(host.info, old) : {};
  } catch { return {}; }
};
const save = (c: Changes): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } };

class Keys {
  #changes = $state.raw<Changes>(typeof localStorage === 'undefined' ? {} : load());
  bindings: Bindings = $derived(applyChanges(host.info, this.#changes));
  /* The chords the book ships with on this host, which a restore goes back to. */
  private get defaults(): Bindings { return defaultBindings(host.info); }
  /* The first press of a sequence, while the shell waits for the second. */
  pending = $state.raw<Chord | null>(null);
  #timer: ReturnType<typeof setTimeout> | null = null;

  chordsFor(id: CommandId): readonly Chord[] { return chordsFor(this.bindings, id); }
  commandFor(c: Chord): CommandId | undefined { return this.bindings[c]; }
  /* Make `c` the one chord of `id`; whoever had `c` before loses it. */
  set(id: CommandId, c: Chord): void { this.edit(rebind(this.bindings, id, c)); }
  clear(id: CommandId): void { this.edit(withoutCommand(this.bindings, id)); }
  private edit(b: Bindings): void { this.#changes = changesAfter(host.info, this.#changes, this.bindings, b); save(this.#changes); }
  /* Saved as no changes rather than removed, so an old whole map is not read again. */
  restoreDefaults(): void { this.#changes = {}; save({}); }
  get isDefault(): boolean { return Object.keys(this.#changes).length === 0; }
  /* One command back to the chords it shipped with; whoever holds them now loses them. */
  restoreDefault(id: CommandId): void {
    this.edit(chordsFor(this.defaults, id).reduce((b, c) => rebind(b, id, c, true), withoutCommand(this.bindings, id)));
  }
  isDefaultFor(id: CommandId): boolean { return JSON.stringify([...this.chordsFor(id)].sort()) === JSON.stringify([...chordsFor(this.defaults, id)].sort()); }

  /* Hold a press, or let go of the one being held; a held press is dropped after a
     moment, so a Ctrl+K nobody followed up on stops standing in the way. */
  private hold(c: Chord | null): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.pending = c;
    this.#timer = c ? setTimeout(() => { this.pending = null; this.#timer = null; }, WAIT) : null;
  }
  /* True when the event ran a command or began a sequence (and was consumed). */
  dispatch(e: KeyboardEvent): boolean {
    if (e.defaultPrevented) return false;
    const waiting = this.pending;
    const hit = resolveChord(this.bindings, e, waiting);
    const step = chordOf(e); if (!step) return false;   /* a modifier on its own is no press at all */
    if (waiting) this.hold(null);                       /* the wait is over: this press answers it or nothing does */
    if (hit) { if (!commands.run(hit.id)) return false; e.preventDefault(); e.stopPropagation(); return true; }
    const typing = isEditable(e.target) && !(e.ctrlKey || e.metaKey || e.altKey);
    if (waiting || typing || !startsSequence(this.bindings, step)) return false;
    this.hold(step); e.preventDefault(); e.stopPropagation(); return true;
  }
}
export const keys = new Keys();
